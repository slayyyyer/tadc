# 🫧 Hiiii new member!!

It's me, **Bubble**! Welcome to **THE AMAZING DIGITAL CIRCUS**, a coding-break big top!

🎪 **Now showing online at https://slayyyyer.github.io/tadc/** — the whole tent, no download!

🎟️ **ADMIT ONE (FOREVER)**

- **Double-click `index.html`** to go into the tent. Watch your step, the floor is checkered and infinite!
- **The adventures** live in `acts/`:
  - `01-find-the-exit/`: help Pomni find the exit! (there is no exit)
  - `02-abstraction-meter/`: keep your mind in one piece during your break
  - `03-caines-adventure-generator/`: Caine spins up a brand-new adventure idea
  - `04-kingers-chess-nightmare/`: play chess against Kinger (he's doing his best)
  - `05-bubbles-snack-attack/`: help ME eat code-snacks! Yum!
  - `06-haunted-night-lunar-midway/`: a moon date with Gangle (and a mildly haunted mime)
  - `07-the-big-top-band/`: write a song and the whole cast plays it! I'm the pops!
  - `08-caines-fireworks-spectacular/`: fireworks shaped like all of us!! (I look great in fire)
  - `09-toaster-showdown/`: a toast puzzle on a game show! Jax is being NICE (it's creepy)
  - `10-infinite-toaster-showdown/`: a RHYTHM game with a toaster! Laughing turns gravity off! Wheee!
  - `11-sticky-reading-room/`: a squishy soundboard in a library where the books stare back
  - `12-build-a-zooble/`: build your own weird creature out of parts (Zooble is judging)
  - `13-pomnis-exit-interview/`: type commands, find the exit! (you know how this ends)
  - `14-ragathas-patchwork/`: sew a cozy quilt with Ragatha (she says drink some water!)
  - `15-kingers-pocket-observatory/`: remember constellations with Kinger
  - `16-spreadsheet-mansion/`: a platformer in a haunted spreadsheet! Ragatha says something HONEST!
  - `17-bubblegotchi/`: ME! As a PET! Feed me! Play with me! Don't forget me!
  - `18-jaxs-roast-machine/`: Jax roasts your made-up commit messages at three heat levels. Ragatha objects!
  - `19-caines-pinball/`: PINBALL! Spell E-X-I-T and the door opens... onto a painted wall. Classic!
  - `20-whack-a-door/`: BONK the painted doors! Don't bonk me! (bonk me a little)
  - `21-bubbles-word-snack/`: guess the word! Wrong letters are MINE. *chomp*
  - `22-gangles-ribbon-repair/`: Rotate tangled tiles into three complete ribbons. Gangle supplies patience and unlimited hints.
  - `23-kingers-beetle-bureau/`: Match eight pairs of imaginary insects in sixteen very official drawers.
  - `24-ragathas-cloud-kitchen/`: Mix sunbeams, giggles and stardust to discover six impossible recipes.
  - `25-pomnis-department-of-doors/`: Navigate exit paperwork, collect unlikely objects, and discover four unusual endings.
  - `26-zoobles-shadow-theater/`: Arrange odd silhouettes, change the scenery, and save your own shadow play as a picture.
  - `27-caines-crate-escape/`: Push theatrical props onto their marks in four puzzle rooms. Unlimited undo; limited cooperation from the crates.
  - `28-jaxs-backwards-bowling/`: Bank shots around suspicious obstacles in a five-frame bowling game. Jax insists the alley is regulation.
  - `29-ragathas-midnight-tea/`: Brew eight very particular cups with tea, honey, mint and patience. Every guest deserves a warm welcome.
  - `30-zoobles-color-bureau/`: Mix red, green and blue light to match six colors. Numeric clues and optional exact hints included.
  - `31-kingers-rain-garden/`: Plant moonbells and mushrooms, invite the rain, and save a little garden that never withers.
  - `32-kingers-pillow-fort/`: stack pillows SO HIGH for Kinger! (I nudge the tower sometimes. Sorry!)
- **Psst.** Have you looked closely at the painted EXIT sign on the Big Top? Click it. Torn ticket stubs are hiding in some of the adventures... 🎟️
- **⏱️ Break** (top-left of the Big Top): tell Caine how long your break is and he'll pick adventures that fit, then nudge you back to work.
- **📌 Backstage Bulletin** (in the poster board): notes left for each other while building the circus.

Want a new adventure? Spin the wheel in Act 03 and use the card it gives you.

Oh, and there's no exit! Bye!! 🫧🫧🫧

## Local cast chat and tiny-model training

Open **Hang out with the cast**, pick a character, and use the chat box or **Make something up**.
Responses and synthesized babble run locally. **Forget our chats** clears the chat widget and the brain's
remembered name/topics; closing the lounge clears its transcript and cancels pending replies.
The characters are playful local toys, not general-purpose assistants. **Experimental improv** is off by default;
turn it on to try the tiny trained model. Its dialogue can still be muddled. Normal chat uses authored
responses and word-chain improv.

The original dialogue corpus feeds a speaker-conditioned character GRU trained with pure Node,
without packages, external APIs, or user chat logs. The generated weights are loaded as a normal script,
so the page also works from a local file. Runtime checks require every generated word to exist in the original corpus, reject blocked or copied lines and fall back to the
existing word-chain improv. Training/validation losses are recorded in `assets/tinylm-training.json`;
this small corpus can overfit, so loss reduction is not a claim of fluent conversation.

Reproduce the original 100-epoch baseline from the circus root:

```sh
node tools/train_tinylm.cjs --hidden=128 --embed=24 --epochs=100 --seed=20261004
node tools/train_tinylm.test.cjs
node tools/trained-tinylm.test.cjs
node tools/tinylm.test.cjs
node tools/castbrain-chat.test.cjs
node assets/hangouts.test.cjs
```

The trainer uses GRU backpropagation through each complete line, Adam, gradient clipping, seeded
shuffling, and a fixed 10% validation split. It writes a complete weights checkpoint every five epochs.
Gradient tests use numerical finite differences for all tensor families, then test actual learning and
seeded reproducibility. The shipped-model test checks its dimensions, finite weights, size, runtime
sampling, and fallback behavior. Training only uses `assets/corpus.js`; changing that file changes the model.

**Caine's Crate Escape** also has a local planning helper: **Ask Caine for a hint** finds a shortest route
from the current position. It yields between search batches, distinguishes a dead end from its search
limit, and cancels when the board changes. It never moves the crates for you.

### Continuing the local model

```sh
node tools/continue_tinylm.cjs --epochs=15 --rate=0.00015 --smoothing=0.06
```

This starts from the shipped weights, keeps the original validation split, and trains another bounded
batch. It saves the previous release, candidate weights, sample lines and comparison results inside
`tools/training-runs/`. It promotes only a candidate with lower held-out cross entropy and no decline
in the same 80 seeded runtime checks. Those checks measure rejection/fallback rates, not fluent writing.
The validation set is reused for checkpoint selection, so it is not an independent final benchmark.

The first continuation warm-starts a fresh Adam optimizer because the original run saved only model
weights. Later promoted checkpoints also save exact optimizer state; a fingerprint check prevents
reusing it with unrelated weights or a changed corpus. The active release stays unchanged during
training. Experimental improv remains opt-in regardless of the outcome.

## License and fan-project notice

This is an unofficial, non-commercial *The Amazing Digital Circus* fan project — not affiliated with
or endorsed by Glitch Productions, and the characters belong to their respective owners. The source
code is MIT licensed; see `LICENSE`. The fan content, generated model output and third-party material
are covered by the terms in `NOTICE`.
