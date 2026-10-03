import type { CmsCollection } from "./types.js";

export const collectionRegistry: CmsCollection[] = [
  {
    id: "projects",
    label: "Projects",
    tableName: "projects",
    group: "Work",
    titleField: "title",
    orderingField: "sortOrder",
    description: "Portfolio projects with an ordered image gallery and publishing status.",
    fields: [
      { key: "title", label: "Title", type: "text", required: true, helpText: "The work's name, shown on its project page and in the portfolio.", section: "basic" },
      {
        key: "slug",
        label: "Slug",
        type: "slug",
        required: true,
        helpText: "Generated from the title. You can customise it; spaces become dashes and letters are lowercase.",
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
          "Position (1 = first). Moving this item shifts others automatically; only this item is queued. The order goes live when published.",
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
        helpText: "Language code for the original title, such as fa (Persian) or hi (Hindi).",
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
      { key: "hero", label: "Hero", type: "asset", required: true, bucket: "public", accept: "image/*", helpText: "The main image representing this work on the home page and project page.", section: "custom" },
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
          "Images in viewing order. Drop files to add them, then drag or use the arrows to reorder. Optional captions appear beneath each image on the project page.",
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
      { key: "title", label: "Title", type: "text", required: true, helpText: "The page's name, used to identify it in the CMS and in page titles.", section: "basic" },
      {
        key: "slug",
        label: "Slug",
        type: "slug",
        required: true,
        urlPrefix: "https://www.richardjamesart.com/",
        helpText: "The page's address on the site. Use lowercase words separated by dashes; changing it changes the page's URL.",
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
      { key: "body", label: "Body", type: "richtext", required: true, helpText: "The page's main text. Use the editor toolbar for headings, links and lists.", section: "custom" },
      { key: "metaTitle", label: "Meta title", type: "text", helpText: "A title for search results and browser tabs. Leave blank to use the page title.", section: "seo" },
      { key: "metaDescription", label: "Meta description", type: "textarea", helpText: "A short summary for search results and link previews. Leave blank to use the page's default description.", section: "seo" },
      { key: "ogImage", label: "Social image", type: "asset", bucket: "public", accept: "image/*", helpText: "An image for previews when this page is shared. Leave blank to use the page's image or the site's default.", section: "seo" }
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
      { key: "name", label: "Name", type: "text", required: true, helpText: "The artist or site name used in the site's identity and page titles.", section: "custom" },
      { key: "tagline", label: "Tagline", type: "text", required: true, helpText: "A short line describing the artist's work.", section: "custom" },
      { key: "location", label: "Location", type: "text", helpText: "The artist's city or region, as it should appear on the site.", section: "custom" },
      { key: "email", label: "Email", type: "text", required: true, helpText: "The public email address visitors can use to get in touch.", section: "custom" },
      {
        key: "phone",
        label: "Phone",
        type: "text",
        helpText: "The public contact number, including its country code. Visitors can click it to call.",
        section: "custom"
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        required: true,
        helpText: "A short description of the site, used in search results and link previews when a page has no description of its own.",
        section: "custom"
      },
      { key: "ogImage", label: "Social image", type: "asset", bucket: "public", accept: "image/*", helpText: "The default image for shared links when a page has no social image of its own.", section: "custom" }
    ],
    listColumns: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "modifiedAt", label: "Modified", valueType: "datetime", width: "170px" }
    ]
  }
];
