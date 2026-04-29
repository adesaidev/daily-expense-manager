export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
  createdAt: string;
  _count?: { expenses: number };
}

export interface Merchant {
  id: number;
  name: string;
  website?: string;
  logo?: string;
  categoryId?: number;
  createdAt: string;
  updatedAt: string;
  _count?: { expenses: number };
}

export type PaymentStatus = 'PENDING' | 'COMPLETED';
export type PaymentType = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD';

export interface Expense {
  id: number;
  amount: string;
  description: string;
  date: string;
  categoryId: number;
  category: Category;
  merchantId?: number;
  merchant?: Merchant;
  paymentStatus: PaymentStatus;
  paymentType: PaymentType | null;
  billImagePath?: string;
  isRecurring: boolean;
  recurringId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Recurring {
  id: number;
  amount: string;
  description: string;
  categoryId: number;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  startDate: string;
  endDate?: string;
  lastRun?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedExpenses {
  data: Expense[];
  total: number;
  page: number;
  limit: number;
}

export interface MonthlySummary {
  month: number;
  total: number;
}

export interface CategoryBreakdown {
  categoryId: number;
  category: Category;
  total: number;
  count: number;
}

export interface MerchantBreakdown {
  merchantId: number;
  merchant: Merchant;
  total: number;
  count: number;
}

export interface DashboardStats {
  thisMonthTotal: number;
  lastMonthTotal: number;
  changePercent: number;
  thisMonthCount: number;
  totalExpenses: number;
  topCategory: string | null;
}

export interface SKU {
  id: number;
  skuCode?: string | null;
  name: string;
  description?: string | null;
  categoryId?: number | null;
  category?: Category | null;
  unit: string;
  currentStock: string;
  minStock: string;
  costPrice?: string | null;
  mrp?: string | null;
  sellPrice?: string | null;
  hsnCode?: string | null;
  gstRate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PurchaseStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';
export type SellOrderStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export interface PurchaseItem {
  id: number;
  skuId: number;
  sku: SKU;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
}

export interface Purchase {
  id: number;
  merchantId?: number | null;
  merchant?: Merchant | null;
  date: string;
  totalAmount: string;
  notes?: string | null;
  status: PurchaseStatus;
  items: PurchaseItem[];
  createdAt: string;
  updatedAt: string;
}

export interface SellOrderItem {
  id: number;
  skuId: number;
  sku: SKU;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
}

export interface SellOrder {
  id: number;
  customerName?: string | null;
  date: string;
  totalAmount: string;
  notes?: string | null;
  status: SellOrderStatus;
  items: SellOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedPurchases {
  data: Purchase[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginatedSellOrders {
  data: SellOrder[];
  total: number;
  page: number;
  limit: number;
}

export interface Product {
  id: number;
  name: string;
  genericName?: string | null;
  weightGrams?: number | null;
  size?: string | null;
  variation?: string | null;
  color?: string | null;
  costPrice: string;
  mrp: string;
  recommendedAge?: string | null;
  includeComponents?: string | null;
  material?: string | null;
  packageDimension?: string | null;
  productDimension?: string | null;
  imagePath?: string | null;
  hsnCode?: string | null;
  gstRate?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  genericName?: string | null;
  weightGrams?: number | null;
  size?: string | null;
  variation?: string | null;
  color?: string | null;
  costPrice: number;
  mrp: number;
  recommendedAge?: string | null;
  includeComponents?: string | null;
  material?: string | null;
  packageDimension?: string | null;
  productDimension?: string | null;
  hsnCode?: string | null;
  gstRate?: number | null;
}
