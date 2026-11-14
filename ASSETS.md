# Battle Net original art bundle

Complete: 10 transparent runtime PNGs, matching 4× nearest-neighbor exports, preserved generated source masters, shared 22-color palette, manifest, and dark/light preview. No application or hosting files were changed.

All paths below are relative to `/Users/area/battle-net/battle-net/dist/`.

| Asset | Runtime path | Native canvas | Anchor | Facing |
|---|---|---|---|---|
| Pulse.exe | `assets/sprites/pulse-idle.png` | 96×96 | [48,90] | right |
| Hex Guard | `assets/sprites/hex-guard-idle.png` | 96×96 | [48,90] | left |
| Cannon | `assets/chips/cannon.png` | 64×64 | [32,32] | — |
| Longsword | `assets/chips/longsword.png` | 64×64 | [32,32] | — |
| Gold Longsword | `assets/chips/gold-longsword.png` | 64×64 | [32,32] | — |
| Thunder | `assets/chips/thunder.png` | 64×64 | [32,32] | — |
| Recover | `assets/chips/recover.png` | 64×64 | [32,32] | — |
| Barrier | `assets/chips/barrier.png` | 64×64 | [32,32] | — |
| Buster | `assets/equipment/buster.png` | 64×64 | [32,32] | right |
| Armor | `assets/equipment/armor.png` | 64×64 | [32,32] | — |

Each runtime PNG has a sibling `NAME@4x.png` (384×384 characters, 256×256 icons) for larger UI use. Prefer native files for canvas. Machine-readable metadata: `assets/manifest.json`; validation: `assets/qa.json`; visual inspection: `assets/preview.png`.

## Integration

Use `ctx.imageSmoothingEnabled = false`. CSS images: `image-rendering: pixelated; object-fit: contain`. Draw both characters against the same panel foot anchor:

```js
ctx.drawImage(sprite, x - 48 * scale, y - 90 * scale, 96 * scale, 96 * scale);
```

A whole-number scale preserves the pixel finish. At native size Pulse is 84px tall; Hex Guard is intentionally a shorter, wider virus. Hero already faces toward enemy territory; no mirroring needed. Gold Longsword is cosmetic artwork and should use the exact same combat behavior as standard Longsword.

These are still master poses, not animation sheets. Use translation for a restrained idle bob/recoil and a brief runtime color/opacity flash for damage. No fabricated shoot/hurt frame aliases are supplied.

## Provenance and validation

Art source: `host_image`, built-in `image_gen`; original designs generated specifically for this project. The tool did not report model identifier or cost. Source PNGs are preserved under `assets/source/`; prompt set is `assets/prompts.json`. Hero has an angular hood helmet, black visor, antenna, mint triangle core and arm cannon. Hex Guard is a nonhumanoid coral hexagonal fortress virus with claws, mint eye and orange core. No copied characters or game artwork.

Finishing: crop to generated alpha, area/Lanczos downsample, snap to one shared 22-color palette, threshold alpha to {0,255}, place on fixed canvas, produce integer nearest-neighbor enlarged copies. `assets/export_assets.py` reproduces these exports from the preserved originals, with project-local source fallback. This is generated illustration with a deliberate reduced pixel finish, not a recovered source pixel lattice.

Validation: 10/10 native PNGs have correct dimensions, binary alpha, visible content, and transparent margins on all four edges. Reviewed the actual final contact sheet against charcoal and pale backgrounds. No runtime validation warnings. Source capability probe (`assets/doctor.json`) reported `skills.present` WARN: `~/.codex/skills: missing generate2dmap, codeart2d`; those routes are unused. Its missing optional API keys/resvg package do not affect built-in generation or finishing.
