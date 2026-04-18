/**
 * ThreadMine — Main Popup Logic
 * Audience research extractor for content creators
 */
(() => {
  'use strict';

  // ─── State ───
  let currentResults = null;
  let currentMeta = null;

  // ─── AI Provider Setup (shared pattern) ───
  const ai = new AIClient();
  const providerSelect = document.getElementById('provider-select');
  const modelSelect = document.getElementById('model-select');
  const aiStatus = document.getElementById('ai-status');
  const statusDot = aiStatus?.querySelector('.status-dot');
  const statusText = aiStatus?.querySelector('span:last-child');
  const btnApiKey = document.getElementById('btn-api-key');
  const apiKeyWrap = document.getElementById('api-key-wrap');
  const apiKeyInput = document.getElementById('api-key-input');
  const btnSaveKey = document.getElementById('btn-save-key');

  async function refreshAIStatus() {
    const available = await ai.isAvailable();
    if (available) {
      aiStatus.className = 'ollama-status connected';
      statusDot.className = 'status-dot online';
      statusText.textContent = 'AI';
    } else {
      aiStatus.className = 'ollama-status disconnected';
      statusDot.className = 'status-dot offline';
      statusText.textContent = 'AI';
    }
  }

  async function loadModels() {
    const models = await ai.listModels();
    modelSelect.innerHTML = '';
    if (models.length === 0) {
      modelSelect.innerHTML = '<option value="">No models</option>';
      return;
    }
    models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name + (m.size ? ` (${m.size})` : '');
      modelSelect.appendChild(opt);
    });
    const current = await ai.getModel();
    if (current) modelSelect.value = current;
  }

  async function initProvider() {
    const provider = await ai.getProvider();
    providerSelect.value = provider;
    const providerDef = AI_PROVIDERS[provider];
    btnApiKey.style.display = providerDef?.requiresKey ? '' : 'none';
    await loadModels();
    await refreshAIStatus();
  }

  providerSelect?.addEventListener('change', async () => {
    await ai.setProvider(providerSelect.value);
    await initProvider();
  });

  modelSelect?.addEventListener('change', async () => {
    await ai.setModel(modelSelect.value);
  });

  btnApiKey?.addEventListener('click', () => {
    apiKeyWrap.style.display = apiKeyWrap.style.display === 'none' ? '' : 'none';
  });

  btnSaveKey?.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    if (!key) return;
    const provider = await ai.getProvider();
    await ai.setApiKey(provider, key);
    apiKeyInput.value = '';
    apiKeyWrap.style.display = 'none';
    await refreshAIStatus();
    showToast('API key saved', 'success');
  });

  // ─── Tabs ───
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => {
        c.classList.remove('active');
        c.style.display = 'none';
      });
      tab.classList.add('active');
      const target = document.getElementById(`tab-${tab.dataset.tab}`);
      if (target) {
        target.classList.add('active');
        target.style.display = '';
      }
      if (tab.dataset.tab === 'library') loadLibrary();
    });
  });

  // ─── Platform Detection ───
  const PLATFORM_CONFIG = {
    reddit: { icon: '🟠', name: 'Reddit Thread' },
    x: { icon: '𝕏', name: 'X / Twitter Post' },
    youtube: { icon: '▶️', name: 'YouTube Comments' },
    linkedin: { icon: '🔵', name: 'LinkedIn Post' },
    hackernews: { icon: '🟧', name: 'Hacker News' },
    generic: { icon: '🌐', name: 'Web Page' },
  };

  async function detectPage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_CONTENT' });
      if (response) {
        const config = PLATFORM_CONFIG[response.platform] || PLATFORM_CONFIG.generic;
        document.getElementById('platform-icon').textContent = config.icon;
        document.getElementById('platform-name').textContent = config.name;
        const countBadge = document.getElementById('comment-count');
        const count = response.comments?.length || 0;
        if (count > 0) {
          countBadge.textContent = `${count} items`;
          countBadge.style.display = '';
        }
        return response;
      }
    } catch (e) {
      console.log('Could not extract page content:', e);
    }
    return null;
  }

  // ─── Analyze ───
  const btnAnalyze = document.getElementById('btn-analyze');
  const analyzeText = document.getElementById('analyze-text');
  const loadingState = document.getElementById('loading-state');
  const resultsContainer = document.getElementById('results-container');
  const errorState = document.getElementById('error-state');

  btnAnalyze?.addEventListener('click', () => runAnalysis());
  document.getElementById('btn-reanalyze')?.addEventListener('click', () => runAnalysis());
  document.getElementById('btn-retry')?.addEventListener('click', () => runAnalysis());

  async function runAnalysis() {
    // Reset UI
    resultsContainer.style.display = 'none';
    errorState.style.display = 'none';
    loadingState.style.display = '';
    btnAnalyze.disabled = true;
    analyzeText.textContent = 'Mining...';

    try {
      const pageData = await detectPage();
      if (!pageData || !pageData.comments?.length || (pageData.comments.length === 1 && !pageData.comments[0].trim())) {
        showError('No Content Found', 'Could not extract text from this page. Try a Reddit thread, X post, YouTube video, LinkedIn post, or any text-heavy article.');
        return;
      }

      currentMeta = {
        title: pageData.title,
        url: pageData.url,
        platform: pageData.platform,
        date: new Date().toISOString(),
      };

      const response = await chrome.runtime.sendMessage({
        type: 'ANALYZE_THREAD',
        ...pageData,
      });

      if (response?.success && response.data) {
        currentResults = response.data;
        renderResults(response.data);
        loadingState.style.display = 'none';
        resultsContainer.style.display = '';
      } else {
        showError('Analysis Failed', response?.error || 'AI returned no results. Check your AI connection.');
      }
    } catch (e) {
      showError('Connection Error', e.message || 'Could not connect to AI. Make sure Ollama is running.');
    } finally {
      btnAnalyze.disabled = false;
      analyzeText.textContent = 'Analyze This Page';
    }
  }

  function showError(title, text) {
    loadingState.style.display = 'none';
    resultsContainer.style.display = 'none';
    errorState.style.display = '';
    document.getElementById('error-title').textContent = title;
    document.getElementById('error-text').textContent = text;
    btnAnalyze.disabled = false;
    analyzeText.textContent = 'Analyze This Page';
  }

  // ─── Render Results ───
  const SECTION_MAP = {
    pain_points: { container: 'items-pain-points', count: 'count-pain-points', bullet: '•' },
    hook_ideas: { container: 'items-hook-ideas', count: 'count-hook-ideas', bullet: '→' },
    faqs: { container: 'items-faqs', count: 'count-faqs', bullet: '?' },
    objections: { container: 'items-objections', count: 'count-objections', bullet: '⚡' },
    video_angles: { container: 'items-video-angles', count: 'count-video-angles', bullet: '▸' },
    carousel_ideas: { container: 'items-carousel-ideas', count: 'count-carousel-ideas', bullet: '◆' },
  };

  function renderResults(data) {
    for (const [key, config] of Object.entries(SECTION_MAP)) {
      const items = data[key] || [];
      const container = document.getElementById(config.container);
      const countEl = document.getElementById(config.count);

      countEl.textContent = items.length;
      container.innerHTML = '';

      if (items.length === 0) {
        const section = document.getElementById(`section-${key.replace(/_/g, '-')}`);
        if (section) section.style.display = 'none';
        continue;
      }

      items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
          <span class="item-bullet">${config.bullet}</span>
          <span class="item-text">${escapeHtml(item)}</span>
          <span class="item-copy" title="Copy">📋</span>
        `;
        div.querySelector('.item-copy').addEventListener('click', (e) => {
          e.stopPropagation();
          copyText(item);
        });
        div.addEventListener('click', () => copyText(item));
        container.appendChild(div);
      });
    }
  }

  // ─── Copy ───
  function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied!', 'success');
    });
  }

  document.querySelectorAll('.copy-section').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const section = btn.dataset.section;
      if (currentResults?.[section]) {
        const text = currentResults[section].map((item, i) => `${i + 1}. ${item}`).join('\n');
        copyText(text);
      }
    });
  });

  document.getElementById('btn-copy-all')?.addEventListener('click', () => {
    if (!currentResults) return;
    let text = '';
    const labels = {
      pain_points: '🔥 PAIN POINTS',
      hook_ideas: '🎣 HOOK IDEAS',
      faqs: '❓ FAQs',
      objections: '🛡️ OBJECTIONS',
      video_angles: '🎬 VIDEO ANGLES',
      carousel_ideas: '📱 CAROUSEL IDEAS',
    };
    for (const [key, label] of Object.entries(labels)) {
      const items = currentResults[key] || [];
      if (items.length > 0) {
        text += `\n${label}\n`;
        items.forEach((item, i) => { text += `  ${i + 1}. ${item}\n`; });
      }
    }
    if (currentMeta) {
      text = `ThreadMine Report — ${currentMeta.title}\n${currentMeta.url}\n${new Date(currentMeta.date).toLocaleDateString()}\n${text}`;
    }
    copyText(text.trim());
  });

  // ─── Save to Library ───
  document.getElementById('btn-save')?.addEventListener('click', async () => {
    if (!currentResults || !currentMeta) return;
    const entry = {
      id: StorageUtils.generateId(),
      ...currentMeta,
      results: currentResults,
    };
    const { tm_library = [] } = await StorageUtils.get('tm_library');
    tm_library.unshift(entry);
    // Keep max 50
    if (tm_library.length > 50) tm_library.length = 50;
    await StorageUtils.set({ tm_library });
    showToast('Saved to library!', 'success');
  });

  // ─── Library ───
  async function loadLibrary() {
    const { tm_library = [] } = await StorageUtils.get('tm_library');
    const listEl = document.getElementById('library-list');
    const searchInput = document.getElementById('library-search');

    function render(items) {
      if (items.length === 0) {
        listEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📚</div>
            <div class="empty-state-title">No saved insights yet</div>
            <div class="empty-state-text">Mine a thread and save the results to build your library.</div>
          </div>
        `;
        return;
      }
      listEl.innerHTML = '';
      items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'library-item';
        const config = PLATFORM_CONFIG[item.platform] || PLATFORM_CONFIG.generic;
        const date = new Date(item.date).toLocaleDateString();
        const totalInsights = Object.values(item.results || {}).reduce((sum, arr) => sum + (arr?.length || 0), 0);
        div.innerHTML = `
          <div class="library-item-title">${config.icon} ${escapeHtml(item.title)}</div>
          <div class="library-item-meta">
            <span>${date}</span>
            <span>•</span>
            <span>${totalInsights} insights</span>
          </div>
          <div class="library-item-actions">
            <button class="btn btn-ghost btn-sm lib-view" data-id="${item.id}">👁️ View</button>
            <button class="btn btn-ghost btn-sm lib-copy" data-id="${item.id}">📋 Copy</button>
            <button class="btn btn-ghost btn-sm lib-delete" data-id="${item.id}" style="color:var(--accent-red);">🗑️</button>
          </div>
        `;
        listEl.appendChild(div);
      });

      // Event handlers
      listEl.querySelectorAll('.lib-view').forEach(btn => {
        btn.addEventListener('click', () => {
          const entry = items.find(i => i.id === btn.dataset.id);
          if (entry) {
            currentResults = entry.results;
            currentMeta = { title: entry.title, url: entry.url, platform: entry.platform, date: entry.date };
            renderResults(entry.results);
            resultsContainer.style.display = '';
            errorState.style.display = 'none';
            // Switch to mine tab
            document.querySelector('.tab[data-tab="mine"]')?.click();
          }
        });
      });

      listEl.querySelectorAll('.lib-copy').forEach(btn => {
        btn.addEventListener('click', () => {
          const entry = items.find(i => i.id === btn.dataset.id);
          if (entry?.results) {
            let text = `ThreadMine — ${entry.title}\n`;
            for (const [key, vals] of Object.entries(entry.results)) {
              if (vals?.length) {
                text += `\n${key.toUpperCase().replace(/_/g, ' ')}\n`;
                vals.forEach((v, i) => { text += `  ${i + 1}. ${v}\n`; });
              }
            }
            copyText(text.trim());
          }
        });
      });

      listEl.querySelectorAll('.lib-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          const { tm_library = [] } = await StorageUtils.get('tm_library');
          const updated = tm_library.filter(i => i.id !== btn.dataset.id);
          await StorageUtils.set({ tm_library: updated });
          loadLibrary();
          showToast('Deleted', 'success');
        });
      });
    }

    render(tm_library);

    // Search
    searchInput?.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase().trim();
      if (!q) {
        render(tm_library);
        return;
      }
      const filtered = tm_library.filter(item =>
        item.title?.toLowerCase().includes(q) ||
        JSON.stringify(item.results).toLowerCase().includes(q)
      );
      render(filtered);
    });
  }

  // ─── Toast ───
  function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
  }

  // ─── Helpers ───
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── Init ───
  initProvider();
  detectPage();
})();
