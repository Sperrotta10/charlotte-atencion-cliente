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
export const getAllTables = async ({ page, limit, status, archived = false }) => {
  const skip = (page - 1) * limit;

  // 1. DEFINIR EL ESTADO DE ACTIVIDAD
  // Si archived es true, buscamos las isActive: false.
  // Si archived es false, buscamos las isActive: true.
  const isActiveFilter = !archived; 

  const where = {
    isActive: isActiveFilter, // <--- AQUÍ ESTÁ LA MAGIA
  };

  // 2. Si hay filtro de estatus (ej: ver solo las "OUT_OF_SERVICE" eliminadas)
  if (status) {
    where.currentStatus = status;
  }

  // 3. Obtener total
  const totalItems = await prisma.table.count({ where });

  // 4. Obtener mesas
  const tables = await prisma.table.findMany({
    where,
    skip,
    take: limit,
    orderBy: {
      // OJO: Las eliminadas tendrán números negativos raros (-79283), 
      // así que quizás quieras ordenar por ID o por fecha de actualización
      tableNumber: 'asc', 
    },
    include: {
      clientes: {
        where: { status: 'ACTIVE' },
        select: { id: true },
      },
    },
  });

  // 5. Formatear
  const formattedTables = tables.map((table) => ({
    id: table.id,
    // Nota visual: Si es archivada, el número será negativo (ej: -7293).
    // Podrías formatearlo aquí si quisieras ocultar eso.
    table_number: table.tableNumber, 
    qr_uuid: table.qrUuid,
    capacity: table.capacity,
    current_status: table.currentStatus,
    active_sessions: table.clientes.length,
    is_active: table.isActive // Útil para que el frontend sepa qué está viendo
  }));

  const totalPages = Math.ceil(totalItems / limit);

  return {
    tables: formattedTables,
    metadata: {
      total_items: totalItems,
      current_page: page,
      per_page: limit,
      total_pages: totalPages,
      showing_archived: archived // Info extra para el frontend
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
export const updateTableStatus = async ({ id, currentStatus, capacity }) => {

  console.log('updateTableStatus called with:', { id, currentStatus, capacity });

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

  // Calculamos cuántas personas hay (reutilizable)
  const sesionesActivas = table.clientes.length;

  // 2. CASO A: Si pasa a AVAILABLE, validar cierre de sesiones pendientes
  if (currentStatus === 'AVAILABLE') {

    if (sesionesActivas > 0) {
      const error = new Error('No se puede cambiar el estado a AVAILABLE. Existen sesiones activas pendientes de cierre');
      error.code = 'ACTIVE_SESSIONS_PENDING';
      throw error;
    }
  }

  // 2. CASO B (NUEVO): Si pasa a OUT_OF_SERVICE, validar que esté vacía
  if (currentStatus === 'OUT_OF_SERVICE') {
    if (sesionesActivas > 0) {
      const error = new Error('No se puede inhabilitar una mesa con clientes activos. Espere a que se libere.');
      error.code = 'TABLE_OCCUPIED_MAINTENANCE'; // Nuevo código de error
      throw error;
    }
  }

  // Si hay gente sentada, la nueva capacidad no puede ser menor a la cantidad de gente
  if (sesionesActivas > 0) {
      if (capacity < sesionesActivas) {
          const error = new Error(`No se puede reducir la capacidad a ${capacity}. Hay ${sesionesActivas} clientes activos en la mesa.`);
          error.code = 'CAPACITY_CONFLICT';
          // Metadata útil para el frontend
          error.meta = { required: sesionesActivas, provided: capacity };
          throw error;
      }
  }

  // 3. Actualizar el estado de la mesa
  const updatedTable = await prisma.table.update({
    where: { id },
    data: {
      currentStatus,
      capacity,
    },
  });

  return updatedTable;
};

// Lógica de negocio para eliminar una mesa
// --- SOFT DELETE ---
export const deleteTable = async ({ id }) => {
  // 1. Buscar la mesa (incluso si ya está borrada, para validar)
  const table = await prisma.table.findUnique({
    where: { id },
    include: {
      clientes: {
        where: { status: 'ACTIVE' },
      },
    },
  });

  if (!table) {
    const error = new Error('Mesa no encontrada');
    error.code = 'TABLE_NOT_FOUND';
    throw error;
  }

  // 2. Si ya está eliminada, avisar
  if (!table.isActive) {
    const error = new Error('La mesa ya se encuentra eliminada.');
    error.code = 'TABLE_ALREADY_DELETED'; // Código personalizado
    throw error;
  }

  // 3. Validación: No borrar si hay gente
  if (table.clientes.length > 0) {
    const error = new Error('No se puede eliminar una mesa con sesiones activas.');
    error.code = 'ACTIVE_SESSIONS_EXIST';
    throw error;
  }

  // 4. GENERAR NÚMERO NEGATIVO (Solución al error de String vs Int)
  // Generamos un aleatorio para evitar colisiones si borras la mesa 7 cinco veces.
  // Ejemplo: Mesa 7 -> -74821
  const randomSuffix = Math.floor(Math.random() * 100000); 
  const deletedTableNumber = -1 * (Math.abs(table.tableNumber) + randomSuffix);

  // 5. EJECUTAR UPDATE (Soft Delete)
  const deletedTable = await prisma.table.update({
    where: { id },
    data: {
      isActive: false,                 // Ocultar
      currentStatus: 'OUT_OF_SERVICE', // Estado coherente
      tableNumber: deletedTableNumber, // Liberar el número positivo original
    },
  });

  // Retornamos el número original para que el mensaje al usuario sea amigable
  return { ...deletedTable, originalTableNumber: table.tableNumber };
};

// --- RESTORE (NUEVO) ---
export const restoreTable = async ({ id, newTableNumber }) => {
  // 1. Buscar la mesa eliminada (isActive: false)
  const table = await prisma.table.findUnique({
    where: { id },
  });

  if (!table) {
    const error = new Error('Mesa no encontrada');
    error.code = 'TABLE_NOT_FOUND';
    throw error;
  }

  if (table.isActive) {
    const error = new Error('La mesa ya está activa.');
    error.code = 'TABLE_ALREADY_ACTIVE';
    throw error;
  }

  // 2. Definir qué número de mesa usará
  // Si el usuario envió un número, usamos ese. Si no, intentamos recuperar el original (esto es riesgoso si ya se ocupó).
  // RECOMENDACIÓN: Obligar a enviar el nuevo número.
  
  if (!newTableNumber) {
    const error = new Error('Debes asignar un número de mesa para restaurarla.');
    error.code = 'MISSING_TABLE_NUMBER'; 
    throw error;
  }

  // 3. Validar que el número deseado no esté ocupado por otra mesa activa
  const conflict = await prisma.table.findFirst({
    where: {
      tableNumber: newTableNumber,
      isActive: true
    }
  });

  if (conflict) {
    const error = new Error(`El número de mesa ${newTableNumber} ya está en uso. Elige otro.`);
    error.code = 'TABLE_NUMBER_CONFLICT';
    throw error;
  }

  // 4. RESTAURAR
  const restoredTable = await prisma.table.update({
    where: { id },
    data: {
      isActive: true,
      currentStatus: 'AVAILABLE', // Nace disponible
      tableNumber: newTableNumber, // Asignamos el número limpio
    },
  });

  return restoredTable;
};


