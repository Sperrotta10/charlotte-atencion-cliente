import { RatingsService, listGroupedByWaiter } from '../../services/submodulos/ratings.service.js';
import { createRatingParamsSchema, createRatingBodySchema, ratingsQuerySchema, summaryQuerySchema, clientIdParamSchema, ratingsByWaiterQuerySchema } from '../../schemas/submodulos/ratings.schema.js';

export const createRatingForClient = async (req, res) => {
  try {
    const params = createRatingParamsSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ errors: params.error.format() });

    const body = createRatingBodySchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ errors: body.error.format() });

    const created = await RatingsService.createForClient(params.data.id, body.data);
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    if (error.code === 'CLIENT_NOT_FOUND') return res.status(404).json({ error: error.message });
    if (error.code === 'ALREADY_RATED') return res.status(409).json({ error: error.message });
    if (error.code === 'WAITER_NOT_ASSIGNED') return res.status(400).json({ error: error.message });
    console.error('Error creando calificación:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const listRatings = async (req, res) => {
  try {
    const query = ratingsQuerySchema.safeParse(req.query);
    if (!query.success) return res.status(400).json({ errors: query.error.format() });

    const ratings = await RatingsService.list(query.data);
    return res.json({ success: true, data: ratings });
  } catch (error) {
    console.error('Error listando calificaciones:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const ratingsSummary = async (req, res) => {
  try {
    const query = summaryQuerySchema.safeParse(req.query);
    if (!query.success) return res.status(400).json({ errors: query.error.format() });

    const summary = await RatingsService.summary(query.data);
    return res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error en resumen de calificaciones:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const getClientWaiters = async (req, res) => {
  try {
    const params = clientIdParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ errors: params.error.format() });
    const ids = await RatingsService.listWaitersForClient(params.data.id);
    return res.json({ success: true, data: ids });
  } catch (error) {
    console.error('Error obteniendo meseros de cliente:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const listRatingsByWaiter = async (req, res) => {
  try {
    const query = ratingsByWaiterQuerySchema.safeParse(req.query);
    if (!query.success) return res.status(400).json({ errors: query.error.format() });

    const result = await listGroupedByWaiter(query.data);
    return res.json(result);
  } catch (error) {
    console.error('Error listando calificaciones por mesero:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};