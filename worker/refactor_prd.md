# TypeScript Refactoring PRD - Worker Service

## Project Overview

The worker service is a critical component that bridges Supabase and Pusher, handling real-time events and message processing. The service currently uses a mix of JavaScript and TypeScript files. This document outlines the plan to fully refactor the codebase to TypeScript to improve code quality, maintainability, and developer experience.

## Goals

1. Convert all JavaScript files to TypeScript
2. Define proper types for all components and services
3. Maintain consistent import patterns
4. Ensure type safety throughout the codebase
5. Improve code documentation with TypeScript JSDoc

## Current State Assessment

Currently, the codebase has:

- 1 TypeScript file (index.ts)
- 1 TypeScript declaration file (types.d.ts)
- 39 JavaScript files (.js extension)
- TypeScript configuration files already in place (tsconfig.json, tsconfig.build.json)

The main entry point (index.ts) already uses TypeScript, but imports JavaScript modules using `.js` extensions, which will need to be updated as files are converted.

## Refactoring Approach

1. Create TypeScript interfaces for all data structures
2. Convert files one directory at a time, starting with utilities and core services
3. Update imports as files are converted
4. Test functionality after each conversion batch
5. Update build and deployment scripts as needed

## File-by-File Refactoring Plan

### Phase 1: Core Types and Utilities

1. Enhance `types.d.ts` with comprehensive type definitions
2. Convert utility files:
   - `/utils/crypto.js` → `/utils/crypto.ts`
   - `/utils/log-rotation.js` → `/utils/log-rotation.ts`
   - `/utils/logger.js` → `/utils/logger.ts`
   - `/utils/shouldAgentRespond.js` → `/utils/shouldAgentRespond.ts`

### Phase 2: Services

Convert service files that form the core functionality:

- `/services/ai.js` → `/services/ai.ts`
- `/services/pusher.js` → `/services/pusher.ts`
- `/services/supabase.js` → `/services/supabase.ts`

### Phase 3: Middleware

Convert middleware components:

- `/middleware/error-handler.js` → `/middleware/error-handler.ts`
- `/middleware/logger.js` → `/middleware/logger.ts`
- `/middleware/morgan.js` → `/middleware/morgan.ts`

### Phase 4: Routes

Convert all route handlers:

- `/routes/ai.js` → `/routes/ai.ts`
- `/routes/canvas.js` → `/routes/canvas.ts`
- `/routes/health.js` → `/routes/health.ts`
- `/routes/index.js` → `/routes/index.ts`
- `/routes/participants.js` → `/routes/participants.ts`
- `/routes/pusher.js` → `/routes/pusher.ts`
- `/routes/rooms.js` → `/routes/rooms.ts`

### Phase 5: Configuration

Convert configuration files:

- `/config/index.js` → `/config/index.ts`
- `/config/logger.js` → `/config/logger.ts`

## TypeScript Conversion Guidelines

For each file, follow these steps:

1. Create a new `.ts` file with the same name
2. Copy the content from the `.js` file
3. Add appropriate type definitions for:
   - Function parameters and return types
   - Variables and constants
   - Class properties and methods
   - Event handlers
4. Update imports to use other TypeScript files (maintaining `.js` extensions in import statements if using ES modules)
5. Address any TypeScript errors and warnings
6. Add JSDoc comments for better documentation

## Import Pattern Updates

Currently, imports in the TypeScript file use `.js` extensions:

```typescript
import logger from "./utils/logger.js";
import supabaseService from "./services/supabase.js";
```

This pattern should be maintained even after conversion to TypeScript if the project uses ES modules, as the compiled JavaScript will need these extensions. The TypeScript compiler should be configured to handle this pattern.

## Type Definitions To Create

1. **Service Types**:

   - SupabaseService interface
   - PusherService interface
   - AIService interface

2. **Data Models**:

   - Message interface (already defined in index.ts)
   - Participant interface (already defined in index.ts)
   - Room interface
   - User/Profile interface
   - Agent interface
   - Canvas and related interfaces

3. **Configuration Types**:
   - Environment configuration
   - Logger configuration
   - Service configurations

## Testing Strategy

1. Convert files in batches by functionality area
2. Run TypeScript compiler after each batch to catch type errors
3. Execute relevant unit tests if available
4. Perform manual testing for critical paths
5. Test integration points between components

## Build and CI/CD Updates

1. Update build scripts if necessary
2. Ensure TypeScript compilation is part of the build process
3. Update any CI/CD pipelines to handle TypeScript
4. Update Docker configuration if needed

## Estimated Timeline

- Phase 1 (Core Types and Utilities): 1 day
- Phase 2 (Services): 1-2 days
- Phase 3 (Middleware): 1 day
- Phase 4 (Routes): 1-2 days
- Phase 5 (Configuration): 0.5 day
- Phase 6 (Scripts and Migrations): 1 day
- Testing and refinement: 1-2 days

Total estimated time: 6-9.5 days

## Success Criteria

1. All JavaScript files converted to TypeScript
2. TypeScript compiler runs without errors
3. Application functionality unchanged
4. No runtime errors related to type mismatches
5. Improved code documentation and readability
6. Better developer experience with type safety and auto-completion
