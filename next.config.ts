import type { NextConfig } from "next";

/** 브라우저 → Next → 여기로 프록시 (CORS 없이 Nest 호출). 기본 Nest dev 포트 4000 */
const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${backendUrl.replace(/\/$/, "")}/:path*`,
      },
    ];
  },
};

export default nextConfig;
