import { WebSocket } from 'ws';
import { DiscordBridgeServer } from '../src/bridge-server.js';

async function runTest() {
  const port = 3999;
  const bridge = new DiscordBridgeServer(port);

  await bridge.start();

  const client = new WebSocket(`ws://127.0.0.1:${port}`);

  await new Promise((resolve) => {
    client.on('open', () => {
      client.send(JSON.stringify({ type: 'REGISTER_EXTENSION' }));
      setTimeout(resolve, 50);
    });
  });

  client.on('message', (raw) => {
    const message = JSON.parse(raw.toString());
    if (message.action === 'GET_SERVERS') {
      client.send(
        JSON.stringify({
          requestId: message.requestId,
          payload: [
            { id: '123', name: 'Lethal Modding', channels: ['mods-lethal', 'general'] },
            { id: '456', name: 'Dev Guild', channels: ['code', 'chat'] }
          ]
        })
      );
    }
  });

  const guilds = await bridge.getGuilds();

  if (!Array.isArray(guilds) || guilds.length !== 2) {
    throw new Error('Test failed: unexpected guilds data');
  }

  client.close();
  await bridge.stop();

  process.stdout.write('Discord Bridge Test Passed\n');
}

runTest().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
