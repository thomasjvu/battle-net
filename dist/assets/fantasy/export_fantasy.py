from PIL import Image, ImageDraw
from pathlib import Path
import numpy as np
import json,shutil,hashlib
ROOT=Path(__file__).parent
GEN=Path('/Users/area/.codex/generated_images/01a1d784-c780-7d73-b1d9-641694019aa4')
base=json.loads((ROOT.parent/'characters/characters.json').read_text())['palette']
colors=list(dict.fromkeys(base+['#272c22','#384b38','#52644b','#728165','#92a47c','#b2c69a','#d5dfb5','#49362b','#68503b','#89684c','#aa8762','#c3a37a','#ddc59a','#f5e6bf','#fff5dc','#57472a','#7b6c31','#a09440','#c9bd66']))
PAL=np.array([tuple(bytes.fromhex(x[1:])) for x in colors],dtype=np.int32)
def finish(im,size):
 im=im.resize(size,Image.Resampling.LANCZOS);a=np.array(im);d=((a[:,:,:3].astype(np.int32)[:,:,None,:]-PAL[None,None,:,:])**2).sum(3);a[:,:,:3]=PAL[d.argmin(2)];a[:,:,3]=np.where(a[:,:,3]>=205,255,0);return Image.fromarray(a)
assets=[]
for name,file in json.loads((ROOT/'source-map.json').read_text()).items():
 src=ROOT/'source'/(name.replace('/','-')+'.png')
 if not src.exists():shutil.copy2(GEN/file,src)
 im=Image.open(src).convert('RGBA');a=np.array(im)[:,:,3];ys,xs=np.where(a>=230);im=im.crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1))
 portrait='portrait' in name; actor=name.startswith(('characters/','monsters/')) and not portrait
 if portrait:
  scale=min(116/im.width,152/im.height);im=finish(im,(round(im.width*scale),round(im.height*scale)));canvas=Image.new('RGBA',(128,160));canvas.alpha_composite(im,((128-im.width)//2,156-im.height));canvas=canvas.resize((256,320),Image.Resampling.NEAREST)
 elif actor:
  a=np.array(im)[:,:,3];ys,xs=np.where(a[-max(1,round(im.height*.06)):]>230);foot=(xs.min()+xs.max())/2
  scale=min(112/im.height,59/max(1,foot),59/max(1,im.width-foot));im=finish(im,(round(im.width*scale),round(im.height*scale)));a=np.array(im)[:,:,3];ys,xs=np.where(a[-max(1,round(im.height*.06)):]>0);foot=(xs.min()+xs.max())/2
  canvas=Image.new('RGBA',(128,128));canvas.alpha_composite(im,(round(64-foot),120-im.height))
 else:
  scale=56/max(im.size);im=finish(im,(round(im.width*scale),round(im.height*scale)));canvas=Image.new('RGBA',(64,64));canvas.alpha_composite(im,((64-im.width)//2,(64-im.height)//2))
 path=ROOT/(name+'.png');canvas.save(path);bb=canvas.getbbox();assert bb[0]>0 and bb[1]>0 and bb[2]<canvas.width and bb[3]<canvas.height;assert np.unique(np.array(canvas)[:,:,3]).tolist()==[0,255]
 assets.append(dict(id=name,path='assets/fantasy/'+name+'.png',width=canvas.width,height=canvas.height,anchor=[64,120] if actor else None,facing=('back' if name.endswith('roam-north') else 'front' if name.endswith('roam-south') else 'left' if 'nova' in name or name.startswith('monsters/') else 'right') if actor else None,contentBounds=list(bb),sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
(ROOT/'manifest.json').write_text(json.dumps(dict(version=1,artSource='host_image',route='image_gen built-in',palette=colors,assets=assets),indent=2)+'\n')
(ROOT/'qa.json').write_text(json.dumps(dict(runtimeFiles=len(assets),binaryAlpha=True,transparentMargins=True,warnings=[],limitations=['Single held idle and attack poses, no animation strips.','Reduced-palette pixel finish from generated cel artwork.']),indent=2)+'\n')
preview=Image.new('RGB',(960,((len(assets)+5)//6)*250),'#f1e4c7');draw=ImageDraw.Draw(preview)
for i,m in enumerate(assets):
 col=i%6;row=i//6;x=col*160;y=row*250
 im=Image.open(ROOT/m['id']).convert('RGBA') if False else Image.open(ROOT/(m['id']+'.png'))
 im.thumbnail((150,212),Image.Resampling.NEAREST);preview.paste(im,(x+(160-im.width)//2,y+8),im);draw.text((x+2,y+222),m['id'].split('/')[-1],fill='#352745')
preview.save(ROOT/'preview.png');print(json.dumps(dict(files=len(assets),manifest=str(ROOT/'manifest.json'))))
