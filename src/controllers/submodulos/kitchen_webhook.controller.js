import { waiterInteractionSchema } from '../../schemas/submodulos/kitchen_webhook.schema.js';
import { KitchenWebhookService } from '../../services/submodulos/kitchen_webhook.service.js';

export const postWaiterInteraction = async (req, res) => {
  try {
    const validation = waiterInteractionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
    }

    const interaction = await KitchenWebhookService.handleWaiterInteraction(validation.data);
    return res.status(201).json({ success: true, data: interaction });
  } catch (error) {
    if (error.code === 'ORDER_NOT_FOUND') return res.status(404).json({ error: error.message });
    if (error.code === 'WAITER_VALIDATION_FAILED') return res.status(400).json({ error: error.message });
    console.error('Error en webhook de cocina:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};