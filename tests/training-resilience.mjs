import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
let moduleId=0;
async function load(file) {
  const result=await build({entryPoints:[file],absWorkingDir:root,bundle:true,platform:'node',format:'esm',write:false});
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}#${moduleId++}`);
}
let disk=new Map();let full=false;let blocked=false;
globalThis.localStorage={getItem(key){if(blocked)throw new Error('Denied');return disk.get(key)??null;},setItem(key,value){if(blocked||full)throw new Error('QuotaExceeded');disk.set(key,value);},removeItem(key){disk.delete(key);}};
const p={owner:'member-a',date:'2026-10-27',exerciseId:'squat',setNumber:1,body:{weight:0,reps:30,unit:'SECONDS'}};
const queue=await load('src/lib/pendingSets.ts');
assert.equal(queue.addPending(p).persisted,true);
assert.equal((await load('src/lib/pendingSets.ts')).loadPending(p.owner,p.date)[0].body.unit,'SECONDS');
full=true;
assert.equal(queue.addPending({...p,setNumber:2}).persisted,false);
assert.equal(queue.loadPending(p.owner,p.date).length,2,'quota failure retains memory queue');
assert.ok(queue.getPendingStorageError());
queue.removePending(p);
assert.deepEqual(queue.loadPending(p.owner,p.date).map(item=>item.setNumber),[2],'failed disk removal does not resurrect confirmed entries');
assert.equal(queue.loadPending('other-member',p.date).length,0);
full=false;
assert.equal(queue.addPending({...p,setNumber:3}).persisted,true);
assert.deepEqual((await load('src/lib/pendingSets.ts')).loadPending(p.owner,p.date).map(item=>item.setNumber),[2,3]);
blocked=true;
assert.equal(queue.addPending({...p,setNumber:4}).persisted,false);
assert.ok(queue.loadPending(p.owner,p.date).some(item=>item.setNumber===4),'read/write denied still retains new entry');
blocked=false;
disk=new Map([['olympus-pending-sets','{corrupt']]);
const corrupt=await load('src/lib/pendingSets.ts');
assert.equal(corrupt.addPending(p).persisted,false);
assert.equal(disk.get('olympus-pending-sets'),'{corrupt','corrupt storage is not overwritten');
assert.equal(corrupt.loadPending(p.owner,p.date).length,1);
console.log('PASS offline queue: durable reload, quota failure, denied reads/writes, corruption, owner isolation, recovery, and removal tombstones');

const {writeProgramWeek}=await load('src/lib/programSave.ts');
let program={id:'program',coachId:'coach-a',weekNumber:1,updatedAt:new Date('2026-10-27T00:00:00.000Z')};
let deletes=0;let locks=0;
const tx={
 $executeRaw:async()=>{locks++;},
 trainingProgram:{findFirst:async()=>program,create:async()=>program,update:async({data})=>{program={...program,...data};return program;}},
 programDay:{deleteMany:async()=>{deletes++;},findMany:async()=>[]},
 programSnapshot:{findFirst:async()=>null,create:async()=>({})},
};
const base=program.updatedAt.toISOString();
await writeProgramWeek(tx,'coach-a',1,[],base);
const afterFirst=program.updatedAt.toISOString();
assert.notEqual(base,afterFirst);
await assert.rejects(writeProgramWeek(tx,'coach-a',1,[],base),error=>error.constructor.name==='ProgramConflictError');
assert.equal(deletes,1,'stale client cannot replace days');assert.equal(locks,2,'all writers take transaction lock');
await writeProgramWeek(tx,'coach-a',1,[],afterFirst);
assert.equal(deletes,2);
await writeProgramWeek(tx,'coach-a',1,[]);
await assert.rejects(writeProgramWeek(tx,'coach-a',1,[],afterFirst));
console.log('PASS weekly program: optimistic versions, lock on every writer, stale rejection before deletion, and snapshot restore invalidates editor version');
