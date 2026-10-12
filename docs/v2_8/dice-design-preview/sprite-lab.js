(() => {
  'use strict';

  const FRAME_COUNT = 32;
  const FRAME_MS = 1000 / 24;
  const STAGGER_MS = 40;
  const LAST_FRAME_MS = (FRAME_COUNT - 1) * FRAME_MS;
  const RESOURCE_TIMEOUT_MS = 12000;
  const BASE_PATH = 'assets/dice-3d/';
  const ASSET_REVISION = '?v=gloss-v2';
  const clips = {
    roll: { frames: 32, columns: 8, rows: 4, loop: false, hasIdle: true },
    spin: { frames: 32, columns: 8, rows: 4, loop: true, hasIdle: false },
    wobble: { frames: 12, columns: 6, rows: 2, loop: false, hasIdle: true },
  };
  const phases = [
    { until: 11, label: '高速翻滚', note: '转个身，好运正在酝酿' },
    { until: 22, label: '减速', note: '慢下来，找准落点' },
    { until: 28, label: '轻弹', note: '碰一下桌面，再轻轻落下' },
    { until: 31, label: '停稳', note: '这一面，落得刚刚好' },
  ];
  const pipPositions = {
    1: [[12, 12]],
    2: [[7, 7], [17, 17]],
    3: [[7, 7], [12, 12], [17, 17]],
    4: [[7, 7], [17, 7], [7, 17], [17, 17]],
    5: [[7, 7], [17, 7], [12, 12], [7, 17], [17, 17]],
    6: [[7, 6], [17, 6], [7, 12], [17, 12], [7, 18], [17, 18]],
  };

  const ui = {
    stage: document.getElementById('stage'),
    diceField: document.getElementById('dice-field'),
    stageMode: document.getElementById('stage-mode'),
    caption: document.getElementById('stage-caption'),
    faceButtons: document.getElementById('face-buttons'),
    play: document.getElementById('play-button'),
    playLabel: document.getElementById('play-label'),
    playIcon: document.getElementById('play-icon'),
    replay: document.getElementById('replay-button'),
    slider: document.getElementById('frame-slider'),
    frameReadout: document.getElementById('frame-readout'),
    phaseLabel: document.getElementById('phase-label'),
    phaseNote: document.getElementById('phase-note'),
    resourceStatus: document.getElementById('resource-status'),
    resourceMessage: document.getElementById('resource-message'),
    retry: document.getElementById('retry-button'),
    motionNote: document.getElementById('motion-note'),
    playbackStatus: document.getElementById('playback-status'),
    actionHint: document.getElementById('action-hint'),
    controlNote: document.getElementById('control-note'),
    sequenceSpec: document.getElementById('sequence-spec'),
  };
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const assets = new Map(Array.from({ length: 6 }, (_, i) => [i + 1, {
    status: 'loading', sheet: null, idle: null, error: '', attempt: 0,
  }]));
  for (const action of ['spin', 'wobble']) {
    assets.set(action, { status: 'loading', sheet: null, idle: null, error: '', attempt: 0 });
  }
  const state = {
    action: 'roll',
    face: 1,
    mode: 'single',
    speed: 1,
    playhead: LAST_FRAME_MS,
    playing: false,
    previousTick: null,
    rafId: 0,
    slots: [],
    pendingPlay: !motionPreference.matches,
    reducedMotion: motionPreference.matches,
  };

  function faceSvg(face) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" />${pipPositions[face].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="currentColor" stroke="none" />`).join('')}</svg>`;
  }

  function activeFaces() {
    if (state.action !== 'roll') return [state.action];
    return state.mode === 'group' ? [1, 2, 3, 4, 5, 6] : [state.face];
  }

  function selectedTrack() {
    return state.action === 'roll' ? state.face : state.action;
  }

  function clip() {
    return clips[state.action];
  }

  function trackName(track) {
    return typeof track === 'number' ? `${track} 点` : track === 'spin' ? '循环旋转' : '停稳轻摆';
  }

  function lastFrameTime() {
    return (clip().frames - 1) * FRAME_MS + (state.mode === 'group' ? STAGGER_MS * 5 : 0);
  }

  function duration() {
    return clip().frames * FRAME_MS + (state.mode === 'group' ? STAGGER_MS * 5 : 0);
  }

  function allActiveReady() {
    return activeFaces().every((face) => assets.get(face).status === 'ready');
  }

  function getFrame(face) {
    const offset = state.mode === 'group' ? (face - 1) * STAGGER_MS : 0;
    return Math.max(0, Math.min(clip().frames - 1, Math.floor((state.playhead - offset + 0.001) / FRAME_MS)));
  }

  function getPhase(frame) {
    if (state.action === 'spin') return 0;
    if (state.action === 'wobble') return frame === 11 ? 3 : 2;
    return phases.findIndex((phase) => frame <= phase.until);
  }

  function phaseInfo(frame) {
    if (state.action === 'spin') return { label: '循环旋转', note: '这一段只旋转，没有最终落点' };
    if (state.action === 'wobble' && frame < 11) return { label: '停稳轻摆', note: '轻轻晃一晃，固定回到 1 点' };
    return phases[getPhase(frame)];
  }

  function announce(message) {
    ui.playbackStatus.textContent = message;
  }

  function makeSlots() {
    ui.diceField.replaceChildren();
    ui.diceField.classList.toggle('is-group', state.mode === 'group');
    state.slots = activeFaces().map((face) => {
      const slot = document.createElement('div');
      slot.className = 'sprite-slot';
      slot.dataset.face = String(face);
      slot.innerHTML = `<div class="sprite" role="img" aria-label="${trackName(face)}骰子动作"></div><div class="sprite-placeholder">${faceSvg(typeof face === 'number' ? face : 1)}<span>正在加载</span></div><span class="slot-label"></span>`;
      ui.diceField.append(slot);
      return {
        face,
        element: slot,
        sprite: slot.querySelector('.sprite'),
        placeholder: slot.querySelector('.sprite-placeholder span'),
        label: slot.querySelector('.slot-label'),
        drawnFrame: -1,
        drawnIdle: null,
        drawnSource: '',
      };
    });
    ui.stageMode.textContent = state.action !== 'roll' ? trackName(state.action) : state.mode === 'group' ? '六颗一起，热闹一点' : '一颗，仔细看';
    ui.slider.max = String(Math.ceil(lastFrameTime() / FRAME_MS));
    ui.sequenceSpec.textContent = `${clip().frames} 帧 · 24 fps · 透明 3D 动作序列`;
    ui.actionHint.hidden = state.action === 'roll';
    ui.actionHint.textContent = state.action === 'spin' ? '仅展示循环转动，没有落点；点数与六骰选择暂不可用。' : '这段轻摆固定回到 1 点，点数与六骰选择暂不可用。';
    ui.controlNote.textContent = state.action === 'spin' ? '这段会循环播放。拖动或点暂停，就停在你想看的那一帧。' : state.action === 'wobble' ? '12 帧轻摆，最后回到 1 点。拖动即可逐帧检查。' : '拖动就会暂停，松手停在那一帧。六骰模式下，帧数跟随你选中的点数。';
    document.querySelector('.timeline-ticks span:first-child').textContent = state.action === 'spin' ? '开始旋转' : state.action === 'wobble' ? '轻轻倾斜' : '开始翻滚';
    document.querySelector('.timeline-ticks span:last-child').textContent = state.action === 'spin' ? '循环末帧' : '落得稳稳的';
    document.querySelector('.motion-story').hidden = state.action !== 'roll';
    for (const button of ui.faceButtons.children) {
      button.disabled = state.action !== 'roll';
      const selected = state.action === 'roll' ? Number(button.dataset.face) === state.face : state.action === 'wobble' && Number(button.dataset.face) === 1;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
    for (const button of document.querySelectorAll('[data-mode]')) {
      button.disabled = state.action !== 'roll';
      button.classList.toggle('is-selected', button.dataset.mode === state.mode);
      button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode));
    }
    updateResourceState();
    draw();
  }

  function draw() {
    for (const slot of state.slots) {
      const asset = assets.get(slot.face);
      slot.element.classList.toggle('is-ready', asset.status === 'ready');
      slot.element.classList.toggle('is-selected', slot.face === selectedTrack());
      slot.placeholder.textContent = asset.status === 'error' ? '没加载好' : '正在加载';
      const frame = getFrame(slot.face);
      const idle = clip().hasIdle && frame === clip().frames - 1;
      if (asset.status === 'ready') {
        const source = idle ? asset.idle.src : asset.sheet.src;
        if (slot.drawnSource !== source) {
          slot.sprite.style.backgroundImage = `url("${source}")`;
          slot.drawnSource = source;
        }
        if (slot.drawnIdle !== idle) {
          slot.sprite.classList.toggle('is-idle', idle);
          slot.sprite.style.backgroundSize = idle ? '100% 100%' : `${clip().columns * 100}% ${clip().rows * 100}%`;
          slot.drawnIdle = idle;
        }
        if (slot.drawnFrame !== frame) {
          const column = frame % clip().columns;
          const row = Math.floor(frame / clip().columns);
          slot.sprite.style.backgroundPosition = `${column * 100 / (clip().columns - 1)}% ${row * 100 / (clip().rows - 1)}%`;
          slot.drawnFrame = frame;
          slot.sprite.setAttribute('aria-label', `${trackName(slot.face)}骰子，第 ${frame + 1} 帧，${phaseInfo(frame).label}`);
        }
      }
      const label = `${trackName(slot.face)} · ${asset.status === 'ready' ? `帧 ${String(frame + 1).padStart(2, '0')}` : '未就绪'}`;
      if (slot.label.textContent !== label) slot.label.textContent = label;
    }

    const frame = getFrame(selectedTrack());
    const phaseIndex = getPhase(frame);
    const phase = phaseInfo(frame);
    const ready = allActiveReady();
    ui.frameReadout.textContent = `${state.mode === 'group' ? `${state.face} 点 · ` : ''}${frame + 1} / ${clip().frames} 帧`;
    ui.phaseLabel.textContent = phase.label;
    ui.phaseNote.textContent = ready ? phase.note : '动作资源就绪后可播放';
    ui.slider.value = String(Math.round(Math.min(state.playhead, lastFrameTime()) / FRAME_MS));
    ui.slider.style.setProperty('--progress', `${Math.min(100, state.playhead / lastFrameTime() * 100)}%`);
    ui.slider.setAttribute('aria-valuetext', `${state.mode === 'group' ? `${state.face} 点骰子，` : ''}第 ${frame + 1} 帧，${phase.label}`);
    for (const item of document.querySelectorAll('[data-phase]')) {
      item.classList.toggle('is-current', Number(item.dataset.phase) === phaseIndex);
    }
    ui.playIcon.setAttribute('href', state.playing ? '#icon-pause' : '#icon-play');
    ui.playLabel.textContent = !ready ? (activeFaces().some((face) => assets.get(face).status === 'error') ? '等骰子就位' : '正在加载') : state.playing ? '暂停一下' : state.playhead >= lastFrameTime() ? '播放动作' : '继续播放';
    ui.caption.textContent = !ready ? (activeFaces().some((face) => assets.get(face).status === 'error') ? '这一段暂时没加载好，重试一下' : '骰子正在来桌上的路上') : state.playing ? '好运，转起来了' : state.action === 'spin' ? '这一刻的旋转，也值得看看' : state.playhead >= lastFrameTime() ? '落好了，再摇一遍？' : '停在这一刻，仔细看看';
  }

  function tick(now) {
    if (!state.playing) return;
    if (state.previousTick !== null) {
      state.playhead += (now - state.previousTick) * state.speed;
    }
    state.previousTick = now;
    if (state.playhead >= duration()) {
      if (clip().loop) {
        state.playhead %= duration();
        draw();
        state.rafId = requestAnimationFrame(tick);
        return;
      }
      state.playhead = duration();
      state.playing = false;
      state.previousTick = null;
      state.rafId = 0;
      draw();
      announce(state.mode === 'group' ? '六颗骰子都停稳了。' : `${trackName(selectedTrack())}骰子停稳了。`);
      return;
    }
    draw();
    state.rafId = requestAnimationFrame(tick);
  }

  function pause(shouldAnnounce = true) {
    state.pendingPlay = false;
    state.playing = false;
    state.previousTick = null;
    cancelAnimationFrame(state.rafId);
    state.rafId = 0;
    draw();
    if (shouldAnnounce) announce(`已暂停，选中骰子在第 ${getFrame(selectedTrack()) + 1} 帧。`);
  }

  function play(restart = false) {
    if (!allActiveReady()) {
      state.pendingPlay = true;
      return;
    }
    cancelAnimationFrame(state.rafId);
    state.pendingPlay = false;
    if (restart || state.playhead >= lastFrameTime()) state.playhead = 0;
    state.playing = true;
    state.previousTick = null;
    draw();
    state.rafId = requestAnimationFrame(tick);
    announce(state.mode === 'group' ? '六颗骰子开始错峰播放，可随时暂停。' : `开始播放${trackName(selectedTrack())}动作，可随时暂停。`);
  }

  function updateResourceState() {
    const faces = activeFaces();
    const ready = faces.filter((face) => assets.get(face).status === 'ready');
    const failed = faces.filter((face) => assets.get(face).status === 'error');
    const loading = faces.filter((face) => assets.get(face).status === 'loading');
    const complete = ready.length === faces.length;
    ui.stage.setAttribute('aria-busy', String(loading.length > 0));
    ui.resourceStatus.dataset.state = failed.length ? 'error' : complete ? 'ready' : 'loading';
    ui.retry.hidden = failed.length === 0;
    ui.retry.disabled = false;
    ui.play.disabled = !complete;
    ui.replay.disabled = !complete;
    ui.slider.disabled = !complete;
    if (failed.length) {
      ui.resourceMessage.textContent = `${failed.map(trackName).join('、')}动作还没加载好。资源可能尚未就绪，点「再试一次」重新加载。`;
    } else if (complete) {
      ui.resourceMessage.textContent = state.mode === 'group' ? '六面动作已就位 · 每颗错开 40ms 起播' : `${trackName(selectedTrack())}动作已就位 · 可播放，也可逐帧查看`;
    } else {
      ui.resourceMessage.textContent = state.mode === 'group' ? `正在加载六面动作 · ${ready.length} / 6 已就位` : `正在加载${trackName(selectedTrack())}画面…`;
    }
    for (const button of ui.faceButtons.children) {
      button.dataset.loading = assets.get(Number(button.dataset.face)).status;
    }
    draw();
    if (complete && state.pendingPlay && !document.hidden) play(true);
  }

  function loadImage(path, width, height, attempt) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      let finished = false;
      const timer = window.setTimeout(() => finish(new Error('图片加载超时')), RESOURCE_TIMEOUT_MS);
      function finish(error) {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        image.onload = null;
        image.onerror = null;
        if (error) reject(error);
        else resolve(image);
      }
      image.onload = async () => {
        if (image.naturalWidth !== width || image.naturalHeight !== height) {
          finish(new Error(`动作图片尺寸应为 ${width}×${height}`));
          return;
        }
        try {
          if (image.decode) await image.decode();
          finish();
        } catch {
          finish(new Error('图片无法解码'));
        }
      };
      image.onerror = () => finish(new Error('动作图片不可用'));
      image.src = `${path}${attempt > 1 ? `${path.includes('?') ? '&' : '?'}retry=${attempt}-${Date.now()}` : ''}`;
    });
  }

  async function loadFace(face) {
    const asset = assets.get(face);
    const sequence = clips[typeof face === 'number' ? 'roll' : face];
    const sheetName = typeof face === 'number' ? `roll-${face}.webp` : `${face}-${sequence.frames}.webp`;
    const idleName = typeof face === 'number' ? `idle-${face}.png` : 'idle-1.png';
    const attempt = ++asset.attempt;
    asset.status = 'loading';
    asset.error = '';
    updateResourceState();
    try {
      const [sheet, idle] = await Promise.all([
        loadImage(`${BASE_PATH}${sheetName}${ASSET_REVISION}`, 160 * sequence.columns, 160 * sequence.rows, attempt),
        sequence.hasIdle ? loadImage(`${BASE_PATH}${idleName}${ASSET_REVISION}`, 160, 160, attempt) : Promise.resolve(null),
      ]);
      if (attempt !== asset.attempt) return;
      asset.sheet = sheet;
      asset.idle = idle;
      asset.status = 'ready';
    } catch (error) {
      if (attempt !== asset.attempt) return;
      asset.status = 'error';
      asset.error = error.message;
    }
    updateResourceState();
  }

  for (const button of document.querySelectorAll('[data-action]')) {
    button.addEventListener('click', () => {
      if (state.action === button.dataset.action) return;
      pause(false);
      state.action = button.dataset.action;
      state.mode = 'single';
      state.playhead = state.reducedMotion ? lastFrameTime() : 0;
      state.pendingPlay = !state.reducedMotion;
      for (const item of document.querySelectorAll('[data-action]')) {
        item.classList.toggle('is-selected', item === button);
        item.setAttribute('aria-pressed', String(item === button));
      }
      makeSlots();
    });
  }

  for (let face = 1; face <= 6; face += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `face-button${face === state.face ? ' is-selected' : ''}`;
    button.dataset.face = String(face);
    button.setAttribute('aria-label', `选择 ${face} 点朝上的动作`);
    button.setAttribute('aria-pressed', String(face === state.face));
    button.innerHTML = `${faceSvg(face)}<span>${face} 点</span>`;
    button.addEventListener('click', () => {
      const wasGroup = state.mode === 'group';
      if (!wasGroup) pause(false);
      state.face = face;
      for (const item of ui.faceButtons.children) {
        item.classList.toggle('is-selected', item === button);
        item.setAttribute('aria-pressed', String(item === button));
      }
      if (wasGroup) {
        draw();
        announce(`正在查看 ${face} 点骰子的帧数。`);
        return;
      }
      state.playhead = state.reducedMotion ? duration() : 0;
      state.pendingPlay = !state.reducedMotion;
      makeSlots();
      announce(`已选择 ${face} 点朝上的动作。`);
    });
    ui.faceButtons.append(button);
  }

  for (const button of document.querySelectorAll('[data-mode]')) {
    button.addEventListener('click', () => {
      if (state.mode === button.dataset.mode) return;
      pause(false);
      state.mode = button.dataset.mode;
      state.playhead = state.reducedMotion ? duration() : 0;
      state.pendingPlay = !state.reducedMotion;
      for (const item of document.querySelectorAll('[data-mode]')) {
        item.classList.toggle('is-selected', item === button);
        item.setAttribute('aria-pressed', String(item === button));
      }
      makeSlots();
    });
  }

  for (const button of document.querySelectorAll('button[data-background]')) {
    button.addEventListener('click', () => {
      ui.stage.dataset.background = button.dataset.background;
      for (const item of document.querySelectorAll('button[data-background]')) {
        item.classList.toggle('is-selected', item === button);
        item.setAttribute('aria-pressed', String(item === button));
      }
    });
  }

  for (const button of document.querySelectorAll('[data-speed]')) {
    button.addEventListener('click', () => {
      state.speed = Number(button.dataset.speed);
      state.previousTick = null;
      for (const item of document.querySelectorAll('[data-speed]')) {
        item.classList.toggle('is-selected', item === button);
        item.setAttribute('aria-pressed', String(item === button));
      }
      announce(`播放速度已调整为 ${state.speed} 倍。`);
    });
  }

  ui.play.addEventListener('click', () => state.playing ? pause() : play());
  ui.replay.addEventListener('click', () => play(true));
  ui.slider.addEventListener('pointerdown', () => pause(false));
  ui.slider.addEventListener('input', () => {
    const requestedFrame = Number(ui.slider.value);
    pause(false);
    state.playhead = Math.min(duration(), requestedFrame * FRAME_MS);
    draw();
  });
  ui.slider.addEventListener('change', () => announce(`停在第 ${getFrame(selectedTrack()) + 1} 帧，${phaseInfo(getFrame(selectedTrack())).label}。`));
  ui.retry.addEventListener('click', () => {
    const failed = activeFaces().filter((face) => assets.get(face).status === 'error');
    for (const face of failed) void loadFace(face);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && (state.playing || state.pendingPlay)) pause(false);
  });
  window.addEventListener('pagehide', () => pause(false));
  motionPreference.addEventListener('change', (event) => {
    state.reducedMotion = event.matches;
    ui.motionNote.hidden = !event.matches;
    if (event.matches) {
      pause(false);
      state.playhead = lastFrameTime();
      draw();
      announce('已减少动态效果，骰子停在最后一帧。仍可手动播放。');
    }
  });

  ui.motionNote.hidden = !state.reducedMotion;
  makeSlots();
  for (let face = 1; face <= 6; face += 1) void loadFace(face);
  for (const action of ['spin', 'wobble']) void loadFace(action);
})();
