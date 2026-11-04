import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
const require=createRequire(import.meta.url)
const ts=require('typescript')
const folder=mkdtempSync(join(tmpdir(),'minesafe-system-tests-'))
writeFileSync(join(folder,'package.json'),'{"type":"commonjs"}')
for(const name of ['types','session','system/types','system/model','system/validation','system/repository','system/io']){
  const output=ts.transpileModule(readFileSync(new URL('../src/'+name+'.ts',import.meta.url),'utf8'),
    {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
  mkdirSync(dirname(join(folder,name+'.js')),{recursive:true})
  writeFileSync(join(folder,name+'.js'),output)
}
const m=require(join(folder,'system/model.js')),v=require(join(folder,'system/validation.js'))
const r=require(join(folder,'system/repository.js')),old=require(join(folder,'session.js'))
const io=require(join(folder,'system/io.js'))
after(()=>rmSync(folder,{recursive:true,force:true}))
const participant={id:'person-1',name:'Rutendo Moyo',employeeNumber:'EMP-01',department:'Operations'}
function scenario(){return {...m.makeScenario('fire',0),id:'scenario-test',code:'TEST-01',status:'ready'}}
function running(automatic=false){return m.startTraining(m.newTraining(scenario(),[participant],'Instructor Sean',automatic,0),1000)}
function arrive(s,to,now){
  s=m.moveTrainee(s,to,now)
  assert.ok(s.movement,'movement should start')
  const at=s.resumedAt+s.movement.endMs-s.elapsedMs
  return {s:m.tickTraining(s,at),now:at}
}
function completed(){
  let s=running(),now=2000
  s=m.nextPhase(s,now)
  for(const action of ['acknowledge','report','reject'])s=m.takeAction(s,action,now+=100)
  for(const node of ['junction','turn','cross','refuge'])({s,now}=arrive(s,node,now+100))
  return s
}

test('fresh workspace contains valid ready scenarios and no fabricated training results',()=>{
  const d=m.initialData()
  assert.doesNotThrow(()=>v.validateData(d))
  assert.equal(d.sessions.length,0);assert.equal(d.trainees.length,0);assert.equal(d.incidents.length,0)
  assert.equal(d.scenarios.length,3)
})
test('starting requires an instructor and real participant assignment',()=>{
  const s=m.newTraining(scenario(),[],'',false,0)
  assert.equal(m.startTraining(s,1000).status,'ready')
})
test('scenario and participant edits cannot rewrite an existing session snapshot',()=>{
  const source=scenario(),person={...participant}
  const s=m.newTraining(source,[person],'Instructor',false,0)
  source.area='Edited area';source.requiredActions.pop();person.name='Changed'
  assert.notEqual(s.scenario.area,source.area)
  assert.equal(s.participants[0].name,'Rutendo Moyo')
  assert.equal(s.scenario.requiredActions.length,4)
})
test('phase advances and instructor observations cannot award trainee points',()=>{
  let s=running()
  s=m.nextPhase(s,2000);s=m.nextPhase(s,3000)
  for(const key of ['hazard','route','alternate'])s=m.recordObservation(s,key,true,3500)
  assert.equal(m.drillScore(s),0);assert.equal(s.status,'running')
  assert.ok(Object.values(s.decisions).every(n=>n===null))
})
test('active time and interpolated movement freeze during pause',()=>{
  let s=running()
  s=m.moveTrainee(s,'junction',2000)
  s=m.pauseTraining(s,2500)
  const position=m.playerPosition(s,2500)
  assert.deepEqual(m.playerPosition(s,99999),position)
  assert.equal(m.activeTime(s,99999),1500)
  s=m.startTraining(s,100000)
  assert.equal(m.activeTime(s,100500),2000)
})
test('non-connected waypoint requests cannot teleport the trainee',()=>{
  const s=running()
  assert.deepEqual(m.moveTrainee(s,'refuge',2000),s)
})
test('withdrawn route attempts are stopped, logged and penalised',()=>{
  let s=running(),now=2000
  ;({s,now}=arrive(s,'junction',now))
  s=m.nextPhase(s,now+100)
  s=m.moveTrainee(s,'loader',now+200)
  assert.equal(s.node,'junction');assert.equal(s.movement,null);assert.equal(s.mistakes,1)
  assert.equal(s.events.at(-1).success,false)
})
test('a route withdrawal interrupts movement without recording an unsafe arrival',()=>{
  let s=running(),now=2000
  ;({s,now}=arrive(s,'junction',now))
  s=m.moveTrainee(s,'loader',now+100)
  s=m.nextPhase(s,now+200)
  assert.equal(s.node,'junction');assert.equal(s.movement,null)
  assert.equal(s.mistakes,0)
  assert.ok(!s.events.some(e=>e.title==='Reached Loader bay'))
})
test('timed route events retain their intended order after a delayed tick',()=>{
  let s=running(true)
  s=m.tickTraining(s,20000)
  assert.equal(s.phase,'reroute')
  const events=s.events.filter(e=>e.kind==='phase')
  assert.deepEqual(events.map(e=>e.atMs),[0,8000,16000])
})
test('completed movement is processed before a later scheduled route withdrawal',()=>{
  let s=running(true)
  s=m.moveTrainee(s,'junction',1100)
  s=m.tickTraining(s,15000)
  assert.equal(s.node,'junction')
  assert.equal(s.phase,'blocked')
  assert.ok(s.events.find(e=>e.title==='Reached Main junction').atMs<8000)
})
test('connected movement reaches refuge and completion uses actual required actions',()=>{
  const s=completed()
  assert.equal(s.node,'refuge');assert.equal(s.status,'complete');assert.equal(s.outcome,'Refuge reached')
  assert.equal(m.drillScore(s),100)
  assert.equal(m.activeTime(s,9999999),s.elapsedMs)
  assert.ok(s.events.some(e=>e.action==='refuge'&&e.success))
})
test('refuge position alone does not satisfy missing training actions',()=>{
  let s=running(),now=2000
  for(const node of ['junction','turn','cross','refuge'])({s,now}=arrive(s,node,now+100))
  assert.equal(s.node,'refuge');assert.equal(s.status,'running')
  assert.equal(m.drillScore(s),25)
  s=m.nextPhase(s,now+100)
  for(const action of ['acknowledge','report','reject'])s=m.takeAction(s,action,now+=200)
  assert.equal(s.status,'complete')
})
test('early endings and time limits preserve incomplete objectives',()=>{
  let s=m.finishTraining(running(),'Ended early',2300)
  assert.equal(s.outcome,'Ended early');assert.equal(m.drillScore(s),0)
  s=m.tickTraining(running(),1000000)
  assert.equal(s.outcome,'Time limit reached')
  assert.equal(s.elapsedMs,300000)
})
test('replay interpolates travel and does not mutate the saved record',()=>{
  const s=completed(),before=JSON.stringify(s)
  const movement=s.events.find(e=>e.movement).movement
  const view=m.replayState(s,(movement.startMs+movement.endMs)/2)
  assert.ok(view.position[0]>-6.3&&view.position[0]<0)
  assert.equal(m.replayState(s,-1).phase,'idle')
  assert.deepEqual(m.replayState(s,s.elapsedMs).position,m.nodePoint('refuge'))
  assert.equal(JSON.stringify(s),before)
})
test('incident conversion carries the source and creates an editable draft',()=>{
  const i={id:'inc-1',reference:'INC-01',title:'Loader bay smoke',occurredOn:'2026-11-04',area:'North section',
    hazard:'fire',category:'Near miss',description:'Smoke was seen near a loader bay.',lessons:'Reassess the available route.',source:'Internal report',reviewed:true,archived:false,createdAt:1,updatedAt:1}
  const s=m.scenarioFromIncident(i,2)
  assert.equal(s.status,'draft');assert.equal(s.area,i.area);assert.equal(s.brief,i.description)
  assert.equal(s.sourceIncident.reference,i.reference);assert.equal(s.instructorNotes,i.lessons)
  i.lessons='Edited later'
  assert.notEqual(s.sourceIncident.lessons,i.lessons)
})
test('invalid timing, blocked alternate routes and unsupported assessment keys are rejected',()=>{
  assert.ok(m.scenarioErrors({...scenario(),alternateSeconds:1}).length)
  assert.ok(m.scenarioErrors({...scenario(),blockedEdges:['route-b1']}).length)
  assert.throws(()=>v.validateScenario({...scenario(),requiredActions:['anything','refuge']}))
})
test('a starting point trapped by the configured closure cannot be published',()=>{
  assert.ok(m.scenarioErrors({...scenario(),startingNode:'loader'}).some(message=>message.includes('connected path')))
  assert.equal(m.scenarioErrors({...scenario(),startingNode:'loader',blockedEdges:['route-a2']}).length,0)
})
test('scene route sections use the assessed graph and only the configured closure',()=>{
  const s={...scenario(),blockedEdges:['route-a2']}
  assert.ok(m.sceneRoutes(s,'alarm').every(edge=>!edge.blocked))
  const routes=m.sceneRoutes(s,'blocked')
  assert.deepEqual(routes.filter(edge=>edge.blocked).map(edge=>edge.id),['route-a2'])
  assert.deepEqual(routes.find(edge=>edge.id==='route-b3').to,m.nodePoint('refuge'))
})
test('malformed movement and incomplete refuge results cannot be imported',()=>{
  const s=completed(),bad=m.copy(s)
  bad.decisions.report=null
  assert.throws(()=>v.validateSession(bad),/required trainee actions/)
  const teleport=m.copy(s)
  teleport.events.find(event=>event.movement).movement.to='refuge'
  assert.throws(()=>v.validateSession(teleport),/connected waypoints/)
})
test('backup parsing rejects wrong formats, broken JSON and duplicate record IDs',()=>{
  assert.throws(()=>v.parseBackup('{broken'))
  assert.throws(()=>v.parseBackup(JSON.stringify({format:'other',data:m.initialData()})))
  const d=m.initialData();d.scenarios.push({...d.scenarios[0]})
  assert.throws(()=>v.parseBackup(JSON.stringify({format:'minesafe.workspace.v2',data:d})),/Duplicate/)
})
test('a complete workspace with drill history round-trips through backup validation',()=>{
  const d=m.initialData(),s=completed()
  d.scenarios.push(s.scenario);d.sessions.push(s);d.activeSessionId=s.id
  const parsed=v.parseBackup(JSON.stringify({format:'minesafe.workspace.v2',data:d}))
  assert.equal(parsed.sessions[0].outcome,'Refuge reached')
  assert.equal(m.drillScore(parsed.sessions[0]),100)
})
test('backup merges keep existing records and add new records idempotently',()=>{
  const d=m.initialData(),incoming=m.copy(d)
  incoming.scenarios[0].title='Changed in backup'
  const custom={...scenario(),id:'custom'}
  incoming.scenarios.push(custom)
  const first=v.mergeData(d,incoming)
  assert.equal(first.added,1)
  assert.notEqual(first.data.scenarios[0].title,'Changed in backup')
  assert.equal(v.mergeData(first.data,incoming).added,0)
})
test('duplicate employee numbers and invalid incident dates are rejected',()=>{
  const t={...participant,role:'Miner',notes:'',active:true,createdAt:0,updatedAt:0}
  const d=m.initialData();d.trainees=[t,{...t,id:'other',employeeNumber:'emp-01'}]
  assert.throws(()=>v.validateData(d),/unique/)
  assert.throws(()=>v.validateIncident({id:'i',reference:'INC-1',title:'Event',area:'A',description:'Description',lessons:'',source:'',hazard:'fire',category:'Incident',reviewed:false,archived:false,createdAt:0,updatedAt:0,occurredOn:'2026-02-31'}),/valid incident date/)
})
test('earlier records migrate once without inventing scores or losing the original export',()=>{
  let previous=old.startOrPause(old.newSession('fire',undefined,0),1000)
  previous=old.observe(previous,'hazard',true,1500)
  previous=old.startOrPause(previous,2000)
  const data=r.migrateEarlierWorkspace(m.initialData(),JSON.stringify({session:previous,recent:[previous]}))
  assert.equal(data.sessions.length,1);assert.equal(data.sessions[0].id,previous.id)
  assert.equal(m.drillScore(data.sessions[0]),null)
  assert.deepEqual(data.sessions[0].earlierRecord,previous)
  assert.equal(m.startTraining(data.sessions[0],4000).status,'paused')
})
test('bad earlier data cannot leave partially migrated records',()=>{
  const previous=old.startOrPause(old.newSession('fire',undefined,0),0)
  previous.observations.hazard=99999
  const original=m.initialData(),copy=m.copy(original)
  const result=r.migrateEarlierWorkspace(original,JSON.stringify({session:previous,recent:[]}))
  assert.deepEqual(result,copy);assert.deepEqual(original,copy)
})
test('CSV reports escape formula-like text and retain valid quotes and commas',()=>{
  for(const value of ['=SUM(A1:A2)','+cmd','-1+1','@call','  =1+1','\t=1+1'])assert.ok(m.csvCell(value).startsWith('"\''))
  const s=completed();s.notes='Reviewed, with "examples".'
  const csv=io.sessionsCsv([s])
  assert.ok(csv.includes('"Reviewed, with ""examples""."'))
  assert.ok(csv.includes('Rutendo Moyo'))
})
