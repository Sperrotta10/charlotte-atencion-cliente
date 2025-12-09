import { prisma } from '../src/db/client.js';
import { seedExample } from './seeds/example.js';
import { seedTables } from './seeds/tables.js';

async function main() {
	
	console.log('🚀 Start seeding ...');
	await seedExample(); // Llamada a la funcion de seedExample
	await seedTables();  // Llamada a la funcion de seedTables
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
