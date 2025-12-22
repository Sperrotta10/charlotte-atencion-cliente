import { ServiceRequestService, getAllServiceRequests } from '../../services/submodulos/service_request.service.js';
import { 
  createServiceRequestSchema, 
  attendServiceRequestSchema, 
  getServiceRequestsQuerySchema 
} from '../../schemas/submodulos/service_request.schema.js';

// 1. POST: Crear Solicitud
export const createServiceRequest = async (req, res) => {
  try {
    // Validación con Zod
    const result = createServiceRequestSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: result.error.format()
      });
    }

    // Llamada al Service
    const newRequest = await ServiceRequestService.create(result.data);

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

// 2. GET: Listar Solicitudes con Filtros (ESTA ES LA VERSIÓN CORRECTA "ESTILO VÍCTOR")
// Reemplaza a la antigua función simple que tenías aquí.
export const getServiceRequests = async (req, res) => {
  try {
    // 1. Validar query params con Zod (Estilo Víctor: Validación estricta primero)
    const validation = getServiceRequestsQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({ 
        success: false,
        message: 'Parámetros de búsqueda inválidos',
        errors: validation.error.format() 
      });
    }

    // 2. Llamar al servicio de negocio pasando la data ya limpia y tipada
    // Nota: Usamos la función exportada individualmente, no el objeto ServiceRequestService
    const result = await getAllServiceRequests(validation.data);

    // 3. Formatear salida estándar
    return res.status(200).json({
      success: true,
      data: result.requests,
      metadata: result.metadata,
    });

  } catch (error) {
    console.error('Error obteniendo solicitudes:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor',
      error: error.message 
    });
  }
};

// 3. GET: Obtener por ID
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

// 4. PATCH: Atender Solicitud
export const attendServiceRequest = async (req, res) => {
  try {
    const { id } = req.params;

    // validar el body con Zod
    const result = attendServiceRequestSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos para atender la solicitud',
        errors: result.error.format()
      });
    }
    
    // Llamada al Service para actualizar
    const updatedRequest = await ServiceRequestService.markAsAttended(id, result.data);

    res.json({
      success: true,
      message: 'Solicitud atendida correctamente',
      data: updatedRequest
    });

  } catch (error) {
    console.error(error);
    // Prisma lanza un error específico si el registro no existe
    if (error.code === 'P2025') {
        return res.status(404).json({ success: false, message: 'Solicitud no encontrada para actualizar' });
    }
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la solicitud',
      error: error.message
    });
  }
};