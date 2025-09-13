module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Coverage settings
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/config/*.js',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.js',
    '<rootDir>/src/**/*.test.js',
    '<rootDir>/tests/**/*.test.js',
  ],
  
  // Setup files
  setupFilesAfterEnv: [],
  
  // Module paths
  moduleDirectories: ['node_modules', 'src'],
  
  // Transform files
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  
  // Test timeout
  testTimeout: 10000,
  
  // Verbose output
  verbose: true,
  
  // Exit on first failure (for CI)
  bail: 1,
};