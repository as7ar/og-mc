# OG Server

OG 서버 소개 페이지에 Discord OAuth2 로그인과 관리자 판별을 추가한 Next.js(App Router) 프로젝트입니다.

## 요구 사항
- Node.js 18+ 권장

## 설치
```
npm install
```

## 환경변수
`.env`를 생성하고 아래 항목을 설정하세요.

```
# Discord OAuth2
DISCORD_CLIENT_ID=YOUR_DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET=YOUR_DISCORD_CLIENT_SECRET
DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/callback

# 세션/관리자
SESSION_SECRET=CHANGE_ME_TO_A_32_CHARS_MIN_SECRET
ADMIN_DISCORD_IDS=123,456,789
BASE_URL=http://localhost:3000

# BankAPI
BANKPIN=
BANK_NAME=
PORT=3001
BANKAPI_CORS_ORIGIN=*
ADMIN_API_KEY=
DEPOSIT_DEADLINE_MINUTES=30
DEPOSIT_MIN_AMOUNT=1000
DEPOSIT_MAX_AMOUNT=1000000
DEPOSIT_UNIT_AMOUNT=1000

# 입금 계좌 정보 (웹 충전 안내용)
BANK_ACCOUNT_BANK=
BANK_ACCOUNT_NUMBER=
BANK_ACCOUNT_NAME=

# Next -> BankAPI
BANKAPI_BASE_URL=http://localhost:3001
BANKAPI_ADMIN_KEY=
```

- `ADMIN_DISCORD_IDS`는 콤마(,)로 구분합니다.
- `SESSION_SECRET`은 최소 32자 이상이며, 비우면 서버 시작 시 자동 생성됩니다.
- `BASE_URL`은 선택값이며, 없으면 요청 origin을 사용합니다.
- `ADMIN_API_KEY`를 설정하면 `/api/config`, `/api/deposit-confirm` 호출 시 `X-Admin-Key` 헤더가 필요합니다.
- `BANKAPI_ADMIN_KEY`는 Next 서버에서 BankAPI 관리자 호출에 사용하는 키입니다.

## 실행
```
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 후 `Discord로 로그인` 버튼을 사용하세요.

## 기능 요약
- Discord OAuth2 Authorization Code Flow (scope: identify)
- 세션 쿠키 기반 로그인 유지 (httpOnly, sameSite, secure(프로덕션))
- Discord ID 기반 관리자 판별 및 ADMIN 배지 표시
- 로그인/로그아웃 및 에러 UI
- 페이지 로드/스크롤 진입 애니메이션 + prefers-reduced-motion 대응

## BankAPI (웹사이트 충전)
- `GET /api/config`: 충전 정책/계좌 정보 조회
- `POST /api/config`: 충전 정책/계좌 정보 변경 (관리자 키 필요)
- `GET /api/config-logs`: 설정 변경 이력 조회 (관리자 키 필요)
- `POST /api/deposit-request`: 웹 충전 요청 생성
- `GET /api/deposit-request/:id`: 충전 요청 조회
- `GET /api/deposit-requests`: 충전 요청 목록
- `POST /api/deposit-confirm`: 충전 승인 (관리자 키 선택)
- `GET /charge`: 간단 충전 폼


## 지원하는 은행 목록

이 시스템에서 지원하는 은행들과 그에 해당하는 알림 애플리케이션 이름(package_name)은 다음과 같습니다.

| 순번 | 은행명 | Package Name | 비고 |
|------|--------|--------------|------|
| 1 | 기업은행 | `com.IBK.SmartPush.app` | IBK SmartPush |
| 2 | 우리은행 | `com.wooribank.smart.npib` | 우리은행 모바일뱅킹 |
| 3 | 카카오뱅크 | `com.kakaobank.channel` | 카카오뱅크 |
| 4 | 농협은행 | `com.nh.mobilenoti` | NH모바일뱅킹 |
| 5 | KB국민은행 | `com.kbstar.reboot` | KB스타뱅킹 |
| 6 | 케이뱅크 | `com.kbankwith.smartbank` | K뱅크 스마트뱅킹 |
| 7 | 토스뱅크 | `viva.republica.toss` | 토스 (일반) |