import { characterById, worldById } from './data.js';
import { icon } from './icons.js';
import { portrait } from './art.js';

// Visuals never own turns, rewards, cooldowns or saved state.
const themes = {
  'dragon-ball': ['beam', '#65d9ff'], naruto: ['orb', '#70baff'],
  'one-piece': ['impact', '#ffd06c'], bleach: ['slash', '#8cdfff'],
  'tokyo-ghoul': ['tendrils', '#ff5a76'], slime: ['magic', '#60efd8'],
  sao: ['slash', '#62daff'], overlord: ['runes', '#b887ff'],
  'solo-leveling': ['shadow', '#9b78ff'], wistoria: ['slash', '#71d8ff'],
  'black-clover': ['dark-slash', '#d88aff'], 'jujutsu-kaisen': ['curse', '#ff779a'],
  'seven-deadly-sins': ['dark-slash', '#b67aff'], 'fate-zero': ['beam', '#ffe398'],
  'demon-slayer': ['water', '#74daff'], 'fairy-tail': ['flame', '#ffac5c'],
};
const variants = {
  vegeta: ['beam', '#c8a0ff'], sasuke: ['lightning', '#b6a1ff'], zoro: ['slash', '#9df28e'],
  rukia: ['water', '#ccf3ff'], milim: ['orb', '#ff9ae1'], asuna: ['slash', '#ffabb8'],
  albedo: ['dark-slash', '#ba96ff'], 'cha-haein': ['slash', '#ffe1a0'], elfaria: ['magic', '#87ddff'],
  yuno: ['wind', '#83f6bf'], gojo: ['runes', '#d4adff'], escanor: ['flame', '#ffd06c'],
  gilgamesh: ['blades', '#ffe28a'], nezuko: ['flame', '#ff86b3'], erza: ['slash', '#ff93a8'],
};
export function effectFor(characterId) {
  const character = characterById(characterId);
  const [kind, color] = variants[characterId] ?? themes[character.world];
  return { kind, color };
}

export function createPixelMotion(enabled) {
  const animations = new Set();
  const timers = new Set();
  const releases = new Set();
  let observer;
  let layer;
  let stage;
  const later = (callback, delay) => {
    const timer = setTimeout(() => { timers.delete(timer); callback(); }, delay);
    timers.add(timer);
  };
  const animate = (element, frames, duration = 320, delay = 0) => {
    if (!element || !enabled()) return;
    const animation = element.animate(frames, { duration, delay, easing: 'steps(5, end)', fill: 'both' });
    animations.add(animation);
    animation.onfinish = () => { animation.cancel(); animations.delete(animation); };
    return animation;
  };
  function cancel() {
    observer?.disconnect();
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    for (const animation of animations) animation.cancel();
    animations.clear();
    for (const release of releases) release();
    releases.clear();
    layer?.remove(); layer = null;
    stage?.removeAttribute('data-fx-playing'); stage = null;
    document.querySelectorAll('.pixel-portrait.is-awake').forEach(element => element.classList.remove('is-awake'));
    document.querySelectorAll('.pixel-ambient').forEach(element => element.remove());
    document.querySelectorAll('.damage-number').forEach(element => element.remove());
  }
  function prepare() {
    if (!enabled()) return;
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) entry.target.classList.toggle('is-awake', entry.isIntersecting);
    }, { threshold: 0.1 });
    document.querySelectorAll('.pixel-portrait').forEach((element, index) => {
      element.style.setProperty('--idle-delay', `${-index % 7 * 0.3}s`);
      observer.observe(element);
    });
    const banner = document.querySelector('.hero-banner');
    if (banner) {
      const ambient = document.createElement('span');
      ambient.className = 'pixel-ambient'; ambient.setAttribute('aria-hidden', 'true');
      for (let i = 0; i < 8; i++) {
        const mote = document.createElement('i');
        mote.style.cssText = `left:${46 + i * 7}%;top:${23 + i % 4 * 18}%;--mote-delay:${-i * 0.7}s`;
        ambient.append(mote);
      }
      banner.append(ambient);
    }
    animate(document.querySelector('dialog[open]'), [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], 180);
  }
  function enter() {
    animate(document.querySelector('#main-content'), [{ opacity: 0.5, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], 180);
  }
  function element(kind, point, color) {
    const node = document.createElement('span');
    node.className = `pixel-fx fx-${kind}`;
    node.style.cssText = `left:${Math.round(point.x)}px;top:${Math.round(point.y)}px;--fx-color:${color}`;
    layer.append(node);
    return node;
  }
  function burst(point, color, delay = 0, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2;
      const distance = 24 + i % 3 * 14;
      const particle = element('particle', point, color);
      animate(particle, [
        { opacity: 0, transform: 'translate(0,0) scale(0.5)' },
        { opacity: 1, transform: 'translate(0,0) scale(1)', offset: 0.12 },
        { opacity: 0, transform: `translate(${Math.round(Math.cos(angle) * distance)}px,${Math.round(Math.sin(angle) * distance)}px) scale(0.5)` },
      ], 430, delay);
      later(() => particle.remove(), delay + 430);
    }
  }
  function attackEffect(kind, color, from, to, ultimate) {
    const dx = to.x - from.x, dy = to.y - from.y;
    const distance = Math.hypot(dx, dy), angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const power = ultimate ? 1.4 : 1;
    if (kind === 'beam' || kind === 'lightning') {
      const beam = element(kind, from, color);
      beam.style.width = `${distance}px`;
      beam.style.setProperty('--beam-height', `${ultimate ? 42 : 24}px`);
      animate(beam, [
        { opacity: 0, transform: `rotate(${angle}deg) scaleX(0.05)` },
        { opacity: 1, transform: `rotate(${angle}deg) scaleX(1)`, offset: 0.45 },
        { opacity: 0, transform: `rotate(${angle}deg) scaleX(1)` },
      ], 460, 90);
    } else if (['slash', 'dark-slash', 'water', 'blades', 'tendrils'].includes(kind)) {
      const count = kind === 'blades' ? 5 : ultimate ? 3 : 2;
      for (let i = 0; i < count; i++) {
        const slash = element(kind, { x: to.x + (i - 1) * 12, y: to.y + (i - 1) * 14 }, color);
        const rotation = i % 2 ? 36 : -36;
        animate(slash, [
          { opacity: 0, transform: `rotate(${rotation}deg) scaleY(0.15)` },
          { opacity: 1, transform: `rotate(${rotation}deg) scaleY(${power})`, offset: 0.45 },
          { opacity: 0, transform: `rotate(${rotation}deg) scaleY(${power}) translateY(-20px)` },
        ], 360, 130 + i * 55);
      }
    } else {
      const spell = element(kind, from, color);
      if (kind === 'runes' || kind === 'magic') spell.innerHTML = icon(kind === 'runes' ? 'nexus' : 'star');
      animate(spell, [
        { opacity: 0, transform: 'translate(-50%,-50%) scale(0.3)' },
        { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: 0.25 },
        { opacity: 1, transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(${power})`, offset: 0.8 },
        { opacity: 0, transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(${power * 1.2})` },
      ], 490, 50);
    }
    burst(to, color, 280, ultimate ? 18 : 12);
  }
  function bar(selector, before, after, max, delay) {
    animate(stage.querySelector(selector), [{ width: `${before / max * 100}%` }, { width: `${after / max * 100}%` }], 280, delay);
  }
  function battle({ before, after, outcome, action }) {
    stage = document.querySelector('.battle-stage');
    if (!stage) return;
    const damageNumbers = [...stage.querySelectorAll('.damage-number')];
    if (!enabled()) { later(() => damageNumbers.forEach(node => node.remove()), 1100); return; }
    // Skill controls sit below the scene on phones; bring the effect into view.
    const scene = stage.getBoundingClientRect();
    if (window.innerWidth <= 760 && (scene.top < 80 || scene.bottom > window.innerHeight - 80)) {
      stage.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    const hero = characterById(after.characterId);
    const { kind, color } = effectFor(hero.id);
    stage.dataset.fxPlaying = action;
    layer = document.createElement('span'); layer.className = 'pixel-fx-layer';
    layer.dataset.effect = ['guard', 'potion', 'support', 'attack'].includes(action) ? action : kind;
    layer.setAttribute('aria-hidden', 'true'); stage.append(layer);
    const bounds = stage.getBoundingClientRect();
    const player = stage.querySelector('.player > .pixel-portrait');
    const enemy = stage.querySelector('.enemy .pixel-portrait');
    const center = node => { const rect = node.getBoundingClientRect(); return { x: rect.left - bounds.left + rect.width / 2, y: rect.top - bounds.top + rect.height * 0.56 }; };
    const from = center(player), to = center(enemy);
    const lunge = Math.round(Math.min(48, (to.x - from.x) * 0.2));
    const label = element('callout', { x: bounds.width / 2, y: 68 }, color);
    const world = worldById(hero.world);
    label.textContent = action === 'skill' ? hero.skill ?? world.skill : action === 'ultimate' ? hero.ultimate ?? world.ultimate : ({ attack: 'TẤN CÔNG', guard: 'PHÒNG THỦ', potion: 'HỒI PHỤC', support: 'LIÊN KÍCH' })[action];
    animate(label, [{ opacity: 0, transform: 'translate(-50%,8px)' }, { opacity: 1, transform: 'translate(-50%,0)', offset: 0.2 }, { opacity: 1, offset: 0.75 }, { opacity: 0, transform: 'translate(-50%,-8px)' }], 670);
    if (action === 'guard' || action === 'potion') {
      const shield = element(action === 'guard' ? 'guard' : 'heal', from, action === 'guard' ? '#82d9ff' : '#8fffa5');
      shield.innerHTML = icon(action === 'guard' ? 'shield' : 'potion');
      animate(shield, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(0.6)' }, { opacity: 0.85, transform: 'translate(-50%,-50%) scale(1)', offset: 0.2 }, { opacity: 0, transform: 'translate(-50%,-65%) scale(1.15)' }], 850);
      if (action === 'potion') burst(from, '#8fffa5', 80);
    } else {
      animate(player, [{ transform: 'translateX(0)' }, { transform: `translateX(${lunge}px)`, offset: 0.4 }, { transform: 'translateX(0)' }], 340);
      if (action === 'support') {
        after.supportIds.forEach((id, index) => {
          const teammate = characterById(id);
          const ghost = element('support', { x: from.x + (index ? 32 : -32), y: from.y + 22 }, worldById(teammate.world).color);
          ghost.innerHTML = portrait(teammate, worldById(teammate.world).color);
          animate(ghost, [{ opacity: 0, transform: 'translate(-50%,-50%)' }, { opacity: 0.9, offset: 0.25 }, { opacity: 0, transform: `translate(calc(-50% + ${lunge * 2}px),-50%)` }], 560);
        });
        attackEffect(kind, color, from, to, false);
      } else attackEffect(action === 'attack' ? 'impact' : kind, color, from, to, action === 'ultimate');
    }
    if (outcome.damage) animate(enemy, [{ transform: 'translateX(0)' }, { transform: 'translateX(10px)', offset: 0.3 }, { transform: 'translateX(-6px)', offset: 0.6 }, { transform: 'translateX(0)' }], 260, 280);
    if (outcome.incoming) {
      animate(enemy, [{ transform: 'translateX(0)' }, { transform: `translateX(${-lunge}px)`, offset: 0.4 }, { transform: 'translateX(0)' }], 300, 550);
      animate(player, [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)', offset: 0.4 }, { transform: 'translateX(0)' }], 240, 670);
      burst(from, action === 'guard' ? '#82d9ff' : '#ff8298', 670, 8);
    }
    for (const number of damageNumbers) {
      const delay = number.classList.contains('incoming') ? 670 : 280;
      animate(number, [{ opacity: 0, transform: 'translateX(-50%) translateY(12px)' }, { opacity: 1, transform: 'translateX(-50%) translateY(0)', offset: 0.18 }, { opacity: 0, transform: 'translateX(-50%) translateY(-42px)' }], 530, delay);
      later(() => number.remove(), delay + 530);
    }
    bar('.enemy-health > span', before.enemy.hp, after.enemy.hp, after.enemy.maxHp, 280);
    bar('.player-health > span', before.player.hp, after.player.hp, after.player.maxHp, action === 'potion' ? 80 : 670);
    bar('.energy-bar .progress > span', before.player.energy, after.player.energy, 100, 80);
    const result = stage.querySelector('.battle-result');
    if (result) {
      result.inert = true;
      const release = () => { result.inert = false; };
      releases.add(release);
      animate(result, [{ opacity: 0 }, { opacity: 1 }], 240, 620);
      later(() => { release(); releases.delete(release); }, 860);
      animate(result.querySelector('.result-emblem'), [{ transform: 'scale(0.6) translateY(12px)' }, { transform: 'scale(1.15) translateY(-8px)', offset: 0.65 }, { transform: 'scale(1) translateY(0)' }], 350, 640);
      if (after.status === 'won') {
        later(() => {
          layer.style.zIndex = '6';
          burst({ x: bounds.width / 2, y: bounds.height * 0.3 }, '#ffe197', 0, 20);
        }, 650);
      }
    }
    later(() => { layer?.remove(); layer = null; stage?.removeAttribute('data-fx-playing'); }, 1300);
  }
  return { cancel, prepare, enter, battle };
}
