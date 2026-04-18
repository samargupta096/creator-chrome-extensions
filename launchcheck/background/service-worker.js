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
 * LaunchCheck — Background Service Worker
 */

const LAUNCHCHECK_SYSTEM_PROMPT = `You are a YouTube growth strategist analyzing video packaging before publish.
Given a video's title, description, tags, and thumbnail text, evaluate the packaging quality.

Return ONLY valid JSON with these exact keys:
{
  "promise_match_score": <number 0-100>,
  "promise_match_reasoning": "<one sentence explaining the score>",
  "hook_clarity": {
    "score": <number 0-100>,
    "issues": ["list of specific issues with the hook/title"],
    "suggestion": "<improved version of the opening hook>"
  },
  "title_analysis": {
    "score": <number 0-100>,
    "issues": ["specific issues"],
    "rewrites": ["5 alternative title suggestions ranked by estimated CTR"]
  },
  "thumbnail_feedback": {
    "text_readability": "<good/fair/poor>",
    "issues": ["specific issues with thumbnail text if any"],
    "suggestions": ["improvement suggestions"]
  },
  "overall_grade": "<A+/A/B+/B/C+/C/D/F>",
  "top_risk": "<single biggest risk with this packaging>",
  "checklist_flags": {
    "title_under_60_chars": <boolean>,
    "title_has_curiosity_gap": <boolean>,
    "description_has_keywords": <boolean>,
    "thumbnail_text_under_4_words": <boolean>,
    "title_thumbnail_aligned": <boolean>
  }
}

Be specific and actionable. Do NOT wrap in markdown code fences.`;

// Message handler
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'ANALYZE_VIDEO') {
    handleAnalyze(msg).then(sendResponse);
    return true;
  }
  return false;
});

async function handleAnalyze(msg) {
  const { title, description, tags, thumbnailText, source } = msg;

  const prompt = `Video Title: ${title || '(none)'}
Description (first 500 chars): ${description || '(none)'}
Tags: ${(tags || []).join(', ') || '(none)'}
Thumbnail Text: ${thumbnailText || '(none detected)'}
Source: ${source || 'unknown'}

Analyze this YouTube video's packaging quality.`;

  const ai = new AIClient();
  const result = await ai.generate(prompt, {
    system: LAUNCHCHECK_SYSTEM_PROMPT,
    temperature: 0.4,
    maxTokens: 2048,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  try {
    let jsonText = result.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const parsed = JSON.parse(jsonText);
    return { success: true, data: parsed, model: result.model };
  } catch (e) {
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

// Ollama fetch relay
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
