// Applied after tone mapping so the ordered dither operates in display color.
// The separate Phaser canvas keeps sprites in the HUD and text sharp.
export const retroShader = {
  uniforms: {tDiffuse:{value:null},resolution:{value:null}},
  vertexShader: `
    varying vec2 uvScreen;
    void main() {
      uvScreen = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    varying vec2 uvScreen;
    void main() {
      vec2 cell = floor(uvScreen * resolution);
      vec3 color = texture2D(tDiffuse,(cell + .5) / resolution).rgb;
      vec2 p = mod(cell,2.0);
      float threshold = (p.y < 1.0 ? p.x * 2.0 : 3.0 - p.x * 2.0) / 4.0;
      vec3 shaded = floor(color * 30.0 + threshold + .125) / 30.0;
      gl_FragColor = vec4(mix(color,shaded,.68),1.0);
    }
  `
};
