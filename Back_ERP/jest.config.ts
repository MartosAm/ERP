import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@compartido/(.*)$': '<rootDir>/src/compartido/$1',
    '^@middlewares/(.*)$': '<rootDir>/src/middlewares/$1',
    '^@modulos/(.*)$': '<rootDir>/src/modulos/$1',
    '^@tipos/(.*)$': '<rootDir>/src/tipos/$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      diagnostics: false, // Skip TS diagnostics in tests (mocks cause false positives)
    }],
  },
  clearMocks: true,
  collectCoverageFrom: [
    'src/modulos/**/*.service.ts',
    'src/modulos/**/*.schema.ts',
    'src/middlewares/**/*.ts',
    'src/compartido/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
  ],
  coverageDirectory: 'coverage',
};

export default config;
