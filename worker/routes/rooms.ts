import express, { Request, Response } from 'express';
import logger from '../config/logger.js';
import supabaseService from '../services/supabase.js';
import { SupabaseClient } from '@supabase/supabase-js';

// Define interfaces for request bodies and params
interface MessageRequestBody {
  roomId: string;
  userId: string;
  content: string;
}

interface RequestWithParams extends Request {
  params: {
    roomId: string;
  };
  query: {
    limit?: string;
  };
}

// Define a custom type for request with Supabase client
type RequestWithSupabase = Request & {
  // Use type assertion when accessing app.locals.supabase in the handlers
}

const router = express.Router();

router.get('/messages/:roomId', async (req: RequestWithParams, res: Response) => {
    const { roomId } = req.params;
    const { limit } = req.query;
    const messageLimit = limit ? parseInt(limit, 10) : 50;
    
    try {
        // Use supabase service directly instead of RoomService
        const { data: messages, error } = await supabaseService.supabase
            .from('messages')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: false })
            .limit(messageLimit);
            
        if (error) throw error;
            
        res.json(messages);
    } catch (error) {
        logger.error('Error fetching room messages', { 
            error: error instanceof Error ? error.message : String(error), 
            roomId 
        });
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

router.get('/participants/:roomId', async (req: RequestWithParams, res: Response) => {
    const { roomId } = req.params;
    
    try {
        // Use supabase service directly instead of RoomService
        const { data: participants, error } = await supabaseService.supabase
            .from('room_participants')
            .select('*')
            .eq('room_id', roomId);
            
        if (error) throw error;
            
        res.json(participants);
    } catch (error) {
        logger.error('Error fetching room participants', { 
            error: error instanceof Error ? error.message : String(error), 
            roomId 
        });
        res.status(500).json({ error: 'Failed to fetch participants' });
    }
});

router.post('/messages', async (req: Request, res: Response) => {
    const { roomId, userId, content } = req.body as MessageRequestBody;
    
    try {
        // Use supabaseService directly to add a message
        const message = await supabaseService.saveMessage(roomId, userId, content);
        res.json(message);
    } catch (error) {
        logger.error('Error adding message', { 
            error: error instanceof Error ? error.message : String(error), 
            roomId, 
            userId 
        });
        res.status(500).json({ error: 'Failed to add message' });
    }
});

export default router;
