# Agent Response Algorithm PRD

## Overview

This document outlines the decision-making algorithm that determines when an AI agent should respond to messages in a conversation. The current implementation (`shouldAgentRespond = true`) is simplistic and always triggers a response. This PRD proposes a more sophisticated approach that considers various factors to create a more natural conversation flow.

## Goals

- Create a more natural conversation experience by preventing the AI from responding too quickly
- Reduce unnecessary AI responses when users are rapidly sending messages
- Implement a configurable system that can be tuned based on user feedback
- Ensure the AI eventually responds when appropriate

## Algorithm Components

### 1. Message Timing Analysis

**Primary Factor: Message Timing**

The system will analyze the timestamps of recent messages to determine if they are being sent in rapid succession:

- If multiple messages from the same user are sent within a configurable time window (default: 10 seconds), the AI should delay its response
- This prevents the AI from interrupting a user who is sending multiple messages as part of a single thought

**Implementation Requirements:**
- Message history must include UTC timestamps for each message
- Add a configurable parameter `RAPID_MESSAGE_THRESHOLD_MS` (default: 10000ms)

### 2. Response Delay Mechanism

When the system determines that messages are being sent rapidly:

1. The AI should not respond immediately
2. A delayed check should be scheduled (default: 5 seconds later)
3. After the delay, the system should re-evaluate if a response is appropriate

**Implementation Requirements:**
- Create a mechanism to schedule delayed response checks
- Implement a stateful tracking system to prevent duplicate delayed checks

### 3. Message Read Status Tracking

To prevent duplicate processing and unnecessary response checks:

- Add a `read_by_ai` flag to the messages table
- Update this flag when messages have been processed by the AI
- Only process unread messages when checking if a response is needed

**Implementation Requirements:**
- Add a `read_by_ai` boolean column to the `MESSAGES_TABLE`
- Update database queries to filter by and update this flag

### 4. Configuration Parameters

The algorithm should be configurable with the following parameters:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `RAPID_MESSAGE_THRESHOLD_MS` | 10000 | Time window (ms) to consider messages as part of the same thought |
| `RESPONSE_DELAY_MS` | 5000 | Delay (ms) before rechecking if a response is appropriate |
| `MIN_MESSAGES_BEFORE_RESPONSE` | 1 | Minimum number of messages before AI responds |
| `MAX_CONSECUTIVE_USER_MESSAGES` | 5 | Maximum consecutive user messages before forcing an AI response |

## Decision Flow

1. New message arrives in a room
2. Check if the last message is from an AI agent
   - If yes, do not respond
3. Retrieve recent message history with timestamps
4. Calculate time differences between consecutive messages
5. If all recent messages (up to a configurable limit) are within the `RAPID_MESSAGE_THRESHOLD_MS`:
   - Mark messages as read
   - Schedule a delayed response check
   - Return without responding
6. If delayed check or messages aren't in rapid succession:
   - Mark messages as read
   - Generate and send AI response

## Database Schema Updates

Add to the messages table:
```sql
ALTER TABLE messages ADD COLUMN read_by_ai BOOLEAN DEFAULT FALSE;
```

## Implementation Phases

### Phase 1: Basic Timing Logic
- Implement the core timing-based decision algorithm
- Add the `read_by_ai` flag to the database
- Create the delayed response check mechanism

### Phase 2: Enhanced Decision Factors
- Add additional factors to the decision algorithm (e.g., message length, question detection)
- Implement adaptive timing based on conversation patterns
- Add analytics to track algorithm effectiveness

### Phase 3: User Customization
- Allow per-room or per-user configuration of response parameters
- Implement learning mechanisms to optimize parameters based on user engagement

## Future Considerations

- Sentiment analysis to detect urgency in messages
- Topic change detection to trigger responses
- User typing indicators to prevent responses while user is typing
- Conversation context awareness (e.g., responding more quickly to questions)
