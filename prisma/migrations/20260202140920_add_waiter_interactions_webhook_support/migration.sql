-- CreateEnum
CREATE TYPE "InteractionAction" AS ENUM ('ASSIGN', 'SERVE');

-- CreateTable
CREATE TABLE "waiter_interactions" (
    "id" TEXT NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "waiter_id" TEXT NOT NULL,
    "role" TEXT,
    "action" "InteractionAction" NOT NULL,
    "external_order_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waiter_interactions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "waiter_interactions" ADD CONSTRAINT "waiter_interactions_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente_temporal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
