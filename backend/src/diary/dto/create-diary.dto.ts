export type CreateDiaryDto = {
  /** YYYY-MM-DD */
  entryDate: string;
  weather?: string | null;
  wakeTime?: string | null;
  content?: string | null;
  /** image/png base64, prefix 없이 */
  picturePngBase64?: string | null;
};
