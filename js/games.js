/* ============================================================
   PHILIGO — Games (Runner, Match-3, Memory, Quiz)
   ============================================================ */
'use strict';

const { state, save, ui, sound, haptic, app, checkAchievements, nav, $ } = window.__philigo;

/* ============================================================
   GAME 1: PILL RUNNER (Endless Runner)
   ============================================================ */
const Runner = (() => {
  let canvas, ctx;
  let running = false, raf = null;
  let W = 0, H = 0;
  let game;
  let touchStartX = 0;

  function resize() {
    const shell = document.querySelector('#sc-game-runner .game-shell');
    if (!shell) return;
    W = shell.clientWidth;
    H = shell.clientHeight;
    canvas.width = W * devicePixelRatio;
    canvas.height = H * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  function initGame() {
    game = {
      t: 0,
      speed: 5,
      lane: 1,
      x: W / 2,
      targetX: W / 2,
      playerY: H - 120,
      pills: [],
      obstacles: [],
      coins: 0,
      pillsCount: 0,
      lastSpawn: 0,
      lastObstacle: 0,
      spawnRate: 750,
      obstacleRate: 1500,
    };
    $('runnerCoins').textContent = '0';
    $('runnerPills').textContent = '0';
  }

  function spawnPill() {
    const laneW = W / 3;
    const lane = Math.floor(Math.random() * 3);
    game.pills.push({
      x: laneW * lane + laneW / 2,
      y: -30,
      r: 14,
    });
  }

  function spawnObstacle() {
    const laneW = W / 3;
    const lane = Math.floor(Math.random() * 3);
    game.obstacles.push({
      x: laneW * lane + laneW / 2,
      y: -40,
      size: 36,
    });
  }

  function loop(ts) {
    if (!running) return;
    const dt = 16;
    game.t += dt;
    game.speed = 5 + Math.min(8, game.t / 8000);

    // Player follows lane
    const laneW = W / 3;
    game.targetX = laneW * game.lane + laneW / 2;
    game.x += (game.targetX - game.x) * 0.22;

    // Spawns
    game.lastSpawn += dt;
    if (game.lastSpawn > game.spawnRate) {
      game.lastSpawn = 0;
      spawnPill();
      if (Math.random() < 0.3) spawnPill();
    }
    game.lastObstacle += dt;
    if (game.lastObstacle > game.obstacleRate) {
      game.lastObstacle = 0;
      spawnObstacle();
      game.obstacleRate = Math.max(700, game.obstacleRate - 30);
    }

    // Update pills
    for (let i = game.pills.length - 1; i >= 0; i--) {
      const p = game.pills[i];
      p.y += game.speed + 2;
      if (Math.abs(p.y - game.playerY) < 32 && Math.abs(p.x - game.x) < 40) {
        game.pillsCount++;
        game.coins += 2;
        game.pills.splice(i, 1);
        sound.pop(); haptic(15);
        $('runnerCoins').textContent = game.coins;
        $('runnerPills').textContent = game.pillsCount;
        continue;
      }
      if (p.y > H + 30) game.pills.splice(i, 1);
    }

    // Update obstacles
    for (let i = game.obstacles.length - 1; i >= 0; i--) {
      const o = game.obstacles[i];
      o.y += game.speed + 2;
      if (Math.abs(o.y - game.playerY) < 40 && Math.abs(o.x - game.x) < 42) {
        endGame();
        return;
      }
      if (o.y > H + 50) game.obstacles.splice(i, 1);
    }

    draw();
    raf = requestAnimationFrame(loop);
  }

  function draw() {
    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#87ceeb');
    sky.addColorStop(0.7, '#b8e6c8');
    sky.addColorStop(1, '#7fc99a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Road
    ctx.fillStyle = '#3d5a4a';
    ctx.fillRect(0, H - 100, W, 100);
    ctx.fillStyle = '#f4faf7';
    const off = (game.t * 0.4) % 60;
    for (let x = -60 + off; x < W + 60; x += 60) ctx.fillRect(x, H - 54, 30, 5);

    // Lane dividers
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.setLineDash([10, 15]);
    ctx.lineWidth = 2;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(W / 3 * i, H - 100);
      ctx.lineTo(W / 3 * i, H);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Pills
    ctx.font = '26px sans-serif';
    ctx.textAlign = 'center';
    game.pills.forEach(p => {
      ctx.fillText('💊', p.x, p.y + 8);
    });

    // Obstacles
    game.obstacles.forEach(o => {
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '22px sans-serif';
      ctx.fillText('⚡', o.x, o.y + 8);
    });

    // Player
    ctx.font = '52px sans-serif';
    ctx.fillText('🏃', game.x, game.playerY + 14);
  }

  function endGame() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    sound.lose();
    haptic([200, 100, 200]);
    app.setHighscore('runner', game.coins);
    app.addCoins(game.coins);
    state.totalPills += 0; // games don't affect treatment
    save();
    $('runnerFinalScore').textContent = game.coins;
    $('runnerFinalPills').textContent = game.pillsCount;
    $('runnerOver').classList.add('game-overlay--active');
    checkAchievements();
  }

  function moveLane(dir) {
    if (!running || !game) return;
    game.lane = Math.max(0, Math.min(2, game.lane + dir));
    sound.tap();
    haptic(10);
  }

  function bindControls() {
    const shell = document.querySelector('#sc-game-runner .game-shell');
    shell.addEventListener('touchstart', e => {
      if (!running) return;
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    shell.addEventListener('touchend', e => {
      if (!running) return;
      const endX = e.changedTouches[0].clientX;
      if (endX < W / 2) moveLane(-1);
      else moveLane(1);
    }, { passive: true });
    shell.addEventListener('click', e => {
      if (!running) return;
      const rect = canvas.getBoundingClientRect();
      if ((e.clientX - rect.left) < rect.width / 2) moveLane(-1);
      else moveLane(1);
    });
    document.addEventListener('keydown', e => {
      if (!running) return;
      if (e.key === 'ArrowLeft') moveLane(-1);
      if (e.key === 'ArrowRight') moveLane(1);
    });
  }

  return {
    enter() {
      canvas = $('runnerCanvas');
      ctx = canvas.getContext('2d');
      setTimeout(resize, 50);
      window.addEventListener('resize', resize);
      if (!Runner._bound) { bindControls(); Runner._bound = true; }
    },
    start() {
      $('runnerStart').classList.remove('game-overlay--active');
      $('runnerOver').classList.remove('game-overlay--active');
      resize();
      initGame();
      running = true;
      raf = requestAnimationFrame(loop);
      sound.win();
    },
    stopAndGoHome() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      nav.go('home');
    },
  };
})();

/* ============================================================
   GAME 2: PILL MATCH (Match-3)
   ============================================================ */
const Match3 = (() => {
  const COLS = 8, ROWS = 8;
  const ICONS = ['💊','🟢','🔴','🟡','🔵','🟣'];
  let grid = [];
  let selected = null;
  let score = 0;
  let moves = 0;
  let busy = false;

  function newGrid() {
    grid = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        row.push(Math.floor(Math.random() * ICONS.length));
      }
      grid.push(row);
    }
    // Remove initial matches
    let safety = 20;
    while (findMatches().length > 0 && safety-- > 0) {
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        if (Math.random() < 0.4) grid[r][c] = Math.floor(Math.random() * ICONS.length);
      }
    }
  }

  function findMatches() {
    const matches = new Set();
    // Horizontal
    for (let r = 0; r < ROWS; r++) {
      let run = 1;
      for (let c = 1; c <= COLS; c++) {
        if (c < COLS && grid[r][c] === grid[r][c - 1]) run++;
        else {
          if (run >= 3) for (let k = c - run; k < c; k++) matches.add(r + ',' + k);
          run = 1;
        }
      }
    }
    // Vertical
    for (let c = 0; c < COLS; c++) {
      let run = 1;
      for (let r = 1; r <= ROWS; r++) {
        if (r < ROWS && grid[r][c] === grid[r - 1][c]) run++;
        else {
          if (run >= 3) for (let k = r - run; k < r; k++) matches.add(k + ',' + c);
          run = 1;
        }
      }
    }
    return [...matches].map(s => s.split(',').map(Number));
  }

  function draw() {
    const wrap = $('matchGrid');
    wrap.innerHTML = '';
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const el = document.createElement('div');
      el.className = 'match-tile';
      el.style.background = tileBg(grid[r][c]);
      el.textContent = ICONS[grid[r][c]];
      el.dataset.r = r; el.dataset.c = c;
      el.onclick = () => handleClick(r, c);
      if (selected && selected.r === r && selected.c === c) el.classList.add('selected');
      wrap.appendChild(el);
    }
    $('matchScore').textContent = score;
    $('matchMoves').textContent = moves;
  }

  function tileBg(v) {
    return [
      '#fff5e6','#e6f5e6','#fde8e8','#fef9e7','#e6f0fb','#f3e8fb',
    ][v % 6];
  }

  function handleClick(r, c) {
    if (busy) return;
    if (!selected) {
      selected = { r, c };
      draw();
      sound.tap();
      return;
    }
    const dr = Math.abs(selected.r - r), dc = Math.abs(selected.c - c);
    if (dr + dc !== 1) {
      selected = { r, c };
      draw();
      return;
    }
    // Swap
    const a = selected, b = { r, c };
    [grid[a.r][a.c], grid[b.r][b.c]] = [grid[b.r][b.c], grid[a.r][a.c]];
    selected = null;
    const matches = findMatches();
    if (matches.length === 0) {
      // Swap back
      [grid[a.r][a.c], grid[b.r][b.c]] = [grid[b.r][b.c], grid[a.r][a.c]];
      sound.error();
      draw();
      return;
    }
    moves++;
    sound.tap();
    draw();
    resolveMatches();
  }

  function resolveMatches() {
    busy = true;
    const matches = findMatches();
    if (matches.length === 0) {
      busy = false;
      return;
    }
    // Pop animation
    matches.forEach(([r, c]) => {
      const idx = r * COLS + c;
      const el = $('matchGrid').children[idx];
      if (el) el.classList.add('pop');
    });
    sound.pop(); haptic(15);
    score += matches.length * 10;
    // After animation, drop
    setTimeout(() => {
      matches.forEach(([r, c]) => { grid[r][c] = -1; });
      // Gravity
      for (let c = 0; c < COLS; c++) {
        const col = [];
        for (let r = ROWS - 1; r >= 0; r--) if (grid[r][c] !== -1) col.push(grid[r][c]);
        while (col.length < ROWS) col.push(Math.floor(Math.random() * ICONS.length));
        for (let r = ROWS - 1, i = 0; r >= 0; r--, i++) grid[r][c] = col[i];
      }
      draw();
      resolveMatches();
    }, 320);
  }

  return {
    enter() { Match3.restart(); },
    restart() {
      newGrid();
      selected = null; score = 0; moves = 0; busy = false;
      draw();
      sound.tap();
    },
    hint() {
      if (state.coins < 5) return ui.toast('Need 5 coins');
      app.addCoins(-5);
      // Find any valid swap
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const dirs = [[0,1],[1,0]];
        for (const [dr, dc] of dirs) {
          const r2 = r + dr, c2 = c + dc;
          if (r2 >= ROWS || c2 >= COLS) continue;
          [grid[r][c], grid[r2][c2]] = [grid[r2][c2], grid[r][c]];
          const ok = findMatches().length > 0;
          [grid[r][c], grid[r2][c2]] = [grid[r2][c2], grid[r][c]];
          if (ok) {
            ui.toast(`Try swapping (${r+1},${c+1})`);
            return;
          }
        }
      }
    },
  };
})();

/* ============================================================
   GAME 3: MEMORY CARDS
   ============================================================ */
const Memory = (() => {
  const ICONS = ['💊','🏥','💉','🩺','🫀','🧬','🩹','🦠'];
  let cards = [];
  let flipped = [];
  let matched = 0;
  let moves = 0;
  let score = 0;
  let timer = null;
  let seconds = 0;
  let locked = false;

  function init() {
    cards = [...ICONS, ...ICONS]
      .map((ic, i) => ({ id: i, icon: ic, flipped: false, matched: false }))
      .sort(() => Math.random() - 0.5);
    flipped = []; matched = 0; moves = 0; score = 0; seconds = 0; locked = false;
    clearInterval(timer);
    timer = setInterval(() => {
      seconds++;
      const m = Math.floor(seconds / 60);
      const s = String(seconds % 60).padStart(2, '0');
      $('memTime').textContent = `${m}:${s}`;
    }, 1000);
    $('memTime').textContent = '0:00';
    $('memScore').textContent = '0';
    $('memMoves').textContent = '0';
    $('memPairs').textContent = '0';
    draw();
  }

  function draw() {
    const wrap = $('memoryGrid');
    wrap.innerHTML = '';
    cards.forEach((c, i) => {
      const el = document.createElement('div');
      el.className = 'memory-card' + (c.flipped || c.matched ? ' flipped' : '') + (c.matched ? ' matched' : '');
      el.innerHTML = `
        <div class="memory-card__front">${c.matched ? '✓' : '?'}</div>
        <div class="memory-card__back">${c.icon}</div>
      `;
      el.onclick = () => handleClick(i);
      wrap.appendChild(el);
    });
  }

  function handleClick(i) {
    if (locked) return;
    const c = cards[i];
    if (c.flipped || c.matched) return;
    if (flipped.length >= 2) return;
    c.flipped = true;
    flipped.push(i);
    sound.tap(); haptic(10);
    draw();

    if (flipped.length === 2) {
      moves++;
      $('memMoves').textContent = moves;
      const [a, b] = flipped;
      if (cards[a].icon === cards[b].icon) {
        cards[a].matched = cards[b].matched = true;
        matched++;
        score += 10;
        $('memPairs').textContent = matched;
        $('memScore').textContent = score;
        sound.coin();
        flipped = [];
        draw();
        if (matched === ICONS.length) finish();
      } else {
        locked = true;
        setTimeout(() => {
          cards[a].flipped = cards[b].flipped = false;
          flipped = []; locked = false;
          draw();
        }, 800);
      }
    }
  }

  function finish() {
    clearInterval(timer);
    const bonus = Math.max(0, 100 - seconds);
    score += bonus;
    $('memScore').textContent = score;
    app.setHighscore('memory', score);
    app.addCoins(Math.floor(score / 2));
    sound.win(); haptic([100, 50, 100, 50]);
    checkAchievements();
    setTimeout(() => {
      ui.modal('🎉', 'You won!', `Time: ${seconds}s · Bonus: +${bonus} · Score: ${score}`);
    }, 400);
  }

  return {
    enter() { Memory.restart(); },
    restart() { init(); },
  };
})();

/* ============================================================
   GAME 4: TB QUIZ
   ============================================================ */
const Quiz = (() => {
  const QUESTIONS = [
    { q: 'How long does TB treatment usually last?', a: ['1 week','6 months','1 year','3 days'], correct: 1, exp: 'TB treatment lasts about 6 months (180 days).' },
    { q: 'What should you do if you miss a pill?', a: ['Skip it','Double the next dose','Tell your parent/nurse','Stop all pills'], correct: 2, exp: 'Always tell a trusted adult or your nurse.' },
    { q: 'Which drink is best with TB pills?', a: ['Soda','Water','Energy drink','Coffee'], correct: 1, exp: 'Water is always the best choice.' },
    { q: 'What color might your pee turn on TB pills?', a: ['Blue','Orange/red','Green','Purple'], correct: 1, exp: 'Rifampicin turns pee orange-red. This is normal!' },
    { q: 'Why must you finish ALL TB treatment?', a: ['To get a sticker','To prevent drug resistance','Because it tastes nice','To please the nurse'], correct: 1, exp: 'Stopping early lets TB become stronger and harder to cure.' },
    { q: 'Can TB be cured?', a: ['No, never','Yes, with medicine','Only in adults','Only with surgery'], correct: 1, exp: 'Yes! TB is curable with full treatment.' },
    { q: 'How does TB spread?', a: ['Through food','Through the air','By touching','Through water'], correct: 1, exp: 'TB spreads through the air when someone coughs or sneezes.' },
    { q: 'When should you take your pills?', a: ['Only when sick','Every day at the same time','Once a week','When you remember'], correct: 1, exp: 'Take them every day at the same times.' },
    { q: 'What food helps your body fight TB?', a: ['Only sweets','Healthy food & veggies','Only meat','Only fruit'], correct: 1, exp: 'A balanced diet helps your body heal.' },
    { q: 'Who can you talk to about TB worries?', a: ['Nobody','Your nurse or parent','Only friends','Only the internet'], correct: 1, exp: 'Your nurse, doctor, and parents are there to help.' },
  ];

  let idx = 0, correctCount = 0, locked = false;

  function start() {
    idx = 0; correctCount = 0; locked = false;
    $('quizScore').textContent = '0';
    $('quizQNum').textContent = '1';
    showQuestion();
  }

  function showQuestion() {
    if (idx >= QUESTIONS.length) {
      finish();
      return;
    }
    const q = QUESTIONS[idx];
    $('quizNumText').textContent = idx + 1;
    $('quizQ').textContent = q.q;
    $('quizBar').style.width = ((idx / QUESTIONS.length) * 100) + '%';
    $('quizFeedback').textContent = '';

    const opts = $('quizOptions');
    opts.innerHTML = '';
    q.a.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt';
      btn.innerHTML = `<span class="letter">${String.fromCharCode(65 + i)}</span><span>${opt}</span>`;
      btn.onclick = () => answer(i, btn);
      opts.appendChild(btn);
    });
  }

  function answer(i, btn) {
    if (locked) return;
    locked = true;
    const q = QUESTIONS[idx];
    const opts = document.querySelectorAll('.quiz-opt');
    opts.forEach(o => o.onclick = null);

    if (i === q.correct) {
      btn.classList.add('correct');
      correctCount++;
      sound.coin(); haptic(20);
      $('quizScore').textContent = correctCount * 3;
      $('quizFeedback').textContent = '✅ ' + q.exp;
    } else {
      btn.classList.add('wrong');
      if (opts[q.correct]) opts[q.correct].classList.add('correct');
      sound.error();
      $('quizFeedback').textContent = '❌ ' + q.exp;
    }
    setTimeout(() => {
      idx++;
      $('quizQNum').textContent = idx + 1;
      locked = false;
      showQuestion();
    }, 1600);
  }

  function finish() {
    $('quizBar').style.width = '100%';
    const score = correctCount * 3;
    app.setHighscore('quiz', correctCount);
    app.addCoins(score);
    sound.win();
    checkAchievements();
    const msg = correctCount >= 8 ? 'Amazing!' : correctCount >= 5 ? 'Well done!' : 'Keep learning!';
    ui.modal('🏆', 'Quiz Complete!', `${msg} You got ${correctCount}/${QUESTIONS.length}. +${score} coins!`);
  }

  return {
    enter() { start(); },
  };
})();

// Export for HTML onclick handlers
window.Runner = Runner;
window.Match3 = Match3;
window.Memory = Memory;
window.Quiz = Quiz;
window.nav = window.__philigo.nav;
window.ui = window.__philigo.ui;
window.Parent = window.__philigo.Parent || Parent;
