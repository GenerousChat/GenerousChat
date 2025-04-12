# OpenAI TTS Setup

To use the OpenAI Text-to-Speech feature in the chat application, you need to add your OpenAI API key to the environment variables.

## Steps:

1. Add the following to your `.env` file:

```
OPENAI_API_KEY=your_openai_api_key_here
```

2. Restart your development server after adding the API key.

## Voice Options

The following voices are available:
- `nova` (default) - Female voice
- `alloy` - Neutral voice
- `echo` - Male voice
- `fable` - Female voice
- `onyx` - Male voice
- `shimmer` - Female voice

## Models

Two models are available:
- `tts-1` (default) - Standard quality, faster and cheaper
- `tts-1-hd` - Higher quality, slower and more expensive

You can change the default model in the `OpenAITTSService` constructor in `tts-manager.tsx`.
