/* The big top's ticket desk. No network, storage, or dependencies. */
(function (root) {
  'use strict';
  const categories = {
    '01': 'Play', '02': 'Unwind', '03': 'Create', '04': 'Play', '05': 'Play',
    '06': 'Stories', '07': 'Create', '08': 'Unwind', '09': 'Play', '10': 'Play',
    '11': 'Create', '12': 'Create', '13': 'Stories', '14': 'Unwind', '15': 'Unwind',
    '16': 'Play', '17': 'Unwind', '18': 'Play', '19': 'Play', '20': 'Play', '21': 'Play'
  };
  const category = act => act.category || categories[act.num] || 'Other';
  const normalize = text => String(text).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function select(acts, query = '', mood = 'All', order = 'original') {
    const words = normalize(query).trim().split(/\s+/).filter(Boolean);
    return acts.filter(act => !act.soon && (mood === 'All' || category(act) === mood))
      .filter(act => words.every(word => normalize(`${act.num} ${act.title} ${act.blurb} ${category(act)}`).includes(word)))
      .sort((a, b) => order === 'newest' ? Number(b.num) - Number(a.num) : Number(a.num) - Number(b.num));
  }
  function choose(acts, random = Math.random) {
    return acts.length ? acts[Math.floor(random() * acts.length)] : null;
  }
  function mount(acts) {
    const $ = id => document.getElementById(id);
    let mood = 'All', visible = [];
    const moods = ['All', ...new Set(acts.filter(act => !act.soon).map(category))];
    const chips = moods.map(name => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'mood'; button.textContent = name;
      button.setAttribute('aria-pressed', String(name === mood));
      button.addEventListener('click', () => {
        mood = name;
        chips.forEach(chip => chip.setAttribute('aria-pressed', String(chip.textContent === mood)));
        render();
      });
      $('boardMoods').append(button);
      return button;
    });
    function render() {
      visible = select(acts, $('boardSearch').value, mood, $('boardOrder').value);
      $('posters').replaceChildren();
      visible.forEach((act, index) => {
        const link = document.createElement('a');
        link.className = 'poster'; link.href = act.href;
        link.style.setProperty('--tilt', `${[-2, 1.5, -1, 2][index % 4]}deg`);
        const top = document.createElement('div'); top.className = 'top';
        const icon = document.createElement('span'); icon.textContent = act.icon; icon.setAttribute('aria-hidden', 'true');
        top.append(icon);
        const body = document.createElement('div'); body.className = 'body';
        const number = document.createElement('div'); number.className = 'num';
        number.textContent = `ACT ${act.num} · ${category(act)}${act.num === newest ? ' · NEWEST' : ''}`;
        const title = document.createElement('h3'); title.textContent = act.title;
        const blurb = document.createElement('p'); blurb.textContent = act.blurb;
        body.append(number, title, blurb); link.append(top, body); $('posters').append(link);
      });
      $('boardCount').textContent = `${visible.length} of ${total} adventures${mood !== 'All' ? ` · ${mood}` : ''}`;
      $('boardEmpty').hidden = visible.length !== 0;
      $('boardSurprise').disabled = visible.length === 0;
    }
    const total = acts.filter(act => !act.soon).length;
    const newest = select(acts, '', 'All', 'newest')[0]?.num;
    $('boardSearch').addEventListener('input', render);
    $('boardOrder').addEventListener('change', render);
    $('boardReset').addEventListener('click', () => {
      $('boardSearch').value = ''; $('boardOrder').value = 'original'; mood = 'All';
      chips.forEach(chip => chip.setAttribute('aria-pressed', String(chip.textContent === mood)));
      render(); $('boardSearch').focus();
    });
    $('boardSurprise').addEventListener('click', () => {
      const act = choose(visible);
      if (act) window.location.href = act.href;
    });
    render();
  }
  const api = { select, choose, category, mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CircusBoard = api;
})(typeof window === 'undefined' ? globalThis : window);
