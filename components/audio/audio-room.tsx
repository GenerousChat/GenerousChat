"use client";

import { useEffect, useState, useRef } from 'react';
import { useDyteMeeting, useDyteSelector } from '@dytesdk/react-web-core';
import { 
  provideDyteDesignSystem, 
  DyteAudioVisualizer,
  DyteButton,
  DyteIcon,
  defaultIconPack
} from '@dytesdk/react-ui-kit';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Users, Settings } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface AudioRoomProps {
  roomId: string;
  userId: string;
  userName: string;
}

interface CurrentDevices {
  audio?: MediaDeviceInfo;
  speaker?: MediaDeviceInfo;
}

export default function AudioRoom({ roomId, userId, userName }: AudioRoomProps) {
  const { meeting } = useDyteMeeting();
  const roomJoined = useDyteSelector((meeting) => meeting?.self?.roomJoined || false);
  const audioEnabled = useDyteSelector((meeting) => meeting?.self?.audioEnabled || false);
  const participants = useDyteSelector((meeting) => meeting?.participants?.active || {});
  const [error, setError] = useState<string>('');
  const [showParticipants, setShowParticipants] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  
  // Audio device state
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [speakerDevices, setSpeakerDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDevices, setCurrentDevices] = useState<CurrentDevices>({});
  const testAudioEl = useRef<HTMLAudioElement>(null);
  
  // Use refs to track state without triggering re-renders
  const joiningRef = useRef(false);
  const joinAttemptedRef = useRef(false);

  // Log state for debugging
  useEffect(() => {
    try {
      console.log('AudioRoom component state:', {
        roomJoined,
        audioEnabled,
        participantsCount: Object.keys(participants).length,
        meetingState: meeting?.self?.roomJoined ? 'started' : 'not started',
        selfId: meeting?.self?.id,
        isJoining,
        joinAttempted: joinAttemptedRef.current
      });
    } catch (error) {
      console.warn('Error logging state:', error);
    }
  }, [roomJoined, audioEnabled, participants, meeting, isJoining]);

  // Initialize design system once
  useEffect(() => {
    try {
      provideDyteDesignSystem(document.body, {
        theme: 'light',
      });
    } catch (error) {
      console.warn('Failed to provide Dyte design system:', error);
    }

    return () => {
      // Cleanup when component unmounts
      try {
        if (roomJoined) {
          meeting.leaveRoom();
        }
      } catch (error) {
        console.warn('Error during cleanup:', error);
      }
    };
  }, []);

  // Join room effect - only runs once when component mounts
  useEffect(() => {
    // Skip if we've already attempted to join or if already joined or if meeting is not ready
    if (!meeting || roomJoined || joinAttemptedRef.current || joiningRef.current) return;

    const joinRoom = async () => {
      // Set flags to prevent concurrent calls using refs (won't trigger re-renders)
      joinAttemptedRef.current = true;
      joiningRef.current = true;
      
      // Also set state for UI updates
      setIsJoining(true);
      
      try {
        console.log('AudioRoom: Attempting to join room...');
        await meeting.joinRoom();
        console.log('AudioRoom: Manual room join successful');
        // Clear any previous errors on success
        setError('');
      } catch (error) {
        console.error('AudioRoom: Error joining room:', error);
        // Only set error if we're not already joined (could be a race condition where join succeeded)
        if (!meeting?.self?.roomJoined) {
          setError('Failed to connect to audio room');
        } else {
          // If somehow we're joined despite the error, clear any error
          setError('');
        }
      } finally {
        joiningRef.current = false;
        setIsJoining(false);
      }
    };

    // Execute join with a small delay to avoid React 18 double-effect in dev mode
    const timer = setTimeout(() => {
      joinRoom();
    }, 50);
    
    return () => clearTimeout(timer);
  }, [meeting, roomJoined]);

  // Enable audio once room is joined
  useEffect(() => {
    console.log("================", {roomJoined, audioEnabled, meeting});
    if (!roomJoined || audioEnabled || !meeting?.self) return;
    
    const enableAudio = async () => {
      try {
        console.log('AudioRoom: Enabling audio in room...');
        await meeting.self.enableAudio();
        console.log('AudioRoom: Audio enabled successfully');
      } catch (error) {
        console.error('AudioRoom: Error enabling audio:', error);
        setError('Failed to enable microphone');
      }
    };
    
    enableAudio();
  }, [roomJoined, audioEnabled, meeting]);

  // Initialize audio devices
  useEffect(() => {
    if (!meeting) return;
    
    const deviceListUpdateCallback = async () => {
      try {
        setAudioDevices(await meeting.self.getAudioDevices());
        setSpeakerDevices(await meeting.self.getSpeakerDevices());
      } catch (error) {
        console.error('Error getting devices:', error);
      }
    };
    
    meeting.self.addListener('deviceListUpdate', deviceListUpdateCallback);
    
    // Populate initial values
    deviceListUpdateCallback();
    
    // Set current devices
    setCurrentDevices({
      audio: meeting.self.getCurrentDevices().audio,
      speaker: meeting.self.getCurrentDevices().speaker,
    });
    
    return () => {
      meeting.self.removeListener('deviceListUpdate', deviceListUpdateCallback);
    };
  }, [meeting]);

  // Set up event listeners once
  useEffect(() => {
    if (!meeting?.self || !meeting?.participants) return;
    
    // Room events
    const onRoomJoined = () => {
      console.log('Room joined event fired');
    };
    
    const onRoomLeft = () => {
      console.log('Left audio room');
    };

    // Media events
    const onMediaPermissionError = ({ message, kind }: {message: string, kind: string}) => {
      console.error(`Media permission error: ${kind} - ${message}`);
      if (kind === 'audio') {
        setError('Microphone permission denied. Please check your browser settings.');
      }
    };

    const onAudioUpdate = (payload: { audioEnabled: boolean; audioTrack: MediaStreamTrack }) => {
      console.log('Audio state updated:', payload.audioEnabled ? 'enabled' : 'disabled');
    };

    // Participant events
    const onParticipantJoined = (participant: any) => {
      console.log('Participant joined:', participant.name);
    };

    const onParticipantLeft = (participant: any) => {
      console.log('Participant left:', participant.name);
    };

    const onActiveSpeakerChanged = (participant: any) => {
      console.log('Active speaker changed:', participant?.name || 'None');
    };

    // Add listeners
    meeting.self.on('roomJoined', onRoomJoined);
    meeting.self.on('roomLeft', onRoomLeft);
    meeting.self.on('mediaPermissionError', onMediaPermissionError);
    meeting.self.on('audioUpdate', onAudioUpdate);
    meeting.participants.joined.on('participantJoined', onParticipantJoined);
    meeting.participants.joined.on('participantLeft', onParticipantLeft);
    meeting.participants.active.on('audioUpdate', onActiveSpeakerChanged);

    // Cleanup listeners
    return () => {
      meeting.self.off('roomJoined', onRoomJoined);
      meeting.self.off('roomLeft', onRoomLeft);
      meeting.self.off('mediaPermissionError', onMediaPermissionError);
      meeting.self.off('audioUpdate', onAudioUpdate);
      meeting.participants.joined.off('participantJoined', onParticipantJoined);
      meeting.participants.joined.off('participantLeft', onParticipantLeft);
      meeting.participants.active.off('audioUpdate', onActiveSpeakerChanged);
    };
  }, [meeting]);

  const toggleAudio = async () => {
    try {
      if (audioEnabled) {
        await meeting.self.disableAudio();
      } else {
        await meeting.self.enableAudio();
      }
      setError('');
    } catch (error) {
      console.error('Error toggling audio:', error);
      setError('Failed to toggle microphone');
    }
  };

  const setDevice = (kind: 'audio' | 'speaker', deviceId: string) => {
    try {
      const device =
        kind === 'audio'
          ? audioDevices.find((d) => d.deviceId === deviceId)
          : speakerDevices.find((d) => d.deviceId === deviceId);
      
      setCurrentDevices((oldDevices) => ({
        ...oldDevices,
        [kind]: device,
      }));
      
      if (device != null) {
        meeting.self.setDevice(device);
        if (device.kind === 'audiooutput' && testAudioEl.current) {
          if ((testAudioEl.current as any)?.setSinkId) {
            (testAudioEl.current as any)?.setSinkId(device.deviceId);
          }
        }
      }
    } catch (error) {
      console.error('Error setting device:', error);
      setError(`Failed to set ${kind} device`);
    }
  };

  const testAudio = () => {
    testAudioEl?.current?.play();
  };

  // Don't return early if there's an error, just show it alongside the controls
  // This allows recovery if the room eventually connects

  return (
    <>
      {/* Hidden audio element for testing speakers */}
      <audio
        preload="auto"
        src="https://assets.dyte.io/ui-kit/speaker-test.mp3"
        ref={testAudioEl}
      />
      
      <div className="fixed bottom-4 right-4 flex items-center gap-2">
        {error ? (
          <div className="bg-destructive text-destructive-foreground px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            {error}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-5 w-5 rounded-full ml-1 p-0" 
              onClick={() => {
                setError('');
                // Try joining again if not already joined
                if (!roomJoined && !joiningRef.current) {
                  joinAttemptedRef.current = false;
                  // This will trigger the join effect again
                }
              }}
            >
              ×
            </Button>
          </div>
        ) : roomJoined ? (
          <>
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Audio Settings</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col p-4 space-y-4">
                  {meeting.self.permissions.canProduceAudio === 'ALLOWED' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Microphone</label>
                      <div className="space-y-2">
                        <select
                          className="w-full text-ellipsis bg-background border border-input p-2 rounded-md text-sm"
                          onChange={(e) =>
                            setDevice('audio', (e.target as HTMLSelectElement).value)
                          }
                        >
                          {audioDevices.map(({ deviceId, label }, index) => (
                            <option
                              key={deviceId || `mic-${index}`}
                              value={deviceId}
                              selected={currentDevices.audio?.deviceId === deviceId}
                            >
                              {label || `Microphone ${index + 1}`}
                            </option>
                          ))}
                        </select>
                        {meeting?.self && (
                          <div className="h-10 border border-input rounded-md overflow-hidden p-2">
                            <DyteAudioVisualizer participant={meeting.self} />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {speakerDevices.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Speaker Output</label>
                      <div className="space-y-2">
                        <select
                          className="w-full text-ellipsis bg-background border border-input p-2 rounded-md text-sm"
                          onChange={(e) =>
                            setDevice('speaker', (e.target as HTMLSelectElement).value)
                          }
                        >
                          {speakerDevices.map(({ deviceId, label }, index) => (
                            <option
                              key={deviceId || `speaker-${index}`}
                              value={deviceId}
                              selected={currentDevices.speaker?.deviceId === deviceId}
                            >
                              {label || `Speaker ${index + 1}`}
                            </option>
                          ))}
                        </select>
                        <Button
                          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                          onClick={testAudio}
                        >
                          Test Speaker
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            
            <Popover open={showParticipants} onOpenChange={setShowParticipants}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Users className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                <div className="space-y-2">
                  <div className="font-medium text-sm">Audio Participants</div>
                  {Object.keys(participants).length === 0 ? (
                    <div className="text-sm text-muted-foreground">No participants</div>
                  ) : (
                    <div className="space-y-1">
                      {Object.values(participants).map((participant: any) => {
                        // Ensure we have a valid key by using userId or a fallback
                        const participantKey = participant.id || participant.userId || `participant-${Math.random()}`;
                        return (
                          <div
                            key={participantKey}
                            className="flex items-center justify-between text-sm py-1"
                          >
                            <span>{participant.name}</span>
                            {participant.audioEnabled ? (
                              <div className="flex items-center gap-1">
                                <Mic className="h-3 w-3 text-green-500" />
                                {participant.audioEnabled && (
                                  <div className="h-3">
                                    <DyteAudioVisualizer participant={participant} />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <MicOff className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={toggleAudio}
            >
              {audioEnabled ? (
                <Mic className="h-4 w-4" />
              ) : (
                <MicOff className="h-4 w-4" />
              )}
            </Button>

            <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Audio Connected
              {audioEnabled && meeting?.self && (
                <div className="h-4 w-10">
                  <DyteAudioVisualizer participant={meeting.self} />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-amber-500 text-white px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            {isJoining ? 'Connecting...' : 'Waiting for audio'}
          </div>
        )}
      </div>
    </>
  );
}
