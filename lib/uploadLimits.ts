// Shared between the upload form (client) and the upload Server Action.
// Must stay below serverActions.bodySizeLimit in next.config.ts.
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
