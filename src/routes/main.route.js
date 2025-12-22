import { Router } from 'express';
// Asegúrate que esta ruta apunte a donde tienes tu archivo realmente:
import serviceRequestRoutes from './submodulos/service_request.route.js'; 
import tablesRoutes from './submodulos/tables.route.js';
import orderRoutes from './submodulos/order_items.route.js';

const router = Router();

// --- Definición de Rutas Hijas ---

// 1. Rutas de Mesas
router.use('/tables', tablesRoutes);

// 2. Rutas de Solicitudes 
router.use('/service-requests', serviceRequestRoutes);

router.use('/comandas', orderRoutes);

export default router;