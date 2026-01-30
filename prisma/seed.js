import { prisma } from '../src/db/client.js';
//import { seedExample } from './seeds/example.js';
import { seedTables } from './seeds/tables.js';
import { seedClients } from './seeds/clients.js';
import { seedComandas } from './seeds/comandas.js';
import { seedRequests } from './seeds/requests.js';
import { deleteBd } from './seeds/delete.js';

async function main() {
	
	console.log('🚀 Start seeding ...');
	await deleteBd();
	/*
	// 1. Tablas (Infraestructura base)
        await seedTables();
        
        // 2. Clientes (Dependen de Tablas)
        const activeClients = await seedClients(); 
        
        if (activeClients.length > 0) {
            // 3. Comandas (Dependen de Clientes)
            await seedComandas(activeClients);
            
            // 4. Solicitudes (Dependen de Clientes)
            await seedRequests(activeClients);
		}
	*/
	console.log('🏁 Seeding finished.');

}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
