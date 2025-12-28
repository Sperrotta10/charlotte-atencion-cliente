import { prisma } from "../../src/db/client.js";

export const seedRequests = async (clients) => {
    console.log('🔔 Sembrando Solicitudes de Servicio...');

    // Solo al primer cliente le ponemos una queja
    if (clients.length > 0) {
        await prisma.serviceRequest.create({
            data: {
                clienteId: clients[0].id,
                type: 'COMPLAINT',
                message: 'La sopa estaba fría',
                status: 'PENDING'
            }
        });
    }

    // Al segundo cliente le ponemos un llamado de mesero
    if (clients.length > 1) {
        await prisma.serviceRequest.create({
            data: {
                clienteId: clients[1].id,
                type: 'CALL_WAITER',
                message: 'Necesito servilletas',
                status: 'ATTENDED',
                attendedAt: new Date()
            }
        });
    }

    console.log(`✅ Solicitudes de servicio creadas.`);
};