"use client";

import { useEffect, useState } from "react";
import { fetchDiary, getDiaryIdToken, type DiaryDetail } from "@/lib/api";
import { formatDiaryKoreanHeader, formatSubmittedAt } from "@/lib/diary-date";
import { WEATHER_LABEL } from "@/lib/diary-weather-labels";

type DiaryDetailScreenProps = {
  id: string;
  className?: string;
  onBack: () => void;
};

export function DiaryDetailScreen({ id, className = "", onBack }: DiaryDetailScreenProps) {
  const [entry, setEntry] = useState<DiaryDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setEntry(null);
    (async () => {
      try {
        const d = await fetchDiary(id, getDiaryIdToken());
        if (!cancelled) setEntry(d);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "불러오지 못했어요");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const imgSrc =
    entry?.picturePngBase64 && entry.picturePngBase64.length > 0
      ? `data:image/png;base64,${entry.picturePngBase64}`
      : null;

  return (
    <div
      className={`min-h-screen bg-gradient-to-b from-rose-50 via-amber-50/70 to-orange-50/85 px-3 py-8 pb-12 text-stone-700 ${className}`}
    >
      <div className="mx-auto max-w-md">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 text-sm font-medium text-rose-700 underline decoration-rose-300 underline-offset-2"
        >
          ← 목록으로
        </button>

        {error ? (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-left text-sm break-words whitespace-pre-wrap text-rose-800">
            {error}
          </p>
        ) : null}

        {!entry && !error ? (
          <p className="text-center text-sm text-stone-500">불러오는 중…</p>
        ) : null}

        {entry ? (
          <div className="space-y-3 rounded-[1.85rem] border-[3px] border-rose-200/90 bg-white/75 p-3 shadow-lg backdrop-blur-[2px]">
            <div className="rounded-2xl border-2 border-dashed border-amber-200/80 bg-[#fffdf9]/95 p-3">
              <p className="text-xs font-medium text-rose-800">{formatDiaryKoreanHeader(entry.entryDate)}</p>
              <p className="mt-0.5 text-[10px] text-stone-500">제출 {formatSubmittedAt(entry.createdAt)}</p>
              <p className="mt-2 text-xs text-stone-600">
                날씨:{" "}
                {entry.weather ? WEATHER_LABEL[entry.weather] ?? entry.weather : "—"}
                {entry.wakeTime ? (
                  <>
                    {" "}
                    · 일어난 시간 {entry.wakeTime}
                  </>
                ) : null}
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border-2 border-amber-200/80 bg-white shadow-inner">
              {imgSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imgSrc} alt="그림일기" className="aspect-[5/4] w-full object-contain" />
              ) : (
                <div className="flex aspect-[5/4] items-center justify-center bg-rose-50/50 text-xs text-stone-400">
                  그림·사진 없음
                </div>
              )}
            </div>

            <div className="rounded-xl border border-rose-200/80 bg-[#fffdf9] p-3">
              <p className="mb-1 text-[10px] text-rose-400">오늘의 글</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-800">
                {entry.content?.trim() ? entry.content : "—"}
              </p>
            </div>

            {entry.teacherReply?.trim() ? (
              <div className="rounded-xl border border-amber-200/90 bg-amber-50/90 px-3 py-2.5 shadow-sm">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800/90">
                  선생님 한마디
                </p>
                <p className="whitespace-pre-wrap text-left text-xs leading-relaxed text-amber-950/90">
                  {entry.teacherReply.trim()}
                </p>
              </div>
            ) : (
              <p className="text-center text-[11px] text-stone-400">AI 답글이 없거나 생성되지 않았어요.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
