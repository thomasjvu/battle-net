export const DECOR={
 planter:{name:'Signal Planter',tokenId:'home_planter_signal',art:'signal-planter',rarity:'common',limit:6,w:1,h:1,color:0x96e6b4},
 lamp:{name:'Paper Moon Lamp',tokenId:'home_lamp_moon',art:'paper-moon-lamp',rarity:'common',limit:6,w:1,h:1,color:0xffdaa1},
 bench:{name:'Cloud Bench',tokenId:'home_bench_cloud',art:'cloud-bench',rarity:'uncommon',limit:3,w:2,h:1,color:0xc6ccf7},
 pond:{name:'Memory Pond',tokenId:'home_pond_memory',art:'memory-pond',rarity:'rare',limit:2,w:2,h:2,color:0x8fe0ec},
 rug:{name:'Starweave Rug',tokenId:'home_rug_starweave',art:'starweave-rug',rarity:'uncommon',limit:4,w:2,h:2,color:0xe5a9d1,walkThrough:true},
 sculpture:{name:'Orbit Sculpture',tokenId:'home_sculpture_orbit',art:'orbit-sculpture',rarity:'epic',limit:3,w:1,h:1,color:0xffcf8a}
};
export const DECOR_TOKEN_IDS=Object.values(DECOR).map(item=>item.tokenId);
export const DECOR_TOKEN_BY_ID=Object.fromEntries(Object.entries(DECOR).map(([type,item])=>[item.tokenId,{type,name:item.name,art:item.art,rarity:item.rarity,sprite:`assets/home/decor/sprites/${item.art}-v2.png`,media:`assets/home/decor/cards/${item.art}.png`} ]));
export const HOME_GRID={x:832,y:640,cols:10,rows:7,size:64};
const starterPlacements=[{type:'planter',col:0,row:0,rotation:0},{type:'lamp',col:9,row:0,rotation:0},{type:'bench',col:4,row:1,rotation:0}];
const starterStorage={planter:1,lamp:1,bench:1,pond:1,rug:1,sculpture:1};
export function normalizeBase(base){
 base.carried??=null;base.storage??={};
 for(const[type,item]of Object.entries(DECOR))if(!Number.isInteger(base.storage[type])){
  const placed=base.placements.filter(p=>p.type===type).length,carried=base.carried?.type===type?1:0;
  base.storage[type]=Math.min(starterStorage[type]??0,Math.max(0,item.limit-placed-carried));
 }
 return base;
}
export function freshBase(){const base={placements:starterPlacements.map(p=>({...p})),storage:{...starterStorage},carried:null};return normalizeBase(base);}
export function decorCells(p){const d=DECOR[p.type];if(!d)return[];const rotated=p.rotation%2,w=rotated?d.h:d.w,h=rotated?d.w:d.h;return Array.from({length:w*h},(_,i)=>({col:p.col+i%w,row:p.row+Math.floor(i/w)}));}
export function validBase(base){
 if(!base||!Array.isArray(base.placements)||base.placements.length>24)return false;
 const occupied=new Set(),counts={};
 for(const p of base.placements){if(!p||!Object.hasOwn(DECOR,p.type)||!Number.isInteger(p.col)||!Number.isInteger(p.row)||!Number.isInteger(p.rotation)||p.rotation<0||p.rotation>3)return false;if((counts[p.type]=(counts[p.type]??0)+1)>DECOR[p.type].limit)return false;for(const c of decorCells(p)){const key=c.col+','+c.row;if(c.col<0||c.col>=HOME_GRID.cols||c.row<0||c.row>=HOME_GRID.rows||occupied.has(key))return false;occupied.add(key);}}
 if(base.carried!==undefined&&base.carried!==null&&(!Object.hasOwn(DECOR,base.carried.type)||!Number.isInteger(base.carried.rotation)||base.carried.rotation<0||base.carried.rotation>3))return false;
 if(base.storage!==undefined){if(!base.storage||typeof base.storage!=='object'||Array.isArray(base.storage))return false;for(const[type,item]of Object.entries(DECOR)){const count=base.storage[type]??0,held=base.carried?.type===type?1:0;if(!Number.isInteger(count)||count<0||count+held+(counts[type]??0)>item.limit)return false;}}
 return true;
}
export function basePosition(p){const cells=decorCells(p);return{x:HOME_GRID.x+(Math.min(...cells.map(c=>c.col))+Math.max(...cells.map(c=>c.col)))*32,y:HOME_GRID.y+(Math.min(...cells.map(c=>c.row))+Math.max(...cells.map(c=>c.row)))*32};}
export function placeDecor(base,p,hero){const next={placements:[...base.placements,{...p}],storage:base.storage,carried:null};if(!validBase(next))return{ok:false,message:'No room here, or all copies are already placed.'};if(hero&&decorCells(p).some(c=>Math.hypot(HOME_GRID.x+c.col*64-hero.x,HOME_GRID.y+c.row*64-hero.y)<48))return{ok:false,message:'Move your Navi out of the placement area first.'};base.placements=next.placements;base.carried=null;return{ok:true};}
export function removeDecor(base,col,row){const i=base.placements.findIndex(p=>decorCells(p).some(c=>c.col===col&&c.row===row));if(i<0)return false;base.placements.splice(i,1);return true;}
