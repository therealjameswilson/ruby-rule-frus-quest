import type Phaser from 'phaser';

/** Report completed asset loading, then keep failures visible until an explicit retry. */
export function installBootProgress(scene: Phaser.Scene) {
  const loader = document.getElementById('boot-loader');
  const bar = document.getElementById('boot-loader-bar');
  const fill = bar?.querySelector('span');
  const message = document.getElementById('boot-loader-text');
  const retry = document.getElementById('boot-loader-retry');
  let failed = false;
  if (loader) loader.dataset.state = 'loading';
  const update = (value: number) => {
    if (failed) return;
    const percentage = Math.round(Math.min(1, Math.max(0, value)) * 100);
    bar?.setAttribute('aria-valuenow', String(percentage));
    if (fill) fill.style.width = `${percentage}%`;
  };
  update(0);
  scene.load.on('progress', update);
  scene.load.on('loaderror', () => {
    failed = true;
    if (loader) loader.dataset.state = 'error';
    if (message) message.textContent = 'The archive could not load. Check your connection and try again.';
    if (retry) retry.hidden = false;
  });
  scene.load.once('complete', () => {
    if (failed) return;
    update(1);
    if (message) message.textContent = 'Preparing your adventure…';
  });
  retry?.addEventListener('click', () => window.location.reload(), {once:true});
  return () => failed;
}
