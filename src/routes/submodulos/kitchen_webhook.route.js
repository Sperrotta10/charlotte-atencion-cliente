import { Router } from 'express';
import { postWaiterInteraction } from '../../controllers/submodulos/kitchen_webhook.controller.js';

const router = Router();

// Webhook abierto: valida contra Cocina usando worker_code o waiter_id
router.post('/waiter-interaction', postWaiterInteraction);

export default router;
