import { prisma } from '../../db/client.js';

export const ServiceRequestService = {
  // 1. CREAR
  create: async (data) => {
    return await prisma.serviceRequest.create({
      data: {
        clienteId: 1, // ID Hardcodeado como pediste
        type: data.type,
        message: data.message
      }
    });
  },

  // 2. LISTAR TODAS
  findAll: async () => {
    return await prisma.serviceRequest.findMany();
  },

  // 3. BUSCAR POR ID (Nueva)
  findById: async (id) => {
    return await prisma.serviceRequest.findUnique({
      where: { id: Number(id) }
    });
  },

  // 4. ATENDER SOLICITUD (Nueva - Lógica de PATCH)
  markAsAttended: async (id) => {
    return await prisma.serviceRequest.update({
      where: { id: Number(id) },
      data: {
        status: 'ATTENDED',
        attendedAt: new Date()
      }
    });
  }
};