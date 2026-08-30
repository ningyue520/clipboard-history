'use strict';

(() => {
  const file = new URLSearchParams(location.search).get('file');
  const img = document.getElementById('preview-img');
  let scale = 1;
  let tx = 0;
  let ty = 0;
  let dragging = false;
  let moved = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragBaseX = 0;
  let dragBaseY = 0;

  function apply() {
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    document.body.classList.toggle('zoomed', scale > 1);
  }

  if (file && !file.includes('/') && !file.includes('\\') && !file.includes('..')) {
    img.src = 'img://' + file;
  }

  window.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
    const next = Math.min(8, Math.max(1, scale * factor));
    if (next === scale) return;
    const ratio = next / scale;
    const mx = e.clientX - window.innerWidth / 2;
    const my = e.clientY - window.innerHeight / 2;
    tx = (1 - ratio) * (mx - tx);
    ty = (1 - ratio) * (my - ty);
    scale = next;
    if (scale === 1) {
      tx = 0;
      ty = 0;
    }
    apply();
  }, { passive: false });

  window.addEventListener('mousedown', (e) => {
    if (scale <= 1) return;
    dragging = true;
    moved = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragBaseX = tx;
    dragBaseY = ty;
    img.classList.add('dragging');
  });

  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
    tx = dragBaseX + dx;
    ty = dragBaseY + dy;
    apply();
  });

  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    img.classList.remove('dragging');
  });

  window.addEventListener('click', () => {
    if (moved) return;
    if (scale > 1) {
      scale = 1;
      tx = 0;
      ty = 0;
      apply();
    } else {
      window.close();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.close();
  });
})();
