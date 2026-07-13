export function setupStdioFiltering(): void {
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalConsoleError = console.error.bind(console);

  process.stdout.write = function(chunk: string | Uint8Array, ...args: never[]): boolean {
    const message = chunk.toString();
    if (message.match(/^(\{|[\r\n]+$)/) || message.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      return originalStdoutWrite(chunk, ...args);
    }
    return true;
  } as typeof process.stdout.write;

  // Keep stdout reserved for MCP JSON-RPC, but preserve dependency messages
  // (notably the Microsoft device-code login prompt) on stderr.
  console.log = originalConsoleError;
  console.info = originalConsoleError;
  console.warn = originalConsoleError;
  console.error = originalConsoleError;
}
