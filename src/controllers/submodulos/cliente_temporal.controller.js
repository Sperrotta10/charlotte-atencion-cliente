import * as clienteTemporalService from '../../services/submodulos/cliente_temporal.service.js';
import { createSessionSchema, clientIdParamSchema, updateStatusSchema, getClientsQuerySchema } from '../../schemas/submodulos/cliente_temporal.schema.js';

// GET /clients - Obtener Clientes (Monitor de Sesiones y Fuente de Datos KPI)
export const getClients = async (req, res) => {
  try {
    // 1. Validar query params con Zod
    const validation = getClientsQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
    }

    // 2. Llamar al servicio de negocio
    const result = await clienteTemporalService.getClients(validation.data);

    // 3. Retornar respuesta según especificación
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST /clients - Crear Sesión (Login)
export const createSession = async (req, res) => {
  try {
    // 1. Validar body con Zod
    const validation = createSessionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
    }

    // 2. Llamar al servicio de negocio
    const result = await clienteTemporalService.createSession(validation.data);

    // 3. Retornar respuesta según especificación
    return res.status(201).json(result);
  } catch (error) {
    // Manejo de errores específicos
    if (error.code === 'TABLE_NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }

    if (error.code === 'TABLE_OUT_OF_SERVICE') {
      return res.status(403).json({ error: error.message });
    }

    // Error de validación del Módulo de Seguridad (Ej: DNI malo)
    if (error.code === 'SECURITY_MODULE_REJECTION') {
        return res.status(error.statusCode || 400).json({
            error: 'Error de Validación',
            message: error.message
        });
    }

    // Error cuando excede el límite de sesiones por mesa
    if (error.code === 'TABLE_CAPACITY_EXCEEDED') {
      return res.status(429).json({ error: error.message });
    }

    console.error('Error creando sesión:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// GET /clients/:id - Obtener Cliente por id
export const getClientById = async (req, res) => {
  try {
    // 1. Validar parámetro ID de la ruta
    const idValidation = clientIdParamSchema.safeParse(req.params);

    if (!idValidation.success) {
      return res.status(400).json({ errors: idValidation.error.format() });
    }

    // 2. Llamar al servicio de negocio
    const result = await clienteTemporalService.getClientById(idValidation.data.id);

    // 3. Retornar respuesta según especificación
    return res.status(200).json(result);
  } catch (error) {
    // Manejo de errores específicos
    if (error.code === 'CLIENT_NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }

    console.error('Error obteniendo cliente:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// PATCH /clients/:id - Actualizar Cliente (Checkout/Status)
export const updateClientStatus = async (req, res) => {
  try {
    // 1. Validar parámetro ID de la ruta
    const idValidation = clientIdParamSchema.safeParse(req.params);

    if (!idValidation.success) {
      return res.status(400).json({ errors: idValidation.error.format() });
    }

    // 2. Validar body con Zod
    const bodyValidation = updateStatusSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return res.status(400).json({ errors: bodyValidation.error.format() });
    }

    /*
    // 3. Validar permisos según tipo de usuario
    if (bodyValidation.data.status) {
        if (req.userType === 'GUEST') {
          // Excepción: Si el monto es 0 (canceló todo), permitimos CLOSED
          // Asumiendo que finalAmount ya lo calculaste o validaste arriba
          const isZeroAmount = (bodyValidation.data.total_amount === 0);

          if (bodyValidation.data.status === 'CLOSED' && !isZeroAmount) {
              return res.status(403).json({ 
                  error: 'Acceso denegado', 
                  message: 'No puedes cerrar una mesa con deuda pendiente. Solicita la cuenta.' 
              });
          }
          
          // Si no es 0 y no es BILL_REQUESTED, bloquear
          if (bodyValidation.data.status !== 'BILL_REQUESTED' && bodyValidation.data.status !== 'CLOSED') {
              return res.status(403).json({ error: 'Acceso denegado' });
          }
      }

      if (req.userType === 'STAFF' && bodyValidation.data.status !== 'CLOSED') {
        return res.status(403).json({ 
          error: 'Acceso denegado', 
          message: 'El personal solo puede cerrar sesiones (CLOSED)' 
        });
      }
    }
    */

    // 4. Llamar al servicio de negocio
    const result = await clienteTemporalService.updateClientStatus(
      idValidation.data.id,
      bodyValidation.data
    );

    // 5. Retornar respuesta según especificación
    return res.status(200).json(result);
  } catch (error) {
    // Manejo de errores específicos
    if (error.code === 'CLIENT_NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }

    if (error.code === 'ZERO_AMOUNT_ERROR') {
      return res.status(400).json({ error: error.message });
    }

    console.error('Error actualizando estado del cliente:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

