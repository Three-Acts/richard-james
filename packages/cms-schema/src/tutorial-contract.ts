/**
 * The only media objects the CMS is allowed to request from the private
 * tutorial bucket. Keep this list independent from the CMS application so
 * the API can enforce the same contract without importing application code.
 */
const tutorialSlugById = {
  "01": "sign-in",
  "02": "add-project",
  "03": "edit-project-text",
  "04": "replace-image",
  "05": "add-gallery-images",
  "06": "gallery-captions",
  "07": "reorder-gallery",
  "08": "remove-gallery-image",
  "09": "reorder-projects",
  "10": "duplicate-project",
  "11": "save-draft",
  "12": "publish-site",
  "13": "unpublish-project",
  "14": "delete-project",
  "15": "edit-page",
  "16": "site-settings",
  "17": "seo",
  "18": "bulk-status",
  "19": "csv-import",
  "20": "csv-export",
  "21": "discard-and-sign-out"
} as const;

export type TutorialMediaId = keyof typeof tutorialSlugById;

/** Change when a new immutable tutorial asset release is uploaded. */
export const DEFAULT_TUTORIALS_PREFIX = "v2026-10-29";

export type TutorialMediaPaths = {
  video: string;
  screenshot: string;
  captions: string;
  transcript: string;
  srt: string;
  pdf: string;
  word: string;
};

/** Returns exact, server-owned object paths for a known procedure ID. */
export function tutorialMediaPaths(id: string): TutorialMediaPaths | undefined {
  if (!Object.hasOwn(tutorialSlugById, id)) return undefined;

  const tutorialId = id as TutorialMediaId;
  const name = `${tutorialId}-${tutorialSlugById[tutorialId]}`;
  return {
    video: `videos/${name}.mp4`,
    screenshot: `screenshots/${name}.png`,
    captions: `captions/${name}.vtt`,
    transcript: `transcripts/${name}.txt`,
    srt: `captions/${name}.srt`,
    pdf: "Richard-James-CMS-User-Guide.pdf",
    word: "Richard-James-CMS-User-Guide.docx"
  };
}

export type TutorialMediaUrls = {
  expiresAt: number;
  video: string;
  videoDownload: string;
  screenshot: string;
  captions: string;
  transcript: string;
  pdf: string;
  word: string;
  srt?: string;
};
