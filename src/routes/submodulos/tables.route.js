import { Router } from 'express';
import * as tablesController from '../../controllers/submodulos/tables.controller.js';
import { verifyStaff } from '../../middlewares/auth.js';

const router = Router();

// GET /tables - Obtener todas las mesas (Staff/Maître/Gerente con permiso READ)
router.get('/', verifyStaff('Table_atc', 'Read'), tablesController.getTables);

// POST /tables/verify-qr - Verificar Código QR (Acceso Cliente)
router.post('/verify-qr', tablesController.verifyQr);

// POST /tables - Crear nueva mesa (Gerente con permiso CREATE)
router.post('/', verifyStaff('Table_atc', 'Create'), tablesController.createTable);

// GET /tables/:id - Obtener mesa por ID (Staff/Gerente con permiso READ)
router.get('/:id', tablesController.getTableById);

// PATCH /tables/:id - Actualizar Estado Mesa (Maître/Staff con permiso UPDATE)
router.patch('/:id', verifyStaff('Table_atc', 'Update'), tablesController.updateTableStatus);

// DELETE /tables/:id - Soft Delete
router.delete('/:id', verifyStaff('Table_atc', 'Delete'), tablesController.deleteTable);

// PATCH /tables/:id/restore - Restore (Nuevo endpoint)
// Nota: El permiso podría ser 'Update' o 'Delete', depende de tu lógica. Usaré 'Update'.
router.patch('/:id/restore', verifyStaff('Table_atc', 'Update'), tablesController.restoreTable);

export default router;


