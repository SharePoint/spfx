import { ConsoleTerminalProvider, Terminal } from '@rushstack/terminal';

const terminal: Terminal = new Terminal(new ConsoleTerminalProvider());

async function main(): Promise<void> {
  terminal.writeLine('Hello from SPFx CLI!');
}

// Start the server if this file is run directly
main().catch((error) => {
  terminal.writeErrorLine('Error:', error.toString());
  process.exit(1);
});
