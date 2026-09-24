// Shared helpers for `AssetControl` and `GalleryControl`. Split out from
// asset-field.tsx (a component file) so exporting them doesn't trip
// `react-refresh/only-export-components` — that rule expects a component
// file to export components only.

export type AssetMeta = { fileName: string; size: number };

// The upload response is the only place a fresh file's real name/size live —
// the record only ever stores the URL. Keyed by URL so a control can recover
// them right after upload, even though nothing about the object storage URL
// itself carries that information.
const assetMetaByUrl = new Map<string, AssetMeta>();

export function rememberAssetMeta(url: string, meta: AssetMeta): void {
  assetMetaByUrl.set(url, meta);
}

export function getAssetMeta(url: string): AssetMeta | undefined {
  return assetMetaByUrl.get(url);
}

const BYTE_UNITS = ["B", "kB", "MB", "GB", "TB"];

export function formatFileSize(bytes: number): string {
  if (bytes < 1000) {
    return `${bytes} B`;
  }

  let value = bytes;
  let unitIndex = 0;

  while (value >= 1000 && unitIndex < BYTE_UNITS.length - 1) {
    value /= 1000;
    unitIndex += 1;
  }

  const rounded = value.toFixed(1).replace(/\.0$/, "");
  return `${rounded} ${BYTE_UNITS[unitIndex]}`;
}

export function fileNameFromUrl(url: string): string {
  const path = url.split(/[?#]/)[0];
  const segment = path.slice(path.lastIndexOf("/") + 1);

  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function matchesAccept(file: File, accept?: string): boolean {
  const patterns = accept
    ? accept
        .split(",")
        .map((pattern) => pattern.trim())
        .filter(Boolean)
    : [];

  if (patterns.length === 0) {
    return true;
  }

  return patterns.some((pattern) => {
    if (pattern.startsWith(".")) {
      return file.name.toLowerCase().endsWith(pattern.toLowerCase());
    }

    if (pattern.endsWith("/*")) {
      return file.type.startsWith(pattern.slice(0, -1));
    }

    return file.type === pattern;
  });
}
