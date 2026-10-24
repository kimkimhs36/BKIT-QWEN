import {
  newObservation,
  observeEyes,
  type AwakeObservation,
  type AwakePhase,
  type Sensitivity,
} from '../awakeSignals';
import { measureFace } from './measure';
import type { FaceLandmarker } from '@mediapipe/tasks-vision';
export type Snapshot = {
  phase: AwakePhase;
  camera: boolean;
  message: string;
  observation: AwakeObservation;
  slow: boolean;
};
type Engine = Pick<FaceLandmarker, 'detectForVideo' | 'close'>;
export type SessionDependencies = {
  camera: () => Promise<MediaStream>;
  model: () => Promise<Engine>;
  now: () => number;
  schedule: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  cancel: (id: ReturnType<typeof setTimeout>) => void;
  luminance: (video: HTMLVideoElement) => number;
};
export class AwakeSession {
  private generation = 0;
  private stream: MediaStream | null = null;
  private engine: Engine | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private starting = false;
  private observation = newObservation(true);
  private snapshot: Snapshot = {
    phase: 'IDLE',
    camera: false,
    message: '기본 OFF · 시작할 때만 카메라 권한을 요청해요.',
    observation: this.observation,
    slow: false,
  };
  sensitivity: Sensitivity = 'balanced';
  lowPower = false;
  constructor(
    private video: HTMLVideoElement,
    private update: (s: Snapshot) => void,
    private deps: SessionDependencies,
    private load: (camera: boolean) => void,
  ) {}
  private emit(phase: AwakePhase, message = this.snapshot.message, slow = this.snapshot.slow) {
    this.snapshot = { phase, camera: !!this.stream, message, observation: this.observation, slow };
    this.update(this.snapshot);
  }
  stop(phase: AwakePhase = 'IDLE', message = '카메라를 종료했어요.') {
    this.generation++;
    if (this.timer !== null) {
      try {
        this.deps.cancel(this.timer);
      } catch {
        /* Generation guard still prevents a stale callback from reading the camera. */
      }
    }
    this.timer = null;
    const stream = this.stream;
    this.stream = null;
    stream?.getTracks().forEach((t) => {
      t.onended = null;
      t.stop();
    });
    try {
      this.engine?.close();
    } catch {
      /* Tracks are already stopped; continue releasing UI resources. */
    }
    this.engine = null;
    this.video.srcObject = null;
    this.observation = newObservation(true);
    this.load(false);
    this.emit(phase, message, false);
  }
  calibrate() {
    this.observation = newObservation(true);
    this.emit('CALIBRATING', '정면을 편하게 바라보고 자연스럽게 몇 번 깜빡여 주세요.');
  }
  skip() {
    this.observation = newObservation();
    this.emit('OBSERVING', '보수적인 기본 기준으로 관찰해요.');
    this.sensitivity = 'conservative';
  }
  async start() {
    if (this.starting || this.stream) return;
    this.starting = true;
    const ticket = ++this.generation;
    this.observation = newObservation(true);
    this.emit('INITIALIZING', '카메라와 기기 내 모델을 준비해요. 영상은 전송하지 않아요.');
    try {
      const media = await this.deps.camera();
      if (ticket !== this.generation) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = media;
      this.load(true);
      this.emit('INITIALIZING');
      media
        .getVideoTracks()
        .forEach((t) => (t.onended = () => this.stop('IDLE', '카메라 연결이 종료됐어요.')));
      this.video.srcObject = media;
      await this.video.play();
      if (ticket !== this.generation) return;
      const model = await this.deps.model();
      if (ticket !== this.generation) {
        model.close();
        return;
      }
      this.engine = model;
      this.emit('CALIBRATING', '약 4초간 정면을 편하게 바라보고 자연스럽게 깜빡여 주세요.');
      let videoTime = -1,
        lastFrame = this.deps.now(),
        lastPublish = 0,
        slowFrames = 0,
        period = 160;
      const read = () => {
        if (ticket !== this.generation || !this.engine) return;
        try {
          const at = this.deps.now();
          if (this.video.readyState >= 2 && this.video.currentTime !== videoTime) {
            videoTime = this.video.currentTime;
            lastFrame = at;
            const before = this.deps.now();
            const result = model.detectForVideo(this.video, at);
            const duration = this.deps.now() - before;
            this.observation = observeEyes(
              this.observation,
              measureFace(result, at, this.deps.luminance(this.video), duration),
              this.sensitivity,
            );
            slowFrames = duration > 130 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
            period = Math.max(this.lowPower ? 320 : 160, Math.min(650, duration * 3));
            if (duration > 700 || slowFrames >= 8) {
              this.stop(
                'PAUSED',
                '분석 부하가 높아 카메라를 종료했어요. 기기가 뜨겁거나 배터리가 빠르게 줄면 쉬어 주세요.',
              );
              return;
            }
            if (at - lastPublish > 450 || this.snapshot.phase !== this.observation.phase) {
              lastPublish = at;
              this.emit(
                this.observation.phase,
                this.observation.calibration.failed
                  ? '눈 기준을 확인하기 어려워요. 조명을 바꾸거나 기본 모드를 선택해 주세요.'
                  : this.lowPower
                    ? '절전 · 분석 빈도를 줄였어요.'
                    : slowFrames > 2
                      ? '분석 속도를 낮췄어요. 기기 발열과 배터리를 확인해 주세요.'
                      : '기기 내 관찰 중 · 영상·얼굴 특징 저장 없음',
                slowFrames > 2,
              );
            }
          } else if (at - lastFrame > 900) {
            this.observation = observeEyes(
              this.observation,
              { at, face: false, left: null, right: null, angled: false, frameAge: at - lastFrame },
              this.sensitivity,
            );
            if (this.snapshot.phase !== 'UNCERTAIN')
              this.emit('UNCERTAIN', '새 영상 프레임을 받지 못했어요. 관찰 불가로 처리해요.');
            if (at - lastFrame > 5000) {
              this.stop('PAUSED', '카메라 영상이 멈춰 종료했어요. 다시 시작할 수 있어요.');
              return;
            }
          }
          this.timer = this.deps.schedule(read, period);
        } catch {
          this.stop(
            'IDLE',
            '분석을 계속할 수 없어 카메라를 종료했어요. 기본 공부는 계속 사용할 수 있어요.',
          );
        }
      };
      read();
    } catch (e) {
      if (ticket === this.generation)
        this.stop(
          'IDLE',
          e instanceof DOMException && e.name === 'NotAllowedError'
            ? '카메라 권한을 허용하지 않았어요. 기본 공부와 휴식은 그대로 사용할 수 있어요.'
            : '카메라·분석 모델을 준비하지 못했어요. 기본 공부는 그대로 사용할 수 있어요.',
        );
    } finally {
      this.starting = false;
    }
  }
}
