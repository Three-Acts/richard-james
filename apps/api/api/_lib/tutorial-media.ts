import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DEFAULT_TUTORIALS_PREFIX, type TutorialMediaUrls } from "./schema.js";
import { ApiError } from "./http.js";
import { tutorialMediaPaths } from "./schema.js";

const BUCKET = "cms-tutorials";
export const TUTORIAL_MEDIA_URL_TTL_SECONDS = 5 * 60;

let client: S3Client | undefined;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new ApiError(503, "tutorials_unconfigured", "Private tutorial media is not configured.");
  }
  return value;
}

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      forcePathStyle: true,
      endpoint: requiredEnv("AWS_ENDPOINT_URL_S3"),
      region: requiredEnv("AWS_REGION"),
      credentials: {
        accessKeyId: requiredEnv("AWS_ACCESS_KEY_ID"),
        secretAccessKey: requiredEnv("AWS_SECRET_ACCESS_KEY")
      }
    });
  }
  return client;
}

/**
 * Presigns only the allowlisted files for a known tutorial. The immutable
 * version prefix is configuration, never user input, and is constrained to
 * one path segment before it is joined to the fixed object path.
 */
export async function createTutorialMediaUrls(
  tutorialId: string,
  options: { includeSrt?: boolean } = {}
): Promise<TutorialMediaUrls> {
  const paths = tutorialMediaPaths(tutorialId);
  if (!paths) {
    throw new ApiError(404, "tutorial_not_found", "Tutorial not found.");
  }

  const prefix = process.env.CMS_TUTORIALS_PREFIX || DEFAULT_TUTORIALS_PREFIX;
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(prefix) || prefix === "." || prefix === "..") {
    throw new ApiError(503, "tutorials_unconfigured", "Private tutorial media is not configured.");
  }

  const s3 = getClient();
  const expiresAt = Date.now() + TUTORIAL_MEDIA_URL_TTL_SECONDS * 1000;
  const sign = (path: string, disposition?: "inline" | "attachment") => getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: `${prefix}/${path}`,
      ...(disposition ? { ResponseContentDisposition: `${disposition}; filename="${path.split("/").at(-1)}"` } : {}),
      ResponseCacheControl: "private, no-store"
    }),
    { expiresIn: TUTORIAL_MEDIA_URL_TTL_SECONDS }
  );

  const [video, videoDownload, screenshot, captions, transcript, pdf, word, srt] = await Promise.all([
    sign(paths.video),
    sign(paths.video, "attachment"),
    sign(paths.screenshot, "inline"),
    sign(paths.captions),
    sign(paths.transcript, "attachment"),
    sign(paths.pdf, "inline"),
    sign(paths.word, "attachment"),
    options.includeSrt ? sign(paths.srt, "attachment") : Promise.resolve(undefined)
  ]);

  return {
    expiresAt,
    video,
    videoDownload,
    screenshot,
    captions,
    transcript,
    pdf,
    word,
    ...(srt ? { srt } : {})
  };
}
