const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Atlas cells are a fixed part of the artwork, independent of future catalog sorting.
const classic = ['goku', 'naruto', 'luffy', 'ichigo', 'kaneki', 'rimuru', 'kirito', 'ainz', 'vegeta', 'sasuke', 'zoro', 'rukia', 'touka', 'milim', 'asuna', 'albedo'];
const additions = ['jinwoo', 'will', 'asta', 'yuji', 'meliodas', 'saber', 'tanjiro', 'natsu', 'cha-haein', 'elfaria', 'yuno', 'gojo', 'escanor', 'gilgamesh', 'nezuko', 'erza'];
export const PIXEL_WORLD_IDS = ['dragon-ball', 'naruto', 'one-piece', 'bleach', 'tokyo-ghoul', 'slime', 'sao', 'overlord', 'solo-leveling', 'wistoria', 'black-clover', 'jujutsu-kaisen', 'seven-deadly-sins', 'fate-zero', 'demon-slayer', 'fairy-tail'];
export const PIXEL_CHARACTER_ATLAS = Object.fromEntries([
  ...classic.map((id, index) => [id, { file: 'heroes-classic.png', index }]),
  ...additions.map((id, index) => [id, { file: 'heroes-new.png', index }]),
]);
export const PIXEL_ASSET_ROOT = '/art/pixel/';
const position = index => `${(index % 4) / 3 * 100}% ${Math.floor(index / 4) / 3 * 100}%`;
const style = (file, index) => `background-image:url('${PIXEL_ASSET_ROOT}${file}');background-position:${position(index)}`;

export function portrait(character, color, className = '') {
  const cell = PIXEL_CHARACTER_ATLAS[character.id];
  if (!cell) throw new Error(`Missing pixel portrait for ${character.id}`);
  return `<span class="portrait pixel-portrait ${className}" role="img" aria-label="Minh họa ${escape(character.name)}" data-character="${escape(character.id)}" style="--sprite-color:${color}"><span class="pixel-sprite" aria-hidden="true" style="${style(cell.file, cell.index)}"></span></span>`;
}

export function enemyPortrait(world, name) {
  const index = PIXEL_WORLD_IDS.indexOf(world.id);
  if (index === -1) throw new Error(`Missing enemy portrait for ${world.id}`);
  const tier = world.enemies.indexOf(name);
  const file = ['enemy-common.png', 'enemy-elite.png', 'enemy-boss.png'][tier < 0 ? 0 : tier];
  return `<span class="portrait pixel-portrait pixel-enemy" role="img" aria-label="Minh họa đối thủ ${escape(name)}" style="--sprite-color:${world.color}"><span class="pixel-sprite" aria-hidden="true" style="${style(file, index)}"></span></span>`;
}

export function landscape(world, _includeSymbol = true) {
  const index = PIXEL_WORLD_IDS.indexOf(world.id);
  if (index === -1) throw new Error(`Missing pixel landscape for ${world.id}`);
  return `<span class="world-art pixel-landscape" data-world="${world.id}" aria-hidden="true"><span class="pixel-world-tile" style="${style('worlds.png', index)}"></span></span>`;
}

export function heroArt() {
  return `<img class="hero-art pixel-hero-scene" src="${PIXEL_ASSET_ROOT}nexus-banner.png" alt="" aria-hidden="true" fetchpriority="high" width="2172" height="724" />`;
}
