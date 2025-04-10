const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const RoomService = require('../services/RoomService');

router.get('/messages/:roomId', async (req, res) => {
    const { roomId } = req.params;
    const { limit } = req.query;
    
    try {
        const roomService = new RoomService(req.app.locals.supabase);
        const messages = await roomService.getRoomMessages(roomId, limit);
        res.json(messages);
    } catch (error) {
        logger.error('Error fetching room messages', { error, roomId });
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

router.get('/participants/:roomId', async (req, res) => {
    const { roomId } = req.params;
    
    try {
        const roomService = new RoomService(req.app.locals.supabase);
        const participants = await roomService.getRoomParticipants(roomId);
        res.json(participants);
    } catch (error) {
        logger.error('Error fetching room participants', { error, roomId });
        res.status(500).json({ error: 'Failed to fetch participants' });
    }
});

router.post('/messages', async (req, res) => {
    const { roomId, userId, content } = req.body;
    
    try {
        const roomService = new RoomService(req.app.locals.supabase);
        const message = await roomService.addMessage(roomId, userId, content);
        res.json(message);
    } catch (error) {
        logger.error('Error adding message', { error, roomId, userId });
        res.status(500).json({ error: 'Failed to add message' });
    }
});

module.exports = router;
