/**
 * - `NEXT_PUBLIC_API_URL` 이 있으면 그 주소 (배포 시 API 도메인)
 * - 없으면 `/api/backend` → Next rewrites 로 Nest(기본 4000)로 전달 (CORS·호스트 이슈 회피)
 */
const defaultBase = "/api/backend";

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? defaultBase;
}

export type ApiFetchOptions = RequestInit & {
  /** Firebase `getIdToken()` 결과 */
  idToken?: string | null;
};

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
    const msg =
      e instanceof TypeError && String(e.message).includes("fetch")
        ? "서버에 연결할 수 없어요. 백엔드가 켜져 있는지 확인해 주세요."
        : e instanceof Error
          ? e.message
          : "네트워크 오류";
    throw new Error(msg);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
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
    const msg =
      e instanceof TypeError && String(e.message).includes("fetch")
        ? "서버에 연결할 수 없어요. 백엔드가 켜져 있는지 확인해 주세요."
        : e instanceof Error
          ? e.message
          : "네트워크 오류";
    throw new Error(msg);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
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
    const msg =
      e instanceof TypeError && String(e.message).includes("fetch")
        ? "서버에 연결할 수 없어요. 백엔드(npm run start:dev in backend, 포트 4000)가 켜져 있는지 확인해 주세요."
        : e instanceof Error
          ? e.message
          : "네트워크 오류";
    throw new Error(msg);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<SubmitDiaryResponse>;
}
