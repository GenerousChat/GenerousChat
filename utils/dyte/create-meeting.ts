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
    
    // Get Dyte API key from environment
    const dyteApiKey = process.env.NEXT_PUBLIC_DYTE_API_KEY;
    const dyteOrgId = process.env.NEXT_PUBLIC_DYTE_ORG_ID;
    
    if (!dyteApiKey || !dyteOrgId) {
      throw new Error('Dyte API key or Org ID not configured');
    }

    // First try to get existing meeting
    let meeting = await fetch(`https://api.dyte.io/v2/meetings/${roomId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(dyteApiKey)}`,
        'Content-Type': 'application/json',
      },
    });

    // If meeting doesn't exist, create it
    if (!meeting.ok) {
      const createResponse = await fetch('https://api.dyte.io/v2/meetings', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(dyteApiKey)}`,
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
    }

    // Add participant to the meeting
    const addParticipantResponse = await fetch(`https://api.dyte.io/v2/meetings/${roomId}/participants`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(dyteApiKey)}`,
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
