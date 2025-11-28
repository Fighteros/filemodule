# filemodule

Backend application generated with create-backend CLI.

## Getting Started

1. Copy the environment file:
   ```bash
   cp .env.example .env
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run start:dev
   ```

## Available Scripts

- `npm run build` - Build the application
- `npm run start:dev` - Start in development mode with watch
- `npm run start:prod` - Start in production mode
- `npm run test` - Run tests
- `npm run lint` - Lint the code

## Project Structure

- `src/` - Source code
  - `common/` - Shared utilities, DTOs, entities, interfaces
  - `config/` - Configuration files and validation schemas
  - `core/` - Core application logic (filters, interceptors, pipes)
  - `modules/` - Feature modules
  - `main.ts` - Application entry point
- `test/` - E2E tests
