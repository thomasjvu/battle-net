from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
import numpy as np,json,shutil,hashlib
ROOT=Path(__file__).parent;GEN=Path('/Users/area/.codex/generated_images/01a1d784-c780-7d73-b1d9-641694019aa4');assets=[]
for id,file in json.loads((ROOT/'source-map.json').read_text()).items():
 src=ROOT/'source'/f'{id}.png'
 if not src.exists():shutil.copy2(GEN/file,src)
 im=Image.open(src).convert('RGBA');tile=id in ['grass','path']
 if tile:
  # Mirrored four-quadrant material guarantees identical opposite boundary pixels.
  q=im.convert('RGB').resize((64,64),Image.Resampling.LANCZOS).quantize(colors=24,dither=Image.Dither.NONE).convert('RGB');out=Image.new('RGB',(128,128));out.paste(q,(0,0));out.paste(ImageOps.mirror(q),(64,0));out.paste(ImageOps.flip(q),(0,64));out.paste(ImageOps.flip(ImageOps.mirror(q)),(64,64));a=np.array(out);assert np.array_equal(a[0],a[-1]) and np.array_equal(a[:,0],a[:,-1]);anchor=None
 else:
  a=np.array(im)[:,:,3];ys,xs=np.where(a>=220);im=im.crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1));size={'oak-tree':(256,256),'cottage':(256,256),'rock':(96,96),'chest':(64,64),'noticeboard':(128,128),'campfire':(128,128),'banner':(128,128),'shrine':(128,128)}[id];scale=min((size[0]-8)/im.width,(size[1]-16 if id in ['noticeboard','campfire','banner','shrine'] else size[1]-8)/im.height);im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS);alpha=im.getchannel('A').point(lambda x:255 if x>=205 else 0);im=im.convert('RGB').quantize(colors=48,dither=Image.Dither.NONE).convert('RGBA');im.putalpha(alpha);out=Image.new('RGBA',size);baseline=120 if id in ['noticeboard','campfire','banner','shrine'] else size[1]-4;out.alpha_composite(im,((size[0]-im.width)//2,baseline-im.height));anchor=[size[0]//2,baseline];assert set(np.array(out)[:,:,3].flatten())=={0,255}
 path=ROOT/f'{id}.png';out.save(path);assets.append(dict(id=id,path='assets/fantasy/roam/'+path.name,width=out.width,height=out.height,anchor=anchor,seamless=tile,sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
(ROOT/'manifest.json').write_text(json.dumps(dict(version=1,artSource='host_image',route='image_gen built-in',assets=assets),indent=2)+'\n')
preview=Image.new('RGB',(768,640),'#eee2c6');draw=ImageDraw.Draw(preview)
for i,id in enumerate(['grass','path']):
 im=Image.open(ROOT/f'{id}.png')
 for x in range(3):
  for y in range(3):preview.paste(im,(i*384+x*128,y*128))
for i,m in enumerate([a for a in assets if not a['seamless']]):
 im=Image.open(ROOT/(m['id']+'.png'));im.thumbnail((180,210),Image.Resampling.NEAREST);preview.paste(im,(i*192,400),im);draw.text((i*192+4,620),m['id'],fill='#352745')
preview.save(ROOT/'preview.png');print(json.dumps(dict(files=len(assets),tileOppositeEdgesEqual=True)))
