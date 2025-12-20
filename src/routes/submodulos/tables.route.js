import { Router } from 'express';
import * as tablesController from '../../controllers/submodulos/tables.controller.js';

const router = Router();

// GET /tables - Obtener todas las mesas (Monitor de Sala)
router.get('/', tablesController.getTables);

// POST /tables/verify-qr - Verificar Código QR (Acceso Cliente)
router.post('/verify-qr', tablesController.verifyQr);

// POST /tables - Crear nueva mesa
router.post('/', tablesController.createTable);

// PATCH /tables/:id - Actualizar Estado Mesa
router.patch('/:id', tablesController.updateTableStatus);

export default router;


