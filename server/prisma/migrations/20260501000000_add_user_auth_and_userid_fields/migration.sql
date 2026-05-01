-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "genericName" TEXT,
    "weightGrams" DOUBLE PRECISION,
    "size" TEXT,
    "variation" TEXT,
    "color" TEXT,
    "costPrice" DECIMAL(10,2) NOT NULL,
    "mrp" DECIMAL(10,2) NOT NULL,
    "recommendedAge" TEXT,
    "includeComponents" TEXT,
    "material" TEXT,
    "packageDimension" TEXT,
    "productDimension" TEXT,
    "imagePath" TEXT,
    "hsnCode" TEXT,
    "gstRate" DOUBLE PRECISION,
    "userId" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Category
ALTER TABLE "Category" ADD COLUMN "userId" TEXT NOT NULL DEFAULT '';
DROP INDEX IF EXISTS "Category_name_key";

-- AlterTable: Merchant
ALTER TABLE "Merchant" ADD COLUMN "userId" TEXT NOT NULL DEFAULT '';
DROP INDEX IF EXISTS "Merchant_name_key";

-- AlterTable: SKU
ALTER TABLE "SKU"
    ADD COLUMN "skuCode" TEXT,
    ADD COLUMN "userId" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "hsnCode" TEXT,
    ADD COLUMN "gstRate" DECIMAL(5,2),
    ADD COLUMN "mrp" DECIMAL(10,2),
    ADD COLUMN "categoryId" INTEGER;

-- AlterTable: Purchase
ALTER TABLE "Purchase" ADD COLUMN "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable: SellOrder
ALTER TABLE "SellOrder" ADD COLUMN "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable: Expense
ALTER TABLE "Expense" ADD COLUMN "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable: Recurring
ALTER TABLE "Recurring" ADD COLUMN "userId" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_userId_key" ON "Category"("name", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_name_userId_key" ON "Merchant"("name", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SKU_skuCode_userId_key" ON "SKU"("skuCode", "userId");

-- AddForeignKey
ALTER TABLE "SKU" ADD CONSTRAINT "SKU_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
