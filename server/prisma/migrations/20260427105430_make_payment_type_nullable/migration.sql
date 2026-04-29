-- AlterTable
ALTER TABLE "Expense" ALTER COLUMN "paymentType" DROP NOT NULL,
ALTER COLUMN "paymentType" DROP DEFAULT;
