<<<<<<< HEAD
import * as tablesService from '../../services/submodulos/tables.service.js';
import { createTableSchema, getTablesQuerySchema, verifyQrSchema, updateTableStatusSchema, tableIdParamSchema } from '../../schemas/submodulos/tables.schema.js';

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

// GET /tables/:id - Obtener Mesa por ID
export const getTableById = async (req, res) => {
  try {
    // 1. Validar parámetro ID de la ruta
    const idValidation = tableIdParamSchema.safeParse(req.params);

    if (!idValidation.success) {
      return res.status(400).json({ errors: idValidation.error.format() });
    }

    // 2. Llamar al servicio de negocio
    const table = await tablesService.getTableById({ id: idValidation.data.id });

    // 3. Formatear salida según especificación
    return res.status(200).json(table);
  } catch (error) {
    // Manejo de errores específicos
    if (error.code === 'TABLE_NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }

    console.error('Error obteniendo mesa por ID:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST /tables/verify-qr - Verificar Código QR (Acceso Cliente)
export const verifyQr = async (req, res) => {
  try {
    // 1. Validar body con Zod
    const validation = verifyQrSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
    }

    // 2. Llamar al servicio de negocio
    const result = await tablesService.verifyQr(validation.data);

    // 3. Retornar respuesta según especificación
    return res.status(200).json(result);
  } catch (error) {
    // Manejo de errores específicos
    if (error.code === 'TABLE_NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }

    if (error.code === 'TABLE_OUT_OF_SERVICE') {
      return res.status(403).json({ error: error.message });
    }

    if (error.code === 'TABLE_FULL') {
      return res.status(409).json({ error: error.message });
    }

    console.error('Error verificando QR:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// PATCH /tables/:id - Actualizar Estado Mesa
export const updateTableStatus = async (req, res) => {
  try {
    // 1. Validar parámetro ID de la ruta
    const idValidation = tableIdParamSchema.safeParse(req.params);

    if (!idValidation.success) {
      return res.status(400).json({ errors: idValidation.error.format() });
    }

    // 2. Validar body con Zod
    const bodyValidation = updateTableStatusSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return res.status(400).json({ errors: bodyValidation.error.format() });
    }

    // 3. Llamar al servicio de negocio
    const updated = await tablesService.updateTableStatus({
      id: idValidation.data.id,
      currentStatus: bodyValidation.data.currentStatus,
    });

    // 4. Formatear salida según especificación
    const responseBody = {
      id: updated.id,
      table_number: updated.tableNumber,
      qr_uuid: updated.qrUuid,
      capacity: updated.capacity,
      current_status: updated.currentStatus,
    };

    return res.status(200).json(responseBody);
  } catch (error) {
    // Manejo de errores específicos
    if (error.code === 'TABLE_NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }

    if (error.code === 'ACTIVE_SESSIONS_PENDING') {
      return res.status(409).json({ error: error.message });
    }

    // Error cuando intentan poner en mantenimiento una mesa ocupada
    if (error.code === 'TABLE_OCCUPIED_MAINTENANCE') {
      return res.status(409).json({ 
        error: 'Conflicto Operativo', 
        message: error.message 
      });
    }

    console.error('Error actualizando estado de mesa:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// DELETE /tables/:id - Eliminar Mesa
export const deleteTable = async (req, res) => {
  try {
    // 1. Validar parámetro ID de la ruta
    const idValidation = tableIdParamSchema.safeParse(req.params);

    if (!idValidation.success) {
      return res.status(400).json({ errors: idValidation.error.format() });
    }

    // 2. Llamar al servicio de negocio
    const deleted = await tablesService.deleteTable({ id: idValidation.data.id });

    // 3. Formatear salida según especificación
    const responseBody = {
      success: true,
      message: `Mesa ${deleted.tableNumber} eliminada correctamente del inventario.`,
    };

    return res.status(200).json(responseBody);
  } catch (error) {
    // Manejo de errores específicos
    if (error.code === 'TABLE_NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }

    if (error.code === 'TABLE_OCCUPIED' || error.code === 'ACTIVE_SESSIONS_EXIST') {
      return res.status(409).json({ error: error.message });
    }

    if (error.code === 'TABLE_OUT_OF_SERVICE') {
      return res.status(409).json({ error: error.message });
    }

    console.error('Error eliminando mesa:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};


=======
export const getTables = (req, res) => res.json({ message: "Listar mesas" });
export const verifyQr = (req, res) => res.json({ message: "Verificar QR" });
export const createTable = (req, res) => res.json({ message: "Crear mesa" });
>>>>>>> anibal
