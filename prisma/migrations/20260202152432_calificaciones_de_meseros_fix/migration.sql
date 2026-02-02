/*
  Warnings:

  - A unique constraint covering the columns `[cliente_id,waiter_id]` on the table `waiter_ratings` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "waiter_ratings_cliente_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "waiter_ratings_cliente_id_waiter_id_key" ON "waiter_ratings"("cliente_id", "waiter_id");
