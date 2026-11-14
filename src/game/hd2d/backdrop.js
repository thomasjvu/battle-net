import * as THREE from 'three';

const corners = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];

export function networkBackdrop(region) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const color = '#' + region.color.toString(16).padStart(6, '0');
  const background = '#' + region.fog.toString(16).padStart(6, '0');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  let lastFrame = -1;
  function cube(x, y, angle, size) {
    const points = corners.map(([a,b,c]) => {
      const horizontal = a * Math.cos(angle) - c * Math.sin(angle);
      const depth = a * Math.sin(angle) + c * Math.cos(angle);
      return [x + horizontal * size, y + (b * .82 - depth * .54) * size];
    });
    ctx.beginPath();
    for (const [from,to] of edges) {
      ctx.moveTo(...points[from]);
      ctx.lineTo(...points[to]);
    }
    ctx.stroke();
  }
  function update(time) {
    // The backdrop is deliberately a low-frequency animation: it is a subtle
    // scene texture, and uploading it at full animation rate wastes bandwidth.
    const frame = Math.floor(time * 12);
    if (frame === lastFrame) return;
    lastFrame = frame;
    ctx.globalAlpha = 1;
    ctx.fillStyle = background;
    ctx.fillRect(0,0,256,256);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.35;
    for (const [x,y,phase] of [[32,46,0],[160,46,1],[96,174,2],[224,174,3]]) {
      const wave = Math.sin(time * 1.45 + phase);
      const angle = Math.PI/4 + time*.44 + phase*.18;
      ctx.globalAlpha = .24 + wave*.055;
      cube(x,y-7-wave*5,angle,9);
      cube(x-12-wave*3,y+9,angle,9);
      cube(x+12+wave*3,y+9,angle,9);
    }
    texture.offset.set((time*.012)%1,(time*.008)%1);
    texture.needsUpdate = true;
  }
  update(0);
  return {texture,update};
}
