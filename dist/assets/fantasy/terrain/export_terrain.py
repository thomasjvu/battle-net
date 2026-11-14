from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
import numpy as np,json,shutil
ROOT=Path(__file__).parent;GEN=Path('/Users/area/.codex/generated_images/01a1d784-c780-7d73-b1d9-641694019aa4');assets=[]
for id,file in json.loads((ROOT/'source-map.json').read_text()).items():
 src=ROOT/'source'/f'{id}.png'
 if not src.exists():shutil.copy2(GEN/file,src)
 im=Image.open(src).convert('RGBA');tile=id in ['meadow','forest-floor','dirt-material']
 if tile:
  a=np.array(im.convert('RGB').resize((128,128),Image.Resampling.LANCZOS)).astype(float)
  # Blend only opposite edge bands; preserve the original non-mirrored interior.
  for axis in [1,0]:
   for i in range(8):
    weight=(8-i)/16
    if axis==1:
     left=a[:,i].copy();right=a[:,-1-i].copy();a[:,i]=left*(1-weight)+right*weight;a[:,-1-i]=right*(1-weight)+left*weight
    else:
     top=a[i].copy();bottom=a[-1-i].copy();a[i]=top*(1-weight)+bottom*weight;a[-1-i]=bottom*(1-weight)+top*weight
  out=Image.fromarray(np.clip(a,0,255).astype('uint8')).quantize(colors=32,dither=Image.Dither.NONE).convert('RGB').resize((256,256),Image.Resampling.NEAREST);a=np.array(out);assert np.array_equal(a[0],a[-1]) and np.array_equal(a[:,0],a[:,-1]);anchor=None

 else:
  a=np.array(im)[:,:,3];ys,xs=np.where(a>=220);im=im.crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1));scale=min(58/im.width,58/im.height);im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS);alpha=im.getchannel('A').point(lambda v:255 if v>=205 else 0);im=im.convert('RGB').quantize(colors=48,dither=Image.Dither.NONE).convert('RGBA');im.putalpha(alpha);canvas=Image.new('RGBA',(64,64));canvas.alpha_composite(im,((64-im.width)//2,(64-im.height)//2));out=canvas.resize((128,128),Image.Resampling.NEAREST);anchor=[64,64];a=np.array(out);assert np.unique(a[:,:,3]).tolist()==[0,255]
 out.save(ROOT/f'{id}.png');assets.append(dict(id=id,path='assets/fantasy/terrain/'+id+'.png',width=out.width,height=out.height,anchor=anchor,repeatable=tile,logicalPixelSize=2))
(ROOT/'manifest.json').write_text(json.dumps(dict(version=1,assets=assets,route='image_gen built-in',finish='2px clusters; opposite edge-band blending guarantees equal edges without mirroring interiors'),indent=2)+'\n');print(json.dumps(assets))
