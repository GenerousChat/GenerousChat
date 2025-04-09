# Text-to-Speech System

## Design

The TTS system is designed to be simple and database-driven:

1. All voices are managed through the `agents` table in the database
2. Each agent has:
   - `id`: UUID
   - `voice`: The OpenAI voice to use (e.g. 'nova', 'echo', etc)
   - `gender`: The gender of the voice (used as fallback if voice not set)

## Voice Selection

1. When TTS service initializes:
   - Loads all agent voices into memory
   - No hardcoded voice lists - everything comes from the database

2. When a message needs to be spoken:
   - If from an agent: Uses their cached voice from memory
   - If not from an agent: Uses the provided voice or falls back to 'nova'

## Performance

- Agent voices are cached on initialization to avoid database queries per message
- No complex voice selection logic or fallbacks - just use what's in the database
