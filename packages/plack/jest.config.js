module.exports = {
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testMatch: ['<rootDir>/**/*.test.ts'],
  rootDir: 'src',
  testEnvironment: 'node',
};
