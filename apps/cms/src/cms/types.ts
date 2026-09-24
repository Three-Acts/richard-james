// The CMS schema lives in the shared `@three-acts/cms-schema` package so the
// API can validate writes against the same collection registry. This module
// re-exports it to keep existing import paths inside the CMS app working.
export * from "@three-acts/cms-schema";
