/**
 * LaunchCheck — Main Popup Logic
 * YouTube pre-publish packaging validator
 */
(() => {
  'use strict';

  let currentData = null;
  let currentMeta = null;

  // ─── AI Provider Setup ───
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
    aiStatus.className = `ollama-status ${available ? 'connected' : 'disconnected'}`;
    statusDot.className = `status-dot ${available ? 'online' : 'offline'}`;
    statusText.textContent = 'AI';
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
    btnApiKey.style.display = AI_PROVIDERS[provider]?.requiresKey ? '' : 'none';
    await loadModels();
    await refreshAIStatus();
  }

  providerSelect?.addEventListener('change', async () => {
    await ai.setProvider(providerSelect.value);
    await initProvider();
  });
  modelSelect?.addEventListener('change', async () => await ai.setModel(modelSelect.value));
  btnApiKey?.addEventListener('click', () => {
    apiKeyWrap.style.display = apiKeyWrap.style.display === 'none' ? '' : 'none';
  });
  btnSaveKey?.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    if (!key) return;
    await ai.setApiKey(await ai.getProvider(), key);
    apiKeyInput.value = '';
    apiKeyWrap.style.display = 'none';
    await refreshAIStatus();
    showToast('API key saved', 'success');
  });

  // ─── Tabs ───
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => { c.classList.remove('active'); c.style.display = 'none'; });
      tab.classList.add('active');
      const target = document.getElementById(`tab-${tab.dataset.tab}`);
      if (target) { target.classList.add('active'); target.style.display = ''; }
      if (tab.dataset.tab === 'history') loadHistory();
    });
  });

  // ─── Detect Video ───
  async function detectVideo() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return null;

      const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_YT_METADATA' });
      if (response?.title) {
        document.getElementById('video-title').textContent = response.title || 'Untitled Video';
        const sourceBadge = response.source === 'studio' ? 'YouTube Studio' : response.source === 'watch' ? 'YouTube Video' : 'Unknown';
        const badgeClass = response.source === 'studio' ? 'badge-green' : 'badge-cyan';
        document.getElementById('video-source').innerHTML = `<span class="badge ${badgeClass}">${sourceBadge}</span>`;

        // Fill manual inputs with detected data
        document.getElementById('input-title').value = response.title || '';
        document.getElementById('input-description').value = response.description || '';
        return response;
      }
    } catch (e) {
      console.log('Not on YouTube:', e);
    }
    return null;
  }

  // ─── Run Check ───
  const btnCheck = document.getElementById('btn-check');
  const checkText = document.getElementById('check-text');
  const loadingState = document.getElementById('loading-state');
  const resultsContainer = document.getElementById('results-container');
  const errorState = document.getElementById('error-state');

  btnCheck?.addEventListener('click', () => runCheck());
  document.getElementById('btn-recheck')?.addEventListener('click', () => runCheck());
  document.getElementById('btn-retry')?.addEventListener('click', () => runCheck());

  async function runCheck() {
    resultsContainer.style.display = 'none';
    errorState.style.display = 'none';
    loadingState.style.display = '';
    btnCheck.disabled = true;
    checkText.textContent = 'Checking...';

    try {
      // Use manual input values (possibly pre-filled from detection)
      const title = document.getElementById('input-title').value.trim();
      const description = document.getElementById('input-description').value.trim();
      const thumbText = document.getElementById('input-thumb-text').value.trim();

      if (!title) {
        showError('No Title', 'Enter a video title to analyze or navigate to YouTube Studio.');
        return;
      }

      currentMeta = { title, date: new Date().toISOString() };

      const response = await chrome.runtime.sendMessage({
        type: 'ANALYZE_VIDEO',
        title,
        description,
        tags: [],
        thumbnailText: thumbText,
        source: 'manual',
      });

      if (response?.success && response.data) {
        currentData = response.data;
        renderResults(response.data);
        updateChecklist(response.data);
        loadingState.style.display = 'none';
        resultsContainer.style.display = '';
      } else {
        showError('Analysis Failed', response?.error || 'AI did not return valid results.');
      }
    } catch (e) {
      showError('Connection Error', e.message || 'Could not connect to AI.');
    } finally {
      btnCheck.disabled = false;
      checkText.textContent = 'Run LaunchCheck';
    }
  }

  function showError(title, text) {
    loadingState.style.display = 'none';
    resultsContainer.style.display = 'none';
    errorState.style.display = '';
    document.getElementById('error-title').textContent = title;
    document.getElementById('error-text').textContent = text;
    btnCheck.disabled = false;
    checkText.textContent = 'Run LaunchCheck';
  }

  // ─── Render Results ───
  function renderResults(data) {
    // Score ring
    const score = data.promise_match_score || 0;
    const circle = document.getElementById('score-circle');
    const circumference = 2 * Math.PI * 50; // r=50
    const offset = circumference - (score / 100) * circumference;
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = offset;
    circle.className = `score-fill ${score >= 70 ? 'high' : score >= 40 ? 'mid' : 'low'}`;

    document.getElementById('score-value').textContent = score;
    document.getElementById('score-grade').textContent = data.overall_grade || '--';
    document.getElementById('score-reasoning').textContent = data.promise_match_reasoning || '';

    // Risk banner
    if (data.top_risk) {
      document.getElementById('risk-banner').style.display = '';
      document.getElementById('risk-text').textContent = data.top_risk;
    }

    // Hook clarity
    if (data.hook_clarity) {
      document.getElementById('hook-score').textContent = data.hook_clarity.score || '--';
      renderIssues('hook-issues', data.hook_clarity.issues);
      const suggBox = document.getElementById('hook-suggestion');
      suggBox.textContent = data.hook_clarity.suggestion || '';
    }

    // Title analysis
    if (data.title_analysis) {
      document.getElementById('title-score').textContent = data.title_analysis.score || '--';
      renderIssues('title-issues', data.title_analysis.issues);
      renderRewrites('title-rewrites', data.title_analysis.rewrites);
    }

    // Thumbnail feedback
    if (data.thumbnail_feedback) {
      const readBadge = document.getElementById('thumb-readability');
      const readability = data.thumbnail_feedback.text_readability || 'unknown';
      readBadge.textContent = readability;
      readBadge.className = `badge ${readability === 'good' ? 'badge-green' : readability === 'fair' ? 'badge-yellow' : 'badge-red'}`;
      renderIssues('thumb-issues', data.thumbnail_feedback.issues);
      renderSuggestions('thumb-suggestions', data.thumbnail_feedback.suggestions);
    }
  }

  function renderIssues(containerId, issues) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    (issues || []).forEach(issue => {
      const div = document.createElement('div');
      div.className = 'issue-item';
      div.textContent = issue;
      container.appendChild(div);
    });
  }

  function renderRewrites(containerId, rewrites) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    (rewrites || []).forEach((rewrite, i) => {
      const div = document.createElement('div');
      div.className = 'rewrite-item';
      div.innerHTML = `
        <span class="rewrite-num">${i + 1}</span>
        <span class="rewrite-text">${escapeHtml(rewrite)}</span>
        <span class="rewrite-copy">📋</span>
      `;
      div.addEventListener('click', () => copyText(rewrite));
      container.appendChild(div);
    });
  }

  function renderSuggestions(containerId, suggestions) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    (suggestions || []).forEach(s => {
      const div = document.createElement('div');
      div.className = 'suggestion-item';
      div.textContent = s;
      container.appendChild(div);
    });
  }

  // ─── Checklist ───
  const manualChecks = {};

  function updateChecklist(data) {
    const flags = data?.checklist_flags || {};
    setCheckIcon('check-title-length', flags.title_under_60_chars);
    setCheckIcon('check-curiosity', flags.title_has_curiosity_gap);
    setCheckIcon('check-desc-keywords', flags.description_has_keywords);
    setCheckIcon('check-thumb-text', flags.thumbnail_text_under_4_words);
    setCheckIcon('check-alignment', flags.title_thumbnail_aligned);
    updateChecklistScore();
  }

  function setCheckIcon(id, passed) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = passed ? '✅' : '❌';
    const item = el.closest('.checklist-item');
    if (item) {
      item.classList.remove('passed', 'failed');
      item.classList.add(passed ? 'passed' : 'failed');
    }
  }

  // Manual checklist toggles
  document.querySelectorAll('.manual-check .check-icon').forEach(icon => {
    icon.addEventListener('click', () => {
      const item = icon.closest('.checklist-item');
      const key = item.dataset.check;
      manualChecks[key] = !manualChecks[key];
      icon.textContent = manualChecks[key] ? '✅' : '⬜';
      item.classList.remove('passed', 'failed');
      if (manualChecks[key]) item.classList.add('passed');
      updateChecklistScore();
    });
  });

  function updateChecklistScore() {
    const allIcons = document.querySelectorAll('.check-icon');
    let checked = 0;
    allIcons.forEach(icon => { if (icon.textContent === '✅') checked++; });
    document.getElementById('checklist-score-value').textContent = `${checked}/${allIcons.length}`;
  }

  // ─── Copy & Save ───
  document.getElementById('btn-copy-report')?.addEventListener('click', () => {
    if (!currentData) return;
    let report = `LaunchCheck Report\n`;
    report += `Title: ${currentMeta?.title || ''}\n`;
    report += `Date: ${new Date().toLocaleDateString()}\n\n`;
    report += `Promise Match Score: ${currentData.promise_match_score}/100\n`;
    report += `Grade: ${currentData.overall_grade}\n`;
    report += `Risk: ${currentData.top_risk || 'None'}\n\n`;
    if (currentData.title_analysis?.rewrites) {
      report += `Title Rewrites:\n`;
      currentData.title_analysis.rewrites.forEach((r, i) => { report += `  ${i + 1}. ${r}\n`; });
    }
    if (currentData.hook_clarity?.suggestion) {
      report += `\nHook Suggestion: ${currentData.hook_clarity.suggestion}\n`;
    }
    copyText(report.trim());
  });

  document.getElementById('btn-save-check')?.addEventListener('click', async () => {
    if (!currentData || !currentMeta) return;
    const entry = {
      id: StorageUtils.generateId(),
      ...currentMeta,
      results: currentData,
    };
    const { lc_history = [] } = await StorageUtils.get('lc_history');
    lc_history.unshift(entry);
    if (lc_history.length > 30) lc_history.length = 30;
    await StorageUtils.set({ lc_history });
    showToast('Saved!', 'success');
  });

  // ─── History ───
  async function loadHistory() {
    const { lc_history = [] } = await StorageUtils.get('lc_history');
    const listEl = document.getElementById('history-list');

    if (lc_history.length === 0) {
      listEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-title">No checks yet</div><div class="empty-state-text">Run a LaunchCheck to see your history here.</div></div>`;
      return;
    }

    listEl.innerHTML = '';
    lc_history.forEach(item => {
      const score = item.results?.promise_match_score || 0;
      const scoreClass = score >= 70 ? 'high' : score >= 40 ? 'mid' : 'low';
      const div = document.createElement('div');
      div.className = 'history-item';
      div.innerHTML = `
        <div class="history-item-title">${escapeHtml(item.title)}</div>
        <div class="history-item-meta">
          <span class="history-score ${scoreClass}">${score}/100</span>
          <span>•</span>
          <span>${item.results?.overall_grade || '--'}</span>
          <span>•</span>
          <span>${new Date(item.date).toLocaleDateString()}</span>
        </div>
      `;
      div.addEventListener('click', () => {
        currentData = item.results;
        currentMeta = { title: item.title, date: item.date };
        renderResults(item.results);
        updateChecklist(item.results);
        resultsContainer.style.display = '';
        document.querySelector('.tab[data-tab="check"]')?.click();
      });
      listEl.appendChild(div);
    });
  }

  // ─── Helpers ───
  function copyText(text) {
    navigator.clipboard.writeText(text).then(() => showToast('Copied!', 'success'));
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
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── Init ───
  initProvider();
  detectVideo();
})();
