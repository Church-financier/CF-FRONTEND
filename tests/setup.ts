import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// The guards read the role from the auth store, which hydrates from localStorage.
// jsdom provides it, so tests only need to set the role they want.
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});