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
    token: string;
    id: string;
    name: string;
    custom_participant_id: string;
    preset_id: string;
  };
}

export async function createOrJoinMeeting(roomId: string, userId: string, userName: string) {
  try {
    const supabase = createClient();
    
    // Get Dyte credentials from environment
    const dyteApiKey = process.env.NEXT_PUBLIC_DYTE_API_KEY;
    const dyteOrgId = process.env.NEXT_PUBLIC_DYTE_ORG_ID;
    const dyteAuthHeader = process.env.NEXT_PUBLIC_DYTE_AUTH_HEADER;
    
    if (!dyteApiKey || !dyteOrgId || !dyteAuthHeader) {
      throw new Error('Dyte API key or Org ID not configured');
    }
    
    const baseUrl = 'https://api.dyte.io/v2';
    
    // Create auth header by encoding orgId:apiKey using browser's btoa function
    const authHeader = dyteAuthHeader;    
    console.log('Using Dyte config:', {
      orgId: dyteOrgId,
      baseUrl,
      // Don't log the full auth header or API key for security
      authHeaderPrefix: authHeader.substring(0, 20) + '...'
    });

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
      console.log('Found existing Dyte meeting:', meetingId);
    } else {
      console.log('Creating new Dyte meeting for room:', roomId);
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
      
      // Log the raw response for debugging
      console.log('Dyte create meeting response:', {
        status: createResponse.status,
        statusText: createResponse.statusText,
        headers: Object.fromEntries(createResponse.headers.entries())
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('Dyte API error:', {
          status: createResponse.status,
          statusText: createResponse.statusText,
          response: errorText
        });
        throw new Error(`Failed to create meeting: ${createResponse.status} ${createResponse.statusText}`);
      }

      const meetingData = (await createResponse.json()) as DyteMeetingResponse;
      if (!meetingData.success) {
        console.error('Dyte API returned error:', meetingData);
        throw new Error('Failed to create meeting: API returned unsuccessful response');
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

    console.log('Adding participant to meeting:', {
      meetingId,
      userName,
      userId,
      presetName: process.env.NEXT_PUBLIC_DYTE_PRESET_NAME || 'group_call_host'
    });

    // Add participant to the meeting
    const addParticipantResponse = await fetch(`${baseUrl}/meetings/${meetingId}/participants`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: userName,
        preset_name: process.env.NEXT_PUBLIC_DYTE_PRESET_NAME || 'group_call_host',
        custom_participant_id: userId,
      }),
    });

    // Log the raw response for debugging
    console.log('Dyte add participant response:', {
      status: addParticipantResponse.status,
      statusText: addParticipantResponse.statusText,
      headers: Object.fromEntries(addParticipantResponse.headers.entries())
    });

    if (!addParticipantResponse.ok) {
      const errorText = await addParticipantResponse.text();
      console.error('Dyte API error:', {
        status: addParticipantResponse.status,
        statusText: addParticipantResponse.statusText,
        response: errorText
      });
      throw new Error(`Failed to add participant: ${addParticipantResponse.status} ${addParticipantResponse.statusText}`);
    }

    const participantData = (await addParticipantResponse.json()) as DyteParticipantResponse;
    console.log('Dyte participant response data:', {
      success: participantData.success,
      hasData: !!participantData.data,
      hasToken: participantData.data?.token ? 'yes' : 'no',
      tokenLength: participantData.data?.token?.length
    });
    
    if (!participantData.success || !participantData.data || !participantData.data.token) {
      console.error('Dyte API returned invalid response:', participantData);
      throw new Error('Failed to add participant: Missing token in response');
    }

    return participantData.data.token;
  } catch (error) {
    console.error('Error in createOrJoinMeeting:', error);
    throw error;
  }
}
