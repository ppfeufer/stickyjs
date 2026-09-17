import {defineConfig} from 'jest';

export default defineConfig({
    collectCoverage: true,
    coverageReporters: [
        'cobertura',
        'html',
        'text'
    ],
    verbose: true,
    // ignore pre-minified test files to avoid running duplicate/compiled suites
    testPathIgnorePatterns: ['\\.min\\.js$'],
});
