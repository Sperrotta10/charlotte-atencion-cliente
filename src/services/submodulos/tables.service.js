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

// Lógica de negocio para obtener una mesa por ID
export const getTableById = async ({ id }) => {
  // 1. Buscar mesa por ID
  const table = await prisma.table.findUnique({
    where: { id },
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

  // 2. Si no existe: Error 404
  if (!table) {
    const error = new Error('Mesa no encontrada');
    error.code = 'TABLE_NOT_FOUND';
    throw error;
  }

  // 3. Formatear la mesa con active_sessions calculado
  const formattedTable = {
    id: table.id,
    table_number: table.tableNumber,
    qr_uuid: table.qrUuid,
    capacity: table.capacity,
    current_status: table.currentStatus,
    active_sessions: table.clientes.length, // Campo calculado
  };

  return formattedTable;
};

// Lógica de negocio para verificar código QR
export const verifyQr = async ({ qr_uuid }) => {
  // 1. Buscar mesa por qr_uuid
  const table = await prisma.table.findUnique({
    where: { qrUuid: qr_uuid },
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

  // 2. Si no existe: Error 404
  if (!table) {
    const error = new Error('Mesa no encontrada');
    error.code = 'TABLE_NOT_FOUND';
    throw error;
  }

  // 3. Si currentStatus == OUT_OF_SERVICE: Error 403
  if (table.currentStatus === 'OUT_OF_SERVICE') {
    const error = new Error('Mesa fuera de servicio');
    error.code = 'TABLE_OUT_OF_SERVICE';
    throw error;
  }

  // 4. Si currentStatus == AVAILABLE: Retorna action: "NEW_SESSION"
  if (table.currentStatus === 'AVAILABLE') {
    return {
      table_id: table.id,
      table_number: table.tableNumber,
      action: 'NEW_SESSION',
    };
  }

  // 5. Si currentStatus == OCCUPIED:
  if (table.currentStatus === 'OCCUPIED') {
    // Contar sesiones activas
    const sesionesActivas = table.clientes.length;

    // Si sesiones_activas >= table.capacity: Error 409 (Conflict)
    if (sesionesActivas >= table.capacity) {
      const error = new Error('Mesa llena');
      error.code = 'TABLE_FULL';
      throw error;
    }

    // Si hay cupo: Retorna action: "JOIN_SESSION"
    return {
      table_id: table.id,
      table_number: table.tableNumber,
      action: 'JOIN_SESSION',
    };
  }
};

// Lógica de negocio para actualizar estado de mesa
export const updateTableStatus = async ({ id, currentStatus }) => {
  // 1. Verificar que la mesa existe
  const table = await prisma.table.findUnique({
    where: { id },
    include: {
      clientes: {
        where: {
          status: 'ACTIVE', // Solo sesiones activas
        },
        select: {
          id: true,
        },
      },
    },
  });

  if (!table) {
    const error = new Error('Mesa no encontrada');
    error.code = 'TABLE_NOT_FOUND';
    throw error;
  }

  // 2. Si pasa a AVAILABLE, validar cierre de sesiones pendientes
  if (currentStatus === 'AVAILABLE') {
    const sesionesActivas = table.clientes.length;

    if (sesionesActivas > 0) {
      const error = new Error('No se puede cambiar el estado a AVAILABLE. Existen sesiones activas pendientes de cierre');
      error.code = 'ACTIVE_SESSIONS_PENDING';
      throw error;
    }
  }

  // 3. Actualizar el estado de la mesa
  const updatedTable = await prisma.table.update({
    where: { id },
    data: {
      currentStatus,
    },
  });

  return updatedTable;
};


