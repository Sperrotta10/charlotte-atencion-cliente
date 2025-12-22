import { Router } from 'express';
import { createOrder, updateOrderStatus, getOrderById } from '../../controllers/submodulos/order_items.controller.js';

const router = Router();

// POST /api/v1/atencion-cliente/comandas
router.post('/', createOrder);

// PATCH /api/v1/atencion-cliente/comandas/:id
router.patch('/:id', updateOrderStatus);

// GET /:id
router.get('/:id', getOrderById);

export default router;