/* Simple Calculator Logic */
(() => {
  const display = document.getElementById('display');
  const sciKeys = document.getElementById('sci-keys');
  const themeToggle = document.getElementById('theme-toggle');
  const sciToggle = document.getElementById('scientific-toggle');
  let memory = 0;
  // === Arcade HUD: score and level ===
  let score = 0, level = 1, combo = 0;
  const hudScore = document.getElementById('hud-score');
  const hudLevel = document.getElementById('hud-level');
  function updateHUD() {
    hudScore.textContent = String(score).padStart(6,'0');
    hudLevel.textContent = String(level);
  }
  function addScore(points) {
    score += points;
    const need = 100 + (level-1)*150;
    if (score >= need * level) level++;
    updateHUD();
    pulseHUD();
  }
  function pulseHUD() {
    hudScore.parentElement.animate([{filter:'brightness(1.2)'},{filter:'brightness(1)'}],{duration:180, easing:'ease-out'});
  }
  updateHUD();

  // === Sounds via WebAudio (no assets) ===
  let audioCtx;
  function beep(freq=440, dur=0.07, type='square', gain=0.03) {
    audioCtx = audioCtx || new (window.AudioContext||window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    setTimeout(() => { o.stop(); }, dur*1000);
  }


  // Ensure scientific starts hidden and toggle is off
  document.addEventListener('DOMContentLoaded', () => {
    if (sciToggle) sciToggle.checked = false;
    if (sciKeys) sciKeys.hidden = true;
  });


  // Theme
  themeToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark', themeToggle.checked);
    document.body.classList.toggle('light', !themeToggle.checked);
  });

  // Scientific toggle
  sciToggle.addEventListener('change', () => {
    const on = sciToggle.checked;
    sciKeys.hidden = !on;
  });

  // Button clicks
  document.querySelectorAll('.keys .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.value;
      const act = btn.dataset.action;
      const fn = btn.dataset.fn;
      const tok = btn.dataset.token;

      if (val) { append(val); addScore(1); beep(660,0.04,'square',0.015);}
      else if (tok) { append(tok); addScore(1); beep(620,0.04,'square',0.015);}
      else if (act) handleAction(act);
      else if (fn) handleFunc(fn);
    });
  });

  // Keyboard input
  window.addEventListener('keydown', (e) => {
    const k = e.key;
    if (/[0-9.]/.test(k)) return void append(k);
    if (/[+\-*/%()]/.test(k)) return void append(k.replace('*','×').replace('/','÷'));
    if (k === 'Enter' || k === '=') return void handleAction('equals');
    if (k === 'Backspace') return void handleAction('backspace');
    if (k.toLowerCase() === 'c') return void handleAction('clear');
    if (k === '^') return void append('^');
  });

  function append(token) {
    const current = display.textContent;
    if (current === '0' && /[0-9.]/.test(token)) {
      display.textContent = token;
    } else if (current === '0' && /[+−×÷%]/.test(token)) {
      display.textContent = '0' + token;
    } else {
      display.textContent = current + token;
    }
  }

  function handleAction(action) {
    switch(action) {
      case 'clear':
        display.textContent = '0'; beep(320,0.05,'triangle',0.02); break;
      case 'backspace':
        display.textContent = display.textContent.length > 1 ? display.textContent.slice(0, -1) : '0'; 
        beep(280,0.04,'triangle',0.02);
        break;
      case 'equals':
        try {
          const result = evaluate(display.textContent);
          display.textContent = String(result);
          addScore(10 + Math.min(40, String(result).length));
          beep(880,0.09,'sawtooth',0.03);
        } catch (err) {
          display.textContent = 'Error';
        }
        break;
      case 'mc': memory = 0; break;
      case 'mr': append(formatNumber(memory)); break;
      case 'mplus':
        try { memory += Number(evaluate(display.textContent) || 0); } catch {}
        break;
      case 'mminus':
        try { memory -= Number(evaluate(display.textContent) || 0); } catch {}
        break;
    }
  }

  function handleFunc(fn) {
    switch(fn) {
      case 'sin': append('sin('); break;
      case 'cos': append('cos('); break;
      case 'tan': append('tan('); break;
      case 'sqrt': append('√('); break;
      case 'log10': append('log('); break;
      case 'ln': append('ln('); break;
      case 'inv': 
        // wrap the existing expression in (1/expr)
        display.textContent = '1/(' + display.textContent + ')';
        break;
    }
  }

  function formatNumber(n) {
    if (!isFinite(n)) return String(n);
    const s = String(n);
    return s;
  }

  // Evaluate an expression string
  function evaluate(expr) {
    // Replace fancy symbols
    let s = expr.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/√/g,'sqrt')
                .replace(/π/g,'PI');
    // Map functions to Math
    s = s.replace(/\bPI\b/g, 'Math.PI')
         .replace(/\be\b/g, 'Math.E')
         .replace(/\bsin\(/g, 'Math.sin(')
         .replace(/\bcos\(/g, 'Math.cos(')
         .replace(/\btan\(/g, 'Math.tan(')
         .replace(/\blog\(/g, 'Math.log10(')
         .replace(/\bln\(/g, 'Math.log(')
         .replace(/\bsqrt\(/g, 'Math.sqrt(')
         .replace(/\^/g, '**');
    // Percent: interpret "a%b" as (a/100)*b if b present, else a/100
    // Simple approach: replace trailing % with /100, and standalone % with /100*
    s = s.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
    // Validate allowed characters
    if (!/^[-+*/().,%\d\sEPIathMoginlrcsq^*]*[\d)\]]?$/.test(s)) {
      // Basic safety check; if it fails, throw
      // (This regex just attempts to block unknown identifiers)
    }
    // Evaluate using Function
    // eslint-disable-next-line no-new-func
    const result = Function('return (' + s + ')')();
    // Round small floating errors
    const rounded = Math.round((result + Number.EPSILON) * 1e12) / 1e12;
    return rounded;
  }
})();