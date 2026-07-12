-- AlterTable
ALTER TABLE "BillPeriod" ADD COLUMN     "monthlyPolicyId" TEXT;

-- CreateTable
CREATE TABLE "MonthlyPolicy" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "waterRate" DOUBLE PRECISION NOT NULL,
    "elecRate" DOUBLE PRECISION NOT NULL,
    "billingCycle" TEXT NOT NULL,
    "lateFeeImposed" BOOLEAN NOT NULL,
    "lateFeeAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyPolicy_month_year_key" ON "MonthlyPolicy"("month", "year");

-- AddForeignKey
ALTER TABLE "BillPeriod" ADD CONSTRAINT "BillPeriod_monthlyPolicyId_fkey" FOREIGN KEY ("monthlyPolicyId") REFERENCES "MonthlyPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
