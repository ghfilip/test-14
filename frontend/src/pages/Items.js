import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useData } from '../state/DataContext';
import { Link } from 'react-router-dom';
import { FixedSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

function Items() {
  const { items, loading, pagination, fetchItems } = useData();

  // Search + debounce
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  // UI state
  const [sortKey, setSortKey] = useState('name-asc');
  const [compact, setCompact] = useState(true);
  const [selected, setSelected] = useState(() => new Set());
  const [pageInput, setPageInput] = useState('');

  const currency = useMemo(
    () => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }),
    []
  );

  // Debounce the search term to reduce requests
  useEffect(() => {
    const t = setTimeout(() => setDebouncedTerm(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const handleSearch = (e) => setSearchTerm(e.target.value);
  const clearSearch = () => setSearchTerm('');

  // Load items helper (keeps abort on unmount)
  const loadItems = useCallback(
    (page, q, sort = 'name-asc') => {
      const controller = new AbortController();
      const [sortKey, sortOrder] = sort.split('-');
      fetchItems({ page, q, sortKey, sortOrder, signal: controller.signal });
      return () => controller.abort();
    },
    [fetchItems]
  );

  // Initial + search-triggered fetch
  useEffect(() => {
    return loadItems(1, debouncedTerm, sortKey);
  }, [loadItems, debouncedTerm, sortKey]);

  const sortedItems = items;

  // Selection
  const toggleSelect = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const clearSelection = () => setSelected(new Set());

  const itemSize = compact ? 44 : 60;

  const Row = ({ index, style, data }) => {
    const item = data.items ? data.items[index] : data[index];
    const isSelected = data.selected ? data.selected.has(item.id) : false;

    return (
      <div
        style={style}
        className={`box-border flex items-center gap-2.5 px-2.5 border-b ${
          isSelected ? 'bg-blue-50' : ''
        } border-gray-200`}
        role="row"
        aria-selected={isSelected}
      >
        {data.toggleSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => data.toggleSelect(item.id)}
            aria-label={'Select ' + item.name}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex justify-between gap-2 min-w-0">
            <Link
              to={'/items/' + item.id}
              className="text-blue-600 hover:underline"
            >
              {item.name}
            </Link>
            {data.currency && (
              <span className="text-gray-600 whitespace-nowrap">
                {data.currency.format(item.price ?? 0)}
              </span>
            )}
          </div>
          {!data.compact && (
            <div className="text-xs text-gray-500 mt-0.5">
              {item.category || 'Uncategorized'}
            </div>
          )}
        </div>
      </div>
    );
  };

  const refresh = () => {
    loadItems(pagination.page || 1, debouncedTerm);
  };

  const goToPage = (e) => {
    e.preventDefault();
    const raw = parseInt(pageInput, 10);
    if (Number.isNaN(raw)) return;
    const total = pagination.totalPages || 1;
    const target = Math.min(Math.max(1, raw), total);
    loadItems(target, debouncedTerm);
  };

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">Items</h1>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div className="flex gap-2">
          <label htmlFor="search" className="sr-only">
            Search items
          </label>
          <input
            id="search"
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={handleSearch}
            aria-label="Search items"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          {searchTerm && (
            <button onClick={clearSearch} aria-label="Clear search" className="px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-sm font-medium text-gray-700">
            Sort:
          </label>
          <select
            id="sort"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            aria-label="Sort items"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="name-asc">Name (A → Z)</option>
            <option value="name-desc">Name (Z → A)</option>
            <option value="price-asc">Price (Low → High)</option>
            <option value="price-desc">Price (High → Low)</option>
          </select>
        </div>

        <div className="flex items-center">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={compact}
              onChange={(e) => setCompact(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Compact view</span>
          </label>
        </div>

        <div>
          <button onClick={refresh} disabled={loading} aria-busy={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
            Refresh
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex flex-wrap gap-4 items-center text-gray-600" aria-live="polite">
        <span>
          Page {pagination.page || 1} of {pagination.totalPages || 1}
        </span>
        <span>Showing {items.length} items</span>
        {selected.size > 0 && (
          <>
            <strong className="font-semibold">{selected.size} selected</strong>
            <button onClick={clearSelection} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">Clear selection</button>
          </>
        )}
      </div>

      {/* List */}
      {loading && (
        <div className="border border-gray-200 rounded-lg overflow-hidden max-w-2xl">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-2.5 border-b border-gray-100" style={{ height: itemSize }}>
              <div className="w-4 h-4 bg-gray-200 rounded-sm" />
              <div className="h-2.5 bg-gray-200 rounded-full flex-1" />
              <div className="h-2.5 bg-gray-200 rounded-full w-20" />
            </div>
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-center">
          <p className="mb-2">No items found.</p>
          {debouncedTerm && (
            <button onClick={clearSearch} aria-label="Clear search to show all items" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              Clear search
            </button>
          )}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ height: 440 }}>
          <AutoSizer>
            {({ height, width }) => (
              <FixedSizeList
                height={height}
                itemCount={sortedItems.length}
                itemSize={itemSize}
                width={width}
                itemData={{ items: sortedItems, selected, toggleSelect, compact, currency }}
              >
                {Row}
              </FixedSizeList>
            )}
          </AutoSizer>
        </div>
      )}

      {/* Pagination controls */}
      <div className="flex gap-2 items-center flex-wrap">
        <button
          onClick={() => loadItems((pagination.page || 1) - 1, debouncedTerm, sortKey)}
          disabled={(pagination.page || 1) <= 1 || loading}
          className="px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-gray-700">
          Page {pagination.page || 1} of {pagination.totalPages || 1}
        </span>
        <button
          onClick={() => loadItems((pagination.page || 1) + 1, debouncedTerm, sortKey)}
          disabled={(pagination.page || 1) >= (pagination.totalPages || 1) || loading}
          className="px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          Next
        </button>

        <form onSubmit={goToPage} className="inline-flex gap-2 items-center ml-auto">
          <label htmlFor="jumpPage" className="text-sm font-medium text-gray-700">Go to page:</label>
          <input
            id="jumpPage"
            type="number"
            min={1}
            max={pagination.totalPages || 1}
            inputMode="numeric"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button type="submit" disabled={loading} className="px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">Go</button>
        </form>
      </div>
    </div>
  );
}

export default Items;
