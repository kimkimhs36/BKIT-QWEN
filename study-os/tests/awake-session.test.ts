import { describe, it, expect, vi, afterEach } from 'vitest';
import { AwakeSession, type SessionDependencies, type Snapshot } from '../src/awake/session';
const empty = { faceLandmarks: [], faceBlendshapes: [], facialTransformationMatrixes: [] };
const deferred = <T>() => {
  let resolve!: (v: T) => void, reject!: (e: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
function setup(overrides: Partial<SessionDependencies> = {}) {
  vi.useFakeTimers();
  vi.setSystemTime(100000);
  const track = { stop: vi.fn(), onended: null as null | (() => void) };
  const media = {
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as unknown as MediaStream;
  let frame = 0;
  let frozen = false;
  const video = {
    srcObject: null,
    play: vi.fn(async () => {}),
    readyState: 2,
    get currentTime() {
      if (!frozen) frame += 0.15;
      return frame;
    },
  } as unknown as HTMLVideoElement;
  const model = { detectForVideo: vi.fn(() => empty), close: vi.fn() };
  const snapshots: Snapshot[] = [];
  const load = vi.fn();
  const deps: SessionDependencies = {
    camera: vi.fn(async () => media),
    model: vi.fn(async () => model),
    now: () => Date.now(),
    schedule: setTimeout,
    cancel: clearTimeout,
    luminance: () => 120,
    ...overrides,
  };
  const session = new AwakeSession(video, (s) => snapshots.push(s), deps, load);
  return {
    session,
    video,
    model,
    track,
    media,
    snapshots,
    deps,
    load,
    freeze: () => {
      frozen = true;
    },
    last: () => snapshots.at(-1)!,
  };
}
afterEach(() => vi.useRealTimers());
describe('camera/model lifecycle', () => {
  it('starts only explicitly, prevents duplicate initialization, and stops tracks/model/timer', async () => {
    const h = setup();
    expect(h.deps.camera).not.toHaveBeenCalled();
    await Promise.all([h.session.start(), h.session.start()]);
    expect(h.deps.camera).toHaveBeenCalledTimes(1);
    expect(h.deps.model).toHaveBeenCalledTimes(1);
    expect(h.last().camera).toBe(true);
    h.session.stop();
    expect(h.track.stop).toHaveBeenCalledTimes(1);
    expect(h.model.close).toHaveBeenCalledTimes(1);
    expect(h.video.srcObject).toBeNull();
    const reads = h.model.detectForVideo.mock.calls.length;
    await vi.advanceTimersByTimeAsync(10000);
    expect(h.model.detectForVideo).toHaveBeenCalledTimes(reads);
    expect(h.last().camera).toBe(false);
  });
  it('releases a late permission stream after stop', async () => {
    const pending = deferred<MediaStream>();
    const h = setup({ camera: () => pending.promise });
    const start = h.session.start();
    h.session.stop();
    pending.resolve(h.media);
    await start;
    expect(h.track.stop).toHaveBeenCalledTimes(1);
    expect(h.deps.model).not.toHaveBeenCalled();
    expect(h.last().phase).toBe('IDLE');
  });
  it('closes a late loaded model after leaving the tab', async () => {
    const pending = deferred<ReturnType<typeof setup>['model']>();
    const h = setup({ model: () => pending.promise });
    const start = h.session.start();
    await Promise.resolve();
    await Promise.resolve();
    h.session.stop();
    pending.resolve(h.model);
    await start;
    expect(h.model.close).toHaveBeenCalledTimes(1);
    expect(h.track.stop).toHaveBeenCalledTimes(1);
    expect(h.last().camera).toBe(false);
  });
  it('model failure releases the acquired stream', async () => {
    const h = setup({
      model: async () => {
        throw new Error('model unavailable');
      },
    });
    await h.session.start();
    expect(h.track.stop).toHaveBeenCalled();
    expect(h.last().phase).toBe('IDLE');
    expect(h.last().message).toContain('준비하지 못');
  });
  it('permission denial never leaves a live camera', async () => {
    const h = setup({
      camera: async () => {
        throw new DOMException('denied', 'NotAllowedError');
      },
    });
    await h.session.start();
    expect(h.last().camera).toBe(false);
    expect(h.last().message).toContain('권한');
    expect(h.deps.model).not.toHaveBeenCalled();
  });
  it('preview playback failure also releases tracks', async () => {
    const h = setup();
    h.video.play = async () => {
      throw new Error('play failed');
    };
    await h.session.start();
    expect(h.track.stop).toHaveBeenCalled();
    expect(h.last().camera).toBe(false);
  });
  it('camera frame freeze becomes uncertain, then pauses and releases', async () => {
    const h = setup();
    await h.session.start();
    h.freeze();
    await vi.advanceTimersByTimeAsync(1500);
    expect(h.last().phase).toBe('UNCERTAIN');
    await vi.advanceTimersByTimeAsync(5000);
    expect(h.last().phase).toBe('PAUSED');
    expect(h.track.stop).toHaveBeenCalled();
  });
  it('low power lowers analysis cadence and restart clears observations', async () => {
    const h = setup();
    h.session.lowPower = true;
    await h.session.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(h.model.detectForVideo.mock.calls.length).toBeLessThanOrEqual(5);
    h.session.stop('PAUSED');
    await h.session.start();
    expect(h.last().observation.episodes).toHaveLength(0);
    h.session.stop();
  });
  it('stream ended and inference errors close all resources', async () => {
    const h = setup();
    await h.session.start();
    h.track.onended?.();
    expect(h.last().camera).toBe(false);
    const g = setup();
    g.model.detectForVideo.mockImplementation(() => {
      throw new Error('bad frame');
    });
    await g.session.start();
    expect(g.track.stop).toHaveBeenCalled();
    expect(g.model.close).toHaveBeenCalled();
  });
});

it('releases tracks even if timer cancellation and model close throw', async () => {
  const h = setup({
    cancel: () => {
      throw new Error('native timer failure');
    },
  });
  await h.session.start();
  h.model.close.mockImplementation(() => {
    throw new Error('close failure');
  });
  expect(() => h.session.stop()).not.toThrow();
  expect(h.track.stop).toHaveBeenCalled();
  expect(h.video.srcObject).toBeNull();
  expect(h.last().camera).toBe(false);
});
