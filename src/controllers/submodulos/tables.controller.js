import * as tablesService from '../../services/submodulos/tables.service.js';
import { createTableSchema } from '../../schemas/submodulos/tables.schema.js';

// POST /tables - Crear Mesa
export const createTable = async (req, res) => {
  try {
    // 1. Validar body con Zod
    const validation = createTableSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
    }

    // 2. Llamar al servicio de negocio
    const created = await tablesService.createTable(validation.data);

    // 3. Formatear salida según especificación del enunciado
    const responseBody = {
      id: created.id,
      table_number: created.tableNumber,
      qr_uuid: created.qrUuid,
      capacity: created.capacity,
    };

    return res.status(201).json(responseBody);
  } catch (error) {
    if (error.code === 'TABLE_NUMBER_ALREADY_EXISTS') {
      return res.status(409).json({ error: 'El número de mesa ya está registrado' });
    }

    console.error('Error creando mesa:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};


