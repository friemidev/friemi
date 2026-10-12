/* The result is chosen by the game. This renderer only plays its matching atlas. */
(() => {
  'use strict';
  const base = 'assets/dice-3d/';
  const revision = '?v=white-resin-v3';
  const readyFaces = new Set();
  const loadingFaces = new Set([1, 2, 3, 4, 5, 6]);
  const pending = new Map();
  const mountedFaces = new WeakMap();
  const owners = new WeakMap();
  const active = new Set();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  function setFrame(node, frame) {
    const value = Math.max(0, Math.min(31, Math.floor(frame)));
    if (node.dataset.frame === String(value)) return;
    node.dataset.frame = value;
    node.style.setProperty('--sprite-x', `${(value % 8) * 100 / 7}%`);
    node.style.setProperty('--sprite-y', `${Math.floor(value / 8) * 100 / 3}%`);
  }

  function attach(node, value) {
    if (mountedFaces.get(node) !== value) return;
    if (!node.classList.contains('sprite-ready')) {
      node.classList.add('sprite-ready');
      const frame = document.createElement('span');
      frame.className = 'sprite-frame';
      frame.setAttribute('aria-hidden', 'true');
      node.append(frame);
    }
    node.style.setProperty('--dice-atlas', `url("${base}roll-${value}.webp${revision}")`);
    // Decode may finish during a throw or while rAF is delayed. Join the current
    // timeline at its actual position; never restart a completed/cancelled roll.
    const owner = owners.get(node);
    if (owner) paint(owner.animation, node, owner.index, performance.now());
  }

  function mount(node, value) {
    if (!Number.isInteger(value) || value < 1 || value > 6) return;
    const previousValue = mountedFaces.get(node);
    if (previousValue !== undefined && previousValue !== value) {
      node.classList.remove('sprite-ready');
      node.style.removeProperty('--dice-atlas');
      for (const child of [...node.children]) {
        if (child.classList.contains('sprite-frame')) child.remove();
      }
      // Reused game dice retain their nine fallback pip slots. Keep those and
      // their readable label in sync while the replacement atlas is loading.
      const pips = [...node.children].filter(child => child.classList.contains('pip'));
      if (pips.length === 9) {
        const pattern = {1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]}[value];
        pips.forEach((pip, index) => pip.classList[pattern.includes(index) ? 'add' : 'remove']('on'));
        node.dataset.value = value;
        if (node.getAttribute('role') === 'img') node.setAttribute('aria-label', `${value} 点`);
      }
    }
    mountedFaces.set(node, value);
    owners.delete(node);
    rest(node);
    pending.delete(node);
    if (readyFaces.has(value)) attach(node, value);
    else if (loadingFaces.has(value)) pending.set(node, value);
  }

  const ready = Promise.allSettled(Array.from({length: 6}, (_, index) => {
    const value = index + 1;
    const image = new Image();
    image.src = `${base}roll-${value}.webp${revision}`;
    return image.decode().then(() => {
      readyFaces.add(value);
      for (const [node, requestedValue] of pending) {
        if (requestedValue === value) {
          attach(node, value);
          pending.delete(node);
        }
      }
    }).finally(() => {
      loadingFaces.delete(value);
      // A failed atlas stays on the readable pip fallback for this page. Do not
      // retain either existing or future dice in a queue that can never flush.
      for (const [node, requestedValue] of pending) {
        if (requestedValue === value) pending.delete(node);
      }
    });
  })).then(() => {
    pending.clear();
    document.documentElement.dataset.diceSprites = readyFaces.size === 6 ? 'ready' : 'fallback';
    return readyFaces.size === 6;
  });

  function animate(nodes, {duration = 1333, stagger = 28} = {}) {
    const dice = [...new Set(nodes)].filter(node => mountedFaces.has(node));
    if (!dice.length) return;
    dice.forEach(node => owners.delete(node));
    if (reduced.matches || document.hidden || !Number.isFinite(duration) || duration <= 0) {
      dice.forEach(rest);
      return;
    }
    if (!Number.isFinite(stagger) || stagger < 0) stagger = 0;
    const animation = {id: 0, dice, start: performance.now(), duration, stagger, cancelled: false};
    active.add(animation);
    dice.forEach((node, index) => {
      owners.set(node, {animation, index});
      node.classList.add('in-flight');
      paint(animation, node, index, animation.start);
    });
    const tick = now => {
      if (animation.cancelled) return;
      let complete = true;
      dice.forEach((node, index) => {
        if (owners.get(node)?.animation !== animation) return;
        const progress = paint(animation, node, index, now);
        if (progress < 1 && node.isConnected) complete = false;
      });
      if (complete || document.hidden) {
        stop(animation);
        active.delete(animation);
      } else animation.id = requestAnimationFrame(tick);
    };
    animation.id = requestAnimationFrame(tick);
  }

  function paint(animation, node, index, now) {
    const progress = Math.min(1, Math.max(0, (now - animation.start - index * animation.stagger) / animation.duration));
    if (progress >= 1 || document.hidden || reduced.matches) {
      rest(node);
      return 1;
    }
    setFrame(node, Math.floor(progress * 32));
    // The atlas supplies the actual 3D rotation; transforms only position it.
    const column = animation.dice.length === 6 ? index % 3 - 1 : index - (animation.dice.length - 1) / 2;
    const remaining = 1 - progress;
    const x = -column * 13 * remaining * remaining;
    const y = -24 * remaining * remaining - Math.sin(progress * Math.PI) * (14 + index % 3 * 4) * remaining;
    node.style.setProperty('--toss-x', `${x.toFixed(2)}px`);
    node.style.setProperty('--toss-y', `${y.toFixed(2)}px`);
    node.style.setProperty('--toss-scale', (1 - .08 * remaining * remaining).toFixed(3));
    return progress;
  }

  function rest(node) {
    setFrame(node, 31);
    node.classList.remove('in-flight');
    node.style.removeProperty('--toss-x');
    node.style.removeProperty('--toss-y');
    node.style.removeProperty('--toss-scale');
  }

  function stop(animation) {
    animation.cancelled = true;
    cancelAnimationFrame(animation.id);
    for (const node of animation.dice) {
      if (owners.get(node)?.animation !== animation) continue;
      rest(node);
      owners.delete(node);
    }
  }

  function finishAll() {
    for (const animation of active) stop(animation);
    active.clear();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) finishAll(); });
  reduced.addEventListener('change', () => { if (reduced.matches) finishAll(); });
  window.DiceSprites = {mount, animate, finishAll, ready};
})();
