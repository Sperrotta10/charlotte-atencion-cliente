import { prisma } from '../../db/client.js';
import crypto from 'node:crypto';

// Lógica de negocio para crear una mesa
export const createTable = async ({ table_number, capacity }) => {
  // 1. Validar unicidad de table_number
  const existingTable = await prisma.table.findUnique({
    where: { tableNumber: table_number },
  });

  if (existingTable) {
    const error = new Error('El número de mesa ya existe');
    error.code = 'TABLE_NUMBER_ALREADY_EXISTS';
    throw error;
  }

  // 2. Generar UUID seguro (simula módulo de seguridad)
  const qrUuid = crypto.randomUUID();

  // 3. Persistir en BD con estado AVAILABLE (por defecto en el modelo)
  const newTable = await prisma.table.create({
    data: {
      tableNumber: table_number,
      capacity,
      qrUuid,
      // currentStatus: 'AVAILABLE', // opcional, ya es default en el schema
    },
  });

  return newTable;
};

// Lógica de negocio para obtener todas las mesas con paginación
export const getAllTables = async ({ page, limit, status }) => {
  // 1. Calcular el offset usando la fórmula: (page - 1) * limit
  const skip = (page - 1) * limit;

  // 2. Construir el filtro where
  const where = {};
  if (status) {
    where.currentStatus = status;
  }

  // 3. Obtener el total de items para los metadatos
  const totalItems = await prisma.table.count({ where });

  // 4. Obtener las mesas con paginación
  const tables = await prisma.table.findMany({
    where,
    skip,
    take: limit,
    orderBy: {
      tableNumber: 'asc',
    },
    include: {
      clientes: {
        where: {
          status: 'ACTIVE', // Solo contar sesiones activas
        },
        select: {
          id: true, // Solo necesitamos el id para contar
        },
      },
    },
  });

  // 5. Formatear las mesas con active_sessions calculado
  const formattedTables = tables.map((table) => ({
    id: table.id,
    table_number: table.tableNumber,
    qr_uuid: table.qrUuid,
    capacity: table.capacity,
    current_status: table.currentStatus,
    active_sessions: table.clientes.length, // Campo calculado
  }));

  // 6. Calcular metadatos de paginación
  const totalPages = Math.ceil(totalItems / limit);

  return {
    tables: formattedTables,
    metadata: {
      total_items: totalItems,
      current_page: page,
      per_page: limit,
      total_pages: totalPages,
    },
  };
};


