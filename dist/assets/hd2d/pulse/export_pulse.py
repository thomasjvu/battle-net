from pathlib import Path
from PIL import Image,ImageDraw
from scipy.ndimage import label,find_objects,binary_dilation
import numpy as np,json,shutil,hashlib
ROOT=Path(__file__).parent;GEN=Path('/Users/area/.codex/generated_images/01a1d784-c780-7d73-b1d9-641694019aa4');ASSET='assets/hd2d/pulse/'
HEX=['081925','102b36','15404a','1b5660','21727d','248f9b','30b2c0','43cad5','7adce1','a9edf0','24343f','3d505d','637982','95a8b5','bdccd5','dbe5ed','f2f6f4','ffffff','315347','57936f','8dcf88','b5ef9a','d9f8c8','433236','775347','b98067','e5ac87','ffd1ac','ffe9cf','4c4b58','797b8a','a6a9b6']
PAL=np.array([tuple(bytes.fromhex(h)) for h in HEX],dtype=np.int32)
def finish(im,scale):
 im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS);a=np.array(im);d=((a[:,:,:3].astype(np.int32)[:,:,None,:]-PAL[None,None,:,:])**2).sum(3);a[:,:,:3]=PAL[d.argmin(2)];a[:,:,3]=np.where(a[:,:,3]>=230,255,0);return Image.fromarray(a)
def meta(path,frames):return dict(path=ASSET+path.name,frameWidth=128,frameHeight=128,frameCount=frames,anchor=[64,120],sha256=hashlib.sha256(path.read_bytes()).hexdigest())
idles=[];clips=[];qa=[];sources=json.loads((ROOT/'source-map.json').read_text())
for name,file in sources.items():
 src=ROOT/'source'/f'{name}.png'
 if not src.exists():shutil.copy2(GEN/file,src)
 sheet=Image.open(src).convert('RGBA');direction,action=name.split('-');frames=[]
 if action=='idle':
  a=np.array(sheet);mask=a[:,:,3]>=240;labels,n=label(mask);counts=np.bincount(labels.ravel());counts[0]=0;owner=counts.argmax();m=binary_dilation(labels==owner,iterations=2);a[:,:,3]=np.where(m,a[:,:,3],0);ys,xs=np.where(labels==owner);top=ys.min();base=ys.max()+1;hx=np.median(np.where((labels==owner)&(np.indices(mask.shape)[0]<top+int((base-top)*.2)))[1]);scale=108/(base-top);im=finish(Image.fromarray(a),scale);out=Image.new('RGBA',(128,128));out.alpha_composite(im,(round(64-hx*scale),round(120-base*scale)));frames=[out]
 else:
  rgba=np.array(sheet);labels,n=label(rgba[:,:,3]>=240);owners=[];h=sheet.height//2;sw=sheet.width//3;w=sw+96;cells=[];boxes=[];hair=[]
  for idx,sl in enumerate(find_objects(labels),1):
   if np.count_nonzero(labels[sl]==idx)>3000:owners.append((idx,sl))
  assert len(owners)==6,(name,'ownership count',len(owners));owners.sort(key=lambda o:(0 if o[1][0].start<h else 1,o[1][1].start))
  for i,(owner,sl) in enumerate(owners):
   assert sl[0].start>0 and sl[0].stop<sheet.height and sl[1].start>0 and sl[1].stop<sheet.width
   a=rgba.copy();a[:,:,3]=np.where(binary_dilation(labels==owner,iterations=2),rgba[:,:,3],0);im=Image.fromarray(a).crop(((i%3)*sw-48,(i//3)*h,(i%3+1)*sw+48,(i//3+1)*h));a=np.array(im);ys,xs=np.where(a[:,:,3]>=240);bb=(int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1));boxes.append(bb)
   region=a[:bb[1]+80];m=(region[:,:,3]>=240)&(region[:,:,1].astype(int)>region[:,:,0].astype(int)+3)&(region[:,:,2].astype(int)>region[:,:,0].astype(int)+3);hy,hx=np.where(m);hair.append(float(np.median(hx)));cells.append(im)
  top=min(b[1] for b in boxes);base=max(b[3] for b in boxes);scale=108/(base-top)
  for im,hx in zip(cells,hair):
   im=finish(im,scale);out=Image.new('RGBA',(128,128));out.alpha_composite(im,(round(64-hx*scale),round(120-base*scale)));frames.append(out)
  fd=ROOT/name;fd.mkdir(exist_ok=True)
  for i,im in enumerate(frames):im.save(fd/f'{i:02}.png')
 strip=Image.new('RGBA',(128*len(frames),128))
 for i,im in enumerate(frames):
  bb=im.getbbox();assert bb[0]>0 and bb[1]>0 and bb[2]<128 and bb[3]<128;assert np.unique(np.array(im)[:,:,3]).tolist()==[0,255];strip.alpha_composite(im,(i*128,0))
 path=ROOT/f'{name}.png';strip.save(path);record=meta(path,len(frames));record.update(direction=direction,action=action)
 if action=='walk':
  assert len(set(hashlib.sha256(im.tobytes()).hexdigest() for im in frames))==6;record.update(id='pulse-'+name,character='pulse',fps=10,repeat=-1,frames=[ASSET+name+f'/{i:02}.png' for i in range(6)]);clips.append(record)
 else:idles.append(record)
 qa.append(dict(id=name,binaryAlpha=True,clearMargins=True,frameCount=len(frames),uniqueFrames=len(set(hashlib.sha256(im.tobytes()).hexdigest() for im in frames))))
manifest=dict(version=1,status='ready',character='pulse',route='image_gen built-in native drawn frames',palette=['#'+h for h in HEX],frameWidth=128,frameHeight=128,anchor=[64,120],idles=idles,clips=clips,west={'sourceDirection':'east','flipX':True},run={'reuse':'walk','fps':14,'distinctRunFrames':False},limitations=['Sprint reuses genuine walk drawings at faster playback; no distinct run cycle.','Some fine sleeve/cuff and ribbon details vary between generated poses.'])
(ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');(ROOT/'qa.json').write_text(json.dumps(dict(checks=qa,warnings=manifest['limitations'],reviewStatus='reviewed-all21-native-poses'),indent=2)+'\n')
review=Image.new('RGB',(768,3*300),'#15303d');draw=ImageDraw.Draw(review)
for row,direction in enumerate(['south','east','north']):
 draw.text((5,row*300+3),direction+' idle / six-frame walk',fill='#b5ef9a');im=Image.open(ROOT/f'{direction}-idle.png');review.paste(im,(320,row*300+20),im);im=Image.open(ROOT/f'{direction}-walk.png');review.paste(im,(0,row*300+155),im)
review.save(ROOT/'preview.png');print(json.dumps(dict(idles=len(idles),clips=len(clips),walkFrames=18,manifest=str(ROOT/'manifest.json'))))
