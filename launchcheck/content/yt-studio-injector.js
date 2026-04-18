/**
 * LaunchCheck — Content Script for YouTube Studio
 * Extracts video metadata from the upload/edit page
 */
(() => {
  'use strict';

  function isYouTubeStudio() {
    return window.location.hostname === 'studio.youtube.com';
  }

  function isYouTubeWatch() {
    return window.location.hostname === 'www.youtube.com' && window.location.pathname === '/watch';
  }

  // ─── YouTube Studio Metadata Extraction ───
  function extractStudioMetadata() {
    const data = {
      source: 'studio',
      title: '',
      description: '',
      tags: [],
      thumbnailUrl: '',
      thumbnailText: '',
      visibility: '',
    };

    // Title — from the title input field
    const titleInput = document.querySelector('#textbox[aria-label="Add a title that describes your video (type @ to mention a channel)"], #title-textarea #textbox, [id="title-wrapper"] #textbox, #basics #title #textbox');
    if (titleInput) {
      data.title = titleInput.innerText?.trim() || titleInput.textContent?.trim() || '';
    }

    // Description
    const descInput = document.querySelector('#textbox[aria-label="Tell viewers about your video (type @ to mention a channel)"], #description-textarea #textbox, [id="description-wrapper"] #textbox, #basics #description #textbox');
    if (descInput) {
      data.description = (descInput.innerText?.trim() || descInput.textContent?.trim() || '').slice(0, 500);
    }

    // Tags
    const tagChips = document.querySelectorAll('#tags-container .chip-text, #chip-bar .chip-text');
    tagChips.forEach(chip => {
      const text = chip.textContent?.trim();
      if (text) data.tags.push(text);
    });

    // Thumbnail URL — grab from the selected thumbnail
    const thumbImg = document.querySelector('.thumbnail-preview img, #thumbnail-preview img, .video-thumbnail img, [id*="thumbnail"] img');
    if (thumbImg) {
      data.thumbnailUrl = thumbImg.src || '';
    }

    // Visibility
    const visLabel = document.querySelector('#privacy-radios .radio-label.checked, [name="VIDEO_MADE_FOR_KIDS_MFK"] + label');
    if (visLabel) {
      data.visibility = visLabel.textContent?.trim() || '';
    }

    return data;
  }

  // ─── YouTube Watch Page Extraction (for analyzing published videos) ───
  function extractWatchMetadata() {
    const data = {
      source: 'watch',
      title: '',
      description: '',
      tags: [],
      thumbnailUrl: '',
      channelName: '',
      viewCount: '',
    };

    data.title = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1')?.innerText?.trim() || document.title;

    const desc = document.querySelector('#description-inner, ytd-text-inline-expander .content, #snippet-text');
    data.description = (desc?.innerText?.trim() || '').slice(0, 500);

    // Get meta tags for keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      data.tags = metaKeywords.content.split(',').map(t => t.trim()).filter(Boolean);
    }

    // Thumbnail from og:image
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) {
      data.thumbnailUrl = ogImage.content;
    }

    data.channelName = document.querySelector('#owner #channel-name a, ytd-video-owner-renderer #channel-name a')?.innerText?.trim() || '';

    const viewEl = document.querySelector('#info-strings yt-formatted-string, .view-count, ytd-video-primary-info-renderer .view-count');
    data.viewCount = viewEl?.innerText?.trim() || '';

    return data;
  }

  // ─── Message Listener ───
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'EXTRACT_YT_METADATA') {
      let data;
      if (isYouTubeStudio()) {
        data = extractStudioMetadata();
      } else if (isYouTubeWatch()) {
        data = extractWatchMetadata();
      } else {
        data = { source: 'unknown', title: document.title, url: window.location.href };
      }
      data.url = window.location.href;
      sendResponse(data);
    }
    return true;
  });
})();
