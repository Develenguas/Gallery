(function () {
  "use strict";

  /* ============================================================
     CONFIGURACIÓN
     ============================================================ */
  const PHOTOS_JSON_URL = "./data/photos.json";
  const SONG_JSON_URL = "./data/song.json";
  const FOTOS_DIR = "./fotos/";
  const BATCH_SIZE = 40; // cuántas fotos se dibujan por tanda (scroll infinito)

  const galleryEl = document.getElementById("gallery");
  const emptyState = document.getElementById("emptyState");
  const loadingMore = document.getElementById("loadingMore");
  const albumMeta = document.getElementById("albumMeta");
  const sentinel = document.getElementById("loadSentinel");

  let PHOTOS = [];
  let renderedCount = 0;
  let observer = null;

  /* ============================================================
     CARGA DE DATOS (data/photos.json y data/song.json)
     ============================================================ */
  async function loadJSON(url) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  function slugify(text) {
    return text
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "foto";
  }

  function downloadPhoto(photo) {
    const ext = (photo.file.match(/\.(\w+)$/) || [, "jpg"])[1];
    const a = document.createElement("a");
    a.href = photo.src;
    a.download = slugify(photo.title) + "." + ext;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /* ============================================================
     GALERÍA — renderizado por tandas (sin límite de fotos)
     ============================================================ */
  function buildCard(photo, index) {
    const card = document.createElement("article");
    card.className = "photo-card";
    card.style.animationDelay = Math.min((index % BATCH_SIZE) * 45, 400) + "ms";

    card.innerHTML = `
      <button class="photo-trigger" data-index="${index}" aria-label="Ver ${photo.title} en grande">
        <div class="photo-media">
          <img src="${photo.src}" alt="${photo.title}" loading="lazy" decoding="async">
          <div class="photo-caption">
            <span class="cap-text">${photo.title}</span>
            <span class="card-actions"></span>
          </div>
        </div>
      </button>
    `;

    const actions = card.querySelector(".card-actions");
    const dlBtn = document.createElement("button");
    dlBtn.className = "icon-btn download-btn";
    dlBtn.type = "button";
    dlBtn.setAttribute("aria-label", "Descargar " + photo.title);
    dlBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"/></svg>`;
    dlBtn.addEventListener("click", (e) => { e.stopPropagation(); downloadPhoto(photo); });
    actions.appendChild(dlBtn);

    card.querySelector(".photo-trigger").addEventListener("click", () => openLightbox(index));

    return card;
  }

  function renderNextBatch() {
    const slice = PHOTOS.slice(renderedCount, renderedCount + BATCH_SIZE);
    const frag = document.createDocumentFragment();
    slice.forEach((photo, i) => frag.appendChild(buildCard(photo, renderedCount + i)));
    galleryEl.insertBefore(frag, sentinel);
    renderedCount += slice.length;

    if (renderedCount >= PHOTOS.length && observer) {
      observer.disconnect();
      loadingMore.hidden = true;
    }
  }

  function setupInfiniteScroll() {
    if (PHOTOS.length <= BATCH_SIZE) return;
    observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        loadingMore.hidden = false;
        renderNextBatch();
        if (renderedCount < PHOTOS.length) {
          loadingMore.hidden = false;
        } else {
          loadingMore.hidden = true;
        }
      }
    }, { rootMargin: "600px 0px" });
    observer.observe(sentinel);
  }

  function renderGallery() {
    emptyState.hidden = PHOTOS.length !== 0;
    albumMeta.textContent = PHOTOS.length
      ? PHOTOS.length + (PHOTOS.length === 1 ? " fotografía" : " fotografías")
      : "";
    renderNextBatch();
    setupInfiniteScroll();
  }

  /* ============================================================
     CANCIÓN (solo lectura — se edita a mano en data/song.json)
     ============================================================ */
  function renderSong(song) {
    const songSection = document.getElementById("songSection");
    const songCard = document.getElementById("songCard");
    if (!song || !song.title || !song.url) {
      songSection.hidden = true;
      return;
    }
    songSection.hidden = false;
    songCard.hidden = false;
    songCard.innerHTML = `
      <span class="song-note" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
      </span>
      <span class="song-body">
        <span class="song-eyebrow">Canción de este álbum</span>
        <span class="song-title"><a href="${song.url}" target="_blank" rel="noopener noreferrer">${song.title}</a></span>
      </span>
    `;
  }

  /* ============================================================
     LIGHTBOX
     ============================================================ */
  const lightbox = document.getElementById("lightbox");
  const lbImage = document.getElementById("lbImage");
  const lbTitle = document.getElementById("lbTitle");
  const lbCounter = document.getElementById("lbCounter");
  const lbDownload = document.getElementById("lbDownload");
  const lbClose = document.getElementById("lbClose");
  const lbPrev = document.getElementById("lbPrev");
  const lbNext = document.getElementById("lbNext");

  let currentIndex = 0;
  let lastFocused = null;

  function openLightbox(index) {
    lastFocused = document.activeElement;
    currentIndex = index;
    renderLightbox();
    lightbox.classList.add("is-open");
    document.body.style.overflow = "hidden";
    lbClose.focus();
  }

  function closeLightbox() {
    if (!lightbox.classList.contains("is-open")) return;
    lightbox.classList.remove("is-open");
    document.body.style.overflow = "";
    if (lastFocused) lastFocused.focus();
  }

  function renderLightbox() {
    const photo = PHOTOS[currentIndex];
    if (!photo) { closeLightbox(); return; }
    lbImage.src = photo.src;
    lbImage.alt = photo.title;
    lbTitle.textContent = photo.title;
    lbDownload.onclick = (e) => { e.preventDefault(); downloadPhoto(photo); };
    lbCounter.textContent = (currentIndex + 1) + " / " + PHOTOS.length;
  }

  function step(delta) {
    if (PHOTOS.length === 0) return;
    currentIndex = (currentIndex + delta + PHOTOS.length) % PHOTOS.length;
    renderLightbox();
  }

  lbClose.addEventListener("click", closeLightbox);
  lbPrev.addEventListener("click", () => step(-1));
  lbNext.addEventListener("click", () => step(1));
  lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });

  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("is-open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });

  /* ============================================================
     INIT
     ============================================================ */
  async function init() {
    const [photosData, songData] = await Promise.all([
      loadJSON(PHOTOS_JSON_URL),
      loadJSON(SONG_JSON_URL),
    ]);

    const list = Array.isArray(photosData) ? photosData : [];
    PHOTOS = list.map((p) => ({
      file: p.file,
      title: p.title || p.file,
      src: FOTOS_DIR + encodeURIComponent(p.file),
    }));

    renderGallery();
    renderSong(songData);
  }

  init();
})();
