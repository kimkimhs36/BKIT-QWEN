/**
 * Calibrates timestamps passed to the existing segment engine. Foreground time
 * uses the monotonic clock, so changing the device clock cannot invent study.
 * A visibility/page lifecycle boundary allows wall time to cover WebKit sleep,
 * where performance.now() can stop ticking. Clock changes *during* OS sleep or
 * between browser processes cannot be distinguished from sleep without a trusted
 * external clock; no network dependency is introduced for local studying.
 */
export class StudyClock {
  private wall: number;
  private monotonic: number;
  private time: number;
  private suspended = false;

  constructor(wall: number, monotonic: number, savedBoundary = wall) {
    this.wall = wall;
    this.monotonic = monotonic;
    this.time = Math.max(wall, savedBoundary);
  }

  suspend() {
    this.suspended = true;
  }

  read(wall: number, monotonic: number) {
    const wallDelta = wall - this.wall;
    const monotonicDelta = Math.max(0, monotonic - this.monotonic);
    const adjusted = !this.suspended && Math.abs(wallDelta - monotonicDelta) > 2_000;
    this.time += this.suspended ? Math.max(0, wallDelta, monotonicDelta) : monotonicDelta;
    this.wall = wall;
    this.monotonic = monotonic;
    this.suspended = false;
    return { time: this.time, adjusted };
  }
}
