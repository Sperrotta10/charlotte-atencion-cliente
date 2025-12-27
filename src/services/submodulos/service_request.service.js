import { prisma } from '../../db/client.js';

export const ServiceRequestService = {
  // 1. CREAR
  create: async (data) => {
    return await prisma.serviceRequest.create({
      data: {
        clienteId: 1, // ID Hardcodeado como pediste
        type: data.type,
        message: data.message
      }
    });
  },

  // 2. LISTAR TODAS
  findAll: async () => {
    return await prisma.serviceRequest.findMany();
  },

  // 3. BUSCAR POR ID (Nueva)
  findById: async (id) => {
    return await prisma.serviceRequest.findUnique({
      where: { id: Number(id) }
    });
  },

  // 4. ATENDER SOLICITUD (Nueva - Lógica de PATCH)
  markAsAttended: async (id, data) => {
    // 1. Buscar la solicitud actual para validar estado previo
    const currentRequest = await prisma.serviceRequest.findUnique({
      where: { id: Number(id) }
    });

    if (!currentRequest) {
      const error = new Error("Solicitud no encontrada");
      error.code = 'REQUEST_NOT_FOUND';
      throw error;
    }

    // 2. Validación de Regla de Negocio:
    // Solo se pueden modificar las solicitudes que están en estado PENDING.
    // No se puede cancelar ni re-atender una solicitud que ya fue cerrada.
    if (currentRequest.status !== 'PENDING') {
      const error = new Error(`No se puede modificar una solicitud que ya está en estado ${currentRequest.status}`);
      error.code = 'INVALID_STATE_CHANGE';
      throw error;
    }

    const newStatus = data.status;

    // 3. Preparar datos de actualización
    const updateData = {
      status: newStatus
    };

    // Lógica de Tiempos (KPI):
    // Si el nuevo estado es ATTENDED, marcamos la fecha de atención.
    // Si es CANCELLED, NO marcamos attendedAt (o podrías marcarlo si tu lógica de negocio considera la cancelación como "atención").
    // En este caso, asumiremos que solo ATTENDED lleva fecha.
    if (newStatus === 'ATTENDED') {
      updateData.attendedAt = new Date();
    }

    // 4. Ejecutar actualización en la base de datos
    const updatedRequest = await prisma.serviceRequest.update({
      where: { id: Number(id) },
      data: updateData
    });

    return updatedRequest;
  }
};

export const getAllServiceRequests = async ({ page, limit, status, type, table_id }) => {
  const skip = (page - 1) * limit;

  // A. CONSTRUCCIÓN DE FILTROS DINÁMICOS
  const where = {};
  if (status) where.status = status;
  if (type) where.type = type;
  
  // Filtro de mesa anidado (ServiceRequest -> Cliente -> Table)
  if (table_id) {
    where.cliente = {
      tableId: table_id
    };
  }

  // B. ORDENAMIENTO INTELIGENTE (Lógica de Víctor)
  let orderBy = {};
  if (status === 'PENDING') {
    // FIFO: Atender primero al que lleva más tiempo esperando (el más viejo arriba)
    orderBy = { createdAt: 'asc' };
  } else if (status === 'ATTENDED') {
    // LIFO: Ver primero los que acabo de cerrar (historial reciente)
    orderBy = { attendedAt: 'desc' };
  } else {
    // Default: Lo más nuevo primero
    orderBy = { createdAt: 'desc' };
  }

  // C. EJECUCIÓN (Transacción de Lectura)
  // Usamos Promise.all para hacer el count y el findMany en paralelo
  const [totalItems, requests] = await prisma.$transaction([
    prisma.serviceRequest.count({ where }),
    prisma.serviceRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      // REQUISITO: Relación anidada para obtener info de la mesa
      include: {
        cliente: {
          include: {
            table: true // Traemos el objeto Table completo
          }
        }
      }
    })
  ]);

  // D. MAPEO DE SALIDA (Data Shaping)
  // Transformamos el objeto de Prisma al formato EXACTO del requerimiento (snake_case)
  const formattedRequests = requests.map(req => ({
    id: req.id,
    type: req.type,
    message: req.message,
    status: req.status,
    
    // Timestamps sin procesar para métricas en frontend
    created_at: req.createdAt,
    attended_at: req.attendedAt,

    // Estructura table_info personalizada
    table_info: req.cliente?.table ? {
      id: req.cliente.table.id,
      number: req.cliente.table.number // Asumiendo que tu tabla 'mesas' tiene campo 'number'
    } : null
  }));

  return {
    requests: formattedRequests,
    totalItems
  };
};