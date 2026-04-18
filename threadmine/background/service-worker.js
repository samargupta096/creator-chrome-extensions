importScripts('../shared/ai-client.js');

// Bypass Ollama CORS
if (chrome.declarativeNetRequest) {
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [11434],
    addRules: [{
      id: 11434,
      condition: { urlFilter: 'http://127.0.0.1:11434/*' },
      action: {
        type: 'modifyHeaders',
        requestHeaders: [{ header: 'origin', operation: 'set', value: 'http://127.0.0.1' }]
      }
    }]
  }).catch(e => console.error(e));
}

/**
 * ThreadMine — Background Service Worker
 */

const THREADMINE_SYSTEM_PROMPT = `You are a content strategist analyzing audience conversations.
Given text from a social media page, extract structured insights for content creators.

Return ONLY valid JSON with these exact keys:
{
  "pain_points": ["array of direct complaints, frustrations, struggles (max 8)"],
  "objections": ["reasons people give for NOT doing something (max 5)"],
  "faqs": ["questions asked repeatedly or implicitly (max 5)"],
  "hook_ideas": ["attention-grabbing opening lines derived from the language used (max 6)"],
  "video_angles": ["specific video or post topics this conversation suggests (max 5)"],
  "carousel_ideas": ["multi-slide content breakdown ideas (max 3)"]
}

Use the EXACT language from the source text where possible. Be specific, not generic.
Do NOT wrap in markdown code blocks. Return raw JSON only.`;

// Context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'tm-mine',
    title: '⛏️ Mine this thread with ThreadMine',
    contexts: ['page', 'selection']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'tm-mine') {
    // Open side panel or popup
    if (chrome.sidePanel) {
      chrome.sidePanel.open({ windowId: tab.windowId });
    }
  }
});

// Message handler
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'ANALYZE_THREAD') {
    handleAnalyze(msg).then(sendResponse);
    return true;
  }
  return false;
});

async function handleAnalyze(msg) {
  const { platform, title, comments, url } = msg;

  const commentText = comments.slice(0, 80).join('\n---\n');
  const prompt = `Platform: ${platform}\nPage title: ${title}\nURL: ${url}\n\nAudience comments/text:\n${commentText}`;

  const ai = new AIClient();
  const result = await ai.generate(prompt, {
    system: THREADMINE_SYSTEM_PROMPT,
    temperature: 0.4,
    maxTokens: 2048,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // Parse JSON from response
  try {
    let jsonText = result.text.trim();
    // Strip markdown code fences if present
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const parsed = JSON.parse(jsonText);
    return { success: true, data: parsed, model: result.model };
  } catch (e) {
    // Try to extract JSON from mixed text
    const match = result.text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        return { success: true, data: parsed, model: result.model };
      } catch (_) {}
    }
    return { success: false, error: 'AI returned invalid JSON. Try again.', raw: result.text };
  }
}

// ── AI Fetch Relay ──
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action !== 'aiFetch') return false;
  const { url, options = {} } = msg;
  const ALLOWED = [
    'http://127.0.0.1:11434',
    'https://api.openai.com',
    'https://api.anthropic.com',
    'https://api.cursor.com',
  ];
  if (!ALLOWED.some(o => url.startsWith(o))) {
    sendResponse({ ok: false, error: 'Disallowed URL', data: null });
    return true;
  }
  fetch(url, {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: options.body || undefined,
  })
    .then(async (res) => {
      let data = null;
      try { data = await res.json(); } catch (_) {}
      sendResponse({ ok: res.ok, status: res.status, data });
    })
    .catch((err) => {
      sendResponse({ ok: false, error: err.message, data: null });
    });
  return true;
});

// Ollama fetch relay (legacy compat)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action !== 'ollamaFetch') return false;
  const { url, options = {} } = msg;
  if (!url.startsWith('http://127.0.0.1:11434')) {
    sendResponse({ ok: false, error: 'Disallowed URL', data: null });
    return true;
  }
  fetch(url, {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: options.body || undefined,
  })
    .then(async (res) => {
      let data = null;
      try { data = await res.json(); } catch (_) {}
      sendResponse({ ok: res.ok, status: res.status, data });
    })
    .catch((err) => {
      sendResponse({ ok: false, error: err.message, data: null });
    });
  return true;
});
