/**
 * - `NEXT_PUBLIC_API_URL` 이 있으면 그 주소 (배포 시 API 도메인)
 * - 없으면 `/api/backend` → Next rewrites 로 Nest(기본 4000)로 전달 (CORS·호스트 이슈 회피)
 */
const defaultBase = "/api/backend";

export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return defaultBase;
  return raw.replace(/\/$/, "");
}

export type ApiFetchOptions = RequestInit & {
  /** Firebase `getIdToken()` 결과 */
  idToken?: string | null;
};

function thrownMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e !== null && "message" in e) {
    const m = (e as { message: unknown }).message;
    return typeof m === "string" ? m : String(m);
  }
  return String(e);
}

/** 브라우저·번들마다 fetch 실패가 TypeError가 아닐 때가 있어 메시지 문자열로도 판별 */
function isLikelyNetworkFailure(e: unknown): boolean {
  if (e instanceof DOMException) {
    return e.name === "AbortError" || e.name === "NetworkError";
  }
  const m = thrownMessage(e).toLowerCase();
  return (
    m.includes("failed to fetch") ||
    m.includes("load failed") ||
    m.includes("failed to load") ||
    m.includes("networkerror") ||
    m.includes("network request failed") ||
    (e instanceof TypeError && (m.includes("fetch") || m.includes("network")))
  );
}

/** Nest / 프록시 JSON·HTML 응답을 짧은 사용자용 문장으로 */
function formatHttpErrorBody(status: number, text: string): string {
  const label =
    status === 400
      ? "요청 형식 오류(400)"
      : status === 401
        ? "인증 필요(401)"
        : status === 403
          ? "접근 거부(403)"
          : status === 404
            ? "API 경로 없음(404)"
            : status === 413
              ? "용량 초과(413)"
              : status === 502
                ? "백엔드 연결 실패(502)"
                : status === 503
                  ? "서비스 일시 불가(503)"
                  : `HTTP ${status}`;

  const trimmed = text.trim();
  if (!trimmed) {
    return `${label}: 응답 본문이 비어 있어요. Nest 로그와 DATABASE_URL·마이그레이션을 확인해 주세요.`;
  }

  try {
    const j = JSON.parse(trimmed) as Record<string, unknown>;
    const chunks: string[] = [];
    const msg = j.message;
    if (Array.isArray(msg)) {
      const s = msg.map(String).filter(Boolean).join(", ");
      if (s) chunks.push(s);
    } else if (typeof msg === "string" && msg.trim()) {
      chunks.push(msg.trim());
    }
    if (typeof j.error === "string" && j.error.trim()) {
      chunks.push(j.error.trim());
    }
    if (chunks.length > 0) {
      return `${label}: ${chunks.join(" — ")}`.slice(0, 600);
    }
  } catch {
    /* not JSON */
  }

  if (/^<!DOCTYPE|^<html/i.test(trimmed)) {
    return `${label}: HTML 오류 페이지가 왔어요. BACKEND_URL이 Nest API를 가리키는지(프론트 URL이 아닌지) 확인해 주세요.`;
  }

  const short = trimmed.length > 400 ? `${trimmed.slice(0, 400)}…` : trimmed;
  return `${label}: ${short}`;
}

const NETWORK_HINT =
  "백엔드(Nest) 가동 여부, 인터넷·방화벽, 배포 프론트(Vercel·Render 등)의 BACKEND_URL·NEXT_PUBLIC_API_URL이 Nest 공개 주소를 가리키는지 확인해 주세요.";

function toClientNetworkError(e: unknown, action: string): Error {
  if (e instanceof DOMException && e.name === "AbortError") {
    return new Error(`${action}: 요청이 중단되었어요.`);
  }
  if (isLikelyNetworkFailure(e)) {
    const raw = thrownMessage(e);
    return new Error(`${action}: 서버까지 네트워크 요청이 실패했어요 (${raw}). ${NETWORK_HINT}`);
  }
  if (e instanceof Error) {
    const raw = e.message.trim();
    if (/failed to fetch|load failed|networkerror/i.test(raw)) {
      return new Error(`${action}: 서버까지 네트워크 요청이 실패했어요 (${raw}). ${NETWORK_HINT}`);
    }
    return new Error(`${action}: ${e.message}`);
  }
  return new Error(`${action}: ${String(e)}`);
}

/**
 * Nest API 호출용 fetch 래퍼. 인증이 필요하면 `idToken`을 넘기면 `Authorization: Bearer`가 붙습니다.
 */
export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { idToken, headers: initHeaders, ...rest } = options;
  const headers = new Headers(initHeaders);
  if (idToken) {
    headers.set('Authorization', `Bearer ${idToken}`);
  }
  const url = path.startsWith('http') ? path : `${getApiBaseUrl()}${path.startsWith('/') ? '' : '/'}${path}`;
  return fetch(url, { ...rest, headers });
}

export async function apiJson<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  const res = await apiFetch(path, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export type SubmitDiaryPayload = {
  entryDate: string;
  weather?: string | null;
  wakeTime?: string | null;
  content?: string | null;
  picturePngBase64?: string | null;
};

/** Firebase `getIdToken()` 값. 로컬 개발용으로 `localStorage` 키 `diary_firebase_id_token` 도 지원 */
export function getDiaryIdToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('diary_firebase_id_token');
}

export type SubmitDiaryResponse = {
  id: string;
  teacherReply?: string | null;
  title?: string;
  entryDate?: string;
  createdAt?: string;
  content?: string | null;
  weather?: string | null;
  wakeTime?: string | null;
  picturePngBase64?: string | null;
};

export type DiaryListItem = {
  id: string;
  entryDate: string;
  createdAt: string;
  weather: string | null;
  title: string;
};

export type DiaryDetail = {
  id: string;
  entryDate: string;
  createdAt: string;
  updatedAt: string;
  weather: string | null;
  wakeTime: string | null;
  title: string;
  content: string | null;
  picturePngBase64: string | null;
  teacherReply: string | null;
};

export async function fetchDiaryList(idToken: string | null): Promise<DiaryListItem[]> {
  let res: Response;
  try {
    res = await apiFetch("/diaries", {
      method: "GET",
      headers: { Accept: "application/json" },
      idToken,
    });
  } catch (e) {
    throw toClientNetworkError(e, "목록 불러오기");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(formatHttpErrorBody(res.status, text));
  }
  return res.json() as Promise<DiaryListItem[]>;
}

export async function fetchDiary(id: string, idToken: string | null): Promise<DiaryDetail> {
  let res: Response;
  try {
    res = await apiFetch(`/diaries/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      idToken,
    });
  } catch (e) {
    throw toClientNetworkError(e, "일기 불러오기");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(formatHttpErrorBody(res.status, text));
  }
  return res.json() as Promise<DiaryDetail>;
}

export async function submitDiary(
  payload: SubmitDiaryPayload,
  idToken: string | null,
): Promise<SubmitDiaryResponse> {
  let res: Response;
  try {
    res = await apiFetch("/diaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      idToken,
    });
  } catch (e) {
    throw toClientNetworkError(e, "일기 제출");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(formatHttpErrorBody(res.status, text));
  }
  return res.json() as Promise<SubmitDiaryResponse>;
}
