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
  // 1. Calcular el offset
  const skip = (page - 1) * limit;

  // 2. Construir el objeto where dinámico
  const where = {};

  if (status) {
    where.status = status;
  }

  if (type) {
    where.type = type;
  }

  // CORRECCIÓN CLAVE: Filtramos por mesa A TRAVÉS del cliente
  if (table_id) {
    where.cliente = {
      tableId: table_id
    };
  }

  // 3. Obtener el total (Count)
  const totalItems = await prisma.serviceRequest.count({ where });

  // 4. Obtener la data (FindMany)
  const requests = await prisma.serviceRequest.findMany({
    where,
    skip,
    take: limit,
    orderBy: {
      createdAt: 'desc',
    },
    // El include sigue la ruta ServiceRequest -> Cliente -> Table
    include: {
      cliente: {
        select: {
          id: true,
          customerName: true, // customerName
          table: {
            select: {
              tableNumber: true // tableNumber
            }
          }
        }
      }
    }
  });

  // 5. Calcular metadatos
  const totalPages = Math.ceil(totalItems / limit);

  return {
    requests,
    metadata: {
      total_items: totalItems,
      current_page: page,
      per_page: limit,
      total_pages: totalPages,
    },
  };
};