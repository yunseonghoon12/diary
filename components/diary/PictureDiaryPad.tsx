"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { submitDiary } from "@/lib/api";

type Weather = "sunny" | "partly_cloudy" | "cloudy" | "rain" | "snow";

const WEATHER: { id: Weather; label: string }[] = [
  { id: "sunny", label: "맑음" },
  { id: "partly_cloudy", label: "구름조금" },
  { id: "cloudy", label: "흐림" },
  { id: "rain", label: "비" },
  { id: "snow", label: "눈" },
];

type ArtTab = "draw" | "photo";
type DrawTool = "pen" | "pencil" | "marker" | "highlighter" | "eraser";

const COLORS = ["#5c4d4d", "#5b7fc7", "#c97b84"] as const;

const PASTEL_SWATCHES = [
  "#5c4d4d",
  "#6b8cce",
  "#e8a0a8",
  "#7daf8a",
  "#d4a574",
  "#b8a9c9",
] as const;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

function drawImageContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cw: number,
  ch: number,
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (iw <= 0 || ih <= 0) return;
  const ir = iw / ih;
  const cr = cw / ch;
  let dw: number;
  let dh: number;
  if (ir > cr) {
    dw = cw;
    dh = cw / ir;
  } else {
    dh = ch;
    dw = ch * ir;
  }
  ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
}

async function exportCompositePngBase64(
  wrap: HTMLDivElement,
  drawingCanvas: HTMLCanvasElement,
  photoSrc: string | null,
): Promise<string | null> {
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  if (w <= 0 || h <= 0) return null;
  const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
  const out = document.createElement("canvas");
  out.width = Math.floor(w * dpr);
  out.height = Math.floor(h * dpr);
  const ctx = out.getContext("2d");
  if (!ctx) return null;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = "#fffef8";
  ctx.fillRect(0, 0, w, h);
  if (photoSrc) {
    try {
      const img = await loadImage(photoSrc);
      drawImageContain(ctx, img, w, h);
    } catch {
      /* 사진 없이 진행 */
    }
  }
  ctx.drawImage(drawingCanvas, 0, 0, w, h);
  const data = out.toDataURL("image/png");
  const parts = data.split(",");
  return parts[1] ?? null;
}

function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalYmd(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt;
}

function formatDiaryHeader(ymd: string): string {
  const dt = parseLocalYmd(ymd);
  if (!dt) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(dt);
}

function WeatherIcon({ variant, compact }: { variant: Weather; compact?: boolean }) {
  const stroke = "#7d6a65";
  const fill = "#fffefb";
  const common = compact ? "h-5 w-5 shrink-0" : "h-9 w-9 shrink-0";
  const sw = compact ? "1.5" : "2";
  if (variant === "sunny") {
    return (
      <svg className={common} viewBox="0 0 48 48" fill="none" aria-hidden>
        <circle cx="24" cy="24" r="9" stroke={stroke} strokeWidth={sw} fill={fill} />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <line
            key={deg}
            x1="24"
            y1="6"
            x2="24"
            y2="10"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            transform={`rotate(${deg} 24 24)`}
          />
        ))}
      </svg>
    );
  }
  if (variant === "partly_cloudy") {
    return (
      <svg className={common} viewBox="0 0 48 48" fill="none" aria-hidden>
        <circle cx="30" cy="18" r="7" stroke={stroke} strokeWidth={sw} fill={fill} />
        {[0, 90, 180, 270].map((deg) => (
          <line
            key={deg}
            x1="30"
            y1="7"
            x2="30"
            y2="10"
            stroke={stroke}
            strokeWidth="1.2"
            strokeLinecap="round"
            transform={`rotate(${deg} 30 18)`}
          />
        ))}
        <path
          d="M8 32c0-5 4-9 9-9 1.2 0 2.3.2 3.3.6A7 7 0 0 1 34 28c4.4 0 8 3.6 8 8H10c-1.1 0-2-.9-2-2v-2z"
          stroke={stroke}
          strokeWidth={sw}
          fill={fill}
        />
      </svg>
    );
  }
  if (variant === "cloudy") {
    return (
      <svg className={common} viewBox="0 0 48 48" fill="none" aria-hidden>
        <path
          d="M10 30c0-6 5-11 11-11 1.5 0 2.9.3 4.2.8A9 9 0 0 1 38 28c5 0 9 4 9 9H12a2 2 0 0 1-2-2v-5z"
          stroke={stroke}
          strokeWidth={sw}
          fill={fill}
        />
      </svg>
    );
  }
  if (variant === "rain") {
    return (
      <svg className={common} viewBox="0 0 48 48" fill="none" aria-hidden>
        <path d="M14 18c0-5 4-9 9-9a9 9 0 0 1 8.5 12" stroke={stroke} strokeWidth={sw} strokeLinecap="round" fill="none" />
        <path d="M8 26c0-4 3.5-7 8-7h12c4.5 0 8 3 8 7v2H10v-2z" stroke={stroke} strokeWidth={sw} fill={fill} />
        <path d="M22 8v-3M18 10l-2-2M26 10l2-2" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
        <path d="M16 34v5M22 32v7M28 34v5M34 32v7" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="2.8" fill="#93c5fd" stroke={stroke} strokeWidth="1.2" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <g key={deg} transform={`rotate(${deg} 24 24)`}>
          <path
            d="M24 8v32M17 14l14 20M31 14L17 34"
            stroke={stroke}
            strokeWidth={compact ? 1.4 : 1.8}
            strokeLinecap="round"
          />
        </g>
      ))}
      <circle cx="24" cy="8" r="1.2" fill="#bae6fd" stroke={stroke} strokeWidth="0.8" />
      <circle cx="24" cy="40" r="1.2" fill="#bae6fd" stroke={stroke} strokeWidth="0.8" />
    </svg>
  );
}

function AlarmIconSmall() {
  return (
    <svg className="h-6 w-6 shrink-0 text-rose-400" viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="26" r="11" stroke="currentColor" strokeWidth="2" fill="#fff7fb" />
      <path d="M24 20v6l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 8l3 3M34 8l-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

type PictureDiaryPadProps = {
  className?: string;
  onGoToList?: () => void;
  /** 있으면 제출 성공 직후 목록 화면으로 전환 (선생님 답글은 DB·목록·상세에서 확인) */
  onAfterSubmitSuccess?: () => void;
};

const MAX_UNDO = 35;

export function PictureDiaryPad({
  className = "",
  onGoToList,
  onAfterSubmitSuccess,
}: PictureDiaryPadProps) {
  const [diaryDate, setDiaryDate] = useState("");
  const [dateReady, setDateReady] = useState(false);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [wakeTime, setWakeTime] = useState("");
  const [artTab, setArtTab] = useState<ArtTab>("draw");
  const [bodyText, setBodyText] = useState("");
  const [strokeColor, setStrokeColor] = useState<string>(COLORS[0]);
  const [tool, setTool] = useState<DrawTool>("pen");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<string | null>(null);
  const [teacherReply, setTeacherReply] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const drewThisStroke = useRef(false);
  const undoStack = useRef<ImageData[]>([]);

  const showPhotoPlaceholder = artTab === "photo" && !photoUrl;
  const showArtSurface = artTab === "draw" || (artTab === "photo" && !!photoUrl);

  useEffect(() => {
    setDiaryDate(formatLocalYmd(new Date()));
    setDateReady(true);
  }, []);

  const pushUndoSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0 || canvas.height === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    undoStack.current.push(data);
    if (undoStack.current.length > MAX_UNDO) {
      undoStack.current.shift();
    }
  }, []);

  const initUndoBaseline = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0 || canvas.height === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    undoStack.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
  }, []);

  const clearDrawingLayer = useCallback(() => {
    const wrap = containerRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    initUndoBaseline();
  }, [initUndoBaseline]);

  const resizeOverlayCanvas = useCallback(() => {
    const wrap = containerRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (w === 0 || h === 0) return;

    const hadBitmap = canvas.width > 0 && canvas.height > 0;
    const temp = hadBitmap ? document.createElement("canvas") : null;
    if (temp) {
      temp.width = canvas.width;
      temp.height = canvas.height;
      const tx = temp.getContext("2d");
      if (tx) tx.drawImage(canvas, 0, 0);
    }

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (temp) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(temp, 0, 0, w, h);
    }
    initUndoBaseline();
  }, [initUndoBaseline]);

  useEffect(() => {
    resizeOverlayCanvas();
    const ro = new ResizeObserver(() => resizeOverlayCanvas());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [resizeOverlayCanvas]);

  /** 캔버스가 다시 마운트될 때(사진 탭 → 사진 선택 등) 컨테이너 크기는 그대로라 ResizeObserver가 안 뜰 수 있음 → 기본 300×150 버퍼가 남아 일부 영역만 그려짐 */
  useEffect(() => {
    if (!showArtSurface) return;
    const id = requestAnimationFrame(() => resizeOverlayCanvas());
    return () => cancelAnimationFrame(id);
  }, [showArtSurface, resizeOverlayCanvas]);

  useEffect(() => {
    if (!photoUrl) return;
    const id = requestAnimationFrame(() => clearDrawingLayer());
    return () => cancelAnimationFrame(id);
  }, [photoUrl, clearDrawingLayer]);

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const blockScroll = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
    };
    el.addEventListener("touchmove", blockScroll, { passive: false });
    return () => el.removeEventListener("touchmove", blockScroll);
  }, [artTab, photoUrl]);

  const applyToolStyle = (ctx: CanvasRenderingContext2D) => {
    switch (tool) {
      case "pencil":
        ctx.lineWidth = 1.25;
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = strokeColor;
        break;
      case "pen":
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = strokeColor;
        break;
      case "marker":
        ctx.lineWidth = 5;
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = strokeColor;
        break;
      case "highlighter":
        ctx.lineWidth = 12;
        ctx.globalAlpha = 0.45;
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "rgba(234, 179, 8, 0.55)";
        break;
      case "eraser":
        ctx.lineWidth = 14;
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
        break;
      default:
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = strokeColor;
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e && e.touches[0]) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    if ("clientX" in e) {
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    return null;
  };

  const canDrawOnCanvas = artTab === "draw" || (artTab === "photo" && !!photoUrl);

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canDrawOnCanvas) return;
    e.preventDefault();
    const p = getPos(e);
    if (!p) return;
    drawing.current = true;
    last.current = p;
    drewThisStroke.current = false;
  };

  const endDraw = () => {
    if (drawing.current && drewThisStroke.current) {
      pushUndoSnapshot();
    }
    drawing.current = false;
    last.current = null;
  };

  const moveDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current || !canDrawOnCanvas) return;
    e.preventDefault();
    const p = getPos(e);
    const canvas = canvasRef.current;
    if (!p || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx || !last.current) return;
    applyToolStyle(ctx);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    last.current = p;
    drewThisStroke.current = true;
  };

  const undoLastStroke = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx || undoStack.current.length <= 1) return;
    undoStack.current.pop();
    const prev = undoStack.current[undoStack.current.length - 1];
    ctx.putImageData(prev, 0, 0);
  };

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(URL.createObjectURL(file));
    setArtTab("photo");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    requestAnimationFrame(() => resizeOverlayCanvas());
  };

  const headerLabel = dateReady && diaryDate ? formatDiaryHeader(diaryDate) : "날짜를 불러오는 중…";

  const handleSubmit = async () => {
    setSubmitFeedback(null);
    setTeacherReply(null);
    if (!dateReady || !diaryDate) return;
    setSubmitting(true);
    try {
      let picturePngBase64: string | null = null;
      const wrap = containerRef.current;
      const canvasEl = canvasRef.current;
      /** 사진 없이 그림도 없으면 전 화면 PNG를 만들지 않음(용량·Vercel 타임아웃 방지). 스트로크 1번이라도 끝내면 length>1 */
      const hasCommittedDrawing = undoStack.current.length > 1;
      const shouldExportImage = Boolean(photoUrl) || hasCommittedDrawing;
      if (wrap && canvasEl && showArtSurface && shouldExportImage) {
        picturePngBase64 = await exportCompositePngBase64(wrap, canvasEl, photoUrl);
      }
      const res = await submitDiary(
        {
          entryDate: diaryDate,
          weather: weather ?? null,
          wakeTime: wakeTime || null,
          content: bodyText || null,
          picturePngBase64,
        },
        null,
      );
      if (onAfterSubmitSuccess) {
        onAfterSubmitSuccess();
        return;
      }
      setSubmitFeedback("제출했어요! 오늘도 수고했어요 ✨");
      setTeacherReply(res.teacherReply?.trim() ? res.teacherReply.trim() : null);
    } catch (e) {
      setSubmitFeedback(e instanceof Error ? e.message : "제출에 실패했어요");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`min-h-screen bg-gradient-to-b from-rose-50 via-amber-50/70 to-orange-50/85 px-3 py-8 pb-12 text-stone-700 ${className}`}
    >
      <div className="mx-auto max-w-md">
        <div className="rounded-[1.85rem] border-[3px] border-rose-200/90 bg-white/75 p-3 shadow-[0_18px_50px_-14px_rgba(251,113,133,0.42)] backdrop-blur-[2px]">
          <div className="rounded-2xl border-2 border-dashed border-amber-200/80 bg-[#fffdf9]/95">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-b-2 border-rose-100/90 px-2 py-2">
              <button
                type="button"
                className="relative flex min-w-0 w-full flex-col items-start rounded-xl px-1 py-0.5 text-left transition hover:bg-rose-50/80 focus:outline-none active:bg-rose-100/60"
                onClick={() => {
                  if (dateReady) {
                    dateInputRef.current?.showPicker?.();
                  }
                }}
                tabIndex={dateReady ? 0 : -1}
              >
                <span className="pointer-events-none text-[10px] text-stone-500">월 · 일 · 요일</span>
                <span className="pointer-events-none truncate text-xs font-medium text-stone-900">
                  {headerLabel}
                </span>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={diaryDate}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v) setDiaryDate(v);
                  }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="일기 날짜 선택"
                  tabIndex={-1}
                  readOnly={!dateReady}
                  disabled={!dateReady}
                />
              </button>
              <div className="flex min-w-0 w-full flex-row items-center gap-1.5 sm:flex-initial">
                <AlarmIconSmall />
                <label className="flex w-full min-w-0 flex-col text-[10px] text-stone-600">
                  일어난 시간
                  <input
                    type="time"
                    value={wakeTime}
                    onChange={(e) => setWakeTime(e.target.value)}
                    className="mt-0.5 max-w-full rounded-lg border border-rose-200 bg-white px-1 py-0.5 text-xs text-stone-700"
                  />
                </label>
              </div>
            </div>

            {/* 날씨 (작게) */}
            <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 border-b-2 border-rose-100/90 px-1 py-1">
              {WEATHER.map((w) => {
                const active = weather === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setWeather(w.id)}
                    title={w.label}
                    className={`flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] transition ${
                      active
                        ? "border-rose-300 bg-rose-50 shadow-sm"
                        : "border-transparent hover:border-rose-200"
                    }`}
                  >
                    <WeatherIcon variant={w.id} compact />
                    <span className="max-w-[2.4rem] truncate font-medium text-stone-700">{w.label}</span>
                  </button>
                );
              })}
            </div>

            {/* 그림 / 사진 */}
            <div className="p-2">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-600">
                <span>그림 · 사진</span>
                <div className="flex rounded-full border border-rose-200 bg-white/90 p-0.5 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setArtTab("draw")}
                    className={`rounded-full px-2.5 py-0.5 ${artTab === "draw" ? "bg-rose-400 text-white shadow-sm" : "text-stone-500"}`}
                  >
                    그리기
                  </button>
                  <button
                    type="button"
                    onClick={() => setArtTab("photo")}
                    className={`rounded-full px-2.5 py-0.5 ${artTab === "photo" ? "bg-rose-400 text-white shadow-sm" : "text-stone-500"}`}
                  >
                    사진
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickPhoto}
                />
              </div>

              <div
                ref={containerRef}
                className="relative aspect-[5/4] w-full overflow-hidden rounded-xl border-2 border-amber-200/80 bg-white shadow-inner"
              >
                {showPhotoPlaceholder ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 bg-rose-50/40 p-3 text-center text-xs text-stone-500">
                    <p>사진을 넣으려면 아래를 눌러 주세요.</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-full border-2 border-rose-300 bg-white px-4 py-1.5 text-sm text-rose-500 shadow-sm transition hover:bg-rose-50"
                    >
                      사진 선택
                    </button>
                  </div>
                ) : (
                  <>
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt=""
                        className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-contain"
                        draggable={false}
                      />
                    ) : null}
                    {showArtSurface ? (
                      <canvas
                        ref={canvasRef}
                        className={`absolute inset-0 z-10 touch-none ${
                          tool === "eraser" ? "cursor-cell" : "cursor-crosshair"
                        }`}
                        onMouseDown={startDraw}
                        onMouseLeave={endDraw}
                        onMouseUp={endDraw}
                        onMouseMove={moveDraw}
                        onTouchStart={startDraw}
                        onTouchEnd={endDraw}
                        onTouchCancel={endDraw}
                        onTouchMove={moveDraw}
                      />
                    ) : null}
                  </>
                )}
              </div>

              {photoUrl && (
                <div className="mt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="text-[10px] text-stone-500 underline decoration-dotted"
                  >
                    사진 빼기
                  </button>
                </div>
              )}

              {showArtSurface && (
                <div className="mt-2">
                  <div className="flex flex-row flex-wrap items-center gap-2">
                    {/* 도구들: 한 row, 연필은 제외 */}
                    <span className="text-[10px] text-stone-500">도구</span>
                    {(
                      [
                        ["pen", "펜"],
                        ["marker", "굵은펜"],
                        ["highlighter", "형광"],
                        ["eraser", "지우개"],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setTool(id)}
                        className={`rounded-full border px-2 py-0.5 text-[10px] ${
                          tool === id
                            ? "border-rose-300 bg-rose-100 font-medium text-rose-800"
                            : "border-rose-100 bg-white/90"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                    {/* 색상: 도구 다음 바로 이어서 한 row에 */}
                    {tool !== "highlighter" && tool !== "eraser" && (
                      <>
                        <span className="ml-2 text-[10px] text-stone-500">색</span>
                        {(["#faf7f7", "#4a4453", ...PASTEL_SWATCHES] as const).map((c) => (
                          <button
                            key={c}
                            type="button"
                            aria-label={`색상 ${c}`}
                            className={`h-5 w-5 rounded-full border-2 ${
                              strokeColor === c ? "border-rose-400 ring-2 ring-rose-200" : "border-rose-100"
                            }`}
                            style={{ backgroundColor: c }}
                            onClick={() => setStrokeColor(c)}
                          />
                        ))}
                      </>
                    )}
                    <div className="flex-1" />
                    {/* 오른쪽 끝에 되돌리기/지우기 버튼 */}
                    <button
                      type="button"
                      onClick={undoLastStroke}
                      className="ml-2 rounded-full border border-rose-200 bg-white px-2 py-0.5 text-[10px] text-rose-800 hover:bg-rose-50"
                    >
                      되돌리기
                    </button>
                    <button
                      type="button"
                      onClick={clearDrawingLayer}
                      className="ml-1 text-[10px] text-rose-400 underline decoration-dotted"
                    >
                      그림만 모두 지우기
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 줄글 */}
            <div className="border-t-2 border-rose-100/90 p-2">
              <label className="mb-1 block text-[10px] text-rose-400">오늘의 글</label>
              <div
                className="rounded-xl border border-rose-200/80 bg-[#fffdf9]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(transparent, transparent 26px, #f3c6d6 26px, #f3c6d6 27px)",
                  backgroundSize: "100% 27px",
                  backgroundPosition: "0 10px",
                }}
              >
                <textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder="줄에 맞춰 오늘 있었던 일을 적어 보세요."
                  rows={7}
                  className="w-full resize-none bg-transparent px-2 py-2 text-sm leading-[27px] text-stone-700 placeholder:text-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-200/60"
                />
              </div>
            </div>

            <div className="space-y-2 border-t-2 border-rose-100/90 p-2">
              {submitFeedback ? (
                <p
                  className={`rounded-xl px-3 py-2 text-xs ${
                    submitFeedback.includes("제출했")
                      ? "bg-emerald-50 text-center text-emerald-800"
                      : "bg-rose-50 text-left break-words whitespace-pre-wrap text-rose-700"
                  }`}
                >
                  {submitFeedback}
                </p>
              ) : null}
              {teacherReply && !onAfterSubmitSuccess ? (
                <div className="rounded-xl border border-amber-200/90 bg-amber-50/90 px-3 py-2.5 shadow-sm">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800/90">
                    선생님 한마디
                  </p>
                  <p className="whitespace-pre-wrap text-left text-xs leading-relaxed text-amber-950/90">
                    {teacherReply}
                  </p>
                </div>
              ) : null}
              <div className="flex gap-2">
                {onGoToList ? (
                  <button
                    type="button"
                    onClick={() => onGoToList()}
                    className="shrink-0 rounded-2xl border-2 border-rose-300 bg-white px-4 py-3 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50 active:translate-y-0.5"
                  >
                    목록
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmit}
                  className={`min-w-0 rounded-2xl border-2 border-rose-400 bg-gradient-to-r from-rose-400 to-amber-300 py-3 text-sm font-semibold text-white shadow-[0_5px_0_#be185d] transition hover:brightness-105 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-55 ${onGoToList ? "flex-1" : "w-full"}`}
                >
                  {submitting ? "보내는 중…" : "제출하기"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
