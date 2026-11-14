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

## Adult anime heroine cast — current characters

The new cast is stable for integration; the previous robot hero, virus and all chips remain unchanged. Every heroine is explicitly an adult (Pulse 27, Nova 26, Echo 29), designed originally for this game. Faces and eyes are visible; the canonical hairstyles, accessories and outfits are shared between combat sprites and referenced portraits.

New asset root: `/Users/area/battle-net/battle-net/dist/assets/characters/`. Manifest: `characters.json` in that directory.

| Character | Combat sprite | Size / foot anchor | Portrait | Size |
|---|---|---|---|---|
| Pulse | `assets/characters/pulse-idle.png` | 128×128 / [64,120], right | `assets/characters/pulse-portrait.png` | 256×320 |
| Nova | `assets/characters/nova-idle.png` | 128×128 / [64,120], left | `assets/characters/nova-portrait.png` | 256×320 |
| Echo | `assets/characters/echo-idle.png` | 128×128 / [64,120], right | `assets/characters/echo-portrait.png` | 256×320 |

Each combat sprite also has a `-idle@4x.png` 512×512 nearest-neighbor copy. All three sprites share a fixed height and are registered to the boot midpoint rather than weapon/hair bounding-box center. Nova's saber extends down-left; keep the full 128px canvas when positioning. Draw with `ctx.drawImage(sprite, x - 64 * scale, y - 120 * scale, 128 * scale, 128 * scale)` and disable image smoothing. Portraits are 128×160 logical pixels enlarged 2× for a coherent crisp pixel finish; preserve their full 4:5 canvas with `object-fit: contain`.

Pulse: short dark teal hair, mint triangle clip, cyan jacket and wrist pulse blaster. Nova: pink ponytail, gold star clip, coral battle jacket and saber; her portrait uses a tighter ponytail composition for facial readability. Echo: dark plum bob, violet streak, silver pin, violet tech jacket and data tablet. One held combat pose each, no animation strips; runtime bob/recoil and hit flash can add motion.

Provenance: built-in `image_gen`, seven generations including a targeted Nova portrait composition edit; model/cost were not reported. Full generated artwork and the first Nova portrait are preserved in `characters/source/`. Exact master/portrait prompts are in `characters/prompts.json`; finishing code is `characters/export_characters.py`. Finishing uses generated alpha, Lanczos reduction, shared 48-color palette and binary alpha. All six native PNGs validate dimensions, binary alpha {0,255}, and transparent margins; no QA warnings. Final contact sheets: `characters/preview.png` (dark) and `characters/preview-light.png` (light). `characters/qa.json` records checks. Inspected actual exports at native size and enlarged scale. No application or hosting files were modified.

## Drawn attack poses — current character extension

All three heroines now have one distinct image-edited attack drawing in addition to the preserved idle and portrait. This supersedes the earlier idle-only limitation. Stable files:

| Character | Attack path relative to dist | Canvas | Anchor | Facing |
|---|---|---|---|---|
| Pulse | `assets/characters/pulse-attack.png` | 128×128 | [64,120] | right |
| Nova | `assets/characters/nova-attack.png` | 128×128 | [64,120] | left |
| Echo | `assets/characters/echo-attack.png` | 128×128 | [64,120] | right |

Each has a matching `-attack@4x.png` 512×512 copy. Use the exact same draw position/scale as idle. Suggested brief hold: 160ms for Pulse shots and Echo casts; 180–220ms for Nova saber/chip strikes. `characters.json` version 2 adds `attack` metadata for each heroine; original `sprite` and `portrait` records stay intact. These are held key poses, not animation strips. Pulse braces her extended blaster arm, Nova turns into a broad saber follow-through, Echo casts with both arms. Runtime projectile/slash/ring FX are separate.

Sources are preserved at `characters/source/{pulse,nova,echo}-attack-master.png`; exact edit prompts at `characters/attack-prompts.json`. Route: built-in `image_gen` edit with canonical full-body original as explicit reference; no deterministic limb warps. Reproduce with `python3 dist/assets/characters/export_attacks.py`; for a full rebuild run `export_characters.py` first and `export_attacks.py` second.

Validation: all three new files are 128×128 RGBA, binary alpha {0,255}, shared existing 48-color palette, transparent margins, fixed foot registration. Prior idle and portrait SHA-256 hashes are unchanged. Reviewed attacks beside idle, and on dark and pale grounds: `characters/attack-preview.png` and `characters/attack-preview-light.png`. No QA warnings. Main code and hosting remain untouched.

## Card-battler direction

Current user direction: less science fiction, cards instead of chips, deeper deckbuilding. New original generated card back: `assets/cards/card-back.png`, 1024×1536 opaque PNG (2:3), warm parchment/gold, aubergine ink, mint leaf wreath. Inspected generated output. Route: built-in image_gen. Display with 2:3 aspect ratio and contain. Use card titles, costs, types and descriptions as accessible HTML above/below artwork, not baked into images. Implementation chat has the deckbuilding request: collection/deck editor, deck constraints, draw/discard, combinations and reward choices. Existing character and chip assets preserved; this art handoff does not claim gameplay implementation is complete.

## Full fantasy replacement — current art direction

User explicitly requested less sci-fi across ALL art: characters, monsters, weapons/cards and layout. Use the new `assets/fantasy/` bundle throughout the game; earlier sci-fi assets are preserved as historical sources and should not remain as runtime fallbacks. Main implementation chat owns the Phaser layout/theme conversion.

Manifest: `/Users/area/battle-net/battle-net/dist/assets/fantasy/manifest.json`. Native runtime paths relative to dist:

- `assets/fantasy/characters/{pulse,nova,echo}-idle.png`: 128×128, [64,120] foot anchor; Pulse/Echo right, Nova left.
- `assets/fantasy/characters/{pulse,nova,echo}-attack.png`: 128×128, [64,120], matching facing. Held magic/sword key poses; Nova's overhead sword uses additional silhouette height and therefore her body is smaller in this pose. Prefer a short impact hold with slash FX rather than a long idle/attack crossfade.
- `assets/fantasy/characters/{pulse,nova,echo}-portrait.png`: 256×320; 128×160 logical pixel finish enlarged 2×.
- `assets/fantasy/cards/{cannon,longsword,gold-longsword,thunder,recover,barrier}.png`: 64×64. IDs remain compatible. Display names: Arc Bolt, Longsword, Gold Longsword, Thunder, Recover, Barrier.
- `assets/fantasy/equipment/buster.png`: 64×64 carved wood Focus Wand.
- `assets/fantasy/equipment/armor.png`: 64×64 embroidered Traveler's Cloak.
- `assets/fantasy/monsters/thornling.png` and `briar-guardian.png`: 128×128, [64,120], left-facing. Organic mushroom/branch imp and ancient oak guardian; render guardian larger for boss encounters.
- `assets/environment/forest-clearing.png`: 1672×941 opaque landscape, approximately 16:9. Original hand-painted storybook forest/village clearing with broad playable center, no UI/grid/text.
- `assets/cards/card-front.png`: 1024×1536 opaque parchment/gold botanical frame, no text. Title zone approx x=.18–.83/y=.04–.10; cost medallion center [.09,.065]; art zone x=.08–.92/y=.14–.62; rules zone x=.10–.90/y=.70–.92. These are relative layout guides, not strict masks.
- `assets/cards/card-back.png`: 1024×1536 opaque matching warm card back.

Cast: Pulse wears a mint traveling cape, cream linen and leather vest with wooden leaf-crystal wand. Nova has coral cloth jacket, cream blouse, plum skirt and traditional steel sword. Echo wears violet embroidered robes, carries leather spellbook, and casts by hand. All remain explicitly adult with canonical hair and facial identities. No tech outfits, robots, blasters, data tablets, neon card art or circuit motifs in this new bundle.

QA: all 19 native transparent sprites/icons validate dimensions, binary alpha {0,255} and clear margins. One warm shared 67-color palette. Actual exports inspected on parchment in `assets/fantasy/preview.png`. Generated sources under `assets/fantasy/source/`, complete prompts `assets/fantasy/prompts.json`, reproducible finishing `assets/fantasy/export_fantasy.py`, checks `assets/fantasy/qa.json`. Generated through built-in image_gen; model/cost not reported. Foreground art uses reduced-palette pixel finish; environment remains painted. No app code or hosting files changed here. Layout changes are being integrated separately by the main chat.

### Distinct final boss: Thorn Queen

Stable final sprite: `assets/fantasy/monsters/thorn-queen.png`, 128×128 RGBA, left-facing, anchor [64,120]. An original adult regal forest witch with rose/thorn crown, long dark aubergine hair, plum/moss cloth robes and crooked rosebud staff; distinct from Echo. Add this path for the final boss instead of using a heroine sprite. Same existing fantasy palette and pixel finish. Source: `assets/fantasy/source/monsters-thorn-queen.png`; prompt: `assets/fantasy/thorn-queen-prompt.txt`. Built-in image_gen. Inspected actual native sprite. Native validation passes binary alpha, dimensions and transparent margins. Manifest and QA now cover 20 runtime PNGs. All fantasy outputs are stable for final packaging.

## Free-roaming world extension

Stable roam environment bundle: `assets/fantasy/roam/manifest.json` with six assets. `grass.png` and `path.png` are opaque128×128 repeatable ground materials. Opposite edge pixels are exactly equal on both axes; source art is downsampled, quantized and assembled in mirrored quadrants to guarantee seams. A mirrored repeat can show periodic shapes; inspected in a3×3 tiled preview, not claimed to be an authored terrain autotile/transition set. Use grass as base and path rectangles/stamps for paths.

Transparent props: `oak-tree.png` and `cottage.png`256×256 anchor[128,252]; `rock.png`96×96 anchor[48,92]; `chest.png`64×64 anchor[32,60]. Soft hand-painted pixel finish with binary alpha; no baked ground/shadow. Depth sort by ground anchor and give tree trunk/cottage base colliders, not entire image bounds. Preview: `assets/fantasy/roam/preview.png`. Prompt/source/finishing script are in the same directory. Generated with built-in image_gen; model/cost not reported.

Pulse has distinct directional STOPPED stills: `assets/fantasy/characters/pulse-roam-east.png`, `pulse-roam-south.png`, `pulse-roam-north.png`,128×128 foot anchor[64,120]. East can mirror for west. They show relaxed hands and wand held down, with actual front/back/profile artwork. They are NOT locomotion animation frames.

### Locomotion capability status

Requested real walk/run cycles remain pending external-provider approval. Only route discovered: `local:grok-acp` (Grok/xAI via installed CLI). Initial video generation failed with `Permission denied`. Escalation was automatically rejected because the character reference/prompt would be uploaded to Grok/xAI without explicit approval for that destination. User has been asked for specific upload approval; do not bypass this denial or portray held-still bobbing as real walk/run. No generated walk/run clips or animation strips exist yet. Directional masters and prepared east-walk job/prompt are saved in `assets/fantasy/locomotion/` for resumption after approval.

### Native drawn-frame locomotion — current status supersedes video blocker

The user selected "Keep artwork within current tools" and explicitly requested built-in drawn pose frames. No external Grok/xAI upload was retried. Using the native image tool, we generated actual six-pose sheets from the three directional Pulse masters, corrected east stride/tights drawings, ownership-sliced the six separate silhouettes, registered them at one scale per clip, and applied the existing shared pixel palette. This is drawn-frame sprite animation, not video and not bobbed/warped held artwork.

Stable manifest: `assets/fantasy/locomotion/locomotion.json` (version2,status ready, clips array). Six horizontal strips under `assets/fantasy/locomotion/pulse/`: `east-walk.png`, `east-run.png`, `south-walk.png`, `south-run.png`, `north-walk.png`, `north-run.png`. Each is768×128 with six128×128 cells, ground anchor[64,120]. West mirrors east with `flipX`. Walk10FPS (600ms/cycle); run14FPS (~429ms/cycle). Individual PNGs: `pulse/DIRECTION-ACTION/00.png` through `05.png`. Play in order0,1,2,3,4,5 then wrap; do not ping-pong. Run retains drawn flight poses and cape changes; game owns translation.

Reviewed all36 actual final poses in `locomotion/review.png`. QA: six unique frame hashes per action; binary alpha; clear source ownership and native output margins; one fixed source scale and vertical transform per clip, head-centered horizontal registration. Six figures are separated by full-sheet connected-component ownership, not a rigid cell crop, because capes may extend beyond nominal column boundaries. No anatomy was clipped at those boundaries. Adjacent changed-pixel fractions range7.94%–21.75% across the native128px canvas (details in `locomotion/qa.json`).

Known art warning: "Small wand/hand detail consistency varies in generated sheets." These are stylized held-frame loops with some costume-detail flicker, not perfectly traced animation. Nova/Echo locomotion is not included in this first bundle. All drawing sources and corrections are preserved in `locomotion/source/`; `sheet-sources.json` selects current sheets; `export_native.py` reproduces native strips. Route: built-in image_gen native edit, no external video provider. Do not run the unused prepared video jobs without new explicit user direction.

### Sixteen-card expansion — stable

All16 new illustrations are64×64 transparent PNGs under `assets/fantasy/cards/`: `gust`, `stonewall`, `poison`, `bloom`, `meteor`, `tidal`, `chainlight`, `cleave`, `dash`, `echo`, `draw`, `focus`, `thorns`, `revive`, `slow`, `storm` (append `.png`). Shared existing67-color fantasy palette, binary alpha, clear margins. Each is distinct original generated fantasy spell/item artwork. All39 static bundle files are listed in `assets/fantasy/manifest.json`; sources, exact expansion prompts and QA preserved. Earlier all-asset preview now sizes dynamically to include every file.

## Roam service props — stable

Four distinct service props replace generic rock markers. Paths: `assets/fantasy/roam/noticeboard.png`, `campfire.png`, `banner.png`, `shrine.png`. Each is128×128 transparent RGBA with anchor[64,120]. Noticeboard has pinned parchment under a shingled roof; campfire has logs/flames and stone ring; duel banner has crossed-sword pennant; shrine has mossy carved stone and a mint crystal. Native built-in image_gen original drawings, reduced to restrained48-color pixel finish, binary alpha. Source files and prompts preserved under `roam/source/` and `roam/service-prop-prompts.json`. All four validate128×128, alpha{0,255}, transparent margins and content groundline120 with no warnings (`roam/service-props-qa.json`). Inspected actual final outputs enlarged in `roam/service-props-preview.png`. `roam/manifest.json` now lists all10 environment assets. No application/hosting edits.
