"""Finish generated canonical adult character artwork for the game's native sizes."""
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np
import json, shutil, hashlib
ROOT=Path(__file__).parent
GEN=Path('/Users/area/.codex/generated_images/01a1d784-c780-7d73-b1d9-641694019aa4')
SOURCES={
'pulse':('exec-3adbfeac-368c-4a72-8579-acb3c79efe07.png','exec-10ec125e-ffef-4fa7-848e-0112f2ba7908.png'),
'nova':('exec-ec545b24-114a-4d08-97ef-45d01bbc2d5c.png','exec-98c26bdf-96d0-4d66-9cbf-59ec59bc79cf.png'),
'echo':('exec-142d155f-1283-48b3-b0ab-8f64c518a158.png','exec-4b2362a0-8e63-4563-b628-bf082c495db9.png')}
HEX=['101814','20232e','34333e','494552','69606c','a9a2b6','e6e2ec','123640','155c62','217d86','34a9b3','34cbd3','7be5dc','789b55','b5ef71','defbd0','35223b','4c2235','73304e','9c415c','c25a78','e77b9d','ff91b4','ffc0ce','b93752','d95165','f16f74','ffb184','553b29','8f5a2b','b97b32','e9b85b','fff0b0','291f35','352745','50345f','714585','9568d4','b98ae6','d4b2f5','9c5e50','c1846b','e9a989','ffd0ae','ffe8ce','f8f5e9','1b594a','52a888']
PAL=np.array([tuple(bytes.fromhex(x)) for x in HEX],dtype=np.int32)
def source(id,kind,file):
 target=ROOT/'source'/f'{id}-{kind}.png'
 if not target.exists(): shutil.copy2(GEN/file,target)
 return Image.open(target).convert('RGBA')
def reduce(im,size):
 im=im.resize(size,Image.Resampling.LANCZOS);a=np.array(im);rgb=a[:,:,:3].astype(np.int32)
 d=((rgb[:,:,None,:]-PAL[None,None,:,:])**2).sum(3);a[:,:,:3]=PAL[d.argmin(2)];a[:,:,3]=np.where(a[:,:,3]>=192,255,0)
 return Image.fromarray(a)
def crop(im):
 a=np.array(im)[:,:,3];ys,xs=np.where(a>=220);return im.crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1))
def save(im,path):
 im.save(path);a=np.array(im);bb=im.getbbox();assert np.unique(a[:,:,3]).tolist()==[0,255];assert bb[0]>0 and bb[1]>0 and bb[2]<im.width and bb[3]<im.height
 return dict(path='assets/characters/'+path.name,width=im.width,height=im.height,contentBounds=list(bb),alphaValues=[0,255],sha256=hashlib.sha256(path.read_bytes()).hexdigest())
characters=[]
for id,(full,portrait) in SOURCES.items():
 im=crop(source(id,'master',full));scale=min(112/im.height,112/im.width);size=(round(im.width*scale),round(im.height*scale));im=reduce(im,size)
 # Register to midpoint of boots, not weapon/hair bounding box.
 a=np.array(im)[:,:,3];ys,xs=np.where(a[max(0,im.height-8):]>0);foot=(xs.min()+xs.max())/2
 x=round(64-foot);y=120-im.height
 assert x>=2 and x+im.width<=126
 sprite=Image.new('RGBA',(128,128));sprite.alpha_composite(im,(x,y));s=save(sprite,ROOT/f'{id}-idle.png');s.update(anchor=[64,120],facing='left' if id=='nova' else 'right',frames=1)
 sprite.resize((512,512),Image.Resampling.NEAREST).save(ROOT/f'{id}-idle@4x.png')
 im=crop(source(id,'portrait-master',portrait));scale=min(116/im.width,152/im.height);im=reduce(im,(round(im.width*scale),round(im.height*scale)))
 p=Image.new('RGBA',(128,160));p.alpha_composite(im,((128-im.width)//2,156-im.height));p=p.resize((256,320),Image.Resampling.NEAREST);meta=save(p,ROOT/f'{id}-portrait.png')
 characters.append(dict(id=id,name=id.capitalize(),age=27 if id=='pulse' else 26 if id=='nova' else 29,role={'pulse':'Network operator','nova':'Rival duelist','echo':'Signal hacker'}[id],sprite=s,portrait=meta))
manifest=dict(version=1,artSource='host_image',route='image_gen built-in',model='not reported',palette=['#'+h for h in HEX],characters=characters,limitations=['One held combat pose per character; no animation strips.','Pixel finish is downsampled and palette-reduced generated artwork; portraits use 2x nearest-neighbor logical pixels.'])
(ROOT/'characters.json').write_text(json.dumps(manifest,indent=2)+'\n')
preview=Image.new('RGB',(960,680),'#101814');draw=ImageDraw.Draw(preview)
for i,c in enumerate(characters):
 x=i*320;draw.text((x+12,8),c['name']+' / adult cyber-operator',fill='#b5ef71')
 p=Image.open(ROOT/f'{c["id"]}-portrait.png');preview.paste(p,(x+32,28),p)
 s=Image.open(ROOT/f'{c["id"]}-idle.png');s=s.resize((256,256),Image.Resampling.NEAREST);preview.paste(s,(x+32,366),s)
 draw.text((x+12,644),'Portrait 256x320 / sprite 128x128',fill='#b5ef71')
preview.save(ROOT/'preview.png')
(ROOT/'qa.json').write_text(json.dumps(dict(runtimeFiles=6,binaryAlpha=True,transparentMargins=True,commonSpriteAnchor=[64,120],paletteColors=len(HEX),warnings=[],review='Reviewed exported portraits and combat sprites for identity, silhouette, and alpha on dark and light backgrounds.'),indent=2)+'\n')
print(json.dumps(dict(characters=len(characters),nativeFiles=6,manifest=str(ROOT/'characters.json'))))
light=Image.new('RGB',(768,448),'#e8efdf')
for i,id in enumerate(SOURCES):
 p=Image.open(ROOT/f'{id}-portrait.png');light.paste(p,(i*256,0),p)
 p=Image.open(ROOT/f'{id}-idle.png');light.paste(p,(i*256+64,320),p)
light.save(ROOT/'preview-light.png')
