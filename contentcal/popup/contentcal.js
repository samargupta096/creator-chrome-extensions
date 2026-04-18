/**
 * ContentCal — Main Popup Logic
 * Creator content calendar & performance tracker
 */
(() => {
  'use strict';

  const PLATFORM_ICONS = {
    youtube: '▶️',
    x: '𝕏',
    linkedin: '🔵',
    instagram: '📸',
    threads: '🧵',
    other: '📄',
  };

  const STATUS_LABELS = {
    idea: '💡 Idea',
    drafting: '✏️ Drafting',
    scheduled: '📅 Scheduled',
    published: '✅ Published',
  };

  let allPosts = [];
  let currentStartDate = new Date(); // Start of the currently viewed week
  
  // Normalize currentStartDate to the most recent Monday
  const day = currentStartDate.getDay();
  const diff = currentStartDate.getDate() - day + (day === 0 ? -6 : 1);
  currentStartDate.setDate(diff);
  currentStartDate.setHours(0, 0, 0, 0);

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
      
      if (tab.dataset.tab === 'calendar') renderCalendar();
      if (tab.dataset.tab === 'posts') renderPosts();
      if (tab.dataset.tab === 'analytics') renderAnalytics();
    });
  });

  // ─── Load Data ───
  async function loadData() {
    const { cc_posts = [] } = await StorageUtils.get('cc_posts');
    allPosts = cc_posts;
    updateStreak();
    renderCalendar();
    
    // Clear notification badge
    chrome.runtime.sendMessage({ type: 'CLEAR_BADGE' }).catch(() => {});
  }

  async function saveData() {
    await StorageUtils.set({ cc_posts: allPosts });
    updateStreak();
  }

  // ─── Streak & header ───
  function updateStreak() {
    const now = new Date();
    const published = allPosts.filter(p => p.status === 'published' && p.scheduledAt);
    
    // Calculate streak (consecutive days with at least one post)
    let streak = 0;
    let checkDate = new Date(now);
    checkDate.setHours(0, 0, 0, 0);
    
    // See if posted today
    const postedToday = published.some(p => {
      const pd = new Date(p.scheduledAt);
      return pd.toDateString() === checkDate.toDateString();
    });
    
    if (postedToday) streak = 1;
    
    // Check backwards
    checkDate.setDate(checkDate.getDate() - 1);
    while (true) {
      const posted = published.some(p => {
        const pd = new Date(p.scheduledAt);
        return pd.toDateString() === checkDate.toDateString();
      });
      if (posted) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    document.getElementById('streak-value').textContent = streak;

    // This week count
    const startOfWeek = new Date(now);
    const d = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - d + (d === 0 ? -6 : 1));
    startOfWeek.setHours(0,0,0,0);
    
    const countWeek = published.filter(p => new Date(p.scheduledAt) >= startOfWeek).length;
    document.getElementById('week-count').textContent = countWeek;
    
    // This month count
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const countMonth = published.filter(p => new Date(p.scheduledAt) >= startOfMonth).length;
    document.getElementById('month-count').textContent = countMonth;
  }

  // ─── Calendar View ───
  const btnPrevWeek = document.getElementById('btn-prev-week');
  const btnNextWeek = document.getElementById('btn-next-week');
  const weekLabel = document.getElementById('week-label');
  const weekGrid = document.getElementById('week-grid');
  
  btnPrevWeek?.addEventListener('click', () => {
    currentStartDate.setDate(currentStartDate.getDate() - 7);
    renderCalendar();
  });
  
  btnNextWeek?.addEventListener('click', () => {
    currentStartDate.setDate(currentStartDate.getDate() + 7);
    renderCalendar();
  });
  
  function renderCalendar() {
    weekGrid.innerHTML = '';
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const endOfWeek = new Date(currentStartDate);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    
    // Update label
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (currentStartDate.getMonth() === endOfWeek.getMonth()) {
      weekLabel.textContent = `${monthNames[currentStartDate.getMonth()]} ${currentStartDate.getDate()} – ${endOfWeek.getDate()}, ${currentStartDate.getFullYear()}`;
    } else {
      weekLabel.textContent = `${monthNames[currentStartDate.getMonth()]} ${currentStartDate.getDate()} – ${monthNames[endOfWeek.getMonth()]} ${endOfWeek.getDate()}`;
    }
    
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(currentStartDate);
      dayDate.setDate(dayDate.getDate() + i);
      
      const isToday = dayDate.getTime() === today.getTime();
      
      // Find posts for this day
      const dayPosts = allPosts.filter(p => {
        if (!p.scheduledAt) return false;
        const d = new Date(p.scheduledAt);
        return d.toDateString() === dayDate.toDateString() && (p.status === 'scheduled' || p.status === 'published');
      });
      
      const div = document.createElement('div');
      div.className = `day-cell ${isToday ? 'today' : ''} ${dayPosts.length > 0 ? 'has-posts' : ''}`;
      
      let dotsHtml = '';
      if (dayPosts.length > 0) {
        dotsHtml = '<div class="day-dots">';
        dayPosts.slice(0, 8).forEach(p => {
          dotsHtml += `<div class="day-dot ${p.platform}" title="${escapeHtml(p.title)}"></div>`;
        });
        if (dayPosts.length > 8) dotsHtml += '<div style="font-size:7px; color:var(--text-tertiary);">+</div>';
        dotsHtml += '</div>';
      }
      
      div.innerHTML = `
        <div class="day-header">${days[i]}</div>
        <div class="day-number">${dayDate.getDate()}</div>
        ${dotsHtml}
      `;
      
      div.addEventListener('click', () => {
        openModalForDate(dayDate);
      });
      
      weekGrid.appendChild(div);
    }
  }

  // ─── Posts View ───
  const filterStatus = document.getElementById('filter-status');
  const filterPlatform = document.getElementById('filter-platform');
  const postList = document.getElementById('post-list');

  filterStatus?.addEventListener('change', renderPosts);
  filterPlatform?.addEventListener('change', renderPosts);

  function renderPosts() {
    let filtered = [...allPosts];
    
    const s = filterStatus.value;
    const p = filterPlatform.value;
    
    if (s !== 'all') filtered = filtered.filter(post => post.status === s);
    if (p !== 'all') filtered = filtered.filter(post => post.platform === p);
    
    // Sort by date descending (newest/most future first)
    filtered.sort((a,b) => {
      const da = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
      const db = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
      return db - da; // Descending
    });

    if (filtered.length === 0) {
      postList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <div class="empty-state-title">No matching posts</div>
          <div class="empty-state-text">Nothing matches your current filters.</div>
        </div>
      `;
      return;
    }
    
    postList.innerHTML = '';
    filtered.forEach(post => {
      const div = document.createElement('div');
      div.className = 'post-item';
      
      const icon = PLATFORM_ICONS[post.platform] || '📄';
      const dateStr = post.scheduledAt 
        ? new Date(post.scheduledAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : 'No date';
        
      div.innerHTML = `
        <div class="post-platform-icon">${icon}</div>
        <div class="post-info">
          <div class="post-title">${escapeHtml(post.title || 'Untitled Post')}</div>
          <div class="post-meta">
            <span>${dateStr}</span>
            <span class="post-status-badge ${post.status}">${STATUS_LABELS[post.status]}</span>
          </div>
        </div>
      `;
      
      div.addEventListener('click', () => {
        openModalForPost(post);
      });
      
      postList.appendChild(div);
    });
  }

  // ─── Analytics View ───
  function renderAnalytics() {
    const published = allPosts.filter(p => p.status === 'published');
    
    document.getElementById('stat-total-posts').textContent = allPosts.length;
    document.getElementById('stat-published').textContent = published.length;
    
    const completion = allPosts.length > 0 ? Math.round((published.length / allPosts.length) * 100) : 0;
    document.getElementById('stat-completion').textContent = `${completion}%`;
    
    // Platform Breakdown
    const platCounts = {};
    published.forEach(p => {
      platCounts[p.platform] = (platCounts[p.platform] || 0) + 1;
    });
    
    let best = { plat: '', count: 0 };
    for (const [k, v] of Object.entries(platCounts)) {
      if (v > best.count) { best.count = v; best.plat = k; }
    }
    
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    document.getElementById('stat-best-platform').textContent = best.plat ? cap(best.plat) : '—';
    
    const bdEl = document.getElementById('platform-breakdown');
    bdEl.innerHTML = '';
    
    if (published.length === 0) {
      bdEl.innerHTML = '<div style="font-size:11px;color:var(--text-tertiary);">No published posts yet.</div>';
    } else {
      const platforms = ['youtube', 'x', 'linkedin', 'instagram', 'threads', 'other'];
      platforms.forEach(plat => {
        const count = platCounts[plat] || 0;
        if (count > 0) {
          const pct = Math.max(5, (count / published.length) * 100);
          bdEl.insertAdjacentHTML('beforeend', `
            <div class="platform-row">
              <span class="platform-icon">${PLATFORM_ICONS[plat] || '📄'}</span>
              <div class="platform-bar-wrap">
                <div class="platform-bar ${plat}" style="width: ${pct}%"></div>
              </div>
              <span class="platform-count">${count}</span>
            </div>
          `);
        }
      });
    }
    
    // Heatmap (Last 28 days)
    const hmEl = document.getElementById('heatmap');
    hmEl.innerHTML = '';
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const start = new Date(today);
    start.setDate(start.getDate() - 27);
    
    for (let i = 0; i < 28; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      
      const count = published.filter(p => {
        if (!p.scheduledAt) return false;
        const pd = new Date(p.scheduledAt);
        return pd.toDateString() === d.toDateString();
      }).length;
      
      let level = '';
      if (count === 1) level = 'level-1';
      else if (count === 2) level = 'level-2';
      else if (count === 3) level = 'level-3';
      else if (count > 3) level = 'level-4';
      
      hmEl.insertAdjacentHTML('beforeend', `
        <div class="heatmap-cell ${level}" title="${d.toLocaleDateString()}: ${count} posts"></div>
      `);
    }
  }

  // ─── Modal (Add/Edit) ───
  let editingPostId = null;
  const modal = document.getElementById('post-modal');
  const btnQuickAdd = document.getElementById('btn-quick-add');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCancelModal = document.getElementById('btn-cancel-modal');
  const btnSavePost = document.getElementById('btn-save-post');
  const btnDeletePost = document.getElementById('btn-delete-post');
  
  const mTitle = document.getElementById('post-title-input');
  const mPlatform = document.getElementById('post-platform-input');
  const mStatus = document.getElementById('post-status-input');
  const mDate = document.getElementById('post-date-input');
  const mNotes = document.getElementById('post-notes-input');
  const mPerfSection = document.getElementById('perf-section');
  
  btnQuickAdd?.addEventListener('click', () => {
    openModalForDate(new Date());
  });
  
  btnCloseModal?.addEventListener('click', closeModal);
  btnCancelModal?.addEventListener('click', closeModal);
  
  mStatus?.addEventListener('change', () => {
    mPerfSection.style.display = mStatus.value === 'published' ? 'block' : 'none';
  });
  
  function openModalForDate(date) {
    editingPostId = null;
    document.getElementById('modal-title').textContent = 'Plan Content';
    
    mTitle.value = '';
    mPlatform.value = 'x';
    mStatus.value = 'drafting';
    mNotes.value = '';
    
    document.getElementById('post-views').value = '';
    document.getElementById('post-engagement').value = '';
    document.getElementById('post-takeaway').value = '';
    
    // Set format for datetime-local
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    mDate.value = date.toISOString().slice(0, 16);
    
    mPerfSection.style.display = 'none';
    btnDeletePost.style.display = 'none';
    modal.style.display = 'flex';
    mTitle.focus();
  }
  
  function openModalForPost(post) {
    editingPostId = post.id;
    document.getElementById('modal-title').textContent = 'Edit Content';
    
    mTitle.value = post.title || '';
    mPlatform.value = post.platform || 'x';
    mStatus.value = post.status || 'drafting';
    mNotes.value = post.notes || '';
    
    if (post.scheduledAt) {
      const d = new Date(post.scheduledAt);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      mDate.value = d.toISOString().slice(0, 16);
    } else {
      mDate.value = '';
    }
    
    document.getElementById('post-views').value = post.views || '';
    document.getElementById('post-engagement').value = post.engagement || '';
    document.getElementById('post-takeaway').value = post.takeaway || '';
    
    mPerfSection.style.display = mStatus.value === 'published' ? 'block' : 'none';
    btnDeletePost.style.display = 'block';
    modal.style.display = 'flex';
  }
  
  function closeModal() {
    modal.style.display = 'none';
  }
  
  btnSavePost?.addEventListener('click', async () => {
    const title = mTitle.value.trim();
    if (!title) {
      showToast('Enter a title', 'error');
      return;
    }
    
    const post = {
      id: editingPostId || StorageUtils.generateId(),
      title,
      platform: mPlatform.value,
      status: mStatus.value,
      notes: mNotes.value.trim(),
      notified: false // reset notification state if edited
    };
    
    if (mDate.value) {
      post.scheduledAt = new Date(mDate.value).toISOString();
    }
    
    if (mStatus.value === 'published') {
      post.views = document.getElementById('post-views').value.trim();
      post.engagement = document.getElementById('post-engagement').value.trim();
      post.takeaway = document.getElementById('post-takeaway').value.trim();
    }
    
    if (editingPostId) {
      const idx = allPosts.findIndex(p => p.id === editingPostId);
      if (idx !== -1) allPosts[idx] = post;
    } else {
      allPosts.push(post);
    }
    
    await saveData();
    closeModal();
    showToast('Saved!', 'success');
    
    // Refresh current active tab
    const activeTab = document.querySelector('.tab.active').dataset.tab;
    if (activeTab === 'calendar') renderCalendar();
    if (activeTab === 'posts') renderPosts();
    if (activeTab === 'analytics') renderAnalytics();
  });
  
  btnDeletePost?.addEventListener('click', async () => {
    if (!confirm('Delete this post?')) return;
    allPosts = allPosts.filter(p => p.id !== editingPostId);
    await saveData();
    closeModal();
    showToast('Deleted', 'success');
    
    const activeTab = document.querySelector('.tab.active').dataset.tab;
    if (activeTab === 'calendar') renderCalendar();
    if (activeTab === 'posts') renderPosts();
    if (activeTab === 'analytics') renderAnalytics();
  });

  // ─── Settings ───
  document.getElementById('btn-export')?.addEventListener('click', async () => {
    const data = await StorageUtils.get(['cc_posts']);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contentcal-backup-${StorageUtils.todayKey()}.json`;
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
      if (data.cc_posts) {
        await StorageUtils.set({
          cc_posts: data.cc_posts,
        });
        await loadData();
        showToast('Imported! 📥', 'success');
      } else {
        showToast('Invalid backup file', 'error');
      }
    } catch (err) {
      showToast('Import failed: ' + err.message, 'error');
    }
    e.target.value = '';
  });

  document.getElementById('btn-clear-all')?.addEventListener('click', async () => {
    if (!confirm('Delete ALL ContentCal data?')) return;
    await StorageUtils.remove(['cc_posts']);
    allPosts = [];
    updateStreak();
    renderCalendar();
    showToast('Data cleared', 'success');
  });

  // ─── Helpers ───
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

  // ─── Init ───
  loadData();
})();
