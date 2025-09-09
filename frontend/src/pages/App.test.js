import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import { DataProvider } from '../state/DataContext';
import { BrowserRouter } from 'react-router-dom';

jest.mock('react-window', () => ({
  FixedSizeList: ({ children }) => <div>{children}</div>,
}));

test('renders learn react link', () => {
  render(
    <BrowserRouter>
      <DataProvider>
        <App />
      </DataProvider>
    </BrowserRouter>
  );
  const linkElement = screen.getByText(/Items/i);
  expect(linkElement).toBeInTheDocument();
});
