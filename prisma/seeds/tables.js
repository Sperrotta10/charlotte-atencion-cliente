import { prisma } from "../../src/db/client.js";

export const seedTables = async () => {
    console.log('🪑 Sembrando Mesas (Tables)...');

    const totalTables = 20;

    // Bucle para crear las 20 mesas
    for (let i = 1; i <= totalTables; i++) {
        
        // Lógica simple para variar la capacidad:
        // Mesas 1-5:  Para parejas (2 personas)
        // Mesas 6-15: Estándar (4 personas)
        // Mesas 16-20: Familiares (8 personas)
        let capacity = 4;
        if (i <= 5) capacity = 2;
        else if (i >= 16) capacity = 8;

        await prisma.table.upsert({
            // Usamos el QR como identificador único para saber si ya existe
            where: { qrUuid: `qr-mesa-${i}` }, 
            
            update: {
                // Opcional: Si cambias la capacidad en el código, 
                // esto actualizará la DB si la mesa ya existía.
                capacity: capacity 
            },
            
            create: {
                tableNumber: i,
                qrUuid: `qr-mesa-${i}`, // Generamos un UUID simulado
                capacity: capacity,
                currentStatus: 'AVAILABLE' // Estado inicial por defecto
            }
        });
    }

    console.log(`✅ ${totalTables} mesas verificadas/creadas.`);
};