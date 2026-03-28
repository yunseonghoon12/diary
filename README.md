# 그림일기 (diary-app)

Next.js 프론트 + NestJS API + PostgreSQL(Prisma) + OpenAI 선생님 답글.

## 로컬 실행

```bash
npm install
npm install --prefix backend
# 루트 .env 에 DATABASE_URL 등 (backend/env.example 참고)
npm run dev:all
```

- 프론트: [http://localhost:3000](http://localhost:3000)  
- API: `http://localhost:4000` (Next가 `/api/backend` 로 프록시)

## 커밋 시 자동 배포

### 1) 백엔드 API — Render (Blueprint)

1. [Render](https://dashboard.render.com) → **New** → **Blueprint** → GitHub에서 이 저장소 선택.
2. `render.yaml` 로 **Web Service `diary-api`** 가 만들어집니다.
3. **Environment** 에 다음을 설정합니다.
   - `DATABASE_URL`: [Neon](https://neon.tech) 등에서 만든 Postgres 연결 문자열 (Prisma 마이그레이션용; Neon이 안내하는 URL 사용).
   - `OPENAI_API_KEY`: OpenAI 키 (선생님 답글).
   - `CORS_ORIGIN`: 아래에서 배포한 **Vercel 프론트 URL** (예: `https://xxx.vercel.app`). 여러 개면 쉼표로 구분.
4. 배포가 끝나면 서비스 URL을 복사합니다 (예: `https://diary-api.onrender.com`).

`master` / `main` 에 **푸시할 때마다** Render가 다시 빌드·배포합니다.

### 2) 프론트 — Vercel (둘 중 하나만 사용)

**A. GitHub Actions로만 배포 (이 repo의 Workflow)**

1. [Vercel](https://vercel.com)에서 프로젝트를 만들고 **Git 연동은 끄거나**, 같은 브랜치에 대해 **중복 배포가 없도록** 한쪽만 켭니다.
2. GitHub 저장소 → **Settings → Secrets and variables → Actions** 에 추가:
   - `VERCEL_TOKEN`: [Account Tokens](https://vercel.com/account/tokens)
   - `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`: Vercel 프로젝트 → **Settings → General**
3. Vercel 프로젝트 **Environment Variables (Production)** 에 `BACKEND_URL` = 위 Render API URL (끝에 `/` 없이).

`master` / `main` 푸시 시 `.github/workflows/deploy-vercel.yml` 이 프로덕션 배포를 실행합니다.  
시크릿이 없으면 이 Job은 실패하므로, 준비 전에는 Actions에서 해당 Workflow를 비활성화하거나 시크릿을 채우세요.

**B. Vercel 대시보드만 사용 (Actions 없음)**

1. [Vercel New Project](https://vercel.com/new) 에서 저장소 연결, Framework: Next.js, Root: 저장소 루트.
2. **Environment Variables**: `BACKEND_URL` = Render API URL.
3. 연결한 브랜치에 푸시할 때마다 Vercel이 자동 배포합니다. 이 경우 **GitHub Actions의 Vercel Workflow는 사용하지 마세요** (이중 배포 방지).

### 배포 후 확인 순서

1. Render API `GET /health` 가 200 인지 확인.  
2. Vercel 사이트에서 일기 제출이 되는지 확인.  
3. 첫 배포 후 DB는 `render.yaml` 의 `startCommand` 안 `prisma migrate deploy` 로 스키마가 적용됩니다.

## GitHub

원격: [https://github.com/yunseonghoon12/diary](https://github.com/yunseonghoon12/diary)

## 기타

- `.env` 는 커밋하지 마세요. `env.example`, `backend/env.example` 참고.
- Docker 로 로컬 Postgres: 루트 `docker-compose.yml`, `npm run db:up`.
