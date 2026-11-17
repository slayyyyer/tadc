/* Original backstage conversations. State lasts only for this page visit. */
(function (root) {
  'use strict';
  const cast = {
    pomni: {name:'Pomni', subtitle:'Taking one manageable moment at a time', picks:['01','13'],
      lines:["Could we do something with a beginning AND an end? I miss those.","I counted the doors. Then a door winked. I am no longer counting the doors.","Sitting here with you is surprisingly normal. Please don't tell the furniture."],
      action:'Take a grounding break', frames:['👀','🖐️','☁️'],
      replies:['Find one color you like. Mine is currently anything that is not flashing.','Notice something you can feel. The floor is here. We are here. That counts.','Let your shoulders settle. No quest. No points. Just this little moment.']},
    jax: {name:'Jax', subtitle:'Complimentary judgment. Nonrefundable.', picks:['18','09'],
      lines:["Welcome to my very exclusive lounge. You're here, so I've lowered the standards.","I have a ticket to tomorrow. The seat is yesterday. Great system.","Don't tell anybody, but hanging around doing nothing is my strongest skill."],
      action:'Let Jax judge your ticket', frames:['🎟️','🧐','🏆'],
      replies:['Seat B-0? Congratulations. You are sitting in the concept of a chair.','This ticket says VIP. Very Inconvenient Person. Finally, an honest label.','Fine. Best ticket in the tent. I signed the back with invisible ink.']},
    ragatha: {name:'Ragatha', subtitle:'A little repair, a little kindness', picks:['14','10'],
      lines:["You don't have to be useful every minute. Even thread gets to sit on a spool.","I made a cushion for the uncomfortable silence. It's much nicer now.","We can mend the tiny things first. The big things can wait their turn."],
      action:'Add a stitch to our patch', frames:['🧵','🪡','💝'],
      replies:['One stitch. A wobbly beginning is still a beginning.','Two stitches. Look! Our little patch is holding together.','Three stitches. Finished! A pocket-sized bit of kindness. Shall we make another?']},
    gangle: {name:'Gangle', subtitle:'Both faces are welcome here', picks:['06','16'],
      lines:["I brought both masks. I didn't know what sort of afternoon this was.","Sometimes the happy mask is just the one that's easier to carry.","Thank you for not asking me to smile. It makes smiling a little easier."],
      action:'Try the other mask', frames:['🌧️','🎭'],
      replies:['Tragedy mask today. You can stay. We do not have to fix the weather.','Comedy mask today. I feel like a tiny standing ovation.']},
    zooble: {name:'Zooble', subtitle:'Some assembly. Absolutely no instructions.', picks:['12','11'],
      lines:["I'm trying a new look. It is called 'comfortable enough to ignore everybody.'","You can have a favorite part without liking the entire situation.","If Caine asks, this is essential maintenance. Sitting is maintenance."],
      action:'Try a different accessory', frames:['🌀','⭐','🔺'],
      replies:['Spiral shoulder. Terrible for doorways. Excellent for dramatic shrugs.','Star elbow. Pointy, impractical, weirdly me.','Triangle antenna. Reception: zero. Personal space: improved.']},
    kinger: {name:'Kinger', subtitle:'Keeper of the imaginary insect collection', picks:['04','15'],
      lines:["Would you like to meet my beetles? They're imaginary, so they're very low maintenance.","I lost my train of thought. It has a little dining carriage. I hope it's having a nice trip.","A good pillow fort has room for one more. That's the whole architectural principle."],
      action:'Count an imaginary beetle', frames:['🐞','🐞 🐞','🐞 🐞 🐞'],
      replies:['One beetle! Very good posture. Possibly a duke.','Two beetles! Unless that is the first one wearing a hat.','Three beetles! Census complete. Release them gently into the imaginary garden.']},
    caine: {name:'Caine', subtitle:'Your host, director, and entire advisory board', picks:['03','19','08'],
      lines:["WELCOME TO BACKSTAGE! It's like the stage, with fewer witnesses!","Today's adventure has passed all three of my inspections. I wore a different hat each time!","A quiet conversation? MARVELOUS! I'll announce it over the loudspeaker!"],
      action:'Rehearse a grand introduction', frames:['🎩','✨','🎪'],
      replies:['A TOP HAT! The traditional beginning of every sensible sentence!','A DAZZLING PAUSE! Please admire this professional silence!','AND NOW... YOU! No auditions required. You are already in the show!']},
    bubble: {name:'Bubble', subtitle:'Please keep the props out of snacking distance', picks:['05','17'],
      lines:["I brought snacks! The snacks were the bag. The bag was delicious.","Do you think a thought gets crunchy if you think it long enough?","I have no pockets! Every day is a packing challenge!"],
      action:'Offer an imaginary snack', frames:['🍪','🫧','🚪'],
      replies:['A pretend cookie! Tastes like almost-chocolate!','A soap bubble! Spicy air! Would burp again!','A painted door! Finally, a balanced meal with absolutely no way out!']}
  };
  function advance(id, count) {
    const person = cast[id];
    const index = count % person.replies.length;
    return {reply:person.replies[index], frame:person.frames[index], count:count + 1};
  }
  function mount(adventures) {
    const $ = id => document.getElementById(id);
    const dialog = $('hangout');
    let current = 'pomni', opener, chat;
    function mountChat() {
      const available = typeof root.CircusBrain?.mountChat === 'function';
      $('hangoutImprov').disabled = $('hangoutForget').disabled = !available;
      $('hangoutNeural').disabled = !available || !root.CircusTinyLM?.ready;
      $('hangoutNeural').checked = root.CircusBrain?.neuralEnabled === true;
      if (available) chat = root.CircusBrain.mountChat($('hangoutChat'), current);
      else $('hangoutChat').textContent = 'The chat is resting. You can still use Keep chatting and the activities.';
    }
    const state = Object.fromEntries(Object.keys(cast).map(id => [id,{talk:0,action:0}]));
    const tabs = [];
    function voice(text) {
      try { if (!root.TADC.quiet?.get()) root.TADC.babble?.(current, text, 3000); } catch {}
    }
    function paintMask() {
      if (current !== 'gangle') return;
      const sad = state.gangle.action % 2 === 1;
      const portrait = $('hangoutPortrait');
      const comedy = portrait.querySelector('.mask-comedy');
      const tragedy = portrait.querySelector('.mask-tragedy');
      if (comedy && tragedy) {
        comedy.style.display = sad ? 'none' : '';
        tragedy.style.display = sad ? '' : 'none';
      }
    }
    function render(id) {
      current = id;
      const person = cast[id];
      $('hangoutChatName').textContent = person.name;
      $('hangoutImprovLine').textContent = '';
      if (chat) chat.setWho(id);
      else mountChat();
      $('hangoutName').textContent = person.name;
      $('hangoutSubtitle').textContent = person.subtitle;
      $('hangoutLine').textContent = person.lines[state[id].talk % person.lines.length];
      $('hangoutAction').textContent = person.action;
      const previous = state[id].action ? advance(id, state[id].action - 1) : null;
      $('hangoutProp').textContent = previous?.frame || '✦';
      $('hangoutReply').textContent = previous?.reply || 'Stay a little. There is no quest to finish here.';
      // Prefix paint-server IDs so the portrait cannot collide with the stage SVG.
      $('hangoutPortrait').innerHTML = root.TADC.CAST[id]
        .replace(/\bid="([^"]+)"/g, 'id="hangout-$1"')
        .replace(/url\(#([^)]+)\)/g, 'url(#hangout-$1)');
      paintMask();
      $('hangoutWatch').hidden = typeof root.CircusScenes?.playNext !== 'function';
      $('hangoutWatch').textContent = root.CircusScenes?.active ? '🎬 Return to the scene' : '🎬 Watch the cast';
      tabs.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.person === id)));
      $('hangoutPicks').replaceChildren();
      person.picks.forEach(num => {
        const act = adventures.find(item => item.num === num && !item.soon);
        if (!act) return;
        const link = document.createElement('a'); link.href = act.href;
        link.textContent = `${act.icon} ${act.title}`; $('hangoutPicks').append(link);
      });
    }
    function open(id, trigger) {
      if (dialog.open) return;
      opener = trigger; render(id); dialog.showModal(); $('hangoutClose').focus();
    }
    Object.entries(cast).forEach(([id,person]) => {
      const button = document.createElement('button'); button.type = 'button';
      button.textContent = person.name; button.dataset.person = id;
      button.addEventListener('click', () => render(id));
      tabs.push(button); $('hangoutCast').append(button);
      const stage = $(id);
      stage.addEventListener('click', () => open(id, stage));
    });
    $('hangoutLaunch').addEventListener('click', () => open(current, $('hangoutLaunch')));
    $('hangoutTalk').addEventListener('click', () => {
      const person = cast[current]; state[current].talk++;
      $('hangoutLine').textContent = person.lines[state[current].talk % person.lines.length];
      voice($('hangoutLine').textContent);
    });
    $('hangoutAction').addEventListener('click', () => {
      const next = advance(current, state[current].action); state[current].action = next.count;
      $('hangoutProp').textContent = next.frame; $('hangoutReply').textContent = next.reply;
      voice(next.reply);
      paintMask();
    });
    $('hangoutHear').addEventListener('click', async () => {
      const message = await root.TADC.testVoice?.(current, $('hangoutLine').textContent);
      $('hangoutAudioStatus').textContent = message || 'Character audio is unavailable. Reload the circus and try again.';
    });
    $('hangoutWatch').addEventListener('click', () => {
      if (typeof root.CircusScenes?.playNext !== 'function') return;
      opener = $('sceneBtn') || $('hangoutLaunch');
      dialog.close();
      if (!root.CircusScenes.active) root.CircusScenes.playNext();
    });
    $('hangoutNeural').addEventListener('change', () => {
      root.CircusBrain?.setNeuralEnabled($('hangoutNeural').checked);
    });
    $('hangoutImprov').addEventListener('click', () => {
      if (!root.CircusBrain) return;
      const line = root.CircusBrain.improv(current);
      $('hangoutImprovLine').textContent = `${cast[current].name}: ${line}`;
      voice(line);
    });
    $('hangoutForget').addEventListener('click', () => {
      root.CircusBrain?.forget();
      chat?.destroy(); chat = null; mountChat();
      $('hangoutImprovLine').textContent = 'Our chat and remembered details are cleared.';
    });
    $('hangoutClose').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
      chat?.destroy(); chat = null;
      if (opener && opener.getClientRects().length) opener.focus();
      else $('hangoutLaunch').focus();
    });
    // Native modal dialog supplies Escape, focus containment, and inert background.
    return {open};
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {cast,advance,mount};
  else root.CircusHangouts = {cast,advance,mount};
})(typeof window === 'undefined' ? globalThis : window);
