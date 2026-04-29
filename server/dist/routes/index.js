"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const categories_1 = require("../controllers/categories");
const expenses_1 = require("../controllers/expenses");
const recurring_1 = require("../controllers/recurring");
const analytics_1 = require("../controllers/analytics");
const merchants_1 = require("../controllers/merchants");
const uploads_1 = require("../controllers/uploads");
const upload_1 = require("../lib/upload");
const skus_1 = require("../controllers/skus");
const purchases_1 = require("../controllers/purchases");
const sellOrders_1 = require("../controllers/sellOrders");
const products_1 = require("../controllers/products");
const router = (0, express_1.Router)();
// Categories
router.get('/categories', categories_1.getCategories);
router.post('/categories', categories_1.createCategory);
router.put('/categories/:id', categories_1.updateCategory);
router.delete('/categories/:id', categories_1.deleteCategory);
// Expenses — export must come before :id to avoid param collision
router.get('/expenses/export', expenses_1.exportExpenses);
router.get('/expenses', expenses_1.getExpenses);
router.post('/expenses', expenses_1.createExpense);
router.put('/expenses/:id', expenses_1.updateExpense);
router.delete('/expenses/:id', expenses_1.deleteExpense);
// Bill image upload/delete
router.post('/expenses/:id/upload', upload_1.upload.single('bill'), uploads_1.uploadBillImage);
router.delete('/expenses/:id/bill', uploads_1.deleteBillImage);
// Recurring
router.get('/recurring', recurring_1.getRecurring);
router.post('/recurring', recurring_1.createRecurring);
router.put('/recurring/:id', recurring_1.updateRecurring);
router.delete('/recurring/:id', recurring_1.deleteRecurring);
router.post('/recurring/process', recurring_1.processRecurring);
// Merchants
router.get('/merchants', merchants_1.getMerchants);
router.get('/merchants/breakdown', merchants_1.getMerchantBreakdown);
router.get('/merchants/:id', merchants_1.getMerchant);
router.post('/merchants', merchants_1.createMerchant);
router.put('/merchants/:id', merchants_1.updateMerchant);
router.delete('/merchants/:id', merchants_1.deleteMerchant);
// Analytics
router.get('/analytics/monthly', analytics_1.getMonthlySummary);
router.get('/analytics/categories', analytics_1.getCategoryBreakdown);
router.get('/analytics/dashboard', analytics_1.getDashboardStats);
// SKUs
router.get('/skus', skus_1.getSKUs);
router.get('/skus/:id', skus_1.getSKU);
router.post('/skus', skus_1.createSKU);
router.put('/skus/:id', skus_1.updateSKU);
router.delete('/skus/:id', skus_1.deleteSKU);
// Purchases
router.get('/purchases', purchases_1.getPurchases);
router.get('/purchases/:id', purchases_1.getPurchase);
router.post('/purchases', purchases_1.createPurchase);
router.put('/purchases/:id', purchases_1.updatePurchase);
router.delete('/purchases/:id', purchases_1.deletePurchase);
// Sell Orders
router.get('/sell-orders', sellOrders_1.getSellOrders);
router.get('/sell-orders/:id', sellOrders_1.getSellOrder);
router.post('/sell-orders', sellOrders_1.createSellOrder);
router.put('/sell-orders/:id', sellOrders_1.updateSellOrder);
router.delete('/sell-orders/:id', sellOrders_1.deleteSellOrder);
// Products
router.get('/products', products_1.getProducts);
router.get('/products/:id', products_1.getProduct);
router.post('/products', products_1.createProduct);
router.put('/products/:id', products_1.updateProduct);
router.delete('/products/:id', products_1.deleteProduct);
router.post('/products/:id/image', upload_1.upload.single('image'), products_1.uploadProductImage);
router.delete('/products/:id/image', products_1.deleteProductImage);
exports.default = router;
