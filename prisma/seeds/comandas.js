import { prisma } from "../../src/db/client.js";

// SIMULACIÓN DEL MENÚ (IDs que vendrían del microservicio de Cocina)
// Usamos UUIDs estáticos para que puedas reconocerlos en tus pruebas
const MOCK_MENU = {
    Hamburguesa_Royal: "a5eccd9f-8b62-4ba5-ac9e-21ca43199718",
    Hamburguesa_Clásica: "d4f1aa76-bd68-417e-bde1-67fba5d03f71",
    Papas_Fritas: "f584d2e7-f103-433d-b770-f68bbeaba5e4",
    Pizza_Pepperoni: "01391bb6-03cb-4f77-b091-f073962b4d20"
};

export const seedComandas = async (clients) => {
    console.log('🍔 Sembrando Comandas y OrderItems (UUID Mode)...');

    let comandasCount = 0;

    for (const client of clients) {
        // Solo creamos comandas para clientes que no estén cerrados
        if (client.status === 'CLOSED') continue;

        // Simulamos que cada cliente pidió entre 1 y 2 comandas
        const numComandas = Math.floor(Math.random() * 2) + 1;

        for (let i = 0; i < numComandas; i++) {
            
            const statuses = ['PENDING', 'COOKING', 'DELIVERED'];
            const orderStatus = statuses[Math.floor(Math.random() * statuses.length)];

            await prisma.comanda.create({
                data: {
                    clienteId: client.id, 
                    status: orderStatus,
                    notes: i === 0 ? "Sin cebolla por favor" : null,
                    sentAt: new Date(),
                    deliveredAt: orderStatus === 'DELIVERED' ? new Date() : null,

                    items: {
                        create: [
                            {
                                // CORRECCIÓN: Usamos UUID String del Mock
                                productId: MOCK_MENU.HAMBURGUESA, 
                                quantity: 2,
                                unitPrice: 12.50,
                                specialInstructions: "Bien cocido"
                            },
                            {
                                // CORRECCIÓN: Usamos UUID String del Mock
                                productId: MOCK_MENU.REFRESCO,
                                quantity: 1,
                                unitPrice: 5.00,
                                specialInstructions: "Con mucho hielo"
                            }
                        ]
                    }
                }
            });
            comandasCount++;
        }
    }

    console.log(`✅ ${comandasCount} comandas creadas con items UUID.`);
};