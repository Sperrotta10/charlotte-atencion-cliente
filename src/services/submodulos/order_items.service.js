import { prisma } from '../../db/client.js';

export const OrderService = {
  
  // ---------------------------------------------------------
  // 1. MÉTODO CREATE (Mantiene lógica KDS y Transacción)
  // ---------------------------------------------------------
  create: async (data) => {
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
          clienteId: activeClient.id,
          status: 'PENDING',
          notes: data.notes,
          items: {
            create: orderItemsData
          }
        },
        include: { items: true }
      });
    });

    // B. EVENTO: NOTIFICAR AL KDS (Cocina)
    try {
      const kdsUrl = 'http://localhost:3000/api/kitchen/v1/kds/inject';
      
      const kdsPayload = {
        orderId: newComanda.id,
        items: newComanda.items,
        notes: newComanda.notes,
        timestamp: new Date()
      };

      const response = await fetch(kdsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kdsPayload)
      });

      if (!response.ok) console.warn(`[KDS Warning] Cocina respondió: ${response.statusText}`);
      else console.log(`[KDS] Orden ${newComanda.id} enviada a cocina correctamente.`);

    } catch (error) {
      console.error("[KDS Error] No se pudo conectar con el módulo de cocina:", error.message);
    }

    return newComanda;
  }, 

  // ---------------------------------------------------------
  // 2. MÉTODO UPDATE STATUS (Con Notificación al Cliente)
  // ---------------------------------------------------------
  updateStatus: async (id, status) => {
    const dataToUpdate = { status: status };

    // Lógica de negocio: Timestamp de entrega si aplica
    if (status === 'DELIVERED') {
      dataToUpdate.deliveredAt = new Date();
    }

    // A. ACTUALIZACIÓN EN DB
    // Importante: incluimos 'cliente' para obtener el tableId necesario para la notificación
    const updatedOrder = await prisma.comanda.update({
      where: { id: Number(id) },
      data: dataToUpdate,
      include: { items: true, cliente: true } 
    });

    // B. EVENTO: NOTIFICAR AL MÓDULO DE INTERFACES (CLIENTE)
    // Esto cubre el requisito de avisar cuando pasa a COOKING, DELIVERED o CANCELLED
    try {
      // URL hipotética definida para notificaciones a la tablet/app
      const interfaceUrl = 'http://localhost:3000/api/interfaces/v1/notify';
      
      const payload = {
        tableId: updatedOrder.cliente.tableId,
        orderId: updatedOrder.id,
        newStatus: status,
        message: status === 'CANCELLED' 
          ? 'Tu orden ha sido cancelada.' 
          : `El estado de tu orden ha cambiado a: ${status}`
      };

      // Fire & Forget: No usamos await para no retrasar la respuesta API si la interfaz está lenta
      fetch(interfaceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(err => console.warn(`[Interface Warning] No se pudo notificar al cliente: ${err.message}`));

    } catch (error) {
      // Si falla la notificación, no detenemos el proceso, solo logueamos
      console.error("Error al intentar notificar interfaz:", error);
    }

    return updatedOrder;
  },

  // ---------------------------------------------------------
  // 3. MÉTODO FIND BY ID (Detalle)
  // ---------------------------------------------------------
  findById: async (id) => {
    return await prisma.comanda.findUnique({
      where: { id: Number(id) },
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