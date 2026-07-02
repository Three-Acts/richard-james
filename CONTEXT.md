# Three Acts CMS

Three Acts CMS is the private editorial context for managing Supabase-backed website content and related assets.

## Language

**CMS Collection**:
An editable content set represented by a Supabase table.
_Avoid_: Hardcoded section, static tab

**Collection Registry**:
The allowlist of Supabase tables that are exposed as editable CMS Collections.
_Avoid_: Auto-discovery, table browser

**Collection Field**:
An editable property of a CMS Collection record as defined by the collection config.
_Avoid_: Raw column, inferred field

**Asset Field**:
A Collection Field that uploads a file to Supabase Storage and stores the file reference on the record.
_Avoid_: Asset library, media collection

**CMS Data Adapter**:
The interface the CMS uses to read records, save records, and upload asset field files.
_Avoid_: Supabase client, mock data

**Collection Mode**:
How editors work with a CMS Collection's records: `editorial` (publish workflow), `data` (editable, no publish workflow), or `readonly` (system-generated records like form submissions — view, export, delete only).
_Avoid_: Per-record permissions, role-based access

**Publish Status**:
The editor-facing state that indicates whether a record is published, unpublished, or queued to publish. Only records in `editorial` mode collections carry one.
_Avoid_: Version history, release workflow

**Editorial Workspace**:
The desktop-first CMS interface where editors browse collections, scan records, and edit a selected record.
_Avoid_: Mobile app, landing page, Figma canvas

**Record Editor Pane**:
The main split-pane editor shown beside the collection record list for the selected CMS Collection record.
_Avoid_: Modal editor, drawer editor

**Title Field**:
The configured Collection Field used as the primary label for a CMS Collection record.
_Avoid_: Inferred name, display guess

**Test Collection Set**:
A mock group of CMS Collections designed to exercise every supported editor field and workflow.
_Avoid_: Production content, screenshot copy

## Relationships

- A **CMS Collection** is backed by exactly one Supabase table.
- The **Collection Registry** defines which Supabase tables appear as **CMS Collections**.
- A **CMS Collection** has one or more **Collection Fields**.
- An **Asset Field** belongs to exactly one **CMS Collection** field configuration.
- The **CMS Data Adapter** provides records and asset uploads for each **CMS Collection**.
- A **CMS Collection** has one **Collection Mode** (`editorial` by default).
- A CMS Collection record has one **Publish Status** only when its collection's **Collection Mode** is `editorial`.
- The **Editorial Workspace** is optimized for desktop editorial work.
- The **Editorial Workspace** shows the selected record in a **Record Editor Pane**.
- A **CMS Collection** may define one **Title Field**.
- The **Test Collection Set** provides mock CMS Collections through the mock CMS Data Adapter.

## Example dialogue

> **Dev:** "When an editor opens a **CMS Collection**, should the fields come from app code or from Supabase?"
> **Domain expert:** "From Supabase — each **CMS Collection** maps to a table the CMS can inspect and edit."
> **Dev:** "Can every table become a **CMS Collection** automatically?"
> **Domain expert:** "No — a table must be listed in the **Collection Registry** first."
> **Dev:** "Should the CMS infer every **Collection Field** from the database?"
> **Domain expert:** "No — **Collection Fields** are configured so the editor shows the right controls."
> **Dev:** "Is uploaded media managed as its own collection?"
> **Domain expert:** "No — uploads are edited through an **Asset Field** on the record that needs the file."
> **Dev:** "Do we need live Supabase credentials before building the CMS?"
> **Domain expert:** "No — build against the **CMS Data Adapter** first, then replace the mock adapter with Supabase later."
> **Dev:** "Does **Publish Status** mean we need a complete draft/version release system?"
> **Domain expert:** "No — it is a lightweight status shown in the editor contract for now."
> **Dev:** "Should the CMS behave like a mobile-first app?"
> **Domain expert:** "No — the **Editorial Workspace** follows Webflow-style desktop editorial density, with mobile as a fallback."
> **Dev:** "Should selecting a record open a modal?"
> **Domain expert:** "No — records open in a **Record Editor Pane** like the Webflow CMS reference."
> **Dev:** "How does the CMS label a record in the list?"
> **Domain expert:** "Use the configured **Title Field** first, then fall back only when the config omits one."
> **Dev:** "Should the mock data copy the screenshot content?"
> **Domain expert:** "No — use a **Test Collection Set** that exercises every editor capability."

## Flagged ambiguities

- "collection" was used to mean both a UI section and a data source — resolved: a **CMS Collection** is a Supabase-backed editable table.
- "generic" could mean exposing every Supabase table — resolved: generic editing is constrained by the **Collection Registry**.
- "field" could mean any database column — resolved: a **Collection Field** is an editor-facing field defined in collection config.
- "asset" could mean a standalone library — resolved: an **Asset Field** is a field-level upload/reference control.
- "mock data" means a temporary **CMS Data Adapter** implementation, not a different UI or data contract.
- "publish workflow" means lightweight **Publish Status**, not full version history or scheduled release management.
- "Figma-like" was used for the visual target — resolved: the intended reference is Webflow CMS, and the **Editorial Workspace** should be compact and desktop-first.
- "same as screenshot" means a split-pane **Record Editor Pane**, not a modal or drawer.
- "record title" is resolved by the **Title Field**, with fallback only for incomplete collection config.
- "mock collections" should form a **Test Collection Set**, not pretend to be final production content.
