import { prisma } from '../../db/client.js';

export const RatingsService = {
  // Crear/registrar calificación para un cliente
  async createForClient(clienteId, { score, comment, waiter_id, for_all }) {
    const cliente = await prisma.clienteTemporal.findUnique({ where: { id: clienteId } });
    if (!cliente) {
      const err = new Error('Cliente no encontrado');
      err.code = 'CLIENT_NOT_FOUND';
      throw err;
    }

    if (for_all) {
      const waiterIds = await RatingsService.listWaitersForClient(clienteId);
      if (!waiterIds || waiterIds.length === 0) {
        const fallback = cliente.closedByWaiterId || cliente.lastWaiterId;
        if (!fallback) {
          const err = new Error('No hay meseros registrados para esta sesión');
          err.code = 'WAITER_NOT_ASSIGNED';
          throw err;
        }
        // Calificar al único conocido (con fallback si no existe constraint única)
        const created = await safeCompositeUpsert(clienteId, fallback, { score, comment });
        return [created];
      }
      // Crear/actualizar para todos
      const results = [];
      for (const wid of waiterIds) {
        const r = await safeCompositeUpsert(clienteId, wid, { score, comment });
        results.push(r);
      }
      return results;
    } else {
      // Resolver un único mesero
      const waiterId = cliente.closedByWaiterId || cliente.lastWaiterId || waiter_id;
      if (!waiterId) {
        const err = new Error('No hay mesero asociado a esta atención aún');
        err.code = 'WAITER_NOT_ASSIGNED';
        throw err;
      }
      const created = await safeCompositeUpsert(clienteId, waiterId, { score, comment });
      return created;
    }
  },

  async list({ waiter_id, from, to }) {
    const where = {};
    if (waiter_id) where.waiterId = waiter_id;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }
    const ratings = await prisma.waiterRating.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return ratings;
  },

  async summary({ waiter_id, from, to }) {
    const ratings = await this.list({ waiter_id, from, to });
    if (ratings.length === 0) {
      return { count: 0, average: 0, distribution: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    }
    const count = ratings.length;
    const sum = ratings.reduce((acc, r) => acc + r.score, 0);
    const average = sum / count;
    const dist = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((r) => { dist[r.score] = (dist[r.score] || 0) + 1; });
    return { count, average, distribution: dist };
  },

  async listWaitersForClient(clienteId) {
    const interactions = await prisma.waiterInteraction.findMany({
      where: { clienteId },
      orderBy: { createdAt: 'asc' }
    });
    const set = new Set();
    for (const it of interactions) {
      if (it.waiterId) set.add(it.waiterId);
    }
    // Complementar con closedBy y lastWaiter si no están
    const cliente = await prisma.clienteTemporal.findUnique({ where: { id: clienteId } });
    if (cliente?.lastWaiterId) set.add(cliente.lastWaiterId);
    if (cliente?.closedByWaiterId) set.add(cliente.closedByWaiterId);
    return Array.from(set);
  }
};

// Helper: Upsert por composite key con fallback para entornos sin constraint única aplicada
async function safeCompositeUpsert(clienteId, waiterId, { score, comment }) {
  try {
    return await prisma.waiterRating.upsert({
      where: { clienteId_waiterId: { clienteId, waiterId } },
      update: { score, comment },
      create: { clienteId, waiterId, score, comment }
    });
  } catch (e) {
    const msg = (e && e.message) ? e.message : '';
    // Fallback cuando Postgres indica falta de constraint única para ON CONFLICT
    if (msg.includes('no unique or exclusion constraint') || msg.includes('ON CONFLICT')) {
      const existing = await prisma.waiterRating.findFirst({ where: { clienteId, waiterId } });
      if (existing) {
        return await prisma.waiterRating.update({
          where: { id: existing.id },
          data: { score, comment }
        });
      }
      return await prisma.waiterRating.create({
        data: { clienteId, waiterId, score, comment }
      });
    }
    throw e;
  }
}