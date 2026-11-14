export const WORLD_WIDTH=3200,WORLD_HEIGHT=2240,TILE=64;
export const WORLD_START={x:640,y:660};
export const LANDMARKS=[
{id:'merchant',kind:'service',scene:'Merchant',name:'Mira’s Caravan',x:860,y:540,prop:'house'},
{id:'forge',kind:'service',scene:'Forge',name:'The Gilded Forge',x:390,y:495,prop:'forge'},
{id:'camp',kind:'service',scene:'Party',name:'Companion Camp',x:565,y:875,prop:'campfire'},
{id:'notice',kind:'notice',name:'The Village Noticeboard',x:725,y:735,prop:'sign'},
{id:'duel',kind:'duel',name:'The Duel Garden',x:1060,y:865,prop:'banner'},
{id:'shrine1',kind:'shrine',name:'Shrine of the First Leaf',x:1460,y:395,prop:'shrine'},
{id:'shrine2',kind:'shrine',name:'The Moonwell',x:2680,y:525,prop:'shrine'},
{id:'shrine3',kind:'puzzle',name:'The Three Sisters',x:2650,y:1740,prop:'shrine'},
{id:'chest1',kind:'chest',name:'A Forgotten Satchel',x:1100,y:280,card:'gust',gold:35},
{id:'chest2',kind:'chest',name:'Bramble Cache',x:1550,y:1540,card:'poison',gold:40},
{id:'chest3',kind:'chest',name:'A Wanderer’s Gift',x:330,y:1450,card:'bloom',gold:30},
{id:'chest4',kind:'chest',name:'Frostbound Chest',x:2550,y:230,card:'slow',gold:55},
{id:'chest5',kind:'chest',name:'The River’s Secret',x:1810,y:1610,card:'tidal',gold:40},
{id:'chest6',kind:'chest',name:'The Old Warden’s Hoard',x:2850,y:1940,card:'thorns',gold:60},
{id:'chest7',kind:'chest',name:'A Star in a Bottle',x:2230,y:1050,card:'focus',gold:35},
{id:'chest8',kind:'chest',name:'The Queen’s Keepsake',x:2960,y:1340,card:'meteor',gold:70},
{id:'herb1',kind:'herb',name:'Moonpetal',x:1150,y:1130},
{id:'herb2',kind:'herb',name:'Moonpetal',x:2100,y:1570},
{id:'herb3',kind:'herb',name:'Moonpetal',x:2550,y:1100},
{id:'m1',kind:'mission',name:'A Page Unwritten',x:1120,y:620,mission:'m1'},
{id:'m2',kind:'mission',name:'Bramble Crossing',x:1400,y:1010,mission:'m2'},
{id:'m3',kind:'mission',name:'The Scarlet Duel',x:1850,y:450,mission:'m3'},
{id:'m4',kind:'mission',name:'Frozen Memories',x:2270,y:375,mission:'m4'},
{id:'m5',kind:'mission',name:'The Ember Garden',x:2350,y:1410,mission:'m5'},
{id:'m6',kind:'mission',name:'A Whisper in the Glass',x:2820,y:730,mission:'m6'},
{id:'m7',kind:'mission',name:'Moonless Road',x:2080,y:1880,mission:'m7'},
{id:'m8',kind:'mission',name:'The Last Gate',x:2560,y:2000,mission:'m8'},
{id:'m9',kind:'mission',name:'The Thorn Queen',x:2900,y:1660,mission:'m9'},
];
export const WILD_SPAWNS=[{id:'wild1',x:1300,y:810,type:'hex'},{id:'wild2',x:1550,y:610,type:'spark'},{id:'wild3',x:360,y:1220,type:'hex'},{id:'wild4',x:1910,y:1570,type:'flare'},{id:'wild5',x:2450,y:670,type:'frost'},{id:'wild6',x:2740,y:1210,type:'guard'}];
export const PATHS=[[[330,610],[1000,610],[1420,610],[1850,450],[2300,375],[2800,530]],[[640,400],[640,850],[1000,880],[1400,1010],[1400,1460],[1830,1660],[2100,1900],[2560,2000],[2880,1700]],[[2320,450],[2320,1040],[2500,1400],[2900,1660]],[[640,850],[350,1450]],[[1400,1460],[2200,1460],[2800,1300]]];
export const LANDMARK_TRAILS=LANDMARKS.map(p=>{let best=null,minimum=Infinity;for(const line of PATHS)for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/(dx*dx+dy*dy))),q=[a[0]+dx*t,a[1]+dy*t],d=Math.hypot(p.x-q[0],p.y-q[1]);if(d<minimum){minimum=d;best=q;}}return{kind:p.kind,line:[best,[p.x,p.y]]};}).filter(t=>Math.hypot(t.line[0][0]-t.line[1][0],t.line[0][1]-t.line[1][1])>25);
export function worldArea(x,y){if(x<1250&&y<1070)return 'Willowbrook Village';if(x>2020&&y<950)return 'Frostfall Reach';if(x>2000&&y>1350)return 'The Hollow Court';return 'The Elderwood';}
export function makeWorldGeometry(){const obstacles=[{kind:'rect',x:730,y:330,w:265,h:145},{kind:'rect',x:280,y:300,w:225,h:140},{kind:'rect',x:465,y:990,w:250,h:145},{kind:'rect',x:1620,y:830,w:440,h:450,water:true},{kind:'rect',x:55,y:75,w:3090,h:30},{kind:'rect',x:55,y:2130,w:3090,h:40}];const trees=[];let seed=891;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<880;i++){const x=110+random()*2980,y=130+random()*1940;if(x>230&&x<1250&&y>250&&y<1070)continue;if(LANDMARKS.some(p=>Math.hypot(p.x-x,p.y-y)<125)||WILD_SPAWNS.some(p=>Math.hypot(p.x-x,p.y-y)<95))continue;if(LANDMARK_TRAILS.some(t=>distanceToSegment(x,y,...t.line[0],...t.line[1])<62))continue;if(PATHS.some(line=>line.slice(1).some((p,j)=>distanceToSegment(x,y,line[j][0],line[j][1],p[0],p[1])<90)))continue;if(obstacles.some(o=>o.water&&x>o.x-80&&x<o.x+o.w+80&&y>o.y-80&&y<o.y+o.h+80))continue;if(trees.some(t=>Math.hypot(t.x-x,t.y-y)<74))continue;trees.push({x,y,size:.72+random()*.48});obstacles.push({kind:'circle',x,y,r:22});}return{obstacles,trees};}
export function distanceToSegment(x,y,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy;const t=l?Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/l)):0;return Math.hypot(x-ax-t*dx,y-ay-t*dy);}
export function isWalkable(x,y,obstacles,radius=14){if(x<80||y<110||x>WORLD_WIDTH-80||y>WORLD_HEIGHT-95)return false;return !obstacles.some(o=>o.kind==='circle'?Math.hypot(x-o.x,y-o.y)<o.r+radius:x+radius>o.x&&x-radius<o.x+o.w&&y+radius>o.y&&y-radius<o.y+o.h);}
export function safeWorldPosition(x,y,obstacles){if(isWalkable(x,y,obstacles))return{x,y};for(let radius=24;radius<=600;radius+=24)for(let a=0;a<16;a++){const angle=a*Math.PI/8,px=x+Math.cos(angle)*radius,py=y+Math.sin(angle)*radius;if(isWalkable(px,py,obstacles))return{x:px,y:py};}return{...WORLD_START};}
export function nearestLandmark(x,y,maxDistance=92){let found=null,distance=maxDistance;for(const p of LANDMARKS){const d=Math.hypot(p.x-x,p.y-y);if(d<distance){distance=d;found=p;}}return found;}
export function freshWorld(){return{x:WORLD_START.x,y:WORLD_START.y,opened:[],gathered:[],shrines:[],visited:['Willowbrook Village'],introduced:false,puzzle:[],wildDefeated:[]};}
export function validWorld(w){return w&&Number.isFinite(w.x)&&Number.isFinite(w.y)&&w.x>=0&&w.x<=WORLD_WIDTH&&w.y>=0&&w.y<=WORLD_HEIGHT&&['opened','gathered','shrines','visited','puzzle','wildDefeated'].every(k=>Array.isArray(w[k])&&w[k].length<=80&&w[k].every(id=>typeof id==='string'&&id.length<80))&&typeof w.introduced==='boolean';}
export class WorldWalker{
 constructor(x,y,obstacles){this.x=x;this.y=y;this.obstacles=obstacles;this.facing='south';this.moving=false;this.running=false;this.path=[];}
 setPath(points){this.path=points.map(p=>({...p}));}
 update(dt,{dx=0,dy=0,run=false}={}){dt=Math.max(0,Math.min(.05,dt));if(dx||dy)this.path=[];else if(this.path.length){const p=this.path[0],distance=Math.hypot(p.x-this.x,p.y-this.y);if(distance<10)this.path.shift();else{dx=(p.x-this.x)/distance;dy=(p.y-this.y)/distance;}}const len=Math.hypot(dx,dy);this.moving=len>.01;this.running=this.moving&&run;if(!this.moving)return;dx/=len;dy/=len;if(Math.abs(dx)>Math.abs(dy)*.65)this.facing=dx<0?'west':'east';else this.facing=dy<0?'north':'south';const speed=this.running?248:145;const nx=this.x+dx*speed*dt,ny=this.y+dy*speed*dt;let moved=false;if(isWalkable(nx,this.y,this.obstacles)){this.x=nx;moved=true;}if(isWalkable(this.x,ny,this.obstacles)){this.y=ny;moved=true;}if(!moved){this.path=[];this.moving=false;this.running=false;}}
}
export function findPath(start,end,obstacles){const step=48,cols=Math.ceil(WORLD_WIDTH/step),rows=Math.ceil(WORLD_HEIGHT/step),key=(x,y)=>y*cols+x;const sx=Math.floor(start.x/step),sy=Math.floor(start.y/step),ex=Math.floor(end.x/step),ey=Math.floor(end.y/step);if(!isWalkable(end.x,end.y,obstacles))return[];const open=[{x:sx,y:sy,g:0,f:0}],visited=new Set(),came=new Map(),cost=new Map([[key(sx,sy),0]]);let goal=null;for(let iteration=0;open.length&&iteration<4500;iteration++){open.sort((a,b)=>a.f-b.f);const p=open.shift(),pk=key(p.x,p.y);if(visited.has(pk))continue;visited.add(pk);if(p.x===ex&&p.y===ey){goal=p;break;}for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=p.x+dx,y=p.y+dy,k=key(x,y),g=p.g+1;if(x<0||y<0||x>=cols||y>=rows||visited.has(k)||!isWalkable((x+.5)*step,(y+.5)*step,obstacles))continue;if(g<(cost.get(k)??Infinity)){cost.set(k,g);came.set(k,pk);open.push({x,y,g,f:g+Math.abs(ex-x)+Math.abs(ey-y)});}}}if(!goal)return[];const path=[];let k=key(goal.x,goal.y);while(k!==key(sx,sy)){path.push({x:(k%cols+.5)*step,y:(Math.floor(k/cols)+.5)*step});k=came.get(k);if(k===undefined)return[];}path.reverse();path.push({x:end.x,y:end.y});return path;}
