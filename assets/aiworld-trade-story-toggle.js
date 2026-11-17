(() => {
  const initialize = () => {
    document.querySelectorAll('.trade-story').forEach((story) => {
      if (story.querySelector('.trade-story__mobile-toggle')) return;

      const shortTitles = {
        'Navigation Made Easy': 'Navigation\nMade Easy',
        'Your Music, Your Way': 'Your Music,\nYour Way',
        'A Safer, More Connected Drive': 'A Safer, More\nConnected Drive',
      };
      story.querySelectorAll('.trade-story__point strong').forEach((title) => {
        const shortTitle = shortTitles[title.textContent.trim()];
        if (shortTitle) title.textContent = shortTitle;
      });

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'trade-story__mobile-toggle';
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Hide story details');
      toggle.innerHTML = '<span aria-hidden="true">−</span>';
      toggle.addEventListener('click', () => {
        const isHidden = story.classList.toggle('trade-story--copy-hidden');
        toggle.setAttribute('aria-expanded', String(!isHidden));
        toggle.setAttribute('aria-label', isHidden ? 'Show story details' : 'Hide story details');
        toggle.innerHTML = `<span aria-hidden="true">${isHidden ? '+' : '−'}</span>`;
      });
      story.append(toggle);
    });
  };

  document.addEventListener('DOMContentLoaded', initialize);
  document.addEventListener('shopify:section:load', initialize);
})();
