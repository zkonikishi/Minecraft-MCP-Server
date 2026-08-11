# Integration probes

These scripts exercise the built MCP server against the isolated Paper 26.2 test server at `127.0.0.1:29565` using the offline `MCPTestBot` account.

1. Run `npm install` and `npm run build` from the repository root.
2. Start the isolated Paper 26.2 server on port 29565. Do not point these probes at the production port 25565.
3. Run a probe with `node scripts/<name>.mjs`.
4. Stop the client and isolated server when finished. `stop-test-server.mjs` sends `/stop`, so use it only for the isolated test server.

The `md-*` probes require the matching MythicDungeons test content and permissions. `coretools-mythic-pages-smoke.mjs` connects with Mineflayer directly; the other probes start `dist/main.js` over MCP stdio.
