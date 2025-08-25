// Jest setup file
require('@testing-library/jest-dom');

// Polyfill for TransformStream (needed for AI SDK)
if (typeof globalThis.TransformStream === 'undefined') {
  const { TransformStream } = require('stream/web');
  globalThis.TransformStream = TransformStream;
}

// Polyfill for ReadableStream (needed for testing)
if (typeof globalThis.ReadableStream === 'undefined') {
  const { ReadableStream } = require('stream/web');
  globalThis.ReadableStream = ReadableStream;
}

// Polyfill for TextEncoder/TextDecoder (needed for testing)
if (typeof globalThis.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}

// Polyfill for Response (needed for testing)
if (typeof globalThis.Response === 'undefined') {
  // Create a simple mock Response class for testing
  globalThis.Response = class MockResponse {
    constructor(body, init = {}) {
      this.body = body;
      this.ok = init.status ? init.status >= 200 && init.status < 300 : true;
      this.status = init.status || 200;
    }
    
    // Add getReader method for streaming support
    getReader() {
      if (this.body && typeof this.body.getReader === 'function') {
        return this.body.getReader();
      }
      return new globalThis.ReadableStreamDefaultReader(this.body);
    }
  };
  
  // Mock ReadableStreamDefaultReader for testing
  if (typeof globalThis.ReadableStreamDefaultReader === 'undefined') {
    globalThis.ReadableStreamDefaultReader = class MockReadableStreamDefaultReader {
      constructor(stream) {
        this.stream = stream;
      }
      
      async read() {
        // Simulate reading from the stream
        return { value: undefined, done: true };
      }
    };
  }
  
  // Add getReader method to ReadableStream prototype
  if (globalThis.ReadableStream && !globalThis.ReadableStream.prototype.getReader) {
    globalThis.ReadableStream.prototype.getReader = function() {
      return new globalThis.ReadableStreamDefaultReader(this);
    };
  }
}

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Suppress console errors in tests unless explicitly needed
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
}); 