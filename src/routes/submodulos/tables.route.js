import { Router } from 'express';
import * as tablesController from '../../controllers/submodulos/tables.controller.js';

const router = Router();

// POST /tables - Crear nueva mesa
router.post('/', tablesController.createTable);

export default router;


