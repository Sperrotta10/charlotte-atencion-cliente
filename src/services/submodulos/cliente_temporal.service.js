import { prisma } from '../../db/client.js';
import { envs } from '../../config/envs.js';
import jwt from 'jsonwebtoken';

/**
 * Solicita o Genera un token JWT.
 * LÓGICA HÍBRIDA:
 * - Desarrollo: Genera un JWT real firmado localmente (sin depender del servicio externo).
 * - Producción: Realiza la petición HTTP al módulo de seguridad para una firma centralizada.
 * * @param {Object} payload - Datos para incluir en el token
 * @returns {Promise<string>} Token JWT válido
 */
const requestJwtToken = async (payload) => {
  // 1. MODO DESARROLLO (Generación Local Real)
  if (envs.NODE_ENV === 'development') {
    console.log('🚧 [DEV MODE] Generando JWT localmente (Bypass de Seguridad)...');
    
    // Usamos una clave secreta de desarrollo.
    // NOTA: Asegúrate de que tu middleware de auth use esta misma clave en modo dev.
    const secret = envs.JWT_SECRET || 'charlotte-dev-secret-key-123';
    
    // Firmamos el token realmente. Esto crea un string "eyJ..." válido y decodificable.
    const token = jwt.sign(payload, secret, {
        expiresIn: '4h', // Duración típica de una cena
        algorithm: 'HS256'
    });

    return token;
  }

  // 2. MODO PRODUCCIÓN (Petición al Microservicio)
  const securityUrl = envs.CHARLOTTE_SECURITY_URL;
  
  if (!securityUrl) {
    throw new Error('CHARLOTTE_SECURITY_URL no está configurada en variables de entorno');
  }

  try {
    const response = await fetch(`${securityUrl}/api/seguridad/auth/clientSession`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'x-service-key': envs.SERVICE_KEY // Si se requiere en el futuro
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error S2S Seguridad: ${response.status} - ${errorText}`);
      throw new Error('El servicio de seguridad rechazó la solicitud de token');
    }

    const data = await response.json();
    
    // Soporte para diferentes estructuras de respuesta del módulo de seguridad
    return data.token || data.session_token || data.access_token;

  } catch (error) {
    console.error('Error crítico comunicando con Módulo de Seguridad:', error);
    // En producción no podemos "inventar" un token, debemos fallar si seguridad no responde.
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

  // 3. Solicitar token JWT al módulo de seguridad
  const jwtPayload = {
    table_id,
    customer_name,
    customer_dni
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

  // Validación: No permitir pedir cuenta o cerrar si el total es 0 o menor
  if ((data.status === 'BILL_REQUESTED' || data.status === 'CLOSED') && finalAmount <= 0) {
    const error = new Error('El monto total debe ser mayor a 0 para pedir cuenta o cerrar.');
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

