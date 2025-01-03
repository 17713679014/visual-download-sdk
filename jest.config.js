module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/src', '<rootDir>/__tests__'],
    testMatch: [
        '**/__tests__/**/*.+(ts|tsx|js)',
        '**/?(*.)+(spec|test).+(ts|tsx|js)'
    ],
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: 'tsconfig.json'
        }]
    },
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
    },
    setupFiles: [
        '<rootDir>/__tests__/setup.xhr.ts'
    ],
    setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
    testTimeout: 30000,
    maxWorkers: 1,
    testPathIgnorePatterns: [
        '/node_modules/',
        '/__tests__/setup.ts'
    ],
    globals: {
        'ts-jest': {
            tsconfig: 'tsconfig.json',
            diagnostics: {
                ignoreCodes: ['TS6133']
            }
        }
    },
    verbose: true,
    testEnvironmentOptions: {
        url: 'http://localhost'
    }
};