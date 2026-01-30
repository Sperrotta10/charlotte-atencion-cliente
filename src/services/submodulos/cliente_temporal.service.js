import { prisma } from '../../db/client.js';
import { envs } from '../../config/envs.js';
import jwt from 'jsonwebtoken';

/**
 * Solicita o Genera un token JWT.
 * @param {Object} payload - Datos para incluir en el token
 * @returns {Promise<string>} Token JWT válido
 * @throws {Error} Si el módulo de seguridad rechaza la solicitud
 */
export const requestJwtToken = async (payload) => {
  // 1. MODO DESARROLLO (Bypass)
  if (envs.NODE_ENV === 'development') {
    console.log('🚧 [DEV MODE] Generando JWT localmente...');
    const secret = envs.JWT_SECRET || 'charlotte-dev-secret-key-123';
    return jwt.sign(payload, secret, {
        expiresIn: '4h',
        algorithm: 'HS256'
    });
  }

  // 2. MODO PRODUCCIÓN (Request S2S)
  const securityUrl = envs.CHARLOTTE_SECURITY_URL;
  if (!securityUrl) throw new Error('CHARLOTTE_SECURITY_URL no configurada');

  try {

    const response = await fetch(`${securityUrl}/api/seguridad/auth/clientSession`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // 3. MANEJO DE ERRORES DEL MÓDULO DE SEGURIDAD
    if (!response.ok) {
      // Leemos el JSON de error que nos manda Seguridad
      const errorData = await response.json(); 
      
      // Logueamos para nosotros (los devs)
      console.error(`❌ Seguridad rechazó token: ${response.status} - ${errorData.message}`);
      
      // Lanzamos un error con el mensaje EXACTO de Seguridad para mostrárselo al cliente
      // Ej: "customer_dni debe ser una cédula válida..."
      const error = new Error(errorData.message || 'Error de validación en seguridad');
      error.code = 'SECURITY_MODULE_REJECTION';
      error.statusCode = response.status; // Guardamos el status (400, 403, etc)
      throw error;
    }

    // 4. ÉXITO
    const data = await response.json();
    return data.token; // El controller de seguridad retorna { token: "..." }

  } catch (error) {
    // Si el error ya tiene código (lo lanzamos nosotros arriba), lo dejamos pasar
    if (error.code === 'SECURITY_MODULE_REJECTION') {
        throw error;
    }

    // Si es un error de red (fetch falló), lanzamos error genérico
    console.error('🔥 Error crítico comunicando con Módulo de Seguridad:', error);
    throw new Error('Servicio de autenticación no disponible temporalmente');
  }
};

/**
 * Crea una sesión de cliente temporal (login)
 * @param {Object} data - Datos del cliente: { table_id, customer_name, customer_dni }
 * @returns {Promise<Object>} Objeto con session_token y client
 */
export const createSession = async ({ table_id, customer_name, customer_dni }) => {
  // 1. Verificar que la mesa existe
  const table = await prisma.table.findUnique({
    where: { id: table_id },
  });

  if (!table) {
    const error = new Error('Mesa no encontrada');
    error.code = 'TABLE_NOT_FOUND';
    throw error;
  }

  // 2. Verificar que la mesa no esté fuera de servicio
  if (table.currentStatus === 'OUT_OF_SERVICE') {
    const error = new Error('La mesa está fuera de servicio');
    error.code = 'TABLE_OUT_OF_SERVICE';
    throw error;
  }

  // 3. Verificamos que la mesa no exceda su capacidad máxima
  const activeClientsCount = await prisma.clienteTemporal.count({
    where: { 
      tableId: table_id, 
      status: 'ACTIVE' 
    },
  });

  if (activeClientsCount >= table.capacity) {
    const error = new Error('La mesa ha alcanzado su capacidad máxima');
    error.code = 'TABLE_CAPACITY_EXCEEDED';
    throw error;
  }

  // 3. Solicitar token JWT al módulo de seguridad
  const jwtPayload = {
    table_id,
    customer_name,
    customer_dni,
    role: 'GUEST'
  };

  const sessionToken = await requestJwtToken(jwtPayload);

  // 4. Crear registro ClienteTemporal en una transacción
  const result = await prisma.$transaction(async (tx) => {
    // Crear el cliente temporal
    const clienteTemporal = await tx.clienteTemporal.create({
      data: {
        tableId: table_id,
        sessionToken,
        customerName: customer_name,
        customerDni: customer_dni,
        status: 'ACTIVE',
      },
    });

    // Actualizar mesa a OCCUPIED si estaba AVAILABLE
    if (table.currentStatus === 'AVAILABLE') {
      await tx.table.update({
        where: { id: table_id },
        data: { currentStatus: 'OCCUPIED' },
      });
    }

    return clienteTemporal;
  });

  // 5. Retornar respuesta formateada
  return {
    session_token: result.sessionToken,
    client: {
      id: result.id,
      name: result.customerName,
      status: result.status,
    },
  };
};

/**
 * Obtiene un cliente temporal por su ID
 * @param {number} id - ID del cliente temporal
 * @returns {Promise<Object>} Objeto con los datos del cliente
 */
export const getClientById = async (id) => {
  // 1. Buscar el cliente por ID
  const cliente = await prisma.clienteTemporal.findUnique({
    where: { id },
    include: {
      table: {
        select: {
          id: true,
          tableNumber: true,
          capacity: true,
          currentStatus: true,
        },
      },
    },
  });

  // 2. Si no existe, lanzar error
  if (!cliente) {
    const error = new Error('Cliente no encontrado');
    error.code = 'CLIENT_NOT_FOUND';
    throw error;
  }

  // 3. Retornar respuesta formateada
  return {
    id: cliente.id,
    name: cliente.customerName,
    dni: cliente.customerDni,
    status: cliente.status,
    table_id: cliente.tableId,
    table_number: cliente.table.tableNumber,
    total_amount: cliente.totalAmount,
    created_at: cliente.createdAt,
    closed_at: cliente.closedAt,
  };
};


/**
 * Actualiza el estado de un cliente temporal
 * @param {number} id - ID del cliente temporal
 * @param {string} status - Nuevo estado: 'BILL_REQUESTED' o 'CLOSED'
 * @returns {Promise<Object>} Objeto con los datos actualizados del cliente
 */
export const updateClientStatus = async (id, data) => {
  // 1. Verificar que el cliente existe y obtener información de la mesa
  const cliente = await prisma.clienteTemporal.findUnique({
    where: { id },
    include: {
      table: {
        select: {
          id: true,
          tableNumber: true,
        },
      },
    },
  });

  if (!cliente) {
    const error = new Error('Cliente no encontrado');
    error.code = 'CLIENT_NOT_FOUND';
    throw error;
  }

  // CORRECCIÓN 1: Determinar el monto final real
  // Si envían un monto nuevo, usamos ese. Si no, usamos el que ya estaba en BD.
  const finalAmount = data.total_amount !== undefined ? data.total_amount : cliente.totalAmount;

  /*
  // Validación: No permitir pedir cuenta o cerrar si el total es 0 o menor
  if ((data.status === 'BILL_REQUESTED' || data.status === 'CLOSED') && finalAmount <= 0) {
    const error = new Error('El monto total debe ser mayor a 0 para pedir cuenta o cerrar.');
    error.code = 'ZERO_AMOUNT_ERROR';
    throw error;
  }
  */

  if (data.status === 'BILL_REQUESTED' && finalAmount <= 0) {
    const error = new Error('No hay monto pendiente para pedir la cuenta.');
    error.code = 'ZERO_AMOUNT_ERROR';
    throw error;
  }

  const { status } = data;

  // CORRECCIÓN 2: Construir objeto de actualización plano
  // No usar { data }, sino asignar propiedades directas
  const updateData = { status };

  // Si nos enviaron un monto nuevo, lo guardamos
  if (data.total_amount !== undefined) {
    updateData.totalAmount = data.total_amount;
  }

  // 3. Si el estado es CLOSED, establecer closedAt
  if (status === 'CLOSED') {
    updateData.closedAt = new Date();
  }

  // 4. Ejecutar actualización y lógica de auto-liberación en una transacción
  let mesaLiberada = false;
  
  const result = await prisma.$transaction(async (tx) => {
    // Actualizar el cliente
    const updatedCliente = await tx.clienteTemporal.update({
      where: { id },
      data: updateData, // Ahora sí tiene el formato correcto
    });

    // Si el estado es CLOSED, verificar si hay que liberar la mesa
    if (status === 'CLOSED') {
      // Contar cuántos clientes quedan en esa misma table_id con estado ACTIVE o BILL_REQUESTED
      const remainingClients = await tx.clienteTemporal.count({
        where: {
          tableId: cliente.tableId,
          status: {
            in: ['ACTIVE', 'BILL_REQUESTED'],
          },
        },
      });

      // Si el conteo es 0 (es el último cliente), actualizar automáticamente la tabla a AVAILABLE
      if (remainingClients === 0) {
        await tx.table.update({
          where: { id: cliente.tableId },
          data: { currentStatus: 'AVAILABLE' },
        });
        mesaLiberada = true;
      }
    }

    return updatedCliente;
  });

  // 5. Determinar mensaje de respuesta
  let message = 'Estado actualizado correctamente.';
  if (status === 'BILL_REQUESTED') {
    message = `Mesa ${cliente.table.tableNumber} pide cuenta. Total: $${finalAmount}`;
  } else if (status === 'CLOSED') {
    if (mesaLiberada) {
      message = 'Cliente cerrado exitosamente. Mesa liberada.';
    } else {
      message = 'Cliente cerrado exitosamente.';
    }
  }

  // 6. Retornar respuesta formateada
  return {
    success: true,
    message,
    data: {
      id: result.id,
      status: result.status,
      total_amount: result.totalAmount, // Retornamos el monto confirmado
      closed_at: result.closedAt,
      table_released: mesaLiberada // Dato útil para debug
    },
  };
};

/**
 * Cierre forzado de sesión de cliente con limpieza asociada
 * - Marca cliente como CLOSED y setea closedAt
 * - Cancela solicitudes de soporte en estado PENDING
 * - Cancela comandas en estados PENDING/COOKING
 * - Libera la mesa si no quedan clientes ACTIVE/BILL_REQUESTED
 * @param {number} id - ID del cliente temporal
 * @returns {Promise<Object>} Resumen de la operación
 */
export const forceCloseClient = async (id) => {
  // Verificar existencia del cliente y datos de mesa
  const cliente = await prisma.clienteTemporal.findUnique({
    where: { id },
    include: {
      table: {
        select: { id: true, tableNumber: true },
      },
    },
  });

  if (!cliente) {
    const error = new Error('Cliente no encontrado');
    error.code = 'CLIENT_NOT_FOUND';
    throw error;
  }

  let mesaLiberada = false;

  const result = await prisma.$transaction(async (tx) => {
    // 1) Cancelar solicitudes de soporte PENDING del cliente
    const cancelledRequests = await tx.serviceRequest.updateMany({
      where: { clienteId: id, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });

    // 2) Cancelar órdenes en progreso (PENDING/COOKING)
    const cancelledOrders = await tx.comanda.updateMany({
      where: { clienteId: id, status: { in: ['PENDING', 'COOKING'] } },
      data: { status: 'CANCELLED' },
    });

    // 3) Cerrar cliente
    const closedClient = await tx.clienteTemporal.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date() },
    });

    // 4) Liberar mesa si no quedan clientes activos o pidiendo cuenta
    const remaining = await tx.clienteTemporal.count({
      where: {
        tableId: cliente.tableId,
        status: { in: ['ACTIVE', 'BILL_REQUESTED'] },
      },
    });

    if (remaining === 0) {
      await tx.table.update({
        where: { id: cliente.tableId },
        data: { currentStatus: 'AVAILABLE' },
      });
      mesaLiberada = true;
    }

    return {
      closedClient,
      cancelledRequestsCount: cancelledRequests.count,
      cancelledOrdersCount: cancelledOrders.count,
    };
  });

  return {
    success: true,
    message: `Sesión cerrada y limpiada. Mesa ${cliente.table.tableNumber}${mesaLiberada ? ' liberada' : ''}.`,
    data: {
      client_id: result.closedClient.id,
      table_id: cliente.tableId,
      table_number: cliente.table.tableNumber,
      cancelled_requests: result.cancelledRequestsCount,
      cancelled_orders: result.cancelledOrdersCount,
      table_released: mesaLiberada,
    },
  };
};

/**
 * Obtiene una lista paginada de clientes con filtros opcionales
 * @param {Object} filters - Filtros de búsqueda: { page, limit, status, date_from, date_to, min_amount }
 * @returns {Promise<Object>} Objeto con datos paginados y metadatos
 */
export const getClients = async ({ page = 1, limit = 10, status, date_from, date_to, min_amount }) => {
  // 1. Construir filtros dinámicos
  const where = {};

  // Filtro por status
  if (status) {
    where.status = status;
  }

  // Filtro por monto mínimo
  if (min_amount !== undefined && min_amount !== null) {
    where.totalAmount = {
      gte: min_amount,
    };
  }

  // Filtro temporal (rango de fechas sobre createdAt)
  if (date_from || date_to) {
    where.createdAt = {};
    if (date_from) {
      where.createdAt.gte = date_from;
    }
    if (date_to) {
      // Incluir todo el día hasta las 23:59:59
      const endDate = new Date(date_to);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = endDate;
    }
  }

  // 2. Calcular skip y take para paginación
  const skip = (page - 1) * limit;
  const take = limit;

  // 3. Determinar ordenamiento
  let orderBy = {};
  if (status === 'ACTIVE') {
    // Orden ascendente (FIFO) para priorizar mesas con más tiempo de espera
    orderBy = { createdAt: 'asc' };
  } else if (status === 'CLOSED') {
    // Orden descendente para mostrar los cierres más recientes
    orderBy = { closedAt: 'desc' };
  } else {
    // Por defecto, orden descendente por fecha de creación
    orderBy = { createdAt: 'desc' };
  }

  // 4. Ejecutar consulta con conteo total y datos paginados
  const [totalItems, clients] = await Promise.all([
    prisma.clienteTemporal.count({ where }),
    prisma.clienteTemporal.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        table: {
          select: {
            id: true,
            tableNumber: true,
            capacity: true,
          },
        },
      },
    }),
  ]);

  // 5. Calcular metadatos
  const totalPages = Math.ceil(totalItems / limit);
  const totalSalesInPage = clients.reduce((sum, client) => sum + (client.totalAmount || 0), 0);

  // 6. Formatear respuesta según especificación
  return {
    success: true,
    data: clients.map((client) => ({
      id: client.id,
      customer_name: client.customerName,
      status: client.status,
      total_amount: client.totalAmount,
      created_at: client.createdAt,
      closed_at: client.closedAt,
      table: {
        id: client.table.id,
        table_number: client.table.tableNumber,
        capacity: client.table.capacity,
      },
    })),
    meta: {
      total_items: totalItems,
      current_page: page,
      per_page: limit,
      total_pages: totalPages,
      total_sales_in_page: totalSalesInPage,
    },
  };
};

