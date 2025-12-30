import { ServiceRequestService, getAllServiceRequests } from '../../services/submodulos/service_request.service.js';
import { 
  createServiceRequestSchema, 
  attendServiceRequestSchema, 
  getServiceRequestsQuerySchema 
} from '../../schemas/submodulos/service_request.schema.js';

// -------------------------------------------------------
// 1. POST: Crear Solicitud (ACCESO: CLIENTES - GUEST)
// -------------------------------------------------------
export const createServiceRequest = async (req, res) => {
  try {
    // A. Validación de inputs (Body) con Zod
    const result = createServiceRequestSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: result.error.format()
      });
    }

    // B. SEGURIDAD: Obtener ID real del cliente desde el Token
    // El middleware 'verifyGuest' asegura que req.guest existe.
    if (!req.guest || !req.guest.id) {
      return res.status(401).json({ 
        success: false, 
        message: 'No se pudo identificar al cliente. Escanee el QR nuevamente.' 
      });
    }

    // C. Preparar datos para el servicio (Sin hardcode)
    // Combinamos el mensaje del usuario con el ID de su sesión
    const dataWithClient = {
      ...result.data,         // type, message
      clienteId: req.guest.id // <--- DATO REAL DEL TOKEN
    };

    // D. Llamada al Service
    const newRequest = await ServiceRequestService.create(dataWithClient);

    res.status(201).json({
      success: true,
      data: newRequest
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la solicitud',
      error: error.message
    });
  }
};

// -------------------------------------------------------
// 2. GET: Listar Solicitudes (ACCESO: STAFF)
// -------------------------------------------------------
export const getServiceRequests = async (req, res) => {
  try {
    // Validar Query Params (paginación, filtros)
    const validation = getServiceRequestsQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Filtros inválidos',
        errors: validation.error.format()
      });
    }

    // Llamar a la función de búsqueda avanzada del servicio
    const result = await getAllServiceRequests(validation.data);

    res.json({
      success: true,
      data: result.data,
      meta: result.meta
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al obtener solicitudes', error: error.message });
  }
};

// -------------------------------------------------------
// 3. GET /:id: Ver Detalle (ACCESO: STAFF)
// -------------------------------------------------------
export const getServiceRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await ServiceRequestService.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// -------------------------------------------------------
// 4. PATCH: Atender Solicitud (ACCESO: STAFF)
// -------------------------------------------------------
export const attendServiceRequest = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar que el status sea ATTENDED
    const result = attendServiceRequestSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: result.error.format()
      });
    }
    
    // Actualizar en DB
    const updatedRequest = await ServiceRequestService.markAsAttended(id, result.data);

    res.json({
      success: true,
      message: 'Solicitud atendida correctamente',
      data: updatedRequest
    });

  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }
    res.status(500).json({ success: false, message: 'Error al actualizar', error: error.message });
  }
};