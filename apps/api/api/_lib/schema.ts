// The API's one import of the shared `@three-acts/cms-schema` package.
//
// Every other file under api/ imports from here rather than from the package
// name. On Vercel, @vercel/node transpiles each traced `.ts` file to `.js`
// (there is no bundling step), so at runtime Node resolves the package name
// through packages/cms-schema/package.json's `exports`, whose target is the
// `.ts` source that no longer exists in the deployed function. A relative
// path to the source sidesteps that map: the file tracer follows it (mapping
// `.js` back to the `.ts` source, as it does for every other import here) and
// Node loads the transpiled `.js` next to it at runtime. Locally, tsx and the
// typechecker resolve the same path straight to the `.ts` file.
export * from "../../../../packages/cms-schema/src/index.js";
