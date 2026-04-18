/**
 * ContentCal — Background Service Worker
 * Handles posting reminders via Chrome Alarms API
 */

// Check for upcoming posts every 30 minutes
chrome.alarms.create('cc-reminder-check', { periodInMinutes: 30 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'cc-reminder-check') return;

  const { cc_posts = [] } = await chrome.storage.local.get('cc_posts');
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  // Find posts due within the next hour that haven't been notified
  const upcoming = cc_posts.filter(p =>
    p.status === 'scheduled' &&
    p.scheduledAt &&
    new Date(p.scheduledAt).getTime() - now <= oneHour &&
    new Date(p.scheduledAt).getTime() - now > 0 &&
    !p.notified
  );

  for (const post of upcoming) {
    // Mark as notified
    post.notified = true;

    // Show badge
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#e17055' });
  }

  if (upcoming.length > 0) {
    await chrome.storage.local.set({ cc_posts });
  }
});

// Clear badge when popup is opened
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'CLEAR_BADGE') {
    chrome.action.setBadgeText({ text: '' });
    sendResponse({ ok: true });
  }
  return true;
});
