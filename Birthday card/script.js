/* =========================================================
   FOR YOU — a cinematic birthday experience
   Vanilla JS scene orchestration
   ========================================================= */
(() => {
  'use strict';

  /* ---------- small helpers ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const rand = (min, max) => Math.random() * (max - min) + min;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =========================================================
     SOUND — tiny Web Audio synthesized cues (no external files)
     ========================================================= */
  const Sound = (() => {
    let ctx = null;
    let muted = false;

    function getCtx() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) ctx = new AC();
      }
      return ctx;
    }

    function tone({ freq = 440, duration = 0.4, type = 'sine', gain = 0.08, delay = 0, glideTo = null }) {
      if (muted) return;
      const c = getCtx();
      if (!c) return;
      if (c.state === 'suspended') c.resume();
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, c.currentTime + delay);
      if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, c.currentTime + delay + duration);
      g.gain.setValueAtTime(0, c.currentTime + delay);
      g.gain.linearRampToValueAtTime(gain, c.currentTime + delay + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);
      osc.connect(g).connect(c.destination);
      osc.start(c.currentTime + delay);
      osc.stop(c.currentTime + delay + duration + 0.05);
    }

    return {
      click() { tone({ freq: 520, duration: 0.12, type: 'sine', gain: 0.05 }); },
      chime() {
        [660, 880, 1100].forEach((f, i) => tone({ freq: f, duration: 0.6, type: 'sine', gain: 0.05, delay: i * 0.12 }));
      },
      sparkle() {
        for (let i = 0; i < 5; i++) tone({ freq: rand(900, 1700), duration: 0.25, type: 'triangle', gain: 0.03, delay: i * 0.05 });
      },
      candleBlow() { tone({ freq: 300, duration: 0.5, type: 'sawtooth', gain: 0.04, glideTo: 60 }); },
      birthdayBurst() {
        [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, duration: 0.7, type: 'sine', gain: 0.06, delay: i * 0.15 }));
      },
      envelopeOpen() { tone({ freq: 200, duration: 0.4, type: 'triangle', gain: 0.04, glideTo: 500 }); },
      pageFlip() { tone({ freq: 700, duration: 0.15, type: 'sine', gain: 0.03 }); },
      firework() { tone({ freq: rand(200, 500), duration: 0.9, type: 'sine', gain: 0.05, glideTo: rand(900, 1400) }); },
      toggleMute(force) {
        muted = typeof force === 'boolean' ? force : !muted;
        return muted;
      },
      isMuted() { return muted; }
    };
  })();

  const soundToggle = $('#soundToggle');
  soundToggle.hidden = false;
  soundToggle.addEventListener('click', () => {
    const isMuted = Sound.toggleMute();
    soundToggle.classList.toggle('muted', isMuted);
  });

  /* =========================================================
     AMBIENT CANVAS — stars + fireflies, persistent across scenes
     ========================================================= */
  const bgCanvas = $('#bg-canvas');
  const bgCtx = bgCanvas.getContext('2d');
  let stars = [];
  let fireflies = [];
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resizeCanvas() {
    bgCanvas.width = window.innerWidth * dpr;
    bgCanvas.height = window.innerHeight * dpr;
    bgCanvas.style.width = window.innerWidth + 'px';
    bgCanvas.style.height = window.innerHeight + 'px';
    bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function initStars() {
    const count = window.innerWidth < 600 ? 60 : 120;
    stars = Array.from({ length: count }, () => ({
      x: rand(0, window.innerWidth),
      y: rand(0, window.innerHeight * 0.75),
      r: rand(0.6, 1.8),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.5, 1.5)
    }));
  }

  function initFireflies() {
    const count = window.innerWidth < 600 ? 10 : 18;
    fireflies = Array.from({ length: count }, () => ({
      x: rand(0, window.innerWidth),
      y: rand(window.innerHeight * 0.3, window.innerHeight),
      vx: rand(-0.25, 0.25),
      vy: rand(-0.2, 0.2),
      r: rand(1.5, 2.8),
      phase: rand(0, Math.PI * 2)
    }));
  }

  let currentScene = 'loading';
  function bgLoop(t) {
    bgCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    if (['loading', 'welcome', 'transition', 'cake', 'memories', 'letter'].includes(currentScene)) {
      stars.forEach(s => {
        const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(t / 900 * s.speed + s.phase));
        bgCtx.beginPath();
        bgCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        bgCtx.fillStyle = `rgba(255,249,235,${twinkle})`;
        bgCtx.fill();
      });
    }

    if (['cake', 'memories', 'letter', 'transition'].includes(currentScene)) {
      fireflies.forEach(f => {
        f.x += f.vx; f.y += f.vy;
        if (f.x < 0 || f.x > window.innerWidth) f.vx *= -1;
        if (f.y < 0 || f.y > window.innerHeight) f.vy *= -1;
        const glow = 0.5 + 0.5 * Math.sin(t / 500 + f.phase);
        const grad = bgCtx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 10);
        grad.addColorStop(0, `rgba(240,196,104,${0.8 * glow})`);
        grad.addColorStop(1, 'rgba(240,196,104,0)');
        bgCtx.fillStyle = grad;
        bgCtx.beginPath();
        bgCtx.arc(f.x, f.y, 10, 0, Math.PI * 2);
        bgCtx.fill();
        bgCtx.beginPath();
        bgCtx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        bgCtx.fillStyle = `rgba(255,240,200,${glow})`;
        bgCtx.fill();
      });
    }

    requestAnimationFrame(bgLoop);
  }

  resizeCanvas();
  initStars();
  initFireflies();
  window.addEventListener('resize', () => {
    resizeCanvas();
    initStars();
    initFireflies();
  });
  requestAnimationFrame(bgLoop);

  /* =========================================================
     SCENE MANAGER
     ========================================================= */
  const scenes = {
    loading: $('#scene-loading'),
    welcome: $('#scene-welcome'),
    transition: $('#scene-transition'),
    cake: $('#scene-cake'),
    memories: $('#scene-memories'),
    letter: $('#scene-letter'),
    final: $('#scene-final'),
    fireworks: $('#scene-fireworks')
  };

  const storyTrail = $('#storyTrail');
  const trailOrder = ['welcome', 'cake', 'memories', 'letter', 'final'];

  function updateTrail(sceneKey) {
    const idx = trailOrder.indexOf(sceneKey);
    if (idx === -1) return;
    $$('.trail-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === idx);
      dot.classList.toggle('done', i < idx);
    });
  }

  function goTo(sceneKey) {
    Object.entries(scenes).forEach(([key, el]) => {
      el.hidden = key !== sceneKey;
    });
    currentScene = sceneKey;
    if (trailOrder.includes(sceneKey)) {
      storyTrail.hidden = false;
      updateTrail(sceneKey);
    } else {
      storyTrail.hidden = sceneKey === 'loading';
    }
  }

  /* =========================================================
     1. LOADING SCREEN
     ========================================================= */
  function runLoading() {
    const fill = $('#loadingBarFill');
    const caption = $('#loadingCaption');
    const messages = [
      'Preparing something special…',
      'Gathering a few stars…',
      'Wrapping up the memories…',
      'Almost ready…'
    ];
    let progress = 0;
    let msgIndex = 0;
    caption.textContent = messages[0];

    const interval = setInterval(() => {
      progress += rand(6, 14);
      if (progress >= 100) {
        progress = 100;
        fill.style.width = '100%';
        clearInterval(interval);
        setTimeout(() => {
          scenes.loading.style.transition = 'opacity .6s ease';
          scenes.loading.style.opacity = '0';
          setTimeout(() => {
            scenes.loading.style.opacity = '';
            scenes.loading.style.transition = '';
            goTo('welcome');
          }, 600);
        }, 400);
        return;
      }
      fill.style.width = progress + '%';
      const newMsgIndex = Math.min(messages.length - 1, Math.floor(progress / 26));
      if (newMsgIndex !== msgIndex) {
        msgIndex = newMsgIndex;
        caption.textContent = messages[msgIndex];
      }
    }, 260);
  }

  /* =========================================================
     2. WELCOME SCREEN — YES / funny NO interaction
     ========================================================= */
  const yesBtn = $('#yesBtn');
  const noBtn = $('#noBtn');
  const noBtnLabel = $('#noBtnLabel');
  const noBtnEmoji = $('#noBtnEmoji');
  const noTaunt = $('#noTaunt');
  const welcomeButtons = $('#welcomeButtons');

  const taunts = [
    'So…',
    'You actually pressed NO?',
    'I spent hours making this. 🥺',
    'That hurts…',
    '…Just kidding 😂'
  ];
  let noPressCount = 0;

  function rippleEffect(btn) {
    btn.classList.remove('rippling');
    void btn.offsetWidth;
    btn.classList.add('rippling');
  }

  [yesBtn, noBtn].forEach(btn => btn.addEventListener('click', () => rippleEffect(btn)));

  function dodgeNoButton() {
    const rowRect = welcomeButtons.getBoundingClientRect();
    const btnRect = noBtn.getBoundingClientRect();
    const maxX = Math.max(40, rowRect.width - btnRect.width - 10);
    const dx = rand(-maxX / 1.6, maxX / 1.6);
    const dy = rand(-46, 46);
    noBtn.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  noBtn.addEventListener('mouseenter', () => {
    if (noPressCount < taunts.length - 1) {
      dodgeNoButton();
      Sound.sparkle();
    }
  });
  noBtn.addEventListener('touchstart', (e) => {
    if (noPressCount < taunts.length - 1) {
      e.preventDefault();
      dodgeNoButton();
      Sound.sparkle();
    }
  }, { passive: false });

  noBtn.addEventListener('click', () => {
    Sound.click();
    noPressCount++;

    if (noPressCount < taunts.length) {
      noTaunt.textContent = taunts[noPressCount - 1];
      noTaunt.style.animation = 'none';
      void noTaunt.offsetWidth;
      noTaunt.style.animation = 'fadeInOut 2s ease';
    }

    if (noPressCount >= taunts.length) {
      noBtn.style.transform = 'none';
      noBtnLabel.textContent = 'Fine… Show me';
      noBtnEmoji.textContent = '❤️';
      noBtn.classList.remove('btn-ghost');
      noBtn.classList.add('btn-primary');
      noBtn.id = 'showMeBtn';
      noBtn.removeEventListener('mouseenter', dodgeNoButton);
      noBtn.onclick = null;
      startJourney();
    } else {
      dodgeNoButton();
    }
  });

  yesBtn.addEventListener('click', () => {
    Sound.click();
    startJourney();
  });

  function startJourney() {
    Sound.chime();
    goTo('transition');
    runTransition(() => goTo('cake'));
  }

  /* =========================================================
     TRANSITION SCENE
     ========================================================= */
  function runTransition(next) {
    const container = $('#transitionFireflies');
    container.innerHTML = '';
    const count = 14;
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('span');
      dot.style.cssText = `
        position:absolute; width:5px; height:5px; border-radius:50%;
        background: var(--gold); box-shadow: 0 0 10px 4px rgba(240,196,104,.8);
        top:${rand(10, 90)}%; left:${rand(-10, 0)}%;
        animation: fireflyDrift ${rand(1.4, 2.4)}s ease-in ${rand(0, 0.6)}s forwards;
      `;
      container.appendChild(dot);
    }
    if (!document.getElementById('fireflyDriftStyle')) {
      const style = document.createElement('style');
      style.id = 'fireflyDriftStyle';
      style.textContent = `@keyframes fireflyDrift{ to{ left:110%; opacity:0; transform: translateY(${rand(-40,40)}px);} }`;
      document.head.appendChild(style);
    }
    setTimeout(() => { next(); }, prefersReducedMotion ? 200 : 2200);
  }

  /* =========================================================
     3. CAKE SCENE
     ========================================================= */
  const cakeButton = $('#cakeButton');
  const cakeEl = $('.cake');
  const cakeHint = $('#cakeHint');
  const confettiBurst = $('#confettiBurst');
  const cakeContinueBtn = $('#cakeContinueBtn');
  let cakeBlown = false;

  cakeButton.addEventListener('click', () => {
    if (cakeBlown) return;
    cakeBlown = true;
    cakeEl.classList.add('blown');
    cakeHint.textContent = 'happy birthday! 🎉';
    Sound.candleBlow();
    setTimeout(() => Sound.birthdayBurst(), 400);
    launchConfetti(confettiBurst, 60);
    setTimeout(() => { cakeContinueBtn.hidden = false; }, 900);
  });

  function launchConfetti(container, count) {
    const colors = ['#8B6BD8', '#F3A6C4', '#FFD3A8', '#F0C468', '#A8C5E8', '#FFF9F5'];
    for (let i = 0; i < count; i++) {
      const piece = document.createElement('span');
      piece.className = 'confetti-piece';
      const color = colors[Math.floor(rand(0, colors.length))];
      const isCircle = Math.random() > 0.5;
      piece.style.background = color;
      piece.style.borderRadius = isCircle ? '50%' : '2px';
      const angle = rand(0, Math.PI * 2);
      const distance = rand(80, 260);
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance - rand(40, 140);
      piece.style.setProperty('--dx', dx + 'px');
      piece.style.setProperty('--dy', dy + 'px');
      piece.animate([
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy + 260}px) rotate(${rand(180, 720)}deg)`, opacity: 0 }
      ], {
        duration: rand(1400, 2400),
        easing: 'cubic-bezier(.25,.7,.4,1)',
        fill: 'forwards',
        delay: rand(0, 200)
      });
      container.appendChild(piece);
      setTimeout(() => piece.remove(), 3000);
    }
  }

  cakeContinueBtn.addEventListener('click', () => {
    Sound.click();
    goTo('transition');
    runTransition(() => goTo('memories'));
  });

  /* =========================================================
     4. MEMORIES SCRAPBOOK
     ========================================================= */
  const pages = $$('.scrapbook-page');
  const pageDotsContainer = $('#pageDots');
  const prevPageBtn = $('#prevPage');
  const nextPageBtn = $('#nextPage');
  let pageIndex = 0;

  pages.forEach((_, i) => {
    const dot = document.createElement('span');
    if (i === 0) dot.classList.add('active');
    pageDotsContainer.appendChild(dot);
  });
  const dots = $$('span', pageDotsContainer);

  function renderPage(newIndex, direction) {
    pages[pageIndex].classList.remove('active');
    if (direction === 'next') pages[pageIndex].classList.add('prev');
    pages.forEach(p => { if (p !== pages[pageIndex]) p.classList.remove('prev'); });

    pageIndex = newIndex;
    pages[pageIndex].classList.add('active');
    pages[pageIndex].classList.remove('prev');

    dots.forEach((d, i) => d.classList.toggle('active', i === pageIndex));
    Sound.pageFlip();
  }

  pages[0].classList.add('active');

  nextPageBtn.addEventListener('click', () => {
    const next = (pageIndex + 1) % pages.length;
    renderPage(next, 'next');
  });
  prevPageBtn.addEventListener('click', () => {
    const prev = (pageIndex - 1 + pages.length) % pages.length;
    renderPage(prev, 'prev');
  });

  $('#memoriesContinueBtn').addEventListener('click', () => {
    Sound.click();
    goTo('transition');
    runTransition(() => goTo('letter'));
  });

  /* =========================================================
     5. ENVELOPE + LETTER
     ========================================================= */
  const envelope = $('#envelope');
  const envelopeWrap = $('#envelopeWrap');
  const letterText = $('#letterText');
  const letterCursor = $('#letterCursor');
  const letterContinueBtn = $('#letterContinueBtn');
  const floatingHearts = $('#floatingHearts');

  const letterMessage = `My dearest Sabu,

On a day as special as this, I just wanted to take a moment to tell you how much you mean to me.

We started off as roommates and then became classmates. Somewhere along this journey, you became one of my closest friends—and you know how small my friend circle is.

You've been there with me through every emotion: sadness, happiness, anger, frustration, and everything in between and my constant gossip buddy. I've also had the chance to see so many different sides of you, and I'm really grateful for that.

You became my source of happiness, my comfort, and the person who constantly reminded me to get my work done. I'm pretty sure that if it weren't for you, half of my classes would've gone unattended and most of my homework would've remained unfinished. 😅

Thank you for always being there, for listening, for laughing with me, and for making even the most ordinary days feel memorable.

I honestly can't imagine these past years without you. Thank you for every memory we've made together, and I hope this is just the beginning of many more. No matter where life takes us after college, I hope we stay just as close.

Happy Birthday once again. I hope this year brings you all the happiness, success, love, and peace you truly deserve. Never stop being the amazing person you are.

I'm endlessly grateful for you—today, and every day after.

With lots of love,

Femi🤍`;

  let heartsInterval = null;

  function spawnHeart() {
    const heart = document.createElement('span');
    heart.className = 'heart-particle';
    heart.textContent = ['❤️', '💛', '💜'][Math.floor(rand(0, 3))];
    heart.style.left = rand(10, 90) + '%';
    heart.style.setProperty('--drift', rand(-40, 40) + 'px');
    heart.style.animationDuration = rand(4, 7) + 's';
    floatingHearts.appendChild(heart);
    setTimeout(() => heart.remove(), 7200);
  }

  function typewrite(text, el, speed = 25) {
    let i = 0;
    el.textContent = "";
    letterCursor.style.display = "inline";

    const timer = setInterval(() => {

        if (i < text.length) {
            el.textContent += text.charAt(i);
            i++;
        } else {
            clearInterval(timer);

            letterCursor.style.display = "none";

            // Show Continue button
            letterContinueBtn.hidden = false;
            letterContinueBtn.style.display = "inline-flex";
               }

              }, speed);
}

  let envelopeOpened = false;
  envelope.addEventListener('click', () => {
    if (envelopeOpened) return;
    envelopeOpened = true;
    envelopeWrap.classList.add('opened');
    envelope.classList.add('open');
    Sound.envelopeOpen();

    heartsInterval = setInterval(spawnHeart, 500);
    setTimeout(() => { if (heartsInterval) clearInterval(heartsInterval); }, 9000);

    setTimeout(() => {
      typewrite(letterMessage, letterText);
    }, 900);
  });

  letterContinueBtn.addEventListener('click', () => {
    Sound.click();
    if (heartsInterval) clearInterval(heartsInterval);
    goTo('transition');
    runTransition(() => goTo('final'));
  });

  /* =========================================================
     6. FINAL SCENE
     ========================================================= */
  $('#theEndBtn').addEventListener('click', () => {
    Sound.click();
    goTo('fireworks');
    startFireworks();
  });

  /* =========================================================
     FIREWORKS CANVAS
     ========================================================= */
  const fwCanvas = $('#fireworksCanvas');
  const fwCtx = fwCanvas.getContext('2d');
  let fwParticles = [];
  let fwRunning = false;
  let fwLauncherTimer = null;

  function resizeFwCanvas() {
    fwCanvas.width = window.innerWidth * dpr;
    fwCanvas.height = window.innerHeight * dpr;
    fwCanvas.style.width = window.innerWidth + 'px';
    fwCanvas.style.height = window.innerHeight + 'px';
    fwCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resizeFwCanvas);

  const fwColors = ['#8B6BD8', '#F3A6C4', '#FFD3A8', '#F0C468', '#A8C5E8', '#FFF9F5', '#C9B6E4'];

  function launchFirework() {
    const x = rand(window.innerWidth * 0.15, window.innerWidth * 0.85);
    const y = rand(window.innerHeight * 0.2, window.innerHeight * 0.55);
    const color = fwColors[Math.floor(rand(0, fwColors.length))];
    const count = 46;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + rand(-0.1, 0.1);
      const speed = rand(1.5, 4.2);
      fwParticles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: rand(0.008, 0.016),
        color,
        size: rand(1.5, 3)
      });
    }
    Sound.firework();
  }

  function fwLoop() {
    if (!fwRunning) return;
    fwCtx.fillStyle = 'rgba(18,11,41,0.18)';
    fwCtx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    fwParticles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02;
      p.life -= p.decay;
    });
    fwParticles = fwParticles.filter(p => p.life > 0);

    fwParticles.forEach(p => {
      fwCtx.globalAlpha = Math.max(p.life, 0);
      fwCtx.beginPath();
      fwCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      fwCtx.fillStyle = p.color;
      fwCtx.fill();
    });
    fwCtx.globalAlpha = 1;

    requestAnimationFrame(fwLoop);
  }

  function startFireworks() {
    resizeFwCanvas();
    fwCtx.fillStyle = '#120B29';
    fwCtx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    fwParticles = [];
    fwRunning = true;
    requestAnimationFrame(fwLoop);

    launchFirework();
    let bursts = 1;
    fwLauncherTimer = setInterval(() => {
      launchFirework();
      bursts++;
      if (bursts >= 10) {
        clearInterval(fwLauncherTimer);
      }
    }, 650);
  }

  $('#replayBtn').addEventListener('click', () => {
    fwRunning = false;
    if (fwLauncherTimer) clearInterval(fwLauncherTimer);
    location.reload();
  });

  /* =========================================================
     KICKOFF
     ========================================================= */
  goTo('loading');
  runLoading();

})();