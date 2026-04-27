import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { getConversations, getMessages, sendMessage, getUnreadCount } from '../controllers/chat';
import { upload } from '../middlewares/upload';

const router = Router();

router.get('/conversations', authenticate, getConversations);
router.get('/messages/:conversationId', authenticate, getMessages);
router.post('/message', authenticate, upload.single('attachment'), sendMessage);
router.get('/unread-count', authenticate, getUnreadCount);

export default router;
