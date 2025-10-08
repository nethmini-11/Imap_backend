import { Router } from 'express';
import authRoutes from './auth/auth.routes';
import emailRoutes from './emails/email.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/emails', emailRoutes);

export default router;