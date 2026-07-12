-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "elecWaived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "waterWaived" BOOLEAN NOT NULL DEFAULT false;
