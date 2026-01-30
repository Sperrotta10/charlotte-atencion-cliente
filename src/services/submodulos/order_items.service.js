import { prisma } from '../../db/client.js';
import { envs } from '../../config/envs.js';

export const OrderService = {
  
  // ---------------------------------------------------------
  // 1. MÉTODO CREATE (Mantiene lógica KDS y Transacción)
  // ---------------------------------------------------------
  create: async (data, token) => {
    // A. TRANSACCIÓN DE BASE DE DATOS
    const newComanda = await prisma.$transaction(async (tx) => {
      
      // 1. Validar Cliente (Fallback: mesa 1 si no viene indicado)
      const tableToCheck = data.tableId || 1; 
      
      const activeClient = await tx.clienteTemporal.findFirst({
        where: { tableId: tableToCheck, status: 'ACTIVE' }
      });

      if (!activeClient) {
        throw new Error(`No hay un cliente activo en la mesa ${tableToCheck}.`);
      }

      // 2. MAPEO DE DATOS (Snake_case -> CamelCase)
      const orderItemsData = data.items.map(item => ({
        productId: item.product_id,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        specialInstructions: item.special_instructions
      }));

      // 3. CREAR COMANDA E ITEMS
      return await tx.comanda.create({
        data: {
          clienteId: data.clienteId,
          status: 'PENDING',
          notes: data.notes,
          items: {
            create: orderItemsData
          }
        },
        include: { 
          items: true,
          cliente: { 
            include: { table: true }
          }
        }
      });
    });

    // B. EVENTO: NOTIFICAR AL KDS (Módulo Cocina)
    // Si falla la creación en cocina, hacemos rollback de la comanda local.
    try {
      await OrderService.notifyKitchen(newComanda, token, data.items);
    } catch (error) {
      console.error("[KDS Error] Falló el envío a cocina, iniciando rollback:", error.message);
      // Intento de rollback: borrar items y la comanda para mantener consistencia
      try {
        await prisma.$transaction(async (tx) => {
          // Borrado anidado de items si la relación lo permite
          try {
            await tx.comanda.update({
              where: { id: newComanda.id },
              data: { items: { deleteMany: {} } }
            });
          } catch (_) {}

          await tx.comanda.delete({ where: { id: newComanda.id } });
        });
      } catch (cleanupError) {
        console.error("[Rollback Error] No se pudo borrar la comanda local:", cleanupError.message);
      }

      const e = new Error(error.message || 'Fallo al notificar a cocina');
      e.code = 'KDS_NOTIFICATION_FAILED';
      e.status = error.status || 502;
      throw e;
    }

    return newComanda;
  }, 

  /**
 * Función auxiliar para manejar la comunicación con Cocina
 * Aplica lógica de entorno (Dev vs Prod)
 */
  notifyKitchen: async (comanda, token, rawItems = []) => {
    // 1. Preparar el Payload EXACTO que pide Cocina
    console.log("[KDS] Preparando payload para cocina...", comanda);
    console.log("[KDS] Items crudos recibidos para exclusiones:", rawItems);

    // Construcción de items por posición a partir de rawItems
    const kdsItems = Array.isArray(rawItems) && rawItems.length > 0
      ? rawItems.map(ri => {
          const base = {
            productId: ri.product_id,
            quantity: ri.quantity,
          };
          if (Array.isArray(ri.excluded_recipe_ids) && ri.excluded_recipe_ids.length > 0) {
            base.excludedRecipeIds = ri.excluded_recipe_ids;
          }
          return base;
        })
      : comanda.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        }));

    if (Array.isArray(rawItems) && Array.isArray(comanda.items) && rawItems.length !== comanda.items.length) {
      console.warn("[KDS Warning] Desalineación: rawItems y comanda.items tienen longitudes distintas.", { rawItems: rawItems.length, comandaItems: comanda.items.length });
    }

    const displayLabel = comanda.notes
      ? comanda.notes
      : (comanda.cliente?.table?.tableNumber
          ? `Mesa ${comanda.cliente.table.tableNumber} - Pedido de ${comanda.cliente.customerName}`
          : `Pedido de ${comanda.cliente.customerName}`);

    const kdsPayload = {
      externalOrderId: String(comanda.id),
      sourceModule: "AC_MODULE",
      serviceMode: "DINE_IN",
      displayLabel,
      customerName: comanda.cliente.customerName,
      items: kdsItems
    };

    // Log detallado para ver arrays completos en consola
    console.log("[KDS] Payload preparado:\n" + JSON.stringify(kdsPayload, null, 2));

    // 2. Lógica de Entorno
    if (envs.NODE_ENV === 'development') {
      // SIMULACIÓN (MOCK)
      console.log("---------------------------------------------------");
      console.log("🚧 [DEV MODE] Simulando inyección a KDS (Cocina)");
      console.log("📡 Endpoint:", `${envs.CHARLOTTE_COCINA_URL || 'http://localhost:3002'}/api/kitchen/kds/inject`);
      console.log("📦 Payload:", JSON.stringify(kdsPayload, null, 2));
      console.log("---------------------------------------------------");
      return; // Terminamos aquí en desarrollo
    }

    // 3. PRODUCCIÓN (Fetch Real)
    const kitchenUrl = envs.CHARLOTTE_COCINA_URL; // Asegúrate de tener esto en tu .env
    
    if (!kitchenUrl) {
      console.warn("[KDS Warning] Variable CHARLOTTE_COCINA_URL no definida en producción.");
      return;
    }

    const response = await fetch(`${kitchenUrl}/api/kitchen/kds/inject`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
        // 'x-api-key': envs.INTERNAL_API_KEY // Si cocina pide auth
      },
      body: JSON.stringify(kdsPayload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`[KDS Error] Cocina respondió error: ${response.status} - ${errorData.message || 'Sin mensaje'}`);

      const error = new Error(`Fallo al notificar a cocina: ${errorData.message || 'Error desconocido'}`);
      error.code = 'KDS_NOTIFICATION_FAILED';
      error.status = response.status;
      throw error;
    }

    const responseData = await response.json();
    console.log(`[KDS] Orden ${comanda.id} inyectada exitosamente. Ticket Cocina: ${responseData.kds_ticket_id || 'N/A'}`);
  },

  // ---------------------------------------------------------
  // 2. MÉTODO UPDATE STATUS (Con Notificación al Cliente)
  // ---------------------------------------------------------
  updateStatus: async (id, status, token) => {
    // 1. Obtener estado actual para validar reglas de negocio
    const currentOrder = await prisma.comanda.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!currentOrder) {
      const error = new Error("Comanda no encontrada.");
      error.code = 'P2025';
      throw error;
    } 

    // 2. Validación de Integridad (Regla de Negocio)
    // El cliente solo puede cancelar si la orden NO se ha empezado a cocinar o entregar.
    if (status === 'CANCELLED') {
      if (currentOrder.status !== 'PENDING') {
        const error = new Error("No se puede cancelar una orden que ya está en preparación o fue entregada.");
        error.code = 'ORDER_CANNOT_BE_CANCELLED';
        throw error;
      }
    }

    // 3. Preparar datos de actualización
    const dataToUpdate = { status: status };

    // Lógica de KPI: Timestamp de entrega
    if (status === 'DELIVERED') {
      dataToUpdate.deliveredAt = new Date();
    }

    // A. ACTUALIZACIÓN EN DB (Tu Módulo)
    const updatedOrder = await prisma.comanda.update({
      where: { id },
      data: dataToUpdate,
      include: { items: true, cliente: true } 
    });

    // B. COMUNICACIÓN CON OTROS MÓDULOS (Eventos)
    
    // Caso 1: Cancelación -> Notificar a Cocina (Detener producción)
    if (status === 'CANCELLED') {
      // Usamos fire-and-forget (await opcional dependiendo de si quieres que espere)
      await OrderService.notifyKitchenCancellation(updatedOrder.id, token);
    }

    // Caso 2: Cambio de Estado -> Notificar al Cliente (Feedback Visual)
    // (Aquí iría la lógica de WebSockets o Notificación Push al Frontend)
    let messageToClient = '';
    if (status === 'COOKING' || status === 'DELIVERED') {
      console.log(`[INFO] Notificar al cliente ${updatedOrder.cliente.customerName}: Su pedido está ${status}`);
      messageToClient = `Hola ${updatedOrder.cliente.customerName}, su pedido está ahora ${status.replace('_', ' ').toLowerCase()}.`;
    }

    return { ...updatedOrder, clientMessage: messageToClient};
  },

  /**
 * Notifica al módulo de cocina sobre la cancelación de una orden.
 * Aplica lógica de entorno (Dev vs Prod).
 */
  notifyKitchenCancellation: async (externalOrderId, token) => {
    // 1. MODO DESARROLLO (Simulación)
    if (envs.NODE_ENV === 'development') {
      console.log("---------------------------------------------------");
      console.log("🚧 [DEV MODE] Simulando cancelación en KDS (Cocina)");
      console.log("📡 Endpoint:", `${envs.KITCHEN_URL || 'http://localhost:3002'}/api/kitchen/kds/order/${externalOrderId}/cancel`);
      console.log("📝 Acción: Rollback de producción");
      console.log("---------------------------------------------------");
      return;
    }

    // 2. MODO PRODUCCIÓN (Fetch Real)
    const kitchenUrl = envs.CHARLOTTE_COCINA_URL;
    if (!kitchenUrl) return console.warn("[KDS Warning] Variable CHARLOTTE_COCINA_URL no definida en producción.");

    try {
      const response = await fetch(`${kitchenUrl}/api/kitchen/kds/order/${externalOrderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reason: "Cancelado por el cliente" })
      });

      if (!response.ok) {
        console.warn(`[KDS Warning] Cocina respondió error al cancelar: ${response.statusText}`);
      } else {
        console.log(`[KDS] Orden ${externalOrderId} cancelada en cocina exitosamente.`);
      }
    } catch (error) {
      console.error("[KDS Error] Fallo al conectar con cocina:", error.message);
      // Nota: No lanzamos error para no revertir la cancelación en el lado del cliente,
      // pero esto debería generar una alerta administrativa.
    }
  },

  // ---------------------------------------------------------
  // 3. MÉTODO FIND BY ID (Detalle)
  // ---------------------------------------------------------
  findById: async (id) => {
    return await prisma.comanda.findUnique({
      where: { id },
      include: { items: true, cliente: true }
    });
  },

  // ---------------------------------------------------------
  // 4. MÉTODO FIND ALL (Listado Operativo y KPIs)
  // ---------------------------------------------------------
  findAll: async ({ page, limit, status, table_id, date_from, date_to }) => {
    const skip = (page - 1) * limit;

    // A. CONSTRUCCIÓN DINÁMICA DEL WHERE
    const where = {};

    // 1. Filtro por Status
    if (status) {
      where.status = status;
    }

    // 2. Filtro por Mesa (Relación anidada: Comanda -> Cliente -> Mesa)
    // Buscamos comandas cuyo cliente pertenezca a la table_id recibida
    if (table_id) {
      where.cliente = {
        tableId: table_id
      };
    }

    // 3. Filtro de Rango de Fechas (Para reportes de eficiencia)
    if (date_from || date_to) {
      where.sentAt = {}; // O createdAt, depende de tu modelo exacto
      if (date_from) where.sentAt.gte = new Date(date_from);
      if (date_to) where.sentAt.lte = new Date(date_to);
    }

    // B. CONSULTA A LA DB (Count + FindMany)
    const [total, orders] = await prisma.$transaction([
      prisma.comanda.count({ where }),
      prisma.comanda.findMany({
        where,
        skip,
        take: limit,
        // Ordenamiento: PENDING primero (FIFO), luego por fecha
        orderBy: status === 'PENDING' ? { sentAt: 'asc' } : { sentAt: 'desc' },
        include: {
          items: {
             // Opcional: Si quieres traer el nombre del producto de una tabla externa
             // select: { quantity: true, productId: true, ... }
          },
          cliente: {
            include: { table: true } // Traemos info de la mesa
          }
        }
      })
    ]);

    // C. MAPEO DE SALIDA (Data Shaping para KPI/KDS)
    // Transformamos camelCase de Prisma a snake_case del requerimiento
    const formattedData = orders.map(order => ({
      id: order.id,
      status: order.status,
      notes: order.notes,
      clientId: order.clienteId,
      
      // TIMESTAMPS CRÍTICOS PARA KPI
      // Frontend KDS calculará: (NOW - sent_at) = Tiempo de Espera actual
      sent_at: order.sentAt || order.createdAt, // Fallback a created si sentAt es null
      
      // Frontend KPI calculará: (delivered_at - sent_at) = Velocidad de Servicio
      delivered_at: order.deliveredAt, 

      // Aplanamos la estructura para facilitar lectura en frontend
      table_number: order.cliente?.table?.number || order.cliente?.tableId,
      
      items: order.items.map(item => ({
        product_name: `Producto #${item.productId}`, // Si tuvieras tabla productos, aquí iría item.product.name
        quantity: item.quantity,
        special_instructions: item.specialInstructions
      }))
    }));

    return {
      data: formattedData,
      meta: {
        total,
        page,
        limit
      }
    };
  }
};