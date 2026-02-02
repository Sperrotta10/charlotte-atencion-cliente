import { Router } from 'express';
import tablesRoutes from './submodulos/tables.route.js';
import clienteTemporalRoutes from './submodulos/cliente_temporal.route.js';
import serviceRequestRoutes from './submodulos/service_request.route.js';
import orderRoutes from './submodulos/order_items.route.js';
import ratingsRoutes from './submodulos/ratings.route.js';
import kitchenWebhookRoutes from './submodulos/kitchen_webhook.route.js';
import { verifyGuest, verifyStaff } from '../middlewares/auth.js';

const router = Router();

// Prefijo: /api/v1/atencion-cliente

// ENDPOINTS DE PRUEBA DEL MIDDLEWARE (puedes eliminarlos después)
// GET /test-guest - Prueba verifyGuest
router.get('/test-guest', verifyGuest, (req, res) => {
  res.json({
    message: '✅ verifyGuest funcionó correctamente',
    user: req.user
  });
});

// GET /test-staff - Prueba verifyStaff básico
router.get('/test-staff', verifyStaff(), (req, res) => {
  res.json({
    message: '✅ verifyStaff funcionó correctamente',
    user: req.user
  });
});

// GET /test-staff-permission - Prueba verifyStaff con permisos específicos
router.get('/test-staff-permission', verifyStaff({ resource: 'Table_atc', method: 'Read' }), (req, res) => {
  res.json({
    message: '✅ verifyStaff con permisos funcionó correctamente',
    user: req.user
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

// 5. Rutas de calificaciones de mesero
router.use('/ratings', ratingsRoutes);

// 6. Webhooks desde Cocina (asignación/entrega por mesero)
router.use('/kitchen', kitchenWebhookRoutes);

export default router;
