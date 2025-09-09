import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Items from './Items';
import ItemDetail from './ItemDetail';
import { DataProvider } from '../state/DataContext';
import Container from '../components/Container';

function App() {
  return (
    <DataProvider>
      <nav className="p-4 border-b border-gray-200">
        <Link to="/" className="text-blue-500 hover:text-blue-700">Items</Link>
      </nav>
      <main>
        <Container>
          <Routes>
            <Route path="/" element={<Items />} />
            <Route path="/items/:id" element={<ItemDetail />} />
          </Routes>
        </Container>
      </main>
    </DataProvider>
  );
}

export default App;
