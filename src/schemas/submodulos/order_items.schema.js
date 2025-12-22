import { z } from 'zod';

export const createOrderSchema = z.object({
  // Validamos que venga la Mesa
  tableId: z.number().int().positive({ message: "El ID de la mesa es requerido" }),
  
  items: z.array(
    z.object({
      // Validamos IDs y Cantidades
      productId: z.number().int().positive({ message: "El ID del producto es requerido" }),
      quantity: z.number().int().positive({ message: "La cantidad debe ser mayor a 0" }),
      
      // NUEVO Y CRÍTICO: El precio DEBE venir desde el frontend
      unitPrice: z.number().positive({ message: "El precio unitario es obligatorio y debe ser positivo" }),
      
      // Comentario opcional
      comment: z.string().optional()
    })
  ).min(1, { message: "La comanda debe tener al menos un producto" })
});

export const updateOrderSchema = z.object({
  status: z.enum(['PENDING', 'COOKING', 'DELIVERED', 'CANCELLED'], {
    errorMap: () => ({ message: "El estado debe ser: PENDING, COOKING, DELIVERED o CANCELLED" })
  })
});