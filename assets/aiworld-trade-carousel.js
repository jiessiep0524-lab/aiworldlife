(function () {
  function init(root) {
    if (!root || root.dataset.carouselReady === 'true') return;
    root.dataset.carouselReady = 'true';
    var slides = Array.prototype.slice.call(root.querySelectorAll('[data-slide-index]'));
    if (slides.length < 2) return;
    var dots = Array.prototype.slice.call(root.querySelectorAll('[data-carousel-dot]'));
    var index = 0;
    var timer;
    var speed = parseInt(root.dataset.speed || '5000', 10);
    var pause = root.dataset.pause === 'true';
    var visible = !('IntersectionObserver' in window);
    var hovered = false;
    var focused = false;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    function stop() { window.clearInterval(timer); }
    function show(next) {
      index = (next + slides.length) % slides.length;
      slides.forEach(function (slide, i) {
        var active = i === index;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', active ? 'false' : 'true');
      });
      dots.forEach(function (dot, i) { dot.setAttribute('aria-selected', i === index ? 'true' : 'false'); });
    }
    function start() {
      stop();
      if (root.dataset.autoplay !== 'true' || !visible || document.hidden || hovered || focused || reducedMotion.matches || !root.isConnected) return;
      timer = window.setInterval(function () { show(index + 1); }, speed);
    }
    root.querySelector('[data-carousel-prev]')?.addEventListener('click', function () { show(index - 1); start(); });
    root.querySelector('[data-carousel-next]')?.addEventListener('click', function () { show(index + 1); start(); });
    dots.forEach(function (dot) { dot.addEventListener('click', function () { show(parseInt(dot.dataset.carouselDot, 10)); start(); }); });
    if (pause) {
      root.addEventListener('mouseenter', function () { hovered = true; stop(); });
      root.addEventListener('mouseleave', function () { hovered = false; start(); });
      root.addEventListener('focusin', function () { focused = true; stop(); });
      root.addEventListener('focusout', function (event) { focused = root.contains(event.relatedTarget); start(); });
    }
    var observer;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        start();
      });
      observer.observe(root);
    }
    document.addEventListener('visibilitychange', start);
    reducedMotion.addEventListener('change', start);
    function unload(event) {
      if (!event.target.contains(root)) return;
      stop();
      if (observer) observer.disconnect();
      document.removeEventListener('visibilitychange', start);
      reducedMotion.removeEventListener('change', start);
      document.removeEventListener('shopify:section:unload', unload);
    }
    document.addEventListener('shopify:section:unload', unload);
    start();
  }
  function scan() { document.querySelectorAll('[data-trade-carousel]').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan);
  else scan();
  document.addEventListener('shopify:section:load', scan);
})();
