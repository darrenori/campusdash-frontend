/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.vue$': '@vue/vue3-jest',
    '^.+\\.js$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'vue', 'json'],
  setupFiles: ['<rootDir>/src/tests/setup.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  collectCoverageFrom: [
    'src/**/*.{js,vue}',
    '!src/main.js',
    '!src/utils/socket.js',
  ],
  globals: {
    '@vue/vue3-jest': {
      experimentalCSSCompile: false,
    },
  },
};
