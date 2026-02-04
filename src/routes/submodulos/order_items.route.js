import { Router } from 'express';
import {
  createOrder,
  updateOrderStatus,
  getOrderById,
  getAllOrders
} from '../../controllers/submodulos/order_items.controller.js';
import { ensureOwnership, verifyGuest, verifyGuestOrStaff } from "../../middlewares/auth.js"

const router = Router();

// POST / (Crear) (Guest Only)
router.post('/', verifyGuest, createOrder);

// GET / (Listar todas) (AUTH REMOVED - PUBLIC ACCESS)
router.get('/', getAllOrders);

// GET /:id (Ver una) (AUTH REMOVED - PUBLIC ACCESS)
router.get('/:id', getOrderById);

// PATCH /:id (Actualizar estado) (Guest: Solo CANCELLED (si pending). Staff: COOKING, DELIVERED.)
router.patch('/:id', updateOrderStatus);

export default router;