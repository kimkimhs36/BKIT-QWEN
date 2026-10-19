/** Original synthesized ambience. No recordings, remote audio, or automatic playback. */
export function startAmbience(kind: 'rain' | 'sea' | 'forest' | 'wind', volume: number) {
  const ctx = new AudioContext();
  const ready = ctx.resume();
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate),
    data = buffer.getChannelData(0);
  let smooth = 0;
  for (let i = 0; i < data.length; i++) {
    smooth = (smooth + Math.random() * 2 - 1) * 0.5;
    data[i] = smooth;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = kind === 'rain' ? 3200 : kind === 'forest' ? 1800 : 750;
  const gain = ctx.createGain(),
    output = ctx.createGain();
  gain.gain.value = 1;
  output.gain.value = volume;
  noise.connect(filter).connect(gain).connect(output).connect(ctx.destination);
  noise.start();
  const lfo = ctx.createOscillator(),
    depth = ctx.createGain();
  lfo.frequency.value = kind === 'sea' ? 0.1 : 0.045;
  depth.gain.value = 0.35;
  lfo.connect(depth).connect(gain.gain);
  lfo.start();
  if (kind === 'forest') {
    const bird = ctx.createOscillator(),
      birdGain = ctx.createGain(),
      mod = ctx.createOscillator(),
      modDepth = ctx.createGain();
    bird.type = 'sine';
    bird.frequency.value = 1700;
    mod.frequency.value = 3.7;
    modDepth.gain.value = 140;
    mod.connect(modDepth).connect(bird.frequency);
    birdGain.gain.value = 0.018;
    bird.connect(birdGain).connect(output);
    mod.start();
    bird.start();
  }
  return {
    ready,
    stop: () => (ctx.state === 'closed' ? Promise.resolve() : ctx.close()),
    volume: (v: number) => output.gain.setTargetAtTime(v, ctx.currentTime, 0.1),
  };
}
