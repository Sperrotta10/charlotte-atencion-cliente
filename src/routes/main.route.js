import { Router } from 'express';
import tablesRoutes from './submodulos/tables.route.js';
import clienteTemporalRoutes from './submodulos/cliente_temporal.route.js';

const router = Router();

// Prefijo: /api/v1/atencion-cliente

// 1. Recurso: Mesas (/tables)
router.use('/tables', tablesRoutes);

// 2. Recurso: Clientes (/clients)
router.use('/clients', clienteTemporalRoutes);

export default router;

