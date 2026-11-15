(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const stage = byId('deck-stage');
  const dialog = byId('contents-dialog');
  const previous = byId('previous-button');
  const next = byId('next-button');
  const contents = byId('contents-button');
  const fullscreen = byId('fullscreen-button');
  const mobileCopy = byId('mobile-copy');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const manifestUrl = new URL('./deck.json', document.baseURI);
  const markUrl = new URL('../assets/botbar-mark.svg', document.baseURI).href;
  let slides = [], pages = [], entries = [], current = -1, animation = null, loading = false;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function safeUrl(value, local = false) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const url = new URL(value, manifestUrl);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
      if (local && url.origin !== location.origin) return null;
      return url.href;
    } catch { return null; }
  }

  function textContent(slide, titleTag = 'h2') {
    const copy = element('div', 'bb-copy');
    if (slide.kicker) copy.append(element('p', 'bb-kicker', slide.kicker));
    copy.append(element(titleTag, 'bb-slide-title', slide.title));
    const body = element('div', 'bb-body');
    const paragraphs = Array.isArray(slide.body) ? slide.body : String(slide.body || '').split(/\n\s*\n/);
    paragraphs.filter(value => typeof value === 'string' && value.trim()).forEach(value => body.append(element('p', '', value)));
    copy.append(body);
    if (Array.isArray(slide.bullets) && slide.bullets.length) {
      const list = element('ul', 'bb-bullets');
      slide.bullets.filter(value => typeof value === 'string').forEach(value => list.append(element('li', '', value)));
      copy.append(list);
    }
    if (Array.isArray(slide.rows)) {
      const list = element('dl', 'bb-facts');
      slide.rows.forEach((row, i) => {
        const item = element('div', 'bb-fact');
        item.append(element('span', 'bb-fact-number', String(i + 1).padStart(2, '0')));
        item.append(element('dt', '', row.label));
        item.append(element('dd', '', row.detail));
        list.append(item);
      });
      copy.append(list);
    }
    if (slide.sourceLabel) {
      const source = element('p', 'bb-source');
      const href = safeUrl(slide.sourceUrl);
      if (href) {
        const link = element('a', '', slide.sourceLabel);
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        source.append(link);
      } else source.textContent = slide.sourceLabel;
      copy.append(source);
    }
    return copy;
  }

  function makePage(slide, index, total) {
    const page = element('article', 'bb-slide' + (index === 0 ? ' bb-slide--cover' : ''));
    const layouts = ['scene','editorial','product','sequence','economics','revenue'];
    page.classList.add('bb-layout-' + (layouts.includes(slide.layout) ? slide.layout : 'editorial'));
    page.hidden = true;
    page.inert = true;
    page.setAttribute('role', 'group');
    page.setAttribute('aria-roledescription', 'slide');
    page.setAttribute('aria-label', `${index + 1} of ${total}: ${slide.title}`);
    page.dataset.pageId = slide.id;
    page.append(textContent(slide));
    const figure = element('figure', 'bb-figure');
    const src = safeUrl(slide.image, true);
    if (src) {
      const image = element('img', 'bb-art');
      image.src = src;
      image.alt = slide.alt || '';
      image.decoding = 'async';
      image.draggable = false;
      image.addEventListener('error', () => {
        image.replaceWith(element('div', 'bb-art-error', slide.alt || 'Illustration unavailable.'));
      }, { once:true });
      figure.append(image);
    }
    if (!src) figure.hidden = true;
    if (slide.caption) figure.append(element('figcaption', 'bb-caption', slide.caption));
    page.append(figure);
    const footer = element('div', 'bb-page-footer');
    footer.setAttribute('aria-hidden', 'true');
    const brand = element('span', 'bb-page-footer-brand');
    const mark = element('img');
    mark.src = markUrl; mark.alt = '';
    brand.append(mark, document.createTextNode('BotBar'));
    footer.append(brand, element('span', '', String(index + 1).padStart(2, '0')));
    page.append(footer);
    return page;
  }

  function requestedPage() {
    const hash = location.hash.slice(1);
    const value = new URLSearchParams(hash).get('page');
    if (value !== null) {
      const id = slides.findIndex(slide => slide.id === value);
      if (id >= 0) return id;
      if (/^\d+$/.test(value)) return Math.max(0, Math.min(slides.length - 1, Number(value) - 1));
    }
    if (/^\d+$/.test(hash)) return Math.max(0, Math.min(slides.length - 1, Number(hash) - 1));
    return 0;
  }

  function showPage(index, updateUrl = true, animate = true) {
    if (!slides.length) return;
    index = Math.max(0, Math.min(slides.length - 1, index));
    if (index === current) return;
    const direction = index > current ? 1 : -1;
    if (animation) animation.cancel();
    pages.forEach((page, i) => { page.hidden = i !== index; page.inert = i !== index; });
    current = index;
    const page = pages[index];
    if (animate && !reducedMotion.matches && typeof page.animate === 'function') {
      animation = page.animate([
        { opacity:.15, transform:`perspective(1500px) translateX(${direction * 22}px) rotateY(${direction * 2}deg)` },
        { opacity:1, transform:'perspective(1500px) translateX(0) rotateY(0)' }
      ], { duration:340, easing:'cubic-bezier(.2,.75,.2,1)' });
    }
    previous.disabled = index === 0;
    next.disabled = index === slides.length - 1;
    byId('page-counter').textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    entries.forEach((entry, i) => i === index ? entry.setAttribute('aria-current', 'page') : entry.removeAttribute('aria-current'));
    mobileCopy.replaceChildren(textContent(slides[index]));
    if (slides[index].caption) mobileCopy.append(element('p', 'bb-caption', slides[index].caption));
    mobileCopy.hidden = false;
    byId('page-announcement').textContent = `Page ${index + 1} of ${slides.length}. ${slides[index].title}`;
    if (updateUrl) {
      const url = new URL(location.href);
      url.hash = new URLSearchParams({ page:slides[index].id }).toString();
      history.replaceState(null, '', url);
    }
  }

  function makeContents() {
    const list = byId('contents-list');
    list.replaceChildren();
    entries = slides.map((slide, index) => {
      const item = element('li');
      const button = element('button', 'bb-contents-entry');
      button.type = 'button';
      button.append(element('span', 'bb-contents-number', String(index + 1).padStart(2, '0')));
      const image = element('img');
      const src = safeUrl(slide.image, true);
      if (src) image.src = src;
      else image.hidden = true;
      image.alt = ''; image.loading = 'lazy';
      button.append(image, element('span', '', slide.title));
      button.addEventListener('click', () => { showPage(index); dialog.close(); contents.focus(); });
      item.append(button); list.append(item);
      return button;
    });
  }

  async function loadDeck() {
    if (loading) return;
    loading = true;
    byId('retry-button').hidden = true;
    byId('message-text').textContent = 'Opening the book…';
    try {
      const response = await fetch(manifestUrl, { credentials:'same-origin' });
      if (!response.ok) throw new Error('Unavailable');
      const data = await response.json();
      if (!Array.isArray(data.slides) || !data.slides.length || data.slides.length > 100) throw new Error('Invalid book');
      const ids = new Set();
      slides = data.slides.map((slide, i) => {
        if (!slide || typeof slide.title !== 'string' || !slide.title.trim()) throw new Error('Invalid page');
        const id = typeof slide.id === 'string' && slide.id.trim() ? slide.id : String(i + 1);
        if (ids.has(id)) throw new Error('Duplicate page');
        ids.add(id);
        return { ...slide, id };
      });
      document.title = `${typeof data.title === 'string' ? data.title : 'Investor book'} — BotBar`;
      byId('book-label').textContent = typeof data.title === 'string' ? data.title : 'People. Bots. Possibilities.';
      byId('book-version').textContent = typeof data.version === 'string' ? data.version : '';
      const pdf = safeUrl(data.pdf, true);
      const pdfLink = byId('pdf-link');
      pdfLink.hidden = !pdf;
      if (pdf) pdfLink.href = pdf;
      pages = slides.map((slide, index) => makePage(slide, index, slides.length));
      stage.replaceChildren(...pages);
      makeContents();
      contents.disabled = false;
      current = -1;
      showPage(requestedPage(), true, false);
      document.documentElement.dataset.deckReady = 'true';
    } catch {
      byId('message-text').textContent = 'The book could not be opened. Please try again in a moment.';
      byId('retry-button').hidden = false;
      document.documentElement.dataset.deckReady = 'error';
    } finally { loading = false; }
  }

  previous.addEventListener('click', () => showPage(current - 1));
  next.addEventListener('click', () => showPage(current + 1));
  contents.addEventListener('click', () => { dialog.showModal(); entries[current]?.focus(); });
  byId('close-contents').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  byId('retry-button').addEventListener('click', loadDeck);
  window.addEventListener('hashchange', () => showPage(requestedPage(), false));
  document.addEventListener('keydown', event => {
    if (!slides.length || dialog.open || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    const destinations = { ArrowRight:current + 1, PageDown:current + 1, ArrowLeft:current - 1, PageUp:current - 1, Home:0, End:slides.length - 1 };
    if (!(event.key in destinations)) return;
    event.preventDefault();
    showPage(destinations[event.key]);
  });

  let touchStart = null;
  const pointers = new Set();
  stage.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch') return;
    pointers.add(event.pointerId);
    if (pointers.size > 1 || event.target.closest('a, button')) touchStart = null;
    else touchStart = { x:event.clientX, y:event.clientY, id:event.pointerId };
  });
  stage.addEventListener('pointerup', event => {
    const start = touchStart;
    pointers.delete(event.pointerId);
    touchStart = null;
    if (!start || start.id !== event.pointerId || pointers.size) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) showPage(current + (dx < 0 ? 1 : -1));
  });
  stage.addEventListener('pointercancel', event => { pointers.delete(event.pointerId); touchStart = null; });

  if (!document.fullscreenEnabled) fullscreen.hidden = true;
  fullscreen.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await byId('reader-shell').requestFullscreen();
    } catch { byId('action-announcement').textContent = 'Fullscreen is not available in this browser.'; }
  });
  document.addEventListener('fullscreenchange', () => {
    const active = Boolean(document.fullscreenElement);
    fullscreen.setAttribute('aria-pressed', String(active));
    fullscreen.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
    fullscreen.querySelector('span').textContent = active ? 'Exit fullscreen' : 'Fullscreen';
  });
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches && animation) animation.cancel(); });
  loadDeck();
})();
