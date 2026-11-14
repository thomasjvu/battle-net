"""Runtime finishing only: crop generated alpha, area-downsample, snap shared palette.
No silhouettes or source artwork are drawn by this script.
"""
from PIL import Image, ImageDraw
from pathlib import Path
import numpy as np
import json, shutil, hashlib
ROOT=Path(__file__).parent
SRC=Path('/Users/area/.codex/generated_images/01a1d784-c780-7d73-b1d9-641694019aa4')
FILES={
'pulse-idle':('exec-f8ff382c-e095-423e-a832-e61b002b046d.png','sprites'),
'hex-guard-idle':('exec-1b00d6d6-efd0-42e6-aed8-36bed8799a37.png','sprites'),
'cannon':('exec-eb464589-3c89-42da-b48e-462baeee4c71.png','chips'),
'longsword':('exec-3780e4bf-dffd-4c4b-a987-c95c43fc77ba.png','chips'),
'gold-longsword':('exec-a7f4bf61-ae56-40ed-8956-1b738210084b.png','chips'),
 'thunder':('exec-30c4ac40-0d52-4142-aa43-9bac2aaea7b2.png','chips'),
 'barrier':('exec-fd0d488c-b222-4341-ad9d-88875582e5e2.png','chips'),
 'armor':('exec-6f727945-d9cf-4a5c-910a-c725284f58ee.png','equipment'),
}
PALETTE=['#101814','#26343d','#454954','#155c62','#16878d','#1ca9b3','#34cbd3','#6ee4de','#b5ef71','#defbd0','#4c2235','#7b2d44','#b93752','#d95165','#f16f74','#ffb184','#553b29','#8f5a2b','#b97b32','#e9b85b','#f8d66d','#fff0b0']
pal=np.array([tuple(bytes.fromhex(c[1:])) for c in PALETTE],dtype=np.int32)
def export(name, file, category):
 source = SRC/file if (SRC/file).exists() else ROOT/'source'/f'{name}.png'
 im=Image.open(source).convert('RGBA')
 if source.resolve() != (ROOT/'source'/f'{name}.png').resolve(): shutil.copy2(source,ROOT/'source'/f'{name}.png')
 a=np.asarray(im)[:,:,3]; ys,xs=np.where(a>=160)
 box=(int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)); im=im.crop(box)
 size=96 if category=='sprites' else 64
 maxdim=84 if category=='sprites' else 56
 scale=maxdim/max(im.size); dims=tuple(max(1,round(n*scale)) for n in im.size)
 im=im.resize(dims,Image.Resampling.LANCZOS)
 arr=np.array(im); rgb=arr[:,:,:3].astype(np.int32)
 # Shared palette and binary alpha: generated texture cannot create color flicker.
 d=((rgb[:,:,None,:]-pal[None,None,:,:])**2).sum(axis=3)
 arr[:,:,:3]=pal[d.argmin(axis=2)]; arr[:,:,3]=np.where(arr[:,:,3]>=160,255,0)
 im=Image.fromarray(arr)
 canvas=Image.new('RGBA',(size,size)); x=(size-im.width)//2; y=90-im.height if category=='sprites' else (size-im.height)//2
 canvas.alpha_composite(im,(x,y)); out=ROOT/category/f'{name}.png'; canvas.save(out)
 canvas.resize((size*4,size*4),Image.Resampling.NEAREST).save(ROOT/category/f'{name}@4x.png')
 bbox=canvas.getbbox(); colors=len(np.unique(np.asarray(canvas)[:,:,:3].reshape(-1,3),axis=0)); alphas=np.unique(np.asarray(canvas)[:,:,3]).tolist()
 assert alphas==[0,255] and bbox[0]>0 and bbox[1]>0 and bbox[2]<size and bbox[3]<size
 return dict(id=name,path=f'assets/{category}/{name}.png',width=size,height=size,anchor=[48,90] if category=='sprites' else [32,32],facing=('right' if name=='pulse-idle' else 'left') if category=='sprites' else None,alphaValues=alphas,contentBounds=list(bbox),colorCount=colors,sha256=hashlib.sha256(out.read_bytes()).hexdigest())
if __name__=='__main__':
 extras=ROOT/'source-map.json'
 if extras.exists(): FILES.update(json.loads(extras.read_text()))
 assets=[export(n,*v) for n,v in FILES.items()]
 manifest=dict(version=1,artSource='host_image',route='image_gen built-in',model='not reported by tool',finish='area-downsampled shared-palette pixel finish',palette=PALETTE,animations='Still masters only; game can apply translation/recoil and hurt flashes.',assets=assets)
 (ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 (ROOT/'qa.json').write_text(json.dumps(dict(runtimeFiles=len(assets),binaryAlpha=True,edgeClipping=False,paletteColors=len(PALETTE),warnings=[],limitations=['Still poses only: no generated shoot/hurt animation frames.','Original masters are high-resolution illustration; runtime files are palette-reduced pixel finish.']),indent=2)+'\n')
 # Preview both dark and light grounds, actual 2x/4x whole-number sampling.
 preview=Image.new('RGB',(800,560),'#101814'); draw=ImageDraw.Draw(preview)
 for idx,asset in enumerate(assets):
  col=idx%5; row=idx//5; x=col*160; y=row*280
  draw.rectangle((x,y+140,x+159,y+258),fill='#e8efdf')
  im=Image.open(ROOT/asset['path'].removeprefix('assets/')); im.thumbnail((112,112),Image.Resampling.NEAREST)
  preview.paste(im,(x+(160-im.width)//2,y+8),im); preview.paste(im,(x+(160-im.width)//2,y+144),im)
  draw.text((x+5,y+123),asset['id'],fill='#b5ef71')
 preview.save(ROOT/'preview.png')
 print(json.dumps(dict(exported=len(assets),manifest=str(ROOT/'manifest.json'))))
