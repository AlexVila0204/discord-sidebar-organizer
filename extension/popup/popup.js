document.addEventListener('DOMContentLoaded', () => {
  const statusPill = document.getElementById('status-pill');
  const statusText = document.getElementById('status-text');
  const statusCard = document.getElementById('status-card');
  const cardIcon = document.getElementById('card-icon');
  const cardMessage = document.getElementById('card-message');
  const cardSub = document.getElementById('card-sub');
  const actionBtn = document.getElementById('action-btn');
  const actionText = document.getElementById('action-text');
  const setupToggle = document.getElementById('setup-toggle');
  const setupSection = document.getElementById('setup-section');
  const copyButtons = document.querySelectorAll('.copy-btn');

  const checkIcon = `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
  const waitIcon = `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

  function setConnected() {
    statusPill.className = 'status-pill connected';
    statusText.textContent = 'Connected';
    statusCard.classList.add('active');
    cardIcon.innerHTML = checkIcon;
    cardMessage.textContent = 'Ready to organize';
    cardSub.textContent = 'Ask your AI to organize your Discord servers';
    actionText.textContent = 'Check Connection';
  }

  function setDisconnected() {
    statusPill.className = 'status-pill disconnected';
    statusText.textContent = 'Disconnected';
    statusCard.classList.remove('active');
    cardIcon.innerHTML = waitIcon;
    cardMessage.textContent = 'Waiting for MCP bridge';
    cardSub.textContent = 'Start Claude or Gemini with the MCP server';
    actionText.textContent = 'Check Connection';
  }

  function checkConnection() {
    actionText.textContent = 'Checking...';

    chrome.runtime.sendMessage({ action: 'GET_CONNECTION_STATUS' }, (res) => {
      if (chrome.runtime.lastError) {
        tryDirectSocket();
        return;
      }

      if (res && res.isConnected) {
        setConnected();
      } else {
        tryDirectSocket();
      }
    });
  }

  function tryDirectSocket() {
    const testSocket = new WebSocket('ws://127.0.0.1:3921');
    testSocket.onopen = () => {
      setConnected();
      testSocket.close();
    };
    testSocket.onerror = () => {
      setDisconnected();
    };
  }

  actionBtn.addEventListener('click', checkConnection);

  setupToggle.addEventListener('click', () => {
    setupSection.classList.toggle('open');
  });

  copyButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = btn.getAttribute('data-copy');
      if (text) {
        await navigator.clipboard.writeText(text);
        btn.classList.add('copied');
        setTimeout(() => {
          btn.classList.remove('copied');
        }, 1500);
      }
    });
  });

  checkConnection();
});
