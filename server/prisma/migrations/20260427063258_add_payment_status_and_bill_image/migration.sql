-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "billImagePath" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED';
