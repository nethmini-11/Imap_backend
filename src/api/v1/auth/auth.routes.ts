import { Router } from 'express';
import { AuthController } from '../../../controllers/auth.controller';
import { authenticate } from '../../../middlewares/auth.middleware';

const router = Router();

router.get('/google', AuthController.initiateAuth);
router.get('/google/callback', AuthController.handleCallback);
router.get('/profile', authenticate, AuthController.getProfile);
router.post('/logout', authenticate, AuthController.logout);

export default router;