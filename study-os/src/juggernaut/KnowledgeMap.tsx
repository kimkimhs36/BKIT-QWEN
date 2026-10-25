import { useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type NodeProps,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowRight } from 'lucide-react';
import { concepts, type Concept } from './content';
import { evidence, recommendation, type StudyDocument } from './engine';
type ConceptNode = Node<
  { name: string; state: string; index: string; recommended: boolean },
  'concept'
>;
function ConceptMarker({ data }: NodeProps<ConceptNode>) {
  return (
    <div className={'jg-map-marker' + (data.recommended ? ' is-recommended' : '')}>
      <Handle type="target" position={Position.Left} />
      <small>FOUNDATION / {data.index}</small>
      <b>{data.name}</b>
      <span>{data.state}</span>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const nodeTypes = { concept: ConceptMarker };
export default function KnowledgeMap({
  document,
  onBegin,
}: {
  document: StudyDocument;
  onBegin: (c: Concept) => void;
}) {
  const [selected, setSelected] = useState<Concept>(recommendation(document).concept);
  const nodes: ConceptNode[] = concepts.map((c, i) => ({
    id: c.id,
    type: 'concept',
    position: { x: i * 310, y: i === 1 ? 75 : 0 },
    data: {
      name: c.name,
      state: evidence(document, c.id).state,
      index: `0${i + 1}`,
      recommended: recommendation(document).concept === c.id,
    },
  }));
  const current = concepts.find((c) => c.id === selected)!;
  return (
    <>
      <div className="jg-map-intro">
        <p className="jg-eyebrow">KNOWLEDGE MAP / 02</p>
        <h1 tabIndex={-1}>
          흩어진 개념이,
          <br />
          하나의 길이 될 때.
        </h1>
        <p>현재 열려 있는 일차방정식 3개 개념. 답변에 따라 지도 위의 상태가 바뀝니다.</p>
      </div>
      <div className="jg-map-canvas" aria-label="일차방정식 학습 순서 지도">
        <ReactFlow
          nodes={nodes}
          edges={[
            {
              id: 'balance-distribute',
              source: 'balance',
              target: 'distribute',
              label: '전개 연습',
              type: 'smoothstep',
            },
            {
              id: 'distribute-negative',
              source: 'distribute',
              target: 'negative',
              label: '검산 연습',
              type: 'smoothstep',
            },
          ]}
          nodeTypes={nodeTypes}
          onNodeClick={(_, n) => setSelected(n.id as Concept)}
          nodesDraggable={false}
          nodesConnectable={false}
          edgesFocusable={false}
          deleteKeyCode={null}
          fitView
          minZoom={0.3}
          maxZoom={1.4}
          preventScrolling={false}
          ariaLabelConfig={{
            'controls.zoomIn.ariaLabel': '지도 확대',
            'controls.zoomOut.ariaLabel': '지도 축소',
            'controls.fitView.ariaLabel': '전체 지도 보기',
          }}
        >
          <Background gap={24} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <p className="jg-map-caption">
        연결선은 이 파일럿의 연습 순서입니다. 공식 선수관계·완전한 교육과정 지도를 의미하지
        않습니다. 수치 대입 검증 완료 · 교사 검수 대기.
      </p>
      <div className="jg-map-detail">
        <div>
          <p className="jg-eyebrow">SELECTED CONCEPT / 8 ORIGINAL ITEMS</p>
          <h2>{current.name}</h2>
          <p>{current.note}</p>
          <span className="jg-tag">{evidence(document, selected).state}</span>
        </div>
        <button className="jg-primary" onClick={() => onBegin(selected)}>
          이 개념 학습 시작
          <ArrowRight size={17} />
        </button>
      </div>
      <section className="jg-map-list">
        <h2>개념 목록 · 키보드와 작은 화면에서도</h2>
        {concepts.map((c, i) => (
          <button
            className="jg-row"
            key={c.id}
            aria-pressed={selected === c.id}
            onClick={() => setSelected(c.id)}
          >
            <span>
              0{i + 1} / {c.name}
            </span>
            <span>{evidence(document, c.id).state}</span>
          </button>
        ))}
      </section>
      <section className="jg-map-future">
        <p className="jg-eyebrow">BEYOND THE HORIZON / 콘텐츠·관계 미검증</p>
        <h2>문자식 · 인수분해 · 함수 · 대수 · 미적분Ⅰ</h2>
        <p>
          준비 중. 검수된 개념과 선수관계가 확보된 뒤 연결됩니다. 지금은 학습하거나 진단할 수
          없습니다.
        </p>
      </section>
    </>
  );
}
