// Inline Babel plugin: transforms `import.meta` → `globalThis.__importMeta__`
// so Jest (CommonJS) can handle Vite's import.meta.env references.
const importMetaPlugin = ({ types: t }) => ({
  name: 'transform-import-meta',
  visitor: {
    MetaProperty(path) {
      if (
        t.isIdentifier(path.node.meta, { name: 'import' }) &&
        t.isIdentifier(path.node.property, { name: 'meta' })
      ) {
        path.replaceWith(
          t.memberExpression(
            t.identifier('globalThis'),
            t.identifier('__importMeta__')
          )
        );
      }
    },
  },
});

module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
  plugins: [importMetaPlugin],
};
