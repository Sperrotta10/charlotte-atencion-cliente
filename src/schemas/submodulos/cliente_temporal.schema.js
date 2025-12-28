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
    .trim()
    .regex(/^(?:[VEJP]-?)?\d{6,8}$/i, {
      message: 'La cédula debe tener entre 6 y 8 números (ej: V-12345678 o 12345678)',
    })
    .transform((val) => val.toUpperCase()),
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

// Esquema de validación para query params del GET /clients
export const getClientsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 1;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) || parsed < 1 ? 1 : parsed;
    })
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 10;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) || parsed < 1 ? 10 : parsed;
    })
    .pipe(z.number().int().positive()),
  status: z
    .enum(['ACTIVE', 'BILL_REQUESTED', 'CLOSED'], {
      errorMap: () => ({ message: 'El status debe ser ACTIVE, BILL_REQUESTED o CLOSED' }),
    })
    .optional(),
  date_from: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: 'date_from debe ser una fecha ISO válida' }
    )
    .transform((val) => (val ? new Date(val) : undefined)),
  date_to: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: 'date_to debe ser una fecha ISO válida' }
    )
    .transform((val) => (val ? new Date(val) : undefined)),
  min_amount: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const parsed = parseFloat(val);
      return isNaN(parsed) ? undefined : parsed;
    })
    .pipe(z.number().nonnegative().optional()),
});