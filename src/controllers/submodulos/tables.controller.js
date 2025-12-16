import * as tablesService from '../../services/submodulos/tables.service.js';
import { createTableSchema, getTablesQuerySchema } from '../../schemas/submodulos/tables.schema.js';

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

// GET /tables - Obtener Todas las Mesas (Monitor de Sala)
export const getTables = async (req, res) => {
  try {
    // 1. Validar query params con Zod
    const validation = getTablesQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
    }

    // 2. Llamar al servicio de negocio
    const result = await tablesService.getAllTables(validation.data);

    // 3. Formatear salida según especificación del enunciado
    const responseBody = {
      success: true,
      data: result.tables,
      metadata: result.metadata,
    };

    return res.status(200).json(responseBody);
  } catch (error) {
    console.error('Error obteniendo mesas:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};


