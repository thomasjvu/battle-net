# Pocket Home collectible artwork

- `sprites/*-v2.png` are the generated transparent placement sprites used in the 3D Pocket Home. They keep the earlier grounded objects and add tactile storybook paint and material detail.
- `sprites/<name>.png` and `sprites/*.svg` preserve the original 512×512 sprite set and editable vector versions.
- `cards/*.png` are 768×1056 collector card faces for catalogs and marketplace listings; matching SVG files are editable sources.
- `collection-cover.png` is the set cover.
- `collection.json` contains stable token IDs, suggested edition caps, art paths, placement sizes, and NEP-245 metadata-extension fields. The proposed edition caps are collection design values, not minted supply.

The generated v2 sprites are wired into the home-hub asset manifest. Collector card faces and their recorded hashes remain unchanged. Upload token media to content-addressed storage before publishing metadata on chain.
