export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  coverageProvider: 'v8',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
  ],
  coverageReporters: ['text', 'lcov'],
  testTimeout: 30000,
};
