"use client";

import "../../assets/styles/admin-charge.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import FontFamily from "@tiptap/extension-font-family";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";

type SessionUser = {
  discordId: string;
  isAdmin?: boolean;
};

type DepositRequest = {
  requestId: string;
  playerName: string;
  depositorName: string;
  amount: number;
  discordUserId: string;
  createdAt: string;
  deadlineTimestamp: number;
  status: string;
  minecraftName?: string | null;
};

const statusLabel: Record<string, string> = {
  pending: "대기",
  confirmed: "완료",
};

type BankConfig = {
  depositMinAmount: number;
  depositMaxAmount: number;
  depositUnitAmount: number;
  bankAccountBank: string;
  bankAccountNumber: string;
  bankAccountName: string;
};

type EmailTemplate = {
  key: string;
  subject: string;
  body: string;
};

type MailForm = {
  to: string;
  templateKey: string;
  variables: string;
  subject: string;
  html: string;
};

const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
});

export default function AdminChargeClient() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<DepositRequest[]>([]);
  const [fetching, setFetching] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchText, setSearchText] = useState<string>("");
  const [selected, setSelected] = useState<DepositRequest | null>(null);
  const [config, setConfig] = useState<BankConfig | null>(null);
  const [configForm, setConfigForm] = useState<BankConfig | null>(null);
  const [configSaving, setConfigSaving] = useState(false);

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [activeTemplateKey, setActiveTemplateKey] = useState<string>("");
  const [templateForm, setTemplateForm] = useState<EmailTemplate>({ key: "", subject: "", body: "" });
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateMode, setTemplateMode] = useState<"visual" | "html">("visual");
  const htmlSyncRef = useRef(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [buttonPreset, setButtonPreset] = useState<"primary" | "outline" | "soft">("primary");

  const [mailForm, setMailForm] = useState<MailForm>({
    to: "",
    templateKey: "",
    variables: "",
    subject: "",
    html: "",
  });
  const [mailSending, setMailSending] = useState(false);
  const [mailMode, setMailMode] = useState<"visual" | "html">("visual");
  const mailHtmlSyncRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!mounted) return;
        const data = await res.json();
        if (data?.authenticated) {
          setUser(data as SessionUser);
        } else {
          setUser(null);
        }
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadUser();
    return () => {
      mounted = false;
    };
  }, []);

  const fetchRequests = async () => {
    setFetching(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      const qs = params.toString();
      const res = await fetch(`/api/bank/deposit-requests${qs ? `?${qs}` : ""}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "목록 조회 실패");
      }
      setRequests(data.requests || []);
    } catch (e: any) {
      setError(e?.message || "목록 조회 오류");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (user?.isAdmin) {
      fetchRequests();
    }
  }, [user?.isAdmin, statusFilter]);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/bank/config", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "설정 조회 실패");
      }
      setConfig(data);
      setConfigForm(data);
    } catch (e: any) {
      setError(e?.message || "설정 조회 오류");
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/bank/email-templates", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "템플릿 조회 실패");
      }
      const list = data.templates || [];
      setTemplates(list);
      if (!activeTemplateKey && list.length > 0) {
        setActiveTemplateKey(list[0].key);
        setTemplateForm(list[0]);
      }
      if (!mailForm.templateKey && list.length > 0) {
        setMailForm((prev) => ({ ...prev, templateKey: list[0].key }));
      }
    } catch (e: any) {
      setError(e?.message || "템플릿 조회 오류");
    }
  };

  useEffect(() => {
    if (user?.isAdmin) {
      fetchConfig();
      fetchTemplates();
    }
  }, [user?.isAdmin]);

  const confirmRequest = async (requestId: string) => {
    setConfirmingId(requestId);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/bank/deposit-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "승인 실패");
      }
      setSuccess("충전 완료 처리되었습니다.");
      if (statusFilter === "pending") {
        setStatusFilter("confirmed");
      }
      await fetchRequests();
    } catch (e: any) {
      setError(e?.message || "승인 오류");
    } finally {
      setConfirmingId(null);
    }
  };

  const filteredRequests = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return requests;
    return requests.filter((r) => {
      return (
        r.requestId.toLowerCase().includes(query) ||
        r.playerName.toLowerCase().includes(query) ||
        r.depositorName.toLowerCase().includes(query) ||
        r.discordUserId.toLowerCase().includes(query) ||
        (r.minecraftName || "").toLowerCase().includes(query)
      );
    });
  }, [requests, searchText]);

  const handleConfigChange = (field: keyof BankConfig, value: string) => {
    setConfigForm((prev) => {
      if (!prev) return prev;
      if (field === "depositMinAmount" || field === "depositMaxAmount" || field === "depositUnitAmount") {
        return { ...prev, [field]: Number(value) };
      }
      return { ...prev, [field]: value };
    });
  };

  const saveConfig = async () => {
    if (!configForm) return;
    setConfigSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/bank/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configForm),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "설정 저장 실패");
      }
      setConfig(data);
      setConfigForm(data);
      setSuccess("설정이 저장되었습니다.");
    } catch (e: any) {
      setError(e?.message || "설정 저장 오류");
    } finally {
      setConfigSaving(false);
    }
  };

  const handleTemplateSelect = (value: string) => {
    setActiveTemplateKey(value);
    if (value === "new") {
      setTemplateForm({ key: "", subject: "", body: "" });
      return;
    }
    const selectedTemplate = templates.find((tpl) => tpl.key === value);
    if (selectedTemplate) {
      setTemplateForm(selectedTemplate);
    }
  };

  const handleTemplateChange = (field: keyof EmailTemplate, value: string) => {
    setTemplateForm((prev) => ({ ...prev, [field]: value }));
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: "여기에 내용을 입력하세요" }),
      Color,
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      FontFamily,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      FontSize,
    ],
    content: templateForm.body || "<p></p>",
    onUpdate: ({ editor }) => {
      if (templateMode !== "visual" || htmlSyncRef.current) return;
      setTemplateForm((prev) => ({ ...prev, body: editor.getHTML() }));
    },
    editorProps: {
      attributes: { class: "tiptap-editor" },
    },
  });

  useEffect(() => {
    if (!editor || templateMode !== "visual") return;
    if (editor.getHTML() !== templateForm.body) {
      htmlSyncRef.current = true;
      editor.commands.setContent(templateForm.body || "<p></p>", false);
      htmlSyncRef.current = false;
    }
  }, [editor, templateForm.body, templateMode]);

  const mailEditor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: "여기에 메일 내용을 입력하세요" }),
      Color,
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      FontFamily,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      FontSize,
    ],
    content: mailForm.html || "<p></p>",
    onUpdate: ({ editor }) => {
      if (mailMode !== "visual" || mailHtmlSyncRef.current) return;
      setMailForm((prev) => ({ ...prev, html: editor.getHTML() }));
    },
    editorProps: {
      attributes: { class: "tiptap-editor" },
    },
  });

  useEffect(() => {
    if (!mailEditor || mailMode !== "visual") return;
    if (mailEditor.getHTML() !== mailForm.html) {
      mailHtmlSyncRef.current = true;
      mailEditor.commands.setContent(mailForm.html || "<p></p>", false);
      mailHtmlSyncRef.current = false;
    }
  }, [mailEditor, mailForm.html, mailMode]);

  const applyFontSize = (size: string) => {
    if (!editor) return;
    editor.chain().focus().setMark("textStyle", { fontSize: `${size}px` }).run();
  };

  const insertLink = (editorInstance: typeof editor) => {
    if (!editorInstance) return;
    const url = window.prompt("링크 URL을 입력하세요");
    if (!url) return;
    editorInstance.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const insertButton = (editorInstance: typeof editor) => {
    if (!editorInstance) return;
    const text = window.prompt("버튼 텍스트를 입력하세요", "자세히 보기");
    if (!text) return;
    const url = window.prompt("버튼 링크 URL을 입력하세요");
    if (!url) return;
    const color = "#5865F2";
    const style =
      buttonPreset === "outline"
        ? [
            "display:inline-block",
            "padding:12px 18px",
            "border-radius:12px",
            "text-decoration:none",
            "font-weight:600",
            `color:${color}`,
            `border:1px solid ${color}`,
            "background:transparent",
          ].join(";")
        : buttonPreset === "soft"
          ? [
              "display:inline-block",
              "padding:12px 18px",
              "border-radius:12px",
              "text-decoration:none",
              "font-weight:600",
              `color:${color}`,
              `background:rgba(88,101,242,0.15)`,
            ].join(";")
          : [
              "display:inline-block",
              "padding:12px 18px",
              "border-radius:12px",
              "text-decoration:none",
              "font-weight:600",
              "color:#ffffff",
              `background:${color}`,
            ].join(";");
    editorInstance
      .chain()
      .focus()
      .insertContent(`<a href="${url}" class="email-btn" style="${style}">${text}</a>`)
      .run();
  };

  const insertTable = (editorInstance: typeof editor) => {
    if (!editorInstance) return;
    editorInstance.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const uploadImageFile = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/uploads/email", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error || "이미지 업로드 실패");
      return null;
    }
    return data.url as string;
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file || !editor) return;
    const url = await uploadImageFile(file);
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  };

  const handleMailImageUpload = async (file: File | null) => {
    if (!file || !mailEditor) return;
    const url = await uploadImageFile(file);
    if (!url) return;
    mailEditor.chain().focus().setImage({ src: url }).run();
  };

  const handleDropOrPaste = async (files: FileList | File[], target: "template" | "mail") => {
    const file = Array.from(files).find((f) => f.type.startsWith("image/"));
    if (!file) return;
    const url = await uploadImageFile(file);
    if (!url) return;
    if (target === "template") {
      editor?.chain().focus().setImage({ src: url }).run();
    } else {
      mailEditor?.chain().focus().setImage({ src: url }).run();
    }
  };

  const renderToolbar = (editorInstance: typeof editor, opts?: { allowPreview?: boolean }) => (
    <div className="template-toolbar">
      <div className="toolbar-group">
        <select
          className="template-font"
          onChange={(e) => editorInstance?.chain().focus().setFontFamily(e.target.value).run()}
          defaultValue=""
        >
          <option value="" disabled>
            폰트
          </option>
          <option value="Apple SD Gothic Neo">Apple SD Gothic Neo</option>
          <option value="Pretendard">Pretendard</option>
          <option value="Noto Sans KR">Noto Sans KR</option>
          <option value="Malgun Gothic">Malgun Gothic</option>
        </select>
        <select
          className="template-font"
          onChange={(e) => {
            const size = e.target.value;
            if (!size || !editorInstance) return;
            editorInstance.chain().focus().setMark("textStyle", { fontSize: `${size}px` }).run();
          }}
          defaultValue=""
        >
          <option value="" disabled>
            크기
          </option>
          <option value="12">12px</option>
          <option value="14">14px</option>
          <option value="16">16px</option>
          <option value="18">18px</option>
          <option value="20">20px</option>
          <option value="24">24px</option>
          <option value="28">28px</option>
        </select>
        <select
          className="template-font"
          onChange={(e) => {
            const val = e.target.value;
            if (!val || !editorInstance) return;
            if (val === "p") editorInstance.chain().focus().setParagraph().run();
            if (val === "h1") editorInstance.chain().focus().toggleHeading({ level: 1 }).run();
            if (val === "h2") editorInstance.chain().focus().toggleHeading({ level: 2 }).run();
            if (val === "h3") editorInstance.chain().focus().toggleHeading({ level: 3 }).run();
          }}
          defaultValue="p"
        >
          <option value="p">본문</option>
          <option value="h1">제목 1</option>
          <option value="h2">제목 2</option>
          <option value="h3">제목 3</option>
        </select>
      </div>

      <div className="toolbar-group">
        <button type="button" onClick={() => editorInstance?.chain().focus().toggleBold().run()}>
          B
        </button>
        <button type="button" onClick={() => editorInstance?.chain().focus().toggleItalic().run()}>
          I
        </button>
        <button type="button" onClick={() => editorInstance?.chain().focus().toggleUnderline().run()}>
          U
        </button>
        <button type="button" onClick={() => editorInstance?.chain().focus().toggleBulletList().run()}>
          • 목록
        </button>
        <button type="button" onClick={() => editorInstance?.chain().focus().toggleOrderedList().run()}>
          1. 목록
        </button>
      </div>

      <div className="toolbar-group">
        <button type="button" onClick={() => editorInstance?.chain().focus().setTextAlign("left").run()}>
          왼쪽
        </button>
        <button type="button" onClick={() => editorInstance?.chain().focus().setTextAlign("center").run()}>
          가운데
        </button>
        <button type="button" onClick={() => editorInstance?.chain().focus().setTextAlign("right").run()}>
          오른쪽
        </button>
      </div>

      <div className="toolbar-group">
        <label className="template-color">
          글자색
          <input
            type="color"
            onChange={(e) => editorInstance?.chain().focus().setColor(e.target.value).run()}
          />
        </label>
        <label className="template-color">
          강조색
          <input
            type="color"
            onChange={(e) => editorInstance?.chain().focus().toggleHighlight({ color: e.target.value }).run()}
          />
        </label>
      </div>

      <div className="toolbar-group">
        <button type="button" onClick={() => editorInstance?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          표
        </button>
        <button type="button" onClick={() => editorInstance?.chain().focus().addRowAfter().run()}>
          행+
        </button>
        <button type="button" onClick={() => editorInstance?.chain().focus().addColumnAfter().run()}>
          열+
        </button>
        <button type="button" onClick={() => editorInstance?.chain().focus().deleteRow().run()}>
          행-
        </button>
        <button type="button" onClick={() => editorInstance?.chain().focus().deleteColumn().run()}>
          열-
        </button>
        <button type="button" onClick={() => editorInstance?.chain().focus().deleteTable().run()}>
          표삭제
        </button>
      </div>

      <div className="toolbar-group">
        <button type="button" onClick={() => insertLink(editorInstance)}>
          링크
        </button>
        <select
          className="template-font"
          value={buttonPreset}
          onChange={(e) => setButtonPreset(e.target.value as "primary" | "outline" | "soft")}
        >
          <option value="primary">버튼: Primary</option>
          <option value="outline">버튼: Outline</option>
          <option value="soft">버튼: Soft</option>
        </select>
        <button type="button" onClick={() => insertButton(editorInstance)}>
          버튼
        </button>
      </div>

      <div className="toolbar-group">
        <label className="template-file">
          이미지
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              editorInstance === editor
                ? handleImageUpload(e.target.files?.[0] ?? null)
                : handleMailImageUpload(e.target.files?.[0] ?? null)
            }
          />
        </label>
      </div>

      {opts?.allowPreview && (
        <div className="toolbar-group">
          <button type="button" onClick={() => setPreviewOpen(true)}>
            미리보기
          </button>
        </div>
      )}
    </div>
  );

  const saveTemplate = async () => {
    if (!templateForm.key || !templateForm.subject || !templateForm.body) {
      setError("템플릿 키/제목/본문을 입력해주세요.");
      return;
    }
    setTemplateSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/bank/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateForm),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "템플릿 저장 실패");
      }
      const list = data.templates || [];
      setTemplates(list);
      setSuccess("템플릿이 저장되었습니다.");
      if (activeTemplateKey === "new") {
        setActiveTemplateKey(templateForm.key);
      }
    } catch (e: any) {
      setError(e?.message || "템플릿 저장 오류");
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleMailChange = (field: keyof MailForm, value: string) => {
    setMailForm((prev) => ({ ...prev, [field]: value }));
  };

  const sendAdminMail = async () => {
    if (!mailForm.to.trim()) {
      setError("수신자 이메일을 입력해주세요.");
      return;
    }

    const payload: any = { to: mailForm.to.trim() };
    if (mailForm.templateKey) {
      payload.templateKey = mailForm.templateKey;
      if (mailForm.variables.trim()) {
        try {
          payload.variables = JSON.parse(mailForm.variables);
        } catch {
          setError("변수 JSON 형식이 올바르지 않습니다.");
          return;
        }
      }
    } else {
      if (!mailForm.subject.trim() || !mailForm.html.trim()) {
        setError("제목과 본문을 입력해주세요.");
        return;
      }
      payload.subject = mailForm.subject.trim();
      payload.html = mailForm.html;
    }

    setMailSending(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "메일 전송 실패");
      }
      setSuccess("메일을 전송했습니다.");
    } catch (e: any) {
      setError(e?.message || "메일 전송 오류");
    } finally {
      setMailSending(false);
    }
  };

  return (
    <div className="admin-charge-page">
      <div className="admin-charge-bg" />
      <div className="admin-charge-overlay" />

      <main className="admin-charge-main">
        <header className="admin-charge-header">
          <div>
            <h1>충전 요청 관리</h1>
            <p className="admin-sub">실시간 요청 상태를 확인하고 승인할 수 있습니다.</p>
          </div>
          <div className="admin-header-actions">
            <button className="admin-export" onClick={() => handleExportCsv()} type="button">
              CSV 다운로드
            </button>
            <button className="admin-refresh" onClick={fetchRequests} disabled={fetching} type="button">
              {fetching ? "불러오는 중..." : "새로고침"}
            </button>
          </div>
        </header>

        {loading && <div className="admin-empty">로딩 중...</div>}

        {!loading && (!user || !user.isAdmin) && <div className="admin-empty">관리자만 접근 가능합니다.</div>}

        {!loading && user?.isAdmin && (
          <section className="admin-list">
            <div className="admin-config">
              <h2>충전 정책/계좌 설정</h2>
              {configForm ? (
                <div className="admin-config-grid">
                  <div className="admin-control">
                    <label>최소 충전 금액</label>
                    <input
                      type="number"
                      value={configForm.depositMinAmount}
                      onChange={(e) => handleConfigChange("depositMinAmount", e.target.value)}
                    />
                  </div>
                  <div className="admin-control">
                    <label>최대 충전 금액</label>
                    <input
                      type="number"
                      value={configForm.depositMaxAmount}
                      onChange={(e) => handleConfigChange("depositMaxAmount", e.target.value)}
                    />
                  </div>
                  <div className="admin-control">
                    <label>충전 단위(원)</label>
                    <input
                      type="number"
                      value={configForm.depositUnitAmount}
                      onChange={(e) => handleConfigChange("depositUnitAmount", e.target.value)}
                    />
                  </div>
                  <div className="admin-control">
                    <label>은행명</label>
                    <input
                      value={configForm.bankAccountBank}
                      onChange={(e) => handleConfigChange("bankAccountBank", e.target.value)}
                    />
                  </div>
                  <div className="admin-control">
                    <label>계좌번호</label>
                    <input
                      value={configForm.bankAccountNumber}
                      onChange={(e) => handleConfigChange("bankAccountNumber", e.target.value)}
                    />
                  </div>
                  <div className="admin-control">
                    <label>예금주명</label>
                    <input
                      value={configForm.bankAccountName}
                      onChange={(e) => handleConfigChange("bankAccountName", e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="admin-empty">설정 정보를 불러오는 중...</div>
              )}
              <div className="admin-config-actions">
                <button className="admin-confirm" onClick={saveConfig} disabled={configSaving} type="button">
                  {configSaving ? "저장 중..." : "설정 저장"}
                </button>
              </div>
            </div>

            <div className="admin-templates">
              <h2>이메일 템플릿</h2>
              <p className="admin-sub">
                변수 예시: {"{{name}}"}, {"{{requestId}}"}, {"{{amount}}"}, {"{{status}}"}, {"{{account}}"},
                {"{{date}}"}
              </p>
              <div className="admin-template-grid">
                <div className="admin-control">
                  <label>템플릿 선택</label>
                  <select value={activeTemplateKey} onChange={(e) => handleTemplateSelect(e.target.value)}>
                    {templates.map((tpl) => (
                      <option key={tpl.key} value={tpl.key}>
                        {tpl.key}
                      </option>
                    ))}
                    <option value="new">+ 새 템플릿</option>
                  </select>
                </div>
                <div className="admin-control">
                  <label>템플릿 키</label>
                  <input
                    value={templateForm.key}
                    onChange={(e) => handleTemplateChange("key", e.target.value)}
                    placeholder="login_attempt"
                  />
                </div>
                <div className="admin-control admin-control-wide">
                  <label>제목</label>
                  <input
                    value={templateForm.subject}
                    onChange={(e) => handleTemplateChange("subject", e.target.value)}
                    placeholder="[OG] 알림"
                  />
                </div>
                <div className="admin-control admin-control-wide">
                  <label>본문 편집기</label>
                  {renderToolbar(editor, { allowPreview: true })}
                  <div className="toolbar-group editor-mode-toggle">
                    <button
                      type="button"
                      className={templateMode === "visual" ? "active" : ""}
                      onClick={() => setTemplateMode("visual")}
                    >
                      문서
                    </button>
                    <button
                      type="button"
                      className={templateMode === "html" ? "active" : ""}
                      onClick={() => setTemplateMode("html")}
                    >
                      HTML
                    </button>
                  </div>
                  {templateMode === "visual" ? (
                    <div className="template-editor">
                      <EditorContent
                        editor={editor}
                        onDrop={(event) => {
                          if (!event.dataTransfer?.files?.length) return;
                          event.preventDefault();
                          handleDropOrPaste(event.dataTransfer.files, "template");
                        }}
                        onPaste={(event) => {
                          const files = event.clipboardData?.files;
                          if (!files?.length) return;
                          handleDropOrPaste(files, "template");
                        }}
                      />
                    </div>
                  ) : (
                    <textarea
                      rows={8}
                      value={templateForm.body}
                      onChange={(e) => handleTemplateChange("body", e.target.value)}
                      placeholder="<p>내용</p>"
                    />
                  )}
                </div>
              </div>
              <div className="admin-config-actions">
                <button className="admin-confirm" onClick={saveTemplate} disabled={templateSaving} type="button">
                  {templateSaving ? "저장 중..." : "템플릿 저장"}
                </button>
              </div>
            </div>

            <div className="admin-mail">
              <h2>메일 보내기</h2>
              <div className="admin-template-grid">
                <div className="admin-control">
                  <label>수신자 이메일</label>
                  <input
                    value={mailForm.to}
                    onChange={(e) => handleMailChange("to", e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="admin-control">
                  <label>템플릿 사용</label>
                  <select
                    value={mailForm.templateKey}
                    onChange={(e) => handleMailChange("templateKey", e.target.value)}
                  >
                    <option value="">사용 안함</option>
                    {templates.map((tpl) => (
                      <option key={tpl.key} value={tpl.key}>
                        {tpl.key}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="admin-control admin-control-wide">
                  <label>변수(JSON)</label>
                  <input
                    value={mailForm.variables}
                    onChange={(e) => handleMailChange("variables", e.target.value)}
                    placeholder='{"name":"사용자"}'
                  />
                </div>
                <div className="admin-control admin-control-wide">
                  <label>제목 (템플릿 사용 시 무시됨)</label>
                  <input
                    value={mailForm.subject}
                    onChange={(e) => handleMailChange("subject", e.target.value)}
                    placeholder="제목"
                  />
                </div>
                {mailForm.templateKey ? (
                  <div className="admin-control admin-control-wide">
                    <label>템플릿 기반 전송 중 (본문 편집 비활성)</label>
                    <div className="admin-empty">템플릿을 사용하면 본문 편집은 템플릿에서 관리됩니다.</div>
                  </div>
                ) : (
                  <div className="admin-control admin-control-wide">
                    <label>메일 본문 편집기</label>
                    {renderToolbar(mailEditor)}
                    <div className="toolbar-group editor-mode-toggle">
                      <button
                        type="button"
                        className={mailMode === "visual" ? "active" : ""}
                        onClick={() => setMailMode("visual")}
                      >
                        문서
                      </button>
                      <button
                        type="button"
                        className={mailMode === "html" ? "active" : ""}
                        onClick={() => setMailMode("html")}
                      >
                        HTML
                      </button>
                    </div>
                    {mailMode === "visual" ? (
                      <div className="template-editor">
                        <EditorContent
                          editor={mailEditor}
                          onDrop={(event) => {
                            if (!event.dataTransfer?.files?.length) return;
                            event.preventDefault();
                            handleDropOrPaste(event.dataTransfer.files, "mail");
                          }}
                          onPaste={(event) => {
                            const files = event.clipboardData?.files;
                            if (!files?.length) return;
                            handleDropOrPaste(files, "mail");
                          }}
                        />
                      </div>
                    ) : (
                      <textarea
                        rows={8}
                        value={mailForm.html}
                        onChange={(e) => handleMailChange("html", e.target.value)}
                        placeholder="<p>메일 내용</p>"
                      />
                    )}
                  </div>
                )}
              </div>
              <div className="admin-config-actions">
                <button className="admin-confirm" onClick={sendAdminMail} disabled={mailSending} type="button">
                  {mailSending ? "전송 중..." : "메일 전송"}
                </button>
              </div>
            </div>

            <div className="admin-controls">
              <div className="admin-control">
                <label>상태</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">전체</option>
                  <option value="pending">대기</option>
                  <option value="confirmed">완료</option>
                </select>
              </div>
              <div className="admin-control grow">
                <label>검색</label>
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="요청 ID, 플레이어, 입금자, 디스코드 ID"
                />
              </div>
            </div>

            {error && <div className="admin-error">오류: {error}</div>}
            {success && <div className="admin-success">{success}</div>}
            {filteredRequests.length === 0 ? (
              <div className="admin-empty">현재 요청이 없습니다.</div>
            ) : (
              <div className="admin-table">
                <div className="admin-row admin-head">
                  <span>요청 ID</span>
                  <span>플레이어</span>
                  <span>입금자</span>
                  <span>금액</span>
                  <span>상태</span>
                  <span>액션</span>
                </div>
                {filteredRequests.map((req) => (
                  <div key={req.requestId} className="admin-row">
                    <span className="mono">{req.requestId}</span>
                    <span>{req.playerName}</span>
                    <span>{req.depositorName}</span>
                    <span>{req.amount.toLocaleString()}원</span>
                    <span className={`admin-status ${req.status}`}>{statusLabel[req.status] || req.status}</span>
                    <span className="admin-actions">
                      <button className="admin-detail" type="button" onClick={() => setSelected(req)}>
                        상세
                      </button>
                      {req.status === "confirmed" && (
                        <a
                          className="admin-detail"
                          href={`/api/bank/invoice/${req.requestId}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          PDF
                        </a>
                      )}
                      <button
                        className="admin-confirm"
                        type="button"
                        onClick={() => confirmRequest(req.requestId)}
                        disabled={confirmingId === req.requestId || req.status !== "pending"}
                      >
                        {confirmingId === req.requestId ? "승인 중..." : "승인"}
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {selected && (
        <div className="admin-modal" role="dialog" aria-modal="true">
          <div className="admin-modal-backdrop" onClick={() => setSelected(null)} />
          <div className="admin-modal-card">
            <header>
              <h2>요청 상세</h2>
              <button type="button" onClick={() => setSelected(null)}>
                닫기
              </button>
            </header>
            <div className="admin-modal-body">
              <div>
                <span>요청 ID</span>
                <strong>{selected.requestId}</strong>
              </div>
              <div>
                <span>플레이어</span>
                <strong>{selected.playerName}</strong>
              </div>
              <div>
                <span>입금자</span>
                <strong>{selected.depositorName}</strong>
              </div>
              <div>
                <span>금액</span>
                <strong>{selected.amount.toLocaleString()}원</strong>
              </div>
              <div>
                <span>디스코드 ID</span>
                <strong>{selected.discordUserId}</strong>
              </div>
              <div>
                <span>마인크래프트 닉네임</span>
                <strong>{selected.minecraftName || "-"}</strong>
              </div>
              <div>
                <span>생성 시간</span>
                <strong>{new Date(selected.createdAt).toLocaleString()}</strong>
              </div>
              <div>
                <span>마감 시간</span>
                <strong>{new Date(selected.deadlineTimestamp).toLocaleString()}</strong>
              </div>
              <div>
                <span>상태</span>
                <strong>{statusLabel[selected.status] || selected.status}</strong>
              </div>
            </div>
            <div className="admin-modal-actions">
              {selected.status === "confirmed" && (
                <a
                  className="admin-detail"
                  href={`/api/bank/invoice/${selected.requestId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  PDF 다운로드
                </a>
              )}
              <button
                className="admin-confirm"
                type="button"
                onClick={() => confirmRequest(selected.requestId)}
                disabled={selected.status !== "pending"}
              >
                승인
              </button>
              <button className="admin-detail" type="button" onClick={() => setSelected(null)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {previewOpen && (
        <div className="email-preview-modal" role="dialog" aria-modal="true">
          <div className="email-preview-backdrop" onClick={() => setPreviewOpen(false)} />
          <div className="email-preview-card">
            <header>
              <h2>이메일 미리보기</h2>
              <button type="button" onClick={() => setPreviewOpen(false)}>
                닫기
              </button>
            </header>
            <div className="email-preview-body">
              <div className="email-preview-subject">{templateForm.subject || "(제목 없음)"}</div>
              <div
                className="email-preview-content"
                dangerouslySetInnerHTML={{ __html: templateForm.body || "<p></p>" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function handleExportCsv() {
    const headers = [
      "requestId",
      "playerName",
      "depositorName",
      "amount",
      "discordUserId",
      "minecraftName",
      "status",
      "createdAt",
      "deadlineTimestamp",
    ];

    const rows = filteredRequests.map((r) => [
      r.requestId,
      r.playerName,
      r.depositorName,
      r.amount,
      r.discordUserId,
      r.minecraftName || "",
      r.status,
      r.createdAt,
      r.deadlineTimestamp,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => {
            const str = String(value ?? "");
            const escaped = str.replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `deposit-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
}

