import { prisma } from '../../db/client.js';

export const OrderService = {
  create: async (data) => {
    // Usamos transacción para garantizar integridad (o se guarda todo, o nada)
    return await prisma.$transaction(async (tx) => {
      
      // 1. REGLA DE NEGOCIO: Buscar Cliente Activo
      // Solo permitimos crear comandas si hay alguien sentado y "ACTIVE"
      const activeClient = await tx.clienteTemporal.findFirst({
        where: {
          tableId: data.tableId,
          status: 'ACTIVE' 
        }
      });

      if (!activeClient) {
        throw new Error(`No hay un cliente activo en la mesa ${data.tableId}.`);
      }

      // 2. PREPARAR DATA
      // Mapeamos lo que llega del frontend a la estructura exacta de Prisma
      const orderItemsData = data.items.map(item => ({
        productId: item.productId,    // Referencia al ID (aunque no validemos vs tabla)
        quantity: item.quantity,
        unitPrice: item.unitPrice,    // <--- Usamos el precio enviado
        specialInstructions: item.comment // Mapeamos comment -> specialInstructions
      }));

      // 3. GUARDADO ATÓMICO
      // Creamos la cabecera (Comanda) y los detalles (Items) en un solo paso
      const newComanda = await tx.comanda.create({
        data: {
          clienteId: activeClient.id,
          status: 'PENDING',
          
          // Prisma crea los registros en la tabla order_items automáticamente
          items: {
            create: orderItemsData
          }
        },
        include: {
          items: true // Retornamos los items creados para confirmar
        }
      });

      return newComanda;
    });
  },
  updateStatus: async (id, status) => {
    // Preparar el objeto de actualización
    const dataToUpdate = {
      status: status
    };

    // [KPI LÓGICA DE VÍCTOR]: Automatización de timestamps
    // Si el estado pasa a DELIVERED, el sistema marca la hora, no el usuario.
    if (status === 'DELIVERED') {
      dataToUpdate.deliveredAt = new Date();
    }

    // Ejecutar Update en la BD
    // Convertimos id a Number() por si viene como string desde la URL
    return await prisma.comanda.update({
      where: { id: Number(id) },
      data: dataToUpdate,
      include: {
        items: true // Devolvemos los items para ver el contexto actualizado
      }
    });
  },
  // 3. MÉTODO FIND BY ID (Ver detalle completo)
  // ---------------------------------------------------------
  findById: async (id) => {
    return await prisma.comanda.findUnique({
      where: { id: Number(id) },
      include: {
        items: true,   // Trae los productos (OrderItems)
        cliente: true  // Trae la info del cliente (Nombre, Mesa, Token)
      }
    });
  }
};