/**
 * ThreadMine — Content Script
 * Platform-specific extractors for audience research
 */

(() => {
  'use strict';

  // Detect platform
  function detectPlatform() {
    const host = window.location.hostname;
    if (host.includes('reddit.com')) return 'reddit';
    if (host.includes('x.com') || host.includes('twitter.com')) return 'x';
    if (host.includes('youtube.com')) return 'youtube';
    if (host.includes('linkedin.com')) return 'linkedin';
    if (host.includes('news.ycombinator.com')) return 'hackernews';
    return 'generic';
  }

  // ─── Reddit Extractor ───
  function extractReddit() {
    const comments = [];
    // New Reddit
    const commentEls = document.querySelectorAll('shreddit-comment, [id^="t1_"]');
    commentEls.forEach(el => {
      const textEl = el.querySelector('[slot="comment"] p, .md p, .RichTextJSON-root p, [data-testid="comment"] p');
      if (textEl) {
        const text = textEl.closest('.md, .RichTextJSON-root, [slot="comment"]')?.innerText?.trim();
        if (text && text.length > 15) comments.push(text);
      }
    });

    // Fallback: grab all paragraph-like content in comment areas
    if (comments.length === 0) {
      document.querySelectorAll('[data-testid="comment"], .comment .md, .Comment .RichTextJSON-root').forEach(el => {
        const text = el.innerText?.trim();
        if (text && text.length > 15 && !comments.includes(text)) comments.push(text);
      });
    }

    // Final fallback: all visible text blocks
    if (comments.length === 0) {
      const main = document.querySelector('main, [data-testid="post-container"]') || document.body;
      const paras = main.querySelectorAll('p');
      paras.forEach(p => {
        const text = p.innerText?.trim();
        if (text && text.length > 20) comments.push(text);
      });
    }

    // Get post title
    const title = document.querySelector('h1, [data-testid="post-title"], shreddit-title')?.innerText?.trim() || document.title;

    return { platform: 'reddit', title, comments: comments.slice(0, 150) };
  }

  // ─── X / Twitter Extractor ───
  function extractX() {
    const comments = [];
    document.querySelectorAll('[data-testid="tweetText"]').forEach(el => {
      const text = el.innerText?.trim();
      if (text && text.length > 10) comments.push(text);
    });

    const title = document.querySelector('article [data-testid="tweetText"]')?.innerText?.trim()?.slice(0, 100) || document.title;
    return { platform: 'x', title, comments: comments.slice(0, 100) };
  }

  // ─── YouTube Extractor ───
  function extractYouTube() {
    const comments = [];
    document.querySelectorAll('#content-text, ytd-comment-renderer #content-text').forEach(el => {
      const text = el.innerText?.trim();
      if (text && text.length > 10) comments.push(text);
    });

    const title = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1, h1.title')?.innerText?.trim() || document.title;

    // Also grab video description
    const desc = document.querySelector('#description-inner, ytd-text-inline-expander .content')?.innerText?.trim();
    if (desc) comments.unshift('[VIDEO DESCRIPTION] ' + desc);

    return { platform: 'youtube', title, comments: comments.slice(0, 150) };
  }

  // ─── LinkedIn Extractor ───
  function extractLinkedIn() {
    const comments = [];
    document.querySelectorAll('.comments-comment-item__main-content, .feed-shared-update-v2__commentary, .update-components-text, .feed-shared-text, .feed-shared-text-view, [data-test-id="main-feed-activity-card"] span[dir="ltr"]').forEach(el => {
      const text = el.innerText?.trim();
      if (text && text.length > 10 && !comments.includes(text)) comments.push(text);
    });

    if (comments.length === 0) {
      document.querySelectorAll('.feed-shared-update-v2, .occludable-update, article, .feed-shared-update-v2__content').forEach(card => {
        const text = card.innerText?.trim();
        if (text && text.length > 20 && !comments.includes(text)) comments.push(text);
      });
    }

    const title = document.querySelector('.feed-shared-update-v2__description, .update-components-text, .feed-shared-text')?.innerText?.trim()?.slice(0, 100) || document.title;
    return { platform: 'linkedin', title, comments: comments.slice(0, 100) };
  }

  // ─── Hacker News Extractor ───
  function extractHackerNews() {
    const comments = [];
    document.querySelectorAll('.commtext').forEach(el => {
      const text = el.innerText?.trim();
      if (text && text.length > 15) comments.push(text);
    });

    const title = document.querySelector('.titleline a')?.innerText?.trim() || document.title;
    return { platform: 'hackernews', title, comments: comments.slice(0, 150) };
  }

  // ─── Generic Extractor ───
  function extractGeneric() {
    const article = document.querySelector('article') || document.querySelector('main') || document.body;
    const text = (article.innerText || '').slice(0, 8000);
    return { platform: 'generic', title: document.title, comments: [text] };
  }

  // Platform dispatcher
  const extractors = {
    reddit: extractReddit,
    x: extractX,
    youtube: extractYouTube,
    linkedin: extractLinkedIn,
    hackernews: extractHackerNews,
    generic: extractGeneric,
  };

  // Listen for extraction requests
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'EXTRACT_CONTENT') {
      const platform = detectPlatform();
      const extractor = extractors[platform] || extractors.generic;
      const data = extractor();
      sendResponse({
        ...data,
        url: window.location.href,
      });
    }
    return true;
  });
})();
