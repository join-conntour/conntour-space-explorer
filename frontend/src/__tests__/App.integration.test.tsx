import React from 'react';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  render,
  mockApiGet,
  createMockSource,
  createMockSourcesResponse,
  createMockSearchResponse,
  createMockSearchHistoryItem,
  createMockSearchHistoryResponse,
  createMockSearchHistoryDetailResponse,
} from '../testUtils';
import apiClient from '../api';

// Mock the API client
jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock MUI DatePicker to render as a simple input for easier testing
jest.mock('@mui/x-date-pickers/DatePicker', () => {
  const React = require('react');
  const dayjs = require('dayjs');
  
  const MockDatePicker = ({ value, onChange, label, ...props }: any) => {
    const handleChange = (e: any) => {
      const inputValue = e.target.value;
      if (inputValue && inputValue.trim() !== '') {
        // Parse with explicit format to ensure correct parsing
        const parsed = dayjs(inputValue, 'YYYY-MM-DD', true);
        if (parsed.isValid()) {
          // Call onChange synchronously to ensure state updates immediately
          onChange(parsed);
        }
      } else {
        onChange(null);
      }
    };
    
    const displayValue = value && typeof value.format === 'function' ? value.format('YYYY-MM-DD') : '';
    
    return React.createElement('div', null,
      React.createElement('label', { htmlFor: `datepicker-${label}` }, label),
      React.createElement('input', {
        id: `datepicker-${label}`,
        type: 'text',
        value: displayValue,
        onChange: handleChange,
        placeholder: label,
        'data-testid': `datepicker-${label.toLowerCase().replace(' ', '-')}`,
      })
    );
  };
  
  return {
    DatePicker: MockDatePicker,
  };
});

// Mock LocalizationProvider to just pass through children
jest.mock('@mui/x-date-pickers/LocalizationProvider', () => {
  const React = require('react');
  
  const MockLocalizationProvider = ({ children }: any) => {
    return React.createElement(React.Fragment, null, children);
  };
  
  return {
    LocalizationProvider: MockLocalizationProvider,
  };
});

import App from '../App';

describe('App Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window.scrollTo as jest.Mock).mockClear();
  });

  describe('Browse Flow', () => {
    it('should display sources in browse mode by default', async () => {
      const mockSources = [
        createMockSource({ id: 1, name: 'Mars Rover' }),
        createMockSource({ id: 2, name: 'Saturn Rings' }),
      ];
      mockApiGet(createMockSourcesResponse({ results: mockSources, total: 2 }));

      render(<App />);

      // Wait for sources to load
      await waitFor(() => {
        expect(screen.getByText('Mars Rover')).toBeInTheDocument();
      });

      expect(screen.getByText('Saturn Rings')).toBeInTheDocument();
      expect(screen.getByText('Browse')).toHaveClass(/bg-gradient-to-r/);
    });

    it('should navigate to detail view when clicking on a source', async () => {
      const mockSource = createMockSource({ id: 1, name: 'Mars Rover' });
      mockApiGet(createMockSourcesResponse({ results: [mockSource] }));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Mars Rover')).toBeInTheDocument();
      });

      const viewDetailsButton = screen.getByRole('button', { name: /view details/i });
      await userEvent.click(viewDetailsButton);

      await waitFor(() => {
        expect(screen.getByText('Mars Rover')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      });
    });

    it('should handle pagination in browse mode', async () => {
      const page1Sources = [createMockSource({ id: 1, name: 'Source 1' })];
      const page2Sources = [createMockSource({ id: 2, name: 'Source 2' })];

      mockApiGet(createMockSourcesResponse({
        results: page1Sources,
        total: 2,
        page: 1,
        total_pages: 2,
      }));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Source 1')).toBeInTheDocument();
      });

      // Mock page 2 response
      mockApiGet(createMockSourcesResponse({
        results: page2Sources,
        total: 2,
        page: 2,
        total_pages: 2,
      }));

      const nextButtons = screen.getAllByRole('button', { name: /next/i });
      await userEvent.click(nextButtons[0]); // Click the first Next button (top pagination)

      await waitFor(() => {
        expect(screen.getByText('Source 2')).toBeInTheDocument();
      });
    });
  });

  describe('Search Flow', () => {
    it('should perform search and display results', async () => {
      const user = userEvent.setup();
      const mockSearchResults = [
        createMockSource({ id: 1, name: 'Search Result 1', confidence: 0.9 }),
        createMockSource({ id: 2, name: 'Search Result 2', confidence: 0.8 }),
      ];

      // Mock browse sources (initial load)
      mockApiGet(createMockSourcesResponse({ results: [] }));

      render(<App />);

      // Mock search response
      mockApiGet(createMockSearchResponse({
        results: mockSearchResults,
        total: 2,
        search_id: 'search-123',
      }));

      const searchInput = screen.getByPlaceholderText(/search nasa images/i);
      const searchButton = screen.getByRole('button', { name: /search/i });

      await user.type(searchInput, 'mars');
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('Search Result 1')).toBeInTheDocument();
      });

      expect(screen.getByText('Search Result 2')).toBeInTheDocument();
      expect(screen.getByText(/found 2 result/i)).toBeInTheDocument();
      expect(screen.getByText('Search Results')).toBeInTheDocument();
    });

    it('should show error message when search fails', async () => {
      const user = userEvent.setup();
      
      mockApiGet(createMockSourcesResponse({ results: [] }));
      
      render(<App />);

      const searchInput = screen.getByPlaceholderText(/search nasa images/i);
      const searchButton = screen.getByRole('button', { name: /search/i });

      await user.type(searchInput, 'mars');
      
      // Mock the search API call to fail
      (apiClient.get as jest.Mock).mockRejectedValueOnce({
        response: { data: { detail: 'Search failed' } },
      });
      
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('Search failed')).toBeInTheDocument();
      });
    });

    it('should handle search pagination', async () => {
      const user = userEvent.setup();
      const page1Results = [createMockSource({ id: 1, name: 'Result 1' })];
      const page2Results = [createMockSource({ id: 2, name: 'Result 2' })];

      mockApiGet(createMockSourcesResponse({ results: [] }));
      mockApiGet(createMockSearchResponse({
        results: page1Results,
        total: 2,
        page: 1,
        total_pages: 2,
        search_id: 'search-123',
      }));

      render(<App />);

      const searchInput = screen.getByPlaceholderText(/search nasa images/i);
      const searchButton = screen.getByRole('button', { name: /search/i });

      await user.type(searchInput, 'mars');
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('Result 1')).toBeInTheDocument();
      });

      // Mock page 2 response
      mockApiGet(createMockSearchResponse({
        results: page2Results,
        total: 2,
        page: 2,
        total_pages: 2,
        search_id: 'search-123',
      }));

      const nextButtons = screen.getAllByRole('button', { name: /next/i });
      await user.click(nextButtons[0]); // Click the first Next button (top pagination)

      await waitFor(() => {
        expect(screen.getByText('Result 2')).toBeInTheDocument();
      });
    });

    it('should clear search input when clear button is clicked', async () => {
      const user = userEvent.setup();
      
      mockApiGet(createMockSourcesResponse({ results: [] }));

      render(<App />);

      const searchInput = screen.getByPlaceholderText(/search nasa images/i) as HTMLInputElement;
      await user.type(searchInput, 'mars');

      expect(searchInput.value).toBe('mars');

      // Find the clear button by its SVG icon (X button)
      const clearButton = searchInput.parentElement?.querySelector('button[type="button"]');
      expect(clearButton).toBeInTheDocument();
      if (clearButton) {
        await user.click(clearButton);
      }

      expect(searchInput.value).toBe('');
    });
  });

  describe('History Flow', () => {
    it('should display search history when History tab is clicked', async () => {
      const user = userEvent.setup();
      const mockHistory = [
        createMockSearchHistoryItem({ id: 'hist-1', query: 'mars rover' }),
        createMockSearchHistoryItem({ id: 'hist-2', query: 'saturn' }),
      ];

      // Set up mocks: first call for initial browse, second for history
      (apiClient.get as jest.Mock)
        .mockResolvedValueOnce({ data: createMockSourcesResponse({ results: [] }) })
        .mockResolvedValueOnce({ data: createMockSearchHistoryResponse({ items: mockHistory })});

      render(<App />);

      const historyTab = screen.getByRole('button', { name: /history/i });
      await user.click(historyTab);

      await waitFor(() => {
        expect(screen.getByText('mars rover')).toBeInTheDocument();
        expect(screen.getByText('saturn')).toBeInTheDocument();
      });
    });

    it('should load search results when clicking on a history item', async () => {
      const user = userEvent.setup();
      const mockHistoryItem = createMockSearchHistoryItem({
        id: 'hist-1',
        query: 'mars rover',
      });
      const mockHistoryResults = [
        createMockSource({ id: 1, name: 'Mars Rover Image' }),
      ];

      // Set up mocks: first call for initial browse, second for history list
      (apiClient.get as jest.Mock)
        .mockResolvedValueOnce({ data: createMockSourcesResponse({ results: [] }) })
        .mockResolvedValueOnce({ data: createMockSearchHistoryResponse({ items: [mockHistoryItem] })});

      render(<App />);

      const historyTab = screen.getByRole('button', { name: /history/i });
      await user.click(historyTab);

      await waitFor(() => {
        expect(screen.getByText('mars rover')).toBeInTheDocument();
      });

      // Mock the history detail API call
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: createMockSearchHistoryDetailResponse({
        id: 'hist-1',
        query: 'mars rover',
        results: mockHistoryResults,
      })});

      // Click on the history item (the div that contains the query text)
      const historyItemText = screen.getByText('mars rover');
      const historyItem = historyItemText.closest('div');
      expect(historyItem).toBeInTheDocument();
      if (historyItem) {
        await user.click(historyItem);
      }

      await waitFor(() => {
        expect(screen.getByText('Mars Rover Image')).toBeInTheDocument();
      });
    });

    it('should handle history pagination', async () => {
      const user = userEvent.setup();
      const page1History = [createMockSearchHistoryItem({ id: 'hist-1', query: 'query 1' })];
      const page2History = [createMockSearchHistoryItem({ id: 'hist-2', query: 'query 2' })];

      // Set up mocks: first call for initial browse, second for history
      (apiClient.get as jest.Mock)
        .mockResolvedValueOnce({ data: createMockSourcesResponse({ results: [] }) })
        .mockResolvedValueOnce({ data: createMockSearchHistoryResponse({
          items: page1History,
          total: 2,
          page: 1,
          total_pages: 2,
        })});

      render(<App />);

      const historyTab = screen.getByRole('button', { name: /history/i });
      await user.click(historyTab);

      await waitFor(() => {
        expect(screen.getByText('query 1')).toBeInTheDocument();
      });

      // Mock page 2 response
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: createMockSearchHistoryResponse({
        items: page2History,
        total: 2,
        page: 2,
        total_pages: 2,
      })});

      const nextButtons = screen.getAllByRole('button', { name: /next/i });
      await user.click(nextButtons[0]); // Click the first Next button (top pagination)

      await waitFor(() => {
        expect(screen.getByText('query 2')).toBeInTheDocument();
      });
    });
  });

  describe('Detail View Flow', () => {
    it('should display image detail when source is clicked', async () => {
      const mockSource = createMockSource({
        id: 1,
        name: 'Mars Rover',
        description: 'A detailed description of the Mars rover',
        keywords: ['mars', 'rover', 'nasa'],
      });

      mockApiGet(createMockSourcesResponse({ results: [mockSource] }));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Mars Rover')).toBeInTheDocument();
      });

      const viewDetailsButton = screen.getByRole('button', { name: /view details/i });
      await userEvent.click(viewDetailsButton);

      await waitFor(() => {
        expect(screen.getByText('Mars Rover')).toBeInTheDocument();
        expect(screen.getByText('A detailed description of the Mars rover')).toBeInTheDocument();
        expect(screen.getByText('mars')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      });
    });

    it('should navigate back from detail view to previous view', async () => {
      const user = userEvent.setup();
      const mockSource = createMockSource({ id: 1, name: 'Mars Rover' });

      mockApiGet(createMockSourcesResponse({ results: [mockSource] }));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Mars Rover')).toBeInTheDocument();
      });

      const viewDetailsButton = screen.getByRole('button', { name: /view details/i });
      await user.click(viewDetailsButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);

      await waitFor(() => {
        expect(screen.getByText('Browse')).toHaveClass(/bg-gradient-to-r/);
      });
    });

    it('should open full image in new tab when View Full Image is clicked', async () => {
      const user = userEvent.setup();
      const mockSource = createMockSource({
        id: 1,
        name: 'Mars Rover',
        original_url: 'https://example.com/full-image.jpg',
      });

      mockApiGet(createMockSourcesResponse({ results: [mockSource] }));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Mars Rover')).toBeInTheDocument();
      });

      const viewDetailsButton = screen.getByRole('button', { name: /view details/i });
      await user.click(viewDetailsButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /view full image/i })).toBeInTheDocument();
      });

      const viewFullImageButton = screen.getByRole('button', { name: /view full image/i });
      await user.click(viewFullImageButton);

      expect(window.open).toHaveBeenCalledWith(
        'https://example.com/full-image.jpg',
        '_blank',
        'noopener,noreferrer'
      );
    });
  });

  describe('Navigation Between Modes', () => {
    it('should switch between Browse and History tabs', async () => {
      const user = userEvent.setup();
      const mockSources = [createMockSource({ id: 1, name: 'Source 1' })];
      const mockHistory = [createMockSearchHistoryItem({ id: 'hist-1', query: 'test' })];

      // Set up mocks: first call for initial browse
      (apiClient.get as jest.Mock)
        .mockResolvedValueOnce({ data: createMockSourcesResponse({ results: mockSources })});

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Source 1')).toBeInTheDocument();
      });

      expect(screen.getByText('Browse')).toHaveClass(/bg-gradient-to-r/);

      // Mock history API call
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: createMockSearchHistoryResponse({ items: mockHistory })});

      const historyTab = screen.getByRole('button', { name: /history/i });
      await user.click(historyTab);

      await waitFor(() => {
        expect(screen.getByText('test')).toBeInTheDocument();
      });

      expect(screen.getByText('History')).toHaveClass(/bg-gradient-to-r/);

      // Mock sources API call again when switching back to Browse
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: createMockSourcesResponse({ results: mockSources })});

      const browseTab = screen.getByRole('button', { name: /browse/i });
      await user.click(browseTab);

      await waitFor(() => {
        expect(screen.getByText('Source 1')).toBeInTheDocument();
      });

      expect(screen.getByText('Browse')).toHaveClass(/bg-gradient-to-r/);
    });

    it('should show Search Results tab after performing a search', async () => {
      const user = userEvent.setup();
      const mockSearchResults = [createMockSource({ id: 1, name: 'Search Result' })];

      mockApiGet(createMockSourcesResponse({ results: [] }));
      mockApiGet(createMockSearchResponse({
        results: mockSearchResults,
        search_id: 'search-123',
      }));

      render(<App />);

      const searchInput = screen.getByPlaceholderText(/search nasa images/i);
      const searchButton = screen.getByRole('button', { name: /search/i });

      await user.type(searchInput, 'mars');
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('Search Results')).toBeInTheDocument();
      });

      const searchResultsTab = screen.getByRole('button', { name: /search results/i });
      expect(searchResultsTab).toBeInTheDocument();
    });

    it('should clear search results when switching to Browse tab', async () => {
      const user = userEvent.setup();
      const mockSearchResults = [createMockSource({ id: 1, name: 'Search Result' })];
      const mockSources = [createMockSource({ id: 2, name: 'Browse Source' })];

      mockApiGet(createMockSourcesResponse({ results: [] }));
      mockApiGet(createMockSearchResponse({
        results: mockSearchResults,
        search_id: 'search-123',
      }));

      render(<App />);

      const searchInput = screen.getByPlaceholderText(/search nasa images/i);
      const searchButton = screen.getByRole('button', { name: /search/i });

      await user.type(searchInput, 'mars');
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('Search Result')).toBeInTheDocument();
      });

      // Mock browse sources response
      mockApiGet(createMockSourcesResponse({ results: mockSources }));

      const browseTab = screen.getByRole('button', { name: /browse/i });
      await user.click(browseTab);

      await waitFor(() => {
        expect(screen.queryByText('Search Result')).not.toBeInTheDocument();
        expect(screen.queryByText('Search Results')).not.toBeInTheDocument();
      });
    });
  });

  describe('End-to-End User Flow', () => {
    it('should complete a full user journey: browse -> search -> view detail -> back -> history', async () => {
      const user = userEvent.setup();
      const mockBrowseSource = createMockSource({ id: 1, name: 'Browse Image' });
      const mockSearchResults = [createMockSource({ id: 2, name: 'Search Image' })];
      const mockHistory = [createMockSearchHistoryItem({ id: 'hist-1', query: 'mars' })];

      // Initial browse
      mockApiGet(createMockSourcesResponse({ results: [mockBrowseSource] }));
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Browse Image')).toBeInTheDocument();
      });

      // Perform search
      mockApiGet(createMockSearchResponse({
        results: mockSearchResults,
        search_id: 'search-123',
      }));

      const searchInput = screen.getByPlaceholderText(/search nasa images/i);
      const searchButton = screen.getByRole('button', { name: /search/i });

      await user.type(searchInput, 'mars');
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('Search Image')).toBeInTheDocument();
      });

      // View detail
      const viewDetailsButton = screen.getByRole('button', { name: /view details/i });
      await user.click(viewDetailsButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      });

      // Go back
      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);

      await waitFor(() => {
        expect(screen.getByText('Search Image')).toBeInTheDocument();
      });

      // View history
      mockApiGet(createMockSearchHistoryResponse({ items: mockHistory }));
      const historyTab = screen.getByRole('button', { name: /history/i });
      await user.click(historyTab);

      await waitFor(() => {
        expect(screen.getByText('mars')).toBeInTheDocument();
      });
    });
  });

  describe('Date Filters', () => {

    it('should display date filter inputs', async () => {
      mockApiGet(createMockSourcesResponse({ results: [] }));
      render(<App />);

      await waitFor(() => {
        expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
      });
    });

    it('should not show clear filters button when no dates are selected', async () => {
      mockApiGet(createMockSourcesResponse({ results: [] }));
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
      });
    });

    it('should show clear filters button when dates are selected', async () => {
      const user = userEvent.setup();
      mockApiGet(createMockSourcesResponse({ results: [] }));
      render(<App />);

      await waitFor(() => {
        expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      });

      const startDateInput = screen.getByTestId('datepicker-start-date') as HTMLInputElement;
      fireEvent.change(startDateInput, { target: { value: '2023-01-01' } });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
      });
    });

    it('should pass date filters to browse API call', async () => {
      const user = userEvent.setup();
      const mockSources = [createMockSource({ id: 1, name: 'Filtered Source' })];
      
      // Initial load without filters
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ 
        data: createMockSourcesResponse({ results: [] }) 
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      });

      // Set date filters
      const startDateInput = screen.getByTestId('datepicker-start-date') as HTMLInputElement;
      const endDateInput = screen.getByTestId('datepicker-end-date') as HTMLInputElement;
      
      fireEvent.change(startDateInput, { target: { value: '2023-01-01' } });
      
      // Mock the API call triggered by start date change
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ 
        data: createMockSourcesResponse({ results: [] }) 
      });
      
      await waitFor(() => {
        const apiCalls = (apiClient.get as jest.Mock).mock.calls;
        const sourcesCall = apiCalls.find((call: any[]) => 
          call[0] === '/api/sources' && call[1]?.params?.start_date === '2023-01-01'
        );
        expect(sourcesCall).toBeDefined();
      });
      
      fireEvent.change(endDateInput, { target: { value: '2023-12-31' } });
      
      // Mock the API call triggered by end date change
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ 
        data: createMockSourcesResponse({ results: mockSources }) 
      });

      await waitFor(() => {
        const apiCalls = (apiClient.get as jest.Mock).mock.calls;
        const sourcesCall = apiCalls.find((call: any[]) => 
          call[0] === '/api/sources' && call[1]?.params?.start_date === '2023-01-01' && call[1]?.params?.end_date === '2023-12-31'
        );
        expect(sourcesCall).toBeDefined();
        if (sourcesCall) {
          expect(sourcesCall[1]?.params).toMatchObject({
            start_date: '2023-01-01',
            end_date: '2023-12-31',
          });
        }
      });
    });

    it('should pass date filters to search API call', async () => {
      const user = userEvent.setup();
      const mockSearchResults = [createMockSource({ id: 1, name: 'Search Result' })];

      // Initial browse load
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ 
        data: createMockSourcesResponse({ results: [] }) 
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      });

      // Set date filters
      const startDateInput = screen.getByTestId('datepicker-start-date') as HTMLInputElement;
      const endDateInput = screen.getByTestId('datepicker-end-date') as HTMLInputElement;
      
      fireEvent.change(startDateInput, { target: { value: '2023-06-01' } });
      
      // Mock API call triggered by start date change
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ 
        data: createMockSourcesResponse({ results: [] }) 
      });
      
      await waitFor(() => {
        expect((apiClient.get as jest.Mock).mock.calls.length).toBeGreaterThan(1);
      });
      
      fireEvent.change(endDateInput, { target: { value: '2023-06-30' } });
      
      // Mock API call triggered by end date change
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ 
        data: createMockSourcesResponse({ results: [] }) 
      });

      // Perform search
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ 
        data: createMockSearchResponse({
          results: mockSearchResults,
          search_id: 'search-123',
        })
      });

      const searchInput = screen.getByPlaceholderText(/search nasa images/i);
      const searchButton = screen.getByRole('button', { name: /search/i });

      await user.type(searchInput, 'mars');
      await user.click(searchButton);

      await waitFor(() => {
        const apiCalls = (apiClient.get as jest.Mock).mock.calls;
        const searchCall = apiCalls.find((call: any[]) => 
          call[0] === '/api/search' && call[1]?.params?.q === 'mars'
        );
        expect(searchCall).toBeDefined();
        if (searchCall) {
          expect(searchCall[1]?.params).toMatchObject({
            q: 'mars',
            start_date: '2023-06-01',
            end_date: '2023-06-30',
          });
        }
      });
    });

    it('should clear date filters when clear button is clicked', async () => {
      const user = userEvent.setup();
      mockApiGet(createMockSourcesResponse({ results: [] }));
      render(<App />);

      await waitFor(() => {
        expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      });

      // Set date filters
      const startDateInput = screen.getByTestId('datepicker-start-date') as HTMLInputElement;
      const endDateInput = screen.getByTestId('datepicker-end-date') as HTMLInputElement;
      
      fireEvent.change(startDateInput, { target: { value: '2023-01-01' } });
      fireEvent.change(endDateInput, { target: { value: '2023-12-31' } });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
      });

      // Mock API call after clearing filters
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ 
        data: createMockSourcesResponse({ results: [] }) 
      });

      const clearButton = screen.getByRole('button', { name: /clear filters/i });
      await user.click(clearButton);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
        expect(startDateInput).toHaveValue('');
        expect(endDateInput).toHaveValue('');
      });
    });

    it('should reset to page 1 when date filters change', async () => {
      const user = userEvent.setup();
      const page1Sources = [createMockSource({ id: 1, name: 'Source 1' })];
      const page2Sources = [createMockSource({ id: 2, name: 'Source 2' })];

      // Initial load - page 1
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ 
        data: createMockSourcesResponse({
          results: page1Sources,
          total: 2,
          page: 1,
          total_pages: 2,
        })
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Source 1')).toBeInTheDocument();
      });

      // Navigate to page 2
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ 
        data: createMockSourcesResponse({
          results: page2Sources,
          total: 2,
          page: 2,
          total_pages: 2,
        })
      });

      const nextButtons = screen.getAllByRole('button', { name: /next/i });
      await user.click(nextButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Source 2')).toBeInTheDocument();
      });

      // Change date filter - should reset to page 1
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ 
        data: createMockSourcesResponse({
          results: page1Sources,
          total: 2,
          page: 1,
          total_pages: 2,
        })
      });

      const startDateInput = screen.getByTestId('datepicker-start-date') as HTMLInputElement;
      
      // Mock API call triggered by date filter change
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ 
        data: createMockSourcesResponse({
          results: page1Sources,
          total: 2,
          page: 1,
          total_pages: 2,
        })
      });
      
      fireEvent.change(startDateInput, { target: { value: '2023-01-01' } });

      await waitFor(() => {
        const apiCalls = (apiClient.get as jest.Mock).mock.calls;
        const lastSourcesCall = apiCalls
          .filter((call: any[]) => call[0] === '/api/sources' && call[1]?.params?.start_date === '2023-01-01')
          .pop();
        expect(lastSourcesCall).toBeDefined();
        if (lastSourcesCall) {
          expect(lastSourcesCall[1]?.params.page).toBe(1);
        }
      });
    });

    it('should show appropriate message when no history found with date filters', async () => {
      const user = userEvent.setup();

      // Initial browse load
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ 
        data: createMockSourcesResponse({ results: [] }) 
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      });

      // Set date filters
      const startDateInput = screen.getByTestId('datepicker-start-date') as HTMLInputElement;
      const endDateInput = screen.getByTestId('datepicker-end-date') as HTMLInputElement;
      
      fireEvent.change(startDateInput, { target: { value: '2023-01-01' } });
      
      // Mock API call triggered by start date change
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ 
        data: createMockSourcesResponse({ results: [] }) 
      });
      
      await waitFor(() => {
        expect((apiClient.get as jest.Mock).mock.calls.length).toBeGreaterThan(1);
      });
      
      fireEvent.change(endDateInput, { target: { value: '2023-01-31' } });
      
      // Mock API call triggered by end date change
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ 
        data: createMockSourcesResponse({ results: [] }) 
      });
      
      await waitFor(() => {
        expect((apiClient.get as jest.Mock).mock.calls.length).toBeGreaterThan(2);
      });

      const historyTab = screen.getByRole('button', { name: /history/i });
      
      // Switch to history tab with no results - mock the history API call
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ 
        data: createMockSearchHistoryResponse({ items: [], total: 0 })
      });
      
      await user.click(historyTab);

      await waitFor(() => {
        expect(screen.getByText(/no search history found for the selected date range/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});

