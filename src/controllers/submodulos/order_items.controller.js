import { OrderService } from '../../services/submodulos/order_items.service.js';
import { createOrderSchema, updateOrderSchema, getOrdersQuerySchema } from '../../schemas/submodulos/order_items.schema.js';

// 1. CREAR COMANDA (POST)
export const createOrder = async (req, res) => {
  try {
    // Validar Input
    const validation = createOrderSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: validation.error.format()
      });
    }

    // Ejecutar Lógica
    const result = await OrderService.create(validation.data);

    // RESPONDER (Formato estricto Req 1.3.1)
    res.status(201).json({
      id: result.id,
      status: result.status
    });

  } catch (error) {
    console.error(error);
    
    if (error.message.includes('No hay un cliente activo')) {
      return res.status(409).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: 'Error interno', error: error.message });
  }
};

// 2. ACTUALIZAR ESTADO (PATCH)
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const validation = updateOrderSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ success: false, errors: validation.error.format() });
    }

    const updatedOrder = await OrderService.updateStatus(id, validation.data.status);
    res.json({ success: true, message: 'Estado actualizado', data: updatedOrder });

  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Comanda no encontrada' });
    if (error.code === "ORDER_CANNOT_BE_CANCELLED") return res.status(409).json({ message: error.message });
    res.status(500).json({ message: 'Error actualizando', error: error.message });
  }
};

// 3. OBTENER POR ID (GET)
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await OrderService.findById(id);

    if (!order) return res.status(404).json({ success: false, message: 'Comanda no encontrada' });

    res.json({ success: true, data: order });

  } catch (error) {
    res.status(500).json({ message: 'Error al obtener', error: error.message });
  }
};


// 4. OBTENER LISTADO (GET /)
// -------------------------------------------------------
export const getAllOrders = async (req, res) => {
  try {
    // 1. Validar y procesar Query Params con Zod
    const validation = getOrdersQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Filtros inválidos',
        errors: validation.error.format()
      });
    }

    // 2. Llamar al servicio con los datos limpios
    const result = await OrderService.findAll(validation.data);

    // 3. Responder
    res.json({
      success: true,
      data: result.data,
      meta: result.meta
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener comandas', 
      error: error.message 
    });
  }
};