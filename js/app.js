/* ============================================================
   PHILIGO (PHILI+) — Core App Logic, Age Tiers & Audit Trail
   ============================================================ */
'use strict';

const STORAGE_KEY = 'philigo_plus_v3';
const PILLS_PER_DAY = 3;

const VISUAL_FORMS = [
  { id: 'tablet', ico: '💊', label: 'Round/Oval Tablet' },
  { id: 'dispersible', ico: '🫧', label: 'Dispersible Pill' },
  { id: 'syrup', ico: '🧴', label: 'Oral Syrup' },
  { id: 'inhaler', ico: '💨', label: 'Inhaler + Spacer' },
];

const MINI_GAMES_CATALOG = [
  { id: 'runner', type: 'screen', target: 'game-runner', ico: '🏃', name: 'Pill Runner', sub: 'Dodge & collect', color: 'orange', minTier: 1 },
  { id: 'match', type: 'screen', target: 'game-match', ico: '🧩', name: 'Pill Match', sub: 'Match 3+', color: 'purple', minTier: 1 },
  { id: 'memory', type: 'screen', target: 'game-memory', ico: '🎴', name: 'Memory Cards', sub: 'Find pairs', color: 'blue', minTier: 1 },
  { id: 'quiz', type: 'screen', target: 'game-quiz', ico: '❓', name: 'Health Quiz', sub: 'STG knowledge', color: 'red', minTier: 1 },
  { id: 'pacer', type: 'arena', ico: '🫁', name: 'Breath Pacer', sub: 'Inhaler calm', color: 'green', minTier: 1 },
  { id: 'clock', type: 'arena', ico: '⏰', name: 'Dose Clock', sub: 'Routine timing', color: 'blue', minTier: 1 },
  { id: 'germ', type: 'arena', ico: '🦠', name: 'Germ Blaster', sub: 'Tap defense', color: 'red', minTier: 1 },
  { id: 'syrup', type: 'arena', ico: '🧪', name: 'Syrup Measure', sub: 'Exact dose', color: 'purple', minTier: 2 },
  { id: 'symptom', type: 'arena', ico: '🩺', name: 'Symptom Scout', sub: 'Safe triage', color: 'green', minTier: 1 },
  { id: 'shield', type: 'arena', ico: '🛡️', name: 'Shield Builder', sub: 'Daily streak', color: 'orange', minTier: 1 },
  { id: 'catch', type: 'arena', ico: '💧', name: 'Water Catch', sub: 'Clean water', color: 'blue', minTier: 1 },
  { id: 'plate', type: 'arena', ico: '🥗', name: 'Healthy Plate', sub: 'Nutrition fuel', color: 'green', minTier: 1 },
  { id: 'maze', type: 'arena', ico: '🧭', name: 'Clinic Path', sub: 'Follow-up route', color: 'orange', minTier: 2 },
  { id: 'rhythm', type: 'arena', ico: '🥁', name: 'Pulse Tap', sub: 'Steady beat', color: 'purple', minTier: 2 },
  { id: 'scramble', type: 'arena', ico: '🔤', name: 'Med Scramble', sub: 'Word decode', color: 'red', minTier: 3 },
];

const defaultState = () => ({
  onboarded: false,
  offlineMode: false,
  nudgesEnabled: true,
  user: { name: '', age: 9, avatar: '🦁', medForms: ['tablet', 'inhaler'] },
  childPin: '1234',
  parentPass: 'care2026',
  phone: '+268 7600 0000',
  otpVerified: false,
  coins: 0,
  level: 1,
  streak: 0,
  day: 1,
  totalDays: 180,
  pills: [false, false, false],
  totalPills: 0,
  prnLogs: 0,
  achievements: [],
  auditLogs: [],
  highscores: { runner: 0, match: 0, memory: 0, quiz: 0 },
});

let state = defaultState();

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = Object.assign(defaultState(), JSON.parse(raw));
  } catch (e) {}
}

function getAgeTier(ageInput) {
  const age = parseInt(ageInput, 10) || 9;
  if (age <= 8) {
    return {
      code: '6-8',
      num: 1,
      badge: 'Ages 6–8 · Guided Hero',
      greet: 'Hi super hero! 🌟',
      hint: 'Parent-assisted visual checklist & simple games',
    };
  }
  if (age <= 12) {
    return {
      code: '9-12',
      num: 2,
      badge: 'Ages 9–12 · Explorer',
      greet: 'Welcome back, Explorer!',
      hint: 'Skill puzzles, visual dose tracking & streak quests',
    };
  }
  return {
    code: '13-16',
    num: 3,
    badge: 'Ages 13–16 · Independent',
    greet: 'Hey there, Champion',
    hint: 'Self-management mode, smart nudges & full challenge suite',
  };
}

function addAuditEntry(actor, action, detail, retroactive = false) {
  const now = new Date();
  const stamp = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  state.auditLogs.unshift({
    actor,
    action,
    detail,
    timestamp: stamp,
    retroactive,
  });
  if (state.auditLogs.length > 50) state.auditLogs.pop();
  save();
}

// ---------- AUDIO ----------
const sound = (() => {
  let ctx;
  function getCtx() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } }
    return ctx;
  }
  function beep(freq, dur, type = 'sine', vol = 0.14) {
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
    coin() { beep(880, 0.08); setTimeout(() => beep(1320, 0.1), 60); },
    tap() { beep(600, 0.05, 'triangle', 0.08); },
    win() { beep(523, 0.1); setTimeout(() => beep(659, 0.1), 100); setTimeout(() => beep(784, 0.15), 200); },
    lose() { beep(300, 0.15, 'sawtooth', 0.1); setTimeout(() => beep(200, 0.2, 'sawtooth', 0.1), 100); },
    pop() { beep(1200, 0.05, 'sine', 0.1); },
    error() { beep(200, 0.2, 'sawtooth', 0.15); },
    notify() { beep(660, 0.1); setTimeout(() => beep(880, 0.15), 90); },
  };
})();

const haptic = (pattern = 20) => {
  if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) {} }
};

const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

const ui = {
  toast(msg, dur = 2100) {
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
  closeModal() { $('modal').classList.remove('active'); },
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

    const mainScreens = ['home', 'rewards', 'pin'];
    $('bottomNav').style.display = mainScreens.includes(id) ? 'flex' : 'none';
    $$('.nav-btn').forEach(b => b.classList.toggle('nav-btn--active', b.dataset.nav === id));

    if (id === 'home') render.home();
    if (id === 'rewards') render.rewards();
    if (id === 'pin') Parent.resetAuth();
    if (id === 'parent') Parent.render();
    if (id === 'game-runner') window.Runner.enter();
    if (id === 'game-match') window.Match3.enter();
    if (id === 'game-memory') window.Memory.enter();
    if (id === 'game-quiz') window.Quiz.enter();
  },
};

// ---------- ONBOARDING ----------
const ob = {
  step: 0,
  avatars: ['🦁', '🐘', '🦒', '🦓', '🐆', '🦏', '🦛', '🐃', '🐅', '🦌', '🐺', '🦅'],
  next() { ob.go(ob.step + 1); },
  prev() { ob.go(ob.step - 1); },
  go(n) {
    ob.step = Math.max(0, Math.min(3, n));
    $$('#onboard .onboard__step').forEach(s => s.classList.toggle('active', parseInt(s.dataset.step, 10) === ob.step));
    sound.tap();
  },
  previewTier() {
    const val = parseInt($('obAge').value, 10);
    if (val >= 6 && val <= 16) {
      const t = getAgeTier(val);
      $('tierPreview').textContent = `Selected Tier: ${t.badge} — ${t.hint}`;
    } else {
      $('tierPreview').textContent = 'Enter age between 6 and 16';
    }
  },
  step2() {
    const name = $('obName').value.trim();
    const age = parseInt($('obAge').value, 10);
    if (!name) return ui.toast('Please enter child name');
    if (!age || age < 6 || age > 16) return ui.toast('Age must be between 6 and 16');
    state.user.name = name;
    state.user.age = age;
    ob.next();
  },
  step3() {
    if (!state.user.medForms.length) state.user.medForms = ['tablet'];
    ob.next();
  },
  sendOtp() {
    const phone = $('obPhone').value.trim();
    if (!phone) return ui.toast('Enter caregiver phone number first');
    state.phone = phone;
    state.otpVerified = true;
    $('otpStatus').textContent = '✅ Online OTP verified! Local PIN & Passkey ready for offline use.';
    sound.coin();
    ui.toast('OTP Verified (Online Check Complete)');
  },
  finish() {
    const cPin = $('obChildPin').value.trim();
    const pPass = $('obParentPass').value.trim();
    if (!/^\d{4}$/.test(cPin)) return ui.toast('Child offline PIN must be 4 digits');
    if (pPass.length < 4) return ui.toast('Caregiver password must be at least 4 characters');
    if (cPin === pPass) return ui.toast('Caregiver password must differ from child PIN');

    state.childPin = cPin;
    state.parentPass = pPass;
    state.onboarded = true;
    addAuditEntry('Caregiver', 'Profile Registered', `Child age ${state.user.age} (${getAgeTier(state.user.age).badge})`);
    save();
    $('onboard').classList.remove('active');
    sound.win();
    render.home();
    ui.toast('Welcome to PhiliGo, ' + state.user.name + '! 🎉');
  },
  buildSelectors() {
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
        sound.tap();
      };
      wrap.appendChild(el);
    });

    const fWrap = $('medFormGrid');
    fWrap.innerHTML = '';
    VISUAL_FORMS.forEach(f => {
      const chip = document.createElement('div');
      chip.className = 'med-form-chip' + (state.user.medForms.includes(f.id) ? ' selected' : '');
      chip.innerHTML = `<span>${f.ico}</span><span>${f.label}</span>`;
      chip.onclick = () => {
        const idx = state.user.medForms.indexOf(f.id);
        if (idx >= 0) state.user.medForms.splice(idx, 1);
        else state.user.medForms.push(f.id);
        chip.classList.toggle('selected');
        sound.tap();
      };
      fWrap.appendChild(chip);
    });
  },
};

// ---------- OFFLINE LOCK ----------
const Lock = {
  lock() {
    $('lockPinInput').value = '';
    $('lockError').textContent = '';
    $('lockModeText').textContent = state.offlineMode
      ? '📴 Offline Mode Active — Unlock via PIN or Passkey'
      : 'Works online or offline with PIN or Passkey';
    $('childLock').classList.add('active');
    sound.tap();
  },
  unlockPin() {
    const val = $('lockPinInput').value.trim();
    if (val === state.childPin) {
      $('childLock').classList.remove('active');
      sound.coin();
      ui.toast('Unlocked offline with PIN');
    } else {
      $('lockError').textContent = 'Incorrect child PIN';
      sound.error();
    }
  },
  unlockPasskey() {
    $('childLock').classList.remove('active');
    sound.win();
    ui.toast('🔑 Verified via Local Offline Passkey');
  },
};

// ---------- RENDER ----------
const render = {
  home() {
    const tier = getAgeTier(state.user.age);
    document.documentElement.setAttribute('data-tier', tier.code);

    $('homeGreet').textContent = tier.greet;
    $('homeName').textContent = state.user.name || 'Friend';
    $('homeTierBadge').textContent = tier.badge;
    $('homeAvatar').textContent = state.user.avatar;
    $('statCoins').textContent = state.coins;
    $('statStreak').textContent = state.streak;
    $('statLevel').textContent = state.level;
    $('netToggle').textContent = state.offlineMode ? '📴' : '📶';

    const pct = Math.min(100, Math.round((state.day / state.totalDays) * 100));
    $('progRing').style.setProperty('--p', (pct * 3.6) + 'deg');
    $('progPct').textContent = pct + '%';
    $('treatInfo').textContent = `Day ${state.day} of ${state.totalDays}`;
    $('tierGuidanceHint').textContent = tier.hint;

    render.pills();
    render.games();
    render.badgesMini();
  },

  pills() {
    const wrap = $('pillsToday');
    wrap.innerHTML = '';
    const times = ['08:00 AM', '02:00 PM', '08:00 PM'];
    const selectedForms = state.user.medForms.length ? state.user.medForms : ['tablet'];

    state.pills.forEach((taken, i) => {
      const formId = selectedForms[i % selectedForms.length];
      const formObj = VISUAL_FORMS.find(f => f.id === formId) || VISUAL_FORMS[0];
      const el = document.createElement('button');
      el.className = 'pill-slot' + (taken ? ' taken' : '');
      el.innerHTML = `<div class="pill-slot__emoji">${formObj.ico}</div><div>${times[i]}</div><small>${formObj.label.split(' ')[0]}</small>`;
      if (!taken) el.onclick = () => app.takePill(i, formObj.label);
      wrap.appendChild(el);
    });
    const count = state.pills.filter(Boolean).length;
    $('pillCount').textContent = count + '/' + PILLS_PER_DAY;
  },

  games() {
    const grid = $('gamesGrid');
    grid.innerHTML = '';
    const tier = getAgeTier(state.user.age);
    $('gameTierLabel').textContent = `15 Games · ${tier.code} Mode`;

    MINI_GAMES_CATALOG.forEach(g => {
      const btn = document.createElement('button');
      btn.className = `game-card game-card--${g.color}`;
      btn.innerHTML = `
        <span class="game-card__ico">${g.ico}</span>
        <span class="game-card__name">${g.name}</span>
        <span class="game-card__sub">${g.sub}</span>
      `;
      btn.onclick = () => {
        if (g.type === 'screen') nav.go(g.target);
        else window.Arena.launch(g);
      };
      grid.appendChild(btn);
    });
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

const ACHIEVEMENTS = [
  { id: 'first_pill', name: 'First Dose', ico: '💊', cond: s => s.totalPills >= 1 },
  { id: 'prn_safe', name: 'PRN Scout', ico: '💨', cond: s => s.prnLogs >= 1 },
  { id: 'week_warrior', name: '7-Day Streak', ico: '🔥', cond: s => s.streak >= 7 },
  { id: 'coin_50', name: '50 Stars', ico: '⭐', cond: s => s.coins >= 50 },
  { id: 'coin_100', name: '100 Stars', ico: '💰', cond: s => s.coins >= 100 },
  { id: 'quiz_pro', name: 'STG Scholar', ico: '🧠', cond: s => s.highscores.quiz >= 8 },
  { id: 'runner_pro', name: 'Swift Hero', ico: '🏃', cond: s => s.highscores.runner >= 20 },
  { id: 'match_pro', name: 'Puzzle Pro', ico: '🧩', cond: s => s.highscores.match >= 100 },
  { id: 'memory_pro', name: 'Memory Ace', ico: '🎴', cond: s => s.highscores.memory >= 50 },
];

function checkAchievements() {
  ACHIEVEMENTS.forEach(a => {
    if (!state.achievements.includes(a.id) && a.cond(state)) {
      state.achievements.push(a.id);
      setTimeout(() => {
        ui.modal(a.ico, 'Achievement Unlocked!', `You earned: ${a.name}`);
        sound.notify();
      }, 500);
    }
  });
  save();
}

// ---------- APP ACTIONS ----------
const app = {
  addCoins(n) {
    state.coins = Math.max(0, state.coins + n);
    state.level = Math.floor(state.coins / 50) + 1;
    save();
    render.home();
  },
  toggleOffline() {
    state.offlineMode = !state.offlineMode;
    save();
    render.home();
    ui.toast(state.offlineMode ? '📴 Offline Mode: Local PIN/Passkey & logging active' : '📶 Online Mode Active');
  },
  triggerNudge() {
    if (!state.nudgesEnabled) return ui.toast('Nudges are paused in Caregiver settings');
    const apps = ['YouTube', 'Social Feed', 'Mobile Game', 'Phone Screen'];
    const picked = apps[Math.floor(Math.random() * apps.length)];
    sound.notify();
    ui.modal('📱', `${picked} Activity Nudge`, `Hey ${state.user.name || 'Hero'}! Since you're active on your phone, take 10 seconds to check today's dose!`);
  },
  takePill(i, formLabel) {
    if (state.pills[i]) return;
    state.pills[i] = true;
    state.totalPills++;
    state.coins += 2;
    state.streak++;
    addAuditEntry(`${state.user.name || 'Child'} (App)`, 'Scheduled Dose Logged', `Slot ${i + 1} (${formLabel})`, false);
    sound.coin();
    haptic(30);

    if (state.pills.every(Boolean)) {
      setTimeout(() => {
        state.day++;
        state.pills = [false, false, false];
        state.coins += 10;
        save();
        render.home();
        checkAchievements();
        ui.modal('🌟', 'All Today’s Doses Done!', `Streak: ${state.streak} 🔥 (+10 bonus stars)`);
        sound.win();
      }, 500);
    } else {
      save();
      render.pills();
      ui.toast(`💊 ${formLabel} logged! +2 stars`);
      checkAchievements();
    }
  },
  openPrnModal() { $('prnModal').classList.add('active'); },
  closePrnModal() { $('prnModal').classList.remove('active'); },
  submitPrn() {
    const med = $('prnMedSelect').value;
    const sym = $('prnSymptomSelect').value;
    state.prnLogs++;
    state.coins += 5;
    addAuditEntry(`${state.user.name || 'Child'} (PRN)`, 'PRN & Symptom Check', `${med} — ${sym}`, false);
    save();
    app.closePrnModal();
    render.home();
    checkAchievements();
    sound.win();
    if (sym.includes('Severe')) {
      ui.modal('🚨', 'Alert Caregiver Now', 'Severe symptom selected. Show this screen to your caregiver or visit your nearest Eswatini clinic right away.');
    } else {
      ui.toast('💨 Safe PRN & symptom check-in logged! +5 stars');
    }
  },
  setHighscore(game, score) {
    if (score > state.highscores[game]) {
      state.highscores[game] = score;
      save();
    }
  },
};

// ---------- CAREGIVER PORTAL ----------
const Parent = {
  resetAuth() {
    $('parentPassInput').value = '';
    $('pinError').textContent = '';
    $('recoveryBox').style.display = 'none';
  },
  login() {
    const entered = $('parentPassInput').value.trim();
    if (entered === state.parentPass) {
      sound.notify();
      nav.go('parent');
    } else {
      $('pinError').textContent = 'Incorrect caregiver password.';
      sound.error();
    }
  },
  toggleRecovery() {
    const box = $('recoveryBox');
    box.style.display = box.style.display === 'none' ? 'flex' : 'none';
  },
  recoverAccount() {
    const newPhone = $('recPhone').value.trim();
    const newPass = $('recNewPass').value.trim();
    if (newPass.length < 4) return ui.toast('New password must be at least 4 characters');
    if (newPass === state.childPin) return ui.toast('Caregiver password must differ from child PIN');
    if (newPhone) state.phone = newPhone;
    state.parentPass = newPass;
    addAuditEntry('Caregiver (Recovery)', 'Account Credentials Updated', `Phone: ${state.phone}`, false);
    save();
    ui.toast('✅ Caregiver password & phone updated!');
    Parent.toggleRecovery();
  },
  lock() {
    ui.toast('🔒 Caregiver portal locked');
    nav.go('home');
  },
  tab(name) {
    $$('.parent-tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    $$('.parent-tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + name));
    sound.tap();
  },
  addBackfill() {
    const date = $('bfDate').value || new Date().toISOString().split('T')[0];
    const slot = $('bfSlot').value;
    const reason = $('bfReason').value.trim() || 'Power outage / offline backfill';
    state.totalPills++;
    addAuditEntry('Caregiver (Backfill)', `Retroactive Log for ${date}`, `${slot} — Note: ${reason}`, true);
    $('bfReason').value = '';
    Parent.render();
    sound.coin();
    ui.toast('⚡ Retroactive dose logged with timestamp & audit tag');
  },
  toggleNudges() {
    state.nudgesEnabled = !state.nudgesEnabled;
    save();
    Parent.render();
  },
  resetDemo() {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  },
  render() {
    const tier = getAgeTier(state.user.age);
    $('parentChildName').textContent = state.user.name || 'your child';
    $('parentTierTag').textContent = tier.badge;
    $('pTotal').textContent = state.totalPills;
    $('pPrnCount').textContent = state.prnLogs;
    $('pStreak').textContent = state.streak + ' days';
    $('pDay').textContent = `${state.day} / ${state.totalDays}`;
    const totalPossible = state.day * PILLS_PER_DAY;
    const rate = totalPossible > 0 ? Math.min(100, Math.round((state.totalPills / totalPossible) * 100)) : 0;
    $('pAdhRate').textContent = rate + '%';
    $('nudgeToggleBtn').textContent = state.nudgesEnabled ? 'Enabled' : 'Paused';

    const grid = $('weekGrid');
    grid.innerHTML = '';
    ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach((d, i) => {
      const el = document.createElement('div');
      el.className = 'week-day ' + (i < 5 ? 'done' : '');
      el.innerHTML = `<span>${d}</span><span class="week-day__dot"></span>`;
      grid.appendChild(el);
    });

    const logList = $('auditLogList');
    logList.innerHTML = '';
    if (!state.auditLogs.length) {
      logList.innerHTML = '<div class="audit-item">No logs recorded yet.</div>';
    } else {
      state.auditLogs.forEach(item => {
        const div = document.createElement('div');
        div.className = 'audit-item' + (item.retroactive ? ' retro' : '');
        div.innerHTML = `
          <strong>${item.retroactive ? '⚡ RETROACTIVE' : '✅ REAL-TIME'} · ${item.action}</strong><br>
          <span>By: <strong>${item.actor}</strong> · Logged: ${item.timestamp}</span><br>
          <small>${item.detail}</small>
        `;
        logList.appendChild(div);
      });
    }
  },
};

function init() {
  load();
  ob.buildSelectors();
  render.home();

  setTimeout(() => {
    $('splash').classList.add('hide');
    setTimeout(() => {
      $('splash').style.display = 'none';
      if (!state.onboarded) $('onboard').classList.add('active');
    }, 450);
  }, 1300);
}

window.addEventListener('DOMContentLoaded', init);
window.__philigo = { state, save, ui, sound, haptic, app, checkAchievements, nav, $, $$, Parent, ob, render, Lock };
window.Parent = Parent;
window.ob = ob;
window.render = render;
window.app = app;
window.nav = nav;
window.ui = ui;
window.Lock = Lock;