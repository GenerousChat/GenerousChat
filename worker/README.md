# Worker Service

This worker service bridges Supabase events to Pusher. It has been integrated with the main project and now uses the root package.json for dependencies.

## Running the Worker

The worker can now be run from the root directory using the following commands:

```bash
# Development mode with auto-reload
npm run worker:dev

# Build the worker
npm run worker:build

# Run the built worker in production mode
npm run worker:start
```

## TypeScript Support

The worker now has full TypeScript support. The TypeScript configuration extends from the main project's tsconfig.json while adding worker-specific settings.

## Path Aliases

The worker can now use the same path aliases as the main project (e.g., `@/utils/*`), making it easier to share code between the Next.js app and the worker.

## Note on Deprecation

The worker's separate package.json has been deprecated in favor of using the root package.json. This ensures consistent dependencies across the entire project.
