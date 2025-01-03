/// <reference types="jest" />
import '@testing-library/jest-dom';
require('fake-indexeddb/auto');

// Mock URL
(global as any).URL = {
    createObjectURL: jest.fn(),
    revokeObjectURL: jest.fn()
};

// Mock Blob
(global as any).Blob = jest.fn().mockImplementation((content = [], options = {}) => ({
    size: Array.isArray(content) ? content.reduce((acc, curr) => acc + (curr.length || 0), 0) : 0,
    type: options.type || '',
    slice: jest.fn(),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    text: () => Promise.resolve(''),
    stream: () => new ReadableStream()
}));

// Mock FileReader
(global as any).FileReader = jest.fn().mockImplementation(() => ({
    EMPTY: 0,
    LOADING: 1,
    DONE: 2,
    error: null,
    readyState: 0,
    result: null,
    onabort: null,
    onerror: null,
    onload: null,
    onloadend: null,
    onloadstart: null,
    onprogress: null,
    readAsArrayBuffer: jest.fn(),
    abort: jest.fn()
})); 

describe('Test Setup', () => {
    it('should setup test environment', () => {
        expect(true).toBe(true);
    });
}); 