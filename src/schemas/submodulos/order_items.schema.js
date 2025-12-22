import { z } from 'zod';

// -------------------------------------------------------
// 1. Schema para CREAR (POST)
// -------------------------------------------------------
export const createOrderSchema = z.object({
  // Nota general de la comanda (Ej: "Sin alergias")
  notes: z.string().optional(),
  
  // Validamos mesa (opcional si usas token, pero bueno mantenerlo)
  tableId: z.number().int().positive().optional(),
  
  items: z.array(
    z.object({
      // REQUISITO: Input en snake_case
      product_id: z.number().int().positive({ message: "product_id es requerido" }),
      
      quantity: z.number().int().positive(),
      
      // REQUISITO: Input en snake_case
      special_instructions: z.string().optional(),

      // REQUISITO LÓGICO: Como no hay tabla de productos, el precio DEBE venir
      unit_price: z.number().positive({ message: "unit_price es requerido" })
    })
  ).min(1, { message: "La orden debe tener al menos un item" })
});

// -------------------------------------------------------
// 2. Schema para ACTUALIZAR (PATCH)
// -------------------------------------------------------
export const updateOrderSchema = z.object({
  status: z.enum(['PENDING', 'COOKING', 'DELIVERED', 'CANCELLED'], {
    errorMap: () => ({ message: "El estado debe ser: PENDING, COOKING, DELIVERED o CANCELLED" })
  })
});