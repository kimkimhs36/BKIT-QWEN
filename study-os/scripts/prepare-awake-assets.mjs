import { mkdir, cp } from 'node:fs/promises';
await mkdir('public/awake/wasm', { recursive: true });
await cp('node_modules/@mediapipe/tasks-vision/wasm', 'public/awake/wasm', { recursive: true });
