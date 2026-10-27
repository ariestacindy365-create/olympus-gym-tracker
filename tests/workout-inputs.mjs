import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('..', import.meta.url));
async function load(entry, plugins = []) {
  const built = await build({ entryPoints: [entry], absWorkingDir: root, bundle: true, platform: 'node', format: 'esm', write: false, plugins });
  return import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
}
const {isNoWeightExercise, shouldShowWeight} = await load('src/lib/bodyweight.ts');
for (const [name, equipment] of [ ['Bench Dips'], ['Bench Dips', 'Bodyweight'], ['Banded Chin Up'], ['Banded Overhead Press'], ['Band Pull Apart'], ['Pull Up'], ['Push Up'], ['Squat', 'Resistance Bands'], ['Glute Bridge', 'Bodyweight / Band'] ]) {
  assert.equal(isNoWeightExercise(name, equipment), true, name);
}
for (const [name, equipment] of [['DB Bench Press'], ['Barbell Squat'], ['Weighted Pull Up'], ['Squat', 'Barbell']]) {
  assert.equal(isNoWeightExercise(name, equipment), false, name);
}
assert.equal(shouldShowWeight(true, false, 0, [{w:'0',saved:{weight:0}}]), false);
assert.equal(shouldShowWeight(true, true, 0, []), true);
assert.equal(shouldShowWeight(true, false, 10, []), true);
assert.equal(shouldShowWeight(true, false, 0, [{w:'2,5',saved:null}]), true);
assert.equal(shouldShowWeight(true, false, 0, [{w:'',saved:{weight:5}}]), true);
assert.equal(shouldShowWeight(false, false, 0, []), true);
const {workoutDurationSchema} = await load('src/lib/workoutDuration.ts');
assert.equal(workoutDurationSchema.parse(undefined),60);
for (const minutes of [15,30,45,60,75,90,105,120]) assert.equal(workoutDurationSchema.parse(minutes),minutes);
for (const minutes of [0,-1,121,1.5,'60']) assert.equal(workoutDurationSchema.safeParse(minutes).success,false);

const state = {user:{id:'member-a',role:'MEMBER'}, summary:{totalSets:3,totalVolume:0,prCount:0,durationSec:180,lines:[]}, saved:null};
globalThis.__workoutInputTest = state;
state.prisma = {
  workout: {
    upsert: async ({create}) => {state.saved=create;return create;},
    aggregate: async () => ({_sum:{durationSec:state.saved.durationSec}}),
  },
  setEntry: {groupBy: async () => [{}],findMany: async () => []},
};
const plugin = {name:'isolated-workout-dependencies', setup(b) {
  b.onResolve({filter:/^(@\/lib\/(auth|prisma|workout|workoutSummary)|@\/generated\/prisma\/client|next\/server)$/}, args => ({path:args.path,namespace:'stub'}));
  b.onLoad({filter:/.*/,namespace:'stub'}, ({path}) => ({loader:'js',contents:
    path === '@/lib/auth' ? 'export const getCurrentUser=async()=>globalThis.__workoutInputTest.user;' :
    path === '@/lib/prisma' ? 'export const prisma=globalThis.__workoutInputTest.prisma;' :
    path === '@/lib/workoutSummary' ? 'export const summarizeDay=async()=>({...globalThis.__workoutInputTest.summary}); export const summarizeSets=async()=>({...globalThis.__workoutInputTest.summary}); export const musclesByExerciseName=async()=>new Map();' :
    path === '@/lib/workout' ? 'export const BACKFILL_DAYS=3;export const loggableDateKey=(date)=>new Date(date??"2026-10-27");' :
    path === '@/generated/prisma/client' ? 'export const Role={MEMBER:"MEMBER"};export const WorkoutVisibility={ALL:"ALL",PRIVATE:"PRIVATE",COACH:"COACH"};' :
    'export const NextResponse={json:(body,options)=>Response.json(body,options)};'
  }));
}};
const {POST} = await load('src/app/api/member/workouts/route.ts',[plugin]);
async function save(body) { return POST(new Request('http://localhost/test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'Latihan',visibility:'PRIVATE',...body})})); }
for (const date of [undefined,'2026-10-26']) {
  for (const minutes of [undefined,30,90,120]) {
    const response=await save({date,durationMin:minutes});assert.equal(response.status,200);
    const data=await response.json();const expected=(minutes??60)*60;
    assert.equal(state.saved.durationSec,expected);assert.equal(data.summary.durationSec,expected);assert.equal(data.totals.durationSec,expected);
  }
}
assert.equal((await save({durationMin:999})).status,400);
state.user=null;assert.equal((await save({durationMin:60})).status,401);
state.prisma.workout.findMany = async () => [{...state.saved,id:'post',durationManual:true,durationSec:5400,memberId:'member-a',member:{name:'Member'},workoutDate:new Date('2026-10-27'),createdAt:new Date('2026-10-27T08:00:00Z'),updatedAt:new Date('2026-10-27T08:00:00Z'),kudos:[],_count:{comments:0}}];
const {getFeed} = await load('src/lib/feed.ts',[plugin]);
const posts = await getFeed({id:'member-a',role:'MEMBER'});
assert.equal(posts[0].durationSec,5400,'Feed keeps chosen duration instead of recalculating from set timestamps');
console.log('PASS banded/bodyweight detection, + kg overrides, stored weights, duration validation, and session duration persistence for today/backfills (isolated API).');
