const express = require('express');
const router = express.Router();
const logger = require('../config/logger');

router.post('/generation', async (req, res) => {
    const { roomId, htmlContent, summary, createdBy } = req.body;
    
    try {
        const { data: generation, error } = await req.app.locals.supabase
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

        await req.app.locals.pusher.sendEvent(`room-${roomId}`, 'new-generation', {
            generation_id: generation.id,
            type: 'visualization',
            created_at: generation.created_at,
        });

        logger.info('Canvas generation created', { roomId, generationId: generation.id });
        res.json(generation);
    } catch (error) {
        logger.error('Error creating canvas generation', { error, roomId });
        res.status(500).json({ error: 'Failed to create canvas generation' });
    }
});

router.get('/:roomId/latest', async (req, res) => {
    const { roomId } = req.params;
    
    try {
        const { data, error } = await req.app.locals.supabase
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
        logger.error('Error fetching latest canvas', { error, roomId });
        res.status(500).json({ error: 'Failed to fetch latest canvas' });
    }
});

module.exports = router;
