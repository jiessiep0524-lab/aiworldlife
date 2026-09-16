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
      if (root.dataset.autoplay !== 'true') return;
      window.clearInterval(timer);
      timer = window.setInterval(function () { show(index + 1); }, speed);
    }
    root.querySelector('[data-carousel-prev]')?.addEventListener('click', function () { show(index - 1); start(); });
    root.querySelector('[data-carousel-next]')?.addEventListener('click', function () { show(index + 1); start(); });
    dots.forEach(function (dot) { dot.addEventListener('click', function () { show(parseInt(dot.dataset.carouselDot, 10)); start(); }); });
    if (pause) {
      root.addEventListener('mouseenter', function () { window.clearInterval(timer); });
      root.addEventListener('mouseleave', start);
      root.addEventListener('focusin', function () { window.clearInterval(timer); });
      root.addEventListener('focusout', start);
    }
    start();
  }
  function scan() { document.querySelectorAll('[data-trade-carousel]').forEach(init); }
  document.addEventListener('DOMContentLoaded', scan);
  document.addEventListener('shopify:section:load', scan);
})();
