import { Router } from 'express';
import { 
  createOrder, 
  updateOrderStatus, 
  getOrderById, 
  getAllOrders 
} from '../../controllers/submodulos/order_items.controller.js';
import { verifyGuest, verifyStaff } from '../../middlewares/auth.js';

const router = Router();

// ---------------------------------------------------------
// 1. RUTA PÚBLICA (Solo Clientes con Token de Mesa)
// ---------------------------------------------------------
// POST / (Crear Comanda)
// Usa verifyGuest para poblar req.guest
router.post('/', verifyGuest, createOrder);

// ---------------------------------------------------------
// 2. RUTAS PRIVADAS (Solo Personal / Staff)
// ---------------------------------------------------------
// Nota: El primer parámetro ('Comandas') debe coincidir con el nombre 
// del recurso en tu base de datos de permisos.

// GET / (Listar todas - Cocina KDS y Meseros)
router.get('/', verifyStaff('Comandas', 'Read'), getAllOrders);

// GET /:id (Ver detalle de una orden)
router.get('/:id', verifyStaff('Comandas', 'Read'), getOrderById);

// PATCH /:id (Actualizar estado - Cocina marca plato listo)
router.patch('/:id', verifyStaff('Comandas', 'Update'), updateOrderStatus);

export default router;