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

// -------------------------------------------------------
// 3. Schema para OBTENER (GET con Filtros) - Estilo Víctor
// -------------------------------------------------------
export const getOrdersQuerySchema = z.preprocess(
  (data) => {
    // Limpieza y valores por defecto
    const processed = { ...data };
    if (!processed.page) processed.page = '1';
    if (!processed.limit) processed.limit = '20';
    return processed;
  },
  z.object({
    page: z.coerce.number().positive(),
    limit: z.coerce.number().positive(),
    
    // Filtro por Estado (Opcional)
    status: z.enum(['PENDING', 'COOKING', 'DELIVERED', 'CANCELLED']).optional(),
    
    // Filtro por Mesa (Opcional, convertimos string a numero)
    table_id: z.coerce.number().int().positive().optional(),
    
    // Filtros de Fechas (Reportes históricos)
    date_from: z.string().datetime({ message: "date_from debe ser formato ISO (YYYY-MM-DDTHH:mm:ssZ)" }).optional(),
    date_to: z.string().datetime({ message: "date_to debe ser formato ISO" }).optional()
  })
);