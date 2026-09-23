<div align="center">

# ⌬ Discord Sidebar Organizer

**Let AI organize your Discord servers into smart folders — powered by MCP**

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A518-brightgreen.svg?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/protocol-MCP-8B5CF6.svg?style=flat-square)](https://modelcontextprotocol.io)
[![Chrome](https://img.shields.io/badge/chrome-extension-4285F4.svg?style=flat-square&logo=googlechrome&logoColor=white)](#browser-extension)
[![Edge](https://img.shields.io/badge/edge-extension-0078D7.svg?style=flat-square&logo=microsoftedge&logoColor=white)](#browser-extension)

<br />

Works with **Claude Code** · **Claude Desktop** · **Gemini CLI** · **Any MCP client**

Uses your existing subscription — no extra API keys needed.

</div>

---

## ◈ What it does

Connects your Discord Web session to any AI assistant via [Model Context Protocol](https://modelcontextprotocol.io). The AI reads your server list, categorizes them by topic, and applies organized folders directly to your sidebar.

```
Before                          After
┌──────────────┐               ┌──────────────┐
│ Server A     │               │ ▸ Gaming (5) │
│ Server B     │               │ ▸ Dev (8)    │
│ Server C     │      →        │ ▸ Music (3)  │
│ Server D     │               │ ▸ Friends (4)│
│ ...60 more   │               │ ▸ ...        │
└──────────────┘               └──────────────┘
```

## ◈ How it works

```
┌─────────────┐    stdio    ┌─────────────┐    ws:3921    ┌─────────────┐
│  Claude /   │ ◄────────► │  MCP Server  │ ◄──────────► │  Extension  │
│  Gemini     │    MCP      │  (Node.js)   │   WebSocket   │  (Edge /    │
│             │             │              │               │   Chrome)   │
└─────────────┘             └─────────────┘               └──────┬──────┘
                                                                 │
                                                          ┌──────▼──────┐
                                                          │ Discord Web │
                                                          │ (browser)   │
                                                          └─────────────┘
```

## ◈ Setup

Two pieces: a **browser extension** and an **MCP server**.

### Browser Extension

1. Download or clone this repo
2. Open `edge://extensions` or `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** → select the `extension/` folder
5. Open [Discord Web](https://discord.com/app) — look for the `AI Organizer` badge

### MCP Server

<table>
<tr><td><strong>Claude Code</strong></td><td>

```bash
claude mcp add --scope user discord -- npx discord-ai-organizer
```

O si configuras tu archivo JSON de Claude Desktop:
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

#### Para Gemini CLI / Antigravity
```bash
gemini mcp add discord -- npx discord-ai-organizer
```

</td></tr>
</table>

## ◈ Usage

Open Discord Web in your browser, then ask your AI:

> *"Organize my Discord servers into folders by category"*

That's it. The AI will read your servers, group them, and apply the folders.

### Available Tools

| Tool | Description |
| :--- | :--- |
| `get_discord_servers` | Reads all joined servers with names, descriptions and channels |
| `get_current_layout` | Returns the current folder structure |
| `apply_discord_folders` | Applies a new folder organization |
| `restore_previous_layout` | Undoes the last change |
| `restore_original_layout` | Reverts to the state before any AI changes |

## ◈ Safety

| Concern | Answer |
| :--- | :--- |
| Will I get banned? | No. Reads data passively from your open browser session. No automation, no bots. |
| Does it store my token? | No. Everything runs locally. No data leaves your machine. |
| Can I undo changes? | Yes. `restore_previous_layout` or `restore_original_layout` at any time. |
| What if I close Discord? | The extension reconnects automatically when you reopen it. |

## ◈ Requirements

- Node.js ≥ 18
- Chrome or Edge
- Any MCP-compatible AI client

## ◈ License

[MIT](LICENSE) — Open source, free forever.
