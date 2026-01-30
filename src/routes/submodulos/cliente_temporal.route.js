import { Router } from 'express';
import * as clienteTemporalController from '../../controllers/submodulos/cliente_temporal.controller.js';
import { verifyGuestOrStaff, ensureOwnership } from '../../middlewares/auth.js';

const router = Router();

// GET /clients - Obtener Clientes (Monitor de Sesiones y Fuente de Datos KPI) (KPI/Gerente - Staff READ)
router.get('/', verifyGuestOrStaff(), clienteTemporalController.getClients);

// GET /clients/active - Obtener Clientes Activos con Consumo Actual (Monitor de Sesiones)
router.get('/active', verifyGuestOrStaff(), clienteTemporalController.getActiveClients);

// POST /clients - Crear Sesión (Login)
router.post('/', clienteTemporalController.createSession);

// GET /clients/:id - Obtener Cliente por id (Cliente Temporal o Staff con permiso READ)
router.get('/:id', verifyGuestOrStaff(), clienteTemporalController.getClientById);

// PATCH /clients/:id - Actualizar Cliente (Checkout/Status) ("Guest pide cuenta (BILL_REQUESTED), Staff cierra (CLOSED)")
router.patch('/:id', verifyGuestOrStaff(), ensureOwnership('clienteTemporal'), clienteTemporalController.updateClientStatus);

// POST /clients/:id/force-close - Cierre forzado con limpieza (cliente + soporte + órdenes)
router.post('/:id/force-close', verifyGuestOrStaff(), ensureOwnership('clienteTemporal'), clienteTemporalController.forceCloseClient);

export default router;

