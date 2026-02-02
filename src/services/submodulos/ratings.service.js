import { prisma } from '../../db/client.js';
import { envs } from '../../config/envs.js';

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
// Listado agrupado por mesero con paginación
export async function listGroupedByWaiter({ page = 1, page_size = 10, recent_count = 10 }) {
  // 1. Obtener lista de waiterIds únicos
  const distinctWaiters = await prisma.waiterRating.findMany({
    distinct: ['waiterId'],
    select: { waiterId: true },
    orderBy: { waiterId: 'asc' },
  });
  const totalWaiters = distinctWaiters.length;
  const start = (page - 1) * page_size;
  const end = start + page_size;
  const pageWaiters = distinctWaiters.slice(start, end).map((w) => w.waiterId);

  // 2. Para cada mesero, obtener sus ratings y stats
  const results = [];
  for (const waiterId of pageWaiters) {
    const ratings = await prisma.waiterRating.findMany({
      where: { waiterId },
      orderBy: { createdAt: 'desc' }
    });
    const count = ratings.length;
    const average = count > 0 ? ratings.reduce((acc, r) => acc + r.score, 0) / count : 0;
    const lastRatingAt = count > 0 ? ratings[0].createdAt : null;

    // Recientes
    const recent = ratings.slice(0, recent_count).map((r) => ({
      id: r.id,
      clienteId: r.clienteId,
      score: r.score,
      comment: r.comment,
      createdAt: r.createdAt,
    }));

    // 3. Detalles del mesero desde Cocina (best-effort)
    let waiter = { id: waiterId };
    if (envs.CHARLOTTE_COCINA_URL) {
      try {
        const resp = await fetch(`${envs.CHARLOTTE_COCINA_URL}/staff/${waiterId}`);
        if (resp.ok) {
          const data = await resp.json();
          waiter = {
            id: waiterId,
            name: data?.externalName || data?.name || null,
            email: data?.externalEmail || null,
            role: data?.externalRole || data?.role || null,
          };
        }
      } catch (e) {
        // noop
      }
    }

    results.push({
      waiter,
      stats: { count, average, lastRatingAt },
      recentRatings: recent,
    });
  }

  return {
    success: true,
    page,
    page_size,
    total_waiters: totalWaiters,
    data: results,
  };
}

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

// Lista paginada con datos esenciales del cliente
export async function listRatingsPaged({ page = 1, page_size = 10, waiter_id, from, to, order_by = 'createdAt', direction = 'desc' }) {
  const skip = (page - 1) * page_size;
  const where = {};
  if (waiter_id) where.waiterId = waiter_id;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const orderBy = {};
  orderBy[order_by] = direction;

  const [total, rows] = await Promise.all([
    prisma.waiterRating.count({ where }),
    prisma.waiterRating.findMany({
      where,
      orderBy,
      skip,
      take: page_size,
      include: {
        cliente: {
          select: { id: true, customerName: true, customerDni: true }
        }
      }
    })
  ]);

  const data = rows.map(r => ({
    id: r.id,
    waiterId: r.waiterId,
    score: r.score,
    comment: r.comment,
    createdAt: r.createdAt,
    cliente: r.cliente
  }));

  return { success: true, page, page_size, total, data };
}

// Serie temporal de calificaciones (diaria o semanal)
export async function ratingsTimeseries({ granularity, waiter_id, from, to }) {
  const unit = granularity === 'weekly' ? 'week' : 'day';
  const params = [];
  let idx = 1;

  // Construcción segura del WHERE
  let where = 'WHERE 1=1';
  if (waiter_id) { where += ` AND waiter_id = $${idx++}`; params.push(waiter_id); }
  if (from) { where += ` AND created_at >= $${idx++}`; params.push(new Date(from)); }
  if (to) { where += ` AND created_at <= $${idx++}`; params.push(new Date(to)); }

  const query = `
    SELECT date_trunc('${unit}', created_at) AS bucket,
           COUNT(*)::int AS count,
           AVG(score)::float AS average
    FROM waiter_ratings
    ${where}
    GROUP BY bucket
    ORDER BY bucket ASC
  `;

  const rows = await prisma.$queryRawUnsafe(query, ...params);
  return {
    success: true,
    granularity,
    data: rows.map(r => ({
      bucket: r.bucket,
      count: Number(r.count),
      average: typeof r.average === 'number' ? r.average : Number(r.average)
    }))
  };
}