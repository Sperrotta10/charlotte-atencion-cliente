import { Router } from 'express';
import * as clienteTemporalController from '../../controllers/submodulos/cliente_temporal.controller.js';

const router = Router();

// POST /clients - Crear Sesión (Login)
router.post('/', clienteTemporalController.createSession);

export default router;

