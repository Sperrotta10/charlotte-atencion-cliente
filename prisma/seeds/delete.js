import { prisma } from "../../src/db/client.js";

export const deleteBd = async () => {
    console.log('Borrando base de datos...');

    await prisma.orderItem.deleteMany();
    await prisma.comanda.deleteMany();
    await prisma.serviceRequest.deleteMany();
    await prisma.clienteTemporal.deleteMany();
    await prisma.table.deleteMany();
    console.log('✅ Base de datos borrada.');
};