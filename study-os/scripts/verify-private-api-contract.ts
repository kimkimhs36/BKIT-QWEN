import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { newState, stateSchema, taskSchema } from '../src/model';
import { startQuick, finishQuick } from '../src/quickTimer';
import { portableStudyState, mergePrivateStudyState, privateStudySignature } from '../src/portableStudyState';

// Run against a separate, pinned API checkout. No server, credential or network request.
if (!process.argv[2]) throw new Error('Pass the API repository checkout path.');
const api = await import(pathToFileURL(resolve(process.argv[2], 'study-os/src/model.ts')).href);
const local = finishQuick(startQuick(newState(), 'stopwatch', 480, 1000, 'synthetic'), 66000);
local.juggernaut = {examDate:null,weeklyMinutes:90};
local.tasks=[taskSchema.parse({id:'task',title:'Synthetic assessment',subject:'Synthetic elective',kind:'수행평가',
  due:null,priority:2,minutes:25,remaining:25,status:'done',submitted:false,submissionRequired:true,
  optional:false,notes:'',link:'',attachmentIds:['device-only']})];
local.sessions[0].workspace={problem:'Synthetic question',source:'Synthetic original',
  answerDraft:'device draft',sourceType:'school-worksheet',problemNumber:'3',attempts:[{
    id:'answer',answer:'-1/2',submittedAt:'2026-10-28T01:00:00.000Z',selfCheck:'retry',
    hintUsed:true,confidence:'low',errorTag:'calculation',
  }]};
const payload=JSON.parse(JSON.stringify(portableStudyState(local)));
const remote=stateSchema.parse(api.stateSchema.parse(payload));
if(privateStudySignature(local)!==privateStudySignature(remote))
  throw new Error('Frontend/API canonical sync signatures differ.');
const merged=mergePrivateStudyState(local,remote);
if(!isDeepStrictEqual(merged.juggernaut,local.juggernaut)||
  !isDeepStrictEqual(merged.sessions[0].workspace,local.sessions[0].workspace)||
  !isDeepStrictEqual(merged.tasks[0].attachmentIds,local.tasks[0].attachmentIds))
  throw new Error('Downloading the API snapshot loses device-only records.');
console.log('PASS: actual API schema, canonical sync signature, local exam planning, answer evidence and photo references. No network or paid calls.');
