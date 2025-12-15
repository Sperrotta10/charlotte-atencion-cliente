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


