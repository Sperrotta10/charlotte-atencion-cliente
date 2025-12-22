import { Router } from 'express';
// Importamos las funciones
import { createServiceRequest,
        attendServiceRequest,
        getServiceRequestById,
        getServiceRequests }
from '../../controllers/submodulos/service_request.controller.js';

const router = Router();

// Definimos el POST a la raíz (que será /service-requests)
router.post('/', createServiceRequest);

// GET a la raíz para listar todas
router.get('/', getServiceRequests);

// PATCH /:id (Atender solicitud)
// El ":id" indica que ese valor es variable (ej: /1, /2, /10)
router.patch('/:id', attendServiceRequest);

// GET /:id (Obtener detalle de solicitud)
router.get('/:id', getServiceRequestById);

export default router;

