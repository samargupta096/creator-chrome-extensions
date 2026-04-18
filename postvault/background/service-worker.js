/**
 * PostVault — Background Service Worker
 */

// Context menu for saving selected text
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'pv-save',
    title: '📌 Save to PostVault',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'pv-save' && info.selectionText) {
    const snippet = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      text: info.selectionText.trim(),
      category: 'uncategorized',
      tags: [],
      platform: detectPlatformFromUrl(tab?.url || ''),
      createdAt: new Date().toISOString(),
    };

    const { pv_snippets = [] } = await chrome.storage.local.get('pv_snippets');
    pv_snippets.unshift(snippet);
    await chrome.storage.local.set({ pv_snippets });

    // Notify the user
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_NOTIFICATION',
        text: 'Saved to PostVault! 📌'
      }).catch(() => {});
    }
  }
});

function detectPlatformFromUrl(url) {
  try {
    const host = new URL(url).hostname;
    if (host.includes('x.com') || host.includes('twitter.com')) return 'x';
    if (host.includes('linkedin.com')) return 'linkedin';
    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('youtube.com')) return 'youtube';
    if (host.includes('facebook.com')) return 'facebook';
    return 'web';
  } catch {
    return 'web';
  }
}
