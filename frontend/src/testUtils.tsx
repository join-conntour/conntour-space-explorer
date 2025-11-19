import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import apiClient from './api';
import { PAGINATION_LIMIT } from './constants';

// Mock data factories
export const createMockSource = (overrides?: Partial<any>): any => ({
  id: 1,
  name: 'Test Space Image',
  description: 'A test description for a space image',
  launch_date: '2023-01-01',
  image_url: 'https://example.com/image.jpg',
  thumb_url: 'https://example.com/thumb.jpg',
  medium_url: 'https://example.com/medium.jpg',
  original_url: 'https://example.com/original.jpg',
  medium_width: 800,
  medium_height: 600,
  type: 'image',
  status: 'active',
  confidence: 0.85,
  keywords: ['space', 'test', 'nasa'],
  ...overrides,
});

export const createMockSearchResponse = (overrides?: Partial<any>): any => ({
  results: [createMockSource()],
  search_id: 'test-search-id-123',
  total: 1,
  page: 1,
  limit: PAGINATION_LIMIT,
  total_pages: 1,
  ...overrides,
});

export const createMockSourcesResponse = (overrides?: Partial<any>): any => ({
  results: [createMockSource()],
  total: 1,
  page: 1,
  limit: PAGINATION_LIMIT,
  total_pages: 1,
  ...overrides,
});

export const createMockSearchHistoryItem = (overrides?: Partial<any>): any => ({
  id: 'history-id-123',
  query: 'test query',
  timestamp: new Date().toISOString(),
  result_count: 5,
  ...overrides,
});

export const createMockSearchHistoryResponse = (overrides?: Partial<any>): any => ({
  items: [createMockSearchHistoryItem()],
  total: 1,
  page: 1,
  limit: PAGINATION_LIMIT,
  total_pages: 1,
  ...overrides,
});

export const createMockSearchHistoryDetailResponse = (overrides?: Partial<any>): any => ({
  id: 'history-id-123',
  query: 'test query',
  timestamp: new Date().toISOString(),
  results: [createMockSource()],
  total: 1,
  page: 1,
  limit: PAGINATION_LIMIT,
  total_pages: 1,
  ...overrides,
});

// Helper to mock API responses
export const mockApiGet = (response: any) => {
  (apiClient.get as jest.Mock).mockResolvedValue({ data: response });
};

export const mockApiGetReject = (error: any) => {
  (apiClient.get as jest.Mock).mockRejectedValue(error);
};

export const mockApiDelete = (response: any = {}) => {
  (apiClient.delete as jest.Mock).mockResolvedValue({ data: response });
};

// Custom render function that includes providers if needed
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

