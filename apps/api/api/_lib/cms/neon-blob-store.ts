import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { CmsError } from "@three-acts/cms-schema";
import type { CmsBlobStore } from "./store";

let client: S3Client | undefined;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new CmsError("unavailable", `${name} is not set.`);
  }
  return value;
}

/**
 * Neon object storage speaks the S3 API. `forcePathStyle: true` is required
 * (Neon uses path-style addressing); endpoint/region/credentials are passed
 * explicitly from the standard `AWS_*` env vars so this also works under the
 * plain `tsx` dev server, which doesn't populate the SDK's default env chain
 * the way a Lambda-style runtime does. Checked (and only checked) the first
 * time a caller actually needs the client, so importing this module never
 * requires the env to be set — only uploading/checking an object does.
 */
function getClient(): S3Client {
  if (!client) {
    const endpoint = requireEnv("AWS_ENDPOINT_URL_S3");
    const accessKeyId = requireEnv("AWS_ACCESS_KEY_ID");
    const secretAccessKey = requireEnv("AWS_SECRET_ACCESS_KEY");

    client = new S3Client({
      forcePathStyle: true,
      region: process.env.AWS_REGION,
      endpoint,
      credentials: { accessKeyId, secretAccessKey }
    });
  }
  return client;
}

/**
 * Public URL of an object in a `public_read` bucket (e.g. `public`). No
 * signature needed. Each path segment (the bucket name and every `/`-
 * separated piece of the key) is percent-encoded independently via
 * `encodeURIComponent`, so a raw key with spaces, `#`, `%`, etc. still
 * produces a valid URL — the object's actual S3 key (passed to
 * PutObject/HeadObject elsewhere) stays raw and is never itself encoded.
 */
export function publicUrl(bucket: string, key: string): string {
  const endpoint = (process.env.AWS_ENDPOINT_URL_S3 ?? "").replace(/\/+$/, "");
  const encodedPath = [bucket, ...key.split("/")].map(encodeURIComponent).join("/");
  return `${endpoint}/${encodedPath}`;
}

/** `CmsBlobStore` backed by Neon object storage (S3-compatible, bucket `public` is `public_read`). */
export class NeonBlobStore implements CmsBlobStore {
  readonly name = "neon";

  async upload(input: { bucket: string; path: string; contentType: string; data: Buffer }): Promise<{ path: string; url: string }> {
    await getClient().send(
      new PutObjectCommand({
        Bucket: input.bucket,
        Key: input.path,
        Body: input.data,
        ContentType: input.contentType
      })
    );

    return { path: input.path, url: publicUrl(input.bucket, input.path) };
  }
}

/** Used by scripts/seed.ts to skip re-uploading an object that's already there (idempotency by key). */
export async function objectExists(bucket: string, key: string): Promise<boolean> {
  try {
    await getClient().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (caughtError) {
    const status = (caughtError as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
    if (status === 404) {
      return false;
    }
    throw caughtError;
  }
}
