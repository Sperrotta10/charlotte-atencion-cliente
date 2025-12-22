import { prisma } from '../../db/client.js';

export const OrderService = {
  
  // ---------------------------------------------------------
  // 1. MÉTODO CREATE (Ajustado con KDS y Mapeo)
  // ---------------------------------------------------------
  create: async (data) => {
    // A. TRANSACCIÓN DE BASE DE DATOS
    const newComanda = await prisma.$transaction(async (tx) => {
      
      // 1. Validar Cliente (Fallback: si no viene mesa, asume mesa 1 o lógica de token)
      const tableToCheck = data.tableId || 1; 
      
      const activeClient = await tx.clienteTemporal.findFirst({
        where: { tableId: tableToCheck, status: 'ACTIVE' }
      });

      if (!activeClient) {
        throw new Error(`No hay un cliente activo en la mesa ${tableToCheck}.`);
      }

      // 2. MAPEO DE DATOS (Snake_case -> CamelCase)
      // Convertimos el input del requerimiento a las columnas de tu DB
      const orderItemsData = data.items.map(item => ({
        productId: item.product_id,              // product_id -> productId
        quantity: item.quantity,
        unitPrice: item.unit_price,              // unit_price -> unitPrice
        specialInstructions: item.special_instructions // special_instructions -> specialInstructions
      }));

      // 3. CREAR COMANDA E ITEMS
      return await tx.comanda.create({
        data: {
          clienteId: activeClient.id,
          status: 'PENDING',
          notes: data.notes, // Guardamos la nota general
          items: {
            create: orderItemsData
          }
        },
        include: { items: true } // Necesario para enviar detalle a cocina
      });
    });

    // B. EVENTO: NOTIFICAR AL KDS (Kitchen Display System)
    // Se hace FUERA de la transacción para no bloquear la DB si la API de cocina tarda
    try {
      // URL definida en el requerimiento
      const kdsUrl = 'http://localhost:3000/api/kitchen/v1/kds/inject';
      
      // Payload para cocina
      const kdsPayload = {
        orderId: newComanda.id,
        items: newComanda.items,
        notes: newComanda.notes,
        timestamp: new Date()
      };

      // Inyección (Fire & Forget o Await según preferencia, aquí usamos await seguro)
      // Nota: Necesitas tener Node v18+ para usar 'fetch' nativo, si no, usa axios.
      const response = await fetch(kdsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kdsPayload)
      });

      if (!response.ok) console.warn(`[KDS Warning] Cocina respondió: ${response.statusText}`);
      else console.log(`[KDS] Orden ${newComanda.id} enviada a cocina correctamente.`);

    } catch (error) {
      // Si falla la KDS, NO fallamos la venta, solo logueamos el error (Lógica de Resiliencia)
      console.error("[KDS Error] No se pudo conectar con el módulo de cocina:", error.message);
    }

    return newComanda;
  }, 


  // ---------------------------------------------------------
  // 2. MÉTODO UPDATE STATUS (KPI Automático)
  // ---------------------------------------------------------
  updateStatus: async (id, status) => {
    const dataToUpdate = { status: status };

    if (status === 'DELIVERED') {
      dataToUpdate.deliveredAt = new Date();
    }

    return await prisma.comanda.update({
      where: { id: Number(id) },
      data: dataToUpdate,
      include: { items: true }
    });
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
  // 4. MÉTODO FIND ALL (Listado)
  // ---------------------------------------------------------
  findAll: async () => {
    return await prisma.comanda.findMany({
      orderBy: { sentAt: 'desc' },
      include: {
        items: true,
        cliente: {
          select: { tableId: true, customerName: true }
        }
      }
    });
  }
};