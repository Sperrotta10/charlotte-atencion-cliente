import { Router } from 'express';
import * as clienteTemporalController from '../../controllers/submodulos/cliente_temporal.controller.js';
import { verifyOwnerOrStaff } from '../../middlewares/auth.js';

const router = Router();

// GET /clients - Obtener Clientes (Monitor de Sesiones y Fuente de Datos KPI) (PROTEGIDO: Owner/Staff)
router.get('/', verifyOwnerOrStaff('ClienteTemporal_atc', 'Read'), clienteTemporalController.getClients);

// POST /clients - Crear Sesión (Login)
router.post('/', clienteTemporalController.createSession);

// GET /clients/:id - Obtener Cliente por id
router.get('/:id', clienteTemporalController.getClientById);

// PATCH /clients/:id - Actualizar Cliente (Checkout/Status)
router.patch('/:id', clienteTemporalController.updateClientStatus);

export default router;

