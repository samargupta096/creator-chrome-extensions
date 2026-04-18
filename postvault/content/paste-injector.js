/**
 * PostVault — Content Script
 * Handles snippet paste injection into social media text fields
 */
(() => {
  'use strict';

  function detectPlatform() {
    const host = window.location.hostname;
    if (host.includes('x.com') || host.includes('twitter.com')) return 'x';
    if (host.includes('linkedin.com')) return 'linkedin';
    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('youtube.com') || host.includes('studio.youtube.com')) return 'youtube';
    if (host.includes('facebook.com')) return 'facebook';
    if (host.includes('threads.net')) return 'threads';
    return 'unknown';
  }

  // Insert text into the currently focused text field
  function insertText(text) {
    const active = document.activeElement;

    // Standard input/textarea
    if (active && (active.tagName === 'TEXTAREA' || (active.tagName === 'INPUT' && active.type === 'text'))) {
      const start = active.selectionStart;
      const end = active.selectionEnd;
      active.value = active.value.substring(0, start) + text + active.value.substring(end);
      active.selectionStart = active.selectionEnd = start + text.length;
      active.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }

    // ContentEditable (Twitter/X, LinkedIn, etc.)
    if (active && active.isContentEditable) {
      // Use execCommand for contentEditable fields
      document.execCommand('insertText', false, text);
      return true;
    }

    // Fallback: find the most likely text field on major platforms
    const selectors = [
      '[data-testid="tweetTextarea_0"]', // X
      '[role="textbox"][contenteditable="true"]', // LinkedIn, X
      '.public-DraftEditor-content', // Draft.js-based editors
      '[contenteditable="true"]', // Generic
      'textarea', // Fallback
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        el.focus();
        if (el.isContentEditable) {
          document.execCommand('insertText', false, text);
          return true;
        }
        if (el.tagName === 'TEXTAREA') {
          el.value += text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
      }
    }

    // Ultimate fallback: copy to clipboard
    navigator.clipboard.writeText(text);
    return false;
  }

  // Listen for paste requests from popup
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'PASTE_SNIPPET') {
      const success = insertText(msg.text);
      sendResponse({ success, platform: detectPlatform() });
    }
    if (msg.type === 'DETECT_PLATFORM') {
      sendResponse({ platform: detectPlatform() });
    }
    if (msg.type === 'SAVE_SELECTION') {
      const selection = window.getSelection()?.toString()?.trim();
      sendResponse({ text: selection || '' });
    }
    if (msg.type === 'SHOW_NOTIFICATION') {
      showPageToast(msg.text || 'Saved to PostVault!');
    }
    return true;
  });

  // Lightweight in-page toast notification
  function showPageToast(text) {
    const existing = document.getElementById('pv-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'pv-toast';
    toast.textContent = text;
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      background: 'linear-gradient(135deg, #0f0f1a, #1a1a2e)',
      color: '#00b894',
      padding: '12px 20px',
      borderRadius: '12px',
      fontSize: '13px',
      fontWeight: '600',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      zIndex: '2147483647',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,184,148,0.2)',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.3s ease',
      opacity: '0',
      transform: 'translateY(10px)',
    });

    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 350);
    }, 2500);
  }
})();
