import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {retroShader} from './retro.js';
import {networkBackdrop} from './backdrop.js';
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {FLOOR_TILE,WORLD_SCALE} from '../../../dist/hd-world.js';
import {facing8} from '../../../dist/regions.js';
import {buildScenery,refreshDecor,setCarriedDecor as setCarriedDecorModel} from './scenery.js';
import {missionUnlocked,MISSIONS} from '../../../dist/core.js';

const S=WORLD_SCALE,T=FLOOR_TILE;
const floorPatterns = {
 town:['#79928e','#647e7a','#a2b3a2','#405953'],
 base:['#766d9e','#585675','#afa3c6','#3d3c5a'],
 garden:['#688472','#4c6c5d','#9ba77e','#354e47'],
 aqueduct:['#6589a8','#456b86','#89b3bf','#2d4c68'],
 archive:['#84718b','#635671','#b499a2','#42384e']
};
function tileTexture(theme){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
 const ctx=canvas.getContext('2d');
 const [border,body,bright,shadow]=floorPatterns[theme];
 const paint=(color,x,y,w,h)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
 paint(border,0,0,64,64);paint(body,2,2,60,60);
 paint(bright,4,4,56,2);paint(bright,4,4,2,56);
 paint(shadow,4,58,56,2);paint(shadow,58,5,2,55);
 if(theme==='base'){
  paint(bright,30,26,4,12);paint(bright,26,30,12,4);
 }else if(theme==='garden'){
  paint(shadow,8,40,23,4);paint(shadow,26,29,4,13);paint(bright,27,26,11,3);
  paint(bright,11,10,6,4);paint(bright,45,44,8,5);
 }else if(theme==='aqueduct'){
  paint(shadow,18,2,28,60);paint(bright,19,2,2,60);paint(border,43,2,2,60);
  for(let y=14;y<59;y+=17)paint(bright,24,y,16,2);
 }else if(theme==='archive'){
  paint(shadow,15,17,34,26);paint(border,18,19,28,20);
  paint(bright,22,25,20,2);paint(bright,22,31,12,2);
 }else{
  paint(bright,10,11,17,2);paint(shadow,42,43,9,9);paint(bright,45,46,3,3);
 }
 const map=new THREE.CanvasTexture(canvas);
 map.colorSpace=THREE.SRGBColorSpace;map.magFilter=map.minFilter=THREE.NearestFilter;
 return map;
}
function mesh(geometry,material,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;return m;}
function standard(color,extra={}){return new THREE.MeshStandardMaterial({color,roughness:.67,metalness:.22,...extra});}
export class HDRenderer{
 constructor(owner,grid){this.owner=owner;this.grid=grid;this.disposed=false;this.ready=false;this.billboards=[];this.textures=new Map();this.records=new Map();this.animations=[];this.yaw=this.yawTarget=Math.PI/4;this.zoom=this.zoomTarget=1.58;this.effects=true;this.follow=new THREE.Vector3();this.spin=[];this.destinationUntil=0;}
 async init(){
  this.renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.22;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFShadowMap;
  this.canvas=this.renderer.domElement;this.canvas.className='hd-world-canvas';this.canvas.setAttribute('aria-hidden','true');Object.assign(this.canvas.style,{position:'absolute',pointerEvents:'none',zIndex:'0'});document.getElementById('game-root').prepend(this.canvas);this.owner.game.canvas.style.position='relative';this.owner.game.canvas.style.zIndex='1';
  this.scene=new THREE.Scene();this.backdrop=networkBackdrop(this.owner.region);this.textures.set("network-backdrop",this.backdrop.texture);this.scene.background=this.backdrop.texture;this.reduceMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;this.scene.fog=new THREE.FogExp2(this.owner.region.fog,.024);
  this.camera=new THREE.OrthographicCamera(-12,12,7,-7,.1,140);this.camera.position.set(18,22,18);this.camera.lookAt(0,0,0);
  this.scene.add(new THREE.HemisphereLight(0xc9eaff,0x16253e,2.2));const sun=new THREE.DirectionalLight(0xffe8c2,3.2);sun.position.set(-15,24,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:.1,far:85});sun.shadow.bias=-.00025;sun.shadow.normalBias=.025;this.scene.add(sun,sun.target);this.sun=sun;
  const fill=new THREE.DirectionalLight(0x65c4ef,1.1);fill.position.set(8,8,-15);this.scene.add(fill);
  this.buildFloors();this.buildAtmosphere();buildScenery(this);this.refreshDecor();this.buildFootsteps();if(this.owner.zone==="town")this.buildTown();
  this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));this.bloom=new UnrealBloomPass(new THREE.Vector2(1280,720),.32,.45,1.15);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());this.retro=new ShaderPass(retroShader);this.retro.uniforms.resolution.value=new THREE.Vector2();this.composer.addPass(this.retro);
  this.resize();this.onResize=()=>this.resize();window.addEventListener('resize',this.onResize);this.owner.scale.on('resize',this.onResize);
  const response=await fetch('hd2d-art.json');if(!response.ok)throw Error('Character manifest unavailable');this.art=await response.json();if(this.disposed)return;
  const gameArt=this.owner.game.cache.json.get('art')??{};
  const homeAssets=Object.entries(gameArt).filter(([key])=>key.startsWith('home-decor-'));
  await Promise.all(homeAssets.map(async([key,path])=>this.textures.set(key,await this.texture(path))));if(this.disposed)return;
  this.refreshDecor();
  await this.loadCharacters();if(this.disposed)return;
  this.hero=await this.character(this.owner.walker.x,this.owner.walker.y,this.owner.operator,2.1);if(this.disposed)return;this.setCarriedDecor(this.owner.save.base?.carried??null);await this.buildLandmarks();if(this.disposed)return;
  this.destination=mesh(new THREE.RingGeometry(.28,.33,40),new THREE.MeshBasicMaterial({color:0x8df9ff,transparent:true,opacity:.8,side:THREE.DoubleSide}));this.destination.rotation.x=-Math.PI/2;this.destination.visible=false;this.scene.add(this.destination);
  this.focusRing=mesh(new THREE.RingGeometry(.55,.59,48),new THREE.MeshBasicMaterial({color:0x8df9ff,transparent:true,opacity:.7,side:THREE.DoubleSide}));this.focusRing.rotation.x=-Math.PI/2;this.focusRing.visible=false;this.scene.add(this.focusRing);
  this.follow.set(this.owner.walker.x/S,this.owner.walker.height,this.owner.walker.y/S);this.ready=true;this.refresh(this.owner.save);this.update(0,.016);
 }
 resize(){if(this.disposed||!this.renderer)return;const r=this.owner.game.canvas.getBoundingClientRect(),root=document.getElementById('game-root').getBoundingClientRect();this.renderer.setSize(Math.max(1,r.width),Math.max(1,r.height));Object.assign(this.canvas.style,{left:r.left-root.left+'px',top:r.top-root.top+'px'});this.aspect=r.width/r.height;this.backdrop.texture.repeat.set(4,4/this.aspect);this.retro.uniforms.resolution.value.set(Math.min(800,Math.max(1,r.width)),Math.min(800,Math.max(1,r.width))/this.aspect);this.camera.left=-7*this.aspect;this.camera.right=7*this.aspect;this.camera.top=7;this.camera.bottom=-7;this.camera.updateProjectionMatrix();this.composer?.setSize(r.width,r.height);}
 buildFloors(){
  const top=[],uv=[],side=[],edges=[];const push=(a,b,c,d)=>{top.push(...a,...c,...b,...a,...d,...c);uv.push(0,0,1,1,1,0,0,0,0,1,1,1);};
  for(const key of this.grid.cells){const ix=key%this.grid.cols,iz=Math.floor(key/this.grid.cols),x=ix*T,z=iz*T;const a=[x/S,this.grid.height(x,z),z/S],b=[(x+T)/S,this.grid.height(x+T,z),z/S],c=[(x+T)/S,this.grid.height(x+T,z+T),(z+T)/S],d=[x/S,this.grid.height(x,z+T),(z+T)/S];push(a,b,c,d);
   for(const[dx,dz,p,q]of[[0,-1,a,b],[1,0,b,c],[0,1,c,d],[-1,0,d,a]])if(!this.grid.has(ix+dx,iz+dz)){const pl=[p[0],p[1]-1.1,p[2]],ql=[q[0],q[1]-1.1,q[2]];side.push(...p,...q,...ql,...p,...ql,...pl);edges.push(p[0],p[1]+.016,p[2],q[0],q[1]+.016,q[2]);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(top,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();const map=tileTexture(this.owner.region.theme);this.textures.set('floor-map',map);this.floor=mesh(geo,standard(this.owner.region.floor,{map,roughness:.82,metalness:.28}));this.floor.castShadow=false;this.scene.add(this.floor);
  const wallGeo=new THREE.BufferGeometry();wallGeo.setAttribute('position',new THREE.Float32BufferAttribute(side,3));wallGeo.computeVertexNormals();this.scene.add(mesh(wallGeo,standard(0x193044,{roughness:.5,side:THREE.DoubleSide})));
  const lines=new THREE.BufferGeometry();lines.setAttribute('position',new THREE.Float32BufferAttribute(edges,3));this.scene.add(new THREE.LineSegments(lines,new THREE.LineBasicMaterial({color:this.owner.region.edge,toneMapped:false})));
 }
 box(group,size,position,material){const m=mesh(new THREE.BoxGeometry(...size),material,...position);group.add(m);return m;}
 buildAtmosphere(){
  const geometry=new THREE.BufferGeometry(),positions=[];
  for(let i=0;i<240;i++)positions.push((i*13.73)%51,-2+(i*1.31)%12,(i*7.91)%38);
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  this.motes=new THREE.Points(geometry,new THREE.PointsMaterial({color:this.owner.region.color,size:.052,transparent:true,opacity:.57,depthWrite:false}));
  this.scene.add(this.motes);
 }
 refreshDecor(){refreshDecor(this);}
 setCarriedDecor(item){setCarriedDecorModel(this,item);}
 buildFootsteps(){
  this.footsteps=Array.from({length:18},()=>{
   const light=new THREE.MeshBasicMaterial({color:0x78f3f8,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
   const spark=new THREE.Mesh(new THREE.BoxGeometry(.07,.07,.07),light);
   this.scene.add(spark);
   return {spark,life:0};
  });
  this.footstepTimer=0;
 }
 animateFootsteps(w,dt){
  this.footstepTimer-=dt;
  if(w.moving&&this.owner.save.settings.particles&&this.footstepTimer<=0){
   this.footstepTimer=w.running?.085:.18;
   for(const p of this.footsteps.filter(item=>item.life<=0).slice(0,w.running?4:2)){
    p.life=.38;
    p.spark.position.set(w.x/S+(Math.random()-.5)*.5,w.height+.05,w.y/S+(Math.random()-.5)*.5);
    p.spark.rotation.y=Math.random()*Math.PI;
   }
  }
  for(const p of this.footsteps){
   p.life=Math.max(0,p.life-dt);
   p.spark.visible=p.life>0&&this.owner.save.settings.particles;
   if(p.spark.visible){
    p.spark.position.y+=dt*.38;
    p.spark.material.opacity=p.life/.38;
    p.spark.scale.setScalar(1+p.life);
   }
  }
 }
 buildTown(){
  const frame=standard(0x375970),glass=standard(0x295870,{metalness:.6});
  const trim=standard(0x82e6ed,{emissive:0x3bc9ee,emissiveIntensity:1.1});
  for(const p of this.owner.landmarks.filter(point=>point.kind==='service'||point.kind==='duel')){
   const building=new THREE.Group();
   building.position.set(p.x/S,this.grid.height(p.x,p.y),p.y/S-1.28);
   this.scene.add(building);
   this.box(building,[2.25,.22,1.4],[0,.12,0],frame);
   this.box(building,[1.9,1.45,1.07],[0,.95,0],glass);
   this.box(building,[2.12,.24,1.28],[0,1.78,0],frame);
   this.box(building,[1.95,.06,.1],[0,1.72,.67],trim);
   for(const x of [-.82,.82]){
    this.box(building,[.14,1.55,.16],[x,1,.58],frame);
    this.box(building,[.05,.64,.04],[x,1.17,.7],trim);
   }
  }
 }
 async texture(path){if(this.textures.has(path))return this.textures.get(path);const tex=await new THREE.TextureLoader().loadAsync(path);tex.colorSpace=THREE.SRGBColorSpace;tex.magFilter=tex.minFilter=THREE.NearestFilter;tex.generateMipmaps=false;if(this.disposed){tex.dispose();return tex;}this.textures.set(path,tex);return tex;}
 async loadCharacters(){const paths=new Set();for(const c of Object.values(this.art.characters))for(const clip of Object.values(c.clips))paths.add(clip.path);await Promise.all([...paths].map(p=>this.texture(p)));}
 async character(x,z,id,height=2){const record=this.art.characters[id]??this.art.characters.pulse;const clips={};for(const[key,clip]of Object.entries(record.clips)){const base=await this.texture(clip.path);const tex=base.clone();tex.needsUpdate=true;this.textures.set(Symbol(),tex);clips[key]={...clip,texture:tex};}
  const map=clips['south-idle'].texture;const material=standard(0xffffff,{map,alphaTest:.35,side:THREE.DoubleSide,roughness:1,metalness:0,emissive:0x152a36,emissiveIntensity:.35});const geometry=new THREE.PlaneGeometry(height,height);geometry.translate(0,(120/128-.5)*height,0);const obj=mesh(geometry,material,x/S,this.grid.height(x,z)+.02,z/S);obj.renderOrder=2;this.scene.add(obj);const character={obj,clips,height,id,x,z};this.billboards.push(character);return character;
 }
 async buildLandmarks(){
  const metal=standard(0x294756),screen=standard(0x57d7f2,{emissive:0x43badb,emissiveIntensity:1.25}),dark=standard(0x0e2638);
  for(const p of this.owner.landmarks){if(this.disposed)return;if(this.owner.zone==="town"&&p.id==="notice")continue;const g=new THREE.Group();g.position.set(p.x/S,this.grid.height(p.x,p.y),p.y/S);this.scene.add(g);const record={p,group:g};this.records.set(p.id,record);
   const plinth=mesh(new THREE.CylinderGeometry(.39,.46,.16,8),dark,0,.08,0);g.add(plinth);
   if(p.kind==='mission'){
    const ring=mesh(new THREE.TorusGeometry(.72,.025,5,40),screen.clone(),0,.035,0);
    ring.rotation.x=-Math.PI/2;
    g.add(ring);
    record.ring=ring;
    const beacon=mesh(new THREE.OctahedronGeometry(.32),screen.clone(),0,.75,0);
    g.add(beacon);
    this.animations.push({object:beacon,base:.75,phase:p.x*.01});
   }
   else if(p.kind==='chest'||p.kind==='herb'){const color=p.kind==='chest'?0xa6f5a9:0xf29bdc;const crystal=mesh(new THREE.OctahedronGeometry(p.kind==='chest'?.31:.19,0),standard(color,{emissive:color,emissiveIntensity:.55,roughness:.2,metalness:.35}),0,.82,0);g.add(crystal);record.crystal=crystal;this.animations.push({object:crystal,base:.82,phase:p.x*.01});}
   else if(p.kind==='shrine'||p.kind==='puzzle'||p.kind==='duel'||p.kind==='gate'||p.kind==='sealed'){this.box(g,[.15,1.8,.26],[-.57,.9,0],metal);this.box(g,[.15,1.8,.26],[.57,.9,0],metal);this.box(g,[1.28,.12,.26],[0,1.78,0],metal);const portal=mesh(new THREE.PlaneGeometry(.95,1.5),new THREE.MeshBasicMaterial({color:p.kind==='sealed'?0xff775b:p.kind==='duel'?0xb393fb:this.owner.region.color,transparent:true,opacity:.25,side:THREE.DoubleSide}),0,.93,.01);g.add(portal);record.portal=portal;this.animations.push({object:portal,portal:true,id:p.id,phase:p.x*.01});}
   else{this.box(g,[.68,.6,.48],[0,.42,0],metal);this.box(g,[.9,.52,.12],[0,1.05,-.1],dark);this.box(g,[.76,.36,.018],[0,1.05,-.023],screen);for(let i=0;i<3;i++)this.box(g,[.46-i*.1,.02,.024],[-.08,1.14-i*.09,-.01],dark);const led=mesh(new THREE.BoxGeometry(.24,.025,.28),screen,0,.73,.03);g.add(led);}
  }
 }
 animateCharacter(character,direction,action,time){
  if(!character?.clips)return;
  const mirrored=direction.includes('west');
  const dir=direction.replace('west','east');
  const fallback=dir.endsWith('east')&&dir!=='east'?dir.slice(0,-4):dir;
  const clip=(action==='sit'?character.clips['south-sit']:null)??character.clips[dir+'-'+action]??character.clips[dir+'-walk']??character.clips[dir+'-idle']??character.clips[fallback+'-'+action]??character.clips['south-idle'];
  const speed=action==='run'?1.2:action==='walk'?1.25:1;
  const frame=Math.floor(time*clip.fps*speed)%clip.frames;
  const flip=action!=='sit'&&mirrored&&(dir==='east'||!!character.clips[dir+'-idle']);
  clip.texture.repeat.set((flip?-1:1)/clip.frames,1);
  clip.texture.offset.set((frame+(flip?1:0))/clip.frames,0);
  character.obj.material.map=clip.texture;
 }
 screenMotion(dx,dy){return{dx:dx*Math.cos(this.yaw)+dy*Math.sin(this.yaw),dy:-dx*Math.sin(this.yaw)+dy*Math.cos(this.yaw)};}
 facing(dx,dz){return facing8(dx,dz,this.yaw)??this.owner.walker.facing;}
 rotate(step){this.yawTarget+=step*Math.PI/4;}
 setZoom(delta){this.zoomTarget=THREE.MathUtils.clamp(this.zoomTarget+delta,.85,2.3);}
 toggleEffects(){this.effects=!this.effects;this.bloom.enabled=this.effects;this.renderer.shadowMap.enabled=this.effects;}
 mark(x,z){if(!this.ready)return;this.destination.position.set(x/S,this.grid.height(x,z)+.025,z/S);this.destination.visible=true;this.destinationUntil=performance.now()+1100;}
 project(x,z,extra=1.8){const v=new THREE.Vector3(x/S,this.grid.height(x,z)+extra,z/S).project(this.camera);return{x:(v.x+1)*640,y:(1-v.y)*360};}
 refresh(save){if(!this.ready)return;for(const record of this.records.values()){const{p}=record;if(p.kind==='chest'){const open=save.world.opened.includes(p.id);record.crystal.visible=!open;}if(p.kind==='herb')record.group.visible=!save.world.gathered.includes(p.id);if(p.kind==='mission'){const index=MISSIONS.findIndex(m=>m.id===p.mission),can=missionUnlocked(save,index),done=save.completed.includes(p.mission);record.ring.material.emissive.set(done?0x4be7b0:can?0x5acced:0x754452);record.ring.material.color.set(done?0x4be7b0:can?0x5acced:0x754452);}}}
 update(time,dt){if(!this.ready||this.disposed||document.hidden)return;const w=this.owner.walker;this.yaw=THREE.MathUtils.lerp(this.yaw,this.yawTarget,1-Math.exp(-dt*8));this.zoom=THREE.MathUtils.lerp(this.zoom,this.zoomTarget,1-Math.exp(-dt*8));this.camera.zoom=this.zoom;this.camera.updateProjectionMatrix();const target=new THREE.Vector3(w.x/S,w.height,w.y/S);this.follow.lerp(target,1-Math.exp(-dt*9));this.camera.position.set(this.follow.x+Math.sin(this.yaw)*22,this.follow.y+20,this.follow.z+Math.cos(this.yaw)*22);this.camera.lookAt(this.follow.x,this.follow.y+.8,this.follow.z);this.sun.position.set(this.follow.x-15,this.follow.y+24,this.follow.z+8);this.sun.target.position.copy(this.follow);this.sun.target.updateMatrixWorld();
  this.backdrop.update(!this.reduceMotion&&this.owner.save.settings.particles?time:0);
  for(const wheel of this.spin)wheel.rotation.z=time*.73;
  this.animateFootsteps(w,dt);
  if(this.carriedGroup)this.carriedGroup.position.set(w.x/S,w.height+2.2+Math.sin(time*3.2)*.045,w.y/S);
  const seat=this.owner.seated;
  if(seat){
   const clip=this.hero.clips['south-sit'];
   const lift=.52-(120-(clip.anchor?.[1]??120))*this.hero.height/128;
   // Seat billboards need a small draw-depth offset so the backrest doesn't
   // cut through the sprite. Offset along the camera ray to preserve framing.
   const depthOffset=this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(-.72);
   this.hero.obj.position.set(seat.x/S,w.height+lift,seat.y/S).add(depthOffset);
   this.animateCharacter(this.hero,'south','sit',time);
  }else{
   this.hero.obj.position.set(w.x/S,w.height+.025,w.y/S);
   this.animateCharacter(this.hero,w.facing,w.moving?(w.running?'run':'walk'):'idle',time);
  }
  for(const b of this.billboards){b.obj.quaternion.copy(this.camera.quaternion);if(b!==this.hero&&b.clips)this.animateCharacter(b,'south','idle',time);}
  for(const a of this.animations){if(a.portal){
   const focused=this.owner.nearPoint?.id===a.id;
   const pulse=this.reduceMotion?0:Math.sin(time*(focused?5:2)+a.phase)*.06;
   a.object.material.opacity=THREE.MathUtils.lerp(a.object.material.opacity,(focused?.44:.2)+pulse,1-Math.exp(-dt*9));
  }else{a.object.position.y=a.base+Math.sin(time*2.4+a.phase)*.07;a.object.rotation.y=time*.9;}}
  const near=this.owner.nearPoint;this.focusRing.visible=!!near;if(near){this.focusRing.position.set(near.x/S,this.grid.height(near.x,near.y)+.03,near.y/S);const pulse=this.reduceMotion?0:Math.sin(time*4);
   this.focusRing.material.color.setHex(this.owner.region.color);
   this.focusRing.scale.setScalar(1+pulse*.07);
   this.focusRing.material.opacity=.55+pulse*.18;}
  if(this.destination.visible){const t=(this.destinationUntil-performance.now())/1100;this.destination.visible=t>0;this.destination.scale.setScalar(1+(1-t)*.6);this.destination.material.opacity=Math.max(0,t)*.8;}
  this.motes.visible=this.owner.save.settings.particles;this.motes.rotation.y=Math.sin(time*.04)*.015;if(this.effects)this.composer.render(dt);else this.renderer.render(this.scene,this.camera);
 }
 dispose(){this.disposed=true;window.removeEventListener('resize',this.onResize);if(this.onResize)this.owner.scale.off('resize',this.onResize);this.scene?.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});for(const t of this.textures.values())t.dispose();for(const pass of this.composer?.passes??[])pass.dispose?.();this.composer?.dispose();this.renderer?.dispose();this.renderer?.forceContextLoss();this.canvas?.remove();}
}
