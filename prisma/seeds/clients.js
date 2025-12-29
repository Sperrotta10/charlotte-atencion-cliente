import { prisma } from "../../src/db/client.js";
import { requestJwtToken } from "../../src/services/submodulos/cliente_temporal.service.js"

export const seedClients = async () => {
    console.log('👥 Sembrando Clientes Temporales...');

    // 1. Limpiamos clientes anteriores para no duplicar data basura en cada seed
    // OJO: Borramos primero hijos (Orders) luego padres (Clients) por integridad referencial
    // Pero para simplificar en dev, usamos deleteMany()
    await prisma.orderItem.deleteMany();
    await prisma.comanda.deleteMany();
    await prisma.serviceRequest.deleteMany();
    await prisma.clienteTemporal.deleteMany();

    // 2. Obtenemos las mesas para asignarles clientes
    const tables = await prisma.table.findMany();

    const clientsData = [];

    // Vamos a ocupar las primeras 10 mesas
    for (const table of tables.slice(0, 10)) {
        
        // Estado aleatorio
        const statuses = ['ACTIVE', 'ACTIVE', 'BILL_REQUESTED']; // Más probabilidad de ACTIVE
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

        // Actualizamos el estado de la mesa a OCCUPIED
        await prisma.table.update({
            where: { id: table.id },
            data: { currentStatus: 'OCCUPIED' }
        });

        const token = await requestJwtToken({
            table_id: table.id,
            customer_name: `Cliente Mesa ${table.tableNumber}`,
            customer_dni: `V-${Math.floor(Math.random() * 10000000)}`,
            role: 'GUEST'
        });

        // Creamos el cliente
        const client = await prisma.clienteTemporal.create({
            data: {
                tableId: table.id,
                sessionToken: token,
                customerName: `Cliente Mesa ${table.tableNumber}`,
                customerDni: `V-${Math.floor(Math.random() * 10000000)}`,
                status: randomStatus,
                totalAmount: 0 // Se calcularía con lógica real, por ahora 0
            }
        });
        
        clientsData.push(client);
    }

    console.log(`✅ ${clientsData.length} clientes activos creados.`);
    return clientsData; // Retornamos para usar sus IDs en las comandas
};