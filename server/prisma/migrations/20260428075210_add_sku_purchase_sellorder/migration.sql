-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SellOrderStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "SKU" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "currentStock" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "minStock" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "costPrice" DECIMAL(10,2),
    "sellPrice" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SKU_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseItem" (
    "id" SERIAL NOT NULL,
    "purchaseId" INTEGER NOT NULL,
    "skuId" INTEGER NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellOrder" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerName" TEXT,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "status" "SellOrderStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellOrderItem" (
    "id" SERIAL NOT NULL,
    "sellOrderId" INTEGER NOT NULL,
    "skuId" INTEGER NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "SellOrderItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "SKU"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellOrderItem" ADD CONSTRAINT "SellOrderItem_sellOrderId_fkey" FOREIGN KEY ("sellOrderId") REFERENCES "SellOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellOrderItem" ADD CONSTRAINT "SellOrderItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "SKU"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
