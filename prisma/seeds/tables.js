import { prisma } from "../../src/db/client.js";
import { randomUUID } from 'node:crypto'; // Módulo nativo de Node.js

export const seedTables = async () => {
    console.log('🪑 Sembrando Mesas (Tables)...');

    const totalTables = 20;

    for (let i = 1; i <= totalTables; i++) {
        // Lógica de capacidad
        let capacity = 4;
        if (i <= 5) capacity = 2;
        else if (i >= 16) capacity = 8;

        await prisma.table.upsert({
            // USAMOS tableNumber COMO IDENTIFICADOR ESTABLE
            where: { tableNumber: i }, 
            
            update: {
                // Si la mesa existe, solo actualizamos capacidad si cambió
                capacity: capacity
                // No actualizamos qrUuid para no invalidar QRs impresos en la vida real
            },
            
            create: {
                tableNumber: i,
                // AQUÍ GENERAMOS EL UUID REAL
                qrUuid: randomUUID(), 
                capacity: capacity,
                currentStatus: 'AVAILABLE'
            }
        });
    }

    console.log(`✅ ${totalTables} mesas verificadas/creadas.`);
};