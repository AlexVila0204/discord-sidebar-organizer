import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';

export class DiscordBridgeServer {
  constructor(port = 3921) {
    this.port = port;
    this.server = null;
    this.extensionSocket = null;
    this.relaySocket = null;
    this.isRelayMode = false;
    this.pendingRequests = new Map();
    this.callerSockets = new Map();
    this.defaultTimeoutMs = 15000;
  }

  start() {
    return new Promise((resolve, reject) => {
      try {
        const wss = new WebSocketServer({ port: this.port });

        wss.on('listening', () => {
          this.server = wss;
          this.isRelayMode = false;
          this.setupServerHandlers();
          resolve();
        });

        wss.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
            this.startRelayMode().then(resolve).catch(reject);
          } else {
            reject(error);
          }
        });
      } catch (error) {
        this.startRelayMode().then(resolve).catch(reject);
      }
    });
  }

  setupServerHandlers() {
    this.server.on('connection', (socket) => {
      socket.on('message', (raw) => {
        try {
          const message = JSON.parse(raw.toString());

          if (message.type === 'REGISTER_EXTENSION') {
            this.extensionSocket = socket;
            return;
          }

          if (message.action) {
            if (this.extensionSocket && this.extensionSocket.readyState === WebSocket.OPEN) {
              this.callerSockets.set(message.requestId, socket);
              this.extensionSocket.send(raw.toString());
            } else {
              socket.send(
                JSON.stringify({
                  requestId: message.requestId,
                  error: 'Discord extension is not connected to bridge'
                })
              );
            }
            return;
          }

          if (message.requestId && this.callerSockets.has(message.requestId)) {
            const caller = this.callerSockets.get(message.requestId);
            this.callerSockets.delete(message.requestId);
            if (caller && caller.readyState === WebSocket.OPEN) {
              caller.send(raw.toString());
            }
            return;
          }

          if (message.requestId && this.pendingRequests.has(message.requestId)) {
            const { resolve, reject, timer } = this.pendingRequests.get(message.requestId);
            clearTimeout(timer);
            this.pendingRequests.delete(message.requestId);

            if (message.error) {
              reject(new Error(message.error));
            } else {
              resolve(message.payload);
            }
          }
        } catch {}
      });

      socket.on('close', () => {
        if (this.extensionSocket === socket) {
          this.extensionSocket = null;
        }
      });
    });
  }

  startRelayMode() {
    return new Promise((resolve, reject) => {
      this.isRelayMode = true;
      const client = new WebSocket(`ws://127.0.0.1:${this.port}`);

      client.on('open', () => {
        this.relaySocket = client;
        resolve();
      });

      client.on('message', (raw) => {
        try {
          const message = JSON.parse(raw.toString());
          if (message.requestId && this.pendingRequests.has(message.requestId)) {
            const { resolve: res, reject: rej, timer } = this.pendingRequests.get(message.requestId);
            clearTimeout(timer);
            this.pendingRequests.delete(message.requestId);

            if (message.error) {
              rej(new Error(message.error));
            } else {
              res(message.payload);
            }
          }
        } catch {}
      });

      client.on('error', (err) => {
        reject(err);
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.relaySocket) {
        this.relaySocket.close();
        this.relaySocket = null;
      }
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          this.extensionSocket = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  isClientConnected() {
    if (this.isRelayMode) {
      return this.relaySocket !== null && this.relaySocket.readyState === WebSocket.OPEN;
    }
    return this.extensionSocket !== null && this.extensionSocket.readyState === WebSocket.OPEN;
  }

  sendRequest(action, payload = {}) {
    const targetSocket = this.isRelayMode ? this.relaySocket : this.extensionSocket;

    if (!targetSocket || targetSocket.readyState !== WebSocket.OPEN) {
      return Promise.reject(
        new Error('Discord browser extension is not connected. Please ensure Discord Web is open with the extension active.')
      );
    }

    const requestId = randomUUID();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error(`Request timed out after ${this.defaultTimeoutMs}ms`));
        }
      }, this.defaultTimeoutMs);

      this.pendingRequests.set(requestId, { resolve, reject, timer });

      const message = JSON.stringify({
        requestId,
        action,
        payload
      });

      targetSocket.send(message);
    });
  }

  async getGuilds() {
    return this.sendRequest('GET_SERVERS');
  }

  async getCurrentLayout() {
    return this.sendRequest('GET_LAYOUT');
  }

  async applyFolders(params, unorganizedGuildIds = []) {
    let folders = [];
    let unorganized = [];

    if (Array.isArray(params)) {
      folders = params;
      unorganized = Array.isArray(unorganizedGuildIds) ? unorganizedGuildIds : [];
    } else if (params && typeof params === 'object') {
      folders = Array.isArray(params.folders) ? params.folders : [];
      unorganized = Array.isArray(params.unorganizedGuildIds) ? params.unorganizedGuildIds : [];
    }

    return this.sendRequest('APPLY_FOLDERS', { folders, unorganizedGuildIds: unorganized });
  }

  async restorePreviousLayout() {
    return this.sendRequest('RESTORE_PREVIOUS_LAYOUT');
  }

  async restoreOriginalLayout() {
    return this.sendRequest('RESTORE_ORIGINAL_LAYOUT');
  }
}
