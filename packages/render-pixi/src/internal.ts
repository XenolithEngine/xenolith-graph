// Internal-tier re-exports for in-repo packages (editor, themes). These PIXI helpers stay
// reachable at runtime across package boundaries, but they are NOT part of the public entry
// surface (STABLE-API.md lists them in its internal tier). Do not move them back into the
// entry barrel: tsc's stripInternal cannot drop names from a barrel `export { x } from
// './y.js'` line, so keeping them out of index.ts is what hides them from the entry .d.ts.
// (Keep the bare JSDoc visibility tag out of THIS comment as well: tsc scans the leading
// comment text of this export for that tag and would strip the whole line from internal.d.ts.)
export { markPinInteractive, readPinHandle, clearGlowTextureCache, clearGradientCache } from './node-renderer.js'
