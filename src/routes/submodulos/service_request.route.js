import { Router } from 'express';
// Importamos las funciones
import {
        createServiceRequest,
        attendServiceRequest,
        getServiceRequestById,
        getServiceRequests
}
        from '../../controllers/submodulos/service_request.controller.js';
import { verifyGuest, ensureOwnership, verifyGuestOrStaff } from "../../middlewares/auth.js"

const router = Router();

// Definimos el POST a la raíz (que será /service-requests)
router.post('/', verifyGuest, createServiceRequest);

// GET a la raíz para listar todas (AUTH REMOVED - PUBLIC ACCESS)
router.get('/', getServiceRequests);

// PATCH /:id (Atender solicitud) (Staff marca ATTENDED. Guest marca CANCELLED.)
router.patch('/:id', verifyGuestOrStaff(), ensureOwnership('serviceRequest'), attendServiceRequest);

// GET /:id (Obtener detalle de solicitud) (AUTH REMOVED - PUBLIC ACCESS)
router.get('/:id', getServiceRequestById);

export default router;

