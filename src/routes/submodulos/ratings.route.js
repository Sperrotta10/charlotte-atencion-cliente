import { Router } from 'express';
import { createRatingForClient, listRatings, ratingsSummary, getClientWaiters } from '../../controllers/submodulos/ratings.controller.js';
import { verifyGuestOrStaff, ensureOwnership } from '../../middlewares/auth.js';

const router = Router();

// Calificar una atención de cliente
router.post('/clients/:id', verifyGuestOrStaff(), ensureOwnership('clienteTemporal'), createRatingForClient);

// Listado de calificaciones (dashboard)
router.get('/', listRatings);

// Resumen/metricas
router.get('/summary', ratingsSummary);

// Listar meseros que atendieron una sesión
router.get('/clients/:id/waiters', getClientWaiters);

export default router;
