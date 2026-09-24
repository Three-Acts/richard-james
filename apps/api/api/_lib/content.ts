/**
 * Shapes published CMS records into the public content contract
 * (`@three-acts/cms-schema` content-contract.ts), read straight through the
 * data store. Backs the unauthenticated `/api/content/*` routes consumed by
 * `apps/web` at build/SSR time.
 */
import {
  collectionRegistry,
  parseGalleryValue,
  type CmsCollection,
  type CmsRecord,
  type PageContent,
  type ProjectContent,
  type SeoContent,
  type SiteContent
} from "@three-acts/cms-schema";
import { ApiError } from "./http";
import { getDataStore } from "./cms/resolve-store";
import type { ListRecordsStoreOptions } from "./cms/store";

function getCollection(id: string): CmsCollection {
  const collection = collectionRegistry.find((item) => item.id === id);
  if (!collection) {
    // Programmer error (a typo'd collection id above) — not a client-facing 404.
    throw new Error(`Unknown collection in registry: ${id}`);
  }
  return collection;
}

function stringValue(record: CmsRecord, key: string): string {
  const value = record.values[key];
  return value === null || value === undefined ? "" : String(value);
}

function optionalString(record: CmsRecord, key: string): string | undefined {
  const value = stringValue(record, key);
  return value ? value : undefined;
}

function numberValue(record: CmsRecord, key: string): number {
  const value = record.values[key];
  if (typeof value === "number") {
    return value;
  }
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * `phoneHref` was a stored field; it's now derived from `phone` (a `tel:`
 * link keeps only a leading "+" and digits) — e.g. "+27 79 427 3687" ->
 * "tel:+27794273687". Empty phone -> "".
 */
function derivePhoneHref(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) {
    return "";
  }
  const leadingPlus = trimmed.startsWith("+") ? "+" : "";
  const digits = trimmed.replace(/[^\d]/g, "");
  return digits ? `tel:${leadingPlus}${digits}` : "";
}

// Tiny self-check at module load (pure, no I/O) against the registry's own
// example phone number (site-settings' old `phoneHref` helpText).
if (derivePhoneHref("+27 79 427 3687") !== "tel:+27794273687" || derivePhoneHref("") !== "" || derivePhoneHref("  ") !== "") {
  throw new Error("derivePhoneHref regressed: check the digit/plus-stripping logic.");
}

async function listRecords(collectionId: string, options: ListRecordsStoreOptions): Promise<CmsRecord[]> {
  const collection = getCollection(collectionId);
  const { records } = await getDataStore().listRecords(collection, options);
  return records;
}

/** SEO fields are shared verbatim across projects/pages: metaTitle/metaDescription/ogImage, each omitted when empty (no hero/description fallback — that's a web-side concern). */
function buildSeo(record: CmsRecord): SeoContent {
  const metaTitle = optionalString(record, "metaTitle");
  const metaDescription = optionalString(record, "metaDescription");
  const ogImage = optionalString(record, "ogImage");

  return {
    ...(metaTitle !== undefined ? { metaTitle } : {}),
    ...(metaDescription !== undefined ? { metaDescription } : {}),
    ...(ogImage !== undefined ? { ogImage } : {})
  };
}

function toPageContent(record: CmsRecord): PageContent {
  const image = optionalString(record, "image");

  return {
    slug: stringValue(record, "slug"),
    title: stringValue(record, "title"),
    body: stringValue(record, "body"),
    ...(image !== undefined ? { image } : {}),
    seo: buildSeo(record)
  };
}

function toProjectContent(record: CmsRecord): ProjectContent {
  const hero = stringValue(record, "hero");
  const thumbRaw = stringValue(record, "thumb");
  const gridStrideRaw = numberValue(record, "gridStride");

  return {
    slug: stringValue(record, "slug"),
    title: stringValue(record, "title"),
    subtitle: optionalString(record, "subtitle"),
    originalTitle: optionalString(record, "originalTitle"),
    originalTitleLang: optionalString(record, "originalTitleLang"),
    year: stringValue(record, "year"),
    medium: stringValue(record, "medium"),
    description: stringValue(record, "description"),
    hero,
    // The API substitutes `hero` when no thumb is set.
    thumb: thumbRaw || hero,
    // Images live on the project row itself now (the `gallery` field, a JSON
    // GalleryItem[] string) rather than a joined project-images collection.
    images: parseGalleryValue(record.values.gallery),
    // 0 or empty shows every image (see registry helpText); the contract
    // leaves that as "unset".
    gridStride: gridStrideRaw ? gridStrideRaw : undefined,
    sortOrder: numberValue(record, "sortOrder"),
    seo: buildSeo(record)
  };
}

export async function getSiteContent(): Promise<SiteContent> {
  // site-settings has no publish workflow — the newest record wins regardless of publishStatus.
  const records = await listRecords("site-settings", { sort: { key: "modifiedAt", direction: "desc" } });
  const record = records[0];
  if (!record) {
    throw new ApiError(404, "not_found", "No site settings configured.");
  }

  return {
    name: stringValue(record, "name"),
    tagline: stringValue(record, "tagline"),
    location: stringValue(record, "location"),
    email: stringValue(record, "email"),
    phone: stringValue(record, "phone"),
    phoneHref: derivePhoneHref(stringValue(record, "phone")),
    description: stringValue(record, "description"),
    ogImage: stringValue(record, "ogImage")
  };
}

export async function listProjectsContent(): Promise<ProjectContent[]> {
  const projects = await listRecords("projects", {
    filter: { publishStatus: "published" },
    sort: { key: "sortOrder", direction: "asc" }
  });

  return projects.map(toProjectContent);
}

export async function getProjectContentBySlug(slug: string): Promise<ProjectContent> {
  const projects = await listRecords("projects", { filter: { publishStatus: "published" } });

  const project = projects.find((record) => stringValue(record, "slug") === slug);
  if (!project) {
    throw new ApiError(404, "not_found", `Unknown project: ${slug}`);
  }

  return toProjectContent(project);
}

export async function listPagesContent(): Promise<PageContent[]> {
  const records = await listRecords("pages", { filter: { publishStatus: "published" } });
  return records.map(toPageContent);
}

export async function getPageContentBySlug(slug: string): Promise<PageContent> {
  const records = await listRecords("pages", { filter: { publishStatus: "published" } });
  const record = records.find((item) => stringValue(item, "slug") === slug);
  if (!record) {
    throw new ApiError(404, "not_found", `Unknown page: ${slug}`);
  }
  return toPageContent(record);
}
