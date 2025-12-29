import { Router } from 'express';
import * as clienteTemporalController from '../../controllers/submodulos/cliente_temporal.controller.js';
import { verifyGuestOrStaff, verifyStaff } from '../../middlewares/auth.js';

const router = Router();

// GET /clients - Obtener Clientes (Monitor de Sesiones y Fuente de Datos KPI) (KPI/Gerente - Staff READ)
router.get('/', verifyStaff('ClienteTemporal_atc', 'Read'), clienteTemporalController.getClients);

// POST /clients - Crear Sesión (Login)
router.post('/', clienteTemporalController.createSession);

// GET /clients/:id - Obtener Cliente por id (Cliente Temporal o Staff con permiso READ)
router.get('/:id', verifyGuestOrStaff('ClienteTemporal_atc', 'Read'), 
  
  (req, res, next) => {
     if (req.userType === 'GUEST' && req.params.id != req.guest.id) { // int vs string check
        return res.status(403).json({ message: 'Solo puedes ver tu perfil'});
     }
     next();
  },
    clienteTemporalController.getClientById);

// PATCH /clients/:id - Actualizar Cliente (Checkout/Status) ("Guest pide cuenta (BILL_REQUESTED), Staff cierra (CLOSED)")
router.patch('/:id', verifyGuestOrStaff('ClienteTemporal_atc', 'Update'), clienteTemporalController.updateClientStatus);
// Dentro del controlador harás: 
// if (req.userType === 'GUEST') solo permite status = 'BILL_REQUESTED'
// if (req.userType === 'STAFF') permite status = 'CLOSED'

export default router;

