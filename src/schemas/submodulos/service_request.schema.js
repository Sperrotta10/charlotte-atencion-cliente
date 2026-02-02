import { z } from 'zod';

export const createServiceRequestSchema = z.object({
  type: z.any() // 1. Dejamos entrar cualquier dato (undefined, numeros, etc)
    .refine((val) => typeof val === 'string' && val.trim().length > 0, {
      // 2. Si NO es texto o está vacío, lanzamos ESTE mensaje:
      message: "El tipo de solicitud es requerido (ej: CALL_WAITER)"
    }),

  message: z.any()
    .refine((val) => typeof val === 'string' && val.trim().length > 0, {
      message: "El mensaje es requerido y debe ser texto"
    })
    .refine((val) => typeof val === 'string' && val.length >= 3, {
      message: "El mensaje es muy corto (mínimo 3 letras)" 
    })
});

export const attendServiceRequestSchema = z.object({
  status: z.enum(['ATTENDED', 'CANCELLED'], {
    required_error: "El estado es requerido",
    invalid_type_error: "El estado debe ser 'ATTENDED' o 'CANCELLED'",
    // Personalizamos el mensaje de error para claridad
    errorMap: () => ({ message: "El estado debe ser 'ATTENDED' o 'CANCELLED'" })
  }),
  waiter_id: z.string().uuid({ message: 'waiter_id inválido' }).optional(),
  worker_code: z.string().min(3, { message: 'worker_code inválido' }).optional()
});

export const getServiceRequestsQuerySchema = z.preprocess(
  (data) => {
    // Patrón de limpieza (Estilo Víctor)
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
    
    // CORRECCIÓN: Usamos los Enums REALES de tu schema.prisma
    status: z.enum(['PENDING', 'ATTENDED'], { 
        errorMap: () => ({ message: 'El status debe ser PENDING o ATTENDED' }),
      })
      .optional(),
      
    // CORRECCIÓN: Usamos los Enums REALES de tu ServiceType
    type: z.enum(['CALL_WAITER', 'COMPLAINT'], {
        errorMap: () => ({ message: 'El tipo debe ser CALL_WAITER o COMPLAINT' }),
      })
      .optional(),

    table_id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive())
      .optional(),
  })
);