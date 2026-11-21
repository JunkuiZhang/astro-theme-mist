const $ = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector);
const $$ = <T extends Element = HTMLElement>(selector: string) => [...document.querySelectorAll<T>(selector)];
const storage = {
  get(key: string) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* Private browsing can disable storage. */ } },
};

// Theme: use the system preference until an explicit choice is made.
const themeButton = $<HTMLButtonElement>('[data-toggle-theme]');
function updateThemeLabel() {
  const dark = document.documentElement.dataset.theme === 'dark';
  themeButton?.setAttribute('aria-label', dark ? '切换到浅色主题' : '切换到深色主题');
  $('meta[name="theme-color"]')?.setAttribute('content', dark ? '#272331' : '#fcf9fa');
}
themeButton?.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  storage.set('mist-theme', theme);
  updateThemeLabel();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
  if (!storage.get('mist-theme')) {
    document.documentElement.dataset.theme = event.matches ? 'dark' : 'light';
    updateThemeLabel();
  }
});
updateThemeLabel();

// The desktop toggle initializes inline with its markup, before the brand is painted.
const sidebarToggle = $<HTMLButtonElement>('[data-toggle-sidebar]');

// Mobile navigation remains keyboard-accessible, with a closed drawer inert.
const menuButton = $<HTMLButtonElement>('.mobile-menu-toggle');
const sidebar = $<HTMLElement>('#site-sidebar');
const mobile = matchMedia('(max-width: 760px)');
function focusWhenVisible(element: HTMLElement | null | undefined, stillRelevant: () => boolean) {
  let attempts = 0;
  const tryFocus = () => {
    if (!element || !stillRelevant() || attempts++ >= 30) return;
    if (element.getClientRects().length && getComputedStyle(element).visibility === 'visible') element.focus({ preventScroll: true });
    if (document.activeElement !== element) requestAnimationFrame(tryFocus);
  };
  requestAnimationFrame(tryFocus);
}
function setMenu(open: boolean, restoreFocus = false) {
  document.body.classList.toggle('menu-open', open);
  menuButton?.setAttribute('aria-expanded', String(open));
  menuButton?.setAttribute('aria-label', open ? '关闭导航' : '展开导航');
  if (sidebar) sidebar.inert = mobile.matches && !open;
  if (open) {
    const first = sidebar?.querySelector<HTMLAnchorElement>('a');
    // Visibility inherited by formerly inert links can update after the drawer itself.
    // Focus only once the link is visible; cancel if the menu closes in the meantime.
    focusWhenVisible(first, () => document.body.classList.contains('menu-open'));
  }
  else if (restoreFocus) menuButton?.focus();
}
menuButton?.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open'), true));
$('[data-close-menu]')?.addEventListener('click', () => setMenu(false, true));
sidebar?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
mobile.addEventListener('change', event => {
  const active = document.activeElement;
  setMenu(false);
  if (event.matches && (active === sidebarToggle || (active && sidebar?.contains(active)))) focusWhenVisible(menuButton, () => mobile.matches);
  else if (!event.matches && active === menuButton) focusWhenVisible(sidebarToggle, () => !mobile.matches);
});
setMenu(false);
document.addEventListener('keydown', event => {
  if (!document.body.classList.contains('menu-open')) return;
  if (event.key === 'Escape') setMenu(false, true);
  if (event.key === 'Tab') {
    const links = sidebar ? [...sidebar.querySelectorAll<HTMLAnchorElement>('a')] : [];
    const first = links[0];
    const last = links.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
});

// All posts are rendered for no-JS browsing; enhance with batched scroll loading.
const cards = $$<HTMLElement>('[data-post-card]');
if ($('[data-journal]')) {
  const batchSize = 8;
  let category = new URLSearchParams(location.search).get('category') || '';
  if (!cards.some(card => card.dataset.category === category)) category = '';
  let pendingCategory = category;
  const savedJournal = history.state?.mistJournal;
  const restoreJournal = savedJournal?.category === category && Number.isInteger(savedJournal.visibleCount);
  let visibleCount = restoreJournal ? Math.max(batchSize, Math.min(cards.length, savedJournal.visibleCount)) : batchSize;
  let currentView = restoreJournal ? savedJournal.view : storage.get('mist-view');
  const more = $<HTMLButtonElement>('#load-more');
  const sentinel = $('#load-sentinel');
  const grid = $('#post-grid');
  const filterBar = $('.filter-bar');
  const filterButtons = $$<HTMLButtonElement>('[data-filter]');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let autoObserver: IntersectionObserver | undefined;
  let revealObserver: IntersectionObserver | undefined;
  let observeFrame = 0;
  let filtering = false;
  let filterVersion = 0;
  let filterExit: Animation | undefined;
  const matchingCards = () => cards.filter(card => !category || card.dataset.category === category);
  const syncFilterIndicator = () => {
    const active = filterButtons.find(button => button.dataset.filter === pendingCategory);
    if (!active || !filterBar) return;
    filterBar.style.setProperty('--filter-left', `${active.offsetLeft}px`);
    filterBar.style.setProperty('--filter-width', `${active.offsetWidth}px`);
    filterBar.classList.add('has-indicator');
  };
  const updateFilterButtons = () => {
    filterButtons.forEach(button => {
      const active = button.dataset.filter === pendingCategory;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    syncFilterIndicator();
  };
  const finishReveal = (card: HTMLElement) => {
    revealObserver?.unobserve(card);
    card.classList.remove('awaiting-reveal', 'card-enter');
    card.style.removeProperty('--reveal-delay');
  };
  const resetReveals = () => cards.forEach(finishReveal);
  const watchEnd = () => {
    if (!autoObserver || !sentinel) return;
    cancelAnimationFrame(observeFrame);
    autoObserver.unobserve(sentinel);
    if (!filtering && more && !more.hidden) {
      // Re-observe after layout so a tall viewport can fill more than one batch.
      observeFrame = requestAnimationFrame(() => {
        if (!filtering && more && !more.hidden) autoObserver?.observe(sentinel);
      });
    }
  };
  const applyFilter = () => {
    const matching = matchingCards();
    const visible = new Set(matching.slice(0, visibleCount));
    cards.forEach(card => { card.hidden = !visible.has(card); });
    updateFilterButtons();
    if (more) more.hidden = matching.length <= visibleCount;
    if (sentinel) sentinel.hidden = !autoObserver || matching.length <= visibleCount;
    const end = $('#list-end');
    if (end) end.hidden = matching.length > visibleCount;
    const status = $('#filter-status');
    if (status) status.textContent = `${category || '全部文章'}：${matching.length} 篇，已显示 ${Math.min(visibleCount, matching.length)} 篇。`;
    // Restore the list's height before native Back/Forward scroll restoration.
    history.replaceState({ ...history.state, mistJournal: { category, visibleCount, view: currentView } }, '');
    watchEnd();
  };
  const loadNextBatch = (moveFocus = false) => {
    if (filtering) return;
    const added = matchingCards().slice(visibleCount, visibleCount + batchSize);
    if (!added.length) return;
    visibleCount += added.length;
    applyFilter();
    if (!reducedMotion.matches && revealObserver) {
      added.forEach(card => {
        card.classList.add('awaiting-reveal');
        revealObserver?.observe(card);
      });
    }
    // Explicit button activation keeps keyboard browsing in the new batch.
    // Automatic loading leaves the reader's focus and scroll position alone.
    if (moveFocus) added[0]?.querySelector<HTMLAnchorElement>('h3 a')?.focus({ preventScroll: true });
  };

  if ('IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver(entries => {
      entries.filter(entry => entry.isIntersecting).forEach((entry, index) => {
        const card = entry.target as HTMLElement;
        if (!card.classList.contains('awaiting-reveal')) return;
        revealObserver?.unobserve(card);
        if (card.hidden || reducedMotion.matches) { finishReveal(card); return; }
        card.style.setProperty('--reveal-delay', `${Math.min(index, 3) * 45}ms`);
        card.classList.remove('awaiting-reveal');
        card.classList.add('card-enter');
      });
    }, { threshold: 0.08 });
    autoObserver = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting) || !more || more.hidden || !sentinel || document.activeElement === more) return;
      // Ignore an old observation after switching categories or changing layout.
      const bounds = sentinel.getBoundingClientRect();
      if (bounds.top <= innerHeight + 200 && bounds.bottom >= 0) loadNextBatch();
    }, { rootMargin: '0px 0px 200px 0px' });
  }
  grid?.addEventListener('animationend', event => {
    if (event.animationName === 'post-card-enter' && event.target instanceof HTMLElement) finishReveal(event.target);
  });
  grid?.addEventListener('focusin', event => {
    const card = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-post-card]') : null;
    // Keep keyboard targets visible without snapping a pointer-clicked card mid-animation.
    if (card && event.target instanceof Element && event.target.matches(':focus-visible')) finishReveal(card);
  });
  reducedMotion.addEventListener('change', event => {
    if (event.matches) {
      resetReveals();
      filterExit?.finish();
    }
  });
  addEventListener('pageshow', event => { if (event.persisted) watchEnd(); });
  const changeCategory = async (nextCategory: string) => {
    if (nextCategory === pendingCategory) return;
    pendingCategory = nextCategory;
    updateFilterButtons();
    // Rapid clicks during the exit share one fade and commit the latest choice.
    if (filterExit) return;
    const version = ++filterVersion;
    filtering = true;
    grid?.setAttribute('aria-busy', 'true');
    watchEnd();
    if (grid && !reducedMotion.matches) {
      filterExit = grid.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 160, easing: 'ease-out', fill: 'forwards',
      });
      await filterExit.finished.catch(() => {});
    }
    // Change visibility only while the old grid is faded out. Prepare entrance
    // frames before removing the fade, so the new cards never flash at full opacity.
    resetReveals();
    category = pendingCategory;
    visibleCount = batchSize;
    const next = new URL(location.href);
    category ? next.searchParams.set('category', category) : next.searchParams.delete('category');
    history.replaceState(history.state, '', next);
    applyFilter();
    const entrances: Animation[] = [];
    if (!reducedMotion.matches) {
      matchingCards().slice(0, visibleCount).forEach((card, index) => {
        card.style.setProperty('--reveal-delay', `${Math.min(index, 5) * 40}ms`);
        card.classList.add('card-enter');
        entrances.push(...card.getAnimations().filter(animation =>
          animation instanceof CSSAnimation && animation.animationName === 'post-card-enter'));
      });
    }
    filterExit?.cancel();
    filterExit = undefined;
    await Promise.allSettled(entrances.map(animation => animation.finished));
    // An interrupted entrance must not resume loading during the next switch.
    if (version !== filterVersion) return;
    filtering = false;
    grid?.removeAttribute('aria-busy');
    watchEnd();
  };
  filterButtons.forEach(button => button.addEventListener('click', () => {
    void changeCategory(button.dataset.filter || '');
  }));
  if (filterBar && 'ResizeObserver' in window) new ResizeObserver(syncFilterIndicator).observe(filterBar);
  else addEventListener('resize', syncFilterIndicator);
  more?.addEventListener('click', () => loadNextBatch(true));
  more?.addEventListener('blur', watchEnd);
  const setView = (view: string) => {
    currentView = view;
    $('#post-grid')?.classList.toggle('list-view', view === 'list');
    $$<HTMLButtonElement>('[data-view]').forEach(button => {
      const selected = button.dataset.view === view;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    watchEnd();
  };
  $$<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', () => {
    const view = button.dataset.view || 'grid';
    storage.set('mist-view', view);
    setView(view);
    applyFilter();
  }));
  setView(currentView === 'list' ? 'list' : 'grid');
  applyFilter();
}

// Search loads Pagefind only when needed. The JSON fallback also works in dev.
interface SearchEntry { title: string; url: string; excerpt: string; matched?: string[] }
interface SearchIndexEntry extends SearchEntry { body?: string; tags?: string[] }
interface SearchReturn { query: string; entries: SearchEntry[]; selected: string; scrollTop: number }
interface PagefindResult { data(): Promise<{ url: string; meta: { title?: string }; excerpt: string }> }
interface Pagefind { search(query: string): Promise<{ results: PagefindResult[] }> }
const dialog = $<HTMLDialogElement>('#search-dialog');
const input = $<HTMLInputElement>('#search-input');
const results = $('#search-results');
const status = $('#search-status');
const base = dialog?.dataset.base || '/';
let pagefindPromise: Promise<Pagefind> | undefined;
let fallbackPromise: Promise<SearchIndexEntry[]> | undefined;
let queryVersion = 0;
let debounce: ReturnType<typeof setTimeout>;

async function search(query: string): Promise<SearchEntry[]> {
  try {
    if (import.meta.env.DEV) throw new Error('Use development index');
    const moduleUrl = `${base}pagefind/pagefind.js`;
    pagefindPromise ||= import(/* @vite-ignore */ moduleUrl);
    const engine = await pagefindPromise;
    const response = await engine.search(query);
    return await Promise.all(response.results.slice(0, 20).map(async result => {
      const data = await result.data();
      const snippet = new DOMParser().parseFromString(data.excerpt, 'text/html').body;
      const matched = [...snippet.querySelectorAll('mark')].map(mark => mark.textContent || '');
      return { title: data.meta.title || '未命名文章', url: data.url, excerpt: snippet.textContent || '', matched };
    }));
  } catch {
    fallbackPromise ||= fetch(`${base}search-index.json`).then(response => {
      if (!response.ok) throw new Error('Index unavailable');
      return response.json();
    }).catch(error => { fallbackPromise = undefined; throw error; });
    const index = await fallbackPromise;
    const terms = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return index.map(entry => {
      const title = entry.title.toLocaleLowerCase();
      const all = `${title} ${entry.tags?.join(' ')} ${entry.body}`.toLocaleLowerCase();
      return { entry, score: terms.every(term => all.includes(term)) ? terms.reduce((sum, term) => sum + (title.includes(term) ? 10 : 1), 0) : 0 };
    }).filter(item => item.score).sort((a, b) => b.score - a.score).slice(0, 20).map(({ entry }) => {
      const { title, url, body = '' } = entry;
      let snippet = entry.excerpt;
      if (!terms.some(term => snippet.toLocaleLowerCase().includes(term))) {
        const lowerBody = body.toLocaleLowerCase();
        const hit = terms.map(term => lowerBody.indexOf(term)).find(index => index >= 0);
        if (hit !== undefined) {
          const start = Math.max(0, hit - 32);
          snippet = (start ? '…' : '') + body.slice(start, start + 110) + (start + 110 < body.length ? '…' : '');
        }
      }
      return { title, url, excerpt: snippet };
    });
  }
}
function highlightMatches(element: HTMLElement, text: string, terms: string[]) {
  const literals = [...new Set(terms.filter(Boolean))].sort((a, b) => b.length - a.length)
    .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!literals.length) { element.textContent = text; return; }
  const pattern = new RegExp(literals.join('|'), 'giu');
  let start = 0;
  for (const match of text.matchAll(pattern)) {
    element.append(text.slice(start, match.index));
    const mark = document.createElement('mark');
    mark.textContent = match[0];
    element.append(mark);
    start = match.index + match[0].length;
  }
  element.append(text.slice(start));
}
function showResults(query: string, entries: SearchEntry[]) {
  if (!results || !status) return;
  results.replaceChildren();
  status.textContent = entries.length ? `找到 ${entries.length === 20 ? '至少 ' : ''}${entries.length} 篇相关文章` : `没有找到“${query}”，试试其他关键词。`;
  for (const entry of entries) {
    const target = new URL(entry.url, location.origin);
    if (target.origin !== location.origin) continue;
    const link = document.createElement('a');
    link.className = 'search-result';
    link.href = target.href;
    const terms = [...query.split(/\s+/), ...(entry.matched || [])];
    const title = document.createElement('strong');
    const snippet = document.createElement('p');
    highlightMatches(title, entry.title, terms);
    highlightMatches(snippet, entry.excerpt, terms);
    link.append(title, snippet);
    link.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const mistSearch: SearchReturn = { query, entries, selected: target.href, scrollTop: results.scrollTop };
      history.replaceState({ ...history.state, mistSearch }, '');
    });
    results.append(link);
  }
}
async function runSearch() {
  const query = input?.value.trim() || '';
  const version = ++queryVersion;
  results?.replaceChildren();
  if (!query) { if (status) status.textContent = '输入标题、标签或正文关键词。'; return; }
  if (status) status.textContent = '正在搜索…';
  try {
    const entries = await search(query);
    if (version !== queryVersion) return;
    showResults(query, entries);
  } catch {
    if (version === queryVersion && status) status.textContent = '搜索索引暂时无法加载，请稍后重试。';
  }
}
function openSearch() {
  setMenu(false);
  if (!dialog?.open) dialog?.showModal();
  input?.focus();
}
function restoreSearch() {
  const saved: SearchReturn | undefined = history.state?.mistSearch;
  if (!saved || !Array.isArray(saved.entries) || !input || !results || !dialog) return;
  clearTimeout(debounce);
  ++queryVersion;
  input.value = saved.query;
  showResults(saved.query, saved.entries);
  const selected = [...results.querySelectorAll('a')].find(link => link.href === saved.selected);
  if (!dialog.open) dialog.showModal();
  results.scrollTop = saved.scrollTop;
  selected?.focus({ preventScroll: true });
}
function forgetSearchReturn() {
  if (!history.state?.mistSearch) return;
  const state = { ...history.state };
  delete state.mistSearch;
  history.replaceState(state, '');
}
restoreSearch();
addEventListener('pageshow', event => { if (event.persisted) restoreSearch(); });
dialog?.addEventListener('close', forgetSearchReturn);
$$('[data-open-search]').forEach(button => button.addEventListener('click', openSearch));
$('[data-close-search]')?.addEventListener('click', () => dialog?.close());
dialog?.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
input?.addEventListener('input', () => {
  forgetSearchReturn();
  ++queryVersion;
  clearTimeout(debounce);
  debounce = setTimeout(runSearch, 180);
});
dialog?.addEventListener('keydown', event => {
  const links = results ? [...results.querySelectorAll<HTMLAnchorElement>('a')] : [];
  const index = links.indexOf(document.activeElement as HTMLAnchorElement);
  if (event.key === 'ArrowDown') { event.preventDefault(); links[Math.min(index + 1, links.length - 1)]?.focus(); }
  if (event.key === 'ArrowUp') { event.preventDefault(); index > 0 ? links[index - 1]?.focus() : input?.focus(); }
  if (event.key === 'Enter' && document.activeElement === input) { event.preventDefault(); links[0]?.click(); }
});
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    dialog?.open ? dialog.close() : openSearch();
  }
});

// Reading controls and contextual navigation.
const backToPosts = $<HTMLAnchorElement>('[data-back-to-posts]');
backToPosts?.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (!('navigation' in window)) return;
  // Skip article anchors and adjacent articles to return to the originating list.
  // Direct visits and browsers without history-entry access retain the home link.
  const current = window.navigation.currentEntry?.index ?? 0;
  const previous = window.navigation.entries().filter(entry => entry.index < current).reverse();
  const base = new URL(import.meta.env.BASE_URL, location.origin).pathname.replace(/\/?$/, '/');
  for (const entry of previous) {
    if (!entry.url) return;
    const target = new URL(entry.url);
    if (target.origin !== location.origin) return;
    if (target.pathname.startsWith(`${base}posts/`)) continue;
    const isList = target.pathname === base || target.pathname === `${base}archives/` || target.pathname.startsWith(`${base}tags/`);
    if (isList) {
      event.preventDefault();
      history.go(entry.index - current);
    }
    return;
  }
});
const widthButton = $<HTMLButtonElement>('.reading-width-toggle');
function setReadingWidth(wide: boolean) {
  document.documentElement.classList.toggle('reading-wide', wide);
  widthButton?.setAttribute('aria-pressed', String(wide));
  const label = widthButton?.querySelector('span');
  if (label) label.textContent = wide ? '标准阅读' : '宽屏阅读';
}
if (widthButton) {
  setReadingWidth(document.documentElement.classList.contains('reading-wide'));
  widthButton.addEventListener('click', () => {
    const wide = !document.documentElement.classList.contains('reading-wide');
    storage.set('mist-reading-mode', wide ? 'wide' : 'standard');
    setReadingWidth(wide);
  });
}

const floatingToc = $<HTMLDetailsElement>('[data-floating-toc]');
const tocNav = floatingToc?.querySelector<HTMLElement>('nav');
function revealActiveToc() {
  if (!floatingToc?.open || !tocNav) return;
  const active = tocNav.querySelector<HTMLElement>('[aria-current="location"]');
  if (!active) return;
  const top = active.offsetTop;
  const bottom = top + active.offsetHeight;
  if (top < tocNav.scrollTop) tocNav.scrollTop = top;
  else if (bottom > tocNav.scrollTop + tocNav.clientHeight) tocNav.scrollTop = bottom - tocNav.clientHeight;
}
if (floatingToc) {
  const summary = floatingToc.querySelector('summary')!;
  const panel = floatingToc.querySelector<HTMLElement>('.floating-toc-panel')!;
  const close = floatingToc.querySelector<HTMLButtonElement>('[data-close-toc]')!;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let wantedOpen = floatingToc.open;
  let animation: Animation | undefined;
  close.hidden = false;
  panel.inert = !wantedOpen;

  const setOpen = (open: boolean, restoreFocus = false) => {
    const wasOpen = floatingToc.open;
    const style = getComputedStyle(panel);
    const current = { opacity: style.opacity, transform: style.transform };
    wantedOpen = open;
    animation?.cancel();
    animation = undefined;
    if (!open && (restoreFocus || panel.contains(document.activeElement))) summary.focus({ preventScroll: true });
    panel.inert = !open;
    if (open) floatingToc.open = true;
    if (motion.matches || (!open && !wasOpen)) {
      floatingToc.open = open;
      if (open) revealActiveToc();
      return;
    }
    const folded = { opacity: '0', transform: 'translateY(10px) scale(.97)' };
    const expanded = { opacity: '1', transform: 'translateY(0) scale(1)' };
    const next = panel.animate([wasOpen ? current : folded, open ? expanded : folded], {
      duration: 220, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both',
    });
    animation = next;
    if (open) revealActiveToc();
    void next.finished.then(() => {
      if (animation !== next) return;
      floatingToc.open = open;
      next.cancel();
      animation = undefined;
    }, () => {});
  };
  summary.addEventListener('click', event => {
    event.preventDefault();
    setOpen(!wantedOpen);
  });
  close.addEventListener('click', () => setOpen(false, true));
  document.addEventListener('pointerdown', event => {
    if (wantedOpen && event.target instanceof Node && !floatingToc.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && wantedOpen) {
      event.preventDefault();
      setOpen(false, true);
    }
  });
  panel.addEventListener('click', event => {
    if (mobile.matches && event.target instanceof Element && event.target.closest('a[href^="#"]')) setOpen(false);
  });
  motion.addEventListener('change', event => { if (event.matches) setOpen(wantedOpen); });
}

$$<HTMLPreElement>('.prose pre').forEach(pre => {
  const code = pre.querySelector('code');
  if (!code) return;
  const button = document.createElement('button');
  button.className = 'code-copy';
  button.type = 'button';
  button.textContent = '复制';
  button.setAttribute('aria-label', '复制代码');
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(code.textContent || '');
      button.textContent = '已复制 ✓';
    } catch { button.textContent = '请手动选择复制'; }
    setTimeout(() => { button.textContent = '复制'; }, 1800);
  });
  pre.prepend(button);
});
const progress = $<HTMLElement>('.reading-progress');
const article = $<HTMLElement>('.article-paper');
const tocLinks = $$<HTMLAnchorElement>('[data-toc-link]');
const sections = tocLinks.map(link => document.getElementById(decodeURIComponent(link.hash.slice(1))));
if (article) {
  let ticking = false;
  let lastActive = -1;
  function updateReading() {
    if (!article) return;
    const start = article.offsetTop;
    const total = Math.max(1, article.offsetHeight - innerHeight);
    const ratio = Math.max(0, Math.min(1, (scrollY - start) / total));
    if (progress) progress.style.transform = `scaleX(${ratio})`;
    let active = 0;
    sections.forEach((section, i) => { if (section && section.getBoundingClientRect().top < 165) active = i; });
    tocLinks.forEach((link, i) => {
      link.classList.toggle('active', i === active);
      i === active ? link.setAttribute('aria-current', 'location') : link.removeAttribute('aria-current');
    });
    if (active !== lastActive) {
      lastActive = active;
      revealActiveToc();
    }
    ticking = false;
  }
  addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(updateReading); ticking = true; } }, { passive: true });
  addEventListener('resize', updateReading);
  widthButton?.addEventListener('click', () => requestAnimationFrame(updateReading));
  updateReading();
}
