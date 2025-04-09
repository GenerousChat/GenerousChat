import { createClient } from "@/utils/supabase/client";

interface DyteMeetingResponse {
  success: boolean;
  data: {
    id: string;
    roomName: string;
    status: string;
    createdAt: string;
  };
}

interface DyteParticipantResponse {
  success: boolean;
  data: {
    authToken: string;
    id: string;
  };
}

export async function createOrJoinMeeting(roomId: string, userId: string, userName: string) {
  try {
    const supabase = createClient();
    
    // Get Dyte credentials from environment
    const dyteApiKey = process.env.NEXT_PUBLIC_DYTE_API_KEY;
    const dyteOrgId = process.env.NEXT_PUBLIC_DYTE_ORG_ID;
    
    if (!dyteApiKey || !dyteOrgId) {
      throw new Error('Dyte API key or Org ID not configured');
    }
    
    // Create auth header by encoding orgId:apiKey
    const authHeader = `Basic ${Buffer.from(`${dyteOrgId}:${dyteApiKey}`).toString('base64')}`;
    const baseUrl = 'https://api.dyte.io/v2';

    // Check if we have a mapping for this room
    const { data: mapping } = await supabase
      .from('dyte_meetings')
      .select('meeting_id')
      .eq('room_id', roomId)
      .single();

    let meetingId: string;

    if (mapping?.meeting_id) {
      // Use existing meeting
      meetingId = mapping.meeting_id;
    } else {
      // Create new meeting
      const createResponse = await fetch(`${baseUrl}/meetings`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Chat Room ${roomId}`,
          preferred_region: 'ap-south-1',
          record_on_start: false,
        }),
      });

      const meetingData = (await createResponse.json()) as DyteMeetingResponse;
      if (!meetingData.success) {
        throw new Error('Failed to create meeting');
      }
      meetingId = meetingData.data.id;

      // Store the mapping
      await supabase
        .from('dyte_meetings')
        .insert({
          room_id: roomId,
          meeting_id: meetingId
        });
    }

    // Add participant to the meeting
    const addParticipantResponse = await fetch(`${baseUrl}/meetings/${meetingId}/participants`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: userName,
        preset_name: 'group_call_host',
        custom_participant_id: userId,
      }),
    });

    const participantData = (await addParticipantResponse.json()) as DyteParticipantResponse;
    if (!participantData.success) {
      throw new Error('Failed to add participant');
    }

    return participantData.data.authToken;
  } catch (error) {
    console.error('Error in createOrJoinMeeting:', error);
    throw error;
  }
}
