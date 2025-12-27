import { Router } from 'express';
import { 
  createOrder, 
  updateOrderStatus, 
  getOrderById, 
  getAllOrders 
} from '../../controllers/submodulos/order_items.controller.js';

const router = Router();

// POST / (Crear)
router.post('/', createOrder);

// GET / (Listar todas)
router.get('/', getAllOrders);

// GET /:id (Ver una)
router.get('/:id', getOrderById);

// PATCH /:id (Actualizar estado)
router.patch('/:id', updateOrderStatus);

export default router;