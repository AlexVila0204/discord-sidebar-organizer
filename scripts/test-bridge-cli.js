import { WebSocket } from 'ws';

const port = 3921;
const ws = new WebSocket(`ws://127.0.0.1:${port}`);

ws.on('open', () => {
  process.stdout.write('Connected to Discord Bridge\n');
  process.stdout.write('Requesting servers from active Discord Web tab...\n');

  const requestId = 'manual-test-' + Date.now();
  const request = {
    action: 'GET_SERVERS',
    requestId,
    payload: {}
  };

  ws.send(JSON.stringify(request));
});

ws.on('message', (raw) => {
  try {
    const data = JSON.parse(raw.toString());
    process.stdout.write('\nResponse received from Discord Web:\n');
    process.stdout.write(JSON.stringify(data, null, 2) + '\n');
    ws.close();
    process.exit(0);
  } catch (err) {
    process.stderr.write(`Failed to parse response: ${err.message}\n`);
    ws.close();
    process.exit(1);
  }
});

ws.on('error', (err) => {
  process.stderr.write(`Error connecting to bridge: ${err.message}\nMake sure the MCP server is running on port ${port}\n`);
  process.exit(1);
});

setTimeout(() => {
  process.stderr.write('Timeout: Discord Web did not respond within 10 seconds. Make sure Discord Web is open with the extension loaded.\n');
  ws.close();
  process.exit(1);
}, 10000);
