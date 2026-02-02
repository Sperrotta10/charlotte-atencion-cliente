-- AlterTable
ALTER TABLE "cliente_temporal" ADD COLUMN     "last_waiter_id" TEXT;

-- AlterTable
ALTER TABLE "service_requests" ADD COLUMN     "attended_by_waiter_id" TEXT;
