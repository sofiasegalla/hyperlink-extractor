module.exports = {
  // Use JSDOM environment for browser-like testing
  testEnvironment: 'jsdom',
  
  // Setup files to run before each test
  setupFilesAfterEnv: ['./jest.setup.js'],
  
  // Pattern for test files
  testMatch: [
    '**/tests/**/*.js',
    '**/*.test.js',
    '**/*.spec.js'
  ],
  
  // Mock file extensions
  moduleFileExtensions: ['js', 'json'],
  
  // Transform files
  transform: {},
  
  // Ignore paths for transformation
  transformIgnorePatterns: ['/node_modules/'],
  
  // Display test output
  verbose: true,
  
  // Set test timeout (optional, in milliseconds)
  testTimeout: 10000,
  
  // Collect coverage (optional)
  collectCoverage: false,
  
  // Generate coverage report for these files
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**',
    '!**/jest.config.js',
    '!**/jest.setup.js'
  ],
  
  // The directory where Jest should output coverage files
  coverageDirectory: 'coverage'
};