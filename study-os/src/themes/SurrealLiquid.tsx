import { useEffect, useRef, useState } from 'react';
import type { MaterialPreferences } from './material';
import { liquidFragment, liquidVertex } from './liquidWorld';

type WorldProps = { prefs: MaterialPreferences; studying: boolean; protectedStudy: boolean };
const BLOCKED = [
  'a',
  'button',
  'input',
  'textarea',
  'select',
  'label',
  'summary',
  'nav',
  'header',
  'dialog',
  '[role="dialog"]',
  '[role="button"]',
  '[contenteditable]',
  '[data-liquid-block]',
  'h1',
  'h2',
  'h3',
  'p',
  'svg',
  '.study-dialog-overlay',
  '.panel',
  '.focus-card',
  '.study-start',
  '.study-agenda',
  '.study-next',
  '.study-recent',
  '.study-clock',
  '.quick-timer',
  '.task-row',
  '.study-task',
  '.resource-card',
  '.resource-resume',
  '.study-site-card',
  '.study-submission',
  '.ai-zone-tool',
  '.ai-zone-source-detail',
  '.learning-workspace',
  '.problem-workspace',
  '.pdf-reader',
  '.digital-paper',
  '.bkit-quick-search',
  '.bkit-search-results',
  '.material-settings',
  '.note-card',
  '.sleep-card',
  '.recovery-card',
  '.more-hub-link',
  '.study-dialog',
].join(',');
const PROTECTED_SURFACE = '.digital-paper, .learning-workspace, .problem-workspace, .pdf-reader';

/** Decorative surface only. All gestures are observed passively on the document. */
export function SurrealLiquid({ prefs, studying, protectedStudy }: WorldProps) {
  const [contextRevision, setContextRevision] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const current = useRef({ prefs, studying, protectedStudy });
  current.current = { prefs, studying, protectedStudy };
  const active = prefs.id === 'glass' || prefs.id === 'peach';

  // PDF readers can open inside the library without starting a study session.
  // Observe their presence as well as the session flags; never touch their state.
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      const hidden = String(document.hidden);
      const protectedSurface = String(!!document.querySelector(PROTECTED_SURFACE));
      if (root.dataset.liquidHidden === hidden && root.dataset.liquidProtected === protectedSurface)
        return;
      root.dataset.liquidHidden = hidden;
      root.dataset.liquidProtected = protectedSurface;
      window.dispatchEvent(new Event('bkit:liquid-policy'));
    };
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      delete root.dataset.liquidHidden;
      delete root.dataset.liquidProtected;
    };
  }, []);

  useEffect(() => {
    // Touch devices use the same material palette without a live GPU surface.
    // This is a safety budget, also with maximum visual preferences selected.
    if (
      !active ||
      matchMedia('(pointer: coarse)').matches ||
      prefs.lowPower ||
      prefs.motion !== 'auto' ||
      matchMedia('(prefers-reduced-motion: reduce)').matches ||
      studying ||
      protectedStudy
    )
      return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = matchMedia('(pointer: coarse)').matches;
    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
        powerPreference: 'low-power',
      });
    } catch {
      /* CSS atmosphere remains available when WebGL is blocked. */
    }
    if (!gl) return;
    const gpu = gl;
    let program: WebGLProgram | null = null;
    let vertex: WebGLShader | null = null;
    let fragment: WebGLShader | null = null;
    let buffer: WebGLBuffer | null = null;
    let frame = 0;
    let lost = false;
    let disposed = false;
    let time = 0;
    let last = 0;
    let lastDraw = 0;
    let activeUntil = 0;
    let nextWave = 0;
    let energy = 1;
    let resolutionScale = 1;
    let slowFrames = 0;
    let resizeTimer = 0;
    let pointer: number | null = null;
    let lastTrail = -20;
    let lastX = 0;
    let lastY = 0;
    let handTarget = 0;
    const hand = new Float32Array([0.5, 0.5, 0, 0]);
    const drift = new Float32Array(2);
    const driftTarget = [0, 0];
    const waves = new Float32Array(24);
    for (let i = 0; i < 6; i++) waves[i * 4 + 2] = -20;

    const disposeGpu = () => {
      if (buffer) gpu.deleteBuffer(buffer);
      if (program) gpu.deleteProgram(program);
      if (vertex) gpu.deleteShader(vertex);
      if (fragment) gpu.deleteShader(fragment);
    };
    const compile = (type: number, source: string) => {
      const shader = gpu.createShader(type);
      if (!shader) throw new Error('Shader unavailable');
      gpu.shaderSource(shader, source);
      gpu.compileShader(shader);
      if (!gpu.getShaderParameter(shader, gpu.COMPILE_STATUS)) {
        gpu.deleteShader(shader);
        throw new Error('Shader unsupported');
      }
      return shader;
    };
    try {
      vertex = compile(gpu.VERTEX_SHADER, liquidVertex);
      // Some older mobile GPUs support only mediump in the fragment stage.
      const highp = gpu.getShaderPrecisionFormat(gpu.FRAGMENT_SHADER, gpu.HIGH_FLOAT)?.precision;
      fragment = compile(
        gpu.FRAGMENT_SHADER,
        highp ? liquidFragment : liquidFragment.replace('precision highp', 'precision mediump'),
      );
      program = gpu.createProgram();
      if (!program) throw new Error('Program unavailable');
      gpu.attachShader(program, vertex);
      gpu.attachShader(program, fragment);
      gpu.linkProgram(program);
      if (!gpu.getProgramParameter(program, gpu.LINK_STATUS))
        throw new Error('Program unsupported');
      gpu.useProgram(program);
      buffer = gpu.createBuffer();
      if (!buffer) throw new Error('Buffer unavailable');
      gpu.bindBuffer(gpu.ARRAY_BUFFER, buffer);
      gpu.bufferData(gpu.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gpu.STATIC_DRAW);
      const position = gpu.getAttribLocation(program, 'aPosition');
      gpu.enableVertexAttribArray(position);
      gpu.vertexAttribPointer(position, 2, gpu.FLOAT, false, 0, 0);
    } catch {
      disposeGpu();
      return;
    }
    const uniforms = {
      resolution: gpu.getUniformLocation(program, 'uResolution'),
      time: gpu.getUniformLocation(program, 'uTime'),
      energy: gpu.getUniformLocation(program, 'uEnergy'),
      waves: gpu.getUniformLocation(program, 'uWaves[0]'),
      hand: gpu.getUniformLocation(program, 'uHand'),
      drift: gpu.getUniformLocation(program, 'uDrift'),
      peach: gpu.getUniformLocation(program, 'uPeach'),
    };
    const still = () => {
      const { prefs: p, protectedStudy: protect } = current.current;
      return (
        motion.matches ||
        document.documentElement.dataset.awakeCamera === 'true' ||
        p.lowPower ||
        p.motion !== 'auto' ||
        p.intensity === 0 ||
        current.current.studying ||
        protect ||
        document.documentElement.dataset.liquidProtected === 'true'
      );
    };
    const canTouch = (event: PointerEvent) => {
      if (still() || document.hidden || event.pointerType === 'pen') return false;
      if (event.target instanceof Element && event.target.closest(BLOCKED)) return false;
      // Portal sheets also protect the uncovered scrim and the page behind it.
      return !document.querySelector('[role="dialog"], dialog[open], .study-dialog-overlay');
    };
    const size = () => {
      const rect = canvas.getBoundingClientRect();
      // Cap pixel count, not just DPR: large iPads must not pay for a 2x framebuffer.
      const budget = coarse ? 180_000 : 360_000;
      const scale =
        Math.min(
          devicePixelRatio || 1,
          1.25,
          Math.sqrt(budget / Math.max(1, rect.width * rect.height)),
        ) * resolutionScale;
      canvas.width = Math.max(1, Math.round(rect.width * scale));
      canvas.height = Math.max(1, Math.round(rect.height * scale));
      gpu.viewport(0, 0, canvas.width, canvas.height);
    };
    const draw = () => {
      gpu.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gpu.uniform1f(uniforms.time, time);
      gpu.uniform1f(uniforms.energy, energy);
      gpu.uniform4fv(uniforms.waves, waves);
      gpu.uniform4fv(uniforms.hand, hand);
      gpu.uniform2fv(uniforms.drift, drift);
      gpu.uniform1f(uniforms.peach, current.current.prefs.id === 'peach' ? 1 : 0);
      gpu.drawArrays(gpu.TRIANGLES, 0, 3);
      canvas.dataset.ready = 'true';
    };
    const tick = (now: number) => {
      frame = 0;
      if (disposed || lost || document.hidden) return;
      const { prefs: p, studying: quiet } = current.current;
      const frozen = still();
      const alive = !frozen && (handTarget > 0 || time - lastTrail < 7);
      const interval = frozen ? Infinity : alive ? 1000 / 24 : 1000 / 12;
      if (!lastDraw || now - lastDraw >= interval - 1) {
        const dt = Math.min(0.08, Math.max(0, (now - (last || now)) / 1000));
        if (!frozen) time += dt;
        last = now;
        lastDraw = now;
        const mix = 1 - Math.exp(-dt * 8);
        // Only the decorative light field follows the sensor, never study content.
        if (document.documentElement.dataset.materialSensor === 'on' && !frozen) {
          driftTarget[0] =
            Number(document.documentElement.style.getPropertyValue('--sensor-x')) * 0.7;
          driftTarget[1] =
            -Number(document.documentElement.style.getPropertyValue('--sensor-y')) * 0.7;
        }
        hand[2] += ((frozen ? 0 : handTarget) - hand[2]) * mix;
        drift[0] += (driftTarget[0] - drift[0]) * mix;
        drift[1] += (driftTarget[1] - drift[1]) * mix;
        const targetEnergy = frozen ? 0 : (0.55 + p.intensity * 0.9) * (quiet ? 0.16 : 1);
        energy += (targetEnergy - energy) * mix;
        const before = performance.now();
        draw();
        if (performance.now() - before > 22) slowFrames++;
        else slowFrames = Math.max(0, slowFrames - 1);
        if (slowFrames > 18 && resolutionScale > 0.65) {
          resolutionScale *= 0.8;
          slowFrames = 0;
          size();
        }
      }
      if (!frozen && !quiet && now < activeUntil) frame = requestAnimationFrame(tick);
    };
    const wake = () => {
      activeUntil = performance.now() + 1200;
      if (!frame && !document.hidden && !lost && !disposed) frame = requestAnimationFrame(tick);
    };
    const clear = () => {
      pointer = null;
      handTarget = 0;
      lastTrail = -20;
      hand[2] = 0;
      waves.fill(0);
      for (let i = 0; i < 6; i++) waves[i * 4 + 2] = -20;
      driftTarget[0] = driftTarget[1] = 0;
    };
    const point = (event: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return [(event.clientX - r.left) / r.width, 1 - (event.clientY - r.top) / r.height];
    };
    const impulse = (event: PointerEvent, strength: number) => {
      const [x, y] = point(event);
      waves.set([x, y, time, strength], nextWave * 4);
      nextWave = (nextWave + 1) % 6;
      lastTrail = time;
    };
    const down = (event: PointerEvent) => {
      if (!canTouch(event) || event.button !== 0 || pointer !== null) return;
      pointer = event.pointerId;
      const [x, y] = point(event);
      hand[0] = x;
      hand[1] = y;
      handTarget = 0.7 + Math.min(event.pressure || 0.5, 1) * 0.4;
      lastX = event.clientX;
      lastY = event.clientY;
      impulse(event, 1.15);
      wake();
    };
    const move = (event: PointerEvent) => {
      if (event.pointerId !== pointer) {
        if (event.pointerType === 'mouse' && canTouch(event)) {
          driftTarget[0] = event.clientX / innerWidth - 0.5;
          driftTarget[1] = 0.5 - event.clientY / innerHeight;
        }
        return;
      }
      if (!canTouch(event)) {
        pointer = null;
        handTarget = 0;
        return;
      }
      const [x, y] = point(event);
      hand[0] += (x - hand[0]) * 0.28;
      hand[1] += (y - hand[1]) * 0.28;
      // A bounded wake follows a drag; native scrolling and touch-action stay intact.
      if (
        time - lastTrail > 0.17 &&
        Math.hypot(event.clientX - lastX, event.clientY - lastY) > 28
      ) {
        impulse(event, 0.52);
        lastX = event.clientX;
        lastY = event.clientY;
      }
    };
    const release = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      if (canTouch(event) && event.type === 'pointerup') impulse(event, 0.48);
      pointer = null;
      handTarget = 0;
    };
    const reset = () => {
      clear();
      policy();
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = lastDraw = 0;
      clear();
      if (!document.hidden) wake();
    };
    const policy = () => {
      const frozen = still();
      canvas.dataset.still = String(frozen);
      if (frozen) {
        // Safari may discard a non-preserved drawing buffer after its last
        // frame. Show the existing CSS atmosphere while rendering is stopped.
        cancelAnimationFrame(frame);
        frame = 0;
        clear();
        energy = 0;
        delete canvas.dataset.ready;
        return;
      }
      // Draw the resting material once. Only a real interaction starts a burst.
      cancelAnimationFrame(frame);
      frame = 0;
      clear();
      draw();
    };
    const resize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (lost || disposed) return;
        size();
        clear();
        lastDraw = 0;
        wake();
      }, 120);
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      cancelAnimationFrame(frame);
      frame = 0;
      delete canvas.dataset.ready;
    };
    // Safari may evict GPU contexts when switching apps. Restore the surface
    // without remounting the learning app or changing its timer/storage.
    const contextRestored = () => {
      if (!disposed) setContextRevision((v) => v + 1);
    };
    canvas.addEventListener('webglcontextlost', contextLost);
    canvas.addEventListener('webglcontextrestored', contextRestored);
    document.addEventListener('pointerdown', down, { passive: true });
    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerup', release, { passive: true });
    document.addEventListener('pointercancel', release, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('scroll', reset, { passive: true });
    window.addEventListener('blur', reset);
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('bkit:liquid-policy', policy);
    window.addEventListener('bkit:camera-load', policy);
    motion.addEventListener('change', policy);
    size();
    policy();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      clearTimeout(resizeTimer);
      disposeGpu();
      gpu.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.width = canvas.height = 1;
      delete canvas.dataset.ready;
      delete canvas.dataset.still;
      canvas.removeEventListener('webglcontextlost', contextLost);
      canvas.removeEventListener('webglcontextrestored', contextRestored);
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', release);
      document.removeEventListener('pointercancel', release);
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('scroll', reset);
      window.removeEventListener('blur', reset);
      window.removeEventListener('resize', resize);
      window.removeEventListener('bkit:liquid-policy', policy);
      window.removeEventListener('bkit:camera-load', policy);
      motion.removeEventListener('change', policy);
    };
  }, [active, contextRevision, prefs.lowPower, prefs.motion, studying, protectedStudy]);

  useEffect(() => {
    document.documentElement.dataset.liquidStudying = String(studying || protectedStudy);
    window.dispatchEvent(new Event('bkit:liquid-policy'));
  }, [prefs.motion, prefs.intensity, prefs.lowPower, studying, protectedStudy]);

  return active ? (
    <div className="surreal-world" aria-hidden="true">
      <div className="surreal-atmosphere" />
      <canvas ref={canvasRef} className="surreal-surface" />
    </div>
  ) : null;
}
