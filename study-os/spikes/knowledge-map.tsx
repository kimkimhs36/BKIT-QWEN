import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { ReactFlow, Controls, Background } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
function Spike() {
  const [selected, setSelected] = useState('none');
  return (
    <>
      <output>selected:{selected}</output>
      <div style={{ height: 480 }}>
        <ReactFlow
          nodes={[
            { id: 'balance', position: { x: 0, y: 0 }, data: { label: '등식의 성질' } },
            { id: 'distribute', position: { x: 250, y: 100 }, data: { label: '분배법칙' } },
          ]}
          edges={[{ id: 'sequence', source: 'balance', target: 'distribute' }]}
          onNodeClick={(_, n) => setSelected(n.id)}
          fitView
          nodesDraggable={false}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </>
  );
}
createRoot(document.getElementById('root')!).render(<Spike />);
