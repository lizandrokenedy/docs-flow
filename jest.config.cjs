/** @type {import('jest').Config} */
module.exports = {
  projects: ['<rootDir>/apps/api/jest.config.cjs', '<rootDir>/packages/types/jest.config.cjs'],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
