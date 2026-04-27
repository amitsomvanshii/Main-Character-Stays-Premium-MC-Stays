import { Router } from 'express';
import { register, login, verifyOtp, promoteToAdmin } from '../controllers/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOtp);
router.post('/promote-to-admin', promoteToAdmin);

export default router;
