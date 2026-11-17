/* 🎬 Cast conversations: the cast talks to EACH OTHER in full, scripted scenes on the Big Top stage.
 * All dialogue is original. Scenes play in a shuffled, unseen-first order that's remembered per browser,
 * so you hear every scene before any repeats. A line may be an array of alternate takes (one is picked each time).
 * Speaker keys: caine, bubble, pomni, jax, ragatha, gangle, zooble, kinger. "gangle:sad" / "gangle:happy" also swaps her mask. */
(function () {
  'use strict';

  const SCENES = [
    { id: 'exit-question', title: 'A Purely Hypothetical Question', lines: [
      ['pomni', 'Caine, quick question. Purely hypothetical.'],
      ['caine', "I LOVE hypotheticals! They're like real things, but lighter!"],
      ['pomni', 'Hypothetically... if someone found an exit...'],
      ['caine', "Then I'd throw them a PARTY! In here! Forever!"],
      ['jax', 'He means no.'],
      ['pomni', 'I know what he means, Jax.'],
      ['jax', "Just checking. You had the look again."],
      ['pomni', 'What look?'],
      ['jax', ["The 'door-shaped hope' look. Adorable. Tragic, but adorable.", "The look of someone about to get very disappointed by a wall."]],
    ]},
    { id: 'sandwich', title: 'Sandwich Architecture', lines: [
      ['bubble', 'Kinger! Kinger! Is a sandwich a building?'],
      ['kinger', 'Hmm. It has floors. Two of them. And a lobby made of lettuce.'],
      ['bubble', 'So I can LIVE in it?'],
      ['kinger', "You could. But then you'd eat your house."],
      ['bubble', ["That's the BEST part of having a house!", 'Then I would be the house! Inside myself! Forever!']],
      ['kinger', "...I'm going to write that down. Somewhere. On a pillow, probably."],
    ]},
    { id: 'mask-check', title: 'Mask Maintenance', lines: [
      ['gangle', 'Ragatha? Is my mask on straight?'],
      ['ragatha', 'Perfectly straight! You look wonderful!'],
      ['gangle:sad', "You'd say that even if it was upside down."],
      ['ragatha', "...Okay, it's a LITTLE tilted. To the left. Charmingly!"],
      ['gangle:happy', 'Thank you for telling me! That was very brave of you.'],
      ['ragatha', ['It WAS brave! My stuffing is still shaking!', "Honesty! Twice in one week! I need a little sit-down."]],
    ]},
    { id: 'parts-parade', title: 'The Parts-Swapping Parade', lines: [
      ['caine', 'Zooble! Today\'s adventure needs someone with MANY parts!'],
      ['zooble', 'Absolutely not.'],
      ['caine', "It's a parts-swapping PARADE!"],
      ['zooble', 'Even more absolutely not.'],
      ['jax', 'Come on, Zoob. You could finally get a matching pair of legs.'],
      ['zooble', 'I LIKE my legs. They have different personalities.'],
      ['jax', "Which one's the fun one?"],
      ['zooble', ["Neither. That's the point.", 'The left one. It has never once been fun. I respect it.']],
    ]},
    { id: 'chess-lesson', title: 'A Very Short Chess Lesson', lines: [
      ['kinger', "Pomni! Want to learn chess? I'm a king, so I'm basically a professional."],
      ['pomni', 'Sure, why not. How does the king move?'],
      ['kinger', 'Very carefully. One square at a time. Usually away from things.'],
      ['pomni', "That's... honestly relatable."],
      ['kinger', 'And the most important rule: never let them corner you.'],
      ['pomni', "Kinger, we're in an infinite void."],
      ['kinger', 'EXACTLY! No corners! Checkmate is impossible here! We WIN!'],
    ]},
    { id: 'lunch', title: 'A Balanced Lunch', lines: [
      ['ragatha', 'Bubble, sweetie, what did you have for lunch?'],
      ['bubble', ['A chair!', 'A staircase! Most of it!']],
      ['ragatha', 'A... what?'],
      ['bubble', 'Well, half of one. The other half is for dessert!'],
      ['jax', 'Honestly the most balanced diet in this place.'],
      ['ragatha', "Jax, don't encourage it."],
      ['jax', "I'm not encouraging. I'm placing bets. On the table. Before Bubble eats the table."],
    ]},
    { id: 'review', title: 'Quarterly Performance Review', lines: [
      ['caine', 'Jax! Time for your quarterly performance review!'],
      ['jax', 'We have those?'],
      ['caine', 'We do NOW! Category one: ENTHUSIASM!'],
      ['jax', 'Pass.'],
      ['caine', "You can't PASS on enthusiasm!"],
      ['jax', "Watch me. I'm doing it right now. Look how little I care."],
      ['caine', "Incredible! A perfect zero! That's a RECORD! Here's a gold star!"],
      ['jax', "...Wait. That worked?"],
    ]},
    { id: 'weather', title: 'The Weather in the Void', lines: [
      ['gangle', 'Does it ever rain in the void?'],
      ['zooble', 'Once. It rained confetti for three days.'],
      ['bubble', 'I ate most of it!'],
      ['zooble', 'We know. We all heard.'],
      ['gangle:sad', 'I missed it... I was hiding behind my sad mask.'],
      ['bubble', 'I saved you some! It is only a little chewed!'],
      ['gangle:happy', "That's the nicest thing anyone has ever chewed for me."],
    ]},
    { id: 'name-shapes', title: 'Round Names and Pointy Names', lines: [
      ['pomni', 'Ragatha, do you think names have shapes?'],
      ['ragatha', 'Oh, definitely. Some are round and some are pointy.'],
      ['pomni', "Mine feels pointy lately. Like a jester hat."],
      ['ragatha', "Mine's round. Like a muffin. A muffin that says hello."],
      ['pomni', 'Can a pointy name get softer?'],
      ['ragatha', "Of course! We'll make it a cushioned point. I'll sew a little pad on the end myself."],
      ['pomni', '...Thanks, Ragatha. That actually helps.'],
    ]},
    { id: 'applause', title: 'Applause Rehearsal', lines: [
      ['caine', "Everyone! Let's rehearse our applause for my next announcement!"],
      ['kinger', '*claps once* Was that good?'],
      ['caine', 'WONDERFUL! Now forty more of those!'],
      ['bubble', "*pop* *pop* *pop* I'm clapping with my whole body!"],
      ['caine', 'Bubble, that is... very loud popping.'],
      ['bubble', "That's how much I love the announcement!"],
      ['kinger', 'What IS the announcement?'],
      ['caine', "I'll know once I hear the applause!"],
    ]},
    { id: 'compliment', title: 'Jax Receives a Compliment', lines: [
      ['ragatha', 'Jax, I just wanted to say you have very nice ears.'],
      ['jax', "...What's the angle."],
      ['ragatha', "No angle! They're just nice! Very tall!"],
      ['jax', 'Gangle. Is she okay?'],
      ['gangle:happy', 'She complimented my ribbons yesterday. I cried for an hour. Happy crying!'],
      ['jax', "This is a trap. Everyone here is nice and it's a trap."],
      ['ragatha', "It's not a trap! It's a hug made of words!"],
      ['jax', 'Worse.'],
    ]},
    { id: 'lost-found', title: 'Lost and Found', lines: [
      ['kinger', 'Zooble! I found something of yours!'],
      ['zooble', "Is it my left arm? It's been gone since Tuesday."],
      ['kinger', "It's a teacup."],
      ['zooble', "That's not mine."],
      ['kinger', 'Are you SURE? You have so many different parts.'],
      ['zooble', "I'm sure. I'd remember having a handle. ...Actually, can I keep it?"],
      ['kinger', 'Finders keepers! Wait, I found it. Kinger keepers! ...Fine, Zooble keepers.'],
    ]},
    { id: 'new-hat', title: 'Behold, A New Hat', lines: [
      ['caine', 'Behold! A NEW HAT!'],
      ['pomni', "It's... the same hat."],
      ['caine', 'It is ONE PERCENT TALLER.'],
      ['jax', 'Wow. Groundbreaking. Ceiling-breaking, almost.'],
      ['ragatha', "I can totally see the difference! It's very... vertical!"],
      ['caine', 'THANK you, Ragatha! Some people appreciate fine millinery!'],
      ['pomni', "What's millinery?"],
      ['caine', 'Hat-making! The noblest art! Second only to teeth!'],
    ]},
    { id: 'inside-bubble', title: "What's Inside Bubble", lines: [
      ['bubble', "Pomni, what's inside me?"],
      ['pomni', 'Uh... air?'],
      ['bubble', "Then what's inside the air?"],
      ['pomni', 'More... smaller air?'],
      ['bubble', 'And inside THAT?'],
      ['pomni', "Bubble, I really don't know."],
      ['bubble', "ME NEITHER! Isn't that great? We don't know TOGETHER!"],
      ['pomni', "...Okay. That's actually kind of nice."],
    ]},
    { id: 'rehearsal', title: 'Rehearsal for Tomorrow', lines: [
      ['caine', "Places, everyone! Rehearsal for tomorrow's adventure!"],
      ['zooble', "What's tomorrow's adventure?"],
      ['caine', "That's what we're rehearsing FOR! Improvise!"],
      ['gangle:happy', "I'll play the comedy mask!"],
      ['gangle:sad', '...and also the tragedy mask. It\'s a two-person role.'],
      ['kinger', "I'll play the castle!"],
      ['zooble', "You're a chess piece, not a castle."],
      ['kinger', 'Not with THAT attitude.'],
      ['caine', 'MAGNIFICENT! Same time tomorrow! Different everything!'],
    ]},
    { id: 'the-line', title: 'The Line', lines: [
      ['pomni', 'Jax, why are we standing in a line?'],
      ['jax', "Don't know. Saw a line. Got in it."],
      ['pomni', "What's at the front?"],
      ['jax', "Nobody's checked. That's the thrill."],
      ['pomni', "Jax. There's no one in front of us."],
      ['jax', "Then we're doing great. First in line for anything."],
      ['pomni', '...I hate that I feel a little proud.'],
    ]},
    { id: 'supplies', title: 'Fort Supplies Check', lines: [
      ['kinger', 'Emergency fort supplies check! Ragatha, crackers?'],
      ['ragatha', 'Twelve crackers!'],
      ['kinger', 'Bubble, juice boxes?'],
      ['bubble', 'Zero juice boxes! Also zero boxes!'],
      ['kinger', 'What happened to the juice boxes?'],
      ['bubble', 'They were emergencies. I handled them.'],
      ['ragatha', 'We can make it work! Crackers are basically dry juice!'],
    ]},
    { id: 'painting', title: 'A Painting of the Exit', lines: [
      ['gangle:happy', 'I painted a picture of the exit!'],
      ['pomni', 'Oh! Can I see?'],
      ['gangle', "It's a door. On a wall. Painted."],
      ['jax', 'So... exactly like every other exit here.'],
      ['gangle', 'Mine has a little welcome mat.'],
      ['pomni', "...That's honestly the nicest one."],
    ]},
    { id: 'relax', title: 'Caine Attempts to Relax', lines: [
      ['ragatha', 'Caine, have you ever taken a break?'],
      ['caine', 'A BREAK? What would I even DO?'],
      ['ragatha', "Nothing! That's the point! You just... sit."],
      ['caine', 'Sit. Okay. I am sitting. ...Is it working?'],
      ['ragatha', "It's been two seconds."],
      ['caine', "TWO WHOLE SECONDS! I've never felt so rested! Back to work!"],
    ]},
    { id: 'asymmetry', title: 'A Bold New Look', lines: [
      ['ragatha', 'Zooble! Love the new look!'],
      ['zooble', 'I put my head on the other side.'],
      ['ragatha', 'It really brings out your... other side!'],
      ['caine', "Zooble! You've been ASYMMETRICAL this whole time? Bold!"],
      ['zooble', "I've been asymmetrical since forever, Caine."],
      ['caine', "And I've been noticing since NOW! Let's celebrate!"],
      ['zooble', 'Please don\'t.'],
    ]},
    { id: 'dream-win', title: 'The Greatest Game', lines: [
      ['kinger', 'Gangle, did I ever tell you about the time I won a game?'],
      ['gangle:happy', 'No! Tell me!'],
      ['kinger', 'It was beautiful. Every piece lined up. My opponent was sweating.'],
      ['gangle', 'And then?'],
      ['kinger', 'And then I woke up. It was a dream. But I won it fair and square!'],
      ['gangle:happy', 'That still counts! Dream wins count DOUBLE!'],
    ]},
    { id: 'sign-lick', title: 'The Glowing Sign', lines: [
      ['bubble', 'Caine! The exit sign is glowing again!'],
      ['caine', 'It does that! For AMBIANCE!'],
      ['pomni', 'It says EXIT, Caine.'],
      ['caine', 'It says EXIT in a FUN way.'],
      ['bubble', 'Can I eat it?'],
      ['caine', "Absolutely not! It's load-bearing decor!"],
      ['bubble', '...Can I lick it?'],
      ['caine', '...One lick.'],
    ]},
    { id: 'stretch', title: 'Mandatory Stretch Break', lines: [
      ['ragatha', 'Everybody! Stretch break! Arms up!'],
      ['zooble', 'Which arms?'],
      ['ragatha', 'All of them! Whatever you have!'],
      ['kinger', "I don't have arms. I'm stretching emotionally."],
      ['jax', "I'm stretching the truth. Does that count?"],
      ['ragatha', 'It counts if you do it with good posture!'],
      ['pomni', '...this is genuinely the most relaxed I have felt in weeks.'],
    ]},
    { id: 'gift', title: 'An Unexpected Gift', lines: [
      ['jax', 'Pomni. Here.'],
      ['pomni', '...A rock?'],
      ['jax', "It's a rock that looks like a door. Figured you'd like it."],
      ['pomni', 'Jax, that is... actually really thoughtful.'],
      ['jax', "Don't make it weird. It's a rock."],
      ['pomni', "I'm keeping it forever."],
      ['jax', 'Ugh. Fine. Great. Whatever.'],
      ['ragatha', "*whispering* He picked it out for twenty minutes."],
    ]},
  ];

  const FINALE = [
    ['caine', "And THAT'S every scene we've rehearsed! You've been a WONDERFUL audience!"],
    ['jax', "He's going to start them over."],
    ['caine', 'From the TOP! With FEELING!'],
  ];

  const NAMES = { caine: 'Caine', bubble: 'Bubble', pomni: 'Pomni', jax: 'Jax', ragatha: 'Ragatha', gangle: 'Gangle', zooble: 'Zooble', kinger: 'Kinger' };
  const SEEN_KEY = 'tadc-scenes-seen-v1';
  const readSeen = () => { try { const value = JSON.parse(localStorage.getItem(SEEN_KEY)); return Array.isArray(value) ? value.filter(id => SCENES.some(scene => scene.id === id)) : []; } catch (e) { return []; } };
  const writeSeen = (ids) => { try { localStorage.setItem(SEEN_KEY, JSON.stringify(ids)); } catch (e) { /* storage blocked: this visit still won't repeat */ } };
  let sessionSeen = readSeen();

  const listeners = new Set();
  let playback = { title: '', speaker: '', line: '', index: 0, total: 0 };
  const api = { SCENES, active: false, paused: false, mount,
    state: () => ({...playback, active: api.active, paused: api.paused}),
    subscribe(fn) { listeners.add(fn); fn(api.state()); return () => listeners.delete(fn); }
  };
  const notify = () => listeners.forEach(fn => fn(api.state()));
  window.CircusScenes = api;

  function mount(opts) {
    const { actors, say, canPlay = () => true, fallbackAnchor } = opts;
    const banner = document.createElement('div');
    banner.id = 'sceneBanner';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    Object.assign(banner.style, {
      position: 'fixed', left: '50%', top: 'calc(5.5vh + clamp(48px, 9vw, 110px))', transform: 'translateX(-50%) translateY(-6px)', zIndex: 9,
      font: "600 14px 'Fredoka', system-ui, sans-serif", color: '#fff7d6', background: 'rgba(27,27,47,.82)', border: '2px solid #ffd34d',
      borderRadius: '999px', padding: '5px 14px', opacity: '0', transition: 'opacity .4s, transform .4s', pointerEvents: 'none', whiteSpace: 'nowrap',
      maxWidth: '92vw', overflow: 'hidden', textOverflow: 'ellipsis',
    });
    document.body.appendChild(banner);
    const showBanner = (text) => { banner.textContent = text; banner.style.opacity = '1'; banner.style.transform = 'translateX(-50%)'; };
    const hideBanner = () => { banner.style.opacity = '0'; banner.style.transform = 'translateX(-50%) translateY(-6px)'; };

    const visible = (el) => el && el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden' && el.getBoundingClientRect().width > 0;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let token = 0;
    async function wait(ms, my) {
      let remaining = ms;
      while (remaining > 0 || api.paused || !canPlay()) {
        if (my !== token) return false;
        const running = !api.paused && canPlay();
        const chunk = Math.min(100, Math.max(remaining, 1));
        await sleep(running ? chunk : 100);
        if (running && !api.paused && canPlay()) remaining -= chunk;
      }
      return my === token;
    }

    function setMask(mood) {
      const g = actors.gangle; if (!g) return;
      const happy = g.querySelector('.mask-comedy'), sad = g.querySelector('.mask-tragedy');
      if (!happy || !sad) return;
      happy.style.display = mood === 'sad' ? 'none' : '';
      sad.style.display = mood === 'sad' ? '' : 'none';
    }
    function bob(el) { if (!window.CircusCalm?.get() && el && el.animate) el.animate([{ translate: '0 0' }, { translate: '0 -8px' }, { translate: '0 0' }], { duration: 380, easing: 'ease-out' }); }

    function nextScene() {
      const unseen = SCENES.filter((s) => !sessionSeen.includes(s.id));
      if (!unseen.length) return null;
      return unseen[Math.floor(Math.random() * unseen.length)];
    }

    async function perform(lines, title, my) {
      api.active = true;
      playback = { title, speaker: '', line: '', index: 0, total: lines.length };
      showBanner(title); notify();
      if (!await wait(900, my)) return false;
      for (const [lineIndex, [rawWho, text]] of lines.entries()) {
        if (my !== token) return false;
        const [who, mood] = rawWho.split(':');
        if (who === 'gangle' && mood) setMask(mood);
        const line = Array.isArray(text) ? text[Math.floor(Math.random() * text.length)] : text;
        const el = actors[who];
        const anchor = visible(el) ? el : (fallbackAnchor || banner);
        const ms = Math.min(6500, 1700 + line.length * 48);
        say(anchor, `<b>${NAMES[who]}:</b> ${line}`, ms, who === 'caine' ? { className: 'caine', voice: rawWho } : { voice: rawWho });
        playback = {title, speaker: NAMES[who], line, index: lineIndex + 1, total: lines.length};
        notify(); bob(el);
        if (!await wait(ms + 450, my)) return false;
      }
      setMask('happy');
      return true;
    }

    async function play(selected) {
      const my = ++token;
      api.paused = false;
      let scene = selected || nextScene();
      if (!scene) {
        if (!await perform(FINALE, '🎬 Curtain call', my)) return;
        sessionSeen = []; writeSeen(sessionSeen);
        scene = nextScene();
        if (my !== token) return;
        if (!await wait(1200, my)) return;
      }
      const n = sessionSeen.length + 1;
      if (!sessionSeen.includes(scene.id)) sessionSeen.push(scene.id); writeSeen(sessionSeen); // marked as heard as soon as it starts, so no repeats even if you leave mid-scene
      const done = await perform(scene.lines, selected ? `🎬 ${scene.title}` : `🎬 Scene ${n} of ${SCENES.length}: ${scene.title}`, my);
      if (done && await wait(800, my)) { hideBanner(); api.active = false; api.paused = false; notify(); schedule(); }
    }

    let timer = null;
    function schedule(delay) {
      clearTimeout(timer);
      timer = setTimeout(function tick() {
        if (api.active) return;
        if (!canPlay()) { timer = setTimeout(tick, 4000); return; }
        play();
      }, delay ?? (35000 + Math.random() * 30000));
    }

    api.playNext = () => { clearTimeout(timer); play(); };
    api.playScene = id => {
      const scene = SCENES.find(item => item.id === id);
      if (!scene) return false;
      clearTimeout(timer); play(scene); return true;
    };
    api.pause = () => { if (api.active) { api.paused = true; notify(); } };
    api.resume = () => { api.paused = false; notify(); };
    api.stop = () => { token++; api.active = false; api.paused = false; hideBanner(); notify(); schedule(); };
    api.progress = () => ({ heard: sessionSeen.length, total: SCENES.length });
    api.resetHeard = () => { sessionSeen = []; writeSeen(sessionSeen); };
    schedule(opts.firstDelay ?? 14000);
    return api;
  }
})();
