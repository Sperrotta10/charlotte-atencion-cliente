import { Router } from 'express';
// Importamos el controlador de mesas (asegúrate que este archivo exista también)
import * as tablesController from '../../controllers/submodulos/tables.controller.js';

const router = Router();

// --- Definición de rutas de Mesas ---

// GET /api/v1/atencion-cliente/tables
router.get('/', tablesController.getTables);

// POST /api/v1/atencion-cliente/tables/verify-qr
router.post('/verify-qr', tablesController.verifyQr);

// POST /api/v1/atencion-cliente/tables
router.post('/', tablesController.createTable);

export default router;