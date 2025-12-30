import { Router } from 'express';
// Importamos las funciones
import { createServiceRequest,
        attendServiceRequest,
        getServiceRequestById,
        getServiceRequests }
from '../../controllers/submodulos/service_request.controller.js';
import { verifyGuest, verifyStaff, ensureOwnership, verifyGuestOrStaff } from "../../middlewares/auth.js"

const router = Router();

// Definimos el POST a la raíz (que será /service-requests)
router.post('/', verifyGuest, createServiceRequest);

// GET a la raíz para listar todas (Staff Only - Dashboard)
router.get('/', verifyStaff('ServiceRequest_atc', 'Read'), getServiceRequests);

// PATCH /:id (Atender solicitud) (Staff marca ATTENDED. Guest marca CANCELLED.)
router.patch('/:id', verifyGuestOrStaff('ServiceRequest_atc', 'Update'), ensureOwnership('serviceRequest'), attendServiceRequest);

// GET /:id (Obtener detalle de solicitud) (Staff Only - Detalle)
router.get('/:id', verifyStaff('ServiceRequest_atc', 'Read'), getServiceRequestById);

export default router;

