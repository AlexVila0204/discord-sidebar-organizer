(() => {
  let previousLayoutBackup = null;
  let cachedWpRequire = null;

  function getWebpackRequire() {
    if (cachedWpRequire) return cachedWpRequire;
    try {
      if (window.webpackChunkdiscord_app) {
        window.webpackChunkdiscord_app.push([
          ['discord_ai_' + Math.random()],
          {},
          (r) => {
            cachedWpRequire = r;
          }
        ]);
      }
    } catch {}
    return cachedWpRequire;
  }

  function getWebpackModules() {
    const wp = getWebpackRequire();
    return wp?.c || null;
  }

  function findModule(predicate) {
    const modules = getWebpackModules();
    if (!modules) return null;

    for (const id in modules) {
      const mod = modules[id]?.exports;
      if (!mod) continue;

      const candidates = [mod, mod.default, mod.Z, mod.ZP].filter(Boolean);
      for (const target of candidates) {
        try {
          if (predicate(target)) {
            return target;
          }
        } catch {}
      }
    }
    return null;
  }

  function getAuthToken() {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      const raw = iframe.contentWindow.localStorage.getItem('token');
      iframe.remove();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) return parsed;
      }
    } catch {}

    try {
      const authStore = findModule((m) => typeof m?.getToken === 'function' && (typeof m?.getId === 'function' || typeof m?.getUserId === 'function'));
      if (authStore) {
        const token = authStore.getToken();
        if (token) return token;
      }
    } catch {}

    try {
      const m = findModule((x) => typeof x?.getToken === 'function');
      if (m) {
        const token = m.getToken();
        if (token) return token;
      }
    } catch {}

    return null;
  }

  function getGuildStore() {
    return findModule((m) => typeof m?.getGuilds === 'function' && typeof m?.getGuild === 'function');
  }

  function getSortedGuildStore() {
    return findModule((m) => {
      if (typeof m?.getGuildFolders === 'function') {
        try {
          const res = m.getGuildFolders();
          return Array.isArray(res);
        } catch {
          return false;
        }
      }
      return false;
    });
  }

  function getChannelStore() {
    return findModule((m) => typeof m?.getChannels === 'function' && (typeof m?.getChannelsForGuild === 'function' || typeof m?.getMutableGuildChannelsForGuild === 'function'));
  }

  function getUserSettingsModule() {
    return findModule((m) => typeof m?.updateGuildFolders === 'function');
  }

  function extractServersFromStores() {
    const guildStore = getGuildStore();
    if (!guildStore) return null;

    const raw = guildStore.getGuilds();
    if (!raw || typeof raw !== 'object') return null;

    let list = [];
    if (Array.isArray(raw)) {
      list = raw;
    } else if (raw instanceof Map || typeof raw.values === 'function') {
      list = Array.from(raw.values());
    } else {
      list = Object.values(raw);
    }

    const validList = list.filter((g) => g && g.id && g.name);
    if (validList.length === 0) return null;

    const channelStore = getChannelStore();

    return validList.map((g) => {
      let channels = [];
      if (channelStore) {
        try {
          const fn = channelStore.getChannelsForGuild || channelStore.getMutableGuildChannelsForGuild;
          if (typeof fn === 'function') {
            const rawChannels = fn.call(channelStore, g.id);
            const chArr = Array.isArray(rawChannels) ? rawChannels : Object.values(rawChannels || {});
            channels = chArr
              .filter((c) => c && c.name && (c.type === 0 || c.type === 2))
              .slice(0, 8)
              .map((c) => c.name);
          }
        } catch {}
      }

      return {
        id: String(g.id),
        name: g.name,
        description: g.description || '',
        icon: g.icon || null,
        channels
      };
    });
  }

  function extractServersFromDom() {
    const links = document.querySelectorAll('a[href*="/channels/"]');
    const servers = [];
    const seenIds = new Set();

    links.forEach((link) => {
      const href = link.getAttribute('href') || '';
      const match = href.match(/\/channels\/(\d{17,20})\b/);
      if (!match) return;

      const id = match[1];
      if (seenIds.has(id)) return;

      let name = link.getAttribute('aria-label') || '';
      if (!name) {
        const img = link.querySelector('img[alt]');
        if (img) {
          name = img.getAttribute('alt') || '';
        }
      }
      if (!name) {
        const child = link.querySelector('[aria-label]');
        if (child) {
          name = child.getAttribute('aria-label') || '';
        }
      }

      name = name.replace(/,\s*\d+\s*(unread|notification|mencion|mensajes).*$/i, '').trim();

      if (id && name) {
        seenIds.add(id);
        servers.push({
          id,
          name,
          description: '',
          icon: link.querySelector('img')?.getAttribute('src') || null,
          channels: []
        });
      }
    });

    if (servers.length === 0) {
      const nodes = document.querySelectorAll('[data-list-item-id^="guildsnav___"]');
      nodes.forEach((node) => {
        const idAttr = node.getAttribute('data-list-item-id') || '';
        const rawId = idAttr.replace('guildsnav___', '').trim();

        if (/^\d{17,20}$/.test(rawId) && !seenIds.has(rawId)) {
          let name = node.getAttribute('aria-label') || '';
          if (!name) {
            const child = node.querySelector('[aria-label]');
            if (child) {
              name = child.getAttribute('aria-label') || '';
            }
          }
          name = name.replace(/,\s*\d+\s*(unread|notification|mencion|mensajes).*$/i, '').trim();

          if (rawId && name) {
            seenIds.add(rawId);
            servers.push({
              id: rawId,
              name,
              description: '',
              icon: node.querySelector('img')?.getAttribute('src') || null,
              channels: []
            });
          }
        }
      });
    }

    return servers;
  }

  async function fetchServersFromApi(token) {
    const response = await fetch('/api/v9/users/@me/guilds', {
      headers: {
        Authorization: token,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Discord API returned status ${response.status}`);
    }

    const guilds = await response.json();
    return guilds.map((g) => ({
      id: String(g.id),
      name: g.name,
      description: g.description || '',
      icon: g.icon,
      channels: []
    }));
  }

  async function getServers() {
    try {
      const storeServers = extractServersFromStores();
      if (storeServers && storeServers.length > 0) {
        return storeServers;
      }
    } catch {}

    const token = getAuthToken();
    if (token) {
      try {
        const apiServers = await fetchServersFromApi(token);
        if (apiServers && apiServers.length > 0) {
          return apiServers;
        }
      } catch {}
    }

    try {
      const domServers = extractServersFromDom();
      if (domServers && domServers.length > 0) {
        return domServers;
      }
    } catch {}

    return [];
  }

  async function getCurrentLayout() {
    const sortedStore = getSortedGuildStore();
    if (sortedStore) {
      try {
        const folders = sortedStore.getGuildFolders();
        if (Array.isArray(folders)) {
          return folders.map((f) => ({
            id: f.folderId || f.id || null,
            name: f.folderName || f.name || null,
            color: f.folderColor || f.color || null,
            guildIds: f.guildIds || f.guild_ids || []
          }));
        }
      } catch {}
    }

    const token = getAuthToken();
    if (token) {
      try {
        const res = await fetch('/api/v9/users/@me/settings', {
          headers: { Authorization: token }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.guild_folders)) {
            return data.guild_folders.map((f) => ({
              id: f.id || null,
              name: f.name || null,
              color: f.color || null,
              guildIds: f.guild_ids || []
            }));
          }
        }
      } catch {}
    }

    return [];
  }

  async function applyFolders(foldersInput, unorganizedGuildIds = []) {
    let folders = [];
    let unorganized = [];

    if (Array.isArray(foldersInput)) {
      folders = foldersInput;
      unorganized = Array.isArray(unorganizedGuildIds) ? unorganizedGuildIds : [];
    } else if (foldersInput && typeof foldersInput === 'object') {
      folders = Array.isArray(foldersInput.folders) ? foldersInput.folders : (Array.isArray(foldersInput) ? foldersInput : []);
      unorganized = Array.isArray(foldersInput.unorganizedGuildIds) ? foldersInput.unorganizedGuildIds : (Array.isArray(unorganizedGuildIds) ? unorganizedGuildIds : []);
    }

    console.log('[Discord-AI-Inject] applyFolders received folders count:', folders.length, 'unorganized count:', unorganized.length);

    if (!folders || folders.length === 0) {
      console.warn('[Discord-AI-Inject] Blocked attempt to apply empty folders list');
      throw new Error('Refusing to apply empty folders list: this would remove all folders. Please specify your folder categories.');
    }

    const current = await getCurrentLayout();
    if (current && current.length > 0) {
      previousLayoutBackup = current;
      try {
        if (!sessionStorage.getItem('discord_ai_initial_backup')) {
          sessionStorage.setItem('discord_ai_initial_backup', JSON.stringify(current));
        }
        sessionStorage.setItem('discord_ai_previous_backup', JSON.stringify(current));
      } catch {}
    }

    const formattedGuildFolders = [];
    const assignedGuildIds = new Set();

    folders.forEach((folder, index) => {
      const rawGuildIds = folder.guildIds || folder.guild_ids || folder.servers || folder.guilds || [];
      const validGuildIds = (Array.isArray(rawGuildIds) ? rawGuildIds : []).map(String);

      validGuildIds.forEach((id) => assignedGuildIds.add(id));

      formattedGuildFolders.push({
        id: folder.id || Date.now() + index,
        name: folder.name || folder.folderName || folder.title || 'Folder',
        color: folder.color || folder.folderColor || 5793266,
        guild_ids: validGuildIds
      });
    });

    if (Array.isArray(unorganized)) {
      unorganized.forEach((guildId) => {
        const idStr = String(guildId);
        if (!assignedGuildIds.has(idStr)) {
          assignedGuildIds.add(idStr);
          formattedGuildFolders.push({
            id: null,
            name: null,
            color: null,
            guild_ids: [idStr]
          });
        }
      });
    }

    const userSettings = getUserSettingsModule();
    if (userSettings && typeof userSettings.updateGuildFolders === 'function') {
      try {
        userSettings.updateGuildFolders(formattedGuildFolders);
        return { success: true, count: folders.length };
      } catch {}
    }

    const token = getAuthToken();
    if (token) {
      const response = await fetch('/api/v9/users/@me/settings', {
        method: 'PATCH',
        headers: {
          Authorization: token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          guild_folders: formattedGuildFolders
        })
      });

      if (response.ok) {
        return { success: true, count: folders.length };
      }

      const errorText = await response.text();
      throw new Error(`Discord API error: ${response.status} - ${errorText}`);
    }

    throw new Error('Failed to update guild folders on Discord');
  }

  async function applyStoredLayout(backup) {
    if (!backup || backup.length === 0) {
      throw new Error('No backup layout available');
    }

    const formatted = backup.map((f) => ({
      id: f.id,
      name: f.name,
      color: f.color,
      guild_ids: f.guildIds || f.guild_ids || []
    }));

    const userSettings = getUserSettingsModule();
    if (userSettings && typeof userSettings.updateGuildFolders === 'function') {
      try {
        userSettings.updateGuildFolders(formatted);
        return { success: true };
      } catch {}
    }

    const token = getAuthToken();
    if (token) {
      const response = await fetch('/api/v9/users/@me/settings', {
        method: 'PATCH',
        headers: {
          Authorization: token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          guild_folders: formatted
        })
      });

      if (response.ok) {
        return { success: true };
      }
    }

    throw new Error('Failed to restore layout');
  }

  async function restorePreviousLayout() {
    let backup = previousLayoutBackup;
    if (!backup) {
      try {
        const raw = sessionStorage.getItem('discord_ai_previous_backup');
        if (raw) backup = JSON.parse(raw);
      } catch {}
    }
    if (!backup) {
      try {
        const raw = sessionStorage.getItem('discord_ai_initial_backup');
        if (raw) backup = JSON.parse(raw);
      } catch {}
    }

    return applyStoredLayout(backup);
  }

  async function restoreOriginalLayout() {
    let backup = null;
    try {
      const raw = sessionStorage.getItem('discord_ai_initial_backup');
      if (raw) backup = JSON.parse(raw);
    } catch {}

    if (!backup) {
      backup = previousLayoutBackup;
    }

    return applyStoredLayout(backup);
  }

  window.addEventListener('message', async (event) => {
    if (event.source !== window || !event.data || event.data.source !== 'DISCORD_AI_CONTENT') {
      return;
    }

    const { action, requestId, payload } = event.data;

    let responsePayload = null;
    let errorMessage = null;

    try {
      switch (action) {
        case 'GET_SERVERS':
          responsePayload = await getServers();
          break;
        case 'GET_LAYOUT':
          responsePayload = await getCurrentLayout();
          break;
        case 'APPLY_FOLDERS':
          responsePayload = await applyFolders(payload?.folders || payload, payload?.unorganizedGuildIds);
          break;
        case 'RESTORE_PREVIOUS_LAYOUT':
          responsePayload = await restorePreviousLayout();
          break;
        case 'RESTORE_ORIGINAL_LAYOUT':
          responsePayload = await restoreOriginalLayout();
          break;
        default:
          errorMessage = `Unknown action: ${action}`;
      }
    } catch (err) {
      errorMessage = err.message;
    }

    window.postMessage(
      {
        source: 'DISCORD_AI_INJECT',
        requestId,
        payload: responsePayload,
        error: errorMessage
      },
      '*'
    );
  });
})();
