// Resolves a stored relative file path (e.g. a profile picture) to an absolute
// URL against the configured file server.
export function resolveFileUrl(rawUrl) {
    if (!rawUrl) return null;
    if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
    let base = import.meta.env.VITE_FILE_SERVER_URL || '';
    if (base.endsWith('/')) base = base.slice(0, -1);
    return `${base}${rawUrl}`;
}
