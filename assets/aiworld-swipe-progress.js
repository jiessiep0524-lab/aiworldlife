(() => {
  if (window.aiworldSwipeProgressReady) return;
  window.aiworldSwipeProgressReady = true;

  const closestIndex = (track, cards) => {
    const left = track.scrollLeft;
    return cards.reduce((closest, card, index) => {
      const distance = Math.abs(card.offsetLeft - left);
      return distance < closest.distance ? { index, distance } : closest;
    }, { index: 0, distance: Infinity }).index;
  };

  document.querySelectorAll('[data-swipe-track]').forEach((track) => {
    const root = track.parentElement;
    if (!root) return;
    const cards = [...track.querySelectorAll('[data-swipe-card]')];
    const dots = [...root.querySelectorAll('[data-swipe-dot]')];
    if (!cards.length || !dots.length) return;

    const setActive = (index) => {
      dots.forEach((dot, dotIndex) => {
        const active = dotIndex === index;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-current', active ? 'true' : 'false');
      });
    };

    const glide = root.querySelector('[data-swipe-glide]');
    const progress = glide ? glide.parentElement : null;
    let positions = [];
    const measure = () => {
      positions = dots.map((dot) => dot.offsetLeft);
    };
    const indexFromScroll = () => {
      if (cards.length < 2) return 0;
      const step = cards[1].offsetLeft - cards[0].offsetLeft;
      if (step <= 0) return closestIndex(track, cards);
      return Math.max(0, Math.min(track.scrollLeft / step, cards.length - 1));
    };
    const paintGlide = (indexFloat, settle) => {
      if (!glide || !positions.length) return;
      const max = cards.length - 1;
      const clamped = Math.max(0, Math.min(indexFloat, max));
      const lower = Math.floor(clamped);
      const upper = Math.min(max, lower + 1);
      const mix = clamped - lower;
      const x = positions[lower] + (positions[upper] - positions[lower]) * mix;
      progress.classList.toggle('is-settling', settle);
      glide.style.transform = `translate3d(${x}px, -50%, 0)`;
    };

    const goTo = (index, behavior = 'smooth') => {
      const next = Math.max(0, Math.min(index, cards.length - 1));
      track.scrollTo({ left: cards[next].offsetLeft - cards[0].offsetLeft, behavior });
      setActive(next);
      paintGlide(next, true);
    };

    dots.forEach((dot) => {
      dot.addEventListener('click', () => goTo(parseInt(dot.dataset.swipeDot, 10)));
    });

    let frame = 0;
    let settleTimer = 0;
    const settle = () => {
      const index = closestIndex(track, cards);
      setActive(index);
      paintGlide(index, true);
    };
    const sync = () => {
      if (glide) {
        if (!frame) {
          frame = requestAnimationFrame(() => {
            progress.classList.remove('is-settling');
            paintGlide(indexFromScroll(), false);
            frame = 0;
          });
        }
      }
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settle, 80);
    };

    track.addEventListener('scroll', sync, { passive: true });
    track.addEventListener('scrollend', () => {
      clearTimeout(settleTimer);
      settle();
    }, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    measure();
    setActive(0);
    paintGlide(0, false);
  });
})();
