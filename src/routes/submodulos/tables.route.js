import { Router } from 'express';
import * as tablesController from '../../controllers/submodulos/tables.controller.js';
import { verifyGuest, verifyStaff } from '../../middlewares/auth.js';

const router = Router();

// GET /tables - Obtener todas las mesas (Monitor de Sala)
router.get('/', tablesController.getTables);

// POST /tables/verify-qr - Verificar Código QR (Acceso Cliente)
router.post('/verify-qr', tablesController.verifyQr);

// POST /tables - Crear nueva mesa (PROTEGIDO: Solo staff con permiso Create)
router.post('/', verifyStaff({ resource: 'Table_atc', method: 'Create' }), tablesController.createTable);

// GET /tables/:id - Obtener mesa por ID
router.get('/:id', tablesController.getTableById);

// PATCH /tables/:id - Actualizar Estado Mesa
router.patch('/:id', tablesController.updateTableStatus);

// DELETE /tables/:id - Eliminar Mesa (PROTEGIDO: Solo staff con permiso Delete)
router.delete('/:id', verifyStaff({ resource: 'Table_atc', method: 'Delete' }), tablesController.deleteTable);

export default router;


