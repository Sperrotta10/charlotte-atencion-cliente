import { prisma } from '../../db/client.js';

export const ServiceRequestService = {
  // 1. CREAR
  create: async (data) => {
    return await prisma.serviceRequest.create({
      data: {
        clienteId: data.clienteId, // ID 
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
    return await prisma.serviceRequest.update({
      where: { id: Number(id) },
      data: {
        status: data.status,
        attendedAt: new Date()
      }
    });
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