import { z } from 'zod';

// Esquema de validación para crear sesión (login)
export const createSessionSchema = z.object({
  table_id: z
    .number({
      required_error: 'El table_id es requerido',
      invalid_type_error: 'El table_id debe ser un número',
    })
    .int()
    .positive({ message: 'El table_id debe ser mayor a 0' }),
  customer_name: z
    .string({
      required_error: 'El customer_name es requerido',
      invalid_type_error: 'El customer_name debe ser un string',
    })
    .min(1, { message: 'El customer_name no puede estar vacío' })
    .max(100, { message: 'El customer_name no puede exceder 100 caracteres' }),
  customer_dni: z
    .string({
      required_error: 'El customer_dni es requerido',
      invalid_type_error: 'El customer_dni debe ser un string',
    })
    .min(6, { message: 'El customer_dni no puede estar vacío' })
    .max(8, { message: 'El customer_dni no puede exceder 8 caracteres' }),
});

// Esquema de validación para el parámetro ID en la ruta
export const clientIdParamSchema = z.object({
  id: z
    .string({
      required_error: 'El id es requerido',
      invalid_type_error: 'El id debe ser un string',
    })
    .min(1, { message: 'El id no puede estar vacío' })
    .transform((val) => {
      const parsed = parseInt(val, 10);
      if (isNaN(parsed)) {
        throw new Error('El id debe ser un número válido');
      }
      return parsed;
    })
    .pipe(z.number().int().positive({ message: 'El id debe ser un número entero positivo' })),
});

// Esquema de validación para actualizar estado del cliente
export const updateStatusSchema = z.object({
  status: z.enum(['BILL_REQUESTED', 'CLOSED'], {
    invalid_type_error: 'El status debe ser BILL_REQUESTED o CLOSED',
    errorMap: () => ({ message: 'El status debe ser BILL_REQUESTED o CLOSED' }),
  }).optional(),
  // Nuevo campo opcional: total_amount
  total_amount: z.number().min(0, "El monto no puede ser negativo").optional(),
});