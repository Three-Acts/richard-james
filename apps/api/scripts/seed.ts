/**
 * Seeds the live Neon database + object storage bucket from the portfolio
 * content in `apps/api/seed/` (data files + images) — the one source of
 * truth for the published site; `apps/web` has no local content of its own
 * and reads everything back from this API at build/dev time. Idempotent:
 * - images are uploaded once per object key (skipped when already present);
 * - site-settings/pages/projects are upserted by their natural key
 *   (singleton / `slug` / `slug`) — a project's gallery (an ordered JSON list
 *   of `{ src, caption? }` stored directly on the project row, see
 *   `packages/cms-schema/src/gallery.ts`) is written every time as part of
 *   that same upsert, since it's just a field, not a separate collection.
 *
 * Usage:
 *   npm run db:seed -w @three-acts/api -- [--dry-run] [--skip-images]
 */
import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectionRegistry,
  serializeGalleryValue,
  type CmsCollection,
  type CmsRecord,
  type CmsRecordValue,
  type GalleryItem
} from "@three-acts/cms-schema";
import { getDataStore } from "../api/_lib/cms/resolve-store";
import { NeonBlobStore, objectExists, publicUrl } from "../api/_lib/cms/neon-blob-store";
import { loadEnvFiles } from "./load-env";
import { galleryImages, projects } from "../seed/data/projects";
import { pages } from "../seed/data/pages";
import { site } from "../seed/data/site";
import type { GalleryImage, Project, SeedPage } from "../seed/data/types";

const __dirname = dirname(fileURLToPath(import.meta.url));

loadEnvFiles([
  resolve(__dirname, "../.env.local"), // apps/api/.env.local — live Neon branch vars
  resolve(__dirname, "../.env") // apps/api/.env — fallback for anything .env.local doesn't set, if present
]);

const BUCKET = "public";
// The one copy of the portfolio's artwork — everything under here (including
// og-default.jpg, a sibling of the project/about folders) is walked and
// uploaded as-is; see uploadPortfolioImages below.
const imagesDir = resolve(__dirname, "../seed/images");

// --- fs helpers --------------------------------------------------------------

async function walkFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = resolve(dir, entry.name);
      return entry.isDirectory() ? walkFiles(full) : [full];
    })
  );
  return files.flat();
}

function contentTypeFor(filePath: string): string {
  switch (extname(filePath).toLowerCase()) {
    case ".avif":
      return "image/avif";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

async function runWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

// --- image upload ------------------------------------------------------------

/**
 * Uploads every file under apps/api/seed/images (preserving its relative path
 * under an `images/` prefix — this covers the 40 project folders, `about/`,
 * and `og-default.jpg`) and returns a map from the seed data's local
 * `/images/...` path (exactly the string literals used in
 * apps/api/seed/data/projects.ts's hero/thumb/images fields) to its public
 * bucket URL. Skips network entirely in --dry-run (URLs are still computed —
 * pure string construction).
 */
async function uploadPortfolioImages(dryRun: boolean, skipImages: boolean): Promise<Map<string, string>> {
  const shouldUpload = !dryRun && !skipImages;
  const blobStore = new NeonBlobStore();
  const urlByLocalPath = new Map<string, string>();

  const files = await walkFiles(imagesDir);
  let uploaded = 0;
  let skipped = 0;

  await runWithConcurrency(files, 8, async (file) => {
    const rel = relative(imagesDir, file).split(sep).join("/");
    const key = `images/${rel}`;
    urlByLocalPath.set(`/images/${rel}`, publicUrl(BUCKET, key));

    if (!shouldUpload) {
      return;
    }
    if (await objectExists(BUCKET, key)) {
      skipped += 1;
      return;
    }
    const data = await readFile(file);
    await blobStore.upload({ bucket: BUCKET, path: key, contentType: contentTypeFor(file), data });
    uploaded += 1;
  });

  if (!shouldUpload) {
    console.log(
      `Images: not uploaded (${skipImages ? "--skip-images" : "dry-run"}); ${files.length} files would be referenced.`
    );
  } else {
    console.log(`Images: ${uploaded} uploaded, ${skipped} already present (of ${files.length} total).`);
  }

  return urlByLocalPath;
}

// --- DB upserts ----------------------------------------------------------

function getCollection(id: string): CmsCollection {
  const collection = collectionRegistry.find((item) => item.id === id);
  if (!collection) {
    throw new Error(`Unknown collection in registry: ${id}`);
  }
  return collection;
}

/**
 * Tiny unit-style self-check (no test runner involved) that `publicUrl`
 * percent-encodes each path segment independently while leaving the raw S3
 * key (passed to `upload`/`objectExists` elsewhere) untouched. Guards
 * against a regression silently producing broken URLs for any file whose
 * name needs escaping (spaces, `#`, `%`, ...) — none of the current seed
 * data does, so this is the only place that exercises the pattern.
 */
function assertPublicUrlEncodesSegments(): { key: string; url: string } {
  const key = "images/a folder/file #1 (draft).avif";
  const url = publicUrl(BUCKET, key);
  const expected = `/${[BUCKET, ...key.split("/")].map(encodeURIComponent).join("/")}`;
  if (!url.endsWith(expected)) {
    throw new Error(`publicUrl did not percent-encode path segments as expected: got "${url}", wanted suffix "${expected}"`);
  }
  return { key, url };
}

function urlForLocalPath(urlByLocalPath: Map<string, string>, localPath: string): string {
  const url = urlByLocalPath.get(localPath);
  if (!url) {
    throw new Error(`No uploaded object found for local path ${localPath} (checked apps/api/seed/images${localPath.replace(/^\/images/, "")}).`);
  }
  return url;
}

async function upsertSiteSettings(
  siteSeed: typeof site,
  urlByLocalPath: Map<string, string>,
  dryRun: boolean
): Promise<void> {
  const values: Record<string, CmsRecordValue> = {
    name: siteSeed.name,
    tagline: siteSeed.tagline,
    location: siteSeed.location ?? "",
    email: siteSeed.email,
    phone: siteSeed.phone ?? "",
    // phoneHref is no longer a stored column — derived from phone at read
    // time (see api/_lib/content.ts's derivePhoneHref).
    description: siteSeed.description,
    ogImage: urlForLocalPath(urlByLocalPath, "/images/og-default.jpg")
  };

  if (dryRun) {
    console.log(`[dry-run] site-settings: ${siteSeed.name} <${siteSeed.email}>`);
    return;
  }

  const collection = getCollection("site-settings");
  const store = getDataStore();
  const { records } = await store.listRecords(collection, {});
  const existing = records[0];

  if (existing) {
    await store.updateRecord(collection, { ...existing, publishStatus: "published", values: { ...existing.values, ...values } });
    console.log("site-settings: updated.");
  } else {
    await store.insertRecords(collection, [{ publishStatus: "published", values }]);
    console.log("site-settings: inserted.");
  }
}

async function upsertPage(page: SeedPage, urlByLocalPath: Map<string, string>, dryRun: boolean): Promise<void> {
  const values: Record<string, CmsRecordValue> = {
    title: page.title,
    slug: page.slug,
    body: page.body,
    image: page.image ? urlForLocalPath(urlByLocalPath, page.image) : "",
    metaTitle: page.metaTitle ?? "",
    metaDescription: page.metaDescription ?? "",
    ogImage: page.ogImage ? urlForLocalPath(urlByLocalPath, page.ogImage) : ""
  };

  if (dryRun) {
    console.log(`[dry-run] page "${page.slug}": "${page.title}" (${page.body.length} chars)`);
    return;
  }

  // pages has allowCreate: false in the registry, but that's a CMS-editor/API
  // restriction (enforced in service.ts) — the seed script writes through
  // the store directly, same as the singleton site-settings record below.
  const collection = getCollection("pages");
  const store = getDataStore();
  const { records } = await store.listRecords(collection, {});
  const existing = records.find((record) => record.values.slug === page.slug);

  if (existing) {
    await store.updateRecord(collection, { ...existing, publishStatus: "published", values: { ...existing.values, ...values } });
    console.log(`page "${page.slug}": updated.`);
  } else {
    await store.insertRecords(collection, [{ publishStatus: "published", values }]);
    console.log(`page "${page.slug}": inserted.`);
  }
}

async function upsertProjects(
  seedProjects: Project[],
  galleryImagesFor: (project: Project) => GalleryImage[],
  urlByLocalPath: Map<string, string>,
  dryRun: boolean
): Promise<void> {
  const projectsCollection = getCollection("projects");
  const store = getDataStore();

  const existingProjects: CmsRecord[] = dryRun ? [] : (await store.listRecords(projectsCollection, {})).records;

  let projectsInserted = 0;
  let projectsUpdated = 0;
  let totalGalleryItems = 0;

  for (const [index, project] of seedProjects.entries()) {
    const sortOrder = index + 1;
    const images = galleryImagesFor(project);
    const galleryItems: GalleryItem[] = images.map((image) => ({
      src: urlForLocalPath(urlByLocalPath, image.src),
      ...(image.caption ? { caption: image.caption } : {})
    }));
    totalGalleryItems += galleryItems.length;

    const values: Record<string, CmsRecordValue> = {
      title: project.title,
      slug: project.slug,
      year: project.year,
      sortOrder,
      subtitle: project.subtitle ?? "",
      originalTitle: project.originalTitle ?? "",
      originalTitleLang: project.originalTitleLang ?? "",
      medium: project.medium,
      description: project.description ?? "",
      metaTitle: project.metaTitle ?? "",
      metaDescription: project.metaDescription ?? "",
      ogImage: project.ogImage ? urlForLocalPath(urlByLocalPath, project.ogImage) : "",
      hero: urlForLocalPath(urlByLocalPath, project.hero),
      thumb: urlForLocalPath(urlByLocalPath, project.thumb),
      // Images live directly on the project row as an ordered JSON list —
      // written on every upsert, since (unlike the old project-images
      // collection) there's no separate table to skip re-touching.
      gallery: serializeGalleryValue(galleryItems)
    };
    if (project.gridStride) {
      values.gridStride = project.gridStride;
    }

    if (dryRun) {
      console.log(`[dry-run] project ${sortOrder}: ${project.slug} (${galleryItems.length} gallery images)`);
      continue;
    }

    const existing = existingProjects.find((record) => record.values.slug === project.slug);
    if (existing) {
      await store.updateRecord(projectsCollection, {
        ...existing,
        publishStatus: "published",
        values: { ...existing.values, ...values }
      });
      projectsUpdated += 1;
    } else {
      await store.insertRecords(projectsCollection, [{ publishStatus: "published", values }]);
      projectsInserted += 1;
    }
  }

  if (dryRun) {
    console.log(`[dry-run] would upsert ${seedProjects.length} projects, ${totalGalleryItems} gallery images total.`);
    return;
  }

  console.log(`projects: ${projectsInserted} inserted, ${projectsUpdated} updated (${totalGalleryItems} gallery images total).`);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const skipImages = argv.includes("--skip-images");

  if (!dryRun && !process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Run `neon env pull --file apps/api/.env.local` first.");
    process.exit(1);
  }

  console.log(`Seeding${dryRun ? " (--dry-run)" : ""}${skipImages ? " (--skip-images)" : ""}...`);

  const encodingCheck = assertPublicUrlEncodesSegments();
  if (dryRun) {
    console.log(`[dry-run] publicUrl encodes each path segment, e.g. key "${encodingCheck.key}" -> "${encodingCheck.url}"`);
  }

  const urlByLocalPath = await uploadPortfolioImages(dryRun, skipImages);

  await upsertSiteSettings(site, urlByLocalPath, dryRun);

  for (const page of pages) {
    await upsertPage(page, urlByLocalPath, dryRun);
  }

  await upsertProjects(projects, galleryImages, urlByLocalPath, dryRun);

  console.log(dryRun ? "Dry run complete — nothing was uploaded or written." : "Seed complete.");
}

main().catch((caughtError) => {
  console.error(caughtError);
  process.exit(1);
});
