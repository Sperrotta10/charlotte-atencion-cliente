import { Router } from 'express';
import tablesRoutes from './submodulos/tables.route.js';

const router = Router();

// Prefijo: /api/v1/atencion-cliente

// 1. Recurso: Mesas (/tables)
router.use('/tables', tablesRoutes);

export default router;

