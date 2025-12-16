import { Router } from 'express';
import * as tablesController from '../../controllers/submodulos/tables.controller.js';

const router = Router();

// GET /tables - Obtener todas las mesas (Monitor de Sala)
router.get('/', tablesController.getTables);

// POST /tables - Crear nueva mesa
router.post('/', tablesController.createTable);

export default router;


