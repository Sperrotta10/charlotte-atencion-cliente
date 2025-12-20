import * as clienteTemporalService from '../../services/submodulos/cliente_temporal.service.js';
import { createSessionSchema } from '../../schemas/submodulos/cliente_temporal.schema.js';

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

    console.error('Error creando sesión:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

