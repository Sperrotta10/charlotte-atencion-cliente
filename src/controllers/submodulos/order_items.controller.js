import { OrderService } from '../../services/submodulos/order_items.service.js';
import { 
  createOrderSchema, 
  updateOrderSchema, 
  getOrdersQuerySchema 
} from '../../schemas/submodulos/order_items.schema.js';

// -------------------------------------------------------
// 1. CREAR COMANDA (POST) - ACCESO: CLIENTES (GUEST)
// -------------------------------------------------------
export const createOrder = async (req, res) => {
  try {
    // A. Validar Input del Body (Items, notas, etc.) con Zod
    const validation = createOrderSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: validation.error.format()
      });
    }

    // B. SEGURIDAD: Obtener datos reales del Token (Middleware verifyGuest)
    // El middleware se asegura de que req.guest exista, pero validamos por robustez.
    if (!req.guest || !req.guest.tableId) {
      return res.status(401).json({ 
        success: false, 
        message: 'No se pudo identificar la mesa. Escanee el QR nuevamente.' 
      });
    }

    // C. INYECCIÓN DE DATOS DE SESIÓN (AJUSTE DE SEGURIDAD)
    // Sobrescribimos tableId y clienteId con los datos del token para evitar fraudes.
    const orderData = {
      ...validation.data,          // Los items y notas que envió el usuario
      tableId: req.guest.tableId,  // <--- DATO SEGURO DEL TOKEN
      clienteId: req.guest.id      // <--- DATO SEGURO DEL TOKEN
    };

    // D. Ejecutar Lógica con los datos seguros
    const result = await OrderService.create(orderData);

    // E. Responder
    res.status(201).json({
      id: result.id,
      status: result.status
    });

  } catch (error) {
    console.error(error);
    
    // Manejo de errores de negocio (Ej: Cliente ya no está activo)
    if (error.message && error.message.includes('No hay un cliente activo')) {
      return res.status(409).json({ success: false, message: error.message });
    }

    if (error.code === 'KDS_NOTIFICATION_FAILED') {
      return res.status(error.status || 502).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: 'Error interno', error: error.message });
  }
};

// -------------------------------------------------------
// 2. ACTUALIZAR ESTADO (PATCH) - ACCESO: STAFF
// -------------------------------------------------------
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

// -------------------------------------------------------
// 3. OBTENER POR ID (GET) - ACCESO: STAFF
// -------------------------------------------------------
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

// -------------------------------------------------------
// 4. OBTENER LISTADO (GET /) - ACCESO: STAFF
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