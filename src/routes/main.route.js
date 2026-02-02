import { Router } from 'express';
import tablesRoutes from './submodulos/tables.route.js';
import clienteTemporalRoutes from './submodulos/cliente_temporal.route.js';
import serviceRequestRoutes from './submodulos/service_request.route.js';
import orderRoutes from './submodulos/order_items.route.js';
import { verifyGuest, verifyStaff } from '../middlewares/auth.js';

const router = Router();

// Prefijo: /api/v1/atencion-cliente

// ENDPOINTS DE PRUEBA DEL MIDDLEWARE (puedes eliminarlos después)
// GET /test-guest - Prueba verifyGuest (AUTH REMOVED - PUBLIC ACCESS)
router.get('/test-guest', (req, res) => {
  res.json({
    message: '✅ verifyGuest funcionó correctamente (now public)',
    user: req.user || null
  });
});

// GET /test-staff - Prueba verifyStaff básico (AUTH REMOVED - PUBLIC ACCESS)
router.get('/test-staff', (req, res) => {
  res.json({
    message: '✅ verifyStaff funcionó correctamente (now public)',
    user: req.user || null
  });
});

// GET /test-staff-permission - Prueba verifyStaff con permisos específicos (AUTH REMOVED - PUBLIC ACCESS)
router.get('/test-staff-permission', (req, res) => {
  res.json({
    message: '✅ verifyStaff con permisos funcionó correctamente (now public)',
    user: req.user || null
  });
});

// 1. Recurso: Mesas (/tables)
router.use('/tables', tablesRoutes);

// 2. Recurso: Clientes (/clients)
router.use('/clients', clienteTemporalRoutes);

// 3. Rutas de servicio de solicitudes 
router.use('/service-requests', serviceRequestRoutes);

// 4. Rutas de gestión de comandas
router.use('/comandas', orderRoutes);

export default router;
