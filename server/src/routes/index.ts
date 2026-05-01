import { Router } from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categories';
import { getExpenses, createExpense, updateExpense, deleteExpense, exportExpenses } from '../controllers/expenses';
import { getRecurring, createRecurring, updateRecurring, deleteRecurring, processRecurring } from '../controllers/recurring';
import { getMonthlySummary, getCategoryBreakdown, getDashboardStats } from '../controllers/analytics';
import { getMerchants, getMerchant, createMerchant, updateMerchant, deleteMerchant, getMerchantBreakdown } from '../controllers/merchants';
import { uploadBillImage, deleteBillImage } from '../controllers/uploads';
import { upload } from '../lib/upload';
import { getSKUs, getSKU, createSKU, updateSKU, deleteSKU } from '../controllers/skus';
import { getPurchases, getPurchase, createPurchase, updatePurchase, deletePurchase } from '../controllers/purchases';
import { getSellOrders, getSellOrder, createSellOrder, updateSellOrder, deleteSellOrder } from '../controllers/sellOrders';
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct, uploadProductImage, deleteProductImage } from '../controllers/products';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/health', (_req, res) => res.json({ ok: true }));

router.use(requireAuth);

// Categories
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Expenses — export must come before :id to avoid param collision
router.get('/expenses/export', exportExpenses);
router.get('/expenses', getExpenses);
router.post('/expenses', createExpense);
router.put('/expenses/:id', updateExpense);
router.delete('/expenses/:id', deleteExpense);

// Bill image upload/delete
router.post('/expenses/:id/upload', upload.single('bill'), uploadBillImage);
router.delete('/expenses/:id/bill', deleteBillImage);

// Recurring
router.get('/recurring', getRecurring);
router.post('/recurring', createRecurring);
router.put('/recurring/:id', updateRecurring);
router.delete('/recurring/:id', deleteRecurring);
router.post('/recurring/process', processRecurring);

// Merchants
router.get('/merchants', getMerchants);
router.get('/merchants/breakdown', getMerchantBreakdown);
router.get('/merchants/:id', getMerchant);
router.post('/merchants', createMerchant);
router.put('/merchants/:id', updateMerchant);
router.delete('/merchants/:id', deleteMerchant);

// Analytics
router.get('/analytics/monthly', getMonthlySummary);
router.get('/analytics/categories', getCategoryBreakdown);
router.get('/analytics/dashboard', getDashboardStats);

// SKUs
router.get('/skus', getSKUs);
router.get('/skus/:id', getSKU);
router.post('/skus', createSKU);
router.put('/skus/:id', updateSKU);
router.delete('/skus/:id', deleteSKU);

// Purchases
router.get('/purchases', getPurchases);
router.get('/purchases/:id', getPurchase);
router.post('/purchases', createPurchase);
router.put('/purchases/:id', updatePurchase);
router.delete('/purchases/:id', deletePurchase);

// Sell Orders
router.get('/sell-orders', getSellOrders);
router.get('/sell-orders/:id', getSellOrder);
router.post('/sell-orders', createSellOrder);
router.put('/sell-orders/:id', updateSellOrder);
router.delete('/sell-orders/:id', deleteSellOrder);

// Products
router.get('/products', getProducts);
router.get('/products/:id', getProduct);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);
router.post('/products/:id/image', upload.single('image'), uploadProductImage);
router.delete('/products/:id/image', deleteProductImage);

export default router;
