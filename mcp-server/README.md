# ⌬ Discord AI Organizer (MCP Server)

[![npm version](https://img.shields.io/npm/v/discord-ai-organizer.svg?style=flat-square)](https://www.npmjs.com/package/discord-ai-organizer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/protocol-MCP-8B5CF6.svg?style=flat-square)](https://modelcontextprotocol.io)

**Model Context Protocol (MCP) server that lets AI assistants (Claude Code, Claude Desktop, Gemini CLI) organize your Discord servers into smart folders.**

Works alongside the companion browser extension (Chrome / Edge) connected via a secure local WebSocket bridge.

---

## ◈ Quick Start

### 1. Install & Add to your AI client

#### Claude Code
```bash
claude mcp add --scope user discord -- npx discord-ai-organizer
```

#### Claude Desktop
Add to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "discord": {
      "command": "npx",
      "args": ["discord-ai-organizer"]
    }
  }
}
```

#### Gemini CLI
```bash
gemini mcp add discord -- npx discord-ai-organizer
```

---

### 2. Browser Extension Setup

1. Clone or download the companion extension from [GitHub](https://github.com/AlexVila0204/discord-sidebar-organizer)
2. In Chrome or Edge, go to `chrome://extensions` or `edge://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the `extension/` directory
5. Open [Discord Web](https://discord.com/app)

---

### 3. Usage

In your AI terminal (Claude or Gemini), just ask:

> *"Organize my Discord servers into categories and folders"*

The AI will inspect your servers, categorize them, and create clean folders on your Discord sidebar in real time.

---

## ◈ MCP Tools Exposed

| Tool | Description |
| :--- | :--- |
| `get_discord_servers` | Fetches all joined servers, descriptions, and channel context |
| `get_current_layout` | Returns current folder layout |
| `apply_discord_folders` | Creates folders and organizes servers |
| `restore_previous_layout` | Undoes the last organization |
| `restore_original_layout` | Reverts back to initial state before any changes |

---

## ◈ Safety & Privacy

- **100% Local**: Communicates with your open Discord browser tab over local `127.0.0.1:3921`.
- **Zero Token Leakage**: No user tokens, credentials, or sensitive data are sent or stored anywhere.
- **Safe & Reversible**: Every layout change is backed up, with instant rollback support.

---

## ◈ License

MIT © [AlexVila0204](https://github.com/AlexVila0204)
