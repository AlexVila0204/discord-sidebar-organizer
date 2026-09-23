#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DiscordBridgeServer } from './bridge-server.js';
import { registerDiscordTools } from './discord-mcp-tools.js';

const bridgePort = parseInt(process.env.DISCORD_BRIDGE_PORT || '3921', 10);
const bridge = new DiscordBridgeServer(bridgePort);

await bridge.start();

const mcpServer = new McpServer({
  name: 'discord-sidebar-organizer',
  version: '1.0.0'
});

registerDiscordTools(mcpServer, bridge);

const transport = new StdioServerTransport();
await mcpServer.connect(transport);

process.on('SIGINT', async () => {
  await bridge.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await bridge.stop();
  process.exit(0);
});
