import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** Render 콜드 스타트 등 대비 (Hobby 플랜은 최대 10초 제한 — 그때는 NEXT_PUBLIC_API_URL 로 직접 API 호출 권장) */
export const maxDuration = 60;

const SKIP_HEADERS = new Set(
  [
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "host",
    "content-length",
  ].map((s) => s.toLowerCase()),
);

function backendOrigin(): string {
  return (process.env.BACKEND_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");
}

/** Vercel은 서버에서 사설 IP/localhost 로의 fetch를 막음 → DNS_HOSTNAME_RESOLVED_PRIVATE 등 */
function isPrivateOrLocalHostname(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h === "::1" || h === "0:0:0:0:0:0:0:1") return true;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
  }
  if (h.endsWith(".local") || h.endsWith(".internal")) return true;
  return false;
}

/** Vercel에서만 BACKEND_URL 사전 검사 */
function vercelBackendUrlError(base: string): NextResponse | null {
  if (!process.env.VERCEL) return null;
  let u: URL;
  try {
    u = new URL(base);
  } catch {
    return NextResponse.json(
      {
        statusCode: 502,
        message:
          "BACKEND_URL 형식이 잘못되었습니다. https://이름.onrender.com 처럼 전체 주소(따옴표·공백 없이)를 넣으세요.",
      },
      { status: 502 },
    );
  }
  if (isPrivateOrLocalHostname(u.hostname)) {
    return NextResponse.json(
      {
        statusCode: 502,
        message:
          "BACKEND_URL에 localhost, 127.0.0.1, 192.168.x.x 같은 주소가 들어가 있으면 Vercel이 차단합니다(The page could not be found / DNS_HOSTNAME_RESOLVED_PRIVATE). 로컬 .env 를 그대로 넣지 말고, Render 대시보드의 공개 URL(https://….onrender.com)만 Vercel 환경 변수에 넣은 뒤 Redeploy 하세요.",
      },
      { status: 502 },
    );
  }
  return null;
}

function buildTargetUrl(req: NextRequest, segments: string[] | undefined): string {
  const base = backendOrigin();
  const rest = segments?.length ? segments.join("/") : "";
  const path = rest ? `${base}/${rest}` : `${base}/`;
  const q = req.nextUrl.search;
  return `${path}${q}`;
}

function filterRequestHeaders(req: NextRequest): Headers {
  const h = new Headers();
  req.headers.forEach((value, key) => {
    if (SKIP_HEADERS.has(key.toLowerCase())) return;
    h.set(key, value);
  });
  return h;
}

function filterResponseHeaders(src: Headers): Headers {
  const h = new Headers();
  src.forEach((value, key) => {
    if (SKIP_HEADERS.has(key.toLowerCase())) return;
    h.set(key, value);
  });
  return h;
}

async function forward(req: NextRequest, segments: string[] | undefined) {
  const base = backendOrigin();
  const urlErr = vercelBackendUrlError(base);
  if (urlErr) return urlErr;

  const target = buildTargetUrl(req, segments);
  const headers = filterRequestHeaders(req);

  const init: RequestInit & { duplex?: "half" } = {
    method: req.method,
    headers,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = req.body;
    init.duplex = "half";
  }

  try {
    const res = await fetch(target, init);
    if (!res.ok) {
      let bodyPreview = "";
      try {
        bodyPreview = (await res.clone().text()).slice(0, 500);
      } catch {
        /* ignore */
      }
      console.warn("[api/backend proxy] upstream error", {
        method: req.method,
        status: res.status,
        target,
        bodyPreview: bodyPreview || "(empty)",
      });
    }
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: filterResponseHeaders(res.headers),
    });
  } catch (e) {
    const base = backendOrigin();
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/backend proxy] fetch failed", { target, base, msg });
    return NextResponse.json(
      {
        statusCode: 502,
        message:
          "Nest API에 연결하지 못했습니다. Vercel(또는 Next 서버) 환경 변수 BACKEND_URL을 Render 등 실제 API 주소로 설정했는지 확인하세요.",
        detail: process.env.NODE_ENV === "development" ? msg : undefined,
      },
      { status: 502 },
    );
  }
}

type Ctx = { params: Promise<{ path?: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return forward(req, path);
}

export async function HEAD(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return forward(req, path);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return forward(req, path);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return forward(req, path);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return forward(req, path);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return forward(req, path);
}
