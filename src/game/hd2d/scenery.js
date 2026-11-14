import * as THREE from 'three';
import {basePosition, DECOR} from '../../../dist/home.js';

const material = (color, glow=0) => new THREE.MeshStandardMaterial({
  color, roughness:.72, metalness:.14, emissive:color, emissiveIntensity:glow
});

function object(group, geometry, mat, x, y, z) {
  const mesh = new THREE.Mesh(geometry,mat);
  mesh.position.set(x,y,z);
  mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function rod(group, from, to, radius, mat) {
  const a=new THREE.Vector3(...from), b=new THREE.Vector3(...to), delta=b.clone().sub(a);
  const bar=object(group,new THREE.CylinderGeometry(radius*.66,radius,delta.length(),5),mat,...a.addScaledVector(delta,.5).toArray());
  bar.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
}

function blossom(group, color, scale=1) {
  const stem=material(0x425c64), leaf=material(0x3f937a), light=material(color,.4);
  rod(group,[0,0,0],[.12,1.2,0],.08,stem);
  for(let i=0;i<5;i++){
    const angle=i*Math.PI*2/5;
    const petal=object(group,new THREE.OctahedronGeometry(.32),light,.12+Math.cos(angle)*.29,1.2+Math.sin(angle)*.19,Math.sin(angle)*.24);
    petal.scale.set(1,.51,.75);
    petal.rotation.y=angle;
  }
  object(group,new THREE.IcosahedronGeometry(.17,0),material(0xffdb94,.6),.12,1.24,0);
  const blade=object(group,new THREE.OctahedronGeometry(.36),leaf,-.28,.52,0);
  blade.scale.set(1.2,.24,.65);blade.rotation.z=.62;
  group.scale.setScalar(scale);
}

function lantern(group, color, height=1.4) {
  const frame=material(0x59435b), glow=material(color,1.1);
  rod(group,[0,0,0],[0,height+.35,0],.055,frame);
  const lamp=object(group,new THREE.CylinderGeometry(.21,.17,.39,6),glow,0,height,0);
  object(group,new THREE.ConeGeometry(.28,.17,6),frame,0,height+.25,0);
  object(group,new THREE.CylinderGeometry(.22,.16,.07,6),frame,0,height-.24,0);
  return lamp;
}

function anchor(renderer,x,z,offset=0) {
  const group=new THREE.Group();
  group.position.set(x/64,renderer.grid.height(x,z)+offset,z/64);
  renderer.scene.add(group);
  return group;
}

function block(group,w,h,d,x,y,z,mat){
  return object(group,new THREE.BoxGeometry(w,h,d),mat,x,y,z);
}

// A connected crown made of small overlapping clusters, tinted from the shaded
// underside to the exposed tips. Instances share one draw call and cast shadows.
function canopyTree(group, palette) {
  const bark=material(0x554453), youngBark=material(0x795967);
  const fork=[-.16,1.69,.08];
  rod(group,[0,0,0],fork,.29,bark);
  rod(group,fork,[.27,3.05,-.22],.2,youngBark);
  const crowns=[[.27,3.28,-.22,1.05]];
  for(let i=0;i<6;i++){
    const angle=i*2.399;
    const reach=1.06+(i%3)*.23;
    const tip=[Math.cos(angle)*reach,2.45+(i%4)*.19,Math.sin(angle)*reach];
    const elbow=[tip[0]*.46,tip[1]-.49,tip[2]*.46];
    rod(group,fork,elbow,.13,bark);
    rod(group,elbow,tip,.094,youngBark);
    crowns.push([...tip,.77+(i%3)*.08]);
    rod(group,[0,.31,0],[Math.cos(angle)*.61,.035,Math.sin(angle)*.61],.12,bark);
  }
  const leaves=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),material(0xffffff),crowns.length*14);
  const pose=new THREE.Object3D();
  crowns.forEach(([x,y,z,r],branch)=>{
    for(let i=0;i<14;i++){
      const angle=i*2.399+branch;
      const ring=i===0?0:r*(.26+i%5*.15);
      const lift=i===0?.2:Math.sin(i*1.7+branch)*.31;
      const size=r*(.37+i%4*.077);
      pose.position.set(x+Math.cos(angle)*ring,y+lift,z+Math.sin(angle)*ring);
      pose.rotation.set(.14*Math.sin(i),angle,.21*Math.cos(branch+i));
      pose.scale.set(size*1.22,size*.68,size);
      pose.updateMatrix();
      const index=branch*14+i;
      leaves.setMatrixAt(index,pose.matrix);
      leaves.setColorAt(index,new THREE.Color(palette[lift<-.08?0:(branch===2||branch===5)?3:i%4===0?2:1]));
    }
  });
  leaves.castShadow=leaves.receiveShadow=true;
  group.add(leaves);
}

export function buildScenery(renderer) {
  const {owner,scene,grid}=renderer, {theme,color}=owner.region;
  const steel=material(0x465f76), trim=material(color,.58);
  const cloud=material(owner.region.fog,.28);
  const horizon=new THREE.Group();scene.add(horizon);
  for(let i=0;i<28;i++){
    const a=i*2.399, distance=19+i%8*3, x=18+Math.cos(a)*distance, z=14+Math.sin(a)*distance;
    const island=object(horizon,new THREE.CylinderGeometry(1+i%3,0.35,3+i%5,6),cloud,x,-6-i%3,z);
    island.rotation.y=a;
    island.castShadow=false;
  }
  if(theme==='town'){
    const tree=anchor(renderer,1008,1008);
    grid.props.push({x:1008,z:1008,r:32});
    canopyTree(tree,[0x366c65,0x669e8c,0xa0ba99,0xb893aa]);
    for(const [x,z] of [[688,640],[1328,640],[688,1168],[1328,1168],[960,512],[1056,512],[960,1312],[1056,1312]])lantern(anchor(renderer,x,z),0xffd4aa);
    return;
  }
  if(theme==='base'){
    for(const [x,z] of [[772,580],[1532,580],[772,1208],[1532,1208]])lantern(anchor(renderer,x,z),0xe0c9ff,1.8);
    for(const [x,z] of [[678,710],[1634,703],[1630,1010],[665,965]]){
      const moon=anchor(renderer,x,z,-.9);
      object(moon,new THREE.IcosahedronGeometry(.64,0),trim,0,0,0);
      const ring=object(moon,new THREE.TorusGeometry(.88,.023,6,36),trim,0,0,0);
      ring.rotation.x=1.1;
    }
    return;
  }
  if(theme==='garden'){
    const nodes=[[350,1008],[690,1008],[674,1272],[1090,782],[1430,780],[1450,1216],[1152,334],[1640,448],[1890,720],[2210,730],[2170,1068],[2390,288],[2590,470],[1992,385]];
    nodes.forEach(([x,z],i)=>{
      const plant=anchor(renderer,x,z);
      blossom(plant,i%3===0?0xffb9d9:i%3===1?0xaef9bf:0xe5efae,1.1+i%3*.35);
      if(grid.walkable(x,z))grid.props.push({x,z,r:22});
    });
    for(const [x,z,scale] of [[408,1003,.66],[1410,1220,.72],[2290,300,.76],[2100,1055,.67]]){
      const tree=anchor(renderer,x,z);
      canopyTree(tree,[0x34645c,0x559f7e,0xbccd88,0x8dcb9c]);
      tree.scale.setScalar(scale);
      if(grid.walkable(x,z))grid.props.push({x,z,r:24});
    }
    const root=material(0x527777);
    for(const [x,z] of [[520,1300],[1390,1130],[2090,1000],[2500,420]]){
      const t=anchor(renderer,x,z,-1.05);
      for(let i=0;i<3;i++)rod(t,[0,0,0],[i*.7-1.2,-3.1-i*.43,1+i*.4],.19,root);
    }
    return;
  }
  if(theme==='aqueduct'){
    const water=material(0x347ba6,.33);
    for(const [x,z] of [[590,548],[1420,728],[1538,1440],[2350,1410],[2480,1920]]){
      const wheel=anchor(renderer,x,z,.06);
      object(wheel,new THREE.TorusGeometry(.73,.09,8,28),steel,0,0,0);
      const hub=object(wheel,new THREE.CylinderGeometry(.15,.15,.22,8),trim,0,0,0);
      hub.rotation.x=Math.PI/2;
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4;
        rod(wheel,[0,0,0],[Math.cos(a)*.7,Math.sin(a)*.7,0],.047,trim);
      }
      renderer.spin.push(wheel);
    }
    for(const [x,z,w,d] of [[882,450,7,2],[1290,1000,2,7],[1800,1350,7,2],[2300,1660,2,5]]){
      const channel=anchor(renderer,x,z,-1.35);
      block(channel,w,.14,d,0,0,0,water);
      for(let i=0;i<4;i++)block(channel,w,.025,.045,0,.085,-d/2+(i+.5)*d/4,trim);
    }
    return;
  }
  const shelf=material(0x624e6b), paper=[material(0xc68a84),material(0xf5ca96),material(0x9c8fb9),material(0x90bec4)];
  for(const [x,z] of [[370,1570],[670,1360],[1140,1220],[1490,1610],[1140,550],[1480,530],[2050,445],[2280,810],[2010,1320],[2440,1540],[2620,1280]]){
    const rack=anchor(renderer,x,z);
    block(rack,1.45,1.86,.22,0,.92,-.24,shelf);
    for(const sx of [-.74,.74])block(rack,.12,1.86,.55,sx,.92,0,shelf);
    for(let y=0;y<3;y++){
      block(rack,1.46,.09,.57,0,.13+y*.6,0,shelf);
      for(let j=0;j<7;j++)block(rack,.14,.39+j%3*.04,.32,-.59+j*.18,.38+y*.6,0,paper[(j+y)%4]);
    }
    if(grid.walkable(x,z))grid.props.push({x,z,r:34});
  }
  for(const [x,z] of [[600,1450],[1370,1310],[1290,970],[1550,630],[1850,640],[2180,1010],[2400,1370],[2510,550]])lantern(anchor(renderer,x,z),0xffae75,2.1);
}

function addDecorSprite(renderer,group,type){
  const source=renderer.owner.textures.get(`home-decor-${type}`)?.getSourceImage();
  if(!source)return false;
  const sizes={planter:[1.9,2.1],lamp:[1.75,2.55],bench:[2.55,1.95],pond:[2.8,2.05],rug:[2.65,1.65],sculpture:[2.05,2.55]};
  const [width,height]=sizes[type]??[2,2];
  const map=new THREE.Texture(source);
  map.colorSpace=THREE.SRGBColorSpace;
  map.magFilter=THREE.LinearFilter;
  map.minFilter=THREE.LinearFilter;
  map.generateMipmaps=false;
  map.needsUpdate=true;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map,transparent:true,alphaTest:.035,depthWrite:false}));
  sprite.scale.set(width,height,1);
  sprite.position.y=height/2;
  group.add(sprite);
  return true;
}

function disposeDecorGroup(renderer,group){
  if(!group)return;
  renderer.scene.remove(group);
  group.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){m.map?.dispose();m.dispose();}});
}

function buildDecorModel(renderer,group,type){
    if(addDecorSprite(renderer,group,type))return;
    const accent=material(DECOR[type].color,.16), legs=material(0x53516d);
    if(type==='planter'){
      object(group,new THREE.CylinderGeometry(.38,.3,.26,8),accent,0,.13,0);
      const plant=new THREE.Group();plant.position.y=.22;group.add(plant);blossom(plant,0xffbfe8,.56);
    }else if(type==='lamp')lantern(group,DECOR[type].color,1.04);
    else if(type==='bench'){
      block(group,1.72,.15,.61,0,.48,0,accent);
      block(group,1.72,.43,.12,0,.72,-.24,accent);
      for(const sx of [-.65,.65])block(group,.12,.48,.41,sx,.24,0,legs);
    }else if(type==='pond'){
      object(group,new THREE.CylinderGeometry(.92,.83,.21,12),legs,0,.1,0);
      object(group,new THREE.CylinderGeometry(.82,.82,.025,24),accent,0,.216,0);
      for(let i=0;i<3;i++){
        const r=object(group,new THREE.TorusGeometry(.2+i*.19,.015,5,24),material(0xe4faff,.6),0,.235,0);
        r.rotation.x=Math.PI/2;
      }
    }else if(type==='rug'){
      block(group,1.87,.025,1.87,0,.012,0,accent);
      const star=block(group,.89,.027,.89,0,.022,0,material(0xffdeab));
      star.rotation.y=Math.PI/4;
    }else{
      object(group,new THREE.CylinderGeometry(.32,.35,.18,8),legs,0,.09,0);
      object(group,new THREE.IcosahedronGeometry(.31,0),accent,0,.74,0);
      const ring=object(group,new THREE.TorusGeometry(.44,.034,6,24),accent,0,.74,0);
      ring.rotation.x=.65;
    }
}

export function refreshDecor(renderer){
  disposeDecorGroup(renderer,renderer.decorGroup);
  renderer.decorGroup=null;
  if(renderer.owner.zone!=='base')return;
  const decorations=new THREE.Group();renderer.scene.add(decorations);renderer.decorGroup=decorations;
  for(const placement of renderer.owner.save.base.placements){
    const {x,y}=basePosition(placement),group=new THREE.Group();
    group.position.set(x/64,.52,y/64);group.rotation.y=placement.rotation*Math.PI/2;
    buildDecorModel(renderer,group,placement.type);decorations.add(group);
  }
}

export function setCarriedDecor(renderer,item){
  disposeDecorGroup(renderer,renderer.carriedGroup);renderer.carriedGroup=null;
  if(!item||renderer.owner.zone!=='base'||!DECOR[item.type])return;
  const carried=new THREE.Group(),model=new THREE.Group();
  model.rotation.y=(item.rotation??0)*Math.PI/2;model.scale.setScalar(.43);
  buildDecorModel(renderer,model,item.type);carried.add(model);renderer.scene.add(carried);renderer.carriedGroup=carried;
}
