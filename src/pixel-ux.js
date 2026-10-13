import { characterById, worldById } from './data.js';
import { statsFor, xpRequired } from './game.js';
import { ACTIVITIES } from './content.js';
import { portrait } from './art.js';
import { icon } from './icons.js';

const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function nextSession(state) {
  if (state.battle) return {
    title: state.battle.status === 'active' ? 'Trận chiến đang chờ bạn' : 'Kết quả trận chiến',
    description: `${characterById(state.battle.characterId).name} · ${state.battle.enemy.name} · Lượt ${state.battle.turn}`,
    button: state.battle.status === 'active' ? 'Tiếp tục trận đấu' : 'Xem kết quả trận', action: 'nav', attribute: 'data-page="arena"', symbol: 'swords',
  };
  const mini = state.adventure.mini.session;
  if (mini?.status === 'active') return {
    title: 'Bạn có một thử thách còn dở', description: ACTIVITIES.find(a => a.id === mini.kind).name,
    button: 'Tiếp tục mini game', action: 'ex-tab', attribute: `data-id="${mini.kind}"`, symbol: 'play',
  };
  for (const mode of ['tower', 'rush']) {
    const run = state.adventure[mode].run;
    if (run) return {
      title: ACTIVITIES.find(a => a.id === mode).name,
      description: `${mode === 'tower' ? 'Tầng' : 'Trùm'} ${run.stage} · ${run.status === 'choice' ? 'Chọn phước lành để tiếp tục' : 'Đội hình đã sẵn sàng'}`,
      button: 'Tiếp tục hành trình', action: 'ex-tab', attribute: `data-id="${mode}"`, symbol: mode === 'tower' ? 'tower' : 'swords',
    };
  }
  return {
    title: 'Bắt đầu cuộc phiêu lưu', description: 'Chọn chiến trường và thử sức trong trận đầu tiên, hoặc khám phá 6 hoạt động bên dưới.',
    button: 'Bắt đầu hành trình', action: 'nav', attribute: 'data-page="arena"', symbol: 'play',
  };
}

export function playerLobby(state) {
  const character = characterById(state.activeCharacter), world = worldById(character.world);
  const stats = statsFor(state), next = nextSession(state), needed = xpRequired(state.level);
  return `<section class="pixel-lobby" aria-label="Sảnh chơi Nexus">
    <div class="pixel-window launch-console">
      <div class="pixel-window-bar"><span>${icon(next.symbol)} ĐIỂM XUẤT PHÁT</span><span class="console-status">SẴN SÀNG</span></div>
      <div class="launch-console-body"><h2>${next.title}</h2><p>${escape(next.description)}</p><button class="btn primary" data-action="${next.action}" ${next.attribute}>${next.button} ${icon('arrow')}</button><button class="text-button" data-action="nav" data-page="adventures">Xem tất cả chế độ chơi ${icon('play')}</button></div>
    </div>
    <div class="pixel-window player-console" style="--world:${world.color}">
      <div class="pixel-window-bar"><span>${icon('users')} ANH HÙNG CỦA BẠN</span><span>LV.${stats.level}</span></div>
      <div class="player-console-body"><div class="lobby-portrait">${portrait(character, world.color)}</div><div class="lobby-character"><h2>${character.name}</h2><p>${world.name} · ${character.role}</p><div class="lobby-stats"><span>${icon('heart')} ${stats.hp} HP</span><span>${icon('swords')} ${stats.attack} ATK</span><span>${icon('shield')} ${Math.floor(stats.defense)} DEF</span></div><button class="text-button" data-action="nav" data-page="heroes">Đổi anh hùng ${icon('arrow')}</button></div></div>
      <div class="lobby-xp"><span>Người chơi LV.${state.level}</span><span>${state.xp}/${needed} XP</span><span class="progress" role="progressbar" aria-label="Kinh nghiệm người chơi" aria-valuemin="0" aria-valuenow="${state.xp}" aria-valuemax="${needed}"><span style="width:${state.xp / needed * 100}%"></span></span></div>
    </div>

  </section><div class="pixel-route-guide" aria-label="Lộ trình chơi"><button data-action="nav" data-page="heroes"><span>01</span><strong>Chọn anh hùng</strong>${icon('users')}</button><button data-action="nav" data-page="adventures"><span>02</span><strong>Chọn thử thách</strong>${icon('play')}</button><button data-action="nav" data-page="loadout"><span>03</span><strong>Rèn đội hình</strong>${icon('shield')}</button></div>`;
}

export function mobileDock(page, menuOpen, battleActive) {
  const items = [{page:'overview',name:'Sảnh',icon:'grid'},{page:'heroes',name:'Anh hùng',icon:'users'},{page:battleActive ? 'arena' : 'adventures',name:battleActive ? 'Trận đấu' : 'Chơi',icon:'play'},{page:'loadout',name:'Đội hình',icon:'shield'}];
  return `<div class="pixel-mobile-dock" role="navigation" aria-label="Điều hướng nhanh" ${menuOpen ? 'inert' : ''}>${items.map(item => `<button data-action="nav" data-page="${item.page}" ${page===item.page || (item.name==='Chơi'&&page==='arena') ? 'aria-current="page"' : ''}>${icon(item.icon)}<span>${item.name}</span>${item.page==='arena' ? '<i class="dock-live" aria-hidden="true"></i>' : ''}</button>`).join('')}<button id="mobile-dock-menu" data-action="mobile-menu" aria-controls="mobile-drawer" aria-expanded="${menuOpen}" aria-label="Menu đầy đủ">${icon('menu')}<span>Menu</span></button></div>`;
}
