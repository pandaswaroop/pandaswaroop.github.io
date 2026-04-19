(function () {
  const NAMESPACE = 'pandaswaroop-github-io';
  const KEY = 'visits';

  fetch(`https://api.countapi.xyz/hit/${NAMESPACE}/${KEY}`)
    .then(res => res.json())
    .then(data => {
      console.log(`%cVisitor #${data.value}`, 'color: #888; font-size: 11px;');

      // Show badge only when ?admin is in the URL (private)
      if (new URLSearchParams(window.location.search).has('admin')) {
        const badge = document.createElement('div');
        badge.style.cssText = [
          'position:fixed', 'bottom:14px', 'right:14px',
          'background:#1b1b1b', 'color:#d8e3e1',
          'padding:6px 12px', 'border-radius:20px',
          'font-size:13px', 'font-family:monospace',
          'opacity:0.85', 'z-index:9999',
          'box-shadow:0 2px 8px rgba(0,0,0,.25)',
          'cursor:default', 'user-select:none'
        ].join(';');
        badge.textContent = `👁 ${data.value.toLocaleString()} visits`;
        document.body.appendChild(badge);
      }
    })
    .catch(() => {});
})();
