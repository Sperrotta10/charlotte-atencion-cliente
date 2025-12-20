import { prisma } from '../../db/client.js';
import { envs } from '../../config/envs.js';

/**
 * Solicita un token JWT al módulo de seguridad
 * @param {Object} payload - Datos para incluir en el token
 * @returns {Promise<string>} Token JWT
 */
const requestJwtToken = async (payload) => {
  const securityUrl = envs.CHARLOTTE_SECURITY_URL;
  
  if (!securityUrl) {
    throw new Error('CHARLOTTE_SECURITY_URL no está configurada');
  }

  const response = await fetch(`${securityUrl}/api/v1/security/token/sign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error al solicitar token JWT: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.token || data.session_token || data.access_token;
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
    customer_dni,
    module: 'atencion-cliente',
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

