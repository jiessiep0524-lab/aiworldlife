(function () {
  function init(root) {
    if (!root || root.dataset.testimonialReady === 'true') return;
    root.dataset.testimonialReady = 'true';
    var slides = Array.prototype.slice.call(root.querySelectorAll('[data-testimonial-slide]'));
    if (!slides.length) return;
    var dots = Array.prototype.slice.call(root.querySelectorAll('[data-testimonial-dot]'));
    var index = 0;
    var timer;
    var speed = parseInt(root.dataset.speed || '5000', 10);
    var autoplay = root.dataset.autoplay === 'true';
    var pause = root.dataset.pause === 'true';
    var visible = !('IntersectionObserver' in window);
    var hovered = false;
    var focused = false;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    function stop() { window.clearInterval(timer); }
    function show(next) {
      index = (next + slides.length) % slides.length;
      slides.forEach(function (slide, i) {
        var previous = i === (index - 1 + slides.length) % slides.length;
        var following = i === (index + 1) % slides.length;
        var active = i === index;
        slide.classList.toggle('is-active', active);
        slide.classList.toggle('is-prev', previous);
        slide.classList.toggle('is-next', following);
        slide.setAttribute('aria-hidden', active ? 'false' : 'true');
      });
      dots.forEach(function (dot, i) { dot.setAttribute('aria-selected', i === index ? 'true' : 'false'); });
    }
    function start() {
      stop();
      if (autoplay && slides.length > 1 && visible && !document.hidden && !hovered && !focused && !reducedMotion.matches && root.isConnected) timer = window.setInterval(function () { show(index + 1); }, speed);
    }
    var previousButton = root.querySelector('[data-testimonial-prev]');
    var nextButton = root.querySelector('[data-testimonial-next]');
    if (previousButton) previousButton.addEventListener('click', function () { show(index - 1); start(); });
    if (nextButton) nextButton.addEventListener('click', function () { show(index + 1); start(); });
    dots.forEach(function (dot) { dot.addEventListener('click', function () { show(parseInt(dot.dataset.testimonialDot, 10)); start(); }); });
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
    show(0);
    start();
  }
  function scan() { document.querySelectorAll('[data-testimonial-carousel]').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan);
  else scan();
  document.addEventListener('shopify:section:load', scan);
})();
