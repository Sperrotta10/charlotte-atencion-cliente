import { Router } from 'express';
import * as clienteTemporalController from '../../controllers/submodulos/cliente_temporal.controller.js';

const router = Router();

// POST /clients - Crear Sesión (Login)
router.post('/', clienteTemporalController.createSession);

// GET /clients/:id - Obtener Cliente por id
router.get('/:id', clienteTemporalController.getClientById);

export default router;

