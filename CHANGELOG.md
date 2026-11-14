# Changelog

## In development

- Upgraded `battlenet.testnet` to NEP-245 contract v0.5.0 with a state-preserving migration, six Pocket Home decor tokens, onchain metadata, and one-time decor for existing players.
- Added a decoratable personal base and three distinct dungeon routes branching from Relay Town. Future towns are sealed at the ends of the routes.
- Added eight-direction idle and walking for Pulse and removed pointer movement from exploration.

- Expanded folders to 30 chips with five random chips at battle start. Existing saves receive starter copies to complete their folders.
- PvP opens Custom automatically every eight seconds; solo battles wait for the player to activate the full gauge.
- Dungeon movement triggers random virus battles. Story battles use abstract markers and Relay Town is encounter-free.
- Brought the default camera closer to the character.
- Duel chip identities stay hidden during combat. Shared-screen Custom selection uses a pass-the-screen prompt.

- Added Relay Town as a safe hub with a dungeon gate, trading, companions and a local duel arena.
- Added persistent field HP and full recovery in town.
- Battle wins award gold and XP, with an 8% chip drop chance or 14% at S rank.
- Reworked chip presentation and added impact and movement particles.
- Local duels use shared Custom selection, charged busters and ordered chip loadouts.

## 0.6.0

- Rebuilt network exploration in Three.js with raised floors, ramps, floor collision and click navigation.
- Added a rotating camera, zoom, dynamic lighting, shadows and adjustable visual effects.
- Added Pulse's directional cyber outfit and walk animation. Sprint uses the same frames at a faster rate.
- Press J to switch between the network and forest. Grid combat uses Phaser.

## 0.5.0

- Replaced solo focus/autodraw flow with paused Custom selection, chip codes, ordered single-use chips and an eight-second Custom Gauge.
- Added charge/release buster and original three-Cannon Program Advance.
- Added jack-in network exploration, void collision, terminals, mystery data and jack-out forest access.
- Added original network battle art, cyan interface and connected red/blue panel field.
- Preserved local collection, compact 12-chip folders, local duel rules and paused live NEAR deployment.

## 0.4.1

- Removed overworld stamina and exhaustion; running is unlimited.
- Rebuilt world ground rendering, forest density, side trails, shoreline, village planting and ambient details.
- Added terrain minimap and proximity labels; wandering encounters require interaction.
- Protected saved positions and path access through the revised forest.

## 0.4.0

- Added continuous roaming world, camera following, collision/pathfinding, running stamina, quests, treasure, shrines, rune puzzle and roaming encounters.
- Added native drawn Pulse directional walk/run cycles, fantasy terrain and props.
- Expanded to 32 cards/items with 16 new spells and original card art.
- Added same-keyboard PvP and practice bot with four selectable decks and equal equipment.
- Expanded the local-tested NEAR contract catalog to 32; live deployment remains paused.

## 0.3.0

Replaced the page-based prototype with full-screen Phaser scenes. Converted the visual direction to fantasy cards, woodland creatures and anime adventurers. Added 12-card decks, a three-copy cap, owned-copy checks, focus costs, real draw/discard/reshuffle, and persistent three-card victory reward choices. Ported the campaign, merchant, forge, companions, journal, options and NEAR trading hall into the game canvas. Browser saves migrate from the previous versions.

## 0.2.0

Added nine encounters, three companions, elemental combos, equipment, progression, merchant simulation, original portraits and attack drawings, a Rust NEAR economy contract, a testnet wallet adapter, contract unit tests, and real local-sandbox transaction tests. Live deployment remains on hold by owner request.

## 0.1.0

Initial grid-battle prototype with local chips, merchant and cosmetic forge.
