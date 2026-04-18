/**
 * PostVault — Main Popup Logic
 * Creator snippet manager: save, organize, and paste reusable text
 */
(() => {
  'use strict';

  const CATEGORY_ICONS = {
    hooks: '🎣',
    ctas: '📢',
    disclaimers: '⚖️',
    links: '🔗',
    uncategorized: '📋',
  };

  const PLATFORM_ICONS = {
    x: '𝕏',
    linkedin: '🔵',
    instagram: '📸',
    youtube: '▶️',
    facebook: '📘',
    threads: '🧵',
    web: '🌐',
  };

  let allSnippets = [];
  let allCampaigns = [];
  let activeCategory = 'all';
  let searchQuery = '';

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
      if (tab.dataset.tab === 'campaigns') loadCampaigns();
      if (tab.dataset.tab === 'settings') loadStats();
    });
  });

  // ─── Category Filter ───
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.cat;
      renderSnippets();
    });
  });

  // ─── Search ───
  const searchInput = document.getElementById('search-input');
  searchInput?.addEventListener('input', () => {
    searchQuery = searchInput.value.trim().toLowerCase();
    renderSnippets();
  });

  // ─── Load Snippets ───
  async function loadSnippets() {
    const { pv_snippets = [] } = await StorageUtils.get('pv_snippets');
    allSnippets = pv_snippets;
    renderSnippets();
  }

  async function saveSnippets() {
    await StorageUtils.set({ pv_snippets: allSnippets });
  }

  // ─── Render Snippets ───
  function renderSnippets() {
    const listEl = document.getElementById('snippet-list');
    let filtered = allSnippets;

    // Category filter
    if (activeCategory !== 'all') {
      filtered = filtered.filter(s => s.category === activeCategory);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(s =>
        s.text.toLowerCase().includes(searchQuery) ||
        (s.tags || []).some(t => t.toLowerCase().includes(searchQuery)) ||
        (s.category || '').toLowerCase().includes(searchQuery)
      );
    }

    if (filtered.length === 0) {
      const emptyMsg = allSnippets.length === 0
        ? 'Add your first reusable hook, CTA, or link below.'
        : 'No snippets match your filter.';
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📌</div>
          <div class="empty-state-title">${allSnippets.length === 0 ? 'No snippets yet' : 'No results'}</div>
          <div class="empty-state-text">${emptyMsg}</div>
        </div>
      `;
      return;
    }

    listEl.innerHTML = '';
    filtered.forEach(snippet => {
      const div = document.createElement('div');
      div.className = 'snippet-item';
      div.dataset.id = snippet.id;

      const catIcon = CATEGORY_ICONS[snippet.category] || '📋';
      const platformBadge = snippet.platform && snippet.platform !== 'web'
        ? `<span class="snippet-platform-badge">${PLATFORM_ICONS[snippet.platform] || ''} ${snippet.platform}</span>`
        : '';
      const tagHtml = (snippet.tags || []).map(t => `<span class="snippet-tag">${escapeHtml(t)}</span>`).join('');

      div.innerHTML = `
        <span class="snippet-cat-icon">${catIcon}</span>
        <div class="snippet-content">
          <div class="snippet-text">${escapeHtml(snippet.text)}</div>
          <div class="snippet-meta">
            ${platformBadge}
            ${tagHtml}
          </div>
        </div>
        <div class="snippet-actions">
          <button class="btn btn-ghost btn-sm snippet-paste-btn" title="Paste into active field">📋</button>
          <button class="btn btn-ghost btn-sm snippet-delete-btn" title="Delete">🗑️</button>
        </div>
      `;

      // Paste button
      div.querySelector('.snippet-paste-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        pasteSnippet(snippet);
      });

      // Delete button
      div.querySelector('.snippet-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSnippet(snippet.id);
      });

      // Click to copy
      div.addEventListener('click', () => {
        copyText(snippet.text);
        div.classList.add('paste-flash');
        setTimeout(() => div.classList.remove('paste-flash'), 600);
      });

      listEl.appendChild(div);
    });
  }

  // ─── Paste Snippet ───
  async function pasteSnippet(snippet) {
    // Determine text: use platform variant if available
    let text = snippet.text;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id && snippet.variants) {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'DETECT_PLATFORM' });
        const platform = response?.platform;
        if (platform && snippet.variants[platform]) {
          text = snippet.variants[platform];
        }
      }

      if (tab?.id) {
        const result = await chrome.tabs.sendMessage(tab.id, { type: 'PASTE_SNIPPET', text });
        if (result?.success) {
          showToast('Pasted! ✅', 'success');
          trackPaste();
          return;
        }
      }
    } catch (e) {
      // Content script not available, fall back to clipboard
    }

    // Fallback: copy to clipboard
    copyText(text);
    trackPaste();
  }

  async function trackPaste() {
    const { pv_paste_count = 0 } = await StorageUtils.get('pv_paste_count');
    await StorageUtils.set({ pv_paste_count: pv_paste_count + 1 });
  }

  // ─── Delete Snippet ───
  async function deleteSnippet(id) {
    allSnippets = allSnippets.filter(s => s.id !== id);
    await saveSnippets();
    renderSnippets();
    showToast('Deleted', 'success');
  }

  // ─── Add Snippet ───
  const btnAdd = document.getElementById('btn-add-snippet');
  const addForm = document.getElementById('add-form');
  const btnCancel = document.getElementById('btn-cancel-add');
  const btnSave = document.getElementById('btn-save-snippet');
  const btnToggleVariants = document.getElementById('btn-toggle-variants');
  const variantFields = document.getElementById('variant-fields');

  btnAdd?.addEventListener('click', () => {
    addForm.style.display = '';
    btnAdd.style.display = 'none';
    document.getElementById('new-snippet-text').focus();
  });

  btnCancel?.addEventListener('click', () => {
    addForm.style.display = 'none';
    btnAdd.style.display = '';
    clearAddForm();
  });

  btnToggleVariants?.addEventListener('click', () => {
    variantFields.style.display = variantFields.style.display === 'none' ? '' : 'none';
    btnToggleVariants.textContent = variantFields.style.display === 'none' ? '+ Add' : '− Hide';
  });

  btnSave?.addEventListener('click', async () => {
    const text = document.getElementById('new-snippet-text').value.trim();
    if (!text) {
      showToast('Enter snippet text', 'error');
      return;
    }

    const category = document.getElementById('new-snippet-category').value;
    const tagsRaw = document.getElementById('new-snippet-tags').value.trim();
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

    // Collect platform variants
    const variants = {};
    document.querySelectorAll('.variant-input').forEach(input => {
      const val = input.value.trim();
      if (val) variants[input.dataset.platform] = val;
    });

    const snippet = {
      id: StorageUtils.generateId(),
      text,
      category,
      tags,
      variants: Object.keys(variants).length > 0 ? variants : undefined,
      platform: 'web',
      createdAt: new Date().toISOString(),
    };

    allSnippets.unshift(snippet);
    await saveSnippets();
    renderSnippets();

    addForm.style.display = 'none';
    btnAdd.style.display = '';
    clearAddForm();
    showToast('Snippet saved! 📌', 'success');
  });

  function clearAddForm() {
    document.getElementById('new-snippet-text').value = '';
    document.getElementById('new-snippet-tags').value = '';
    document.getElementById('new-snippet-category').value = 'hooks';
    document.querySelectorAll('.variant-input').forEach(i => { i.value = ''; });
    variantFields.style.display = 'none';
    btnToggleVariants.textContent = '+ Add';
  }

  // ─── Campaigns ───
  async function loadCampaigns() {
    const { pv_campaigns = [] } = await StorageUtils.get('pv_campaigns');
    allCampaigns = pv_campaigns;
    renderCampaigns();
  }

  async function saveCampaigns() {
    await StorageUtils.set({ pv_campaigns: allCampaigns });
  }

  function renderCampaigns() {
    const listEl = document.getElementById('campaign-list');

    if (allCampaigns.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📂</div>
          <div class="empty-state-title">No campaigns yet</div>
          <div class="empty-state-text">Group related snippets, links, and notes into campaigns.</div>
        </div>
      `;
      return;
    }

    listEl.innerHTML = '';
    allCampaigns.forEach(campaign => {
      const div = document.createElement('div');
      div.className = 'campaign-item';

      const linkHtml = campaign.link
        ? `<a class="campaign-link" href="${escapeHtml(campaign.link)}" target="_blank">🔗 ${escapeHtml(truncate(campaign.link, 40))}</a>`
        : '';

      const snippetCount = allSnippets.filter(s =>
        (s.tags || []).some(t => t.toLowerCase() === campaign.name.toLowerCase())
      ).length;

      div.innerHTML = `
        <div class="campaign-name">📂 ${escapeHtml(campaign.name)}</div>
        ${campaign.notes ? `<div class="campaign-notes">${escapeHtml(campaign.notes)}</div>` : ''}
        ${linkHtml}
        <div class="campaign-meta">
          <span>${snippetCount} snippet${snippetCount !== 1 ? 's' : ''} tagged</span>
          <span>•</span>
          <span>${new Date(campaign.createdAt).toLocaleDateString()}</span>
        </div>
        <div class="campaign-actions">
          <button class="btn btn-ghost btn-sm campaign-copy-btn" title="Copy campaign link">📋 Copy Link</button>
          <button class="btn btn-ghost btn-sm campaign-delete-btn" title="Delete campaign">🗑️</button>
        </div>
      `;

      if (campaign.link) {
        div.querySelector('.campaign-copy-btn').addEventListener('click', () => {
          copyText(campaign.link);
        });
      } else {
        div.querySelector('.campaign-copy-btn').style.display = 'none';
      }

      div.querySelector('.campaign-delete-btn').addEventListener('click', async () => {
        allCampaigns = allCampaigns.filter(c => c.id !== campaign.id);
        await saveCampaigns();
        renderCampaigns();
        showToast('Campaign deleted', 'success');
      });

      listEl.appendChild(div);
    });
  }

  // Campaign form
  const btnAddCampaign = document.getElementById('btn-add-campaign');
  const campaignForm = document.getElementById('campaign-form');
  const btnCancelCampaign = document.getElementById('btn-cancel-campaign');
  const btnSaveCampaign = document.getElementById('btn-save-campaign');

  btnAddCampaign?.addEventListener('click', () => {
    campaignForm.style.display = '';
    btnAddCampaign.style.display = 'none';
    document.getElementById('new-campaign-name').focus();
  });

  btnCancelCampaign?.addEventListener('click', () => {
    campaignForm.style.display = 'none';
    btnAddCampaign.style.display = '';
    clearCampaignForm();
  });

  btnSaveCampaign?.addEventListener('click', async () => {
    const name = document.getElementById('new-campaign-name').value.trim();
    if (!name) {
      showToast('Enter a campaign name', 'error');
      return;
    }

    const campaign = {
      id: StorageUtils.generateId(),
      name,
      notes: document.getElementById('new-campaign-notes').value.trim(),
      link: document.getElementById('new-campaign-link').value.trim(),
      createdAt: new Date().toISOString(),
    };

    allCampaigns.unshift(campaign);
    await saveCampaigns();
    renderCampaigns();

    campaignForm.style.display = 'none';
    btnAddCampaign.style.display = '';
    clearCampaignForm();
    showToast('Campaign created! 📂', 'success');
  });

  function clearCampaignForm() {
    document.getElementById('new-campaign-name').value = '';
    document.getElementById('new-campaign-notes').value = '';
    document.getElementById('new-campaign-link').value = '';
  }

  // ─── Settings: Stats ───
  async function loadStats() {
    const { pv_snippets = [], pv_campaigns = [], pv_paste_count = 0 } = await StorageUtils.get([
      'pv_snippets', 'pv_campaigns', 'pv_paste_count'
    ]);
    document.getElementById('stat-total').textContent = pv_snippets.length;
    document.getElementById('stat-campaigns').textContent = (pv_campaigns || []).length;
    document.getElementById('stat-pastes').textContent = pv_paste_count;
  }

  // ─── Settings: Export/Import ───
  document.getElementById('btn-export')?.addEventListener('click', async () => {
    const data = await StorageUtils.get(['pv_snippets', 'pv_campaigns', 'pv_paste_count']);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `postvault-backup-${StorageUtils.todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported! 📤', 'success');
  });

  document.getElementById('btn-import')?.addEventListener('click', () => {
    document.getElementById('import-file').click();
  });

  document.getElementById('import-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.pv_snippets) {
        await StorageUtils.set({
          pv_snippets: data.pv_snippets,
          pv_campaigns: data.pv_campaigns || [],
          pv_paste_count: data.pv_paste_count || 0,
        });
        await loadSnippets();
        await loadStats();
        showToast('Imported! 📥', 'success');
      } else {
        showToast('Invalid backup file', 'error');
      }
    } catch (err) {
      showToast('Import failed: ' + err.message, 'error');
    }
    e.target.value = '';
  });

  // ─── Settings: Clear Data ───
  document.getElementById('btn-clear-all')?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to delete ALL PostVault data? This cannot be undone.')) return;
    await StorageUtils.remove(['pv_snippets', 'pv_campaigns', 'pv_paste_count']);
    allSnippets = [];
    allCampaigns = [];
    renderSnippets();
    renderCampaigns();
    loadStats();
    showToast('All data cleared', 'success');
  });

  // ─── Notification listener (from context menu save) ───
  chrome.runtime.onMessage?.addListener((msg) => {
    if (msg.type === 'SHOW_NOTIFICATION') {
      showToast(msg.text, 'success');
      loadSnippets(); // Refresh list
    }
  });

  // ─── Helpers ───
  function copyText(text) {
    navigator.clipboard.writeText(text).then(() => showToast('Copied! 📋', 'success'));
  }

  function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function truncate(str, len) {
    return str.length > len ? str.substring(0, len) + '…' : str;
  }

  // ─── Init ───
  loadSnippets();
})();
