-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CARD');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "paymentType" "PaymentType" NOT NULL DEFAULT 'CASH';
