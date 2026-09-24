import { defineConfig } from "@neon/config/v1";

// Branch policy for the linked Neon project (see .neon). `neon deploy` applies it.
// `buckets` was `preview.buckets` in the original brief; @neon/config 1.7 reports
// that key as a deprecated alias now that object storage is GA.
export default defineConfig({
  auth: true,
  buckets: {
    public: { access: "public_read" },
  },
});
