import { Router } from 'express';
import { 
  createOrder, 
  updateOrderStatus, 
  getOrderById, 
  getAllOrders 
} from '../../controllers/submodulos/order_items.controller.js';
import { ensureOwnership, verifyGuest, verifyGuestOrStaff} from "../../middlewares/auth.js"

const router = Router();

// POST / (Crear) (Guest Only)
router.post('/', verifyGuest, createOrder);

// GET / (Listar todas) (Guest: Ve SUS comandas. Staff: Ve TODAS.)
router.get('/', verifyGuestOrStaff(), getAllOrders);

// GET /:id (Ver una) (Guest: Solo si es suya. Staff: Cualquiera.)
router.get('/:id', verifyGuestOrStaff(), ensureOwnership('comanda'), getOrderById);

// PATCH /:id (Actualizar estado) (Guest: Solo CANCELLED (si pending). Staff: COOKING, DELIVERED.)
router.patch('/:id', verifyGuestOrStaff(), ensureOwnership('comanda'), updateOrderStatus);

export default router;