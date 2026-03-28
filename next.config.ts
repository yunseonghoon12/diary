import type { NextConfig } from "next";

/**
 * `/api/backend/*` → Nest 프록시는 `app/api/backend/[[...path]]/route.ts`에서 처리합니다.
 * (Vercel 등에서 next.config rewrites 만으로 외부 API로 넘기면 404가 나는 경우가 있어 런타임 프록시 사용)
 * 서버 환경 변수: BACKEND_URL (기본 http://127.0.0.1:4000)
 */
const nextConfig: NextConfig = {};

export default nextConfig;
