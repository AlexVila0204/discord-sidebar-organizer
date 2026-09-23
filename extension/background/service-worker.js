const BRIDGE_URL = 'ws://127.0.0.1:3921';
let socket = null;
let reconnectTimer = null;

function broadcastStatus(connected) {
  chrome.tabs.query({ url: '*://*.discord.com/*' }, (tabs) => {
    if (tabs && tabs.length > 0) {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'BRIDGE_STATUS_CHANGED',
          connected
        }).catch(() => {});
      });
    }
  });
}

function connect() {
  if (socket) {
    if (socket.readyState === WebSocket.OPEN) {
      return;
    }
    if (socket.readyState === WebSocket.CONNECTING) {
      return;
    }
    try {
      socket.close();
    } catch {}
    socket = null;
  }

  try {
    socket = new WebSocket(BRIDGE_URL);

    socket.onopen = () => {
      console.log('[Discord-AI-ServiceWorker] Connected to MCP bridge on', BRIDGE_URL);
      socket.send(JSON.stringify({ type: 'REGISTER_EXTENSION' }));
      broadcastStatus(true);
      if (reconnectTimer) {
        clearInterval(reconnectTimer);
        reconnectTimer = null;
      }
    };

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        const { action, requestId, payload } = message;

        const tabs = await chrome.tabs.query({ url: '*://*.discord.com/*' });
        if (!tabs || tabs.length === 0) {
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(
              JSON.stringify({
                requestId,
                error: 'No active Discord Web tab found. Please open discord.com in your browser.'
              })
            );
          }
          return;
        }

        const targetTab = tabs.find((t) => t.url && t.url.includes('/channels/')) || tabs.find((t) => t.active) || tabs[0];

        chrome.tabs.sendMessage(
          targetTab.id,
          { action, requestId, payload },
          (response) => {
            if (chrome.runtime.lastError) {
              if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(
                  JSON.stringify({
                    requestId,
                    error: chrome.runtime.lastError.message
                  })
                );
              }
              return;
            }

            if (socket && socket.readyState === WebSocket.OPEN) {
              socket.send(
                JSON.stringify({
                  requestId,
                  payload: response?.payload,
                  error: response?.error
                })
              );
            }
          }
        );
      } catch (err) {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              error: err.message
            })
          );
        }
      }
    };

    socket.onclose = () => {
      broadcastStatus(false);
      socket = null;
      scheduleReconnect();
    };

    socket.onerror = () => {
      broadcastStatus(false);
      try {
        socket.close();
      } catch {}
      socket = null;
    };
  } catch {
    socket = null;
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (!reconnectTimer) {
    reconnectTimer = setInterval(() => {
      connect();
    }, 2500);
  }
}

chrome.runtime.onConnect.addListener((port) => {
  connect();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'PING' || request.action === 'GET_CONNECTION_STATUS') {
    connect();
    const isConnected = socket !== null && socket.readyState === WebSocket.OPEN;
    sendResponse({ isConnected });
  }
  return true;
});

connect();
