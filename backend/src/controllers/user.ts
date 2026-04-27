import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prismaClient';
import { getFileUrl } from '../utils/uploadHelper';

interface AuthRequest extends Request {
  user?: { id: string; role: string; name: string };
}

export const updateProfileImage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const imageUrl = getFileUrl(req.file);

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { profileImage: imageUrl },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profileImage: true
      }
    });

    const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';
    const newToken = jwt.sign(
      { 
        id: updatedUser.id, 
        role: updatedUser.role, 
        name: updatedUser.name, 
        profileImage: updatedUser.profileImage 
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Profile picture updated successfully',
      user: updatedUser,
      token: newToken
    });
  } catch (error) {
    console.error('Update Profile Image Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      message: 'Server Error', 
      details: errorMessage 
    });
  }
};
