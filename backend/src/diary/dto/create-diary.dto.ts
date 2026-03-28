export type CreateDiaryDto = {
  /** YYYY-MM-DD */
  entryDate: string;
  /** 비우면 기본 제목(그림일기 YYYY-MM-DD) */
  title?: string | null;
  weather?: string | null;
  wakeTime?: string | null;
  content?: string | null;
  /** image/png base64, prefix 없이 */
  picturePngBase64?: string | null;
};
