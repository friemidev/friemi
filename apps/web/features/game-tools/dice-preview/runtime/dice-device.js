import { diceAudioData } from './dice-audio-data.js';

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
  // All conditions come from one CC0 microphone-recorded dice/cup set.
  // Preserve real impact spacing and pitch; don't assemble synthetic rattles.
  let context, enabled = false, disposed = false, generation = 0, playbackGeneration = 0, sample, bytes, loading;
  const download = new AbortController();
  const now = () => host.performance?.now() ?? Date.now();
  const voices = new Set(), previousTakes = new Map();
  function choose(pool) {
    const previous = previousTakes.get(pool);
    // Vary complete recorded takes without immediately repeating the last one.
    let index = Math.floor(Math.random() * (pool.length - (previous === undefined ? 0 : 1)));
    if (previous !== undefined && index >= previous) index += 1;
    previousTakes.set(pool, index); return pool[index];
  }
  function preload() {
    bytes ??= host.fetch(diceAudioData.url, { signal: download.signal }).then((response) => {
      if (!response.ok) throw new Error('Dice audio unavailable');
      return response.arrayBuffer();
    }).catch((error) => { bytes = undefined; throw error; });
    return bytes;
  }
  async function loadSample() {
    loading ??= preload().then((data) => context.decodeAudioData(data.slice(0))).then((buffer) => {
      if (!Number.isFinite(buffer.duration) || buffer.duration < diceAudioData.duration - .01) throw new Error('Invalid dice audio');
      sample = buffer;
    }).catch((error) => { loading = undefined; bytes = undefined; throw error; });
    await loading;
  }
  // Fetch bytes without creating an AudioContext or requesting sound permission.
  // Decode only after the player enables sound in a gesture.
  void preload().catch(() => {});
  function stop() {
    playbackGeneration += 1;
    for (const voice of voices) { try { voice.stop(); } catch { /* Already ended. */ } }
    voices.clear();
  }
  function play(sprite, delay, length, volume, elapsed, tail = false) {
    const skipped = Math.max(0, elapsed - delay), remaining = length - skipped;
    if (remaining <= 0) return;
    const source = context.createBufferSource(), gain = context.createGain();
    const startsAt = context.currentTime + Math.max(0, delay - elapsed), endsAt = startsAt + remaining;
    source.buffer = sample;
    // Never speed up or pitch-shift a recording for quick rolls. Short fades
    // avoid hard cuts when the animation ends or recovery starts mid-recording.
    gain.gain.setValueAtTime(0, startsAt);
    gain.gain.linearRampToValueAtTime(volume, startsAt + Math.min(.006, remaining / 3));
    gain.gain.setValueAtTime(volume, Math.max(startsAt + remaining / 3, endsAt - .025));
    gain.gain.linearRampToValueAtTime(0, endsAt);
    source.connect(gain); gain.connect(context.destination); voices.add(source);
    source.onended = () => { voices.delete(source); source.disconnect(); gain.disconnect(); };
    source.start(startsAt, sprite.offset + (tail ? sprite.duration - length : 0) + skipped, remaining);
  }
  return {
    get context() { return context; },
    async enable() {
      if (disposed) return false;
      const current = ++generation;
      try {
        const Context = host.AudioContext || host.webkitAudioContext;
        if (!Context) return false;
        context ??= new Context();
        // Resume in the switch/button gesture, never in a sensor callback.
        const ready = loadSample();
        // Handle loading failures even if resuming rejects first.
        void ready.catch(() => {});
        await context.resume();
        if (current !== generation) return false;
        enabled = context.state === 'running';
        await ready;
        return current === generation && enabled;
      } catch { if (current === generation) enabled = false; return false; }
    },
    async roll(duration = 1800, count = 5, { covered = false } = {}) {
      if (!enabled || host.document.hidden) return 'canceled';
      if (!context || context.state === 'closed') return 'blocked';
      stop();
      const operation = playbackGeneration, permission = generation, startedAt = now();
      const seconds = Math.max(.1, duration / 1000);
      const current = () => enabled && !host.document.hidden && operation === playbackGeneration && permission === generation;
      let elapsed = 0;
      try {
        // Phones may interrupt an already-unlocked context while in the background.
        // A button roll invokes resume in its gesture; sensor rolls reuse the earlier
        // sound permission. Never replay this sound after mute, navigation or a new roll.
        if (context.state !== 'running') await context.resume();
        await loadSample();
        elapsed = Math.max(0, now() - startedAt) / 1000;
        if (!current() || elapsed >= seconds) return 'canceled';
        if (context.state !== 'running') return 'blocked';
        const group = diceAudioData.groups[count <= 1 ? '1' : count <= 3 ? '3' : '6'];
        const volume = count <= 1 ? .55 : count <= 3 ? .66 : .72;
        if (seconds <= .25) {
          const tick = choose(covered ? group.closedTick : group.landing);
          play(tick, 0, Math.min(seconds, tick.duration), volume * .65, elapsed);
        } else if (covered) {
          const shake = choose(group.covered);
          // The real closed-cup take already includes the last internal impacts.
          // Keep its ending on quick rolls; never append an exposed table roll.
          play(shake, 0, Math.min(seconds, shake.duration), volume, elapsed, true);
        } else {
          const landing = choose(group.landing), shake = choose(group.shake);
          const landingLength = Math.min(seconds, landing.duration), landingAt = seconds - landingLength;
          // A short overlap feathers the cut between matched cup/felt recordings.
          // Keep the take's ending instead of cutting a busy shake off mid-impact.
          const shakeLength = Math.min(shake.duration, landingAt + .018);
          if (landingAt > .03) play(shake, 0, shakeLength, volume, elapsed, true);
          play(landing, landingAt, landingLength, volume, elapsed);
        }
        return 'played';
      } catch {
        if (!current()) return 'canceled';
        stop(); return 'blocked';
      }
    },
    stop,
    disable() { generation += 1; enabled = false; stop(); },
    dispose() { generation += 1; enabled = false; disposed = true; download.abort(); stop(); if (context && context.state !== 'closed') void context.close().catch(() => {}); },
  };
}
