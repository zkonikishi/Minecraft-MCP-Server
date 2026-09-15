# Integration probes

## Via read-only smoke

`node scripts/via-connection-smoke.mjs --port 29568 --version 26.2 --mode via-proxy --backend 1.20.1`

This probe requires an already running isolated localhost endpoint. It reads player state and captures the experimental structure view, then closes its own MCP client via stdin EOF. It never starts Java, sends server commands, or stops the server. Port 25565 is rejected. See [Via compatibility](../docs/via-compatibility.md) for setup and tested routes.

## Existing plugin probes

These scripts exercise the built MCP server against the isolated Paper 26.2 test server at `127.0.0.1:29565` using the offline `MCPTestBot` account.

1. Run `npm install` and `npm run build` from the repository root.
2. Start the isolated Paper 26.2 server on port 29565. Do not point these probes at the production port 25565.
3. Run a probe with `node scripts/<name>.mjs`.
4. Stop the client and isolated server when finished. `stop-test-server.mjs` sends `/stop`, so use it only for the isolated test server.

The `md-*` probes require the matching MythicDungeons test content and permissions. `coretools-mythic-pages-smoke.mjs` connects with Mineflayer directly; the other probes start `dist/main.js` over MCP stdio.
