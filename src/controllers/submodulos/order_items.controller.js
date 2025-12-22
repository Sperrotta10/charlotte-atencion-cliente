import { OrderService } from '../../services/submodulos/order_items.service.js';
import { createOrderSchema, updateOrderSchema } from '../../schemas/submodulos/order_items.schema.js';

export const createOrder = async (req, res) => {
  try {
    // 1. Validar Datos (Zod)
    const validation = createOrderSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: validation.error.format()
      });
    }

    // 2. Llamar al Servicio
    const result = await OrderService.create(validation.data);

    // 3. Responder Éxito (201 Created)
    res.status(201).json({
      success: true,
      message: 'Comanda creada correctamente',
      data: result
    });

  } catch (error) {
    console.error(error);
    
    // Manejo de error específico de lógica de negocio
    if (error.message.includes('No hay un cliente activo')) {
      return res.status(409).json({ // 409 Conflict
        success: false,
        message: error.message
      });
    }

    // Error genérico del servidor
    res.status(500).json({
      success: false,
      message: 'Error al procesar la comanda',
      error: error.message
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Validación Estricta con Zod
    const validation = updateOrderSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido',
        errors: validation.error.format()
      });
    }

    // 2. Llamada al Servicio (Lógica KPI interna)
    const updatedOrder = await OrderService.updateStatus(id, validation.data.status);

    res.json({
      success: true,
      message: 'Estado de comanda actualizado',
      data: updatedOrder
    });

  } catch (error) {
    console.error(error);

    // Manejo de error: Registro no encontrado (Prisma error P2025)
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Comanda no encontrada'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error actualizando la comanda',
      error: error.message
    });
  }
};
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Llamar al Servicio
    const order = await OrderService.findById(id);

    // 2. Validar Existencia (Lógica de Controlador)
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Comanda no encontrada'
      });
    }

    // 3. Responder
    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la comanda',
      error: error.message
    });
  }
};