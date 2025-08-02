## Coderocket MCP `CRUSH.md`

This file provides agentic coding agents with instructions for operating in this repository.

### Commands

- **Build:** `npm run build`
- **Lint:** `npm run lint`
- **Format:** `npm run format`
- **Test:** `npm run test`
  - To run a single test, you'll need to modify the `test` script in `package.json`. For example: `node dist/test.js --grep "My test name"`
- **Dev:** `npm run dev`

### Code Style

- **Formatting:** This project uses Prettier for code formatting. Run `npm run format` to format your code.
- **Imports:**
  - Use ES module imports (`import ... from ...`).
  - Add a `.js` extension to relative imports (e.g., `import { logger } from './logger.js'`).
  - Group imports by type: node built-in, third-party, and then local modules.
- **Types:**
  - This project uses TypeScript. All new code should have explicit types.
  - Use interfaces for public APIs and types for internal data structures.
  - Use Zod for runtime type validation where necessary.
- **Naming Conventions:**
  - Use PascalCase for classes and types (e.g., `CodeRocketService`, `ReviewResult`).
  - Use camelCase for functions and variables (e.g., `reviewCode`, `commitHash`).
  - Use UPPER_CASE for constants and environment variables (e.g., `AI_SERVICE`).
- **Error Handling:**
  - Use `try...catch` blocks for all I/O and API calls.
  - Use the `logger` to log errors.
  - Use the `errorHandler` to handle and normalize errors.
- **Async/Await:** Use `async/await` for all asynchronous operations.
- **Comments:** Add JSDoc comments to all public classes and methods.
- **General:**
  - Favor classes for managing state and related functions.
  - Use helper functions to break up complex logic.
  - Keep functions small and focused on a single task.
