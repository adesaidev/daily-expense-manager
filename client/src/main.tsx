import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Expenses } from './pages/Expenses';
import { RecurringPage } from './pages/Recurring';
import { Categories } from './pages/Categories';
import { Analytics } from './pages/Analytics';
import { Merchants } from './pages/Merchants';
import { SKUs } from './pages/SKUs';
import { Purchases } from './pages/Purchases';
import { SellOrders } from './pages/SellOrders';
import { Products } from './pages/Products';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="recurring" element={<RecurringPage />} />
            <Route path="merchants" element={<Merchants />} />
            <Route path="categories" element={<Categories />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="products" element={<Products />} />
            <Route path="skus" element={<SKUs />} />
            <Route path="purchases" element={<Purchases />} />
            <Route path="sell-orders" element={<SellOrders />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
