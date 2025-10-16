'use strict';                      // Opt into strict mode (safer JS: no accidental globals, etc.)

// Build a small dataset of 20 images from picsum.photos
const DATA = Array.from({ length: 20 }, (_, i) => {   // Create an array [0..19] and map each to an object
  const id = 100 + i;                                 // Use ids 100..119 (picsum has many image IDs)
  return {                                            // One gallery item:
    id: String(id),                                   //   string id (used for favorites)
    thumb: `https://picsum.photos/id/${id}/400/300`,  //   thumbnail URL (400x300)
    full: `https://picsum.photos/id/${id}/1200/900`, //   full-size URL (1200x900)
    alt: `Sample photo #${id} from Picsum`,         //   alt text for accessibility
    author: `Photographer ${id}`                       //   label shown under the thumb
  };
});

// Tiny DOM helpers
const $ = (s) => document.querySelector(s);          // Select first matching element
const $$ = (s) => [...document.querySelectorAll(s)];  // Select all matches -> Array

// Cache references to important elements
const grid = $('#grid');      // The thumbnail grid container
const emptyEl = $('#empty');     // “No images” placeholder
const onlyFav = $('#onlyFav');   // Checkbox: show only favorites
const clearFav = $('#clearFav');  // Button: clear all favorites
const overlay = $('#overlay');   // Clickable dark overlay behind modal
const viewer = $('#viewer');    // <dialog> modal viewer
const imgFull = $('#full');      // <img> inside the viewer
const caption = $('#caption');   // <figcaption> under the image
const btnClose = $('#btnClose');  // Close button in the modal
const btnPrev = $('#prev');      // Prev button
const btnNext = $('#next');      // Next button
const btnFav = $('#fav');       // Favorite toggle button

// Favorites: load/save as a Set in localStorage
const FKEY = 'gallery_fav_v1';                                 // Storage key
const loadFavs = () => new Set(JSON.parse(localStorage.getItem(FKEY) || '[]'));  // Read -> Set
const saveFavs = (set) => localStorage.setItem(FKEY, JSON.stringify([...set]));  // Set -> JSON
let favs = loadFavs();                                         // Current favorites set

// Display state
let filtered = DATA.slice();     // Items (later you could filter/search; here just a copy)
let currentIndex = -1;           // Index of currently shown item in the viewer (-1 = none)

// Render the grid of cards
function renderGrid() {
  grid.innerHTML = '';                                                         // Clear previous cards
  const items = onlyFav.checked ? filtered.filter(x => favs.has(x.id)) : filtered; // Filter to favorites if checkbox on
  emptyEl.classList.toggle('hidden', items.length !== 0);                      // Show “No images” if list empty

  for (const item of items) {                                    // For each image, build a card
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <a href="#" class="thumb" data-id="${item.id}" aria-label="Open image ${item.id} in viewer">
        <img class="ph" alt="${item.alt}" data-src="${item.thumb}" />
      </a>
      <div class="meta">
        <span class="title">${item.author}</span>
        <span class="size muted small">#${item.id}</span>
      </div>
      <button class="heart ${favs.has(item.id) ? 'fav' : ''}" aria-pressed="${favs.has(item.id)}" aria-label="Toggle favorite">♥</button>
    `;                                                          // Note: <img> uses data-src (lazy), not src yet
    grid.appendChild(card);
  }

  wireThumbs();          // Attach click handlers for thumbs/hearts
  setupLazyLoading();    // Start IntersectionObserver for lazy images
}

// Lazy-load thumbnails when they come into view
function setupLazyLoading() {
  const imgs = $$('.ph[data-src]');                    // All images that still have a data-src
  if (!('IntersectionObserver' in window)) {           // Fallback for very old browsers
    imgs.forEach(img => img.src = img.dataset.src);    //   Load immediately
    return;
  }
  const io = new IntersectionObserver((entries, obs) => {   // Create observer
    entries.forEach(entry => {
      if (entry.isIntersecting) {                            // If image is in/near viewport
        const img = entry.target;
        img.src = img.dataset.src;                           //   Move data-src -> src (starts loading)
        img.removeAttribute('data-src');                     //   Mark as loaded
        obs.unobserve(img);                                  //   Stop observing this image
      }
    });
  }, { rootMargin: '200px 0px' });                           // Start loading 200px before it appears
  imgs.forEach(img => io.observe(img));                      // Observe each lazy image
}

// Wire click handlers for thumbs and hearts (favorite toggles)
function wireThumbs() {
  $$('.thumb').forEach(a => {                                 // Each thumbnail link…
    a.addEventListener('click', (e) => {
      e.preventDefault();                                     // Don’t navigate to "#"
      const id = e.currentTarget.dataset.id;                  // Which image was clicked
      const list = onlyFav.checked ? filtered.filter(x => favs.has(x.id)) : filtered;  // Current visible list
      const idx = list.findIndex(x => x.id === id);           // Find its index in the visible list
      if (idx >= 0) openViewer(idx);                          // Open modal at that index
    });
  });
  $$('.heart').forEach(btn => {                               // Each heart button…
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.closest('.card').querySelector('.thumb').dataset.id; // Item id from the card
      toggleFav(id);                                          // Flip favorite on/off
      e.currentTarget.classList.toggle('fav', favs.has(id));  // Update heart color
      e.currentTarget.setAttribute('aria-pressed', String(favs.has(id))); // A11y state
      if (onlyFav.checked && !favs.has(id)) {                 // If filtering to favorites and we unfavorited…
        e.currentTarget.closest('.card')?.remove();           //   Remove card from grid
        if (!grid.children.length) emptyEl.classList.remove('hidden'); //   Show empty state if none left
      }
    });
  });
}

// Toggle favorite for given id
function toggleFav(id) {
  if (favs.has(id)) favs.delete(id); else favs.add(id);   // Add/remove from Set
  saveFavs(favs);                                         // Persist to localStorage
  const card = [...$$('.card')].find(c => c.querySelector('.thumb')?.dataset.id === id); // Locate card in DOM
  if (card) {                                             // Reflect state on the grid heart (if visible)
    const h = card.querySelector('.heart');
    h?.classList.toggle('fav', favs.has(id));
    h?.setAttribute('aria-pressed', String(favs.has(id)));
  }
  reflectFavButton();                                     // Also update the modal's Favorite button if open
}

// Clear all favorites
clearFav.addEventListener('click', () => {
  favs = new Set();           // Reset the Set
  saveFavs(favs);             // Save empty Set
  renderGrid();               // Rerender UI (hearts reset, fav-only filter applies)
});

// Toggle favorites-only filter
onlyFav.addEventListener('change', renderGrid);  // Rebuild grid when checkbox changes

let lastFocused = null;        // For restoring focus after closing the modal

// Open the modal viewer at a given index within the *current* list
function openViewer(idx) {
  currentIndex = idx;                                             // Track which item is shown
  lastFocused = document.activeElement;                           // Remember which element had focus
  const list = onlyFav.checked ? filtered.filter(x => favs.has(x.id)) : filtered; // Visible set
  const item = list[currentIndex];
  if (!item) return;                                              // If index invalid, bail

  imgFull.src = item.full;                                        // Load full-size image
  imgFull.alt = item.alt;                                         // Alt text (a11y)
  caption.textContent = `${item.alt} — ${item.author} (id ${item.id})`; // Caption lines
  reflectFavButton();                                             // Sync modal favorite button state

  document.getElementById('overlay').classList.remove('hidden');  // Show dark overlay
  document.getElementById('overlay').setAttribute('aria-hidden', 'false');
  viewer.showModal();                                             // Open <dialog> as modal
  document.getElementById('btnClose').focus();                    // Move focus to Close (focus trap starts)
  document.body.style.overflow = 'hidden';                        // Prevent background scroll

  window.addEventListener('keydown', keyNav);                     // Arrow/Esc keys
  document.getElementById('overlay').addEventListener('click', closeViewer, { once: true }); // Click outside to close
  viewer.addEventListener('keydown', focusTrap);                  // Keep Tab focus inside modal
}

// Update the modal Favorite button to match current item
function reflectFavButton() {
  const list = onlyFav.checked ? filtered.filter(x => favs.has(x.id)) : filtered;
  const item = list[currentIndex];
  if (!item) return;
  const isFav = favs.has(item.id);
  btnFav.setAttribute('aria-pressed', String(isFav));             // A11y pressed state
  btnFav.textContent = isFav ? '★ Favorited' : '♡ Favorite';      // Visual label
}

// Close the modal viewer
function closeViewer() {
  document.body.style.overflow = '';                               // Re-enable background scroll
  document.getElementById('overlay').classList.add('hidden');      // Hide overlay
  document.getElementById('overlay').setAttribute('aria-hidden', 'true');
  if (viewer.open) viewer.close();                                  // Close <dialog> if open
  window.removeEventListener('keydown', keyNav);                    // Remove key handlers
  viewer.removeEventListener('keydown', focusTrap);
  lastFocused?.focus();                                             // Return focus to the opener (a11y)
}

// Keyboard navigation inside the modal
function keyNav(e) {
  if (e.key === 'Escape') { e.preventDefault(); closeViewer(); } // Esc closes
  else if (e.key === 'ArrowRight') { e.preventDefault(); nav(1); }   // Right → next
  else if (e.key === 'ArrowLeft') { e.preventDefault(); nav(-1); }   // Left  → prev
}

// Move to previous/next image inside the current list
function nav(step) {
  const list = onlyFav.checked ? filtered.filter(x => favs.has(x.id)) : filtered; // Visible items
  if (!list.length) return;
  currentIndex = (currentIndex + step + list.length) % list.length;  // Wrap around
  const item = list[currentIndex];
  imgFull.src = item.full;                                           // Update image
  imgFull.alt = item.alt;
  caption.textContent = `${item.alt} — ${item.author} (id ${item.id})`;
  reflectFavButton();                                                // Sync favorite button
}

// Wire up modal buttons
btnPrev.addEventListener('click', () => nav(-1));   // Prev button
btnNext.addEventListener('click', () => nav(1));    // Next button
btnClose.addEventListener('click', closeViewer);    // Close button
btnFav.addEventListener('click', () => {            // Favorite toggle in modal
  const list = onlyFav.checked ? filtered.filter(x => favs.has(x.id)) : filtered;
  const item = list[currentIndex];
  if (!item) return;
  toggleFav(item.id);
});

// Trap focus within the modal while it’s open (accessibility)
function focusTrap(e) {
  if (e.key !== 'Tab') return;                                           // Only handle Tab
  const focusables = viewer.querySelectorAll(                            // All focusable elements
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const list = Array.from(focusables).filter(el => !el.hasAttribute('disabled'));
  if (list.length === 0) return;
  const first = list[0], last = list[list.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }   // Shift+Tab on first -> wrap to last
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } // Tab on last -> wrap to first
}

// Initial render of the grid on page load
renderGrid();
