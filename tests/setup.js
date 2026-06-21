// Polyfill import.meta for Jest (Vite uses import.meta.env; Jest runs in CJS).
// The babel.config.cjs plugin rewrites `import.meta` → `globalThis.__importMeta__`.
globalThis.__importMeta__ = {
  env: {
    VITE_BACKEND_URL: 'http://localhost:8080/api',
    VITE_FILE_SERVER_URL: 'http://localhost:9000',
    BASE_URL: '/',
    DEV: true,
    PROD: false,
    MODE: 'test',
  },
  glob: () => ({}),
};
