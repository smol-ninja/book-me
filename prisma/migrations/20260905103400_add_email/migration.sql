-- AlterTable
ALTER TABLE "Calendar" ADD COLUMN "email" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "guestEmail" TEXT NOT NULL DEFAULT '';
