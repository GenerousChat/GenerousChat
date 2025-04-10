const logger = require('../config/logger');
const SupabaseService = require('./SupabaseService');
const PusherService = require('./PusherService');

class RoomService {
    constructor(supabase) {
        this.supabase = supabase;
    }

    async getRoomMessages(roomId, limit = 50) {
        try {
            const { data, error } = await this.supabase
                .from('messages')
                .select('*')
                .eq('room_id', roomId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data.reverse();
        } catch (error) {
            logger.error('Error fetching room messages:', { error, roomId });
            throw error;
        }
    }

    async getRoomParticipants(roomId) {
        try {
            const { data, error } = await this.supabase
                .from('room_participants')
                .select('user_id, joined_at')
                .eq('room_id', roomId);

            if (error) throw error;
            return data;
        } catch (error) {
            logger.error('Error fetching room participants:', { error, roomId });
            throw error;
        }
    }

    async addMessage(roomId, userId, content) {
        try {
            const { data, error } = await this.supabase
                .from('messages')
                .insert({
                    room_id: roomId,
                    user_id: userId,
                    content: content
                })
                .select()
                .single();

            if (error) throw error;

            await PusherService.sendEvent(`room-${roomId}`, 'new-message', {
                id: data.id,
                content: data.content,
                created_at: data.created_at,
                user_id: data.user_id
            });

            return data;
        } catch (error) {
            logger.error('Error adding message:', { error, roomId, userId });
            throw error;
        }
    }

    async addParticipant(roomId, userId) {
        try {
            const { error } = await this.supabase
                .from('room_participants')
                .insert({
                    room_id: roomId,
                    user_id: userId
                });

            if (error) throw error;

            await PusherService.sendEvent(`room-${roomId}`, 'user-joined', {
                user_id: userId,
                joined_at: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Error adding participant:', { error, roomId, userId });
            throw error;
        }
    }

    async removeParticipant(roomId, userId) {
        try {
            const { error } = await this.supabase
                .from('room_participants')
                .delete()
                .eq('room_id', roomId)
                .eq('user_id', userId);

            if (error) throw error;

            await PusherService.sendEvent(`room-${roomId}`, 'user-left', {
                user_id: userId
            });
        } catch (error) {
            logger.error('Error removing participant:', { error, roomId, userId });
            throw error;
        }
    }
}

module.exports = RoomService;
