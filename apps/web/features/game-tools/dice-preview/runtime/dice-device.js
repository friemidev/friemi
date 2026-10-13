// Shared by the standalone roller and the online room. Motion is only an input;
// it never supplies dice values or changes the room's rules.
export function createShakeDetector() {
  let previous = null, lastSample = -Infinity, peak = null, peaks = 0, lastPeak = -Infinity, lastRoll = -Infinity;
  const vector = (value) => value && [value.x, value.y, value.z].every(Number.isFinite)
    ? [value.x, value.y, value.z] : null;
  function reset() { previous = null; lastSample = -Infinity; peak = null; peaks = 0; lastPeak = -Infinity; }
  return {
    reset,
    feed(event, now) {
      const linear = vector(event.acceleration), gravity = vector(event.accelerationIncludingGravity);
      let sample = linear;
      if (!sample && gravity) {
        // Estimate gravity over time. Adjacent-sample subtraction misses gentle
        // shakes on high-frequency sensors that do not expose linear acceleration.
        sample = previous && now - lastSample < 250 ? gravity.map((value, axis) => value - previous[axis]) : null;
        const weight = Math.exp(-Math.max(1, now - lastSample) / 400);
        previous = sample ? gravity.map((value, axis) => previous[axis] * weight + value * (1 - weight)) : gravity;
        lastSample = now;
      }
      if (!sample || !Number.isFinite(now)) return false;
      const strength = Math.hypot(...sample);
      if (now - lastPeak > 850) { peak = null; peaks = 0; }
      // A deliberate back-and-forth burst, rather than a lift, tilt or walking.
      if (strength < (linear ? 11 : 12) || now - lastPeak < 80 || now - lastRoll < 1400) return false;
      if (peak && sample.reduce((sum, value, axis) => sum + value * peak[axis], 0) / (strength * Math.hypot(...peak)) > -.25) return false;
      peak = sample; lastPeak = now; peaks += 1;
      if (peaks < 3) return false;
      lastRoll = now; reset(); return true;
    },
    hasReading(event) { return Boolean(vector(event.acceleration) || vector(event.accelerationIncludingGravity)); },
  };
}

export function createMotionRoller({ canRoll, onRoll, onState, host = window }) {
  const detector = createShakeDetector(), doc = host.document;
  let state = 'off', generation = 0, listening = false, disposed = false, watchdog;
  const update = (next) => { state = next; if (!disposed) onState(next); };
  const clearWatchdog = () => { host.clearTimeout(watchdog); watchdog = undefined; };
  const detach = () => {
    clearWatchdog(); detector.reset(); listening = false;
    host.removeEventListener('devicemotion', onMotion);
    host.removeEventListener('orientationchange', detector.reset);
    host.screen?.orientation?.removeEventListener('change', detector.reset);
    doc.removeEventListener('visibilitychange', onVisibility);
  };
  function watchForSensor() {
    clearWatchdog();
    if (doc.hidden || state !== 'waiting') return;
    watchdog = host.setTimeout(() => { detach(); update('unavailable'); }, 4000);
  }
  function onVisibility() {
    detector.reset(); clearWatchdog();
    if (!doc.hidden && listening) { update('waiting'); watchForSensor(); }
  }
  function onMotion(event) {
    if (doc.hidden || !listening) { detector.reset(); return; }
    if (state === 'waiting' && detector.hasReading(event)) { clearWatchdog(); update('on'); }
    if (!canRoll()) { detector.reset(); return; }
    if (detector.feed(event, host.performance.now())) onRoll();
  }
  return {
    get state() { return state; },
    async enable() {
      if (disposed) return false;
      if (listening || state === 'requesting') return listening;
      const current = ++generation;
      const Motion = host.DeviceMotionEvent;
      const policy = doc.permissionsPolicy || doc.featurePolicy;
      if (!host.isSecureContext || !Motion || (policy && ['accelerometer', 'gyroscope'].some((feature) => !policy.allowsFeature(feature)))) {
        update('unsupported'); return false;
      }
      update('requesting');
      try {
        // Invoke before any await: Safari requires the original button gesture.
        if (typeof Motion.requestPermission === 'function' && await Motion.requestPermission() !== 'granted') {
          if (!disposed && current === generation) update('denied');
          return false;
        }
      } catch {
        if (!disposed && current === generation) update('denied');
        return false;
      }
      if (disposed || current !== generation) return false;
      listening = true; detector.reset();
      host.addEventListener('devicemotion', onMotion, { passive: true });
      host.addEventListener('orientationchange', detector.reset);
      host.screen?.orientation?.addEventListener('change', detector.reset);
      doc.addEventListener('visibilitychange', onVisibility);
      update('waiting'); watchForSensor(); return true;
    },
    disable() { generation += 1; detach(); update('off'); },
    reset() { detector.reset(); },
    destroy() { generation += 1; detach(); disposed = true; },
  };
}

export function createDiceAudio(host = window) {
  let context, enabled = false, generation = 0, playbackGeneration = 0, samples;
  const now = () => host.performance?.now() ?? Date.now();
  const voices = new Set();
  function stop() {
    playbackGeneration += 1;
    for (const voice of voices) { try { voice.stop(); } catch { /* Already ended. */ } }
    voices.clear();
  }
  function makeSamples() {
    return Array.from({ length: 6 }, (_, variant) => {
      const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * .11), context.sampleRate);
      const data = buffer.getChannelData(0);
      let previousNoise = 0;
      for (let i = 0; i < data.length; i += 1) {
        const t = i / context.sampleRate, noise = Math.random() * 2 - 1;
        const click = (noise - .7 * previousNoise) * Math.exp(-t * 125);
        const shell = (Math.sin(t * Math.PI * 2 * (1650 + variant * 137)) * .3 + Math.sin(t * Math.PI * 2 * (3100 + variant * 91)) * .16) * Math.exp(-t * 83);
        const body = Math.sin(t * Math.PI * 2 * (430 + variant * 29)) * .2 * Math.exp(-t * 52);
        data[i] = (click * .44 + shell + body) * Math.min(1, i / 12) * .48;
        previousNoise = noise;
      }
      return buffer;
    });
  }
  function collision(delay, volume, pitch = 1) {
    const source = context.createBufferSource(), gain = context.createGain();
    source.buffer = samples[Math.floor(Math.random() * samples.length)];
    source.playbackRate.value = pitch; gain.gain.value = volume;
    source.connect(gain); gain.connect(context.destination); voices.add(source);
    source.onended = () => { voices.delete(source); source.disconnect(); gain.disconnect(); };
    source.start(context.currentTime + delay);
  }
  return {
    get context() { return context; },
    async enable() {
      const current = ++generation;
      try {
        const Context = host.AudioContext || host.webkitAudioContext;
        if (!Context) return false;
        context ??= new Context();
        samples ??= makeSamples();
        // Resume in the switch/button gesture, never in a sensor callback.
        await context.resume();
        if (current !== generation) return false;
        enabled = context.state === 'running'; return enabled;
      } catch { if (current === generation) enabled = false; return false; }
    },
    async roll(duration = 1800, count = 5) {
      if (!enabled || host.document.hidden) return 'canceled';
      if (!context || context.state === 'closed') return 'blocked';
      stop();
      const operation = playbackGeneration, permission = generation, startedAt = now();
      const seconds = Math.max(.1, duration / 1000), scale = seconds / 1.8;
      const current = () => enabled && !host.document.hidden && operation === playbackGeneration && permission === generation;
      let elapsed = 0;
      try {
        // Phones may interrupt an already-unlocked context while in the background.
        // A button roll invokes resume in its gesture; sensor rolls reuse the earlier
        // sound permission. Never replay this sound after mute, navigation or a new roll.
        if (context.state !== 'running') { await context.resume(); elapsed = Math.max(0, now() - startedAt) / 1000; }
        if (!current() || elapsed >= seconds) return 'canceled';
        if (context.state !== 'running') return 'blocked';
        const play = (delay, volume, pitch) => { if (delay >= elapsed) collision(delay - elapsed, volume, pitch); };
        // Uneven clusters and pitches sound like several resin dice inside a cup.
        for (const beat of [0, .12, .27, .39, .53, .69, .84, 1.01, 1.18]) {
          for (let i = 0; i < Math.min(3, count); i += 1) play((beat + i * .019) * scale, .42 + Math.random() * .2, .85 + Math.random() * .3);
        }
        for (let i = 0; i < Math.min(6, count); i += 1) play(Math.max(0, seconds - .15) + i * .016, .36 - i * .035, .9 + Math.random() * .2);
        return 'played';
      } catch {
        if (!current()) return 'canceled';
        stop(); return 'blocked';
      }
    },
    stop,
    disable() { generation += 1; enabled = false; stop(); },
    dispose() { generation += 1; enabled = false; stop(); if (context && context.state !== 'closed') void context.close().catch(() => {}); },
  };
}
