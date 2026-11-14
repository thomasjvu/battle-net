import{test}from'node:test';import assert from'node:assert/strict';import{FloorGrid,FloorWalker,floorHeight}from'../dist/hd-world.js';import{LANDMARKS,WORLD_START}from'../dist/world.js';
test('3D floors have distinct decks joined by continuous ramps',()=>{assert.equal(floorHeight(600,600),.5);assert.ok(floorHeight(1600,600)>2.8);assert.ok(floorHeight(2500,600)>5);for(let x=1200;x<1500;x++)assert.ok(Math.abs(floorHeight(x+1,600)-floorHeight(x,600))<.02);});
test('floor geometry and collision agree; void and terminal bases block movement',()=>{const g=new FloorGrid();assert.equal(g.surface(20,20),null);assert.equal(g.walkable(20,20),false);assert.equal(g.walkable(860,540),false);assert.ok(g.walkable(WORLD_START.x,WORLD_START.y));});
test('every existing objective is reachable on physical floor tiles',()=>{const g=new FloorGrid();for(const p of LANDMARKS){const path=g.path(WORLD_START,{x:p.x,y:p.y});assert.ok(path.length,p.id);assert.ok(path.every(q=>g.walkable(q.x,q.y)),p.id);}});
test('walker remains grounded, cannot leave a floor, and has unlimited sprint',()=>{const g=new FloorGrid(),w=new FloorWalker(640,660,g);for(let i=0;i<140;i++){w.update(.05,{dx:1,run:true});assert.ok(g.walkable(w.x,w.y));assert.equal(w.height,floorHeight(w.x,w.y));}assert.equal('stamina'in w,false);});
test('invalid saved positions move to real floor and path traversal climbs a ramp',()=>{const g=new FloorGrid(),w=new FloorWalker(20,20,g);assert.ok(g.walkable(w.x,w.y));const p=g.path({x:1120,y:610},{x:1600,y:610});assert.ok(p.length);const walker=new FloorWalker(1120,610,g);walker.setPath(p);for(let i=0;i<800&&walker.path.length;i++)walker.update(.05,{run:true});assert.ok(walker.height>2.5);});
import {EncounterSteps} from '../dist/encounters.js';
test('random encounters count distance traveled and pick enemies by dungeon depth',()=>{
 const steps=new EncounterSteps(()=>0);
 assert.equal(steps.walk(0,5),null);
 assert.equal(steps.walk(559,5),null);
 const deep=steps.walk(1,5);
 assert.deepEqual(deep.enemies,['guard','frost']);
 assert.equal(steps.walk(1,0),null);
 assert.deepEqual(steps.walk(559,0).enemies,['hex','spark']);
});

import {REGIONS,facing8} from '../dist/regions.js';
import {freshBase,placeDecor,removeDecor,validBase} from '../dist/home.js';

test('town links the base and all routes, and region landmarks are reachable',()=>{
 const destinations=REGIONS.town.landmarks.filter(p=>p.kind==='gate');
 assert.deepEqual(destinations.map(p=>p.target),['base','garden','aqueduct','archive']);
 for(const [id,region] of Object.entries(REGIONS)){
  const grid=new FloorGrid(id);
  assert.ok(grid.walkable(region.spawn.x,region.spawn.y),id);
  for(const p of region.landmarks){
   assert.notEqual(grid.surface(p.x,p.y),null,p.name);
   assert.ok(grid.path(region.spawn,p).length,p.name);
   if(p.kind==='gate')assert.ok(new FloorGrid(p.target).walkable(p.arrival.x,p.arrival.y),p.name);
  }
  if(!region.safe)assert.equal(region.landmarks.filter(p=>p.kind==='sealed').length,1);
 }
});

test('home placements enforce footprints, rotation, and collision after reload',()=>{
 const base=freshBase();
 const bench={type:'bench',col:2,row:3,rotation:1};
 assert.ok(placeDecor(base,bench).ok);
 assert.equal(placeDecor(base,{type:'lamp',col:2,row:4,rotation:0}).ok,false);
 assert.equal(placeDecor(base,{type:'pond',col:9,row:6,rotation:0}).ok,false);
 const restored=JSON.parse(JSON.stringify(base));
 assert.ok(validBase(restored));
 const grid=new FloorGrid('base');
 grid.setDecor(restored);
 assert.equal(grid.walkable(960,896),false);
 assert.ok(removeDecor(restored,2,4));
 grid.setDecor(restored);
 assert.ok(grid.walkable(960,896));
});

test('direction selection keeps diagonals when the camera rotates',()=>{
 assert.equal(facing8(1,-1),'northeast');
 assert.equal(facing8(-1,1),'southwest');
 assert.equal(facing8(1,0,Math.PI/4),'southeast');
 assert.equal(facing8(0,0),null);
});
