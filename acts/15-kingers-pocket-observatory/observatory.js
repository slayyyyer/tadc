(() => {
  'use strict';
  const positions = [[29,23],[53,18],[75,30],[19,47],[48,43],[79,55],[29,73],[53,79],[67,67]];
  const charts = [
    {name:'The Tiny Crown', stars:[0,1,2], line:'A crown! Finally, a hat that understands the night shift.'},
    {name:'The Lost Teacup', stars:[3,6,7,8], line:'There is no tea in space. I checked with a very long spoon.'},
    {name:'The Polite Moth', stars:[0,4,2,5,4], line:'A moth! Please do not eat the moon. We only have the one.'},
    {name:'The Pillow Fort', stars:[6,3,1,5,8,6], line:'Excellent structural work. The pillows are load-bearing.'},
    {name:'The Way Back In', stars:[7,6,3,0,4,2,5], line:'All the stars accounted for. Now we can be a little lost together.'}
  ];
  const $ = id => document.getElementById(id);
  const buttons = [];
  let chart = 0, cursor = 0, phase = 'idle', generation = 0, sound = false, audio;
  let litTimer;
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  $('kinger').innerHTML = window.TADC.CAST.kinger;
  for (let i = 0; i < 65; i++) {
    const dot = document.createElement('i');
    dot.style.left = `${(i * 37.3 + 11) % 100}%`;
    dot.style.top = `${(i * 61.7 + 7) % 100}%`;
    dot.style.opacity = String(.15 + (i % 5) * .12);
    $('dust').append(dot);
  }
  positions.forEach(([x,y], i) => {
    const button = document.createElement('button');
    button.className = 'star';
    button.style.left = `${x}%`;
    button.style.top = `${y}%`;
    button.setAttribute('aria-label', `Star ${i + 1}`);
    button.innerHTML = `<span class="symbol" aria-hidden="true">✦</span><span class="number" aria-hidden="true">${i + 1}</span>`;
    button.addEventListener('click', () => choose(i));
    $('sky').append(button);
    buttons.push(button);
  });
  charts.forEach((item,i) => {
    const stamp = document.createElement('span');
    stamp.className = 'stamp';
    stamp.id = `stamp-${i}`;
    stamp.textContent = `${String(i + 1).padStart(2,'0')} · Uncharted`;
    $('stamps').append(stamp);
  });
  function note(index) {
    if (!sound) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume().catch(() => {});
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = [261.63,293.66,329.63,392,440,523.25,587.33,659.25,783.99][index];
      gain.gain.setValueAtTime(0, audio.currentTime);
      gain.gain.linearRampToValueAtTime(.12, audio.currentTime + .025);
      gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .65);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(); oscillator.stop(audio.currentTime + .7);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    } catch { sound = false; $('sound').textContent = 'Sound unavailable'; $('sound').setAttribute('aria-pressed','false'); }
  }
  function clearLight() {
    clearTimeout(litTimer);
    buttons.forEach(button => button.classList.remove('lit'));
  }
  function light(index) { clearLight(); buttons[index].classList.add('lit'); note(index); }
  function draw(stars) { $('trail').setAttribute('points', stars.map(i => positions[i].join(',')).join(' ')); }
  function controls() {
    buttons.forEach(button => { button.disabled = phase !== 'input'; });
    $('replay').disabled = phase !== 'input';
    $('start').disabled = phase === 'showing' || phase === 'input';
  }
  function quote(text) {
    $('quote').replaceChildren(document.createTextNode(`“${text}”`));
    const credit = document.createElement('span');
    credit.className = 'byline'; credit.textContent = 'KINGER · ACCIDENTAL ASTRONOMER';
    $('quote').append(credit);
  }
  async function show() {
    const ticket = ++generation;
    cursor = 0; phase = 'showing'; clearLight(); draw([]);
    buttons.forEach(button => button.classList.remove('accepted'));
    controls();
    $('status').textContent = 'Watch the numbered stars. Kinger will wait.';
    $('chapter').textContent = `Chart ${String(chart + 1).padStart(2,'0')} / 05`;
    const sequence = charts[chart].stars;
    await delay(450);
    if (ticket !== generation) return;
    for (let step = 0; step < sequence.length; step++) {
      $('progress').textContent = `Watch ${step + 1} / ${sequence.length}`;
      $('status').textContent = `Watch: star ${sequence[step] + 1} (${step + 1} of ${sequence.length}).`;
      light(sequence[step]);
      await delay(700);
      if (ticket !== generation) return;
      clearLight();
      await delay(220);
      if (ticket !== generation) return;
    }
    phase = 'input'; controls();
    $('progress').textContent = `Your turn · 0 / ${sequence.length}`;
    $('status').textContent = 'Your turn. Trace the stars in the order they glowed.';
  }
  function choose(index) {
    if (phase !== 'input') return;
    const sequence = charts[chart].stars;
    light(index); litTimer = setTimeout(clearLight, 360);
    if (index !== sequence[cursor]) {
      $('status').textContent = `That star belongs to another story. Keep your ${cursor} remembered stars and try again.`;
      quote('A small detour. Even the moon forgets where it parked.');
      return;
    }
    cursor++;
    buttons[index].classList.add('accepted');
    draw(sequence.slice(0,cursor));
    $('progress').textContent = `Your turn · ${cursor} / ${sequence.length}`;
    $('status').textContent = `${cursor} of ${sequence.length} stars remembered.`;
    if (cursor !== sequence.length) return;
    phase = 'complete'; controls();
    const stamp = $(`stamp-${chart}`);
    stamp.classList.add('found'); stamp.textContent = `✦ ${charts[chart].name}`;
    quote(charts[chart].line);
    $('progress').textContent = 'Constellation found';
    $('status').textContent = `${charts[chart].name} — safely tucked into your notebook.`;
    $('start').textContent = chart === charts.length - 1 ? 'Take another night walk' : 'Find the next one';
    if (chart === charts.length - 1) $('status').textContent = 'All five constellations found. The night is home. Stay as long as you like.';
  }
  function reset() {
    generation++; chart = 0; cursor = 0; phase = 'idle'; clearLight(); draw([]);
    buttons.forEach(button => button.classList.remove('accepted'));
    charts.forEach((_,i) => { $(`stamp-${i}`).className = 'stamp'; $(`stamp-${i}`).textContent = `${String(i + 1).padStart(2,'0')} · Uncharted`; });
    $('chapter').textContent = 'Chart 01 / 05'; $('progress').textContent = 'Waiting for nightfall';
    $('status').textContent = 'A fresh page. The stars are right where we left them.';
    $('start').textContent = 'Find a constellation';
    quote("I made the sky smaller. It's much easier to keep an eye on this way.");
    controls();
  }
  $('start').addEventListener('click', () => {
    if (phase === 'showing' || phase === 'input') return;
    if (phase === 'complete') { if (chart === charts.length - 1) reset(); else chart++; }
    show();
  });
  $('replay').addEventListener('click', () => { if (phase === 'input') show(); });
  $('reset').addEventListener('click', reset);
  $('sound').addEventListener('click', () => {
    sound = !sound; $('sound').textContent = `Sound: ${sound ? 'on' : 'off'}`;
    $('sound').setAttribute('aria-pressed', String(sound)); if (sound) note(0);
  });
  document.addEventListener('keydown', event => {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || !/^[1-9]$/.test(event.key)) return;
    event.preventDefault(); choose(Number(event.key) - 1);
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden || phase !== 'showing') return;
    generation++; clearLight(); phase = 'input'; controls();
    $('progress').textContent = 'Playback paused';
    $('status').textContent = 'The sky waited for you. Choose “Show me again” when you are ready.';
  });
  controls();
})();
