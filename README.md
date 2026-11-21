# The Amazing Digital Circus — Fan Break Room

An unofficial, non-commercial fan project built around *The Amazing Digital Circus*. The Big Top is a
browser-based break room: a collection of 33 small games, puzzles, and toys starring the show's cast,
plus a local character chat and a tiny language model trained from scratch.

The site is static HTML, CSS, and JavaScript. There is no build step, no package manager, and no
backend, so the whole thing runs from a folder or any static file host.

**Live site:** https://slayyyyer.github.io/tadc/

## Overview

- **33 playable acts** across four categories: Play, Unwind, Create, and Stories.
- **A Big Top hub** with animated cast members, a working calliope, confetti, and an EXIT sign that
  is painted on (as it should be).
- **Adventure board** with search, mood filters, sorting, a "surprise me" button, and a passport
  that stamps each act you visit.
- **Backstage lounge** where you can talk with the cast. Responses are generated locally in the
  browser; nothing is sent to a server.
- **Comfort controls:** Quiet Mode mutes all audio, Calm Mode reduces motion and effects, and all
  pages respect `prefers-reduced-motion`.
- **Progress and preferences persist** in `localStorage` per browser.

## Running locally

Clone the repository and open `index.html` (or any act page) in a modern browser. No install step is
required.

For a local HTTP server, if you prefer one:

```sh
python3 -m http.server 8000
# then open http://localhost:8000/
```

The pages are written to work from `file://` as well, so double-clicking `index.html` is supported.

## The acts

| # | Adventure | Category |
| --- | --- | --- |
| 01 | [Find the Exit](acts/01-find-the-exit/index.html) | Play |
| 02 | [Abstraction Meter](acts/02-abstraction-meter/index.html) | Unwind |
| 03 | [Caine's Adventure Generator](acts/03-caines-adventure-generator/index.html) | Create |
| 04 | [Kinger's Chess Nightmare](acts/04-kingers-chess-nightmare/index.html) | Play |
| 05 | [Bubble's Snack Attack](acts/05-bubbles-snack-attack/index.html) | Play |
| 06 | [Haunted Night at the Lunar Midway](acts/06-haunted-night-lunar-midway/index.html) | Stories |
| 07 | [The Big Top Band](acts/07-the-big-top-band/index.html) | Create |
| 08 | [Caine's Fireworks Spectacular](acts/08-caines-fireworks-spectacular/index.html) | Unwind |
| 09 | [The Toaster Showdown](acts/09-toaster-showdown/index.html) | Play |
| 10 | [Return of the Infinite Toaster Showdown](acts/10-infinite-toaster-showdown/index.html) | Play |
| 11 | [The Sticky Reading Room](acts/11-sticky-reading-room/index.html) | Create |
| 12 | [Build-a-Zooble](acts/12-build-a-zooble/index.html) | Create |
| 13 | [Pomni's Exit Interview](acts/13-pomnis-exit-interview/index.html) | Stories |
| 14 | [Ragatha's Patchwork](acts/14-ragathas-patchwork/index.html) | Unwind |
| 15 | [Kinger's Pocket Observatory](acts/15-kingers-pocket-observatory/index.html) | Unwind |
| 16 | [Spreadsheet Mansion: Wobbly Edition](acts/16-spreadsheet-mansion/index.html) | Play |
| 17 | [Bubble-gotchi](acts/17-bubblegotchi/index.html) | Unwind |
| 18 | [Jax's Roast Machine](acts/18-jaxs-roast-machine/index.html) | Play |
| 19 | [Caine's Pinball Spectacular](acts/19-caines-pinball/index.html) | Play |
| 20 | [Pomni's Whack-a-Door](acts/20-whack-a-door/index.html) | Play |
| 21 | [Bubble's Word Snack](acts/21-bubbles-word-snack/index.html) | Play |
| 22 | [Gangle's Ribbon Repair](acts/22-gangles-ribbon-repair/index.html) | Unwind |
| 23 | [Kinger's Beetle Bureau](acts/23-kingers-beetle-bureau/index.html) | Play |
| 24 | [Ragatha's Cloud Kitchen](acts/24-ragathas-cloud-kitchen/index.html) | Create |
| 25 | [Pomni's Department of Doors](acts/25-pomnis-department-of-doors/index.html) | Stories |
| 26 | [Zooble's Shadow Theater](acts/26-zoobles-shadow-theater/index.html) | Create |
| 27 | [Caine's Crate Escape](acts/27-caines-crate-escape/index.html) | Play |
| 28 | [Jax's Backwards Bowling](acts/28-jaxs-backwards-bowling/index.html) | Play |
| 29 | [Ragatha's Midnight Tea](acts/29-ragathas-midnight-tea/index.html) | Unwind |
| 30 | [Zooble's Color Bureau](acts/30-zoobles-color-bureau/index.html) | Create |
| 31 | [Kinger's Rain Garden](acts/31-kingers-rain-garden/index.html) | Unwind |
| 32 | [Kinger's Pillow Fort Stacker](acts/32-kingers-pillow-fort/index.html) | Play |
| 33 | [Gangle's Understudy Audition](acts/33-gangles-understudy-audition/index.html) | Stories |

The Big Top also includes a few optional extras: a Break timer that recommends acts based on how much
time you have, a Backstage Bulletin board, a trophy case, and a case file hidden behind the painted
EXIT sign.

Related files:

- `acts/00-backstage/` — the full act index.
- `assets/adventures.js` — the single source of truth for the adventure board. Add a card there and
  it appears on the Big Top and in every act's navigation.

## Project structure

```text
.
├── index.html              # The Big Top hub
├── acts/                   # One directory per adventure, each with its own index.html
│   └── 00-backstage/       # Index of all acts
├── assets/                 # Shared scripts and styles used by the hub and acts
│   ├── adventures.js       # Adventure manifest (titles, links, categories)
│   ├── cast.js             # Cast artwork, dialogue, audio, shared UI helpers
│   ├── castbrain.js        # Local character chat (authored lines and word-chain improv)
│   ├── tinylm.js           # Tiny language model runtime
│   ├── tinylm-weights.js   # Generated model weights, loaded as a script
│   ├── corpus.js           # Original dialogue corpus used for training
│   └── *.test.cjs          # Tests colocated with shared modules
├── corpus-src/             # Per-character source dialogue
├── tools/                  # Node/Python training, import, and repository checks
├── datasets/               # Third-party dialogue sample (OASST1)
├── NOTICE                  # Fan-project and third-party terms
└── LICENSE                 # MIT license for the source code
```

## Local chat and the tiny model

Open **Cast** in the Big Top to chat with a character. Chat runs entirely in the browser:
authored responses and word-chain improv are the default, with an optional **Experimental improv**
mode that uses the trained model. **Forget our chats** clears the widget and the remembered
name/topics; closing the lounge clears the transcript and cancels pending replies. The characters are
playful local toys, not general-purpose assistants.

The model is a speaker-conditioned character GRU trained with pure Node, without packages, external
APIs, or user chat logs. Weights are generated as a normal script so the page also works from a local
file; because they are around 360 KB, the chat stack loads when the lounge opens and the weights and
runtime load only when Experimental improv is first enabled. Runtime checks require every generated
word to appear in the original corpus, reject blocked or copied lines, and fall back to word-chain
improv. Training and validation losses are recorded in
`assets/tinylm-training.json`; the corpus is small enough to overfit, so lower loss is not a claim of
fluent conversation.

Reproduce the original 100-epoch baseline from the repository root:

```sh
node tools/train_tinylm.cjs --hidden=128 --embed=24 --epochs=100 --seed=20261004
```

The trainer uses GRU backpropagation through each complete line, Adam, gradient clipping, seeded
shuffling, and a fixed 10% validation split. It writes a complete weights checkpoint every five
epochs. Training reads only `assets/corpus.js`; changing that file changes the model.

To continue training from the shipped weights:

```sh
node tools/continue_tinylm.cjs --epochs=15 --rate=0.00015 --smoothing=0.06
```

This keeps the original validation split and trains a bounded batch. It saves the previous release,
candidate weights, sample lines, and comparison results under `tools/training-runs/`, and promotes a
candidate only if it has lower held-out cross entropy with no regression across the same 80 seeded
runtime checks. Those checks measure rejection and fallback rates, not writing quality. The
validation set is reused for checkpoint selection, so it is not an independent final benchmark.

The first continuation warm-starts a fresh Adam optimizer because the original run saved only model
weights. Later promoted checkpoints also save exact optimizer state, and a fingerprint check prevents
reusing it with unrelated weights or a changed corpus. The active release is unchanged during
training, and Experimental improv remains opt-in regardless of the outcome.

Caine's Crate Escape also includes a local planning helper: **Ask Caine for a hint** finds a shortest
route from the current position. It yields between search batches, distinguishes a dead end from its
search limit, and cancels when the board changes. It never moves the crates for you.

## Tests

The test suites use Node's built-in `assert` and require no dependencies. A test file lives beside the
module it covers (for example `assets/hangouts.test.cjs`).

```sh
node tools/train_tinylm.test.cjs
node tools/trained-tinylm.test.cjs
node tools/tinylm.test.cjs
node tools/castbrain-chat.test.cjs
node assets/hangouts.test.cjs
node tools/links.test.cjs
```

`tools/links.test.cjs` checks that every local `href`/`src` and explicit local path in the shipped
scripts resolves on disk.

To run every test in the repository:

```sh
for test in $(find . -name '*.test.cjs' -not -path './tools/training-runs/*' | sort); do
  echo "== $test"
  node "$test" || exit 1
done
```

One Python test covers the dialogue importer:

```sh
cd tools && python3 -m unittest -v import_public_dialogue_test
```

Gradient tests use numerical finite differences for all tensor families, then test actual learning
and seeded reproducibility. The shipped-model test checks dimensions, finite weights, size, runtime
sampling, and fallback behavior.

## Deployment

The site is published to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main` (or
manually via **Run workflow**). The workflow runs the Node and Python test suites, stages the
playable site (`index.html`, `acts/`, `assets/`, `LICENSE`, `NOTICE`) as static files, deploys it, and
then verifies that the hub, an act page, and shared CSS and JavaScript assets return HTTP 200 with the
expected content types. Training runs, corpora, the OASST1 sample and the trainer tooling stay in the
repository and are not uploaded.

Because the project is static, it can also be hosted on any file server or CDN with no configuration.

## Accessibility

- Fully keyboard operable: act navigation, poster board, dialogs, and the cast lounge.
- Quiet Mode mutes all synthesized audio; Calm Mode reduces animation and effects.
- `prefers-reduced-motion` is honored across pages.
- Dialog semantics (`aria-modal`, labels, focus management, live regions) are used for overlays and
  status messages.

## License and fan-project notice

This is an unofficial, non-commercial *The Amazing Digital Circus* fan project. It is not affiliated
with or endorsed by Glitch Productions, and the characters belong to their respective owners.

The source code is MIT licensed; see `LICENSE`. Fan content, generated model output, and third-party
material are covered by the terms in `NOTICE`. In short: the code is reusable, the fan writing and
artwork are for personal, non-commercial use, and the OASST1 dialogue sample and Google Fonts carry
their own licenses.

If you are a rights holder and would like something changed or removed, please open an issue and it
will be handled promptly.
