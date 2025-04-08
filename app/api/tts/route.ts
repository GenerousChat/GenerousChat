import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text, voice = 'nova', model = 'tts-1', speed = 1.0 } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model, // 'tts-1' or 'tts-1-hd' for higher quality
        voice: voice,  // options: 'alloy', 'echo', 'fable', 'onyx', 'shimmer', 'nova', etc.
        input: text,
        speed: speed, // Speed multiplier between 0.25 and 4.0
        response_format: 'mp3'
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI TTS API error:', error);
      return NextResponse.json({ error }, { status: 500 });
    }

    const buffer = await response.arrayBuffer();
    
    // Convert to base64 for easy handling in the browser
    const base64Audio = Buffer.from(buffer).toString('base64');
    
    return NextResponse.json({ 
      audio: base64Audio,
      format: 'mp3',
      contentType: 'audio/mpeg'
    });
  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json({ error: 'Failed to generate speech' }, { status: 500 });
  }
}
