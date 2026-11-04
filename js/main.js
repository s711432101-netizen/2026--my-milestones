/**
 * AGENTS.md 規範設計系統 - 個人生涯重大突破與成就博物館
 * JavaScript 核心邏輯 (js/main.js)
 * 支援功能：
 * 1. 2026 年度真實成就管理與即時統計計算 (累積突破項目、橫跨月份、核心領域主題)
 * 2. 6 大整併分類主題單選篩選模式 (Single-select Filter)
 * 3. 即時關鍵字搜尋與清空功能
 * 4. 卡片點擊展開詳細視窗 (Modal Popup，支援真實照片與簡約質感向量徽章)
 * 5. 深淺主題切換 (Dark / Light Theme Toggle，支援持久化儲存)
 * 6. 圖片載入失敗時的友善 Fallback 備援機制
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM 節點取得
  const milestoneGrid = document.getElementById('milestone-grid');
  const cards = Array.from(document.querySelectorAll('.milestone-card'));
  const emptyState = document.getElementById('empty-state');
  const resultsCount = document.getElementById('results-count');
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search');
  const timeFilterBtns = document.querySelectorAll('#time-filters .filter-btn');
  const tagFilterBtns = document.querySelectorAll('#tag-filters .filter-btn');
  const resetFiltersBtn = document.getElementById('reset-filters');
  const themeToggleBtn = document.getElementById('theme-toggle');

  // Modal 節點
  const cardModal = document.getElementById('card-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalBodyContent = document.getElementById('modal-body-content');

  // 篩選狀態：支援時間維度 + 主題單選 (Single-select filter)
  let currentYearFilter = 'all';
  let activeTag = null; // null 表示全部，有值時為當前單選之標籤字串 (例如 "#專業與認證")
  let searchQuery = '';

  /* -------------------------------------------------------------
   * 1. 動態計算並更新 3 大統計欄位 (總項目、橫跨月份、核心領域主題)
   * ----------------------------------------------------------- */
  function updateStatistics() {
    const totalCountEl = document.getElementById('stat-total');
    const monthsCountEl = document.getElementById('stat-months');
    const tagsCountEl = document.getElementById('stat-tags');

    // (1) 累積突破項目
    if (totalCountEl) {
      totalCountEl.textContent = cards.length;
    }

    // (2) 橫跨月份計算 (解析 2026 年度各卡片之月份)
    if (monthsCountEl) {
      const uniqueMonths = new Set();
      cards.forEach(card => {
        const dateAttr = card.getAttribute('data-date');
        if (dateAttr) {
          uniqueMonths.add(dateAttr);
        } else {
          const dateSpan = card.querySelector('.card-date');
          if (dateSpan) {
            const match = dateSpan.textContent.match(/2026\s*年\s*(\d+)\s*月/);
            if (match) uniqueMonths.add(`2026-${match[1].padStart(2, '0')}`);
          }
        }
      });
      monthsCountEl.textContent = uniqueMonths.size || 7;
    }

    // (3) 核心領域主題數 (計算既有 6 大分類按鈕數量)
    if (tagsCountEl) {
      const definedButtonTags = Array.from(tagFilterBtns)
        .map(btn => btn.getAttribute('data-tag'))
        .filter(Boolean);
      tagsCountEl.textContent = definedButtonTags.length || 6;
    }
  }

  /* -------------------------------------------------------------
   * 2. 卡片篩選主邏輯 (支援主題單選 Single-select + 關鍵字搜尋)
   * ----------------------------------------------------------- */
  function filterCards() {
    let visibleCount = 0;

    cards.forEach(card => {
      const cardYear = card.getAttribute('data-year') || '2026';
      const cardCategory = card.getAttribute('data-category') || '';
      const cardTags = card.getAttribute('data-tags') || '';
      const cardText = card.textContent.toLowerCase();

      // (1) 時間維度比對 (全數屬於 2026 年)
      let matchesYear = false;
      if (currentYearFilter === 'all' || currentYearFilter === 'year-2026') {
        matchesYear = true;
      } else {
        matchesYear = (cardYear === currentYearFilter.replace('year-', ''));
      }

      // (2) 主題單選比對 (Single-select)
      let matchesTag = true;
      if (activeTag) {
        matchesTag = (cardCategory === activeTag || cardTags.includes(activeTag));
      }

      // (3) 關鍵字搜尋比對
      let matchesSearch = true;
      if (searchQuery.trim() !== '') {
        matchesSearch = cardText.includes(searchQuery.toLowerCase().trim());
      }

      // 綜合判斷顯示或隱藏
      if (matchesYear && matchesTag && matchesSearch) {
        card.style.display = 'flex';
        card.style.animation = 'fadeIn 0.3s ease forwards';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    // 更新篩選結果筆數
    if (resultsCount) {
      resultsCount.textContent = `共顯示 ${visibleCount} 項突破`;
    }

    // 顯示或隱藏空搜尋狀態提示
    if (emptyState) {
      emptyState.style.display = (visibleCount === 0) ? 'flex' : 'none';
    }
  }

  /* -------------------------------------------------------------
   * 3. 時間維度篩選按鈕事件
   * ----------------------------------------------------------- */
  timeFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      timeFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentYearFilter = btn.getAttribute('data-filter') || 'all';
      filterCards();
    });
  });

  /* -------------------------------------------------------------
   * 4. 主題分類篩選按鈕事件 (單選模式 Single-select)
   * 點擊任一標籤僅高亮該標籤並篩選；再次點擊或點重設則還原顯示全部
   * ----------------------------------------------------------- */
  tagFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const clickedTag = btn.getAttribute('data-tag');

      if (activeTag === clickedTag) {
        // 再次點擊同一標籤 -> 取消選取，回到全部
        activeTag = null;
        tagFilterBtns.forEach(b => b.classList.remove('active'));
      } else {
        // 單選選取新標籤
        activeTag = clickedTag;
        tagFilterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }

      filterCards();
    });
  });

  /* -------------------------------------------------------------
   * 5. 搜尋欄即時輸入與清空按鈕事件
   * ----------------------------------------------------------- */
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value;
      if (clearSearchBtn) {
        clearSearchBtn.style.display = searchQuery.trim() !== '' ? 'flex' : 'none';
      }
      filterCards();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
      }
      searchQuery = '';
      clearSearchBtn.style.display = 'none';
      filterCards();
    });
  }

  /* -------------------------------------------------------------
   * 6. 重設所有篩選條件
   * ----------------------------------------------------------- */
  window.resetAllFilters = function() {
    currentYearFilter = 'all';
    activeTag = null;
    searchQuery = '';

    // 重設時間按鈕
    timeFilterBtns.forEach(b => b.classList.remove('active'));
    const allTimeBtn = document.querySelector('#time-filters .filter-btn[data-filter="all"]');
    if (allTimeBtn) allTimeBtn.classList.add('active');

    // 重設主題標籤按鈕
    tagFilterBtns.forEach(b => b.classList.remove('active'));

    // 重設搜尋框
    if (searchInput) searchInput.value = '';
    if (clearSearchBtn) clearSearchBtn.style.display = 'none';

    filterCards();
  };

  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', window.resetAllFilters);
  }

  /* -------------------------------------------------------------
   * 7. 卡片點擊展開詳細 Modal 彈窗
   * ----------------------------------------------------------- */
  function openCardModal(card) {
    if (!cardModal || !modalBodyContent) return;

    const imgEl = card.querySelector('.card-image img');
    const svgEl = card.querySelector('.card-image svg');
    const metaEl = card.querySelector('.card-meta');
    const titleEl = card.querySelector('.card-title');
    const descEl = card.querySelector('.card-description');
    const takeawayEl = card.querySelector('.card-takeaway');

    let imageHtml = '';
    if (imgEl && imgEl.src && imgEl.style.display !== 'none') {
      imageHtml = `<img src="${imgEl.src}" alt="${imgEl.alt || ''}" class="modal-hero-img">`;
    } else if (svgEl) {
      imageHtml = `<div class="modal-hero-svg">${svgEl.outerHTML}</div>`;
    }

    modalBodyContent.innerHTML = `
      ${imageHtml}
      <div class="card-meta" style="margin-bottom: 14px;">
        ${metaEl ? metaEl.innerHTML : ''}
      </div>
      <h2 style="font-size: 1.55rem; font-weight: 800; margin-bottom: 18px; line-height: 1.42; color: var(--text-primary);">
        ${titleEl ? titleEl.textContent : ''}
      </h2>
      <div style="margin-bottom: 24px; font-size: 1rem; line-height: 1.85; color: var(--text-secondary);">
        ${descEl ? descEl.innerHTML : ''}
      </div>
      <div>
        ${takeawayEl ? takeawayEl.outerHTML : ''}
      </div>
    `;

    cardModal.classList.add('active');
    cardModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeCardModal() {
    if (!cardModal) return;
    cardModal.classList.remove('active');
    cardModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  cards.forEach(card => {
    card.addEventListener('click', () => openCardModal(card));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openCardModal(card);
      }
    });
  });

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeCardModal);
  }

  if (cardModal) {
    cardModal.addEventListener('click', (e) => {
      if (e.target === cardModal) closeCardModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cardModal && cardModal.classList.contains('active')) {
      closeCardModal();
    }
  });

  /* -------------------------------------------------------------
   * 8. 深淺主題切換 (Dark / Light Theme Toggle)
   * ----------------------------------------------------------- */
  const savedTheme = localStorage.getItem('milestone-theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const target = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', target);
      localStorage.setItem('milestone-theme', target);
      updateThemeIcon(target);
    });
  }

  function updateThemeIcon(theme) {
    if (!themeToggleBtn) return;
    const icon = themeToggleBtn.querySelector('i');
    if (icon) {
      icon.className = (theme === 'dark') ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
  }

  // 初始化統計與過濾
  updateStatistics();
  filterCards();
});

/* -------------------------------------------------------------
 * 9. 圖片載入失敗時的 Fallback 備援函式
 * ----------------------------------------------------------- */
window.handleImageFallback = function(imgElement, iconName = 'bookmark', categoryName = '成就') {
  if (!imgElement || !imgElement.parentElement) return;
  const parent = imgElement.parentElement;

  // 防止重複生成
  if (parent.querySelector('.card-image-fallback')) return;

  const fallbackDiv = document.createElement('div');
  fallbackDiv.className = 'card-image-fallback';
  fallbackDiv.innerHTML = `
    <i class="fa-solid fa-${iconName}"></i>
    <span class="fallback-text">${categoryName}</span>
  `;

  imgElement.style.display = 'none';
  parent.appendChild(fallbackDiv);
};
