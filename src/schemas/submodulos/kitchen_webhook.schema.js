import { z } from 'zod';

export const waiterInteractionSchema = z.object({
  external_order_id: z.string().min(1, { message: 'external_order_id requerido' }),
  action: z.enum(['ASSIGN', 'SERVE'], { message: 'action inválido' }),
  waiter_id: z.string().uuid({ message: 'waiter_id inválido' }).optional(),
  worker_code: z.string().min(3, { message: 'worker_code inválido' }).optional(),
});