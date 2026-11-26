/* ============================================================
   PHILIGO (PHILI+) — 15 Mini-Games (4 Dedicated + 11 Arena Games)
   ============================================================ */
(function () {
  'use strict';

  const P = window.__philigo;
  const state = P.state;
  const save = P.save;
  const ui = P.ui;
  const sound = P.sound;
  const haptic = P.haptic;
  const app = P.app;
  const checkAchievements = P.checkAchievements;
  const nav = P.nav;
  const $ = P.$;

  /* ============================================================
     GAME 1: PILL RUNNER
     ============================================================ */
  const Runner = (() => {
    let canvas, ctx, running = false, raf = null, W = 0, H = 0, game, bound = false;

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
        t: 0, speed: 5, lane: 1, x: W / 2, targetX: W / 2, playerY: H - 110,
        pills: [], obstacles: [], coins: 0, pillsCount: 0, lastSpawn: 0, lastObstacle: 0,
      };
      $('runnerCoins').textContent = '0';
      $('runnerPills').textContent = '0';
    }

    function loop() {
      if (!running) return;
      const dt = 16;
      game.t += dt;
      game.speed = 5 + Math.min(7, game.t / 9000);
      const laneW = W / 3;
      game.targetX = laneW * game.lane + laneW / 2;
      game.x += (game.targetX - game.x) * 0.22;

      game.lastSpawn += dt;
      if (game.lastSpawn > 750) {
        game.lastSpawn = 0;
        const lane = Math.floor(Math.random() * 3);
        game.pills.push({ x: laneW * lane + laneW / 2, y: -30 });
      }
      game.lastObstacle += dt;
      if (game.lastObstacle > 1450) {
        game.lastObstacle = 0;
        const lane = Math.floor(Math.random() * 3);
        game.obstacles.push({ x: laneW * lane + laneW / 2, y: -40 });
      }

      for (let i = game.pills.length - 1; i >= 0; i--) {
        const p = game.pills[i];
        p.y += game.speed + 2;
        if (Math.abs(p.y - game.playerY) < 32 && Math.abs(p.x - game.x) < 40) {
          game.pillsCount++;
          game.coins += 2;
          game.pills.splice(i, 1);
          sound.pop();
          $('runnerCoins').textContent = game.coins;
          $('runnerPills').textContent = game.pillsCount;
          continue;
        }
        if (p.y > H + 30) game.pills.splice(i, 1);
      }

      for (let i = game.obstacles.length - 1; i >= 0; i--) {
        const o = game.obstacles[i];
        o.y += game.speed + 2;
        if (Math.abs(o.y - game.playerY) < 38 && Math.abs(o.x - game.x) < 40) {
          endGame();
          return;
        }
        if (o.y > H + 40) game.obstacles.splice(i, 1);
      }

      ctx.fillStyle = '#a8e6cf';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#3d5a4a';
      ctx.fillRect(0, H - 90, W, 90);
      ctx.font = '26px sans-serif';
      ctx.textAlign = 'center';
      game.pills.forEach(p => ctx.fillText('💊', p.x, p.y + 8));
      game.obstacles.forEach(o => ctx.fillText('🦠', o.x, o.y + 8));
      ctx.font = '48px sans-serif';
      ctx.fillText(state.user.avatar || '🏃', game.x, game.playerY + 12);

      raf = requestAnimationFrame(loop);
    }

    function endGame() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      sound.lose();
      app.setHighscore('runner', game.coins);
      app.addCoins(game.coins);
      $('runnerFinalScore').textContent = game.coins;
      $('runnerFinalPills').textContent = game.pillsCount;
      $('runnerOver').classList.add('game-overlay--active');
      checkAchievements();
    }

    function moveLane(dir) {
      if (!running || !game) return;
      game.lane = Math.max(0, Math.min(2, game.lane + dir));
      sound.tap();
    }

    return {
      enter() {
        canvas = $('runnerCanvas');
        ctx = canvas.getContext('2d');
        setTimeout(resize, 50);
        if (!bound) {
          const shell = document.querySelector('#sc-game-runner .game-shell');
          shell.addEventListener('click', e => {
            if (!running) return;
            const rect = canvas.getBoundingClientRect();
            moveLane((e.clientX - rect.left) < rect.width / 2 ? -1 : 1);
          });
          document.addEventListener('keydown', e => {
            if (!running) return;
            if (e.key === 'ArrowLeft') moveLane(-1);
            if (e.key === 'ArrowRight') moveLane(1);
          });
          bound = true;
        }
      },
      start() {
        $('runnerStart').classList.remove('game-overlay--active');
        $('runnerOver').classList.remove('game-overlay--active');
        resize();
        initGame();
        running = true;
        raf = requestAnimationFrame(loop);
      },
      stopAndGoHome() {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        nav.go('home');
      },
    };
  })();

  /* ============================================================
     GAME 2: PILL MATCH (MATCH-3)
     ============================================================ */
  const Match3 = (() => {
    const COLS = 8, ROWS = 8;
    const ICONS = ['💊', '💨', '🧴', '💧', '🥗', '🛡️'];
    let grid = [], selected = null, score = 0, moves = 0;

    function newGrid() {
      grid = Array.from({ length: ROWS }, () =>
        Array.from({ length: COLS }, () => Math.floor(Math.random() * ICONS.length))
      );
    }

    function findMatches() {
      const m = new Set();
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS - 2; c++) {
          if (grid[r][c] === grid[r][c + 1] && grid[r][c] === grid[r][c + 2]) {
            m.add(`${r},${c}`); m.add(`${r},${c + 1}`); m.add(`${r},${c + 2}`);
          }
        }
      }
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS - 2; r++) {
          if (grid[r][c] === grid[r + 1][c] && grid[r][c] === grid[r + 2][c]) {
            m.add(`${r},${c}`); m.add(`${r + 1},${c}`); m.add(`${r + 2},${c}`);
          }
        }
      }
      return [...m].map(s => s.split(',').map(Number));
    }

    function draw() {
      const wrap = $('matchGrid');
      wrap.innerHTML = '';
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const el = document.createElement('div');
          el.className = 'match-tile' + (selected && selected.r === r && selected.c === c ? ' selected' : '');
          el.textContent = ICONS[grid[r][c]];
          el.onclick = () => {
            if (!selected) { selected = { r, c }; draw(); return; }
            if (Math.abs(selected.r - r) + Math.abs(selected.c - c) !== 1) { selected = { r, c }; draw(); return; }
            [grid[selected.r][selected.c], grid[r][c]] = [grid[r][c], grid[selected.r][selected.c]];
            selected = null;
            const matches = findMatches();
            if (matches.length) {
              moves++;
              score += matches.length * 10;
              matches.forEach(([mr, mc]) => { grid[mr][mc] = Math.floor(Math.random() * ICONS.length); });
              app.setHighscore('match', score);
              app.addCoins(2);
              sound.pop();
            } else {
              sound.error();
            }
            draw();
          };
          wrap.appendChild(el);
        }
      }
      $('matchScore').textContent = score;
      $('matchMoves').textContent = moves;
    }

    return {
      enter() { Match3.restart(); },
      restart() { newGrid(); selected = null; score = 0; moves = 0; draw(); },
      hint() {
        if (state.coins < 5) return ui.toast('Need 5 coins');
        app.addCoins(-5);
        ui.toast('💡 Match any 3 identical health icons in a row!');
      },
    };
  })();

  /* ============================================================
     GAME 3: MEMORY CARDS
     ============================================================ */
  const Memory = (() => {
    const ICONS = ['💊', '💨', '🧴', '🩺', '🫀', '💧', '🥗', '🛡️'];
    let cards = [], flipped = [], matched = 0, moves = 0, score = 0;

    function init() {
      cards = [...ICONS, ...ICONS]
        .map((icon, id) => ({ id, icon, flipped: false, matched: false }))
        .sort(() => Math.random() - 0.5);
      flipped = []; matched = 0; moves = 0; score = 0;
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
        el.innerHTML = `<div class="memory-card__front">?</div><div class="memory-card__back">${c.icon}</div>`;
        el.onclick = () => {
          if (c.flipped || c.matched || flipped.length >= 2) return;
          c.flipped = true;
          flipped.push(i);
          draw();
          if (flipped.length === 2) {
            moves++;
            $('memMoves').textContent = moves;
            const [a, b] = flipped;
            if (cards[a].icon === cards[b].icon) {
              cards[a].matched = cards[b].matched = true;
              matched++; score += 10;
              $('memPairs').textContent = matched;
              $('memScore').textContent = score;
              flipped = [];
              sound.coin();
              draw();
              if (matched === ICONS.length) {
                app.setHighscore('memory', score);
                app.addCoins(10);
                ui.modal('🎉', 'Memory Complete!', `All pairs matched! +10 stars`);
              }
            } else {
              setTimeout(() => {
                cards[a].flipped = cards[b].flipped = false;
                flipped = [];
                draw();
              }, 650);
            }
          }
        };
        wrap.appendChild(el);
      });
    }

    return { enter() { init(); }, restart() { init(); } };
  })();

  /* ============================================================
     GAME 4: HEALTH & STG QUIZ
     ============================================================ */
  const Quiz = (() => {
    const QUESTIONS = [
      { q: 'Why must you finish the full prescribed course of medicine?', a: ['To stop symptoms only', 'To cure the infection & prevent resistance', 'Because pills expire', 'Only when tired'], correct: 1, exp: 'Stopping early allows germs to survive and become resistant.' },
      { q: 'What is the best liquid to take with oral tablets?', a: ['Clean water', 'Fizzy soda', 'Coffee', 'Energy drink'], correct: 0, exp: 'Clean water safely dissolves and carries medicine.' },
      { q: 'When using a reliever inhaler with a spacer, how should you breathe?', a: ['Fast shallow gasps', '5 slow deep breaths after actuating', 'Hold breath for 1 second', 'Blow into the canister'], correct: 1, exp: 'Slow breaths through a spacer help medicine reach the lungs.' },
      { q: 'Which sign requires urgent clinic attention?', a: ['Feeling hungry', 'Yellow eyes/skin or trouble breathing', 'Wanting to play', 'Normal sleep'], correct: 1, exp: 'Jaundice or breathing distress are danger signs in Eswatini STGs.' },
      { q: 'What harmless change can Rifampicin cause?', a: ['Orange/red urine or tears', 'Blue hair', 'Green fingernails', 'Purple tongue'], correct: 0, exp: 'Orange-red urine is normal and expected with Rifampicin.' },
    ];
    let idx = 0, correctCount = 0;

    function show() {
      if (idx >= QUESTIONS.length) {
        const pts = correctCount * 4;
        app.setHighscore('quiz', correctCount * 2);
        app.addCoins(pts);
        ui.modal('🏆', 'Quiz Finished!', `Score: ${correctCount}/${QUESTIONS.length} · +${pts} stars`);
        return;
      }
      const q = QUESTIONS[idx];
      $('quizQNum').textContent = idx + 1;
      $('quizNumText').textContent = idx + 1;
      $('quizQ').textContent = q.q;
      $('quizBar').style.width = `${(idx / QUESTIONS.length) * 100}%`;
      $('quizFeedback').textContent = '';
      const opts = $('quizOptions');
      opts.innerHTML = '';
      q.a.forEach((opt, i) => {
        const b = document.createElement('button');
        b.className = 'quiz-opt';
        b.innerHTML = `<span class="letter">${String.fromCharCode(65 + i)}</span><span>${opt}</span>`;
        b.onclick = () => {
          if (i === q.correct) {
            b.classList.add('correct');
            correctCount++;
            $('quizScore').textContent = correctCount * 4;
            $('quizFeedback').textContent = '✅ ' + q.exp;
            sound.coin();
          } else {
            b.classList.add('wrong');
            $('quizFeedback').textContent = '❌ ' + q.exp;
            sound.error();
          }
          setTimeout(() => { idx++; show(); }, 1300);
        };
        opts.appendChild(b);
      });
    }

    return { enter() { idx = 0; correctCount = 0; $('quizScore').textContent = '0'; show(); } };
  })();

  /* ============================================================
     GAMES 5–15: INTERACTIVE MINI-GAME ARENA
     ============================================================ */
  const Arena = (() => {
    let score = 0;
    let interval = null;

    function addArenaPts(pts, msg) {
      score += pts;
      $('arenaScore').textContent = score;
      app.addCoins(pts);
      sound.coin();
      if (msg) ui.toast(msg);
    }

    function launch(gameObj) {
      clearInterval(interval);
      score = 0;
      $('arenaTitleChip').textContent = `${gameObj.ico} ${gameObj.name}`;
      $('arenaScore').textContent = '0';
      nav.go('game-arena');
      const body = $('arenaBody');

      if (gameObj.id === 'pacer') {
        body.innerHTML = `
          <div class="arena-card">
            <h3>🫁 Inhaler Breath Pacer</h3>
            <p class="muted-small">Follow the circle: Inhale slowly for 3s, hold, exhale calmly.</p>
            <div class="breath-circle" id="breathOrb">Breathe In</div>
            <button class="btn btn--primary btn--full" onclick="Arena.cycleBreath()">Complete Calm Cycle (+3⭐)</button>
          </div>`;
      } else if (gameObj.id === 'germ') {
        body.innerHTML = `
          <div class="arena-card">
            <h3>🦠 Germ Blaster</h3>
            <p class="muted-small">Tap the germs to clear the airway and earn stars!</p>
            <div class="arena-choices" id="germGrid"></div>
          </div>`;
        Arena.renderGerms();
      } else if (gameObj.id === 'syrup') {
        body.innerHTML = `
          <div class="arena-card">
            <h3>🧪 Exact Syrup Measure</h3>
            <p class="muted-small">Clinician prescribed <strong>5 mL</strong> using an oral syringe. Pick the exact measurement:</p>
            <div class="arena-choices">
              <button class="btn btn--ghost" onclick="ui.toast('Too low — underdosing!')">2.5 mL</button>
              <button class="btn btn--primary" onclick="Arena.winChallenge(5,'✅ Exact 5 mL oral syringe dose!')">5.0 mL</button>
              <button class="btn btn--ghost" onclick="ui.toast('Never guess with a kitchen spoon!')">1 Soup Spoon</button>
              <button class="btn btn--ghost" onclick="ui.toast('Too high!')">10 mL</button>
            </div>
          </div>`;
      } else if (gameObj.id === 'symptom') {
        body.innerHTML = `
          <div class="arena-card">
            <h3>🩺 Symptom Scout</h3>
            <p class="muted-small">Which symptom means you should alert a caregiver/clinic immediately?</p>
            <div class="arena-choices">
              <button class="btn btn--primary" onclick="Arena.winChallenge(5,'✅ Correct! Yellow eyes or breathing trouble needs urgent care.')">Yellow eyes / Fast breathing</button>
              <button class="btn btn--ghost" onclick="ui.toast('Try again — that is normal.')">Feeling hungry</button>
              <button class="btn btn--ghost" onclick="ui.toast('Orange urine is harmless with Rifampicin.')">Orange-tinted urine</button>
              <button class="btn btn--ghost" onclick="ui.toast('Try again')">Mild yawn</button>
            </div>
          </div>`;
      } else if (gameObj.id === 'scramble') {
        body.innerHTML = `
          <div class="arena-card">
            <h3>🔤 Med Word Decode</h3>
            <p class="muted-small">Unscramble this key treatment word: <strong>H E A D E R N E C</strong></p>
            <div class="arena-choices">
              <button class="btn btn--primary" onclick="Arena.winChallenge(6,'🎉 ADHERENCE decoded!')">ADHERENCE</button>
              <button class="btn btn--ghost" onclick="ui.toast('Not quite — try again!')">MEDICINE</button>
            </div>
          </div>`;
      } else {
        // Unified interactive skill challenge for Clock, Shield, Water Catch, Healthy Plate, Clinic Path, Pulse Tap
        const prompts = {
          clock: { q: 'Best daily anchor for morning & evening doses?', ok: 'Breakfast & Bedtime', bad: 'Only when coughing' },
          shield: { q: 'What keeps your immunity shield strong?', ok: 'Daily doses + Balanced meals', bad: 'Skipping weekends' },
          catch: { q: 'Best drink to swallow tablets safely?', ok: 'Clean Water 💧', bad: 'Sugary Energy Drink' },
          plate: { q: 'Choose the best recovery meal combo:', ok: 'Beans, Greens & Pap 🥗', bad: 'Only Candy' },
          maze: { q: 'Clinic appointment day arrives. What do you bring?', ok: 'Health Card & Medicine Pack', bad: 'Nothing at all' },
          rhythm: { q: 'Tap steady treatment consistency:', ok: 'Same Time Every Day 🥁', bad: 'Random Hours' },
        };
        const item = prompts[gameObj.id] || prompts.clock;
        body.innerHTML = `
          <div class="arena-card">
            <h3>${gameObj.ico} ${gameObj.name}</h3>
            <p class="muted-small">${item.q}</p>
            <div class="arena-choices">
              <button class="btn btn--primary" onclick="Arena.winChallenge(4,'🌟 Great health choice!')">${item.ok}</button>
              <button class="btn btn--ghost" onclick="ui.toast('Not recommended — try the safer choice!')">${item.bad}</button>
            </div>
          </div>`;
      }
    }

    return {
      launch,
      cycleBreath() {
        const orb = $('breathOrb');
        if (!orb) return;
        orb.classList.add('expand');
        orb.textContent = 'Hold & Exhale...';
        setTimeout(() => {
          if ($('breathOrb')) {
            $('breathOrb').classList.remove('expand');
            $('breathOrb').textContent = 'Breathe In';
          }
          addArenaPts(3, '🫁 Calm breath cycle complete! +3 stars');
        }, 2200);
      },
      renderGerms() {
        const g = $('germGrid');
        if (!g) return;
        g.innerHTML = '';
        for (let i = 0; i < 6; i++) {
          const isGerm = Math.random() > 0.35;
          const b = document.createElement('button');
          b.className = 'btn ' + (isGerm ? 'btn--primary' : 'btn--ghost');
          b.textContent = isGerm ? '🦠 Zap!' : '💊 Safe';
          b.onclick = () => {
            if (isGerm) {
              addArenaPts(2);
              Arena.renderGerms();
            } else {
              ui.toast('Keep your medicine safe — only zap germs!');
            }
          };
          g.appendChild(b);
        }
      },
      winChallenge(pts, msg) {
        addArenaPts(pts, msg);
      },
      exit() {
        clearInterval(interval);
        nav.go('home');
      },
    };
  })();

  window.Runner = Runner;
  window.Match3 = Match3;
  window.Memory = Memory;
  window.Quiz = Quiz;
  window.Arena = Arena;
})();
