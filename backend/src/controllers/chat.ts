import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { getFileUrl } from '../utils/uploadHelper';

export const getConversations = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const conversations = await prisma.conversation.findMany({
      where: role === 'STUDENT' ? { studentId: userId } : { ownerId: userId },
      include: {
        student: { select: { id: true, name: true, email: true, profileImage: true } },
        owner: { select: { id: true, name: true, email: true, profileImage: true } },
        pg: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching conversations', error });
  }
};

export const getMessages = async (req: any, res: Response) => {
  try {
    const { conversationId } = req.params;
    
    // Mark as read
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: req.user.id },
        isRead: false
      },
      data: { isRead: true }
    });

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching messages', error });
  }
};

export const sendMessage = async (req: any, res: Response) => {
  try {
    const { conversationId, text, pgId, receiverId } = req.body;
    const senderId = req.user.id;
    let attachmentUrl = null;

    if (req.file) {
      attachmentUrl = getFileUrl(req.file);
    }

    let conversation;

    if (conversationId) {
      conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    } else {
      // Find or create conversation
      const studentId = req.user.role === 'STUDENT' ? senderId : receiverId;
      const ownerId = req.user.role === 'OWNER' ? senderId : receiverId;

      conversation = await prisma.conversation.upsert({
        where: {
          studentId_ownerId_pgId: {
            studentId,
            ownerId,
            pgId: pgId || null
          }
        },
        update: { updatedAt: new Date() },
        create: {
          studentId,
          ownerId,
          pgId: pgId || null
        }
      });
    }

    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId,
        text,
        attachmentUrl
      }
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() }
    });

    // Real-time notification via Socket.io
    const io = req.io;
    const recipientId = conversation.studentId === senderId ? conversation.ownerId : conversation.studentId;
    io.to(`user_${recipientId}`).emit('new_message', {
      message,
      conversationId: conversation.id
    });

    res.json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Error sending message', error });
  }
};

export const getUnreadCount = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const count = await prisma.message.count({
      where: {
        conversation: {
          OR: [{ studentId: userId }, { ownerId: userId }]
        },
        senderId: { not: userId },
        isRead: false
      }
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching unread count' });
  }
};
