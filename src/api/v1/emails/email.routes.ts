import { Router } from 'express';
import { EmailController } from '../../../controllers/email.controller';
import { authenticate } from '../../../middlewares/auth.middleware';
import { validatePagination } from '../../../middlewares/validation.middleware';

const router = Router();

router.use(authenticate);

router.post('/sync', EmailController.syncEmails);
router.get('/', validatePagination, EmailController.getEmails);
router.get('/stats', EmailController.getStats);
router.get('/:id', EmailController.getEmail);
router.patch('/:id/read', EmailController.markAsRead);

export default router;