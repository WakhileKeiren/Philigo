/* ============================================================
   PHILIGO — Core App Logic
   ============================================================ */
'use strict';

const STORAGE_KEY = 'philigo_v2';
const PILLS_PER_DAY = 3;

// ---------- STATE ----------
const defaultState = () => ({
  onboarded: false,
  theme: 'light',
  user: { name: '', age: '', avatar: '🦁' },
  pin: '1234',
  coins: 0,
  xp: 0,
  level: 1,
  streak: 0,
  day: 1,
  totalDays: 180,
  pills: [false, false, false],
  totalPills: 0,
  missed: 0,
  achievements: [],
  history: [], // { date, taken, missed }
  highscores: { runner: 0, match: 0, memory: 0, quiz: 0 },
});

let state = defaultState();

// ---------- PERSIST ----------
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
}
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = Object.assign(defaultState(), JSON.parse(raw));
  } catch(e) {}
}

// ---------- AUDIO (Web Audio API — no files needed) ----------
const sound = (() => {
  let ctx;
  function getCtx() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { ctx = null; } }
    return ctx;
  }
  function beep(freq, dur, type = 'sine', vol = 0.15) {
    const c = getCtx(); if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type; o.frequency.value = freq;
    o.connect(g); g.connect(c.destination);
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.start(); o.stop(c.currentTime + dur);
  }
  return {
    coin()   { beep(880, 0.08); setTimeout(() => beep(1320, 0.1), 60); },
    tap()    { beep(600, 0.05, 'triangle', 0.08); },
    win()    { beep(523,0.1); setTimeout(()=>beep(659,0.1),100); setTimeout(()=>beep(784,0.15),200); },
    lose()   { beep(300,0.15,'sawtooth',0.1); setTimeout(()=>beep(200,0.2,'sawtooth',0.1),100); },
    pop()    { beep(1200,0.05,'sine',0.1); },
    error()  { beep(200,0.2,'sawtooth',0.15); },
    notify() { beep(660,0.1); setTimeout(()=>beep(880,0.15),90); },
  };
})();

// ---------- HAPTICS ----------
const haptic = (pattern = 20) => {
  if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch(e) {} }
};

// ---------- UI HELPERS ----------
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

const ui = {
  toast(msg, dur = 1900) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), dur);
  },
  modal(ico, title, msg) {
    $('modalIco').textContent = ico;
    $('modalTitle').textContent = title;
    $('modalMsg').textContent = msg;
    $('modal').classList.add('active');
  },
  closeModal() {
    $('modal').classList.remove('active');
  },
};

// ---------- NAVIGATION ----------
const nav = {
  current: 'home',
  go(id) {
    $$('.screen').forEach(s => s.classList.remove('screen--active'));
    const target = $('sc-' + id);
    if (!target) return;
    target.classList.add('screen--active');
    window.scrollTo(0, 0);
    nav.current = id;
    sound.tap();

    // Bottom nav visibility
    const mainScreens = ['home', 'rewards', 'pin'];
    $('bottomNav').style.display = mainScreens.includes(id) ? 'flex' : 'none';
    $$('.nav-btn').forEach(b => b.classList.toggle('nav-btn--active', b.dataset.nav === id));

    // Screen-specific init
    if (id === 'home') render.home();
    if (id === 'rewards') render.rewards();
    if (id === 'pin') Parent.resetPin();
    if (id === 'parent') Parent.render();
    if (id === 'game-runner') Runner.enter();
    if (id === 'game-match') Match3.enter();
    if (id === 'game-memory') Memory.enter();
    if (id === 'game-quiz') Quiz.enter();
  },
};

// ---------- ONBOARDING ----------
const ob = {
  step: 0,
  avatars: ['🦁','🐘','🦒','🦓','🐆','🦏','🦛','🐃','🐅','🦌','🐺','🦅'],
  next() { ob.go(ob.step + 1); },
  prev() { ob.go(ob.step - 1); },
  go(n) {
    ob.step = Math.max(0, Math.min(2, n));
    $$('#onboard .onboard__step').forEach(s => s.classList.toggle('active', parseInt(s.dataset.step) === ob.step));
    sound.tap();
  },
  step2() {
    const name = $('obName').value.trim();
    const age = $('obAge').value.trim();
    if (!name) return ui.toast('Please enter your name');
    if (!age || age < 6 || age > 15) return ui.toast('Age must be 6–15');
    state.user.name = name;
    state.user.age = age;
    ob.next();
  },
  finish() {
    const pin = $('obPin').value.trim();
    if (!/^\d{4}$/.test(pin)) return ui.toast('PIN must be 4 digits');
    state.pin = pin;
    state.onboarded = true;
    save();
    $('onboard').classList.remove('active');
    sound.win();
    render.home();
    ui.toast('Welcome, ' + state.user.name + '! 🎉');
  },
  buildAvatars() {
    const wrap = $('avatarGrid');
    wrap.innerHTML = '';
    ob.avatars.forEach(a => {
      const el = document.createElement('div');
      el.className = 'avatar-opt' + (a === state.user.avatar ? ' selected' : '');
      el.textContent = a;
      el.onclick = () => {
        state.user.avatar = a;
        $$('.avatar-opt').forEach(x => x.classList.remove('selected'));
        el.classList.add('selected');
        sound.tap(); haptic(10);
      };
      wrap.appendChild(el);
    });
  },
};

// ---------- RENDER ----------
const render = {
  home() {
    $('homeName').textContent = state.user.name || 'Friend';
    $('homeAvatar').textContent = state.user.avatar;
    $('statCoins').textContent = state.coins;
    $('statStreak').textContent = state.streak;
    $('statLevel').textContent = state.level;

    // Progress ring
    const pct = Math.min(100, Math.round((state.day / state.totalDays) * 100));
    const ring = $('progRing');
    ring.style.setProperty('--p', (pct * 3.6) + 'deg');
    $('progPct').textContent = pct + '%';
    $('treatInfo').textContent = `Day ${state.day} of ${state.totalDays}`;

    render.pills();
    render.badgesMini();
    render.highscores();

    // Next reminder
    const now = new Date();
    const h = now.getHours();
    let next = h < 8 ? '8:00 AM' : h < 14 ? '2:00 PM' : h < 20 ? '8:00 PM' : '8:00 AM (tomorrow)';
    $('nextReminder').textContent = 'Next dose at ' + next;
  },

  pills() {
    const wrap = $('pillsToday');
    wrap.innerHTML = '';
    const times = ['8AM','2PM','8PM'];
    state.pills.forEach((taken, i) => {
      const el = document.createElement('button');
      el.className = 'pill-slot' + (taken ? ' taken' : '');
      el.innerHTML = `<div class="pill-slot__emoji">💊</div><div>${times[i]}</div>`;
      if (!taken) el.onclick = () => app.takePill(i);
      wrap.appendChild(el);
    });
    const count = state.pills.filter(Boolean).length;
    $('pillCount').textContent = count + '/' + PILLS_PER_DAY;
  },

  badgesMini() {
    const wrap = $('miniBadges');
    wrap.innerHTML = '';
    ACHIEVEMENTS.slice(0, 6).forEach(a => {
      const unlocked = state.achievements.includes(a.id);
      const el = document.createElement('div');
      el.className = 'badge-mini ' + (unlocked ? 'unlocked' : 'locked');
      el.innerHTML = `<div class="badge-mini__ico">${unlocked ? a.ico : '🔒'}</div><div class="badge-mini__name">${a.name}</div>`;
      wrap.appendChild(el);
    });
  },

  highscores() {
    $('hi-runner').textContent = state.highscores.runner;
    $('hi-match').textContent = state.highscores.match;
    $('hi-memory').textContent = state.highscores.memory;
    $('hi-quiz').textContent = state.highscores.quiz;
  },

  rewards() {
    $('rewardCoins').textContent = state.coins + ' Coins';
    const wrap = $('badgesGrid');
    wrap.innerHTML = '';
    ACHIEVEMENTS.forEach(a => {
      const unlocked = state.achievements.includes(a.id);
      const el = document.createElement('div');
      el.className = 'badge-item ' + (unlocked ? 'unlocked' : 'locked');
      el.innerHTML = `<div class="badge-item__ico">${unlocked ? a.ico : '🔒'}</div><div class="badge-item__name">${a.name}</div>`;
      wrap.appendChild(el);
    });
  },
};

// ---------- ACHIEVEMENTS ----------
const ACHIEVEMENTS = [
  { id: 'first_pill', name: 'First Pill', ico: '💊', cond: s => s.totalPills >= 1 },
  { id: 'week_warrior', name: 'Week Warrior', ico: '🔥', cond: s => s.streak >= 7 },
  { id: 'coin_50', name: 'Coin Collector', ico: '⭐', cond: s => s.coins >= 50 },
  { id: 'coin_100', name: 'Coin Master', ico: '💰', cond: s => s.coins >= 100 },
  { id: 'quiz_pro', name: 'Quiz Pro', ico: '🧠', cond: s => s.highscores.quiz >= 8 },
  { id: 'runner_pro', name: 'Runner Pro', ico: '🏃', cond: s => s.highscores.runner >= 20 },
  { id: 'match_pro', name: 'Matcher', ico: '🧩', cond: s => s.highscores.match >= 100 },
  { id: 'memory_pro', name: 'Memory Ace', ico: '🎴', cond: s => s.highscores.memory >= 50 },
  { id: 'month_hero', name: 'Month Hero', ico: '🏅', cond: s => s.day >= 30 },
  { id: 'level_5', name: 'Level 5', ico: '🏆', cond: s => s.level >= 5 },
  { id: 'streak_30', name: 'Streak 30', ico: '💎', cond: s => s.streak >= 30 },
  { id: 'champion', name: 'Champion', ico: '👑', cond: s => s.day >= 90 },
];

function checkAchievements() {
  ACHIEVEMENTS.forEach(a => {
    if (!state.achievements.includes(a.id) && a.cond(state)) {
      state.achievements.push(a.id);
      setTimeout(() => {
        ui.modal(a.ico, 'Achievement Unlocked!', `You earned: ${a.name}`);
        sound.notify();
        haptic([100, 50, 100]);
      }, 700);
    }
  });
  save();
}

// ---------- APP ACTIONS ----------
const app = {
  addCoins(n) {
    state.coins += n;
    if (state.coins > 0 && state.coins % 50 === 0) state.level++;
    save();
    render.home();
  },

  takePill(i) {
    if (state.pills[i]) return;
    state.pills[i] = true;
    state.totalPills++;
    state.coins += 2;
    state.streak++;
    sound.coin();
    haptic(30);

    if (state.pills.every(Boolean)) {
      setTimeout(() => {
        state.history.push({ date: new Date().toISOString().split('T')[0], taken: PILLS_PER_DAY, missed: 0 });
        state.day++;
        state.pills = [false, false, false];
        state.coins += 10; // bonus
        save();
        render.home();
        checkAchievements();
        ui.modal('🌟', 'Perfect Day!', 'You took all your medicine today! Streak: ' + state.streak + ' 🔥');
        sound.win();
      }, 700);
    } else {
      save();
      render.pills();
      ui.toast('💊 Pill taken! +2 coins');
      checkAchievements();
    }
  },

  setHighscore(game, score) {
    if (score > state.highscores[game]) {
      state.highscores[game] = score;
      save();
      render.highscores();
    }
  },
};

// ---------- PARENT MODE ----------
const Parent = {
  pinInput: '',
  resetPin() {
    Parent.pinInput = '';
    Parent.updateDots();
    $('pinError').textContent = '';
    Parent.renderPad();
  },
  renderPad() {
    const pad = $('pinPad');
    pad.innerHTML = '';
    ['1','2','3','4','5','6','7','8','9','⌫','0','✓'].forEach(k => {
      const b = document.createElement('button');
      b.className = 'pin-key' + (k === '⌫' ? ' del' : '');
      b.textContent = k;
      b.onclick = () => {
        if (k === '⌫') { Parent.pinInput = Parent.pinInput.slice(0, -1); Parent.updateDots(); }
        else if (k === '✓') Parent.submit();
        else if (Parent.pinInput.length < 4) {
          Parent.pinInput += k;
          Parent.updateDots();
          haptic(10);
          if (Parent.pinInput.length === 4) setTimeout(() => Parent.submit(), 250);
        }
      };
      pad.appendChild(b);
    });
  },
  updateDots() {
    $$('#pinDots span').forEach((d, i) => d.classList.toggle('filled', i < Parent.pinInput.length));
  },
  submit() {
    if (Parent.pinInput === state.pin) {
      sound.notify();
      Parent.pinInput = '';
      Parent.updateDots();
      nav.go('parent');
    } else {
      $('pinError').textContent = 'Incorrect PIN. Try again.';
      sound.error();
      haptic([100, 50, 100]);
      Parent.pinInput = '';
      Parent.updateDots();
    }
  },
  lock() {
    ui.modal('🔒', 'Locked', 'Parent mode has been locked.');
    setTimeout(() => { ui.closeModal(); nav.go('home'); }, 1000);
  },
  tab(name) {
    $$('.parent-tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    $$('.parent-tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + name));
    sound.tap();
  },
  render() {
    $('parentChildName').textContent = state.user.name || 'your child';
    $('pTotal').textContent = state.totalPills;
    $('pStreak').textContent = state.streak + ' days';
    $('pMissed').textContent = state.missed;
    $('pDay').textContent = state.day + ' / ' + state.totalDays;
    const totalPossible = state.day * PILLS_PER_DAY;
    const rate = totalPossible > 0 ? Math.round((state.totalPills / totalPossible) * 100) : 0;
    $('pAdhRate').textContent = rate + '%';

    // Week grid
    const grid = $('weekGrid');
    grid.innerHTML = '';
    const days = ['M','T','W','T','F','S','S'];
    const today = new Date().getDay();
    const todayIdx = today === 0 ? 6 : today - 1;
    days.forEach((d, i) => {
      let cls = '';
      if (i < todayIdx) cls = Math.random() > 0.15 ? 'done' : 'missed';
      else if (i === todayIdx) cls = state.pills.filter(Boolean).length === PILLS_PER_DAY ? 'done' : '';
      const el = document.createElement('div');
      el.className = 'week-day ' + cls;
      el.innerHTML = `<span>${d}</span><span class="week-day__dot"></span>`;
      grid.appendChild(el);
    });

    // Alerts
    const alerts = $('parentAlerts');
    alerts.innerHTML = '';
    if (state.missed > 0) alerts.innerHTML += `<div class="alert-item danger">⚠️ ${state.missed} missed dose(s) recorded</div>`;
    if (state.streak >= 7) alerts.innerHTML += `<div class="alert-item">🔥 Amazing ${state.streak}-day streak!</div>`;
    if (!alerts.innerHTML) alerts.innerHTML = '<div class="alert-item">✅ All caught up!</div>';
  },
};

// ---------- INIT ----------
function init() {
  load();
  document.documentElement.setAttribute('data-theme', state.theme);
  ob.buildAvatars();
  render.home();

  setTimeout(() => {
    $('splash').classList.add('hide');
    setTimeout(() => {
      $('splash').style.display = 'none';
      if (!state.onboarded) {
        $('onboard').classList.add('active');
        if (state.user.name) {
          $('obName').value = state.user.name;
          $('obAge').value = state.user.age;
        }
      }
    }, 500);
  }, 1800);
}

// Prevent double-tap zoom
let lastTap = 0;
document.addEventListener('touchend', e => {
  const now = Date.now();
  if (now - lastTap < 300) e.preventDefault();
  lastTap = now;
}, { passive: false });

// Boot
window.addEventListener('DOMContentLoaded', init);

// Export for games
window.__philigo = { state, save, ui, sound, haptic, app, checkAchievements, nav, $, $$ };
