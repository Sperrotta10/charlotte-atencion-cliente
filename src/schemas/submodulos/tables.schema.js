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


