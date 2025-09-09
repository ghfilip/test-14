import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import App from './App';
import { useData } from '../state/DataContext';
import { BrowserRouter } from 'react-router-dom';

jest.mock('react-window', () => ({
  FixedSizeList: ({ children, itemData, itemCount, itemSize, width }) => (
    <div data-testid="fixed-size-list">
      {Array.from({ length: itemCount }).map((_, index) => (
        <div key={index} style={{ height: itemSize, width }}>
          {children({ index, style: {}, data: itemData })}
        </div>
      ))}
    </div>
  ),
}));

jest.mock('react-virtualized-auto-sizer', () => ({
  __esModule: true,
  default: ({ children }) => children({ height: 440, width: 540 }),
}));

jest.mock('../state/DataContext', () => ({
  ...jest.requireActual('../state/DataContext'),
  useData: jest.fn(),
}));

const mockItems = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  name: `Item ${i + 1}`,
  price: (i + 1) * 10,
  category: `Category ${(i % 3) + 1}`,
}));

const renderApp = () => {
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
};

describe('App', () => {
  let mockFetchItems;

  beforeEach(() => {
    mockFetchItems = jest.fn();
    useData.mockImplementation(() => ({
      items: mockItems.slice(0, 10),
      loading: false,
      pagination: { page: 1, totalPages: 2 },
      fetchItems: mockFetchItems,
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders the app and fetches items', async () => {
    renderApp();
    expect(screen.getByRole('link', { name: /items/i })).toBeInTheDocument();
    await waitFor(() => expect(mockFetchItems).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Item 1')).toBeInTheDocument();
  });

  test('searches for items', async () => {
    renderApp();
    const searchInput = screen.getByLabelText('Search items');
    await userEvent.type(searchInput, 'Item 10');
    await waitFor(() => expect(mockFetchItems).toHaveBeenCalledWith(expect.objectContaining({ q: 'Item 10' })));
  });

  test('sorts items', async () => {
    renderApp();
    await screen.findByText('Item 1');
    const sortSelect = screen.getByLabelText('Sort items');
    await userEvent.selectOptions(sortSelect, 'price-desc');
    await waitFor(() => expect(mockFetchItems).toHaveBeenCalledWith(expect.objectContaining({ sortKey: 'price', sortOrder: 'desc' })));
  });

  test('paginates through items', async () => {
    renderApp();
    await screen.findByText('Item 1');
    const nextButton = screen.getByText('Next');
    await userEvent.click(nextButton);
    await waitFor(() => expect(mockFetchItems).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })));
  });

  test('selects and deselects items', async () => {
    renderApp();
    await screen.findByText('Item 1');
    const checkboxes = await screen.findAllByRole('checkbox');
    const itemCheckbox = checkboxes[1]; // The first checkbox is the compact view toggle
    await userEvent.click(itemCheckbox);
    expect(await screen.findByText('1 selected')).toBeInTheDocument();
    await userEvent.click(itemCheckbox);
    await waitFor(() => expect(screen.queryByText('1 selected')).not.toBeInTheDocument());
  });

  test('toggles compact view', async () => {
    renderApp();
    await screen.findByText('Item 1');
    const compactViewToggle = screen.getByLabelText('Compact view');
    const list = await screen.findByTestId('fixed-size-list');
    const row = list.firstChild;
    expect(row).toHaveStyle('height: 44px');
    await userEvent.click(compactViewToggle);
    expect(row).toHaveStyle('height: 60px');
  });

  test('navigates to item detail page', async () => {
    renderApp();
    await screen.findByText('Item 1');
    const itemLink = screen.getByRole('link', { name: 'Item 1' });

    // Mock the fetch call for the item detail page
    jest.spyOn(window, 'fetch').mockImplementation((url) => {
      const urlStr = url.toString();
      if (urlStr.match(/\/api\/items\/\d+/)) {
        const id = parseInt(urlStr.split('/').pop());
        const item = mockItems.find(item => item.id === id);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(item),
        });
      }
      return Promise.reject(new Error('Unhandled fetch call'));
    });

    await userEvent.click(itemLink);
    expect(await screen.findByText('Category 1')).toBeInTheDocument();
    expect(await screen.findByText('$10')).toBeInTheDocument();
  });
});
