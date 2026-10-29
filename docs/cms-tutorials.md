# CMS tutorials

Editors open **Help → Tutorials** in the CMS sidebar. The library uses the same panels, controls, colours and typography as the editor. It contains 21 procedures, with search, a narrated video, captions, written steps, transcript timestamps, original 4K screenshots and PDF/Word guides. Smaller screens use a searchable tutorial picker.

The tutorials screen loads on demand. Only the selected video's metadata is preloaded; videos do not autoplay. Leaving a procedure pauses its video. Media URLs are requested from the CMS API after an editor session is validated and expire after five minutes. The screen refreshes them before expiry and when a backgrounded tab becomes active again. When a video URL changes, playback time and playing/paused state are restored. A failed access or video offers a retry while keeping the written instructions available.

## Navigation and drafts

`#tutorials/04` opens a specific procedure after authentication. `#tutorials` and invalid tutorial numbers fall back to the first procedure. Opening the library creates a browser history entry; selecting another procedure replaces that entry. Back and Forward work between the library and editor.

The workspace hook stays mounted while tutorials are visible. An editor can consult help and return using **Back to editor** without losing the draft or staged uploads. Collection changes and sign out still use the existing unsaved changes confirmation. Refreshing the browser retains the existing unsaved changes warning; drafts are not persisted across reloads.

## Updating content

- Procedure text, categories, durations and transcript timestamps live in `apps/cms/src/tutorials/tutorials.json`.
- Tutorial media is stored in the private Neon Object Storage bucket `cms-tutorials`. Production objects use the immutable `v2026-10-29/` prefix; set `CMS_TUTORIALS_PREFIX` only when selecting another uploaded version. Never add a public asset fallback to the CMS.
- The API authenticates `GET /api/cms/tutorials/:tutorialId/media` and returns five-minute presigned GET URLs only for the paths in `packages/cms-schema/src/tutorial-contract.ts`. That list must be updated when a procedure's ID or slug changes. SRT URLs are returned only when requested with `includeSrt=true`.
- Each procedure uses the same two digit ID and slug for its MP4, PNG, VTT and TXT object names. SRT versions are also provided for external video players. Keep the private bucket's CORS policy compatible with the CMS origins and allow cross-origin GET/range access so native video and VTT tracks work.
- Do not package tutorial media in the CMS public build. The browser must never receive storage credentials or a permanent object URL; downloads use signed response content-disposition headers.
- Keep screenshots at their original 3840 × 2160 resolution. Videos use H.264/AAC at 1920 × 1080. Update captions, transcript timestamps, duration and written steps together when replacing a recording.
- The PDF has an introduction, an index, one page per procedure and a troubleshooting page. Procedure links use the ID plus two for their PDF page number. Keep the PDF and Word versions in sync.
- Media links inside both guides open the matching authenticated CMS tutorial. Do not use relative bucket links: a private object's signature does not authorize sibling files.

The initial media release contains 21 videos, 21 original 4K screenshots, VTT/SRT captions, transcripts and both guides. Conservative video compression reduced the library from 60,820,338 to 55,563,129 bytes (8.6%). Seventeen videos passed the quality threshold; four retain their original bytes. Narration and embedded subtitle packets are unchanged. The private release also includes an asset manifest, procedure metadata and a backup of the client introduction package.

The recordings use a training copy of the CMS, example credentials and simulated publishing. They contain no live session credentials. The library UI is inside the authenticated workspace; the private media endpoint requires a live Neon editor session and does not accept the publishing service token.

## Verification

```sh
npx tsx --test apps/api/api/_lib/tutorial-media.test.ts apps/cms/src/lib/*.test.ts apps/cms/src/tutorials/*.test.ts
npm run lint -w @three-acts/api
npm run lint -w @three-acts/cms
npm run build -w @three-acts/api
npm run typecheck -w @three-acts/cms
npm run build:cms
```

Browser checks cover authenticated direct links, all videos and caption tracks, search, playback and seeking, download links, video error recovery, draft and staged image preservation, navigation confirmations, browser history, and the desktop, tablet and phone layouts.
