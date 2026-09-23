(() => {
  let isConnected = false;
  const pendingRequests = new Map();

  function createStatusBadge() {
    if (document.getElementById('discord-ai-organizer-badge')) {
      return;
    }

    const badge = document.createElement('div');
    badge.id = 'discord-ai-organizer-badge';
    badge.className = 'discord-ai-organizer-badge disconnected';
    badge.innerHTML = `
      <div class="ai-badge-dot"></div>
      <span class="ai-badge-text">AI Organizer</span>
    `;

    badge.addEventListener('click', () => {
      showQuickInfoModal();
    });

    document.body.appendChild(badge);
  }

  function updateBadgeStatus(connected) {
    isConnected = connected;
    const badge = document.getElementById('discord-ai-organizer-badge');
    if (!badge) return;

    if (connected) {
      badge.className = 'discord-ai-organizer-badge connected';
      badge.querySelector('.ai-badge-text').textContent = 'MCP Conectado';
      badge.title = 'Conectado con MCP (Claude / Gemini listo)';
    } else {
      badge.className = 'discord-ai-organizer-badge disconnected';
      badge.querySelector('.ai-badge-text').textContent = 'Esperando MCP...';
      badge.title = 'Inicia Claude Code o Gemini CLI con discord-mcp para organizar';
    }
  }

  function showQuickInfoModal() {
    const existing = document.getElementById('discord-ai-info-modal');
    if (existing) {
      existing.remove();
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'discord-ai-info-modal';
    modal.className = 'discord-ai-modal-overlay';
    modal.innerHTML = `
      <div class="discord-ai-modal-card">
        <div class="discord-ai-modal-header">
          <h3>Discord AI Sidebar Organizer</h3>
          <button class="discord-ai-modal-close" id="discord-ai-close-btn">&times;</button>
        </div>
        <div class="discord-ai-modal-body">
          <p class="discord-ai-status-indicator ${isConnected ? 'active' : 'inactive'}">
            Estado: <strong>${isConnected ? 'Conectado a MCP (127.0.0.1:3921)' : 'Esperando conexión con MCP'}</strong>
          </p>
          <div class="discord-ai-instructions">
            <h4>Cómo organizar tus servidores con tu IA:</h4>
            <ol>
              <li>Mantén esta pestaña de Discord Web abierta.</li>
              <li>En tu terminal con Claude o Gemini, di:
                <pre><code>"Organiza mis servidores de Discord por categorías y carpetas"</code></pre>
              </li>
            </ol>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#discord-ai-close-btn').addEventListener('click', () => {
      modal.remove();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.source !== 'DISCORD_AI_INJECT') {
      return;
    }

    const { requestId, payload, error } = event.data;

    if (pendingRequests.has(requestId)) {
      const callback = pendingRequests.get(requestId);
      pendingRequests.delete(requestId);
      callback({ payload, error });
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'BRIDGE_STATUS_CHANGED') {
      updateBadgeStatus(message.connected);
      return false;
    }

    const { action, requestId, payload } = message;

    if (requestId) {
      pendingRequests.set(requestId, (result) => {
        sendResponse(result);
      });

      window.postMessage(
        {
          source: 'DISCORD_AI_CONTENT',
          action,
          requestId,
          payload
        },
        '*'
      );

      return true;
    }

    return false;
  });

  function pingBackground() {
    try {
      chrome.runtime.sendMessage({ action: 'PING' }, (res) => {
        if (chrome.runtime.lastError) return;
        if (res && typeof res.isConnected === 'boolean') {
          updateBadgeStatus(res.isConnected);
        }
      });
    } catch {}
  }

  setInterval(pingBackground, 2000);
  pingBackground();

  createStatusBadge();
})();
