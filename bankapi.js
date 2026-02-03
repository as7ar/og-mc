const WebSocket = require("ws");
const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") });

// ===== SQLite 데이터베이스 초기화 =====
const dbPath = path.join(__dirname, "database/database.db");
const db = new Database(dbPath);

// 테이블 자동 생성
// users: site_id + bank_name 유니크 (입금자명 기준)
// charges: 충전 이력
// transfers: 계좌이체 상태
// deposit_requests: 웹사이트 충전 요청

// eslint-disable-next-line no-multi-str
const schemaSql = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    player_name TEXT NOT NULL,
    money INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(site_id, bank_name)
  );

  CREATE TABLE IF NOT EXISTS charges (
    id TEXT PRIMARY KEY,
    player_name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    method TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transfers (
    id TEXT PRIMARY KEY,
    bank_name TEXT NOT NULL,
    player_name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    confirmed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS deposit_requests (
    request_id TEXT PRIMARY KEY,
    player_name TEXT NOT NULL,
    depositor_name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    discord_user_id TEXT NOT NULL,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deadline_timestamp INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    minecraft_name TEXT
  );

  CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS config_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor TEXT NOT NULL,
    changes TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS email_templates (
    key TEXT PRIMARY KEY,
    subject TEXT NOT NULL,
    body TEXT NOT NULL
  );
`;

db.exec(schemaSql);

const defaultConfig = {
  depositMinAmount: String(process.env.DEPOSIT_MIN_AMOUNT || "1000"),
  depositMaxAmount: String(process.env.DEPOSIT_MAX_AMOUNT || "1000000"),
  depositUnitAmount: String(process.env.DEPOSIT_UNIT_AMOUNT || "1000"),
  bankAccountBank: String(process.env.BANK_ACCOUNT_BANK || ""),
  bankAccountNumber: String(process.env.BANK_ACCOUNT_NUMBER || ""),
  bankAccountName: String(process.env.BANK_ACCOUNT_NAME || ""),
};

const defaultEmailTemplates = {
  login_attempt: {
    subject: "[OG] 로그인 시도 알림",
    body: "<p>{{name}}님, 로그인 시도가 감지되었습니다.</p><p>디스코드 ID: {{discordId}}</p><p>시간: {{date}}</p>",
  },
  charge_completed: {
    subject: "[OG] 충전 완료 안내",
    body:
      "<p>{{name}}님, 충전이 완료되었습니다.</p><p>요청 ID: {{requestId}}</p><p>금액: {{amount}}</p><p>상태: {{status}}</p><p>계좌: {{account}}</p><p>시간: {{date}}</p>",
  },
  admin_generic: {
    subject: "[OG] 알림",
    body: "<p>{{content}}</p>",
  },
};

function ensureConfigDefaults() {
  const insertStmt = db.prepare("INSERT OR IGNORE INTO app_config (key, value) VALUES (?, ?)");
  Object.entries(defaultConfig).forEach(([key, value]) => insertStmt.run(key, value));
}

function getConfig() {
  const rows = db.prepare("SELECT key, value FROM app_config").all();
  const config = { ...defaultConfig };
  rows.forEach((row) => {
    config[row.key] = row.value;
  });
  return config;
}

function setConfig(partial) {
  const config = getConfig();
  const merged = { ...config, ...partial };
  const insertStmt = db.prepare("INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)");
  Object.entries(merged).forEach(([key, value]) => insertStmt.run(key, String(value ?? "")));
  return getConfig();
}

function writeConfigLog(actor, before, after) {
  const changes = {};
  Object.keys(after).forEach((key) => {
    if (String(before[key] ?? "") !== String(after[key] ?? "")) {
      changes[key] = { from: before[key], to: after[key] };
    }
  });
  if (Object.keys(changes).length === 0) return;
  const stmt = db.prepare("INSERT INTO config_logs (actor, changes) VALUES (?, ?)");
  stmt.run(actor || "unknown", JSON.stringify(changes));
}

function ensureEmailTemplates() {
  const insertStmt = db.prepare("INSERT OR IGNORE INTO email_templates (key, subject, body) VALUES (?, ?, ?)");
  Object.entries(defaultEmailTemplates).forEach(([key, value]) =>
    insertStmt.run(key, value.subject, value.body)
  );
}

function getEmailTemplates() {
  const rows = db.prepare("SELECT key, subject, body FROM email_templates ORDER BY key ASC").all();
  if (!rows.length) {
    ensureEmailTemplates();
    return db.prepare("SELECT key, subject, body FROM email_templates ORDER BY key ASC").all();
  }
  return rows;
}

function upsertEmailTemplate(key, subject, body) {
  const stmt = db.prepare("INSERT OR REPLACE INTO email_templates (key, subject, body) VALUES (?, ?, ?)");
  stmt.run(key, subject, body);
}

ensureConfigDefaults();
ensureEmailTemplates();

// transfers 테이블에 discord_user_id 컬럼이 없으면 추가 (마이그레이션)
try {
  const colCheck = db.prepare("PRAGMA table_info(transfers)").all();
  const hasDiscordUserId = colCheck.some((col) => col.name === "discord_user_id");
  if (!hasDiscordUserId) {
    db.prepare("ALTER TABLE transfers ADD COLUMN discord_user_id TEXT").run();
    console.log("[DB] transfers 테이블에 discord_user_id 컬럼 추가 완료");
  }
} catch (e) {
  console.log("[DB] transfers 테이블 discord_user_id 컬럼 추가 오류:", e.message);
}

// deposit_requests 테이블에 email 컬럼이 없으면 추가 (마이그레이션)
try {
  const colCheck = db.prepare("PRAGMA table_info(deposit_requests)").all();
  const hasEmail = colCheck.some((col) => col.name === "email");
  if (!hasEmail) {
    db.prepare("ALTER TABLE deposit_requests ADD COLUMN email TEXT").run();
    console.log("[DB] deposit_requests 테이블에 email 컬럼 추가 완료");
  }
} catch (e) {
  console.log("[DB] deposit_requests 테이블 email 컬럼 추가 오류:", e.message);
}

console.log(`[DB] SQLite 준비 완료: ${dbPath}`);

// ===== 설정 =====
const bankpin = process.env.BANKPIN || "your-bankpin";
const bankApiOrigin = process.env.BANKAPI_CORS_ORIGIN || "*";
const adminApiKey = process.env.ADMIN_API_KEY || "";
const depositDeadlineMinutes = Number(process.env.DEPOSIT_DEADLINE_MINUTES || "30");

// 은행코드 매핑
const bankCodeMap = {
  "com.IBK.SmartPush.app": "IBK기업은행",
  "com.wooribank.smart.npib": "우리은행",
  "com.kakaobank.channel": "카카오뱅크",
  "com.nh.mobilenoti": "NH농협은행",
  "com.kbstar.reboot": "KB국민은행",
  "com.kbankwith.smartbank": "케이뱅크",
  "viva.republica.toss": "토스뱅크",
  "viva.republica.toss.uss": "토스증권",
};

// ===== 데이터베이스 유틸 =====
const database = {
  select: async (table, params) => {
    console.log(`[DB] SELECT ${table}:`, params);

    if (table === "sites") {
      if (params.bankpin) {
        console.log("  -> 결과: site_id_default");
        return [["site_id_default"]];
      }
      return [["site_id_example"]];
    }

    if (table === "user") {
      try {
        const stmt = db.prepare(`
          SELECT * FROM users 
          WHERE site_id = ? AND bank_name = ?
          LIMIT 1
        `);
        const user = stmt.get(params.sites || "site_id_default", params.bankname);

        if (user) {
          console.log(`  -> 결과: ${user.money}원`);
          return [[user.site_id, user.bank_name, user.player_name, user.created_at, user.money]];
        }

        const insertStmt = db.prepare(`
          INSERT INTO users (site_id, bank_name, player_name, money)
          VALUES (?, ?, ?, 0)
        `);
        insertStmt.run(params.sites || "site_id_default", params.bankname, params.playerName || "Player_default");
        console.log("  -> 신규 사용자 생성");
        return [[params.sites || "site_id_default", params.bankname, params.playerName || "Player_default", new Date().toISOString(), 0]];
      } catch (err) {
        console.log(`  -> DB 조회 오류: ${err.message}`);
        return [[]];
      }
    }

    return [[]];
  },

  update: async (table, field, value, params) => {
    console.log(`[DB] UPDATE ${table} SET ${field} = ${value}:`, params);

    if (table === "user" && field === "money") {
      try {
        const stmt = db.prepare(`
          UPDATE users 
          SET money = ? 
          WHERE site_id = ? AND bank_name = ?
        `);
        const result = stmt.run(value, params.sites || "site_id_default", params.bankname || "unknown");

        if (result.changes > 0) {
          console.log(`  -> 업데이트 완료: ${params.bankname}의 잔액 ${value}원`);
        } else {
          console.log("  -> 해당 사용자 없음");
        }
      } catch (err) {
        console.log(`  -> DB 업데이트 오류: ${err.message}`);
      }
    }

    return true;
  },

  insertCharge: async (playerName, amount, method) => {
    const chargeId = `CHARGE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const stmt = db.prepare(`
        INSERT INTO charges (id, player_name, amount, method)
        VALUES (?, ?, ?, ?)
      `);
      stmt.run(chargeId, playerName, amount, method);

      console.log("[DB] 충전 기록 추가");
      console.log(`  -> ID: ${chargeId}`);
      console.log(`  -> 플레이어: ${playerName}`);
      console.log(`  -> 금액: ${amount}원`);
      console.log(`  -> 방법: ${method}`);
    } catch (err) {
      console.log(`[DB] 충전 기록 추가 오류: ${err.message}`);
    }

    return true;
  },

  getCharges: async (params = {}) => {
    try {
      let query = "SELECT * FROM charges WHERE 1=1";
      const values = [];

      if (params.playerName) {
        query += " AND player_name = ?";
        values.push(params.playerName);
      }
      if (params.method) {
        query += " AND method = ?";
        values.push(params.method);
      }

      query += " ORDER BY timestamp DESC";

      const stmt = db.prepare(query);
      return stmt.all(...values);
    } catch (err) {
      console.log(`[DB] 충전 기록 조회 오류: ${err.message}`);
      return [];
    }
  },

  getAllUsers: async () => {
    try {
      const stmt = db.prepare("SELECT * FROM users ORDER BY created_at DESC");
      return stmt.all();
    } catch (err) {
      console.log(`[DB] 사용자 조회 오류: ${err.message}`);
      return [];
    }
  },
};

function ensureUser(siteId, bankName, playerName) {
  const stmt = db.prepare(`
    SELECT * FROM users WHERE site_id = ? AND bank_name = ? LIMIT 1
  `);
  const user = stmt.get(siteId, bankName);
  if (user) return user;

  const insertStmt = db.prepare(`
    INSERT INTO users (site_id, bank_name, player_name, money)
    VALUES (?, ?, ?, 0)
  `);
  insertStmt.run(siteId, bankName, playerName);
  return stmt.get(siteId, bankName);
}

// ===== 계좌이체 관련 =====
async function createTransferLink(bankName, playerName, amount) {
  return new Promise((resolve) => {
    try {
      if (!bankName || !playerName || !amount) {
        resolve({ success: false, error: "필수 입력값이 누락되었습니다.", result: null });
        return;
      }

      const amountNum = parseInt(amount, 10);
      if (isNaN(amountNum) || amountNum < 1000 || amountNum > 100000) {
        resolve({ success: false, error: "금액은 1,000원 이상 100,000원 이하만 가능합니다.", result: null });
        return;
      }

      const validBanks = Object.values(bankCodeMap);
      const bankNameStr = String(bankName).trim();
      if (!validBanks.includes(bankNameStr) && bankNameStr !== "") {
        resolve({ success: false, error: "지원하지 않는 은행입니다.", result: null });
        return;
      }

      const playerNameStr = String(playerName).trim();
      if (!playerNameStr || playerNameStr.length < 2 || playerNameStr.length > 16) {
        resolve({ success: false, error: "플레이어명은 2~16자여야 합니다.", result: null });
        return;
      }

      const transferId = `TRANSFER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const stmt = db.prepare(`
        INSERT INTO transfers (id, bank_name, player_name, amount, status, confirmed)
        VALUES (?, ?, ?, ?, 'pending', 0)
      `);
      stmt.run(transferId, bankNameStr, playerNameStr, amountNum);

      const url = `http://localhost:3001/transfer/${transferId}`;

      resolve({
        success: true,
        url,
        result: {
          error: false,
          transferId,
          status: "pending",
          bankName: bankNameStr,
          playerName: playerNameStr,
          amount: amountNum,
        },
      });
    } catch (err) {
      resolve({ success: false, error: "처리 중 오류가 발생했습니다.", result: null });
    }
  });
}

async function checkTransferStatus(playerName, amount, transferId) {
  return new Promise((resolve) => {
    try {
      const stmt = db.prepare(`
        SELECT * FROM transfers WHERE id = ?
      `);
      const transferData = stmt.get(transferId);

      if (!transferData) {
        resolve({ success: false, error: "해당 계좌이체 기록을 찾을 수 없습니다.", result: null });
        return;
      }

      if (transferData.player_name !== playerName || transferData.amount !== amount) {
        resolve({ success: false, error: "계좌이체 정보가 일치하지 않습니다.", result: null });
        return;
      }

      resolve({
        success: true,
        result: {
          error: false,
          transferId,
          status: transferData.confirmed ? "confirmed" : "pending",
          confirmed: transferData.confirmed === 1,
          bankName: transferData.bank_name,
          playerName: transferData.player_name,
          amount: transferData.amount,
          createdAt: transferData.created_at,
        },
      });
    } catch (err) {
      resolve({ success: false, error: "DB 조회 오류", result: null });
    }
  });
}

async function confirmTransfer(transferId) {
  try {
    const selectStmt = db.prepare(`
      SELECT * FROM transfers WHERE id = ?
    `);
    const transferData = selectStmt.get(transferId);

    if (!transferData) {
      return { success: false, error: "계좌이체 기록을 찾을 수 없습니다." };
    }

    const updateStmt = db.prepare(`
      UPDATE transfers SET confirmed = 1, status = 'confirmed' WHERE id = ?
    `);
    updateStmt.run(transferId);

    return {
      success: true,
      message: "계좌이체가 확인되었습니다.",
      transferId,
      playerName: transferData.player_name,
      amount: transferData.amount,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function processTransfer(appName, playerName, bankName, amount) {
  try {
    const linkResult = await createTransferLink(bankName, playerName, amount);
    if (linkResult.success) {
      setTimeout(async () => {
        try {
          await confirmTransfer(linkResult.result.transferId);
        } catch (e) {
          console.log(`[DB] 계좌이체 확인 오류: ${e.message}`);
        }
      }, 500);
      return true;
    }
    return false;
  } catch (error) {
    console.log(`[계좌이체 ERROR] ${error.message}`);
    return false;
  }
}

// ===== 웹사이트 충전 =====
function createDepositRequest(playerName, depositorName, amount, discordUserId, minecraftName, email) {
  if (!playerName || !depositorName || !amount) {
    return { success: false, error: "필수 입력값이 누락되었습니다." };
  }

  const config = getConfig();
  const minAmount = parseInt(config.depositMinAmount, 10);
  const maxAmount = parseInt(config.depositMaxAmount, 10);
  const unitAmount = parseInt(config.depositUnitAmount, 10);

  const amountNum = parseInt(amount, 10);
  if (isNaN(amountNum) || amountNum < minAmount || amountNum > maxAmount) {
    return {
      success: false,
      error: `금액은 ${minAmount.toLocaleString()}원 이상 ${maxAmount.toLocaleString()}원 이하만 가능합니다.`,
    };
  }

  if (unitAmount > 0 && amountNum % unitAmount !== 0) {
    return {
      success: false,
      error: `${unitAmount.toLocaleString()}원 단위로만 충전 가능합니다.`,
    };
  }

  const requestId = `DEPOSIT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const deadline = Date.now() + depositDeadlineMinutes * 60 * 1000;

  const stmt = db.prepare(`
    INSERT INTO deposit_requests
      (request_id, player_name, depositor_name, amount, discord_user_id, email, deadline_timestamp, minecraft_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    requestId,
    playerName,
    depositorName,
    amountNum,
    discordUserId || "web",
    email || null,
    deadline,
    minecraftName || null
  );

  return {
    success: true,
    requestId,
    deadlineTimestamp: deadline,
    amount: amountNum,
    account: {
      bank: config.bankAccountBank,
      number: config.bankAccountNumber,
      name: config.bankAccountName,
    },
  };
}

function confirmDepositRequest(requestId) {
  const selectStmt = db.prepare(`
    SELECT * FROM deposit_requests WHERE request_id = ?
  `);
  const request = selectStmt.get(requestId);

  if (!request) {
    return { success: false, error: "충전 요청을 찾을 수 없습니다." };
  }
  if (request.status !== "pending") {
    return { success: false, error: "이미 처리된 요청입니다." };
  }

  const siteId = "site_id_default";
  const bankName = request.depositor_name;
  const playerName = request.player_name;

  const user = ensureUser(siteId, bankName, playerName);
  const newMoney = (user.money || 0) + request.amount;

  const updateStmt = db.prepare(`
    UPDATE users SET money = ? WHERE site_id = ? AND bank_name = ?
  `);
  updateStmt.run(newMoney, siteId, bankName);

  const updateReqStmt = db.prepare(`
    UPDATE deposit_requests SET status = 'confirmed' WHERE request_id = ?
  `);
  updateReqStmt.run(requestId);

  database.insertCharge(playerName, request.amount, "WEB");

  return {
    success: true,
    message: "웹사이트 충전이 완료되었습니다.",
    requestId,
    playerName,
    amount: request.amount,
    newBalance: newMoney,
  };
}

// ===== PushBullet WebSocket 연결 =====
function startApp() {
  const ws = new WebSocket("wss://stream.pushbullet.com/websocket/" + bankpin);

  ws.on("open", () => {
    console.log("[PushBullet] WebSocket 연결 성공");
  });

  function parseNotification(push) {
    if (!push) {
      throw new Error("push 객체가 없습니다");
    }

    const notificationAppName = String(push.package_name || "unknown");
    const body = String(push.body || "").replace(/\n/g, " ");
    const title = String(push.title || "").replace(/\n/g, " ");
    const subtitle = String(push.subtitle || "").replace(/\n/g, " ");
    const fullText = [body, title, subtitle].filter((t) => t).join(" ");

    const amountMatch = fullText.match(/(\d{1,3}(?:,\d{3})+|\d+)/);
    if (!amountMatch) {
      throw new Error(`금액을 찾을 수 없습니다: ${fullText}`);
    }

    const amountStr = amountMatch[0];
    const count = parseInt(amountStr.replace(/,/g, ""), 10);
    if (isNaN(count) || count <= 0) {
      throw new Error(`유효하지 않은 금액: ${count}`);
    }

    const nameMatch = fullText.match(/^[\u4E00-\u9FFF\uAC00-\uD7AFA-Za-z]+/);
    const displayname = (nameMatch?.[0] || "미상").replace(/\s/g, "");

    return { displayname, count, notificationAppName };
  }

  ws.on("message", async (data) => {
    const messageStr = data.toString();

    try {
      let obj;
      try {
        obj = JSON.parse(messageStr);
      } catch (parseError) {
        console.error(`[BankAPI] JSON 파싱 실패: ${parseError.message}`);
        return;
      }

      if (obj.type !== "push") return;
      if (!obj.push) {
        console.error("[BankAPI] push 객체가 없습니다");
        return;
      }

      const push = obj.push;
      console.log(`[BankAPI] 알림 수신: ${push.package_name}`);

      let displayname;
      let count;
      let notificationAppName;
      try {
        const parseResult = parseNotification(push);
        displayname = parseResult.displayname;
        count = parseResult.count;
        notificationAppName = parseResult.notificationAppName;
      } catch (parseError) {
        console.error(`[BankAPI] 알림 파싱 실패: ${parseError.message}`);
        return;
      }

      if (process.env.BANK_NAME && notificationAppName !== process.env.BANK_NAME) {
        console.log(`[BankAPI] 무시: BANK_NAME(${process.env.BANK_NAME})와 일치하지 않음`);
        return;
      }

      try {
        const siteData = await database.select("sites", { bankpin });
        if (!siteData || !siteData[0]) {
          throw new Error("site_id를 찾을 수 없습니다");
        }
        const site_id = siteData[0][0];

        const userSelect = await database.select("user", { sites: site_id, bankname: displayname, playerName: displayname });
        if (!userSelect || !userSelect[0]) {
          throw new Error(`${displayname} 사용자를 찾을 수 없습니다`);
        }

        const currentMoney = parseInt(userSelect[0][4], 10);
        if (isNaN(currentMoney)) {
          throw new Error(`유효하지 않은 금액: ${userSelect[0][4]}`);
        }

        await database.update("user", "money", currentMoney + count, { bankname: displayname });

        const koreanBankName = bankCodeMap[notificationAppName] || displayname;
        await processTransfer(notificationAppName, displayname, koreanBankName, count);
      } catch (dbError) {
        console.error(`[BankAPI] DB 처리 실패: ${dbError.message}`);
      }
    } catch (e) {
      console.error(`[BankAPI ERROR] 예기치 못한 오류: ${e.message}`);
    }
  });

  ws.on("error", (error) => {
    console.log(`[WebSocket ERROR] ${error.message}`);
  });

  ws.on("close", () => {
    console.log("[WebSocket] 연결 종료 - 3초 뒤 재연결 시도...");
    setTimeout(startApp, 3000);
  });
}

// ===== Express API 서버 =====
const app = express();
app.use(express.json());

// CORS (간단 버전)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", bankApiOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Admin-Key");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  return next();
});

// 설정 조회 (공개)
app.get("/api/config", (req, res) => {
  const config = getConfig();
  return res.json({
    depositMinAmount: parseInt(config.depositMinAmount, 10),
    depositMaxAmount: parseInt(config.depositMaxAmount, 10),
    depositUnitAmount: parseInt(config.depositUnitAmount, 10),
    bankAccountBank: config.bankAccountBank,
    bankAccountNumber: config.bankAccountNumber,
    bankAccountName: config.bankAccountName,
  });
});

// 설정 변경 (관리자)
app.post("/api/config", (req, res) => {
  try {
    if (adminApiKey) {
      const key = req.header("X-Admin-Key");
      if (!key || key !== adminApiKey) {
        return res.status(401).json({ error: "관리자 키가 필요합니다." });
      }
    }

    const {
      depositMinAmount,
      depositMaxAmount,
      depositUnitAmount,
      bankAccountBank,
      bankAccountNumber,
      bankAccountName,
    } = req.body || {};

    const minAmount = parseInt(depositMinAmount, 10);
    const maxAmount = parseInt(depositMaxAmount, 10);
    const unitAmount = parseInt(depositUnitAmount, 10);

    if (isNaN(minAmount) || isNaN(maxAmount) || minAmount < 0 || maxAmount < minAmount) {
      return res.status(400).json({ error: "금액 범위가 올바르지 않습니다." });
    }
    if (isNaN(unitAmount) || unitAmount <= 0) {
      return res.status(400).json({ error: "단위 금액이 올바르지 않습니다." });
    }

    const before = getConfig();
    const updated = setConfig({
      depositMinAmount: String(minAmount),
      depositMaxAmount: String(maxAmount),
      depositUnitAmount: String(unitAmount),
      bankAccountBank: String(bankAccountBank || ""),
      bankAccountNumber: String(bankAccountNumber || ""),
      bankAccountName: String(bankAccountName || ""),
    });
    const actor = req.header("X-Admin-Actor") || "admin";
    writeConfigLog(actor, before, updated);

    return res.json({
      depositMinAmount: parseInt(updated.depositMinAmount, 10),
      depositMaxAmount: parseInt(updated.depositMaxAmount, 10),
      depositUnitAmount: parseInt(updated.depositUnitAmount, 10),
      bankAccountBank: updated.bankAccountBank,
      bankAccountNumber: updated.bankAccountNumber,
      bankAccountName: updated.bankAccountName,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// 설정 변경 이력 조회 (관리자)
app.get("/api/config-logs", (req, res) => {
  try {
    if (adminApiKey) {
      const key = req.header("X-Admin-Key");
      if (!key || key !== adminApiKey) {
        return res.status(401).json({ error: "관리자 키가 필요합니다." });
      }
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const stmt = db.prepare("SELECT * FROM config_logs ORDER BY created_at DESC LIMIT ?");
    const rows = stmt.all(limit);
    return res.json({
      success: true,
      count: rows.length,
      logs: rows.map((r) => ({
        id: r.id,
        actor: r.actor,
        changes: JSON.parse(r.changes),
        createdAt: r.created_at,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// 이메일 템플릿 조회
app.get("/api/email-templates", (req, res) => {
  try {
    if (adminApiKey) {
      const key = req.header("X-Admin-Key");
      if (!key || key !== adminApiKey) {
        return res.status(401).json({ error: "관리자 키가 필요합니다." });
      }
    }
    const templates = getEmailTemplates();
    return res.json({ success: true, templates });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// 이메일 템플릿 저장 (관리자)
app.post("/api/email-templates", (req, res) => {
  try {
    if (adminApiKey) {
      const key = req.header("X-Admin-Key");
      if (!key || key !== adminApiKey) {
        return res.status(401).json({ error: "관리자 키가 필요합니다." });
      }
    }

    const { key, subject, body } = req.body || {};
    if (!key || !subject || !body) {
      return res.status(400).json({ error: "key, subject, body가 필요합니다." });
    }
    upsertEmailTemplate(String(key), String(subject), String(body));
    const templates = getEmailTemplates();
    return res.json({ success: true, templates });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// 웹사이트 충전 요청 생성
app.post("/api/deposit-request", (req, res) => {
  try {
    const { playerName, depositorName, amount, discordUserId, minecraftName, email } = req.body;
    const result = createDepositRequest(playerName, depositorName, amount, discordUserId, minecraftName, email);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// 웹사이트 충전 요청 조회
app.get("/api/deposit-request/:id", (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare("SELECT * FROM deposit_requests WHERE request_id = ?");
    const request = stmt.get(id);
    if (!request) {
      return res.status(404).json({ error: "충전 요청을 찾을 수 없습니다." });
    }
    const isAdminRequest = adminApiKey
      ? req.header("X-Admin-Key") && req.header("X-Admin-Key") === adminApiKey
      : true;
    return res.json({
      requestId: request.request_id,
      playerName: request.player_name,
      depositorName: request.depositor_name,
      amount: request.amount,
      discordUserId: request.discord_user_id,
      email: isAdminRequest ? request.email : undefined,
      createdAt: request.created_at,
      deadlineTimestamp: request.deadline_timestamp,
      status: request.status,
      minecraftName: request.minecraft_name,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// 웹사이트 충전 요청 목록 (관리자)
app.get("/api/deposit-requests", (req, res) => {
  try {
    const status = req.query.status;
    let query = "SELECT * FROM deposit_requests";
    const values = [];
    if (status) {
      query += " WHERE status = ?";
      values.push(status);
    }
    query += " ORDER BY created_at DESC";

    const stmt = db.prepare(query);
    const rows = stmt.all(...values);
    const isAdminRequest = adminApiKey
      ? req.header("X-Admin-Key") && req.header("X-Admin-Key") === adminApiKey
      : true;

    return res.json({
      success: true,
      count: rows.length,
      requests: rows.map((r) => ({
        requestId: r.request_id,
        playerName: r.player_name,
        depositorName: r.depositor_name,
        amount: r.amount,
        discordUserId: r.discord_user_id,
        email: isAdminRequest ? r.email : undefined,
        createdAt: r.created_at,
        deadlineTimestamp: r.deadline_timestamp,
        status: r.status,
        minecraftName: r.minecraft_name,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// 웹사이트 충전 승인 (관리자)
app.post("/api/deposit-confirm", (req, res) => {
  try {
    if (adminApiKey) {
      const key = req.header("X-Admin-Key");
      if (!key || key !== adminApiKey) {
        return res.status(401).json({ error: "관리자 키가 필요합니다." });
      }
    }

    const { requestId } = req.body;
    if (!requestId) {
      return res.status(400).json({ error: "requestId가 필요합니다." });
    }

    const result = confirmDepositRequest(requestId);
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// 간단한 웹 폼 (테스트용)
app.get("/charge", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`
    <!doctype html>
    <html lang="ko">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>OG 캐쉬 충전</title>
      <style>
        body { background:#0b0d12; color:#fff; font-family:system-ui, sans-serif; display:flex; min-height:100vh; align-items:center; justify-content:center; }
        .box { width:min(520px, 92vw); background:#121826; padding:32px; border-radius:18px; box-shadow:0 20px 60px rgba(0,0,0,.45); }
        input { width:100%; padding:12px; margin:8px 0 16px; border-radius:10px; border:1px solid #2a3244; background:#0f1420; color:#fff; }
        button { width:100%; padding:12px; border-radius:10px; border:none; background:#5865f2; color:#fff; font-weight:600; }
        .result { margin-top:16px; font-size:0.9rem; opacity:0.85; white-space:pre-wrap; }
        .account { margin-top:12px; padding:12px; background:#0f1420; border-radius:10px; border:1px solid #2a3244; }
      </style>
    </head>
    <body>
      <div class="box">
        <h2>OG 캐쉬 충전</h2>
        <label>플레이어명</label>
        <input id="player" placeholder="플레이어명" />
        <label>입금자명</label>
        <input id="depositor" placeholder="입금자명" />
        <label>금액</label>
        <input id="amount" type="number" placeholder="10000" />
        <button onclick="submitForm()">충전 요청</button>
        <div class="account" id="account"></div>
        <div class="result" id="result"></div>
      </div>
      <script>
        async function submitForm() {
          const playerName = document.getElementById('player').value.trim();
          const depositorName = document.getElementById('depositor').value.trim();
          const amount = document.getElementById('amount').value.trim();
          const res = await fetch('/api/deposit-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerName, depositorName, amount, discordUserId: 'web' })
          });
          const data = await res.json();
          document.getElementById('result').textContent = JSON.stringify(data, null, 2);
          const account = data.account || {};
          document.getElementById('account').textContent = account.number
            ? '입금 계좌: ' + account.bank + ' ' + account.number + ' (' + account.name + ')'
            : '입금 계좌가 설정되지 않았습니다.';
        }
      </script>
    </body>
    </html>
  `);
});

// 기존 기능 유지
app.post("/api/transfer", async (req, res) => {
  try {
    const { bankName, playerName, amount } = req.body;

    if (!bankName || !playerName || !amount) {
      return res.status(400).json({ error: "필수 필드가 누락되었습니다." });
    }

    const result = await processTransfer("manual", playerName, bankName, amount);
    return res.json({ success: result, message: "계좌이체 처리 완료" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/api/status", (req, res) => {
  res.json({
    status: "running",
    timestamp: new Date().toISOString(),
    service: "BankAPI Server",
    features: [
      "PushBullet WebSocket (은행 알림 수신)",
      "로컬 검증(계좌이체)",
      "Express API",
      "웹사이트 충전 요청",
    ],
  });
});

app.get("/api/transfers", (req, res) => {
  try {
    const stmt = db.prepare("SELECT * FROM transfers ORDER BY created_at DESC");
    const records = stmt.all();

    res.json({
      success: true,
      count: records.length,
      transfers: records.map((r) => ({
        id: r.id,
        bankName: r.bank_name,
        playerName: r.player_name,
        amount: r.amount,
        status: r.status,
        confirmed: r.confirmed === 1,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/transfer/:id", (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare("SELECT * FROM transfers WHERE id = ?");
    const transferData = stmt.get(id);

    if (!transferData) {
      return res.status(404).json({ error: "계좌이체 기록을 찾을 수 없습니다." });
    }

    res.json({
      id: transferData.id,
      bankName: transferData.bank_name,
      playerName: transferData.player_name,
      amount: transferData.amount,
      status: transferData.status,
      confirmed: transferData.confirmed === 1,
      createdAt: transferData.created_at,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/confirm-transfer", async (req, res) => {
  try {
    const { transferId } = req.body;

    if (!transferId) {
      return res.status(400).json({ error: "계좌이체 ID가 필요합니다." });
    }

    const result = await confirmTransfer(transferId);

    if (result.success) {
      return res.json(result);
    }
    return res.status(404).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/api/db/charges", async (req, res) => {
  try {
    const playerName = req.query.playerName;
    const method = req.query.method;

    const charges = await database.getCharges({ playerName, method });

    res.json({
      success: true,
      count: charges.length,
      charges,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/db/users", async (req, res) => {
  try {
    const users = await database.getAllUsers();

    res.json({
      success: true,
      count: users.length,
      users: users.map((u) => ({
        siteId: u.site_id,
        bankName: u.bank_name,
        playerName: u.player_name,
        createdAt: u.created_at,
        money: u.money,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== 시작 =====
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`\n[Express] API 서버 시작 - http://localhost:${PORT}`);
  console.log("[API] POST /api/deposit-request - 웹사이트 충전 요청");
  console.log("[API] POST /api/deposit-confirm - 웹사이트 충전 승인");
  console.log("[API] GET /charge - 충전 폼");
  console.log("[API] POST /api/transfer - 계좌이체 요청");
  console.log("[API] GET /api/transfers - 계좌이체 조회\n");
});

// PushBullet 연결 시작
startApp();
