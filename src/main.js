import '@fontsource/vt323/400.css';
import './style.css';
import './activities.css';
import './pixel-art.css';
import './pixel-ui.css';
import './pixel-ux.css';
import './admin.css';
import './pixel-motion.css';
import { createPixelMotion } from './pixel-motion.js';
import { createAccountService } from './account-service.js';
import { accountPage, adminPage, accountBanner, syncLabel } from './admin-ui.js';
import { createAdminController } from './admin-controller.js';
import { playerLobby, mobileDock } from './pixel-ux.js';
import { WORLDS, CHARACTERS, QUESTS, DIFFICULTIES, NPCS, RANK_THRESHOLDS, worldById, characterById } from './data.js';
import { SAVE_KEY, dateKey, loadState, parseSave, freshState, refreshDaily, totalPoints, rankFor, statsFor, selectCharacter, upgradeCharacter, recruit, buyPotion, questProgress, claimQuest, startBattle, battleAction, enemyIntent } from './game.js';
import { icon, worldIcon, pixelText } from './icons.js';
import { heroArt, portrait, enemyPortrait, landscape } from './art.js';
import { modeName, startStory, beginRun, nextRunBattle, chooseBoon, endRun, startMini, miniAction, finishMini, endMini, toggleSupport, craftEquipment, equipEquipment, claimAchievement } from './expansion.js';
import { adventuresPage, loadoutPage, adventurePreview } from './activities-ui.js';
import { NEW_WORLDS } from './new-anime.js';

const app = document.querySelector('#app');
let state = loadState({ getItem: key => window.localStorage.getItem(key) });
const navigation = [
  { id: 'overview', name: 'Tổng quan', icon: 'grid' }, { id: 'worlds', name: 'Đa vũ trụ', icon: 'globe', badge: String(WORLDS.length).padStart(2, '0') },
  { id: 'heroes', name: 'Anh hùng', icon: 'users' }, { id: 'arena', name: 'Đấu trường', icon: 'swords' },
  { id: 'adventures', name: 'Hoạt động', icon: 'play', badge: '06' }, { id: 'loadout', name: 'Đội hình & rèn', icon: 'shield' },
  { id: 'account', name: 'Tài khoản', icon: 'users' }, { id: 'admin', name: 'Quản trị', icon: 'settings' },
  { id: 'quests', name: 'Nhiệm vụ', icon: 'scroll' }, { id: 'ranking', name: 'Xếp hạng', icon: 'trophy' }, { id: 'shop', name: 'Cửa hàng', icon: 'shop' },
];
let page = navigation.some(n => n.id === location.hash.slice(1)) ? location.hash.slice(1) : 'overview';
let modal = null;
let mobileOpen = false;
const mobileViewport = window.matchMedia('(max-width: 760px)');
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const motion = createPixelMotion(() => state.settings.motion && !motionPreference.matches);
motionPreference.addEventListener('change', () => {
  motion.cancel();
  document.body.classList.toggle('reduce-motion', !state.settings.motion || motionPreference.matches);
  motion.prepare();
});
let menuReturnFocus = 'mobile-menu-toggle';
let rankWorld = 'all';
let heroFilter = 'all';
let heroWorldFilter = 'all';
let gearWorldFilter = 'all';
let accountTab = 'login';
let toastTimer;
let audioContext;
let lastFocus;
let lastEffect = null;
let storageAvailable = true;
let activityTab = 'hub';
let storyWorld = state.selectedWorld;
let storyChapter = Math.min(4, state.adventure.story[storyWorld]);
let storyChoice = 'attack';
const fmt = number => Math.floor(number).toLocaleString('vi-VN');
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const button = (text, action, cls = 'primary', attrs = '') => `<button class="btn ${cls}" data-action="${action}" ${attrs}>${pixelText(text)}</button>`;
const money = (amount, type = 'coin') => `<span class="money ${type}">${icon(type)}${fmt(amount)}</span>`;
const progressBar = (value, max, cls = '') => `<span class="progress ${cls}"><span style="width:${Math.min(100, Math.max(0, value / max * 100))}%"></span></span>`;
const heading = (eyebrow, title, description, action = '') => `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
const account = createAccountService({
  loaded(next) {
    state = next; modal = null; lastEffect = null; activityTab = 'hub';
    storyWorld = state.selectedWorld; storyChapter = Math.min(4, state.adventure.story[storyWorld]);
    try { localStorage.setItem(account.storageKey(), JSON.stringify(state)); } catch {}
  },
  changed(kind) {
    if (kind === 'logout') { state = loadState({ getItem: key => localStorage.getItem(key) }); storyWorld = state.selectedWorld; storyChapter = Math.min(4, state.adventure.story[storyWorld]); activityTab = 'hub'; accountTab = 'login'; lastEffect = null; modal = null; page = 'account'; location.hash = 'account'; render(); }
    else if (kind === 'session') { if (!account.user && account.status === 'expired') accountTab = 'login'; render(); }
    else refreshAccountIndicators();
  },
});
const admin = createAdminController(account, () => { if (page === 'admin') render(); });
function refreshAccountIndicators() {
  const indicator = document.querySelector('#server-sync-indicator');
  if (indicator) indicator.innerHTML = `${icon('save')} ${syncLabel(account)}`;
  const field = document.querySelector('#account-sync-state'); if (field) field.textContent = syncLabel(account);
  const banner = document.querySelector('#account-banner'); if (banner) banner.outerHTML = accountBanner(account);
}


function persist() {
  try { localStorage.setItem(account.storageKey(), JSON.stringify(state)); storageAvailable = true; account.enqueue(state); }
  catch { storageAvailable = false; toast('Trình duyệt không thể lưu. Hãy tải bản lưu trong Cài đặt.', true); }
}

function toast(message, error = false) {
  clearTimeout(toastTimer);
  let element = document.querySelector('#toast');
  if (!element) { element = document.createElement('div'); element.id = 'toast'; element.setAttribute('role', 'status'); document.body.append(element); }
  element.className = `toast ${error ? 'error' : ''}`;
  element.innerHTML = `${icon(error ? 'close' : 'check')}<span>${esc(message)}</span>`;
  toastTimer = setTimeout(() => element.remove(), 4000);
}

function result(result) {
  if (result.error) { toast(result.error, true); return false; }
  persist();
  render();
  if (result.message) toast(result.message);
  return true;
}

function sound(kind = 'click') {
  if (!state.settings.sound) return;
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.connect(gain); gain.connect(audioContext.destination);
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(kind === 'win' ? 660 : kind === 'hit' ? 220 : 440, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(kind === 'win' ? 880 : 110, audioContext.currentTime + 0.16);
    gain.gain.setValueAtTime(0.04, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
    oscillator.start(); oscillator.stop(audioContext.currentTime + 0.2);
  } catch { /* Sound is optional; gameplay remains available. */ }
}

function revealPage() {
  document.querySelector('#main-content')?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function renderFocused(control) {
  const selector = control.id ? `#${CSS.escape(control.id)}` : `[data-action="${control.dataset.action}"][data-id="${control.dataset.id}"]`;
  render();
  document.querySelector(selector)?.focus({ preventScroll: true });
}

function navigate(next) {
  page = next;
  location.hash = next;
  mobileOpen = false;
  modal = null;
  lastEffect = null;
  render();
  revealPage();
  motion.enter();
  if (next === 'admin' && account.user?.role === 'admin') admin.refresh().catch(admin.report);
}

function worldCard(world) {
  const rank = rankFor(world.id, state.worldProgress[world.id].points);
  return `<button class="world-card ${state.selectedWorld === world.id ? 'selected' : ''}" data-action="world-info" data-id="${world.id}" style="--world:${world.color}">${landscape(world)}<span class="world-card-tag">${world.type.split(' · ')[0]}</span><span class="world-card-body"><span class="world-title">${world.name}${icon('arrow')}</span><span class="world-subtitle">${world.label}</span><span class="world-card-bottom"><span class="world-emblem">${worldIcon(world)}</span><span class="world-rank-name">${rank.name}</span><span class="world-level">${state.worldProgress[world.id].wins} thắng</span></span></span></button>`;
}

function questCard(quest, compact = false) {
  const progress = questProgress(state, quest);
  const claimed = state.daily.claimed.includes(quest.id);
  const ready = progress === quest.target && !claimed;
  return `<div class="quest-card ${compact ? 'compact' : ''}"><span class="quest-symbol">${icon(quest.icon)}</span><div class="quest-content"><h3>${quest.name}</h3><p>${quest.description}</p>${!compact ? `<div class="quest-progress">${progressBar(progress, quest.target)}<span>${progress}/${quest.target}</span></div><div class="quest-rewards">${money(quest.gold)}${money(quest.gems, 'gem')}</div>` : ''}</div>${compact ? `<span class="quest-counter">${progress}/${quest.target}</span>` : ''}${button(claimed ? `${icon('check')} Đã nhận` : ready ? 'Nhận thưởng' : compact ? icon('chevron') : 'Chưa hoàn thành', ready ? 'claim-quest' : compact && !claimed ? 'nav' : 'noop', ready ? 'primary small' : 'subtle small', `data-id="${quest.id}" data-page="quests" ${claimed || (!ready && !compact) ? 'disabled' : ''} aria-label="${claimed ? 'Đã nhận thưởng' : ready ? 'Nhận thưởng' : 'Xem nhiệm vụ'} ${quest.name}"`)}</div>`;
}

function overview() {
  const world = worldById(state.selectedWorld);
  const rank = rankFor(world.id, state.worldProgress[world.id].points);
  const wins = Object.values(state.worldProgress).reduce((sum, world) => sum + world.wins, 0);
  const matches = Object.values(state.worldProgress).reduce((sum, world) => sum + world.matches, 0);
  return `<div class="welcome-row"><div><h1>Chào ${esc(state.name)} <span class="wave">${icon('nexus')}</span></h1><p>Một hành trình mới. Vô vàn thế giới đang chờ bạn.</p></div><span class="season-label">${icon('star')} MÙA 01 <span>·</span> Kỷ nguyên hội tụ</span></div>
    <section class="hero-banner">${heroArt()}<div class="hero-content"><span class="hero-label"><span></span> ANIME NEXUS · PHIÊU LƯU ĐA VŨ TRỤ</span><h2>CỔNG ĐÃ MỞ.<br><span>CHỌN HÀNH TRÌNH.</span></h2><p>${WORLDS.length} vũ trụ. Những anh hùng huyền thoại.<br>Một hành trình mang tên bạn.</p><div class="hero-actions">${button(`Khám phá hoạt động ${icon('play')}`, 'nav', 'primary', 'data-page="adventures"')}${button(`${icon('globe')} Khám phá vũ trụ`, 'nav', 'glass', 'data-page="worlds"')}</div><div class="hero-caption"><span>${String(WORLDS.length).padStart(2, '0')} <small>VŨ TRỤ</small></span><i></i><span>${CHARACTERS.length} <small>ANH HÙNG</small></span><i></i><span>${icon('infinity')} <small>KHẢ NĂNG</small></span></div></div><span class="hero-image-caption">THE WORLDS ARE CONNECTED.</span></section>
    ${playerLobby(state)}
    <div class="stat-grid lobby-summary"><div class="stat-card"><span class="stat-icon purple">${icon('bolt')}</span><div><p>Sức mạnh chiến đấu</p><strong>${fmt(statsFor(state).hp + statsFor(state).attack * 10 + statsFor(state).defense * 5)}</strong><small>Anh hùng cấp ${state.characterLevels[state.activeCharacter]}</small></div></div><div class="stat-card"><span class="stat-icon orange">${icon('trophy')}</span><div><p>Điểm xếp hạng</p><strong>${fmt(totalPoints(state))}</strong><small>${wins ? `${wins} chiến thắng đa vũ trụ` : 'Huyền thoại bắt đầu từ số 0'}</small></div></div><div class="stat-card"><span class="stat-icon teal">${icon('swords')}</span><div><p>Tỷ lệ chiến thắng</p><strong>${matches ? Math.round(wins / matches * 100) : 0}<span>%</span></strong><small>${wins} thắng / ${matches} trận đấu</small></div></div><div class="stat-card"><span class="stat-icon pink">${icon('users')}</span><div><p>Bộ sưu tập anh hùng</p><strong>${state.unlocked.length}<span> / ${CHARACTERS.length}</span></strong><small>Những đồng đội đang chờ bạn</small></div></div></div>
${adventurePreview(state)}
    <section class="section"><div class="section-title"><h2>${icon('globe')} Khám phá đa vũ trụ <span class="count">${WORLDS.length}</span></h2><button class="text-button" data-action="nav" data-page="worlds">Tất cả vũ trụ ${icon('arrow')}</button></div><div class="world-grid dashboard-worlds">${WORLDS.slice(0, 4).map(worldCard).join('')}</div></section>
    <div class="lower-grid"><section class="panel daily-panel"><div class="section-title"><h2>${icon('scroll')} Nhiệm vụ hôm nay</h2><span class="subtle-text">${icon('clock')} Làm mới mỗi ngày</span></div>${QUESTS.slice(0, 3).map(q => questCard(q, true)).join('')}<button class="panel-link" data-action="nav" data-page="quests">Xem tất cả nhiệm vụ ${icon('arrow')}</button></section><section class="panel rank-panel" style="--world:${world.color}"><div class="section-title"><h2>${icon('trophy')} Hành trình thăng hạng</h2><span class="subtle-text">${world.name}</span></div><div class="rank-preview"><span class="rank-badge">${worldIcon(world)}</span><div><span class="eyebrow">CẤP BẬC HIỆN TẠI</span><h3>${rank.name}</h3><p>${state.worldProgress[world.id].points} / ${rank.ceiling || 'MAX'} điểm</p></div></div>${progressBar(rank.next ? state.worldProgress[world.id].points - rank.floor : 1, rank.ceiling - rank.floor || 1, 'rank-progress')}<p class="rank-next">${rank.next ? `Cấp tiếp theo: <strong>${rank.next}</strong>` : 'Đã chạm tới đỉnh cao của thế giới!'}</p><button class="panel-link" data-action="nav" data-page="ranking">Khám phá hệ thống cấp bậc ${icon('arrow')}</button></section></div>
    <section class="section activity-section"><div class="section-title"><h2>${icon('clock')} Trận đấu gần đây</h2><button class="text-button" data-action="nav" data-page="arena">Vào đấu trường ${icon('arrow')}</button></div>${historyView(3)}</section>`;
}

function historyView(limit = 20) {
  if (!state.history.length) return `<div class="empty-state compact-empty">${icon('swords')}<div><h3>Trang đầu của một huyền thoại</h3><p>Trận đấu đầu tiên của bạn sẽ xuất hiện ở đây.</p></div>${button('Chiến đấu ngay', 'nav', 'subtle small', 'data-page="arena"')}</div>`;
  return `<div class="history-list">${state.history.slice(0, limit).map(h => `<div class="history-row"><span class="history-result ${h.won ? 'won' : 'lost'}">${icon(h.won ? 'trophy' : 'shield')}</span><div><h3>${esc(h.enemy)}</h3><p>${worldById(h.worldId).name}</p></div><span class="result-label ${h.won ? 'won' : 'lost'}">${h.won ? 'Chiến thắng' : 'Thất bại'}</span><span class="history-points">+${h.points} điểm</span><time>${new Date(h.date).toLocaleDateString('vi-VN')}</time></div>`).join('')}</div>`;
}

function worldsPage() {
  return `${heading('KHÁM PHÁ THẾ GIỚI', `Một cánh cổng. ${WORLDS.length} thế giới.`, 'Khám phá sức mạnh, anh hùng và cấp bậc riêng của từng vũ trụ.')}<div class="info-strip">${icon('globe')} Tất cả thế giới đã mở · Chọn một thế giới để khám phá và chiến đấu.</div><section class="new-worlds-note"><span class="eyebrow">${NEW_WORLDS.length} THẾ GIỚI MỚI · BẢN 1.2</span><p>${NEW_WORLDS.map(w => w.name).join(' · ')}</p></section><div class="world-grid all-worlds">${WORLDS.map(worldCard).join('')}</div><div class="notice">${icon('star')} Cấp bậc được thăng bằng điểm chiến thắng ở từng thế giới. Anh hùng có thể du hành và chiến đấu tại mọi vũ trụ.</div>`;
}

function heroCard(character) {
  const owned = state.unlocked.includes(character.id);
  const active = state.activeCharacter === character.id;
  const world = worldById(character.world);
  const stats = statsFor(state, character.id);
  return `<article class="character-card ${active ? 'active' : ''} ${!owned ? 'unowned' : ''}" style="--world:${world.color}"><div class="character-art"><span class="character-rarity">${owned ? `CẤP ${stats.level}` : 'CHIÊU MỘ'}</span>${portrait(character, world.color)}${active ? `<span class="active-character-tag">${icon('check')} Đang chọn</span>` : ''}</div><div class="character-content"><span class="eyebrow">${world.name} · ${character.role}</span><h3>${character.name}</h3><div class="character-stats"><span title="Sinh lực">${icon('heart')} ${stats.hp}</span><span title="Tấn công">${icon('swords')} ${stats.attack}</span><span title="Phòng thủ">${icon('shield')} ${fmt(stats.defense)}</span></div>${owned ? `<div class="character-actions">${button(active ? 'Đang chọn' : 'Chọn', 'equip', active ? 'subtle small' : 'primary small', `data-id="${character.id}" ${active ? 'disabled' : ''}`)}${button(stats.level === 20 ? 'Cấp tối đa' : `${icon('bolt')} ${money(stats.level * 180)}`, 'upgrade', 'outline small', `data-id="${character.id}" ${stats.level === 20 ? 'disabled' : ''} aria-label="Nâng cấp ${character.name}"`)}</div>` : button(`Chiêu mộ ${money(character.price, 'gem')}`, 'recruit', 'outline full', `data-id="${character.id}"`)}</div></article>`;
}

function heroesPage() {
  return `${heading('BỘ SƯU TẬP ANH HÙNG', 'Tập hợp những huyền thoại', `${state.unlocked.length}/${CHARACTERS.length} anh hùng đã chiêu mộ. Nâng cấp để tăng sinh lực, tấn công và phòng thủ.`)}<div class="filter-bar"><button class="filter ${heroFilter === 'all' ? 'active' : ''}" data-action="hero-filter" data-id="all" aria-pressed="${heroFilter === 'all'}">Tất cả <span>${CHARACTERS.length}</span></button><button class="filter ${heroFilter === 'owned' ? 'active' : ''}" data-action="hero-filter" data-id="owned" aria-pressed="${heroFilter === 'owned'}">Đã sở hữu <span>${state.unlocked.length}</span></button><button class="filter ${heroFilter === 'locked' ? 'active' : ''}" data-action="hero-filter" data-id="locked" aria-pressed="${heroFilter === 'locked'}">Có thể chiêu mộ <span>${CHARACTERS.length - state.unlocked.length}</span></button><label class="sr-only" for="hero-world-filter">Lọc anh hùng theo thế giới</label><select id="hero-world-filter"><option value="all">Tất cả thế giới</option>${WORLDS.map(w => `<option value="${w.id}" ${heroWorldFilter === w.id ? 'selected' : ''}>${w.name}</option>`).join('')}</select></div><div class="character-grid">${CHARACTERS.filter(c => (heroWorldFilter === 'all' || c.world === heroWorldFilter) && (heroFilter === 'all' || (heroFilter === 'owned' ? state.unlocked.includes(c.id) : !state.unlocked.includes(c.id)))).map(heroCard).join('') || '<div class="empty-state">Bạn đã sưu tập tất cả anh hùng!</div>'}</div>`;
}

function arenaPage() {
  if (state.battle) return battleView();
  const world = worldById(state.selectedWorld);
  const character = characterById(state.activeCharacter);
  const stats = statsFor(state);
  return `${heading('CHUẨN BỊ CHIẾN ĐẤU', 'Viết tiếp huyền thoại của bạn', 'Chọn thế giới, chọn thử thách. Đọc ý định đối thủ và sử dụng năng lượng khôn ngoan.')}<div class="arena-setup"><section class="panel arena-hero" style="--world:${worldById(character.world).color}"><span class="eyebrow">ANH HÙNG CỦA BẠN</span>${portrait(character, worldById(character.world).color)}<h2>${character.name}</h2><p>${worldById(character.world).name} · ${character.role} · Cấp ${stats.level}</p><div class="arena-stats"><span>${icon('heart')}<strong>${stats.hp}</strong>Sinh lực</span><span>${icon('swords')}<strong>${stats.attack}</strong>Tấn công</span><span>${icon('shield')}<strong>${fmt(stats.defense)}</strong>Phòng thủ</span></div>${button('Đổi anh hùng', 'nav', 'outline full', 'data-page="heroes"')}</section><section class="arena-options"><h2><span class="step-number">01</span> Chọn chiến trường</h2><div class="arena-world-grid">${WORLDS.map(w => `<button class="arena-world ${w.id === world.id ? 'active' : ''}" data-action="select-world" data-id="${w.id}" aria-pressed="${w.id === world.id}" style="--world:${w.color}"><span>${worldIcon(w)}</span><div><strong>${w.name}</strong><small>${w.land}</small></div>${w.id === world.id ? icon('check') : ''}</button>`).join('')}</div><h2><span class="step-number">02</span> Chọn thử thách</h2><div class="difficulty-grid">${Object.entries(DIFFICULTIES).map(([id, difficulty], i) => { const locked = id === 'boss' && state.worldProgress[world.id].wins < 2; return `<div class="difficulty-card ${id}"><span class="difficulty-stars">${icon('star').repeat(i + 1)}</span><h3>${difficulty.name}</h3><p>${difficulty.description}</p><div class="difficulty-rewards">${money(difficulty.gold)}${money(difficulty.gems, 'gem')}<span>+${difficulty.reward} điểm</span></div>${button(locked ? 'Cần 2 chiến thắng' : `Vào trận ${icon('arrow')}`, 'start-battle', id === 'easy' ? 'primary full' : 'outline full', `data-id="${id}" ${locked ? 'disabled' : ''}`)}</div>`; }).join('')}</div><div class="battle-help">${icon('shield')} Mỗi trận hồi đầy sinh lực. Phòng thủ trước đòn cường hóa của đối thủ. Phím tắt trong trận: 1–4, H.</div></section></div><section class="section"><div class="section-title"><h2>${icon('clock')} Lịch sử chiến đấu</h2></div>${historyView()}</section>`;
}

function battleView() {
  const b = state.battle;
  const world = worldById(b.worldId);
  const character = characterById(b.characterId);
  const characterWorld = worldById(character.world);
  const intent = enemyIntent(b);
  const active = b.status === 'active';
  const abilities = [
    { id: 'attack', name: 'Tấn công', icon: 'swords', detail: '+22 năng lượng', disabled: false },
    { id: 'skill', name: character.skill ?? characterWorld.skill, icon: 'bolt', detail: b.player.cooldown ? `Hồi chiêu: ${b.player.cooldown} lượt` : b.player.energy < 35 ? `Cần thêm ${35 - b.player.energy} năng lượng` : '35 năng lượng', disabled: b.player.energy < 35 || b.player.cooldown > 0 },
    { id: 'guard', name: 'Phòng thủ', icon: 'shield', detail: 'Giảm 70% sát thương · +30 NL', disabled: false },
    { id: 'ultimate', name: character.ultimate ?? characterWorld.ultimate, icon: 'star', detail: b.player.energy < 100 ? `Cần thêm ${100 - b.player.energy} năng lượng` : '100 năng lượng · ×3,6 sức mạnh', disabled: b.player.energy < 100 },
  ];
  return `<div class="battle-heading"><div><span class="eyebrow">${world.name} · ${modeName(b) ?? DIFFICULTIES[b.difficulty].name}</span><h1>${world.land}</h1></div>${active ? button('Rút lui', 'confirm-retreat', 'subtle small') : button('Đổi chiến trường', 'end-battle', 'outline small')}</div>${b.objective ? `<div class="battle-objective">${icon('shield')} ${b.objective}${b.maxTurns ? ` · ${Math.max(0,b.maxTurns-b.turn+1)} lượt còn lại` : ''}</div>` : ''}<section class="battle-stage ${lastEffect ? 'impact' : ''}" style="--world:${world.color}"><div class="battle-background">${landscape(world, false)}</div><div class="battle-topline"><span class="battle-location">${worldIcon(world)} ${world.name}</span><span class="turn-pill">LƯỢT ${b.turn}</span><span class="battle-mode">ĐỐI THỦ MÁY</span></div><div class="combatants"><div class="combatant player"><div class="fighter-name"><span>BẠN · CẤP ${state.characterLevels[b.characterId]}</span><h2>${character.name}</h2></div><div class="health-bar player-health" role="progressbar" aria-label="Sinh lực của bạn" aria-valuenow="${b.player.hp}" aria-valuemax="${b.player.maxHp}"><span style="width:${b.player.hp / b.player.maxHp * 100}%"></span><strong>${b.player.hp} / ${b.player.maxHp} HP</strong></div>${portrait(character, characterWorld.color)}${lastEffect?.incoming ? `<span class="damage-number incoming">−${lastEffect.incoming}</span>` : ''}<div class="energy-bar"><span>${icon('bolt')} NĂNG LƯỢNG</span><strong>${b.player.energy}/100</strong>${progressBar(b.player.energy, 100)}</div></div><div class="versus">VS<small>${active ? 'SẴN SÀNG' : b.status === 'won' ? 'VICTORY' : 'DEFEAT'}</small></div><div class="combatant enemy"><div class="fighter-name"><span>${b.difficulty === 'boss' ? 'TRÙM THẾ GIỚI' : 'ĐỐI THỦ'}</span><h2>${esc(b.enemy.name)}</h2></div><div class="health-bar enemy-health" role="progressbar" aria-label="Sinh lực đối thủ" aria-valuenow="${b.enemy.hp}" aria-valuemax="${b.enemy.maxHp}"><span style="width:${b.enemy.hp / b.enemy.maxHp * 100}%"></span><strong>${b.enemy.hp} / ${b.enemy.maxHp} HP</strong></div><div class="enemy-art">${enemyPortrait(world, b.enemy.name)}</div>${lastEffect?.damage ? `<span class="damage-number outgoing">−${lastEffect.damage}${lastEffect.critical ? '<small>BẠO KÍCH</small>' : ''}</span>` : ''}${active ? `<div class="enemy-intent ${intent.strong ? 'strong' : ''}">${icon(intent.strong ? 'bolt' : 'swords')} Ý định: <strong>${intent.name}</strong></div>` : `<div class="enemy-intent">${b.status === 'won' ? b.enemy.hp === 0 ? 'Đối thủ đã bị đánh bại' : 'Đã hoàn thành mục tiêu phòng tuyến' : 'Hãy quay lại mạnh mẽ hơn'}</div>`}</div></div>${!active ? `<div class="battle-result ${b.status}"><span class="result-emblem">${icon(b.status === 'won' ? 'trophy' : 'shield')}</span><h2>${b.status === 'won' ? 'CHIẾN THẮNG!' : 'CHƯA PHẢI KẾT THÚC.'}</h2><p>${b.status === 'won' ? 'Một bước gần hơn tới huyền thoại.' : 'Nâng cấp anh hùng, luyện chiến thuật và thử lại.'}</p><div class="result-rewards">${money(b.rewards.gold)}${money(b.rewards.gems, 'gem')}<span>+${b.rewards.xp} XP</span><span>+${b.rewards.points} điểm</span>${b.rewards.shards ? `<span>+${b.rewards.shards} mảnh</span>` : ''}</div><div class="result-actions">${b.mode && b.mode !== 'arena' ? button('Tiếp tục hành trình', 'ex-return', 'primary') : button('Chiến đấu tiếp', 'rematch', 'primary', `data-id="${b.difficulty}"`)}${button('Về đấu trường', 'end-battle', 'outline')}</div></div>` : ''}</section>${active ? `<div class="pixel-turn-hint" role="status">${icon(intent.strong ? 'shield' : 'play')}<div><strong>${intent.strong ? 'Đối thủ chuẩn bị đòn mạnh' : 'Đến lượt bạn'}</strong><span>${intent.strong ? 'Phòng thủ giảm 70% sát thương nhận vào.' : 'Chọn một hành động. Trận chỉ tiếp tục khi bạn chọn.'}</span></div></div><div class="ability-grid">${abilities.map((a, i) => `<button class="ability ${a.id}" aria-label="${esc(a.name)}: ${esc(a.detail)}" data-action="battle-action" data-id="${a.id}" ${a.disabled ? 'disabled' : ''}><span class="ability-key">${i + 1}</span><span class="ability-icon">${icon(a.icon)}</span><strong>${esc(a.name)}</strong><small>${a.detail}</small></button>`).join('')}</div><div class="battle-underbar">${button(`${icon('potion')} Hồi phục 45% HP <span class="count">${state.potions}</span> <kbd>H</kbd>`, 'battle-action', 'outline small', `data-id="potion" ${state.potions === 0 || b.player.hp === b.player.maxHp || b.rule === 'no-potion' ? 'disabled' : ''}`)}${b.supportIds?.length ? button(`${icon('users')} Liên kích <kbd>5</kbd> <span>${b.player.supportCooldown ? `Hồi ${b.player.supportCooldown} lượt` : '30 NL'}</span>`, 'battle-action', 'outline small', `data-id="support" ${b.player.energy < 30 || (b.player.supportCooldown ?? 0) > 0 ? 'disabled' : ''}`) : ''}<span>Đòn cường hóa mỗi 3 lượt · Kỹ năng hồi sau 2 lượt</span></div>` : ''}<section class="panel combat-log"><div class="section-title"><h2>${icon('scroll')} Nhật ký chiến đấu</h2><span class="subtle-text">Lượt của bạn ${icon('arrow')} lượt đối thủ</span></div><div class="log-lines" aria-live="polite">${b.logs.slice(-8).reverse().map(log => `<p class="log-${log.type}"><span>${log.type === 'player' ? 'BẠN' : log.type === 'enemy' ? 'ĐỐI THỦ' : 'NEXUS'}</span>${esc(log.text)}</p>`).join('')}</div></section>`;
}

function questsPage() {
  const claimed = state.daily.claimed.length;
  return `${heading('NHIỆM VỤ HẰNG NGÀY', 'Mỗi ngày, một bước tiến', 'Hoàn thành nhiệm vụ để nhận vàng và tinh thạch. Làm mới theo ngày trên thiết bị của bạn.')}<div class="quest-summary panel"><span class="stat-icon purple">${icon('scroll')}</span><div><h3>Tiến độ hôm nay</h3><p>${claimed}/4 phần thưởng đã nhận</p></div>${progressBar(claimed, 4)}<span class="quest-summary-total">${claimed === 4 ? 'Hoàn tất!' : `${4 - claimed} nhiệm vụ còn lại`}</span></div><div class="quests-grid">${QUESTS.map(q => questCard(q)).join('')}</div><section class="panel quest-guide"><span class="stat-icon teal">${icon('gem')}</span><div><h3>Tinh thạch đến từ hành trình của bạn</h3><p>Mỗi chiến thắng nhận 15–45 tinh thạch. Hoàn thành bốn nhiệm vụ ngày nhận thêm 140 tinh thạch. Dùng 250 tinh thạch để chiêu mộ một anh hùng mới.</p></div>${button('Vào đấu trường', 'nav', 'primary', 'data-page="arena"')}</section>`;
}

function rankingPage() {
  const world = worldById(rankWorld === 'all' ? state.selectedWorld : rankWorld);
  const points = state.worldProgress[world.id].points;
  const rank = rankFor(world.id, points);
  const rows = [...NPCS.map(n => ({ ...n, points: rankWorld === 'all' ? n.points : Math.round(n.points * (0.35 + WORLDS.findIndex(w => w.id === rankWorld) * 0.03)) })), { name: state.name, points: rankWorld === 'all' ? totalPoints(state) : points, world: world.id, own: true }].sort((a, b) => b.points - a.points);
  return `${heading('CHINH PHỤC CẤP BẬC', 'Hành trình lên đỉnh', 'Mỗi vũ trụ có một thang cấp bậc. Điểm chiến thắng viết nên danh hiệu của bạn.', '<span class="simulation-pill">BXH MÔ PHỎNG · CHƠI ĐƠN</span>')}<div class="ranking-layout"><section class="panel ranking-table"><div class="section-title"><h2>${icon('trophy')} Bảng xếp hạng</h2><label class="sr-only" for="rank-filter">Lọc xếp hạng theo thế giới</label><select id="rank-filter"><option value="all" ${rankWorld === 'all' ? 'selected' : ''}>Tất cả vũ trụ</option>${WORLDS.map(w => `<option value="${w.id}" ${rankWorld === w.id ? 'selected' : ''}>${w.name}</option>`).join('')}</select></div><p class="table-note">Đối thủ máy có điểm mẫu cố định; điểm của bạn đến từ các trận đã chơi.</p><div class="rank-table-scroll"><table><thead><tr><th>HẠNG</th><th>NGƯỜI CHƠI</th><th>THẾ GIỚI</th><th>ĐIỂM</th></tr></thead><tbody>${rows.map((row, i) => `<tr class="${row.own ? 'own-row' : ''}"><td><span class="position pos-${i}">${i < 3 ? icon('trophy') : String(i + 1).padStart(2, '0')}</span></td><td><span class="rank-avatar" style="--world:${worldById(row.world).color}">${esc(row.name[0])}</span><strong>${esc(row.name)}</strong>${row.own ? '<span class="you-tag">BẠN</span>' : '<small class="npc-label">NPC</small>'}</td><td>${worldById(row.world).name}</td><td><strong>${fmt(row.points)}</strong></td></tr>`).join('')}</tbody></table></div></section><section class="panel rank-ladder" style="--world:${world.color}"><div class="section-title"><h2>Cấp bậc ${world.name}</h2></div><div class="ladder-current"><span class="rank-badge">${worldIcon(world)}</span><h3>${rank.name}</h3><p>${fmt(points)} điểm tại thế giới này</p></div><ol>${world.ranks.map((name, i) => `<li class="${i === rank.index ? 'current' : i < rank.index ? 'completed' : ''}"><span>${i < rank.index ? icon('check') : String(i + 1).padStart(2, '0')}</span><div><strong>${name}</strong><small>${fmt(RANK_THRESHOLDS[i])} điểm</small></div>${i === rank.index ? '<i>HIỆN TẠI</i>' : ''}</li>`).join('')}</ol>${button('Chinh phục cấp tiếp theo', 'rank-battle', 'primary full', `data-id="${world.id}"`)}</section></div>`;
}

function shopPage() {
  return `${heading('CỬA HÀNG NEXUS', 'Trang bị cho hành trình', 'Dùng phần thưởng trong game để hồi phục, nâng cấp và chiêu mộ. Không có thanh toán tiền thật.')}<section class="panel shop-feature"><span class="potion-illustration">${icon('potion')}</span><div><span class="eyebrow">VẬT PHẨM CHIẾN ĐẤU</span><h2>Bình hồi phục</h2><p>Hồi 45% sinh lực tối đa trong trận. Sử dụng tiêu tốn một lượt, hãy chọn đúng thời điểm.</p><span class="stock">Trong hành trang: <strong>${state.potions} bình</strong></span></div>${button(`Mua 1 bình ${money(150)}`, 'buy-potion', 'primary')}</section><div class="section-title"><h2>${icon('users')} Chiêu mộ huyền thoại</h2><span class="subtle-text">250 tinh thạch / anh hùng</span></div><div class="character-grid">${CHARACTERS.filter(c => !c.free).map(heroCard).join('')}</div>`;
}

function modalView() {
  if (!modal) return '';
  let content = '';
  if (modal.type === 'world') {
    const world = worldById(modal.id);
    const progress = state.worldProgress[world.id];
    const rank = rankFor(world.id, progress.points);
    content = `<div class="modal-world-art" style="--world:${world.color}">${landscape(world)}</div><span class="eyebrow">${world.type}</span><h2 id="dialog-title">${world.name}</h2><p>${world.label}. Chiến đấu tại ${world.land} để chinh phục cấp bậc.</p><div class="world-modal-stats"><span><strong>${progress.wins}</strong>Chiến thắng</span><span><strong>${progress.points}</strong>Điểm xếp hạng</span><span><strong>${rank.name}</strong>Cấp bậc</span></div><h3>Hệ thống cấp bậc</h3><div class="world-ranks">${world.ranks.map((name, i) => `<span class="${i === rank.index ? 'current' : ''}"><small>${String(i + 1).padStart(2, '0')}</small>${name}</span>`).join('')}</div>${button(`Khám phá ${world.name} ${icon('arrow')}`, 'enter-world', 'primary full', `data-id="${world.id}"`)}`;
  } else if (modal.type === 'profile') {
    content = `<span class="eyebrow">HỒ SƠ NGƯỜI CHƠI</span><h2 id="dialog-title">Tên của một huyền thoại</h2><p>Tên hiển thị trong hồ sơ và bảng xếp hạng.</p><form id="profile-form"><label for="player-name">Tên người chơi</label><input id="player-name" name="name" minlength="1" maxlength="24" required value="${esc(state.name)}" autocomplete="nickname" />${button('Lưu hồ sơ', 'noop', 'primary full', 'type="submit"')}</form>`;
  } else if (modal.type === 'retreat') {
    content = `<span class="eyebrow">CHIẾN THUẬT</span><h2 id="dialog-title">Rút lui khỏi trận đấu?</h2><p>Trận này sẽ tính là thất bại. Bạn vẫn nhận 15 XP và có thể quay lại với sinh lực đầy.</p><div class="modal-actions">${button('Tiếp tục chiến đấu', 'close-modal', 'outline')}${button('Rút lui', 'retreat', 'danger')}</div>`;
  } else if (modal.type === 'reset') {
    content = `<h2 id="dialog-title">Bắt đầu hành trình mới?</h2><p>Toàn bộ anh hùng đã nâng cấp, tài nguyên và lịch sử trên trình duyệt này sẽ bị xóa. Bạn nên tải bản lưu trước trong Cài đặt.</p><div class="modal-actions">${button('Giữ tiến trình', 'close-modal', 'outline')}${button('Xóa và chơi lại', 'reset', 'danger')}</div>`;
  } else if (modal.type === 'account-reload' || modal.type === 'account-import') {
    const importing = modal.type === 'account-import';
    content = `<h2 id="dialog-title">${importing ? 'Nhập tiến trình trên thiết bị?' : 'Tải tiến trình từ máy chủ?'}</h2><p>${importing ? 'Bản chơi khách trên thiết bị sẽ thay tiến trình của tài khoản đang đăng nhập.' : 'Bản trên máy chủ sẽ thay bản chơi hiện tại. Bạn có thể tải bản lưu trước khi tiếp tục.'}</p><div class="modal-actions">${button('Hủy', 'close-modal', 'outline')}${button('Tải bản lưu', 'export', 'outline')}${button(importing ? 'Nhập tiến trình' : 'Tải bản máy chủ', importing ? 'account-import-confirm' : 'account-reload-confirm', 'primary')}</div>`;
  } else if (modal.type === 'admin-confirm') {
    const operation = modal.operation, target = modal.target;
    const title = operation === 'status' ? target.user.status === 'active' ? 'Khóa tài khoản?' : 'Mở tài khoản?' : operation === 'restore' ? 'Khôi phục bản sao lưu?' : 'Đặt lại tiến trình người chơi?';
    content = `<h2 id="dialog-title">${title}</h2><p>Tài khoản: <strong>${esc(target.user.username)}</strong>. ${operation === 'status' ? 'Khóa tài khoản sẽ kết thúc các phiên đăng nhập của người chơi.' : 'Tiến trình hiện tại được sao lưu trước khi thay đổi. Bản chơi cũ đang mở sẽ phải tải lại bản máy chủ.'}</p><div class="modal-actions">${button('Hủy', 'close-modal', 'outline')}${button('Xác nhận', 'admin-execute', 'danger')}</div>`;
  } else if (modal.type === 'settings') {
    content = `<span class="eyebrow">CÀI ĐẶT TRÒ CHƠI</span><h2 id="dialog-title">Cài đặt hành trình</h2><div class="setting-row"><div><strong>Âm thanh chiến đấu</strong><p>Hiệu ứng tổng hợp, không dùng nhạc anime.</p></div><button class="toggle ${state.settings.sound ? 'on' : ''}" role="switch" aria-checked="${state.settings.sound}" aria-label="Âm thanh chiến đấu" data-action="toggle-sound"><span></span></button></div><div class="setting-row"><div><strong>Hiệu ứng chuyển động</strong><p>Chuyển động pixel và hiệu ứng kỹ năng. Tôn trọng cài đặt giảm chuyển động của thiết bị.</p></div><button class="toggle ${state.settings.motion ? 'on' : ''}" role="switch" aria-checked="${state.settings.motion}" aria-label="Hiệu ứng chuyển động" data-action="toggle-motion"><span></span></button></div><div class="setting-row"><div><strong>Tiến trình của bạn</strong><p>Lưu tự động trên trình duyệt này. Có thể tải và khôi phục bản lưu trên thiết bị khác.</p></div></div><div class="save-actions">${button(`${icon('save')} Tải bản lưu`, 'export', 'outline')}<label class="btn outline">${icon('save')} Khôi phục<input type="file" id="import-save" accept="application/json,.json" class="sr-only" /></label></div><p class="save-warning" role="status">Khôi phục sẽ thay tiến trình hiện tại. Hãy tải bản lưu trước.</p><button class="text-button danger-text" data-action="confirm-reset">Xóa tiến trình và chơi lại</button><div class="fan-note">Anime Nexus là fan game độc lập. Tên nhân vật và các thế giới thuộc chủ sở hữu tương ứng. Hình minh họa pixel và cơ chế game được tạo riêng cho dự án.</div>`;
  }
  return `<dialog id="game-dialog" aria-labelledby="dialog-title"><button class="dialog-close" data-action="close-modal" aria-label="Đóng hộp thoại">${icon('close')}</button><div class="dialog-body">${content}</div></dialog>`;
}

function render() {
  motion.cancel();
  refreshDaily(state);
  const route = navigation.find(n => n.id === page);
  const char = characterById(state.activeCharacter);
  const questReady = QUESTS.filter(q => questProgress(state, q) === q.target && !state.daily.claimed.includes(q.id)).length;
  document.body.classList.toggle('reduce-motion', !state.settings.motion || motionPreference.matches);
  document.body.classList.toggle('pixel-drawer-open', mobileOpen);
  document.body.dataset.page = page;
  app.innerHTML = `<a class="pixel-skip" href="#main-content">Đến nội dung trò chơi</a><div class="app-shell"><aside id="mobile-drawer" class="sidebar ${mobileOpen ? 'mobile-open' : ''}" ${mobileViewport.matches && !mobileOpen ? 'inert' : ''} ${mobileOpen ? 'role="dialog" aria-modal="true" aria-label="Menu Nexus"' : ''}><div class="pixel-drawer-heading"><span>MENU NEXUS</span><button id="mobile-menu-close" class="icon-button" data-action="mobile-menu" aria-label="Đóng menu">${icon('close')}</button></div><a class="brand" href="#overview" data-action="nav" data-page="overview" aria-label="Anime Nexus — Tổng quan"><span class="brand-mark">${icon('nexus')}</span><span>ANIME<span class="brand-second">NEXUS<span class="brand-dot">.</span></span></span></a><div class="sidebar-label">MENU PHIÊU LƯU</div><nav aria-label="Điều hướng chính">${navigation.filter(n => n.id !== 'admin' || account.user?.role === 'admin').map(n => `<button class="nav-item ${page === n.id ? 'active' : ''}" data-action="nav" data-page="${n.id}" ${page === n.id ? 'aria-current="page"' : ''}>${icon(n.icon)}<span>${n.name}</span>${n.id === 'quests' && questReady ? `<span class="nav-badge ready">${questReady}</span>` : n.badge ? `<span class="nav-badge">${n.badge}</span>` : ''}${n.id === 'arena' && state.battle?.status === 'active' ? '<span class="live-dot"></span>' : ''}</button>`).join('')}</nav><div class="sidebar-event"><div class="event-symbol">${icon('nexus')}</div><span class="eyebrow">HÀNH TRÌNH CỦA BẠN</span><h3>Huyền thoại bắt đầu<br>từ bước đầu tiên.</h3><p>Nhận tinh thạch khi hoàn thành nhiệm vụ mỗi ngày.</p><button data-action="nav" data-page="quests">Khám phá nhiệm vụ ${icon('arrow')}</button></div><div class="sidebar-bottom"><button class="nav-item" data-action="settings">${icon('settings')} Cài đặt</button><div class="build-label"><span class="live-dot"></span> Bản fan game · Chơi đơn <small>v1.7.0</small></div></div></aside>${mobileOpen ? '<button class="sidebar-backdrop" data-action="mobile-menu" aria-hidden="true" tabindex="-1"></button>' : ''}<div class="main-shell" ${mobileOpen ? 'inert' : ''}><header class="topbar"><div class="topbar-title"><button id="mobile-menu-toggle" class="icon-button mobile-menu" data-action="mobile-menu" aria-label="Mở menu" aria-controls="mobile-drawer" aria-expanded="${mobileOpen}">${icon('menu')}</button><span class="breadcrumb">Không gian của bạn ${icon('chevron')}</span><strong>${route.name}</strong></div><div class="topbar-right"><div class="currencies">${money(state.gold)}<i></i>${money(state.gems, 'gem')}</div><button class="icon-button sound-button ${state.settings.sound ? 'sound-on' : ''}" data-action="toggle-sound" aria-label="${state.settings.sound ? 'Tắt' : 'Bật'} âm thanh" title="${state.settings.sound ? 'Tắt' : 'Bật'} âm thanh">${icon('sound')}</button><span class="topbar-divider"></span><button class="profile-button" data-action="profile"><span class="profile-avatar" style="--world:${worldById(char.world).color}">${esc(state.name[0].toUpperCase())}</span><span class="profile-details"><strong>${esc(state.name)}</strong><small>Nhà thám hiểm · Lv. ${state.level}</small></span>${icon('chevron')}</button></div></header><main id="main-content" tabindex="-1">${accountBanner(account)}${({ overview, account: () => accountPage(account, accountTab), admin: () => adminPage(account, admin.model), worlds: worldsPage, heroes: heroesPage, arena: arenaPage, quests: questsPage, ranking: rankingPage, shop: shopPage, adventures: () => adventuresPage(state, activityTab, { storyWorld, storyChapter, storyChoice }), loadout: () => loadoutPage(state, gearWorldFilter) })[page]()}</main><footer class="footer"><span>ANIME NEXUS <span>·</span> Hành trình của riêng bạn.</span><span id="server-sync-indicator">${icon('save')} ${storageAvailable ? syncLabel(account) : 'Không thể tự động lưu'}</span></footer></div>${mobileDock(page, mobileOpen, state.battle?.status === 'active')}</div>${modalView()}`;
  if (modal) {
    const dialog = document.querySelector('#game-dialog');
    dialog.showModal();
    dialog.addEventListener('cancel', event => { event.preventDefault(); closeModal(); });
    dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeModal(); } });
  }
  motion.prepare();
}

function toggleMobileMenu(triggerId) {
  if (!mobileViewport.matches) return;
  if (!mobileOpen) menuReturnFocus = triggerId || 'mobile-menu-toggle';
  mobileOpen = !mobileOpen;
  render();
  document.getElementById(mobileOpen ? 'mobile-menu-close' : menuReturnFocus)?.focus({ preventScroll: true });
}
mobileViewport.addEventListener('change', () => { mobileOpen = false; render(); });
function showModal(type, id) {
  const focused = document.activeElement;
  lastFocus = mobileOpen ? '#mobile-dock-menu' : focused?.id ? `#${CSS.escape(focused.id)}` : focused?.dataset.action ? `[data-action="${focused.dataset.action}"]${focused.dataset.id ? `[data-id="${focused.dataset.id}"]` : ''}` : null;
  mobileOpen = false;
  modal = { type, id }; render();
}
function closeModal() { modal = null; render(); if (lastFocus) document.querySelector(lastFocus)?.focus({ preventScroll: true }); }

app.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target || target.disabled) return;
  const { action, id } = target.dataset;
  if (action === 'noop') return;
  if (action.startsWith('admin-') || action.startsWith('account-') && action !== 'account-tab') { handleServerAction(action, id).catch(error => toast(error.message, true)); return; }
  if (action.startsWith('ex-')) { handleExpansionAction(action.slice(3), id); return; }
  sound();
  switch (action) {
    case 'nav': navigate(target.dataset.page); break;
    case 'account-tab': accountTab = id; renderFocused(target); break;
    case 'mobile-menu': toggleMobileMenu(target.id); break;
    case 'world-info': showModal('world', id); break;
    case 'enter-world': state.selectedWorld = id; persist(); navigate('arena'); break;
    case 'select-world': state.selectedWorld = id; persist(); renderFocused(target); break;
    case 'hero-filter': heroFilter = id; renderFocused(target); break;
    case 'equip':
      result(selectCharacter(state, id));
      break;
    case 'upgrade': result(upgradeCharacter(state, id)); break;
    case 'recruit': result(recruit(state, id)); break;
    case 'buy-potion': result(buyPotion(state)); break;
    case 'claim-quest': result(claimQuest(state, id)); break;
    case 'start-battle': lastEffect = null; if (result(startBattle(state, id))) revealPage(); break;
    case 'battle-action': doBattleAction(id); break;
    case 'confirm-retreat': showModal('retreat'); break;
    case 'retreat': modal = null; result(battleAction(state, 'retreat')); break;
    case 'end-battle': state.battle = null; lastEffect = null; persist(); render(); revealPage(); break;
    case 'rematch': { lastEffect = null; const world = state.battle.worldId; state.selectedWorld = world; if (result(startBattle(state, id))) revealPage(); break; }
    case 'rank-battle': state.selectedWorld = id; persist(); navigate('arena'); break;
    case 'settings': showModal('settings'); break;
    case 'profile': showModal('profile'); break;
    case 'close-modal': closeModal(); break;
    case 'toggle-sound': state.settings.sound = !state.settings.sound; persist(); render(); sound('win'); break;
    case 'toggle-motion': state.settings.motion = !state.settings.motion; persist(); render(); break;
    case 'confirm-reset': showModal('reset'); break;
    case 'reset': state = freshState(); modal = null; activityTab = 'hub'; storyWorld = state.selectedWorld; storyChapter = 0; persist(); navigate('overview'); toast('Một hành trình mới bắt đầu!'); break;
    case 'export': {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = 'anime-nexus-save.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Đã tải bản lưu tiến trình.'); break;
    }
  }
});

function doBattleAction(action) {
  const before = state.battle ? structuredClone(state.battle) : null;
  const outcome = battleAction(state, action);
  if (outcome.error) { toast(outcome.error, true); return; }
  lastEffect = outcome;
  sound(outcome.won ? 'win' : 'hit');
  persist(); render();
  motion.battle({ before, after: state.battle, outcome, action });
  lastEffect = null;
  document.querySelector(`[data-action="battle-action"][data-id="${action}"]:not(:disabled)`)?.focus({ preventScroll: true });
}

app.addEventListener('submit', event => {
  if (event.target.id !== 'profile-form') return;
  event.preventDefault();
  const name = new FormData(event.target).get('name').trim().slice(0, 24);
  if (!name) { toast('Hãy nhập tên người chơi.', true); return; }
  state.name = name; modal = null; result({ message: 'Đã cập nhật hồ sơ.' });
});

app.addEventListener('change', async event => {
  if (event.target.id === 'rank-filter') { rankWorld = event.target.value; renderFocused(event.target); }
  if (event.target.id === 'hero-world-filter') { heroWorldFilter = event.target.value; renderFocused(event.target); }
  if (event.target.id === 'gear-world-filter') { gearWorldFilter = event.target.value; renderFocused(event.target); }
  if (event.target.id === 'story-world') { storyWorld = event.target.value; state.selectedWorld = storyWorld; storyChapter = Math.min(4, state.adventure.story[storyWorld]); persist(); renderFocused(event.target); }
  if (event.target.id === 'import-save' && event.target.files[0]) {
    const file = event.target.files[0];
    if (file.size > 200000) { toast('Bản lưu quá lớn hoặc không đúng định dạng.', true); return; }
    try {
      const text = await file.text();
      const loaded = parseSave(text);
      if (!loaded) throw new Error('Invalid save');
      state = loaded; modal = null; storyWorld = state.selectedWorld; storyChapter = Math.min(4,state.adventure.story[storyWorld]); result({ message: 'Đã khôi phục tiến trình.' });
    } catch { toast('Không thể đọc bản lưu. Hãy dùng file xuất từ Anime Nexus.', true); }
  }
});

window.addEventListener('hashchange', () => {
  const next = location.hash.slice(1);
  if (navigation.some(n => n.id === next) && page !== next) navigate(next);
});
window.addEventListener('keydown', event => {
  if (mobileOpen) {
    if (event.key === 'Escape') { event.preventDefault(); toggleMobileMenu(); return; }
    if (event.key === 'Tab') {
      const targets = [...document.querySelectorAll('#mobile-drawer a[href], #mobile-drawer button:not(:disabled)')].filter(e => e.getClientRects().length);
      const first = targets[0], last = targets.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    return;
  }
  if (modal || event.ctrlKey || event.metaKey || event.altKey || event.repeat || ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) return;
  if (page === 'arena' && state.battle?.status === 'active') {
    const action = { '1': 'attack', '2': 'skill', '3': 'guard', '4': 'ultimate', '5': 'support', h: 'potion', H: 'potion' }[event.key];
    if (action) { event.preventDefault(); doBattleAction(action); }
  }
});

persist();
render();
motion.enter();
account.initialize().then(() => { if (page === 'admin' && account.user?.role === 'admin') admin.refresh().catch(admin.report); });

function handleExpansionAction(action, id) {
  sound();
  const goBattle = outcome => { if (outcome.error) toast(outcome.error, true); else { persist(); lastEffect = null; navigate('arena'); } };
  switch (action) {
    case 'tab': activityTab = id; navigate('adventures'); break;
    case 'chapter': storyChapter = Number(id); render(); break;
    case 'choice': storyChoice = id; render(); break;
    case 'story-start': goBattle(startStory(state, storyWorld, Number(id), storyChoice, statsFor(state))); break;
    case 'run-start': goBattle(beginRun(state, id, statsFor(state))); break;
    case 'run-next': goBattle(nextRunBattle(state, id)); break;
    case 'run-end': result(endRun(state, id)); break;
    case 'boon': result(chooseBoon(state, id)); break;
    case 'mini-start': result(startMini(state, id)); break;
    case 'mini-action': result(miniAction(state, id === 'continue' ? id : Number(id), dateKey())); break;
    case 'mini-end': result(endMini(state)); break;
    case 'support': result(toggleSupport(state, id)); break;
    case 'gear-craft': result(craftEquipment(state, id)); break;
    case 'gear-equip': result(equipEquipment(state, id)); break;
    case 'claim': result(claimAchievement(state, id)); break;
    case 'return': {
      const b = state.battle;
      if (!b || b.status === 'active') break;
      activityTab = b.mode; storyWorld = b.worldId; storyChapter = Math.min(4, state.adventure.story[storyWorld]);
      state.battle = null; persist(); navigate('adventures'); break;
    }
  }
}

// The deadline lives in the saved session, so navigation and reload cannot restart the clock.
setInterval(() => {
  const session = state.adventure.mini.session;
  if (session?.kind !== 'reflex' || session.status !== 'active') return;
  const remaining = Math.max(0, Math.ceil((session.endsAt - Date.now()) / 1000));
  const timer = document.querySelector('#reflex-timer');
  if (timer) timer.textContent = `${remaining}s`;
  if (!remaining) result(finishMini(state, dateKey()));
}, 200);


async function handleServerAction(action, id) {
  switch (action) {
    case 'account-logout': await account.logout(); toast('Đã đăng xuất. Bản chơi khách được giữ riêng.'); break;
    case 'account-retry': await account.flush(); refreshAccountIndicators(); break;
    case 'account-reload': showModal('account-reload'); break;
    case 'account-reload-confirm': await account.reload(); render(); toast('Đã tải bản lưu mới từ máy chủ.'); break;
    case 'account-import': showModal('account-import'); break;
    case 'account-import-confirm': {
      const local = loadState({ getItem: key => localStorage.getItem(key) });
      await account.replace(local); render(); toast('Đã nhập bản chơi trên thiết bị vào tài khoản.'); break;
    }
    case 'admin-refresh': await admin.refresh(); break;
    case 'admin-player': await admin.select(id); break;
    case 'admin-page': admin.model.page = Math.max(1, Number(id)); await admin.refresh(); break;
    case 'admin-status': case 'admin-reset': case 'admin-restore': {
      if (!admin.model.selected) break;
      lastFocus = `[data-action="${action}"]`;
      modal = { type: 'admin-confirm' };
      modal.operation = action === 'admin-status' ? 'status' : action === 'admin-reset' ? 'reset' : 'restore';
      modal.target = structuredClone(admin.model.selected); modal.backupId = id; render(); break;
    }
    case 'admin-execute': {
      const context = modal; if (context?.type !== 'admin-confirm') break;
      modal = null;
      try { await admin.execute(context); toast('Đã cập nhật tài khoản người chơi.'); }
      catch (error) { admin.report(error); toast(error.message, true); }
      break;
    }
  }
}

app.addEventListener('submit', async event => {
  const form = event.target;
  if (!['account-auth-form','account-password-form','admin-search-form','admin-resource-form','admin-password-form'].includes(form.id)) return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form)), submit = form.querySelector('[type="submit"]');
  if (submit.disabled) return; submit.disabled = true;
  try {
    if (form.id === 'account-auth-form') { await account.login(form.dataset.kind, data); navigate(account.user.role === 'admin' ? 'admin' : 'overview'); toast('Đã đăng nhập và tải tiến trình tài khoản.'); }
    if (form.id === 'account-password-form') { await account.changePassword(data); render(); toast('Đã đổi mật khẩu và kết thúc các phiên khác.'); }
    if (form.id === 'admin-search-form') { admin.model.search = data.search; admin.model.page = 1; await admin.refresh(); }
    if (form.id === 'admin-resource-form') { await admin.resources(data); toast('Đã lưu tài nguyên người chơi.'); }
    if (form.id === 'admin-password-form') { await admin.password(data.password); toast('Đã đặt lại mật khẩu và kết thúc phiên của người chơi.'); }
  } catch (error) {
    if (form.id.startsWith('admin-')) admin.report(error);
    const message = document.querySelector('#account-form-error'); if (message) message.textContent = error.message;
    toast(error.message, true);
  } finally { submit.disabled = false; }
});
