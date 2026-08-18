// Dev-only: Agentation visual feedback toolbar (https://agentation.com).
// Loads on localhost only, so the deployed site never includes it.
if (['localhost', '127.0.0.1'].includes(location.hostname)) {
  Promise.all([
    import('https://esm.sh/react@18.3.1'),
    import('https://esm.sh/react-dom@18.3.1/client?deps=react@18.3.1'),
    import('https://esm.sh/agentation@3.0.2?deps=react@18.3.1,react-dom@18.3.1'),
  ]).then(([React, { createRoot }, { Agentation }]) => {
    const host = document.createElement('div');
    host.id = 'agentation-root';
    document.body.appendChild(host);
    createRoot(host).render(React.createElement(Agentation));
  }).catch((e) => console.warn('Agentation failed to load:', e));
}
