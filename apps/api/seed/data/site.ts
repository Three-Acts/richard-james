/**
 * Seed values for the `site-settings` collection (one record; see
 * `packages/cms-schema/src/registry.ts`). This is the source of truth for
 * `scripts/seed.ts` — the live site reads the published record back from the
 * API, not this file, once seeded.
 */
export const site = {
  name: "Richard James",
  tagline: "South African / UK Artist",
  location: "Gqeberha (Port Elizabeth), South Africa",
  email: "richardjames502@gmail.com",
  phone: "+27 79 427 3687",
  phoneHref: "tel:+27794273687",
  description:
    "Richard James — South African / UK artist based in Gqeberha (Port Elizabeth), South Africa. Contemporary works exploring Buddhist practice, affect theory and the unborn."
}
