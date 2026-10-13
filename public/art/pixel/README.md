# Anime Nexus pixel artwork

These raster game assets were generated for this fan game with the image generation tool. Original generated images remain in `/workspace/generated_images`; the copies here are the game assets. Do not regenerate images during dependency installation or startup.

Hero sheets use a fixed 4 × 4 layout, read left to right, top to bottom:

- `heroes-classic.png`: Goku, Naruto, Luffy, Ichigo; Kaneki, Rimuru, Kirito, Ainz; Vegeta, Sasuke, Zoro, Rukia; Touka, Milim, Asuna, Albedo.
- `heroes-new.png`: Jinwoo, Will, Asta, Yuji; Meliodas, Saber, Tanjiro, Natsu; Cha Hae-In, Elfaria, Yuno, Gojo; Escanor, Gilgamesh, Nezuko, Erza.

`worlds.png` and the three enemy sheets (`enemy-common.png`, `enemy-elite.png`, `enemy-boss.png`) also use 4 × 4 cells in the same world order:

Dragon Ball, Naruto, One Piece, Bleach; Tokyo Ghoul, Slime, SAO, Overlord; Solo Leveling, Wistoria, Black Clover, Jujutsu Kaisen; Seven Deadly Sins, Fate/Zero, Demon Slayer, Fairy Tail.

`nexus-banner.png` is the standalone panoramic scene for the overview page.

Sprite sheets have transparent backgrounds. CSS displays individual cells without altering the source images; `image-rendering: pixelated` preserves hard pixel edges. Keep filenames and cell ordering stable when replacing an atlas. The mapping and dimensions are in `src/pixel-art.js`; rendering styles are in `src/pixel-art.css`.
