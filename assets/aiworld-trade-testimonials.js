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
      window.clearInterval(timer);
      if (autoplay && slides.length > 1) timer = window.setInterval(function () { show(index + 1); }, speed);
    }
    var previousButton = root.querySelector('[data-testimonial-prev]');
    var nextButton = root.querySelector('[data-testimonial-next]');
    if (previousButton) previousButton.addEventListener('click', function () { show(index - 1); start(); });
    if (nextButton) nextButton.addEventListener('click', function () { show(index + 1); start(); });
    dots.forEach(function (dot) { dot.addEventListener('click', function () { show(parseInt(dot.dataset.testimonialDot, 10)); start(); }); });
    if (pause) {
      root.addEventListener('mouseenter', function () { window.clearInterval(timer); });
      root.addEventListener('mouseleave', start);
      root.addEventListener('focusin', function () { window.clearInterval(timer); });
      root.addEventListener('focusout', start);
    }
    show(0);
    start();
  }
  function scan() { document.querySelectorAll('[data-testimonial-carousel]').forEach(init); }
  document.addEventListener('DOMContentLoaded', scan);
  document.addEventListener('shopify:section:load', scan);
})();
