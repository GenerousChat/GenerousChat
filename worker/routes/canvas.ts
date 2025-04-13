import express, { Request, Response, RequestHandler } from 'express';
import logger from '../config/logger.js';
import { SupabaseClient } from '@supabase/supabase-js';
import pusherService from '../services/pusher.js';

// Define interfaces for request body and application locals
interface CanvasGenerationBody {
  roomId: string;
  htmlContent: string;
  summary?: string;
  createdBy: string;
}

// Define a custom type for the request
type RequestWithSupabase = Request & {
  // Use type assertion when accessing app.locals.supabase in the handlers
}

const router = express.Router();

router.post('/generation', (async (req: RequestWithSupabase, res: Response) => {
    const { roomId, htmlContent, summary, createdBy } = req.body as CanvasGenerationBody;
    
    try {
        const { data: generation, error } = await (req as any).app.locals.supabase
            .from('chat_room_generations')
            .insert({
                room_id: roomId,
                html: htmlContent,
                summary: summary || 'Generate a visual summary of this conversation',
                created_by: createdBy,
                type: 'visualization',
                metadata: {
                    model: 'o3-mini',
                }
            })
            .select()
            .single();

        if (error) throw error;

        await pusherService.sendNewGeneration(
            roomId,
            generation.id,
            'visualization',
            generation.created_at
        );

        logger.info('Canvas generation created', { roomId, generationId: generation.id });
        res.json(generation);
    } catch (error) {
        logger.error('Error creating canvas generation', { 
            error: error instanceof Error ? error.message : String(error), 
            roomId 
        });
        res.status(500).json({ error: 'Failed to create canvas generation' });
    }
}) as RequestHandler);

router.get('/:roomId/latest', (async (req: RequestWithSupabase, res: Response) => {
    const { roomId } = req.params;
    
    try {
        const { data, error } = await (req as any).app.locals.supabase
            .from('chat_room_generations')
            .select('*')
            .eq('room_id', roomId)
            .eq('type', 'visualization')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) throw error;

        logger.info('Latest canvas retrieved', { roomId });
        res.json(data);
    } catch (error) {
        logger.error('Error fetching latest canvas', { 
            error: error instanceof Error ? error.message : String(error), 
            roomId 
        });
        res.status(500).json({ error: 'Failed to fetch latest canvas' });
    }
}) as RequestHandler);

export default router;
