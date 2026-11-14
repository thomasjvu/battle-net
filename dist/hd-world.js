import {WALK_SPEED,SPRINT_SPEED} from './movement.js';
import{REGIONS,regionId,regionContains,regionHeight}from'./regions.js';
import{DECOR,decorCells,HOME_GRID}from'./home.js';
import{WORLD_WIDTH,WORLD_HEIGHT,WORLD_START,LANDMARKS,isWalkable}from'./world.js';
export const FLOOR_TILE=32, WORLD_SCALE=64;
const clamp=t=>Math.max(0,Math.min(1,t));
export function floorHeight(x,z){return .5+2.4*clamp((x-1216)/224)+2.4*clamp((x-1984)/224)+1.8*clamp((z-1376)/224);}
export function deckName(x,z){const h=floorHeight(x,z);return h<1?'HOME NET · LOWER DECK':h<3.2?'CENTRAL NET · MID DECK':h<5.6?'SKY NET · UPPER DECK':'DARK NET · HIGH DECK';}
export const TOWN_GATE = {id:'gate',kind:'gate',name:'Dungeon Gate',x:970,y:610};
export const DUNGEON_EXIT = {id:'exit',kind:'gate',name:'Return to Town',x:960,y:610};
export function zoneLandmarks(zone) {return zone ? REGIONS[regionId(zone)].landmarks : LANDMARKS;}
export class FloorGrid{
 constructor(zone){this.zone=zone?regionId(zone):null;this.cols=Math.ceil(WORLD_WIDTH/FLOOR_TILE);this.rows=Math.ceil(WORLD_HEIGHT/FLOOR_TILE);this.cells=new Set();const source=[];source.network=true;for(let z=0;z<this.rows;z++)for(let x=0;x<this.cols;x++){const wx=(x+.5)*FLOOR_TILE,wz=(z+.5)*FLOOR_TILE;if(this.zone?regionContains(this.zone,wx,wz):isWalkable(wx,wz,source,0))this.cells.add(this.key(x,z));}this.props=zoneLandmarks(this.zone).filter(p=>p.kind!=='herb').map(p=>({x:p.x,z:p.y,r:p.kind==='mission'?15:18}));this.decor=[];}
 height(x,z){return this.zone?regionHeight(this.zone,x,z):floorHeight(x,z);}
 setDecor(base){this.decor=base.placements.filter(p=>!DECOR[p.type].walkThrough).flatMap(p=>decorCells(p).map(c=>({x:HOME_GRID.x+c.col*64,z:HOME_GRID.y+c.row*64,r:24})));}

 key(x,z){return z*this.cols+x;}
 has(x,z){return x>=0&&z>=0&&x<this.cols&&z<this.rows&&this.cells.has(this.key(x,z));}
 surface(x,z){return this.has(Math.floor(x/FLOOR_TILE),Math.floor(z/FLOOR_TILE))?this.height(x,z):null;}
 walkable(x,z,r=10){if(![[0,0],[-r,-r],[r,-r],[-r,r],[r,r]].every(([dx,dz])=>this.surface(x+dx,z+dz)!==null))return false;return ![...this.props,...this.decor].some(p=>Math.hypot(x-p.x,z-p.z)<p.r+r);}
 safePosition(x,z){if(this.walkable(x,z))return{x,y:z};let found=null,best=Infinity;for(const key of this.cells){const px=(key%this.cols+.5)*FLOOR_TILE,pz=(Math.floor(key/this.cols)+.5)*FLOOR_TILE,d=(px-x)**2+(pz-z)**2;if(d<best&&this.walkable(px,pz)){best=d;found={x:px,y:pz};}}return found??{...WORLD_START};}
 path(start,end){const target=this.safePosition(end.x,end.y);const sx=Math.floor(start.x/FLOOR_TILE),sz=Math.floor(start.y/FLOOR_TILE),ex=Math.floor(target.x/FLOOR_TILE),ez=Math.floor(target.y/FLOOR_TILE),first=this.key(sx,sz),last=this.key(ex,ez);const open=[{x:sx,z:sz,g:0,f:0}],visited=new Set(),cost=new Map([[first,0]]),came=new Map();let reached=false;
  for(let i=0;open.length&&i<9000;i++){open.sort((a,b)=>a.f-b.f);const p=open.shift(),pk=this.key(p.x,p.z);if(visited.has(pk))continue;visited.add(pk);if(pk===last){reached=true;break;}for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const x=p.x+dx,z=p.z+dz,k=this.key(x,z),wx=(x+.5)*FLOOR_TILE,wz=(z+.5)*FLOOR_TILE;if(!this.has(x,z)||visited.has(k)||!this.walkable(wx,wz))continue;if(dx&&dz&&(!this.walkable((p.x+.5)*FLOOR_TILE,wz)||!this.walkable(wx,(p.z+.5)*FLOOR_TILE)))continue;const vertical=(this.height(wx,wz)-this.height((p.x+.5)*FLOOR_TILE,(p.z+.5)*FLOOR_TILE))*WORLD_SCALE;const g=p.g+Math.hypot(dx*FLOOR_TILE,dz*FLOOR_TILE,vertical)/FLOOR_TILE;if(g<(cost.get(k)??Infinity)){cost.set(k,g);came.set(k,pk);open.push({x,z,g,f:g+Math.hypot(ex-x,ez-z)});}}}
  if(!reached)return[];const path=[];let k=last;while(k!==first){path.push({x:(k%this.cols+.5)*FLOOR_TILE,y:(Math.floor(k/this.cols)+.5)*FLOOR_TILE});k=came.get(k);if(k===undefined)return[];}path.reverse();path.push(target);return path;
 }
}
export class FloorWalker{
 constructor(x,z,grid){this.grid=grid;const p=grid.safePosition(x,z);this.x=p.x;this.y=p.y;this.height=this.grid.height(this.x,this.y);this.path=[];this.facing='south';this.moving=false;this.running=false;}
 setPath(path){this.path=path.map(p=>({...p}));}
 update(dt,{dx=0,dy=0,run=false}={}){dt=Math.max(0,Math.min(.05,dt));if(dx||dy)this.path=[];else if(this.path.length){const next=this.path[0],d=Math.hypot(next.x-this.x,next.y-this.y);if(d<7)this.path.shift();else{dx=(next.x-this.x)/d;dy=(next.y-this.y)/d;}}const length=Math.hypot(dx,dy);this.moving=length>.01;this.running=this.moving&&run;if(!this.moving)return;dx/=length;dy/=length;const gradientX=(this.grid.height(this.x+dx,this.y+dy)-this.height)*WORLD_SCALE;const step=(this.running?SPRINT_SPEED:WALK_SPEED)*dt/Math.sqrt(1+gradientX*gradientX);const nx=this.x+dx*step,nz=this.y+dy*step;let moved=false;if(Math.abs(dx)>1e-6&&this.grid.walkable(nx,this.y)){this.x=nx;moved=true;}if(Math.abs(dy)>1e-6&&this.grid.walkable(this.x,nz)){this.y=nz;moved=true;}if(!moved){this.path=[];this.moving=false;this.running=false;}this.height=this.grid.height(this.x,this.y);}
}
