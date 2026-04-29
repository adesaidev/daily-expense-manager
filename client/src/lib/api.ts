import axios from 'axios';
import type {
  Category, Expense, Recurring, Merchant,
  PaginatedExpenses, MonthlySummary, CategoryBreakdown, MerchantBreakdown, DashboardStats,
  PaymentStatus, PaymentType,
  SKU, Purchase, SellOrder, PaginatedPurchases, PaginatedSellOrders,
  PurchaseStatus, SellOrderStatus,
  Product, ProductInput,
} from '../types';

const api = axios.create({ baseURL: '/api' });

// Input types — amount is always a number when writing, string when reading
export interface ExpenseInput {
  amount?: number;
  description?: string;
  date?: string;
  categoryId?: number;
  merchantId?: number | null;
  paymentStatus?: PaymentStatus;
  paymentType?: PaymentType | null;
  isRecurring?: boolean;
  recurringId?: number | null;
}

export interface RecurringInput {
  amount?: number;
  description?: string;
  categoryId?: number;
  frequency?: Recurring['frequency'];
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface MerchantInput {
  name?: string;
  website?: string;
  logo?: string;
  categoryId?: number;
}

// Categories
export const getCategories = () => api.get<Category[]>('/categories').then(r => r.data);
export const createCategory = (data: Partial<Category>) => api.post<Category>('/categories', data).then(r => r.data);
export const updateCategory = (id: number, data: Partial<Category>) => api.put<Category>(`/categories/${id}`, data).then(r => r.data);
export const deleteCategory = (id: number) => api.delete(`/categories/${id}`);

// Expenses
export const getExpenses = (params?: Record<string, string | number>) =>
  api.get<PaginatedExpenses>('/expenses', { params }).then(r => r.data);
export const createExpense = (data: ExpenseInput) =>
  api.post<Expense>('/expenses', data).then(r => r.data);
export const updateExpense = (id: number, data: ExpenseInput) =>
  api.put<Expense>(`/expenses/${id}`, data).then(r => r.data);
export const deleteExpense = (id: number) => api.delete(`/expenses/${id}`);
export const uploadBillImage = (expenseId: number, file: File) => {
  const form = new FormData();
  form.append('bill', file);
  return api.post<Expense>(`/expenses/${expenseId}/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};
export const deleteBillImage = (expenseId: number) =>
  api.delete<Expense>(`/expenses/${expenseId}/bill`).then(r => r.data);
export const exportExpenses = (params?: Record<string, string | number>) => {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  window.open(`/api/expenses/export${query ? `?${query}` : ''}`, '_blank');
};

// Recurring
export const getRecurring = () => api.get<Recurring[]>('/recurring').then(r => r.data);
export const createRecurring = (data: RecurringInput) =>
  api.post<Recurring>('/recurring', data).then(r => r.data);
export const updateRecurring = (id: number, data: RecurringInput) =>
  api.put<Recurring>(`/recurring/${id}`, data).then(r => r.data);
export const deleteRecurring = (id: number) => api.delete(`/recurring/${id}`);
export const processRecurring = () => api.post('/recurring/process').then(r => r.data);

// Merchants
export const getMerchants = () => api.get<Merchant[]>('/merchants').then(r => r.data);
export const getMerchant = (id: number) => api.get<Merchant>(`/merchants/${id}`).then(r => r.data);
export const createMerchant = (data: MerchantInput) => api.post<Merchant>('/merchants', data).then(r => r.data);
export const updateMerchant = (id: number, data: MerchantInput) => api.put<Merchant>(`/merchants/${id}`, data).then(r => r.data);
export const deleteMerchant = (id: number) => api.delete(`/merchants/${id}`);
export const getMerchantBreakdown = (params?: { month?: number; year?: number }) =>
  api.get<MerchantBreakdown[]>('/merchants/breakdown', { params }).then(r => r.data);

// SKUs
export interface SKUInput {
  skuCode?: string | null;
  name?: string;
  description?: string | null;
  categoryId?: number | null;
  unit?: string;
  minStock?: number;
  costPrice?: number | null;
  mrp?: number | null;
  sellPrice?: number | null;
  hsnCode?: string | null;
  gstRate?: number | null;
}
export const getSKUs = () => api.get<SKU[]>('/skus').then(r => r.data);
export const createSKU = (data: SKUInput) => api.post<SKU>('/skus', data).then(r => r.data);
export const updateSKU = (id: number, data: SKUInput) => api.put<SKU>(`/skus/${id}`, data).then(r => r.data);
export const deleteSKU = (id: number) => api.delete(`/skus/${id}`);

// Purchases
export interface OrderItemInput { skuId: number; quantity: number; unitPrice: number; }
export interface PurchaseInput {
  merchantId?: number | null;
  date?: string;
  notes?: string | null;
  status?: PurchaseStatus;
  items: OrderItemInput[];
}
export const getPurchases = (params?: Record<string, string | number>) =>
  api.get<PaginatedPurchases>('/purchases', { params }).then(r => r.data);
export const createPurchase = (data: PurchaseInput) => api.post<Purchase>('/purchases', data).then(r => r.data);
export const updatePurchase = (id: number, data: Partial<PurchaseInput>) => api.put<Purchase>(`/purchases/${id}`, data).then(r => r.data);
export const deletePurchase = (id: number) => api.delete(`/purchases/${id}`);

// Sell Orders
export interface SellOrderInput {
  customerName?: string | null;
  date?: string;
  notes?: string | null;
  status?: SellOrderStatus;
  items: OrderItemInput[];
}
export const getSellOrders = (params?: Record<string, string | number>) =>
  api.get<PaginatedSellOrders>('/sell-orders', { params }).then(r => r.data);
export const createSellOrder = (data: SellOrderInput) => api.post<SellOrder>('/sell-orders', data).then(r => r.data);
export const updateSellOrder = (id: number, data: Partial<SellOrderInput>) => api.put<SellOrder>(`/sell-orders/${id}`, data).then(r => r.data);
export const deleteSellOrder = (id: number) => api.delete(`/sell-orders/${id}`);

// Products
export const getProducts = (search?: string) =>
  api.get<Product[]>('/products', { params: search ? { search } : {} }).then(r => r.data);
export const createProduct = (data: ProductInput) => api.post<Product>('/products', data).then(r => r.data);
export const updateProduct = (id: number, data: Partial<ProductInput>) => api.put<Product>(`/products/${id}`, data).then(r => r.data);
export const deleteProduct = (id: number) => api.delete(`/products/${id}`);
export const uploadProductImage = (id: number, file: File) => {
  const form = new FormData();
  form.append('image', file);
  return api.post<Product>(`/products/${id}/image`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};
export const deleteProductImage = (id: number) =>
  api.delete<Product>(`/products/${id}/image`).then(r => r.data);

// Analytics
export const getMonthlySummary = (year?: number) =>
  api.get<MonthlySummary[]>('/analytics/monthly', { params: year ? { year } : {} }).then(r => r.data);
export const getCategoryBreakdown = (params?: { month?: number; year?: number }) =>
  api.get<CategoryBreakdown[]>('/analytics/categories', { params }).then(r => r.data);
export const getDashboardStats = () =>
  api.get<DashboardStats>('/analytics/dashboard').then(r => r.data);
