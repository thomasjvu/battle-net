"""Ownership-slice native drawn sheets; register at one scale per action.
No limb warps, generated motion, or copies of a single held pose are synthesized here.
"""
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np,json,shutil,hashlib
from scipy.ndimage import label,find_objects,binary_dilation
ROOT=Path(__file__).parent;GEN=Path('/Users/area/.codex/generated_images/01a1d784-c780-7d73-b1d9-641694019aa4');DEST=ROOT/'pulse';DEST.mkdir(exist_ok=True)
palette=json.loads((ROOT.parent/'manifest.json').read_text())['palette'];PAL=np.array([tuple(bytes.fromhex(x[1:])) for x in palette],dtype=np.int32)
clips=[];qa=[]
for name,file in json.loads((ROOT/'sheet-sources.json').read_text()).items():
 src=ROOT/'source'/f'{name}-sheet.png'
 if not src.exists():shutil.copy2(GEN/file,src)
 sheet=Image.open(src).convert('RGBA');sw=sheet.width//3;h=sheet.height//2;w=sw+96;cells=[];boxes=[];hair=[]
 rgba=np.array(sheet);labels,n=label(rgba[:,:,3]>=230);owners=[]
 for idx,sl in enumerate(find_objects(labels),1):
  area=np.count_nonzero(labels[sl]==idx)
  if area>3000:owners.append((idx,sl))
 assert len(owners)==6,(name,'expected six separate full-body ownership components',len(owners))
 owners.sort(key=lambda o:(0 if o[1][0].start<h else 1,o[1][1].start))
 for i,(owner,sl) in enumerate(owners):
  assert sl[0].start>0 and sl[0].stop<sheet.height and sl[1].start>0 and sl[1].stop<sheet.width,(name,i,'source art clipped')
  mask=binary_dilation(labels==owner,iterations=2);owned=rgba.copy();owned[:,:,3]=np.where(mask,rgba[:,:,3],0)
  im=Image.fromarray(owned).crop(((i%3)*sw-48,(i//3)*h,(i%3+1)*sw+48,(i//3+1)*h));a=np.array(im);ys,xs=np.where(a[:,:,3]>=230);bb=(int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1));boxes.append(bb)
  region=a[:min(h,bb[1]+90)];mask=(region[:,:,3]>=230)&(region[:,:,1].astype(int)>region[:,:,0].astype(int)+3)&(region[:,:,2].astype(int)>region[:,:,0].astype(int)+3);hy,hx=np.where(mask);hair.append(float(np.median(hx)) if len(hx) else (bb[0]+bb[2])/2);cells.append(im)
 # Single scale/vertical registration over entire action preserves flight and bob.
 top=min(b[1] for b in boxes);baseline=max(b[3] for b in boxes);scale=108/(baseline-top)
 left=min(b[0]-x for b,x in zip(boxes,hair));right=max(b[2]-x for b,x in zip(boxes,hair));scale=min(scale,59/max(1,-left),59/max(1,right))
 frames=[];framepaths=[]
 fd=DEST/name;fd.mkdir(exist_ok=True)
 for i,(im,hx) in enumerate(zip(cells,hair)):
  # Transparent source cells are resized with one scale; no per-frame bbox resizing.
  im=im.resize((round(w*scale),round(h*scale)),Image.Resampling.LANCZOS);a=np.array(im);d=((a[:,:,:3].astype(np.int32)[:,:,None,:]-PAL[None,None,:,:])**2).sum(3);a[:,:,:3]=PAL[d.argmin(2)];a[:,:,3]=np.where(a[:,:,3]>=220,255,0);im=Image.fromarray(a)
  canvas=Image.new('RGBA',(128,128));canvas.alpha_composite(im,(round(64-hx*scale),round(120-baseline*scale)));bb=canvas.getbbox();assert bb[0]>0 and bb[1]>0 and bb[2]<128 and bb[3]<128
  path=fd/f'{i:02}.png';canvas.save(path);frames.append(canvas);framepaths.append('assets/fantasy/locomotion/pulse/'+name+'/'+path.name)
 strip=Image.new('RGBA',(768,128))
 for i,im in enumerate(frames):strip.alpha_composite(im,(i*128,0))
 strip.save(DEST/f'{name}.png');fps=10 if name.endswith('walk') else 14
 frames[0].save(DEST/f'{name}-preview.gif',save_all=True,append_images=frames[1:],duration=round(1000/fps),loop=0,disposal=2,transparency=0)
 hashes=[hashlib.sha256(im.tobytes()).hexdigest() for im in frames];assert len(set(hashes))==6
 changes=[round(float(np.mean(np.any(np.array(frames[i])!=np.array(frames[(i+1)%6]),axis=2))),4) for i in range(6)]
 clip=dict(id='pulse-'+name,character='pulse',direction=name.split('-')[0],action=name.split('-')[1],path='assets/fantasy/locomotion/pulse/'+name+'.png',frameWidth=128,frameHeight=128,frameCount=6,fps=fps,repeat=-1,anchor=[64,120],frames=framepaths,artSource='host_image',route='image_gen built-in drawn-frame sheet',frameOrder=[0,1,2,3,4,5])
 clips.append(clip);qa.append(dict(id=clip['id'],uniqueFrames=6,binaryAlpha=True,sourceOwnershipMargins=True,outputMargins=True,adjacentChangedPixelFraction=changes,scale=scale))
manifest=dict(version=2,status='ready',character='pulse',frameWidth=128,frameHeight=128,anchor=[64,120],west={'sourceDirection':'east','flipX':True},artSource='host_image',route='image_gen built-in native drawn pose sheets',clips=clips,limitations=['Drawn held-frame animation, not image-to-video.','Small wand/hand details vary between some generated poses.','Nova and Echo locomotion not included in this first bundle.'])
(ROOT/'locomotion.json').write_text(json.dumps(manifest,indent=2)+'\n')
(ROOT/'qa.json').write_text(json.dumps(dict(clips=qa,warnings=['Small wand/hand detail consistency varies in generated sheets.'],reviewStatus='reviewed-native-pose-contact-sheet'),indent=2)+'\n')
review=Image.new('RGB',(768,6*160),'#f0e3c5');draw=ImageDraw.Draw(review)
for row,c in enumerate(clips):
 draw.text((5,row*160+2),c['id'],fill='#352745');im=Image.open(ROOT.parent.parent.parent/c['path']) if False else Image.open(DEST/(c['direction']+'-'+c['action']+'.png'));review.paste(im,(0,row*160+24),im)
review.save(ROOT/'review.png');print(json.dumps(dict(clips=6,frames=36,manifest=str(ROOT/'locomotion.json'))))
