import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { upload } from '../middlewares/upload';
import { updateProfileImage } from '../controllers/user';

const router = Router();

router.post('/profile-image', authenticate, upload.single('profileImage'), updateProfileImage);

export default router;
