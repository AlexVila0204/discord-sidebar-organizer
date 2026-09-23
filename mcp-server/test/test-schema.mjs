import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const transport = new StdioClientTransport({
  command: 'node',
  args: ['src/index.js'],
  cwd: projectRoot
});

const client = new Client({ name: 'schema-test', version: '1.0.0' });
await client.connect(transport);

const { tools } = await client.listTools();

for (const tool of tools) {
  console.log(`\n=== ${tool.name} ===`);
  console.log('inputSchema:', JSON.stringify(tool.inputSchema, null, 2));
}

await client.close();
process.exit(0);
