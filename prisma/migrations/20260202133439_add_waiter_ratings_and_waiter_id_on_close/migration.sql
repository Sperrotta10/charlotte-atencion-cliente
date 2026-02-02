-- AlterTable
ALTER TABLE "cliente_temporal" ADD COLUMN     "closed_by_waiter_id" TEXT;

-- CreateTable
CREATE TABLE "waiter_ratings" (
    "id" TEXT NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "waiter_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waiter_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "waiter_ratings_cliente_id_key" ON "waiter_ratings"("cliente_id");

-- AddForeignKey
ALTER TABLE "waiter_ratings" ADD CONSTRAINT "waiter_ratings_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente_temporal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
