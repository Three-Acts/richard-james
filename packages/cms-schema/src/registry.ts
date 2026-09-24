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
      { key: "title", label: "Title", type: "text", required: true, section: "basic" },
      {
        key: "slug",
        label: "Slug",
        type: "slug",
        required: true,
        urlPrefix: "https://www.richardjamesart.com/projects/",
        section: "basic"
      },
      { key: "year", label: "Year", type: "text", required: true, helpText: "Four-digit year, e.g. 2025", section: "custom" },
      {
        key: "sortOrder",
        label: "Sort order",
        type: "number",
        required: true,
        helpText:
          "Position in the browsing order (1 = first). Next/previous links and the home stage follow this order.",
        section: "custom"
      },
      {
        key: "subtitle",
        label: "Subtitle",
        type: "text",
        helpText: "Translated or transliterated subtitle",
        section: "custom"
      },
      {
        key: "originalTitle",
        label: "Original title",
        type: "text",
        helpText: "Title in its original writing system",
        section: "custom"
      },
      {
        key: "originalTitleLang",
        label: "Original title language",
        type: "text",
        helpText: "BCP 47 language tag for the original title, e.g. fa or hi",
        section: "custom"
      },
      {
        key: "medium",
        label: "Medium",
        type: "textarea",
        required: true,
        helpText: "Materials and dimensions. One line per element.",
        section: "custom"
      },
      {
        key: "description",
        label: "Description",
        type: "richtext",
        helpText: "Slide text shown on the project page. Use the toolbar for headings, emphasis and lists.",
        section: "custom"
      },
      { key: "hero", label: "Hero", type: "asset", required: true, bucket: "public", accept: "image/*", section: "custom" },
      {
        key: "thumb",
        label: "Thumb",
        type: "asset",
        bucket: "public",
        accept: "image/*",
        helpText: "Defaults to the hero image when empty",
        section: "custom"
      },
      {
        key: "gallery",
        label: "Gallery",
        type: "gallery",
        bucket: "public",
        accept: "image/*",
        helpText:
          "All images of the work in viewing order. Drag files in to add; reorder with the arrows; captions are optional and show under the image in the gallery grid.",
        section: "custom"
      },
      {
        key: "gridStride",
        label: "Grid stride",
        type: "number",
        helpText: "Show every Nth gallery image in the grid (all images stay in the viewer). 0 or 1 shows every image.",
        section: "custom"
      },
      {
        key: "metaTitle",
        label: "Meta title",
        type: "text",
        helpText: "Overrides the page title in search results and browser tabs. Defaults to the work's title.",
        section: "seo"
      },
      {
        key: "metaDescription",
        label: "Meta description",
        type: "textarea",
        helpText: "Short description for search engines and social cards.",
        section: "seo"
      },
      {
        key: "ogImage",
        label: "Social image",
        type: "asset",
        bucket: "public",
        accept: "image/*",
        helpText: "Social sharing image. Defaults to the hero image.",
        section: "seo"
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
    allowCreate: false,
    allowDelete: false,
    description: "The site's fixed pages. Edit the copy and imagery; pages cannot be added or removed here.",
    fields: [
      { key: "title", label: "Title", type: "text", required: true, section: "basic" },
      {
        key: "slug",
        label: "Slug",
        type: "slug",
        required: true,
        urlPrefix: "https://www.richardjamesart.com/",
        helpText: "The page's address on the site",
        section: "basic"
      },
      {
        key: "image",
        label: "Image",
        type: "asset",
        bucket: "public",
        accept: "image/*",
        helpText: "Portrait or lead image shown beside the text, where the page uses one",
        section: "custom"
      },
      { key: "body", label: "Body", type: "richtext", required: true, section: "custom" },
      { key: "metaTitle", label: "Meta title", type: "text", section: "seo" },
      { key: "metaDescription", label: "Meta description", type: "textarea", section: "seo" },
      { key: "ogImage", label: "Social image", type: "asset", bucket: "public", accept: "image/*", section: "seo" }
    ],
    listColumns: [
      { key: "title", label: "Name" },
      { key: "slug", label: "Slug", width: "200px" },
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
    singleton: true,
    allowCreate: false,
    allowDelete: false,
    description: "One record. The site reads the most recently modified record.",
    fields: [
      { key: "name", label: "Name", type: "text", required: true, section: "custom" },
      { key: "tagline", label: "Tagline", type: "text", required: true, section: "custom" },
      { key: "location", label: "Location", type: "text", section: "custom" },
      { key: "email", label: "Email", type: "text", required: true, section: "custom" },
      { key: "phone", label: "Phone", type: "text", section: "custom" },
      {
        key: "phoneHref",
        label: "Phone link",
        type: "text",
        helpText: "tel: link, e.g. tel:+27794273687",
        section: "custom"
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        required: true,
        helpText: "Default meta description",
        section: "custom"
      },
      { key: "ogImage", label: "Social image", type: "asset", bucket: "public", accept: "image/*", section: "custom" }
    ],
    listColumns: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "modifiedAt", label: "Modified", valueType: "datetime", width: "170px" }
    ]
  }
];
