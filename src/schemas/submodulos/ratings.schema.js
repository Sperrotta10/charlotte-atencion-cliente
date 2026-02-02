import { z } from 'zod';

export const createRatingParamsSchema = z.object({
  id: z
    .string({ required_error: 'El id es requerido' })
    .min(1)
    .transform((val) => {
      const parsed = parseInt(val, 10);
      if (isNaN(parsed)) throw new Error('El id debe ser un número válido');
      return parsed;
    })
    .pipe(z.number().int().positive()),
});

export const createRatingBodySchema = z.object({
  score: z
    .number({ required_error: 'La calificación es requerida' })
    .int({ message: 'La calificación debe ser un entero' })
    .min(0, { message: 'La calificación mínima es 0' })
    .max(5, { message: 'La calificación máxima es 5' }),
  comment: z
    .string()
    .max(300, { message: 'El comentario no debe exceder 300 caracteres' })
    .optional(),
  // Alternativa: si aún no se capturó el mesero en el cierre
  waiter_id: z.string().uuid({ message: 'waiter_id inválido' }).optional(),
  for_all: z.boolean().optional(),
});

export const ratingsQuerySchema = z.object({
  waiter_id: z.string().uuid().optional(),
  from: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  to: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
});

export const summaryQuerySchema = ratingsQuerySchema;

export const clientIdParamSchema = z.object({
  id: z
    .string({ required_error: 'El id es requerido' })
    .transform((val) => {
      const n = parseInt(val, 10);
      if (isNaN(n)) throw new Error('El id debe ser numérico');
      return n;
    })
    .pipe(z.number().int().positive())
});

export const ratingsByWaiterQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().min(1)),
  page_size: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 10))
    .pipe(z.number().int().min(1).max(100)),
  recent_count: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 10))
    .pipe(z.number().int().min(1).max(50)),
});

export const ratingsListPagedQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().min(1)),
  page_size: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 10))
    .pipe(z.number().int().min(1).max(100)),
  waiter_id: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  order_by: z
    .string()
    .optional()
    .transform((v) => (v === 'score' ? 'score' : 'createdAt')),
  direction: z
    .string()
    .optional()
    .transform((v) => (v === 'asc' ? 'asc' : 'desc')),
});

export const ratingsTimeseriesQuerySchema = z.object({
  granularity: z.enum(['daily', 'weekly']),
  waiter_id: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});