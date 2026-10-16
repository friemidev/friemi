'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function node(connected = true) {
  const classes = new Set();
  const properties = new Map();
  const attributes = new Map();
  return {
    isConnected: connected,
    dataset: new Proxy({}, {set(target, key, value) { target[key] = String(value); return true; }}),
    children: [],
    get className() { return [...classes].join(' '); },
    set className(value) { classes.clear(); value.split(/\s+/).filter(Boolean).forEach(part => classes.add(part)); },
    classList: {
      add: (...values) => values.forEach(value => classes.add(value)),
      remove: (...values) => values.forEach(value => classes.delete(value)),
      contains: value => classes.has(value)
    },
    style: {
      setProperty: (name, value) => properties.set(name, value),
      removeProperty: name => properties.delete(name),
      getPropertyValue: name => properties.get(name) || ''
    },
    append(child) { this.children.push(child); child.parentNode = this; },
    remove() {
      if (this.parentNode) this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1);
      this.parentNode = null;
    },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) ?? null; }
  };
}

function harness() {
  let now = 0, id = 0;
  const frames = new Map();
  const strongMaps = [];
  const loaders = [];
  const documentEvents = new Map();
  const reducedEvents = new Map();
  const document = {
    hidden: false, documentElement: {dataset: {}}, createElement: () => node(),
    addEventListener: (event, callback) => documentEvents.set(event, callback)
  };
  const reduced = {
    matches: false, addEventListener: (event, callback) => reducedEvents.set(event, callback)
  };
  const context = {
    window: {}, document, matchMedia: () => reduced,
    Map: class extends Map { constructor(...args) { super(...args); strongMaps.push(this); } },
    performance: {now: () => now},
    requestAnimationFrame: callback => { frames.set(++id, callback); return id; },
    cancelAnimationFrame: frameId => frames.delete(frameId),
    Image: class {
      decode() { return new Promise((resolve, reject) => loaders.push({resolve, reject})); }
    }
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('./dice-sprites.js'), 'utf8'), context);
  return {
    api: context.window.DiceSprites, frames, document,
    retains: item => strongMaps.some(map => map.has(item)),
    time(value) { now = value; },
    step(value) {
      now = value;
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach(callback => callback(now));
    },
    async decode(face) { loaders[face - 1].resolve(); await new Promise(setImmediate); },
    async decodeAll() { loaders.forEach(loader => loader.resolve()); await context.window.DiceSprites.ready; },
    async fail(face) { loaders[face - 1].reject(new Error('Unavailable atlas')); await new Promise(setImmediate); },
    hide() { document.hidden = true; documentEvents.get('visibilitychange')(); },
    reduce() { reduced.matches = true; reducedEvents.get('change')(); }
  };
}

function atRest(die) {
  assert.equal(die.dataset.frame, '31');
  assert.equal(die.classList.contains('in-flight'), false);
  assert.equal(die.style.getPropertyValue('--toss-y'), '');
  assert.equal(die.style.getPropertyValue('--toss-scale'), '');
}

async function main() {
  let count = 0;
  async function check(name, run) { await run(); count++; console.log('PASS ' + name); }

  await check('a late-loading atlas joins the ongoing throw instead of jumping to its result', async () => {
    const h = harness(), die = node();
    h.api.mount(die, 3);
    h.api.animate([die], {duration: 1000, stagger: 0});
    h.step(500);
    assert.equal(die.classList.contains('sprite-ready'), false);
    await h.decode(3);
    assert.equal(die.classList.contains('sprite-ready'), true);
    assert.equal(die.dataset.frame, '16');
    h.step(800);
    assert.equal(die.dataset.frame, '25');
    h.step(1000);
    atRest(die);
    assert.equal(h.frames.size, 0);
  });

  await check('prepared detached dice attach after decoding; placeholders and invalid values stay untouched', async () => {
    const h = harness(), prepared = node(false), placeholder = node(), fractional = node();
    h.api.mount(prepared, 5); // The explicit value is sufficient; no data-value dependency.
    h.api.mount(placeholder, 0);
    h.api.mount(fractional, 2.5);
    await h.decode(5);
    prepared.isConnected = true;
    assert.equal(prepared.classList.contains('sprite-ready'), true);
    assert.match(prepared.style.getPropertyValue('--dice-atlas'), /roll-5\.webp/);
    atRest(prepared);
    h.api.animate([placeholder, fractional]);
    assert.equal(placeholder.children.length, 0);
    assert.equal(fractional.children.length, 0);
    assert.equal(h.frames.size, 0);
  });

  await check('remounting clears the old face, restores current pips and ignores obsolete decodes', async () => {
    const h = harness(), die = node();
    die.setAttribute('role', 'img');
    die.setAttribute('aria-label', '1 点');
    for (let index = 0; index < 9; index++) {
      const pip = node();
      pip.className = index === 4 ? 'pip on' : 'pip';
      die.append(pip);
    }
    await h.decode(1);
    h.api.mount(die, 1);
    assert.equal(die.classList.contains('sprite-ready'), true);
    h.api.mount(die, 4);
    assert.equal(die.classList.contains('sprite-ready'), false);
    assert.equal(die.style.getPropertyValue('--dice-atlas'), '');
    assert.equal(die.children.length, 9);
    assert.equal(die.children.filter(pip => pip.classList.contains('on')).length, 4);
    assert.equal(die.getAttribute('aria-label'), '4 点');
    h.api.mount(die, 6);
    await h.decode(4); // The superseded request must not put four back on screen.
    assert.equal(die.classList.contains('sprite-ready'), false);
    assert.equal(die.children.filter(pip => pip.classList.contains('on')).length, 6);
    await h.decode(6);
    assert.equal(die.classList.contains('sprite-ready'), true);
    assert.match(die.style.getPropertyValue('--dice-atlas'), /roll-6\.webp/);
    assert.equal(die.getAttribute('aria-label'), '6 点');
    assert.equal(die.children.filter(child => child.classList.contains('sprite-frame')).length, 1);
    atRest(die);
  });

  await check('decode after the elapsed roll displays only the final frame, even if rAF was delayed', async () => {
    const h = harness(), die = node();
    h.api.mount(die, 2);
    h.api.animate([die], {duration: 1000});
    h.time(2400);
    await h.decode(2);
    atRest(die);
    h.step(2500);
    atRest(die);
    assert.equal(h.frames.size, 0);
  });

  await check('finishAll prevents late decode and already-queued callbacks from reviving cancelled dice', async () => {
    const h = harness(), die = node();
    h.api.mount(die, 4);
    h.api.animate([die]);
    h.step(300);
    const staleCallback = [...h.frames.values()][0];
    h.api.finishAll();
    die.isConnected = false;
    staleCallback(400);
    await h.decode(4);
    die.isConnected = true;
    atRest(die);
    assert.equal(h.frames.size, 0);
  });

  await check('hidden pages and reduced motion settle pending dice without delayed animation', async () => {
    for (const stop of ['hide', 'reduce']) {
      const h = harness(), die = node();
      h.api.mount(die, 1);
      h.api.animate([die]);
      h.step(300);
      h[stop]();
      await h.decode(1);
      atRest(die);
      assert.equal(h.frames.size, 0);
      h.api.animate([die]);
      atRest(die);
      assert.equal(h.frames.size, 0);
    }
  });

  await check('restarting a die has one owner and invalid durations cannot leave an endless loop', async () => {
    const h = harness(), die = node();
    await h.decodeAll();
    h.api.mount(die, 6);
    h.api.animate([die], {duration: 1000});
    h.step(400);
    h.api.animate([die], {duration: 1000});
    h.step(500);
    assert.equal(die.dataset.frame, '3');
    h.step(1400);
    atRest(die);
    assert.equal(h.frames.size, 0);
    h.api.animate([die], {duration: -10});
    atRest(die);
    assert.equal(h.frames.size, 0);
  });

  await check('failed images preserve fallback dice and release the animation at its deadline', async () => {
    const h = harness(), die = node();
    h.api.mount(die, 3);
    h.api.animate([die], {duration: 1000});
    await h.fail(3);
    await h.decodeAll();
    h.step(1000);
    assert.equal(h.document.documentElement.dataset.diceSprites, 'fallback');
    assert.equal(die.classList.contains('sprite-ready'), false);
    assert.equal(die.children.length, 0);
    atRest(die);
    assert.equal(h.frames.size, 0);
  });

  await check('repeated fallback rolls do not retain detached dice after an atlas has failed', async () => {
    const h = harness();
    await h.fail(3);
    await h.decodeAll();
    for (let roll = 0; roll < 50; roll++) {
      const die = node();
      h.api.mount(die, 3);
      h.api.animate([die], {duration: 100});
      h.step((roll + 1) * 200);
      die.isConnected = false;
      assert.equal(h.retains(die), false, 'No future decode can release a queued failed-face die');
      assert.equal(die.classList.contains('sprite-ready'), false);
      atRest(die);
    }
  });

  console.log(`${count} Sprite race and lifecycle checks passed.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
