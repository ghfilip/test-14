import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useData } from '../state/DataContext';
import { Link } from 'react-router-dom';
import { FixedSizeList } from 'react-window';

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
    (page, q) => {
      const controller = new AbortController();
      fetchItems({ page, q, signal: controller.signal });
      return () => controller.abort();
    },
    [fetchItems]
  );

  // Initial + search-triggered fetch
  useEffect(() => {
    return loadItems(1, debouncedTerm);
  }, [loadItems, debouncedTerm]);

  // Sorting for current page items
  const sortedItems = useMemo(() => {
    const list = items.slice();
    switch (sortKey) {
      case 'name-asc':
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return list.sort((a, b) => b.name.localeCompare(a.name));
      case 'price-asc':
        return list.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
      case 'price-desc':
        return list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
      default:
        return list;
    }
  }, [items, sortKey]);

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
        style={{
          ...style,
          boxSizing: 'border-box', // prevents padding from causing horizontal overflow
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 10px',
          background: isSelected ? '#f0f6ff' : 'transparent',
          borderBottom: '1px solid #eee',
        }}
        role="row"
        aria-selected={isSelected}
      >
        {data.toggleSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => data.toggleSelect(item.id)}
            aria-label={'Select ' + item.name}
          />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, minWidth: 0 }}>
            <Link to={'/items/' + item.id} style={{ textDecoration: 'none', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.name}
            </Link>
            {data.currency && (
              <span style={{ color: '#444', whiteSpace: 'nowrap' }}>
              {data.currency.format(item.price ?? 0)}
            </span>
            )}
          </div>
          {!data.compact && (
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
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
    <div style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0 }}>Items</h2>

      {/* Controls */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto auto',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <label htmlFor="search" className="visually-hidden">
            Search items
          </label>
          <input
            id="search"
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={handleSearch}
            aria-label="Search items"
          />
          {searchTerm && (
            <button onClick={clearSearch} aria-label="Clear search">
              Clear
            </button>
          )}
        </div>

        <div>
          <label htmlFor="sort" style={{ marginRight: 6 }}>
            Sort:
          </label>
          <select
            id="sort"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            aria-label="Sort items"
          >
            <option value="name-asc">Name (A → Z)</option>
            <option value="name-desc">Name (Z → A)</option>
            <option value="price-asc">Price (Low → High)</option>
            <option value="price-desc">Price (High → Low)</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={compact}
              onChange={(e) => setCompact(e.target.checked)}
            />
            Compact view
          </label>
        </div>

        <div>
          <button onClick={refresh} disabled={loading} aria-busy={loading}>
            Refresh
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          color: '#555',
        }}
        aria-live="polite"
      >
        <span>
          Page {pagination.page || 1} of {pagination.totalPages || 1}
        </span>
        <span>Showing {items.length} items</span>
        {selected.size > 0 && (
          <>
            <strong>{selected.size} selected</strong>
            <button onClick={clearSelection}>Clear selection</button>
          </>
        )}
      </div>

      {/* List */}
      {loading && (
        <div>
          <p>Loading…</p>
          <div
            style={{
              border: '1px solid #eee',
              borderRadius: 6,
              overflow: 'hidden',
              maxWidth: 640,
            }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: itemSize,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '0 10px',
                  borderBottom: '1px solid #f3f3f3',
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    background: '#eee',
                    borderRadius: 2,
                  }}
                />
                <div
                  style={{
                    height: 10,
                    background: '#eee',
                    borderRadius: 4,
                    flex: 1,
                  }}
                />
                <div
                  style={{
                    width: 80,
                    height: 10,
                    background: '#eee',
                    borderRadius: 4,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && items.length === 0 && (
        <div
          style={{
            border: '1px solid #eee',
            borderRadius: 6,
            padding: 16,
            background: '#fafafa',
          }}
        >
          <p style={{ margin: 0, marginBottom: 8 }}>No items found.</p>
          {debouncedTerm && (
            <button onClick={clearSearch} aria-label="Clear search to show all items">
              Clear search
            </button>
          )}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div style={{ border: '1px solid #eee', borderRadius: 6, overflow: 'hidden', maxWidth: 540 }}>
          <FixedSizeList
            height={440}
            itemCount={sortedItems.length}
            itemSize={itemSize}
            width={540}
            itemData={{ items: sortedItems, selected, toggleSelect, compact, currency }}
          >
            {Row}
          </FixedSizeList>
        </div>
      )}

      {/* Pagination controls */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => loadItems((pagination.page || 1) - 1, debouncedTerm)}
          disabled={(pagination.page || 1) <= 1 || loading}
        >
          Previous
        </button>
        <span>
          Page {pagination.page || 1} of {pagination.totalPages || 1}
        </span>
        <button
          onClick={() => loadItems((pagination.page || 1) + 1, debouncedTerm)}
          disabled={(pagination.page || 1) >= (pagination.totalPages || 1) || loading}
        >
          Next
        </button>

        <form onSubmit={goToPage} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <label htmlFor="jumpPage">Go to page:</label>
          <input
            id="jumpPage"
            type="number"
            min={1}
            max={pagination.totalPages || 1}
            inputMode="numeric"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            style={{ width: 80 }}
          />
          <button type="submit" disabled={loading}>Go</button>
        </form>
      </div>
    </div>
  );
}

export default Items;
