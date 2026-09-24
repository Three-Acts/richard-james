# Richard James CMS

Richard James CMS is the private editorial context for managing website content and related assets, stored in a pluggable Data Store and Blob Store.

## Language

**CMS Collection**:
An editable content set backed by exactly one table in a Data Store.
_Avoid_: Hardcoded section, static tab

**Collection Registry**:
The allowlist of backing tables that are exposed as editable CMS Collections.
_Avoid_: Auto-discovery, table browser

**Collection Field**:
An editable property of a CMS Collection record as defined by the collection config.
_Avoid_: Raw column, inferred field

**Asset Field**:
A Collection Field that uploads a file to the Blob Store and stores the file reference on the record.
_Avoid_: Asset library, media collection

**CMS Data Adapter**:
The interface the CMS uses to list, read, create, save, delete, and import collection records, and to run the Publish Transition. Asset uploads go through the CMS Backend's storage side instead.
_Avoid_: REST client, direct database access

**CMS Backend**:
The composition of a CMS Data Adapter, a storage adapter, and an auth client that the CMS uses at runtime, injected through `CmsBackendProvider`. There is exactly one implementation: it always talks to the REST Bridge and always signs in through Neon Auth. The interface stays named/shaped as `CmsBackend` so a future second implementation is possible, but nothing in the shipped CMS lets an editor or developer pick one at runtime.
_Avoid_: Neon integration, data layer, a mode you switch

**Data Store**:
A server-side implementation of the data store interface behind the REST Bridge. Neon Postgres (via `pg`) is the only one that ships; adding a different Postgres host means implementing the interface and registering it in `resolve-store.ts`.
_Avoid_: The database, Neon as the only option, a selectable backend

**Blob Store**:
A server-side implementation of the blob store interface behind the REST Bridge for asset uploads. Neon object storage (S3-compatible) is the only one that ships.
_Avoid_: Neon object storage as the only option, file system, a selectable backend

**Reference Field**:
A Collection Field whose value is another record's id in a named CMS Collection, edited as a select of that collection's records (labelled by its Title Field) and resolved back to that title wherever it's displayed. A generic capability of the Collection Schema Package; no shipped CMS Collection uses one today (see Gallery Field).
_Avoid_: Foreign key, join table, lookup table

**Gallery Field**:
A Collection Field holding an ordered list of `{ src, caption? }` items as one JSON value on the record itself, rather than as records in a child CMS Collection. Edited as a multi-file drop zone with a thumbnail grid: drag files in to upload each through the Blob Store, reorder, caption, or remove. Replaced an earlier `project-images` child collection linked back to `projects` by a Reference Field.
_Avoid_: Media collection, join table, project-images

**Content API**:
The public, read-only `/api/content/*` routes on the REST Bridge that project published CMS Collection records into the site's content shapes. Consumed by `apps/web` at build time; no authentication, no drafts.
_Avoid_: The REST Bridge, an authenticated endpoint, the CMS Data Adapter

**Content Source**:
`apps/web`'s read path for build-time content: fetches the Content API over HTTP. There is no local/offline alternative — `apps/web` holds no content of its own, so a missing or unreachable Content API fails the build immediately rather than falling back to anything.
_Avoid_: CMS Backend, Data Store, a configurable choice

**Editor Session**:
The Neon Auth session token an editor holds after signing in through `/api/auth/sign-in`, brokered end-to-end by the REST Bridge — the CMS never calls Neon Auth directly and never holds one of its short-lived JWTs.
_Avoid_: JWT, access token, API key

**REST Bridge**:
The `apps/api` HTTP layer (`/api/cms/*`) that lets the CMS Backend reach a Data Store and Blob Store over HTTP, validated against the Collection Schema Package. Every route requires an `Authorization: Bearer` token: either an **Editor Session** or the `PUBLISH_TOKEN` shared secret (for scripts/CI) — there is no unauthenticated mode in any environment.
_Avoid_: Generic API gateway, database proxy

**Collection Schema Package**:
The shared `@three-acts/cms-schema` package: the Collection Registry, field types, typed errors, the REST wire contract, and column-mapping helpers. Consumed by the CMS and the REST Bridge so both validate against the same fields.
_Avoid_: Duplicated types, app-local schema

**Collection Mode**:
How editors work with a CMS Collection's records: `editorial` (publish workflow), `data` (editable, no publish workflow), or `readonly` (system-generated records like form submissions — view, export, delete only).
_Avoid_: Per-record permissions, role-based access

**Publish Status**:
The editor-facing state that indicates whether a record is published, unpublished, or queued to publish. Only records in `editorial` mode collections carry one.
_Avoid_: Version history, release workflow

**Publish Transition**:
The first publish step: the Data Store flips every record queued to publish over to published. It does not rebuild the public site.
_Avoid_: The full publish flow, deploy

**Site Deploy**:
The second publish step: rebuilding the static site from the current published records, then confirming the new deployment finished.
_Avoid_: Publish, save

**Editorial Workspace**:
The desktop-first CMS interface where editors browse collections, scan records, and edit a selected record.
_Avoid_: Mobile app, landing page, Figma canvas

**Record Editor Pane**:
The main split-pane editor shown beside the collection record list for the selected CMS Collection record.
_Avoid_: Modal editor, drawer editor

**Title Field**:
The configured Collection Field used as the primary label for a CMS Collection record.
_Avoid_: Inferred name, display guess

## Relationships

- A **CMS Collection** is backed by exactly one table in a **Data Store**.
- The **Collection Registry** defines which backing tables appear as **CMS Collections**.
- A **CMS Collection** has one or more **Collection Fields**.
- An **Asset Field** belongs to exactly one **CMS Collection** field configuration.
- A **Reference Field** belongs to exactly one **CMS Collection** field configuration and names the **CMS Collection** its value points into.
- A **Gallery Field** belongs to exactly one **CMS Collection** field configuration; its items are stored on that record, not as records of another **CMS Collection**.
- The **CMS Backend**'s data adapter provides records, and its storage adapter provides asset uploads through the **Blob Store**, for each **CMS Collection**.
- The **REST Bridge** exposes a **Data Store** and a **Blob Store** to the **CMS Backend** over HTTP, validated against the **Collection Schema Package**.
- The **REST Bridge** also exposes the **Content API**, projecting published records straight out of the **Data Store**, and brokers the **Editor Session** against Neon Auth so the CMS never holds a provider credential directly.
- `apps/web`'s **Content Source** always reads the **Content API**; it never talks to a **Data Store** directly and has no other source to fall back to.
- The **Collection Schema Package** defines the **Collection Registry** and field types once, shared by the CMS and the **REST Bridge**.
- A **CMS Collection** has one **Collection Mode** (`editorial` by default).
- A CMS Collection record has one **Publish Status** only when its collection's **Collection Mode** is `editorial`.
- Publishing runs a **Publish Transition** first, then a **Site Deploy**.
- The **Editorial Workspace** is optimized for desktop editorial work.
- The **Editorial Workspace** shows the selected record in a **Record Editor Pane**.
- A **CMS Collection** may define one **Title Field**.

## Example dialogue

> **Dev:** "When an editor opens a **CMS Collection**, should the fields come from app code or from the **Data Store**?"
> **Domain expert:** "From configuration. Each **CMS Collection** maps to a table in the **Data Store**, but the fields shown in the editor are configured, not inspected."
> **Dev:** "Can every table become a **CMS Collection** automatically?"
> **Domain expert:** "No — a table must be listed in the **Collection Registry** first."
> **Dev:** "Should the CMS infer every **Collection Field** from the database?"
> **Domain expert:** "No — **Collection Fields** are configured so the editor shows the right controls."
> **Dev:** "Is uploaded media managed as its own collection?"
> **Domain expert:** "No — uploads are edited through an **Asset Field** on the record that needs the file."
> **Dev:** "Can I run the CMS locally with no backend at all, like a mock mode?"
> **Domain expert:** "No — that was removed. The CMS always talks to the real **REST Bridge** and Neon Auth, in every environment including local dev. What's left of that flexibility is architectural: the **CMS Backend** and **AuthClient** are still named interfaces, so a second implementation is possible, but nothing in the shipped CMS lets you switch to one at runtime."
> **Dev:** "Can I use plain Postgres?"
> **Domain expert:** "That's exactly what ships today — Neon Postgres behind the **Data Store** interface. Point it at a different Postgres host and register it in the **REST Bridge**; nothing in the CMS or the **Collection Schema Package** changes."
> **Dev:** "Where do uploads go if I use Cloudflare?"
> **Domain expert:** "Wherever the **Blob Store** implementation puts them. Implement the interface for R2 and register it the same way. The **Asset Field** doesn't change."
> **Dev:** "How does a project's gallery know which images belong to it?"
> **Domain expert:** "They're not separate records at all — a **Gallery Field** on the **Projects** record holds its whole ordered image list as one value. We tried a child collection linked back by a **Reference Field** first and reverted it; a **Gallery Field** is simpler for editors to drag-and-reorder and needs far fewer database round trips to read."
> **Dev:** "Does `apps/web` read the **Data Store** directly at build time?"
> **Domain expert:** "No — it reads the **Content API** through its **Content Source**, which only ever returns published records. There's no local content to fall back to, so a broken **Content API** fails the build instead of shipping stale content."
> **Dev:** "Does the CMS store a Neon Auth token forever?"
> **Domain expert:** "It stores the **Editor Session** the REST Bridge hands back after sign-in, not a Neon Auth credential — the CMS never talks to Neon Auth itself."
> **Dev:** "Does **Publish Status** mean we need a complete draft/version release system?"
> **Domain expert:** "No — it is a lightweight status shown in the editor contract for now."
> **Dev:** "If an editor clicks Publish, is the site live right away?"
> **Domain expert:** "Not yet. Publish runs a **Publish Transition** in the **Data Store** first, then a **Site Deploy** rebuilds the static site. The CMS shows both steps as one flow."
> **Dev:** "Should the CMS behave like a mobile-first app?"
> **Domain expert:** "No — the **Editorial Workspace** follows Webflow-style desktop editorial density, with mobile as a fallback."
> **Dev:** "Should selecting a record open a modal?"
> **Domain expert:** "No — records open in a **Record Editor Pane** like the Webflow CMS reference."
> **Dev:** "How does the CMS label a record in the list?"
> **Domain expert:** "Use the configured **Title Field** first, then fall back only when the config omits one."
## Flagged ambiguities

- "collection" was used to mean both a UI section and a data source. Resolved: a **CMS Collection** is an editable table backed by a **Data Store**.
- "generic" could mean exposing every backing table. Resolved: generic editing is constrained by the **Collection Registry**.
- "generic backend" could mean rewriting the CMS for every provider. Resolved: a generic backend means swapping the **Data Store** and/or **Blob Store** implementation behind the same server-side interface; the CMS and **REST Bridge** never change.
- "field" could mean any database column — resolved: a **Collection Field** is an editor-facing field defined in collection config.
- "asset" could mean a standalone library — resolved: an **Asset Field** is a field-level upload/reference control.
- "publish" could mean just flipping a status or shipping the change live. Resolved: publish means a **Publish Transition** (queued to published, in the **Data Store**) followed by a **Site Deploy** (rebuilding the static site); the CMS runs both when an editor clicks Publish.
- "publish workflow" means lightweight **Publish Status**, not full version history or scheduled release management.
- "Figma-like" was used for the visual target — resolved: the intended reference is Webflow CMS, and the **Editorial Workspace** should be compact and desktop-first.
- "same as screenshot" means a split-pane **Record Editor Pane**, not a modal or drawer.
- "record title" is resolved by the **Title Field**, with fallback only for incomplete collection config.
</content>
