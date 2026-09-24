import type { CmsCollection } from "./types";

export const collectionRegistry: CmsCollection[] = [
  {
    id: "projects",
    label: "Projects",
    tableName: "projects",
    group: "Work",
    titleField: "title",
    description: "Portfolio projects with an ordered image gallery and publishing status.",
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "slug", label: "Slug", type: "slug", required: true, urlPrefix: "richardjamesart.com/projects/" },
      { key: "year", label: "Year", type: "text", required: true, helpText: "Four-digit year, e.g. 2025" },
      {
        key: "sortOrder",
        label: "Sort order",
        type: "number",
        required: true,
        helpText:
          "Position in the browsing order (1 = first). Next/previous links and the home stage follow this order."
      },
      { key: "subtitle", label: "Subtitle", type: "text", helpText: "Translated or transliterated subtitle" },
      { key: "originalTitle", label: "Original title", type: "text", helpText: "Title in its original writing system" },
      {
        key: "originalTitleLang",
        label: "Original title language",
        type: "text",
        helpText: "BCP 47 language tag for the original title, e.g. fa or hi"
      },
      {
        key: "medium",
        label: "Medium",
        type: "textarea",
        required: true,
        helpText: "Materials and dimensions. One line per element."
      },
      { key: "description", label: "Description", type: "textarea", helpText: "Slide text shown on the project page" },
      {
        key: "metaDescription",
        label: "Meta description",
        type: "textarea",
        helpText: "Short description for search engines and social cards"
      },
      { key: "hero", label: "Hero", type: "asset", required: true, bucket: "public", accept: "image/*" },
      {
        key: "thumb",
        label: "Thumb",
        type: "asset",
        bucket: "public",
        accept: "image/*",
        helpText: "Defaults to the hero image when empty"
      },
      {
        key: "gallery",
        label: "Gallery",
        type: "gallery",
        bucket: "public",
        accept: "image/*",
        helpText:
          "All images of the work in viewing order. Drag files in to add; reorder with the arrows; captions are optional and show under the image in the gallery grid."
      },
      {
        key: "gridStride",
        label: "Grid stride",
        type: "number",
        helpText: "Show every Nth gallery image in the grid (all images stay in the viewer). 0 or 1 shows every image."
      }
    ],
    listColumns: [
      { key: "title", label: "Name", width: "minmax(220px, 1.4fr)" },
      { key: "year", label: "Year", width: "90px" },
      { key: "sortOrder", label: "Order", width: "90px" },
      { key: "publishStatus", label: "Status", valueType: "status", width: "160px" },
      { key: "modifiedAt", label: "Modified", valueType: "datetime", width: "170px" }
    ]
  },
  {
    id: "pages",
    label: "Pages",
    tableName: "pages",
    group: "Site",
    titleField: "title",
    description: "Standalone site pages such as About or the artist's essay.",
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "key", label: "Key", type: "slug", required: true, helpText: "Route key the site looks up: about or essay" },
      {
        key: "body",
        label: "Body",
        type: "textarea",
        required: true,
        helpText:
          "Lightweight markdown: '# ' heading 1, '## ' heading 2, '### ' heading 3, '- ' list item, blank line between paragraphs."
      }
    ],
    listColumns: [
      { key: "title", label: "Name" },
      { key: "key", label: "Key", width: "140px" },
      { key: "publishStatus", label: "Status", valueType: "status", width: "160px" },
      { key: "modifiedAt", label: "Modified", valueType: "datetime", width: "170px" }
    ]
  },
  {
    id: "site-settings",
    label: "Site Settings",
    tableName: "site_settings",
    mode: "data",
    group: "Site",
    titleField: "name",
    description: "One record. The site reads the most recently modified record.",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "tagline", label: "Tagline", type: "text", required: true },
      { key: "location", label: "Location", type: "text" },
      { key: "email", label: "Email", type: "text", required: true },
      { key: "phone", label: "Phone", type: "text" },
      { key: "phoneHref", label: "Phone link", type: "text", helpText: "tel: link, e.g. tel:+27794273687" },
      { key: "description", label: "Description", type: "textarea", required: true, helpText: "Default meta description" },
      { key: "ogImage", label: "Social image", type: "asset", bucket: "public", accept: "image/*" }
    ],
    listColumns: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "modifiedAt", label: "Modified", valueType: "datetime", width: "170px" }
    ]
  },
  {
    id: "contact-submissions",
    label: "Contact Submissions",
    tableName: "contact_submissions",
    // Submissions are created by the site, not editors — view, export, delete only.
    mode: "readonly",
    group: "Inbox",
    titleField: "name",
    description: "Messages sent through the site's contact form.",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "email", label: "Email", type: "text", required: true },
      { key: "message", label: "Message", type: "textarea" },
      { key: "submittedAt", label: "Submitted at", type: "datetime" }
    ],
    listColumns: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "createdAt", label: "Received", valueType: "datetime", width: "170px" }
    ]
  }
];
