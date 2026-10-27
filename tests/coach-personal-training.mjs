import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
// Bundle the actual handlers against an in-memory database and session.
// No environment secrets, network calls, or production database are used.
const root = fileURLToPath(new URL('..', import.meta.url));
const state = { user: null, calls: [], rows: [], program: null, records: new Map(), nextId: 1, exercises: new Map([["squat", {id:"squat", name:"Back Squat"}]]) };
globalThis.__coachCheck = state;
function matches(row, where = {}) {
  return Object.entries(where).every(([key, value]) => key === 'id' || key === 'memberId' || key === 'exerciseId' ? row[key] === value : key === 'workoutDate' ? +new Date(row[key]) === +new Date(value) : true);
}
const tx = {
  $executeRaw: async (...args) => { state.calls.push(['lock', args]); },
  setEntry: {
    aggregate: async ({where}) => ({ _max: { setNumber: Math.max(0, ...state.rows.filter(r => matches(r, where)).map(r => r.setNumber)) }}),
    create: async ({data}) => { const row = { id: `set-${state.nextId++}`, isPR:false, note:null, ...data }; state.rows.push(row); return {...row}; },
    update: async ({where, data}) => { const row = state.rows.find(r => r.id === where.id); Object.assign(row, data); return {...row}; },
    delete: async ({where}) => { const index = state.rows.findIndex(r => r.id === where.id); return state.rows.splice(index, 1)[0]; },
    findUnique: async ({where, include}) => { const row = state.rows.find(r => r.id === where.id); return row ? { ...row, ...(include ? {member:{role: row.memberId.startsWith('member') ? 'MEMBER':'COACH'}} : {})} : null; },
    findMany: async ({where}) => state.rows.filter(r => matches(r, where)).map(r => ({...r})).sort((a,b) => +new Date(a.workoutDate)-+new Date(b.workoutDate) || a.setNumber-b.setNumber),
  },
  personalRecord: {
    findUnique: async ({where}) => state.records.get(JSON.stringify(where.memberId_exerciseId_type)),
    upsert: async ({where,create,update}) => {const key=JSON.stringify(where.memberId_exerciseId_type); const prior=state.records.get(key); const value=prior ? {...prior,...update}:create; state.records.set(key,value); return value;},
    deleteMany: async () => {},
  },
};
state.prisma = {
  ...tx,
  $transaction: async callback => callback(tx),
  exercise: {
    findUnique: async ({where}) => state.exercises.get(where.id) ?? null,
    upsert: async ({where,create}) => {
      const existing = [...state.exercises.values()].find(exercise => exercise.name === where.name);
      if (existing) return existing;
      const exercise = {id:'row',...create}; state.exercises.set(exercise.id, exercise); return exercise;
    },
  },
  movement: {findUnique: async ({where}) => where.id === 'move-row' ? {name:'Barbell Row'} : null},
  coachPersonalProgram: { findUnique: async () => state.program, upsert: async args => { state.calls.push(['program',args]); state.program=state.program ? {...state.program,...args.update} : {...args.create,updatedAt:new Date()}; return state.program;} },
};
tx.coachPersonalProgram = state.prisma.coachPersonalProgram;
const plugin = {name:'isolated-dependencies', setup(b) {
  b.onResolve({filter:/^@\/lib\/(auth|prisma|workout|priorBests)$/}, args => ({path:args.path,namespace:'stub'}));
  b.onResolve({filter:/^@\/generated\/prisma\/client$/}, args => ({path:args.path,namespace:'stub'}));
  b.onResolve({filter:/^(server-only|next\/server)$/}, args => ({path:args.path,namespace:'stub'}));
  b.onLoad({filter:/.*/,namespace:'stub'}, args => ({loader:'js', contents: args.path === '@/lib/auth' ? 'export async function getCurrentUser(){return globalThis.__coachCheck.user;}' : args.path === '@/lib/priorBests' ? 'export function invalidatePriorBests(){}' : args.path === '@/lib/prisma' ? 'export const prisma = globalThis.__coachCheck.prisma;' : args.path === '@/lib/workout' ? 'export const todayDateKey = () => new Date("2026-10-27T00:00:00Z");' : args.path === '@/generated/prisma/client' ? 'export const Role={COACH:"COACH",MEMBER:"MEMBER"}; export const SetUnit={REPS:"REPS",SECONDS:"SECONDS"};export const PRType={MAX_WEIGHT:"MAX_WEIGHT",MAX_1RM:"MAX_1RM",MAX_AMOUNT:"MAX_AMOUNT"};' : args.path === 'next/server' ? 'export const NextResponse = {json:(body, options)=>Response.json(body,options)};' : ''}));
}};
async function route(file) {
 const result = await build({entryPoints:[`${root}/${file}`],absWorkingDir:root,bundle:true,platform:'node',format:'esm',write:false,plugins:[plugin]});
 return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
const program = await route('src/app/api/coach/latihan/program/route.ts');
const sets = await route('src/app/api/coach/latihan/sets/route.ts');
const edit = await route('src/app/api/coach/latihan/sets/[setId]/route.ts');
const manage = await route('src/app/api/coach/members/[memberId]/sets/[setId]/route.ts');
const request = body => new Request('http://localhost/test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({expectedVersion:state.program?.updatedAt?.toISOString()??null,...body})});
const ctx = id => ({params:Promise.resolve({setId:id})});
const valid = {exerciseId:'squat',weight:'42,5',reps:10,date:'2026-10-27'};
let passed=0;
async function check(name, callback) { await callback(); passed++; console.log(`PASS ${name}`); }
await check('anonymous and member cannot create personal programs or sets',async()=>{for(const user of [null,{id:'member-a',role:'MEMBER'}]) {state.user=user; assert.equal((await program.PUT(request({days:[]}))).status,401);assert.equal((await sets.POST(request(valid))).status,401);}assert.equal(state.calls.length,0);});
state.user={id:'coach-a',role:'COACH'};
await check('program validates targets and rejects duplicate or missing exercises',async()=>{for(const slots of [[{exerciseId:'squat',sets:3,reps:201}],[{exerciseId:'squat',sets:3,reps:10},{exerciseId:'squat',sets:4,reps:8}],[{exerciseId:'unknown',sets:3,reps:10}]])assert.equal((await program.PUT(request({days:[{name:'Upper',slots}]}))).status,400);});
await check('program ownership always comes from session',async()=>{assert.equal((await program.PUT(request({coachId:'coach-b',days:[{name:'Sesi A',slots:[{exerciseId:'squat',sets:3,reps:10}]}]}))).status,200);assert.equal(state.program.coachId,'coach-a');assert.equal(state.program.days[0].name,'Sesi A');});
await check('invalid sets, dates and nonexistent exercises rejected',async()=>{for(const body of [{...valid,weight:-1},{...valid,reps:0},{...valid,reps:201},{...valid,date:'2026-10-26'},{...valid,exerciseId:'unknown'}])assert.ok((await sets.POST(request(body))).status>=400);assert.equal(state.rows.length,0);});
await check('decimal comma loads saved to coach account and PR recorded',async()=>{const response=await sets.POST(request({...valid,memberId:'member-a'}));assert.equal(response.status,200);const data=await response.json();assert.equal(data.setEntry.memberId,'coach-a');assert.equal(data.setEntry.weight,42.5);assert.equal(data.setEntry.setNumber,1);assert.equal(data.setEntry.isPR,true);assert.ok(state.calls.some(c=>c[0]==='lock'));});
await check('bodyweight allowed and new set follows MAX across numbering gaps',async()=>{state.rows[0].setNumber=3;const data=await (await sets.POST(request({...valid,weight:0,setNumber:1}))).json();assert.equal(data.setEntry.setNumber,4);assert.equal(data.setEntry.weight,0);});
await check('other coaches cannot edit or delete private sets',async()=>{state.user={id:'coach-b',role:'COACH'};assert.equal((await edit.PATCH(request({weight:50,reps:8}),ctx('set-1'))).status,404);assert.equal((await edit.DELETE(request({}),ctx('set-1'))).status,404);state.user={id:'coach-a',role:'COACH'};});
await check('member-management endpoint cannot edit or delete coach sets',async()=>{const context={params:Promise.resolve({memberId:'coach-a',setId:'set-1'})};assert.equal((await manage.PATCH(request({weight:50,reps:8}),context)).status,404);assert.equal((await manage.DELETE(request({}),context)).status,404);});
await check('owner can edit and PR recalculated',async()=>{assert.equal((await edit.PATCH(request({weight:60,reps:8,note:'RPE 8'}),ctx('set-1'))).status,200);assert.equal(state.rows[0].weight,60);assert.equal(state.rows[0].note,'RPE 8');assert.ok([...state.records.values()].some(r=>r.weight===60));});
await check('owner can delete a set and keep other sets',async()=>{assert.equal((await edit.DELETE(request({}),ctx('set-1'))).status,200);assert.equal(state.rows.length,1);assert.equal(state.rows[0].setNumber,4);});
await check('malformed JSON is handled as validation error',async()=>{const response=await sets.POST(new Request('http://localhost/test',{method:'POST',body:'{'}));assert.equal(response.status,400);});
await check('only selected library movements are registered for logging',async()=>{
  const response = await program.PUT(request({days:[{name:'Pull',slots:[{exerciseId:'movement:move-row',sets:3,reps:12}]}]}));
  assert.equal(response.status,200);
  const data = await response.json();
  assert.equal(data.days[0].slots[0].exerciseId,'row');
  assert.equal(data.exercises[0].name,'Barbell Row');
  const logged = await sets.POST(request({...valid,exerciseId:'movement:move-row'}));
  assert.equal(logged.status,200);
  assert.equal((await logged.json()).setEntry.exerciseId,'row');
  assert.equal(state.exercises.size,2);
});
await check('stale personal program version is rejected without replacing current program',async()=>{
  const before=JSON.stringify(state.program);
  const response=await program.PUT(request({expectedVersion:null,days:[{name:'Stale',slots:[{exerciseId:'squat',sets:1,reps:5}]}]}));
  assert.equal(response.status,409);assert.equal(JSON.stringify(state.program),before);
});
await check('coach saves timed, distance, lap, and per-side sets with their units',async()=>{
  for(const [unit,reps] of [['SECONDS',60],['METERS',500],['LAPS',4],['CALORIES',20],['REPS',12]]) {
    const response=await sets.POST(request({...valid,unit,reps,weight:0,perSide:true}));
    assert.equal(response.status,200);const data=await response.json();assert.equal(data.setEntry.unit,unit);assert.equal(data.setEntry.perSide,true);
  }
});
await check('coach member-delete endpoint deletes only selected set among same-day siblings',async()=>{
  state.rows.push({id:'m1',memberId:'member-a',exerciseId:'squat',workoutDate:new Date('2026-10-27'),setNumber:1,weight:20,reps:10,unit:'REPS',isPR:false,estimated1RM:25}, {id:'m2',memberId:'member-a',exerciseId:'squat',workoutDate:new Date('2026-10-27'),setNumber:2,weight:20,reps:10,unit:'REPS',isPR:false,estimated1RM:25});
  const response=await manage.DELETE(request({}),{params:Promise.resolve({memberId:'member-a',setId:'m1'})});
  assert.equal(response.status,200);assert.ok(state.rows.some(row=>row.id==='m2'));assert.ok(!state.rows.some(row=>row.id==='m1'));
});
console.log(`${passed} isolated API checks passed. No database was accessed.`);
