/** @type {import('jest').Config} */
module.exports = {
  displayName: 'api',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.(spec|integration-spec)\\.ts$',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  testEnvironment: 'node',
  globalSetup: '<rootDir>/test/global-setup.ts',
  setupFilesAfterEnv: ['<rootDir>/test/setup-after-env.ts'],
  moduleNameMapper: {
    '^@docs-flow/types$': '<rootDir>/../../packages/types/src/index.ts',
  },
  collectCoverageFrom: [
    '<rootDir>/src/**/*.service.ts',
    '<rootDir>/src/**/*.util.ts',
    '<rootDir>/src/health/health.controller.ts',
    '<rootDir>/src/app.factory.ts',
    '!<rootDir>/src/uploads/clamav.client.ts',
    '!<rootDir>/src/uploads/virus-scan.service.ts',
    '!<rootDir>/test/**',
  ],
  coverageThreshold: {
    global: {
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageDirectory: '<rootDir>/../../coverage/api',
};
