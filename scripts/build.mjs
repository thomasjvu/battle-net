import{build}from'esbuild';import{readFile,writeFile,access}from'node:fs/promises';import{CHIPS}from'../dist/core.js';
const exists=async path=>{try{await access('dist/'+path);return true;}catch{return false;}};
const art={'title-relay':'assets/title/relay-town.webp','network-battle':'assets/network/battle-background.png','forest':'assets/environment/forest-clearing.png','card-back':'assets/cards/card-back.png','card-frame':'assets/cards/card-front.png'};
for(const zone of ['garden','aqueduct','archive'])art['virus-'+zone]='assets/viruses/'+zone+'.png';
for(const id of ['pulse','nova','echo'])for(const part of ['idle','attack','portrait']){const fantasy=`assets/fantasy/characters/${id}-${part}.png`;art[`${id}-${part}`]=fantasy;}
for(const[id,c]of Object.entries(CHIPS)){const group=['buster','armor'].includes(c.art)?'equipment':'cards',fantasy=`assets/fantasy/${group}/${c.art}.png`;art['card-'+id]=fantasy;}
for(const id of ['hex','spark','frost','flare','guard'])art['monster-'+id]=`assets/fantasy/monsters/${id==='guard'?'briar-guardian':'thornling'}.png`;
art['monster-queen']='assets/fantasy/monsters/thorn-queen.png';
for(const [key,file] of Object.entries({grass:'grass',path:'path',rock:'rock',house:'cottage',tree:'oak-tree',chest:'chest',campfire:'campfire',banner:'banner',sign:'noticeboard',shrine:'shrine'}))art['world-'+key]='assets/fantasy/roam/'+file+'.png';
for(const direction of ['east','south','north'])art['pulse-'+direction+'-idle']='assets/fantasy/characters/pulse-roam-'+direction+'.png';
for(const [key,file] of Object.entries({grass:'meadow',path:'dirt-material',flowers:'flowers',bush:'bush',tuft:'grass-clump'}))art['world-'+key]='assets/fantasy/terrain/'+file+'.png';art['world-path-base']='assets/fantasy/roam/path.png';art['world-floor']='assets/fantasy/terrain/forest-floor.png';art['world-dirt-patch']='assets/fantasy/terrain/dirt-patch.png';
for(const [type,slug] of Object.entries({planter:'signal-planter',lamp:'paper-moon-lamp',bench:'cloud-bench',pond:'memory-pond',rug:'starweave-rug',sculpture:'orbit-sculpture'})){
  art['home-decor-'+type]='assets/home/decor/sprites/'+slug+'-v2.png';
  art['decor-card-'+type]='assets/home/decor/cards/'+slug+'.png';
}
for(const [id,file] of Object.entries({cannon:'cannon',longsword:'longsword',gold:'gold-longsword',thunder:'thunder',recover:'recover',barrier:'barrier',shotgun:'cannon',prism:'cannon',vampire:'longsword',cleave:'longsword',chainlight:'thunder',storm:'thunder',repair:'recover',revive:'recover',stonewall:'barrier'})){
  art['premium-'+id]='assets/chips/'+file+'@4x.png';
}
for(const path of Object.values(art))await access('dist/'+path);await writeFile('dist/art-manifest.json',JSON.stringify(art,null,2)+'\n');
const hd={characters:{},monsters:{hex:art['monster-hex'],guard:art['monster-guard'],queen:art['monster-queen']}};
for(const id of ['pulse','nova','echo']){const clips={};for(const dir of ['south','east','north']){clips[dir+'-idle']={path:id==='pulse'?'assets/fantasy/characters/pulse-roam-'+dir+'.png':art[id+'-idle'],frames:1,fps:1};for(const action of ['walk','run'])clips[dir+'-'+action]={path:id==='pulse'?'assets/fantasy/locomotion/pulse/'+dir+'-'+action+'.png':art[id+'-idle'],frames:id==='pulse'?6:1,fps:action==='run'?14:10};}hd.characters[id]={clips};}
const pulse=JSON.parse(await readFile('dist/assets/hd2d/pulse/manifest.json','utf8'));
const diagonals=JSON.parse(await readFile('dist/assets/hd2d/pulse/diagonal-manifest.json','utf8'));
for(const clip of [...pulse.idles,...pulse.clips,...diagonals.idles,...diagonals.clips]){
  await access('dist/'+clip.path);
  const entry={path:clip.path,frames:clip.frameCount,fps:clip.fps??1};
  hd.characters.pulse.clips[clip.direction+'-'+clip.action]=entry;
  if(clip.action==='walk')hd.characters.pulse.clips[clip.direction+'-run']={...entry,fps:14};
}
const actionManifest='assets/hd2d/pulse/action-manifest.json';
if(await exists(actionManifest)){
  const actions=JSON.parse(await readFile('dist/'+actionManifest,'utf8'));
  for(const clip of [...(actions.idles??[]),...(actions.clips??[])]){
    await access('dist/'+clip.path);
    const key=clip.action==='seated'?'south-sit':clip.direction+'-'+(clip.action==='sprint'?'run':clip.action);
    hd.characters.pulse.clips[key]={
      path:clip.path,frames:clip.frameCount,fps:clip.fps??1,anchor:clip.seatAnchor??clip.anchor
    };
  }
}
await writeFile('dist/hd2d-art.json',JSON.stringify(hd,null,2)+'\n');
await build({entryPoints:['src/game/index.js'],bundle:true,format:'esm',target:'es2022',outfile:'dist/game.js',minify:true,legalComments:'eof'});
await build({entryPoints:['scripts/wallet-entry.js'],bundle:true,format:'esm',target:'es2022',outfile:'dist/vendor/wallet.js',minify:true,legalComments:'eof'});
const config=JSON.parse(await readFile('dist/near-config.json','utf8'));if(config.network!=='testnet')throw Error('Only testnet is supported');console.log('Phaser game built: full-screen scenes, 30-chip folders, 9 chapters, fantasy art, and NEAR testnet integration.');
