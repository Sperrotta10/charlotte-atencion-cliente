import { prisma } from '../../db/client.js';
import { envs } from '../../config/envs.js';

export const KitchenWebhookService = {
  async resolveWaiter({ waiter_id, worker_code }) {
    // Prefer explicit waiter_id; else validate worker_code via Cocina
    if (waiter_id) return { id: waiter_id };
    if (worker_code && envs.CHARLOTTE_COCINA_URL) {
      try {
        const resp = await fetch(`${envs.CHARLOTTE_COCINA_URL}/staff/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workerCode: worker_code })
        });
        if (resp.ok) {
          const staff = await resp.json();
          return { id: staff.id, role: staff.role };
        }
      } catch (e) {
        console.warn('Cocina validate error:', e.message);
      }
    }
    const err = new Error('No se pudo validar el mesero');
    err.code = 'WAITER_VALIDATION_FAILED';
    throw err;
  },

  async handleWaiterInteraction({ external_order_id, action, waiter_id, worker_code }) {
    // 1. Resolver comanda -> clienteId
    const comanda = await prisma.comanda.findUnique({ where: { id: external_order_id } });
    if (!comanda) {
      const err = new Error('Comanda no encontrada');
      err.code = 'ORDER_NOT_FOUND';
      throw err;
    }

    // 2. Resolver mesero
    const waiter = await this.resolveWaiter({ waiter_id, worker_code });

    // 3. Registrar interacción
    const interaction = await prisma.waiterInteraction.create({
      data: {
        clienteId: comanda.clienteId,
        waiterId: waiter.id,
        role: waiter.role,
        action,
        externalOrderId: external_order_id,
      }
    });

    // 4. Si SERVE, actualizar lastWaiterId
    if (action === 'SERVE') {
      await prisma.clienteTemporal.update({
        where: { id: comanda.clienteId },
        data: { lastWaiterId: waiter.id }
      });
    }

    return interaction;
  }
};