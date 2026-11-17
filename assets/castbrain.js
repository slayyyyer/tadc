/* 🧠 The Cast Brain: Tier 1 "AI without APIs".
 * Per-character chat: intent matching → hand-written in-character replies (all original), remembered
 * facts (your name, visits, topics), and an order-2 word Markov "improv" voice trained on
 * window.CIRCUS_CORPUS (assets/corpus.js). Pure local JS: no network, no models, works from file://.
 * API:
 *   CircusBrain.reply(who, text)        → { text, mood, intent }
 *   CircusBrain.improv(who[, seedWord])  → a fresh Markov line in that character's voice
 *   CircusBrain.mountChat(el, who)       → drop-in chat widget; returns { setWho(who), destroy() }
 *   CircusBrain.memory() / forget()
 * Tier 2 hook: if window.CircusTinyLM exists, improv() asks it first (see assets/tinylm.js). */
(function (root) {
  'use strict';
  const WHO = ['caine', 'bubble', 'pomni', 'jax', 'ragatha', 'gangle', 'zooble', 'kinger'];
  const NAMES = { caine: 'Caine', bubble: 'Bubble', pomni: 'Pomni', jax: 'Jax', ragatha: 'Ragatha', gangle: 'Gangle', zooble: 'Zooble', kinger: 'Kinger' };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  // ═══ intents: [name, test(normalizedText)] in priority order ═══
  const INTENTS = [
    ['name-set', (t) => /\b(my name is|i am called|i'm called|call me)\s+[a-z]/.test(t) || /^(i'm|im|i am)\s+[a-z][a-z'-]{1,20}$/.test(t)],
    ['name-ask', (t) => /\b(what'?s|what is|do you know|remember) my name\b|\bwho am i\b/.test(t)],
    ['bye', (t) => /\b(bye|goodbye|see (you|ya)|gotta go|got to go|back to work|later|cya|leaving now|good ?night)\b/.test(t)],
    ['greet', (t) => /^(hi|hey|hello|howdy|yo|hiya|greetings|good (morning|afternoon|evening)|sup)\b/.test(t)],
    ['how', (t) => /\bhow (are|r) (you|u)\b|\bhow'?s it going\b|\bhow do you feel\b|\bhow have you been\b/.test(t)],
    ['thanks', (t) => /\b(thanks|thank you|thx|ty|cheers|appreciate)\b/.test(t)],
    ['mystery', (t) => /\b(mystery|stub|stubs|ticket|clue|clues|backstage|keyhole|password|case file|painted door)\b/.test(t)],
    ['exit', (t) => /\b(exit|leave|escape|way out|get out|outside|real world|door)\b/.test(t)],
    ['stressed', (t) => /\b(stress|stressed|tired|exhausted|sad|anxious|overwhelmed|burn(ed|t)? ?out|rough day|bad day|frustrat)/.test(t)],
    ['work', (t) => /\b(work|code|coding|bug|bugs|deploy|meeting|jira|ticket|pr|merge|deadline|boss|test(s|ing)?|compile|build)\b/.test(t)],
    ['joke', (t) => /\b(joke|funny|make me laugh|pun)\b/.test(t)],
    ['who', (t) => /\b(who are you|what are you|tell me about (yourself|you)|introduce yourself)\b/.test(t)],
    ['help', (t) => /\b(help|what can (you|i) do|what do you do|commands|how does this work)\b/.test(t)],
    ['compliment', (t) => /\b(love you|you'?re (great|awesome|cool|the best|amazing|funny|cute|nice)|i like you|you rock)\b/.test(t)],
    ['insult', (t) => /\b(hate you|you'?re (dumb|stupid|annoying|boring|lame|bad)|shut up|go away)\b/.test(t)],
    ['food', (t) => /\b(food|eat|hungry|snack|pizza|lunch|dinner|cake|coffee|tea)\b/.test(t)],
    ['yes', (t) => /^(yes|yeah|yep|sure|ok(ay)?|of course|definitely)\b/.test(t)],
    ['no', (t) => /^(no|nope|nah|never)\b/.test(t)],
  ];

  // ═══ replies: all original, written in each character's voice. {name} = your remembered name ═══
  const R = {
    caine: {
      greet: ['WELCOME BACK, {name}! The tent missed you! I had it wait by the door! The painted one!', 'Ah, {name}! A visitor! A GUEST! An audience member of the highest caliber!'],
      bye: ["Leaving? Ha! I mean, of course! Go! Shine! The circus will keep your seat warm. Forever!", 'Farewell, {name}! Come back soon! Come back sooner than soon!'],
      'name-set': ["{name}! What a MAGNIFICENT name! I'll have it painted on something! Not a door. Probably not a door."],
      'name-ask': ["You're {name}! Star guest! Honored audience! I never forget a name. I wrote it on my teeth."],
      'name-unknown': ["I don't know your name yet! Tell me! I'll announce it with TRUMPETS!"],
      how: ["I'm WONDERFUL! I'm always wonderful! It's in my contract! I wrote the contract!", 'Splendid, stupendous, and only slightly sticky from repainting the scenery!'],
      thanks: ["Think nothing of it! Think EVERYTHING of it! Either way, you're welcome!"],
      mystery: ["A mystery? In MY circus? Hoo-hoo! I'd look closely at the EXIT sign if I were you. Not that I'm hinting. I'm absolutely hinting.", 'Ticket stubs? I have no idea what you mean. Stop looking at my gloves.'],
      exit: ['The exit? Ah-ha-ha! What a delightful little joke! There is no exit! There is only MORE FUN!', "Doors are just walls that got ambitious. And that one's painted on!"],
      stressed: ["Oh no! A tired guest! Quick, sit, breathe! Take a five-minute break! I'll juggle quietly!", 'Stress is just excitement that forgot to dress up! Pick a cozy adventure. I recommend the quilt!'],
      work: ['Work? Ah, the mysterious land beyond the tent! I hear it has meetings! Terrifying!', "Code! Bugs! Deploys! You're very brave out there. In here, we only deploy CONFETTI!"],
      joke: ['Why did the ringmaster cross the void? To get to the OTHER void! ...It is the same void.', 'What do you call a door that tells jokes? A PAINTED STAND-UP! Ha! I paint those too!'],
      who: ["I'm CAINE! Ringmaster! Host! Architect of adventures! Owner of an extraordinary number of teeth!"],
      help: ["You can ask me anything! About the circus, about the cast, about your break! Or try the ADVENTURES board. It's full of things to do!"],
      compliment: ["Oh, STOP! Don't stop! Say it again but with a drumroll!"],
      insult: ["Ha! A critic! Every great show needs one! I'll put you in the front row!"],
      food: ["Snacks? We have pizza from another dimension and cake that's mostly confetti! Bubble ate the rest!"],
      yes: ['YES! Enthusiasm! I love it! More of that!'],
      no: ["No? Bold! Daring! I respect it! I'll ask again in five minutes!"],
    },
    bubble: {
      greet: ['HIIII {name}!! I missed you! I ate a clock waiting for you! Time went weird!', 'Hi hi hi! Is it snack time? It is ALWAYS snack time!'],
      bye: ["Byeee! Bring me back a snack from the outside! Or a door! I'm not picky!"],
      'name-set': ['{name}! That sounds crunchy! I won\'t eat it. Probably!'],
      'name-ask': ["You're {name}! I remembered! I only ate HALF of the memory!"],
      'name-unknown': ["What's your name? Tell me tell me tell me! I promise not to eat it!"],
      how: ["I'm round! I'm shiny! I'm hungry! That's three good things!"],
      thanks: ['You\'re welcome! Can I have a crumb as payment?'],
      mystery: ["Stubs? I found a ticket once! It was chewy! I gave it back! Mostly!", 'Ooh, a secret! I love secrets! I ate a secret once! It tasted like Caine!'],
      exit: ["I ate the exit sign once! It was crunchy and it said 'no' in my tummy!"],
      stressed: ['Aww! Here! Have a bubble hug! *boing* Feel better? I feel better!'],
      work: ["Is a bug a snack? Can I eat your bugs? I'll eat ALL your bugs!"],
      joke: ['Why did the bubble cross the floor? It was ROUND! Hahaha! I don\'t get it either!'],
      who: ["I'm Bubble! I'm Caine's sidekick! I eat things! Mostly things that aren't food!"],
      help: ['You can talk to me! Or feed me! Feeding me is the better option!'],
      compliment: ["Hehehe! You're my favorite! You and pizza! Tied!"],
      insult: ["That wasn't nice! I'm going to eat a chair about it!"],
      food: ['FOOD?! WHERE?! I mean. Hello. Calmly. WHERE?!'],
      yes: ['YAY!'], no: ['Aww! Okay! I ate my disappointment!'],
    },
    pomni: {
      greet: ["Oh! Hi, {name}. Sorry, I'm still jumpy. Everything here is... a lot.", 'Hey. You came back. That makes one of us who could leave.'],
      bye: ['Wait, you can go? ...Of course you can. Good. Go. Drink some water for me.'],
      'name-set': ["{name}. Okay. A real name. That's... nice to hear in here."],
      'name-ask': ["You're {name}. I wrote it on my hand so I wouldn't forget. My hand is glove. It still works."],
      'name-unknown': ["I don't think you told me your name? You don't have to. I'm just collecting normal things."],
      how: ["Honestly? Hanging in there. The floor keeps going and my brain keeps going with it.", "I'm okay. Mostly. Ask me again after I stop counting doors."],
      thanks: ['No, thank YOU. Talking to someone normal-ish helps.'],
      mystery: ["The stubs? I've been collecting clues too. Someone painted those doors on purpose. I want to know WHY.", 'If you find the keyhole... tell me what\'s behind it. Please.'],
      exit: ["Don't. Just... don't get my hopes up about the exit again.", "Every door I open is a painting. Every. Single. One."],
      stressed: ["Hey, me too. Deep breath with me? In... and out. Okay. We're still here. That's something.", 'Take a real break. The little stuff can wait five minutes. Trust me, I know waiting.'],
      work: ['Oh man, real work. I used to have that. Bugs that made SENSE. I miss sensible bugs.'],
      joke: ["A joke? Okay: I walked into a door. It was painted. That's it. That's my life now."],
      who: ["I'm Pomni. I'm new. I'm a jester, apparently. I did not pick the hat."],
      help: ["I'm... still figuring out how anything works. But the poster board has games. Some are actually fun."],
      compliment: ['Oh. Thanks. That actually... helps more than you think.'],
      insult: ['Yeah, okay, fair. It has been a weird week. Month. Whatever this is.'],
      food: ["Food here tastes like the idea of food. It's fine. It's FINE."],
      yes: ['Okay. Okay! Good.'], no: ["That's fair. No is a perfectly good answer."],
    },
    jax: {
      greet: ["Oh. It's {name}. Again. Shocking. Truly.", 'Look who wandered back. Run out of better things to do?'],
      bye: ['Finally. I mean, bye. Whatever. Close the painted door behind you.'],
      'name-set': ['{name}. Cool. I\'ll pretend I forgot it later for comedic effect.'],
      'name-ask': ["You're {name}. I remember because it annoys me that I remember."],
      'name-unknown': ["You never told me your name. Which, honestly, respect."],
      how: ['Bored. Thriving. Bored. Same thing in here.', "Great. Never better. That's not saying much."],
      thanks: ["Don't make it weird."],
      mystery: ['Ticket stubs, huh? Cute. I know nothing. I definitely didn\'t see Caine with paint on his gloves.'],
      exit: ["Ha. The exit. Classic. Let me know how that goes. I'll be here. Obviously."],
      stressed: ["Ugh. Fine. Sit down. Take five. Don't tell anyone I was nice to you."],
      work: ['You fix bugs for fun? Out there? Willingly? Wild.', "Ship it. If it breaks, that's tomorrow's problem. Tomorrow's you can deal."],
      joke: ["Knock knock. Don't answer. The door's painted. Gotcha."],
      who: ["Jax. Rabbit. Excellent. You've probably heard of me. You should have."],
      help: ["I'm not a help desk. But fine: the bowling game's rigged and I love it."],
      compliment: ['I know. But thanks for noticing.'],
      insult: ["Ooh, edgy. Seven out of ten. Work on your delivery."],
      food: ["Bubble ate the snack bar. Again. Don't ask me where the snacks went."],
      yes: ['Groundbreaking.'], no: ['Wow. Bold. Respect, actually.'],
    },
    ragatha: {
      greet: ['{name}! Hi hi! It\'s so good to see you! Did you drink water today?', 'Oh, hello, sweetie! Come in, sit, the cushions are freshly fluffed!'],
      bye: ['Bye for now! Stretch your shoulders on the way out! You did great today!'],
      'name-set': ["{name}! What a lovely name! I'm going to stitch it on a little pillow!"],
      'name-ask': ["You're {name}! Of course I remember! You're my favorite visitor named {name}!"],
      'name-unknown': ["I'd love to know your name, if you want to share! No pressure at all!"],
      how: ["I'm doing wonderfully! Mostly! Okay, a little frayed at the seams, but who isn't?"],
      thanks: ["Aww, of course! That's what friends are for!"],
      mystery: ["A mystery! Ooh! I found a ticket stub inside a quilt once. Well. Not ONCE. Keep looking!"],
      exit: ["Oh, hon. Let's not stare at that door too long. It gets lonely when we look at it."],
      stressed: ["Oh no, come here. You're doing so much better than you think. Five minutes, a stretch, some water. Then we tackle it.", "Bad days are allowed. They don't get to stay forever, though. I'll make sure."],
      work: ["Coding sounds so clever! Remember: one bug at a time. Even big quilts are just little squares!"],
      joke: ["Why did the ragdoll cross the road? To get to the other SEAM! ...I'm sorry. I'm so sorry."],
      who: ["I'm Ragatha! I sew, I cheer, I keep everyone's stuffing in. Mostly!"],
      help: ['I can listen! And recommend the cozy adventures! The patchwork one is my favorite. Obviously.'],
      compliment: ["Stop it, you'll make me blush! I don't have blood! I'll blush anyway!"],
      insult: ["That's okay. You're probably just tired. Want a cushion?"],
      food: ["I have crackers! Twelve of them! Well, eleven. Bubble was here."],
      yes: ["Wonderful!"], no: ["That's totally okay!"],
    },
    gangle: {
      greet: ['Oh! H-hi, {name}! I\'m wearing my happy mask today! For you!', 'Hello! You came back! My ribbons are wiggling!'],
      bye: ["Bye! Please come back! I'll keep the happy mask on until you do!"],
      'name-set': ['{name}... that\'s a nice name. It makes my mask feel smiley.'],
      'name-ask': ["You're {name}! I remembered! I'm so proud of me!"],
      'name-unknown': ["I don't know your name yet... but that's okay! You can tell me when you're ready!"],
      how: ["Happy! Mostly! The sad mask is in my pocket just in case.", "Wobbly. But a good wobbly!"],
      thanks: ['Y-you\'re welcome! Thank you for thanking me!'],
      mystery: ["Clues? I... I painted a picture of the exit once. With a welcome mat. Maybe that helps?"],
      exit: ["Every exit I've seen is painted. I painted one too. Mine has a welcome mat."],
      stressed: ["Oh no... it's okay to switch to the sad mask for a bit. I do it all the time. Then you switch back."],
      work: ['Work sounds scary. You\'re very brave. Braver than my ribbons.'],
      joke: ["A joke! Um. Why was the mask sad? Because it was the tragedy one. ...That's just true."],
      who: ["I'm Gangle! I have two masks and lots of ribbons. The masks have feelings so I don't have to. Sometimes."],
      help: ["You can talk to me! Or try the ribbon puzzle. It's really calming."],
      compliment: ["R-really?! My mask is smiling SO hard right now!"],
      insult: ['Oh... okay... *switches to sad mask*'],
      food: ['I like tea. Ragatha makes it. With a tiny cookie!'],
      yes: ['Yay!'], no: ["Okay! That's okay!"],
    },
    zooble: {
      greet: ['Oh. Hey, {name}. You again. Cool.', 'Hi. Don\'t ask me to do an adventure.'],
      bye: ['Later. Have fun out there, wherever "there" is.'],
      'name-set': ['{name}. Got it. Filed it next to my spare leg.'],
      'name-ask': ["{name}. I remember. Don't make it a whole thing."],
      'name-unknown': ["You haven't told me your name. Which, honestly, is very low-maintenance of you."],
      how: ['Disassembled. Emotionally. Physically also a little.', "Fine. I'm fine. Everything is fine-adjacent."],
      thanks: ['Sure.'],
      mystery: ["Stubs? Ask Caine. Or don't, and look at things he'd hide stuff in. Which is everything."],
      exit: ["You're asking the wrong part of me. Try my left arm. It's been looking for a way out for years."],
      stressed: ["Same. Take a break. A real one. I'll sit here and not talk to you. Supportively."],
      work: ['Bugs, huh. My body is basically a bug report. Very relatable.'],
      joke: ["My legs don't match. That's the joke. I'm the joke. Ha."],
      who: ["Zooble. Assorted parts. No assembly instructions. Please don't ask about the cone."],
      help: ["You can build a creature in my game. Please make it uglier than me. I need the win."],
      compliment: ['...Oh. Okay. Thanks. That was weirdly nice.'],
      insult: ['Yeah, I\'ve heard worse. From my own parts.'],
      food: ["I don't have a stomach. I think. Maybe it's in the props room."],
      yes: ['Cool.'], no: ['Same.'],
    },
    kinger: {
      greet: ['Hello! Oh, hello! Have we met? Of course we have! {name}! I think!', 'A visitor! Quick, everyone to the fort! Oh. It\'s a friend. Hello, {name}!'],
      bye: ["Leaving? Watch out for the bishops! They move diagonally! It's very sneaky!"],
      'name-set': ["{name}! I'll remember that! I'll write it on a pillow! Which pillow... we'll see!"],
      'name-ask': ["You're... {name}! Yes! I didn't forget! I only misplaced it for a moment!"],
      'name-unknown': ["Your name! Of course! It's... hmm. Tell me again? I keep names in the fort."],
      how: ['I moved one square today! In any direction! A personal best!', "I'm well! I think! What day is it? Doesn't matter! I'm well!"],
      thanks: ["Oh, you're very welcome! For what? Doesn't matter! You're welcome!"],
      mystery: ["Clues! I love clues! I once found a clue in my pillow fort. It was a cookie. Still counts!"],
      exit: ["The exit? I asked Caine once. He said 'checkmate.' I've been thinking about it for years."],
      stressed: ['Into the fort! Quick! Nothing bad can get in here! The pillows are load-bearing!'],
      work: ["You do work? Like moving pieces? I move pieces! One square at a time! It's exhausting!"],
      joke: ['Why did the king hide in the castle? Because the rook told him to! ...Is that a joke? I think it\'s a strategy!'],
      who: ["I'm Kinger! A king! A chess king! The most important piece! Also the slowest!"],
      help: ["Play chess with me! I'm getting better! I can see three moves ahead! Then I forget them!"],
      compliment: ["Oh my! Thank you! I'm going to tell my queen! Wherever she is!"],
      insult: ["Oh dear. Well. I'll just go sit in the fort for a bit."],
      food: ['Cookies! I keep emergency cookies in the fort! Also emergency pillows!'],
      yes: ['Splendid!'], no: ['Oh! Alright!'],
    },
  };

  // opinions: what each character says when you mention another cast member
  const OPINION = {
    caine: { default: '{other}? A STAR! Everyone in my circus is a star! Some are just... dimmer stars!' },
    bubble: { caine: 'Caine is the best! He lets me eat things! Not doors though!', default: '{other}? I like {other}! I licked {other} once!' },
    pomni: { caine: "Caine means well. I think. That's what scares me.", jax: 'Jax is... a lot. But he gave me a rock once. A door-shaped rock.', ragatha: "Ragatha's the reason I haven't fallen apart. Literally and otherwise.", default: '{other} is nice. Everyone here is nice in a really unsettling way.' },
    jax: { pomni: "Pomni? She's fine. Jumpy. Fun to watch.", ragatha: 'Ragatha is aggressively kind. Somebody stop her.', kinger: "Kinger lost a staring contest with a pillow. That's all you need to know.", default: '{other}? Eh. Could be worse. Could be me. Wait, no, being me is great.' },
    ragatha: { jax: "Jax is a softie underneath! Very, very far underneath!", default: '{other} is wonderful! I mean it! I always mean it!' },
    gangle: { default: '{other} is really nice to me! Even when my mask slips!' },
    zooble: { caine: "Caine's... a lot. A lot of teeth. A lot of plans. A lot.", default: '{other}? Fine. We coexist. Like my legs.' },
    kinger: { default: "{other}! Lovely piece! Or person! I forget which I'm playing against!" },
  };

  const NO_TOPIC = {
    caine: ['Fascinating! Tell me MORE! Actually tell me less, but with more ENTHUSIASM!'],
    bubble: ['Ooh! What does that taste like?'],
    pomni: ["Huh. Okay. I'm going to think about that way too much later."],
    jax: ['Riveting. Truly. Go on, I guess.'],
    ragatha: ["Oh, that's so interesting! Tell me everything!"],
    gangle: ['Oh! That sounds... nice? Is it nice?'],
    zooble: ['Okay.'],
    kinger: ['Hmm! Yes! Indeed! What were we talking about?'],
  };

  // ═══ Markov improv voice (order-2 word chain per character, with a global backoff) ═══
  const START = '\u0002', END = '\u0003';
  const tok = (s) => (String(s).match(/[A-Za-z0-9']+|[.,!?…]/g) || []);
  let chains = null;
  function buildChains() {
    const corpus = root.CIRCUS_CORPUS || {};
    const mk = () => new Map();
    const add = (map, key, val) => { if (!map.has(key)) map.set(key, []); map.get(key).push(val); };
    chains = { global2: mk(), global1: mk(), sources: new Set() };
    for (const who of WHO) {
      const c2 = mk();
      const lines = [...(corpus[who] || []), ...Object.values(R[who]).flat().filter((l) => !/\{name\}|\{other\}/.test(l))];
      for (const line of lines) {
        chains.sources.add(line.toLowerCase().replace(/\s+/g, ' ').trim());
        const t = [START, START, ...tok(line), END];
        for (let i = 2; i < t.length; i++) {
          add(c2, t[i - 2] + ' ' + t[i - 1], t[i]);
          add(chains.global2, t[i - 2] + ' ' + t[i - 1], t[i]);
          add(chains.global1, t[i - 1], t[i]);
        }
      }
      chains[who] = c2;
    }
  }
  function detok(words) {
    return words.join(' ').replace(/\s+([.,!?…])/g, '$1').replace(/^[\s.,!?…]+/, '').replace(/^./, (c) => c.toUpperCase());
  }
  function markov(who, seed) {
    if (!chains) buildChains();
    const own = chains[who] || chains.global2;
    for (let attempt = 0; attempt < 12; attempt++) {
      const out = [];
      let a = START, b = START;
      // optional seed: start from a known word if this character's chain has it
      if (seed && attempt < 6) {
        const s = seed.toLowerCase();
        const key = [...own.keys()].find((k) => k.split(' ')[1] && k.split(' ')[1].toLowerCase() === s);
        if (key) { [a, b] = key.split(' '); if (a !== START) out.push(a); if (b !== START) out.push(b); }
      }
      const seenPairs = new Set();
      for (let i = 0; i < 28; i++) {
        let next = own.get(a + ' ' + b) || chains.global2.get(a + ' ' + b) || chains.global1.get(b);
        if (!next) break;
        const w = pick(next);
        if (w === END) break;
        const pair = b + ' ' + w;
        if (seenPairs.has(pair)) break; // stop before the chain starts looping ("no exit! There is no exit!")
        seenPairs.add(pair);
        out.push(w); a = b; b = w;
      }
      const text = detok(out);
      const words = out.filter((w) => /[A-Za-z]/.test(w)).length;
      if (words < 4) continue;
      const novel = !chains.sources.has(text.toLowerCase());
      if (novel || attempt >= 10) return /[.!?…]$/.test(text) ? text : text + pick(['!', '.', '...']);
    }
    return pick(NO_TOPIC[who] || ['...']);
  }
  let neuralEnabled = false; // Experimental character model is opt-in for this page visit.
  function improv(who, seed) {
    try { if (neuralEnabled && root.CircusTinyLM && typeof root.CircusTinyLM.generate === 'function') { const t = root.CircusTinyLM.generate(who, seed); if (t) return t; } } catch (e) { /* fall back to Markov */ }
    return markov(who, seed);
  }

  // ═══ memory (per browser) ═══
  const MEM_KEY = 'tadc-brain-v1';
  const readMem = () => { try { return Object.assign({ name: '', visits: 0, talks: {}, topics: [], lastSeen: 0 }, JSON.parse(localStorage.getItem(MEM_KEY)) || {}); } catch (e) { return { name: '', visits: 0, talks: {}, topics: [], lastSeen: 0 }; } };
  const writeMem = (m) => { try { localStorage.setItem(MEM_KEY, JSON.stringify(m)); } catch (e) { /* storage blocked: memory lasts this page */ } };
  const cleanName = (s) => String(s || '').replace(/[^A-Za-z' -]/g, '').trim().replace(/\s+/g, ' ').slice(0, 24).replace(/\b\w/g, (c) => c.toUpperCase());

  function extractName(t) {
    const m = /\b(?:my name is|i am called|i'm called|call me)\s+([a-z][a-z' -]{0,30})/.exec(t) || /^(?:i'm|im|i am)\s+([a-z][a-z'-]{1,20})$/.exec(t);
    if (!m) return '';
    const n = cleanName(m[1].split(/\s+(?:and|but|so|from|at|the)\b/)[0]);
    return /^(fine|good|ok|okay|tired|bored|here|back|sad|happy|great|done|busy|stressed)$/i.test(n) ? '' : n;
  }

  function fill(text, mem, other) {
    return text.replace(/\{name\}/g, mem.name || pick(['friend', 'superstar', 'you'])).replace(/\{other\}/g, other ? NAMES[other] : 'them');
  }

  function reply(who, input) {
    who = WHO.includes(who) ? who : 'caine';
    const raw = String(input || '').slice(0, 400);
    const t = raw.toLowerCase().replace(/[^a-z0-9' ?!.,-]/g, ' ').replace(/\s+/g, ' ').trim();
    const mem = readMem();
    mem.talks[who] = (mem.talks[who] || 0) + 1;
    mem.lastSeen = Date.now();
    let intent = 'none';
    for (const [name, test] of INTENTS) { if (test(t)) { intent = name; break; } }
    // mentions of another cast member → opinion (unless something more specific matched)
    const mentioned = WHO.find((w) => w !== who && new RegExp('\\b' + w + '\\b').test(t));
    if (mentioned && ['none', 'yes', 'no', 'how'].includes(intent)) intent = 'opinion';
    let text;
    if (intent === 'name-set') {
      const n = extractName(t);
      if (n) { mem.name = n; text = pick(R[who]['name-set']); } else { intent = 'none'; }
    }
    if (!text && intent === 'name-ask' && !mem.name) text = pick(R[who]['name-unknown']);
    if (!text && intent === 'opinion') {
      const o = OPINION[who] || {};
      text = fill(o[mentioned] || o.default || '{other}? Hm.', mem, mentioned);
    }
    if (!text && intent !== 'none' && R[who][intent]) text = pick(R[who][intent]);
    if (!text) {
      // no intent: improvise, seeded with an interesting word the visitor used
      const words = t.split(' ').filter((w) => w.length > 4 && !/^(about|there|their|would|could|should|which|where|think|really|thing)$/.test(w));
      text = improv(who, words.length ? pick(words) : null);
      intent = 'improv';
    }
    if (intent !== 'improv') { mem.topics = [intent, ...mem.topics.filter((x) => x !== intent)].slice(0, 10); }
    // the occasional "I remember you" flourish
    if (mem.talks[who] === 10) text += ` (That's ten chats now${mem.name ? ', ' + mem.name : ''}. I'm keeping count. ${NAMES[who] === 'Jax' ? 'Not that I care.' : 'Isn\'t that nice?'})`;
    writeMem(mem);
    const mood = /insult|stressed/.test(intent) ? 'sad' : /compliment|greet|thanks|joke|yes/.test(intent) ? 'happy' : 'neutral';
    return { text: fill(text, mem), mood, intent };
  }

  // ═══ drop-in chat widget ═══
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CSS = `.cb-chat{display:flex;flex-direction:column;gap:8px;font-family:'Fredoka',system-ui,sans-serif;color:#1b1b2f}
  .cb-log{list-style:none;margin:0;padding:8px;max-height:min(42vh,320px);overflow:auto;background:#fff7d6;border:3px solid #1b1b2f;border-radius:12px;display:flex;flex-direction:column;gap:6px}
  .cb-log li{max-width:85%;padding:6px 10px;border-radius:12px;line-height:1.35;font-size:14px;overflow-wrap:anywhere}
  .cb-log li.you{align-self:flex-end;background:#2f5bd8;color:#fff;border-bottom-right-radius:3px}
  .cb-log li.them{align-self:flex-start;background:#fff;border:2px solid #1b1b2f;border-bottom-left-radius:3px}
  .cb-log li.them b{display:block;font-size:11px;letter-spacing:.06em;color:#8a0c1a}
  .cb-row{display:flex;gap:6px}
  .cb-row input{flex:1;min-width:0;font:500 15px 'Fredoka',system-ui,sans-serif;padding:8px 10px;border:3px solid #1b1b2f;border-radius:999px;background:#fff}
  .cb-row button{font:700 14px 'Fredoka',system-ui,sans-serif;padding:8px 14px;border:3px solid #1b1b2f;border-radius:999px;background:#ffd34d;color:#1b1b2f;cursor:pointer}
  .cb-row input:focus-visible,.cb-row button:focus-visible{outline:3px dashed #e3243b;outline-offset:2px}
  .cb-note{font-size:11px;color:#5c3a99;margin:0}`;
  function mountChat(el, who) {
    if (!document.getElementById('cb-css')) { const s = document.createElement('style'); s.id = 'cb-css'; s.textContent = CSS; document.head.appendChild(s); }
    let current = WHO.includes(who) ? who : 'caine', destroyed = false;
    const pending = new Set();
    el.innerHTML = `<div class="cb-chat"><ol class="cb-log" aria-live="polite" aria-label="Chat transcript"></ol>` +
      `<form class="cb-row"><label class="cb-sr" style="position:absolute;left:-9999px" for="cbIn${(mountChat.n = (mountChat.n || 0) + 1)}">Say something</label>` +
      `<input id="cbIn${mountChat.n}" autocomplete="off" maxlength="300" placeholder="Say something to ${NAMES[current]}…"><button type="submit">Say</button></form>` +
      `<p class="cb-note">The cast runs on circus-made brains: no internet, no APIs. Your chats stay in this browser.</p></div>`;
    const log = el.querySelector('.cb-log'), form = el.querySelector('form'), input = el.querySelector('input');
    const push = (cls, html) => { const li = document.createElement('li'); li.className = cls; li.innerHTML = html; log.appendChild(li); log.scrollTop = log.scrollHeight; };
    form.addEventListener('submit', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (destroyed) return;
      const said = input.value.trim(); if (!said) return;
      input.value = '';
      push('you', esc(said));
      const speaker = current, r = reply(speaker, said);
      const timer = setTimeout(() => {
        pending.delete(timer);
        if (destroyed) return;
        push('them', `<b>${NAMES[speaker].toUpperCase()}</b>${esc(r.text)}`);
        try { if (root.TADC && root.TADC.babble) root.TADC.babble(speaker + (speaker === 'gangle' && r.mood === 'sad' ? ':sad' : ''), r.text, 2600); } catch (err) { /* voice optional */ }
        if (el.dispatchEvent) el.dispatchEvent(new CustomEvent('castbrain:reply', { detail: { who: speaker, ...r } }));
      }, 350 + Math.min(900, r.text.length * 12));
      pending.add(timer);
    });
    input.addEventListener('keydown', (e) => e.stopPropagation()); // don't trigger page shortcuts while typing
    return {
      setWho(w) { if (WHO.includes(w)) { current = w; input.placeholder = `Say something to ${NAMES[w]}…`; } },
      destroy() { destroyed = true; pending.forEach(clearTimeout); pending.clear(); el.innerHTML = ''; },
    };
  }

  const api = { get neuralEnabled() { return neuralEnabled; }, setNeuralEnabled(value) { neuralEnabled = value === true; }, WHO, INTENTS, REPLIES: R, reply, improv, markov, mountChat, memory: readMem, forget() { try { localStorage.removeItem(MEM_KEY); } catch (e) { /* ignore */ } } };
  root.CircusBrain = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
