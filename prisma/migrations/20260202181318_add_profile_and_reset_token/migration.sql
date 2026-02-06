-- AlterTable
ALTER TABLE "users" ADD COLUMN     "location" TEXT,
ADD COLUMN     "password_reset_expires" TIMESTAMP(3),
ADD COLUMN     "password_reset_token" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "website" TEXT;
