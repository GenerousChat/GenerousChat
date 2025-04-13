import express, { Request, Response } from 'express';
import logger from '../config/logger.js';
import pusherService from '../services/pusher.js';

// Define interfaces for request bodies
interface JoinRequestBody {
  roomId: string;
  userId: string;
  joinedAt?: string;
}

interface LeaveRequestBody {
  roomId: string;
  userId: string;
}

const router = express.Router();

router.post('/join', async (req: Request, res: Response) => {
    const { roomId, userId, joinedAt } = req.body as JoinRequestBody;
    
    try {
        await pusherService.sendUserJoined(
            roomId,
            userId,
            joinedAt || new Date().toISOString()
        );
        
        logger.info('User joined room', { roomId, userId });
        res.json({ success: true });
    } catch (error) {
        logger.error('Error handling participant join', { 
            error: error instanceof Error ? error.message : String(error), 
            roomId, 
            userId 
        });
        res.status(500).json({ error: 'Failed to process join request' });
    }
});

router.post('/leave', async (req: Request, res: Response) => {
    const { roomId, userId } = req.body as LeaveRequestBody;
    
    try {
        await pusherService.sendUserLeft(roomId, userId);
        
        logger.info('User left room', { roomId, userId });
        res.json({ success: true });
    } catch (error) {
        logger.error('Error handling participant leave', { 
            error: error instanceof Error ? error.message : String(error), 
            roomId, 
            userId 
        });
        res.status(500).json({ error: 'Failed to process leave request' });
    }
});

export default router;
