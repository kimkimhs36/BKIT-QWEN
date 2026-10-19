import { Component, type ReactNode } from 'react';
/** A failed optional game chunk must leave the study engine and recovery controls usable. */
export class RaceBoundary extends Component<
  { children: ReactNode; onReturn: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <dialog open className="tohesar race-dialog" aria-label="휴식 게임 복구">
        <p role="alert">게임을 열지 못했어요. 학습 기록과 차량은 유지됩니다.</p>
        <button onClick={this.props.onReturn}>학습으로 복귀</button>
      </dialog>
    ) : (
      this.props.children
    );
  }
}
