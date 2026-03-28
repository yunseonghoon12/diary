"use client";

import { useCallback, useEffect, useState } from "react";
import { deleteDiary, fetchDiaryList, getDiaryIdToken, type DiaryListItem } from "@/lib/api";
import { formatDiaryKoreanHeader, formatSubmittedAt } from "@/lib/diary-date";
import { WEATHER_LABEL } from "@/lib/diary-weather-labels";

type DiaryListScreenProps = {
  className?: string;
  onOpenEntry: (id: string) => void;
  onNewDiary: () => void;
};

export function DiaryListScreen({ className = "", onOpenEntry, onNewDiary }: DiaryListScreenProps) {
  const [items, setItems] = useState<DiaryListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await fetchDiaryList(getDiaryIdToken());
      setItems(list);
    } catch (e) {
      setItems([]);
      setError(e instanceof Error ? e.message : "목록을 불러오지 못했어요");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div
      className={`min-h-screen bg-gradient-to-b from-rose-50 via-amber-50/70 to-orange-50/85 px-3 py-8 pb-12 text-stone-700 ${className}`}
    >
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-rose-900">제출한 일기</h1>
          <button
            type="button"
            onClick={onNewDiary}
            className="rounded-full border-2 border-rose-400 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 shadow-sm transition hover:bg-rose-50"
          >
            새로 쓰기
          </button>
        </div>

        {error ? (
          <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-left text-xs break-words whitespace-pre-wrap text-rose-800">
            {error}
          </p>
        ) : null}

        {items === null ? (
          <p className="text-center text-sm text-stone-500">불러오는 중…</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-amber-200/80 bg-white/70 p-8 text-center text-sm text-stone-500">
            아직 제출한 일기가 없어요.
            <button
              type="button"
              onClick={onNewDiary}
              className="mt-4 block w-full rounded-xl border-2 border-rose-300 bg-rose-50 py-2 text-sm font-medium text-rose-800"
            >
              첫 일기 쓰기
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((row) => (
              <li key={row.id} className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => onOpenEntry(row.id)}
                  className="min-w-0 flex-1 rounded-2xl border-2 border-rose-100/90 bg-white/90 p-3 text-left shadow-sm transition hover:border-rose-200 hover:bg-white"
                >
                  <p className="text-sm font-medium text-stone-900">
                    {formatDiaryKoreanHeader(row.entryDate)}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1 gap-y-0.5 text-[11px] text-stone-500">
                    <span>제출 {formatSubmittedAt(row.createdAt)}</span>
                    {row.weather ? (
                      <span className="text-rose-600">
                        · 날씨 {WEATHER_LABEL[row.weather] ?? row.weather}
                      </span>
                    ) : null}
                    <span className="min-w-0 max-w-full truncate font-medium text-stone-700">
                      · {row.title}
                    </span>
                  </p>
                </button>
                <button
                  type="button"
                  className="shrink-0 self-center rounded-xl border-2 border-rose-200/90 bg-white px-2.5 py-2 text-[10px] font-medium text-rose-700 shadow-sm transition hover:bg-rose-50"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!window.confirm("이 일기를 삭제할까요?")) return;
                    setError(null);
                    try {
                      await deleteDiary(row.id, getDiaryIdToken());
                      await load();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "삭제하지 못했어요");
                    }
                  }}
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
