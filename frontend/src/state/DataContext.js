import React, { createContext, useCallback, useContext, useState } from 'react';

const DataContext = createContext();

export function DataProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });

  const fetchItems = useCallback(async ({ page = 1, limit = 10, q = '', sortKey, sortOrder, signal }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit, q, sortKey, sortOrder });
      const res = await fetch(`/api/items?${params.toString()}`, { signal });
      if (!res.ok) {
        throw new Error('Failed to fetch items');
      }
      const json = await res.json();
      setItems(json.data);
      setPagination({
        page: json.page,
        limit: json.limit,
        totalPages: json.totalPages,
        totalResults: json.totalResults,
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <DataContext.Provider value={{ items, loading, pagination, fetchItems }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
