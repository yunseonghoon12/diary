"use client";

import { useState } from "react";
import { DiaryDetailScreen } from "./DiaryDetailScreen";
import { DiaryListScreen } from "./DiaryListScreen";
import { PictureDiaryPad } from "./PictureDiaryPad";

type View =
  | { mode: "pad" }
  | { mode: "list" }
  | { mode: "detail"; id: string };

export default function DiaryApp({ className = "" }: { className?: string }) {
  const [view, setView] = useState<View>({ mode: "pad" });

  if (view.mode === "detail") {
    return (
      <DiaryDetailScreen
        id={view.id}
        className={className}
        onBack={() => setView({ mode: "list" })}
      />
    );
  }

  if (view.mode === "list") {
    return (
      <DiaryListScreen
        className={className}
        onOpenEntry={(id) => setView({ mode: "detail", id })}
        onNewDiary={() => setView({ mode: "pad" })}
      />
    );
  }

  return (
    <PictureDiaryPad
      className={className}
      onGoToList={() => setView({ mode: "list" })}
      onAfterSubmitSuccess={() => setView({ mode: "list" })}
    />
  );
}
