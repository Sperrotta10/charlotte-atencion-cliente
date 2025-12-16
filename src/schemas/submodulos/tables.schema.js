import { z } from 'zod';

// Esquema de validación para crear una mesa
export const createTableSchema = z.object({
  table_number: z
    .number({
      required_error: 'El número de mesa es requerido',
      invalid_type_error: 'El número de mesa debe ser un número',
    })
    .int()
    .positive({ message: 'El número de mesa debe ser mayor a 0' }),
  capacity: z
    .number({
      required_error: 'La capacidad es requerida',
      invalid_type_error: 'La capacidad debe ser un número',
    })
    .int()
    .min(2, { message: 'La capacidad mínima de la mesa es 2 personas' })
    .max(6, { message: 'La capacidad máxima de la mesa es 6 personas' }),
});

// Esquema de validación para obtener todas las mesas (query params)
export const getTablesQuerySchema = z.preprocess(
  (data) => {
    // Convertir strings a números y establecer defaults
    const processed = { ...data };
    if (processed.page === undefined || processed.page === '') {
      processed.page = '1';
    }
    if (processed.limit === undefined || processed.limit === '') {
      processed.limit = '20';
    }
    return processed;
  },
  z.object({
    page: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive({ message: 'La página debe ser mayor a 0' })),
    limit: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive({ message: 'El límite debe ser mayor a 0' })),
    status: z
      .enum(['AVAILABLE', 'OCCUPIED'], {
        errorMap: () => ({ message: 'El status debe ser AVAILABLE u OCCUPIED' }),
      })
      .optional(),
  })
);

// Esquema de validación para verificar código QR
export const verifyQrSchema = z.object({
  qr_uuid: z
    .string({
      required_error: 'El qr_uuid es requerido',
      invalid_type_error: 'El qr_uuid debe ser un string',
    })
    .min(1, { message: 'El qr_uuid no puede estar vacío' }),
});


