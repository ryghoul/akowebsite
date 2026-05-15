/**
 * ako-images.js
 * Fetches the image manifest from /api/images and swaps any
 * uploaded images into the page. Add data-ako-slot="key" to
 * any <img> tag you want to make swappable.
 */
(function () {
  async function applyImages() {
    let manifest;
    try {
      const res = await fetch('/api/images');
      manifest  = await res.json();
    } catch {
      return; // silently skip if API unreachable
    }

    Object.entries(manifest).forEach(([key, entry]) => {
      // Find all images tagged with this slot key
      document.querySelectorAll(`[data-ako-slot="${key}"]`).forEach(el => {
        const src = entry.file + '?t=' + new Date(entry.updatedAt).getTime();
        if (el.tagName === 'IMG') {
          el.src = src;
        } else {
          // background-image fallback for divs etc.
          el.style.backgroundImage = `url('${src}')`;
        }
      });
    });
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyImages);
  } else {
    applyImages();
  }
})();
