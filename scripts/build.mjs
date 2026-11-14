import{build}from'esbuild';import{readFile,writeFile,access}from'node:fs/promises';import{CHIPS}from'../dist/core.js';
const exists=async path=>{try{await access('dist/'+path);return true;}catch{return false;}};
const art={'forest':'assets/environment/forest-clearing.png','card-back':'assets/cards/card-back.png','card-frame':'assets/cards/card-front.png'};
for(const id of ['pulse','nova','echo'])for(const part of ['idle','attack','portrait']){const fantasy=`assets/fantasy/characters/${id}-${part}.png`;art[`${id}-${part}`]=fantasy;}
for(const[id,c]of Object.entries(CHIPS)){const group=['buster','armor'].includes(c.art)?'equipment':'cards',fantasy=`assets/fantasy/${group}/${c.art}.png`;art['card-'+id]=fantasy;}
for(const id of ['hex','spark','frost','flare','guard'])art['monster-'+id]=`assets/fantasy/monsters/${id==='guard'?'briar-guardian':'thornling'}.png`;
art['monster-queen']='assets/fantasy/monsters/thorn-queen.png';
for(const path of Object.values(art))await access('dist/'+path);await writeFile('dist/art-manifest.json',JSON.stringify(art,null,2)+'\n');
await build({entryPoints:['src/game/index.js'],bundle:true,format:'esm',target:'es2022',outfile:'dist/game.js',minify:true,legalComments:'eof'});
await build({entryPoints:['scripts/wallet-entry.js'],bundle:true,format:'esm',target:'es2022',outfile:'dist/vendor/wallet.js',minify:true,legalComments:'eof'});
const config=JSON.parse(await readFile('dist/near-config.json','utf8'));if(config.network!=='testnet')throw Error('Only testnet is supported');console.log('Phaser game built: full-screen scenes, 12-card decks, 9 chapters, fantasy art, and NEAR testnet integration.');
