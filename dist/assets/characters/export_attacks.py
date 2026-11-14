"""Finish new generated attack drawings without rewriting idle/portrait files."""
from PIL import Image, ImageDraw
from pathlib import Path
import numpy as np
import json, shutil, hashlib
ROOT=Path(__file__).parent
GEN=Path('/Users/area/.codex/generated_images/01a1d784-c780-7d73-b1d9-641694019aa4')
FILES={'pulse':'exec-2330c4ca-6121-4121-9eae-b615758ec5cd.png','nova':'exec-fa3a7949-7a7f-4729-8acc-d9864bd2c603.png','echo':'exec-cf716d58-f2d6-44fd-856f-33356f0c9dcc.png'}
manifest=json.loads((ROOT/'characters.json').read_text())
PAL=np.array([tuple(bytes.fromhex(h[1:])) for h in manifest['palette']],dtype=np.int32)
prior={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in ROOT.glob('*.png') if '-idle' in p.name or '-portrait' in p.name}
for c in manifest['characters']:
 id=c['id'];src=ROOT/'source'/f'{id}-attack-master.png'
 if not src.exists(): shutil.copy2(GEN/FILES[id],src)
 im=Image.open(src).convert('RGBA');a=np.array(im)[:,:,3];ys,xs=np.where(a>=220);im=im.crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1))
 a=np.array(im)[:,:,3];ys,xs=np.where(a[-max(1,round(im.height*.06)):]>220);foot=(xs.min()+xs.max())/2
 scale=min(112/im.height,59/max(1,foot),59/max(1,im.width-foot));im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
 a=np.array(im);d=((a[:,:,:3].astype(np.int32)[:,:,None,:]-PAL[None,None,:,:])**2).sum(3);a[:,:,:3]=PAL[d.argmin(2)];a[:,:,3]=np.where(a[:,:,3]>=192,255,0)
 im=Image.fromarray(a);a=np.array(im)[:,:,3];ys,xs=np.where(a[-max(1,round(im.height*.06)):]>0);foot=(xs.min()+xs.max())/2
 x=round(64-foot);y=120-im.height;canvas=Image.new('RGBA',(128,128));canvas.alpha_composite(im,(x,y));path=ROOT/f'{id}-attack.png';canvas.save(path);canvas.resize((512,512),Image.Resampling.NEAREST).save(ROOT/f'{id}-attack@4x.png')
 bb=canvas.getbbox();assert bb[0]>0 and bb[1]>0 and bb[2]<128 and bb[3]<128;assert np.unique(np.array(canvas)[:,:,3]).tolist()==[0,255]
 c['attack']=dict(path='assets/characters/'+path.name,width=128,height=128,anchor=[64,120],facing=c['sprite']['facing'],frames=1,contentBounds=list(bb),alphaValues=[0,255],sha256=hashlib.sha256(path.read_bytes()).hexdigest(),recommendedHoldMs=160)
assert prior=={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in ROOT.glob('*.png') if '-idle' in p.name or '-portrait' in p.name}
manifest['version']=2;manifest['limitations']=['One idle and one attack held drawing per heroine; no animation strips.','Use a brief held attack pose and runtime FX; no limb interpolation is required.','Pixel finish uses palette-reduced generated artwork.']
(ROOT/'characters.json').write_text(json.dumps(manifest,indent=2)+'\n')
qa=json.loads((ROOT/'qa.json').read_text());qa.update(runtimeFiles=9,attackFiles=3,idlePortraitHashesUnchanged=True,attackSharedFootAnchor=[64,120]);(ROOT/'qa.json').write_text(json.dumps(qa,indent=2)+'\n')
out=Image.new('RGB',(768,600),'#101814');draw=ImageDraw.Draw(out)
for i,id in enumerate(FILES):
 for j,pose in enumerate(['idle','attack']):
  im=Image.open(ROOT/f'{id}-{pose}.png').resize((256,256),Image.Resampling.NEAREST);out.paste(im,(i*256,24+j*290),im);draw.text((i*256+8,6+j*290),id+' '+pose,fill='#b5ef71')
out.save(ROOT/'attack-preview.png')
light=Image.new('RGB',(768,300),'#e8efdf')
for i,id in enumerate(FILES):
 im=Image.open(ROOT/f'{id}-attack.png').resize((256,256),Image.Resampling.NEAREST);light.paste(im,(i*256,24),im)
light.save(ROOT/'attack-preview-light.png')
print(json.dumps({'attackFiles':3,'idlePortraitHashesUnchanged':True,'manifest':str(ROOT/'characters.json')}))
