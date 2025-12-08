import { PrismaClient } from '../generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { envs } from '../config/envs.js';

const connectionString = envs.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });

// Patrón Singleton para evitar múltiples conexiones en desarrollo (Hot Reload)
const globalForPrisma = global;

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (envs.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

export * from '../generated/prisma/index.js';