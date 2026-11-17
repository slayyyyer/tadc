# Public dialogue sample for the circus

Source: [OpenAssistant Conversations (OASST1)](https://huggingface.co/datasets/OpenAssistant/oasst1),
by the OpenAssistant project and its contributors. This sample is derived from the public,
ready-for-export April 12, 2023 message collection. It is **third-party dialogue, not original circus writing**.

License: **Apache License 2.0**, reproduced unmodified in [LICENSE](LICENSE).
The dataset card and upstream license were checked before import. Retain this attribution, the license,
and the modification description when redistributing this sample.

## Contents

- `train.jsonl`: 152 prompt/reply pairs.
- `validation.jsonl`: 25 pairs.
- `test.jsonl`: 16 pairs.
- `provenance.json`: pinned upstream revision, source URL and SHA-256, file hashes, counts and filtering details.

Each JSONL record has `prompt`, `reply`, upstream message and conversation IDs, source and license.
The importer scanned 88,838 exported messages and retained 193 distinct paired examples after filtering.
These are direct parent/reply exchanges, not necessarily complete or self-contained conversations.
The full upstream collection is larger; this is a deliberately filtered starting sample.

## Changes from upstream

Only short English messages with positive review, non-synthetic status, a quality label of at least 0.5,
low reported toxicity, and zero reported spam/PII/inappropriate/hate/sexual/violence labels are eligible.
Missing required labels are rejected. Contact/identifier patterns, personal-introduction patterns,
code/technical content and the circus's excluded terms are filtered. Both sides of a pair must pass.
Whitespace is normalized; contributor IDs, timestamps and unrelated metadata are omitted.
Exact repeated prompts/replies are removed across the whole sample.

Conversation IDs determine the split with a stable hash (80/10/10 target, not an exact quota).
Whole conversations stay together. Distinct conversations containing identical retained text are
also deduplicated. Do not mix the test split into training or use it repeatedly to choose checkpoints.

## How to use it

Use reviewed examples for general conversational structure, then use original circus dialogue for
character style. Do not label these generic assistant responses as Caine, Pomni or another cast member.
The current GRU learns standalone character lines. Meaningful prompt-conditioned training will need
an explicit prompt/response format and corresponding trainer/runtime changes; obtaining this dataset
does not make the existing model conversationally conditioned.

**The raw sample is not loaded into the browser.** A separately reviewed subset has now been used only
in an isolated prompt/reply pilot (details below). The active model and `assets/corpus.js` are unchanged.
Automated labels and filters do not certify accuracy, appropriateness, or absence of personal details.
A spot check found generic assistant identity statements, context-dependent replies, and outdated factual
claims. Review and adapt the sample before a training run; it is not a source of factual answers.

Recreate the sample from the circus root using Python's standard library:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 tools/import_public_dialogue.py
PYTHONDONTWRITEBYTECODE=1 python3 tools/import_public_dialogue_test.py
```

The download is anonymous, pinned by revision and verified against the publisher's archive SHA-256.
It uses only the public Hugging Face dataset/CDN hosts, no account or API key. The raw compressed export
is processed in memory and is not saved. Only the filtered sample, its license and provenance are stored.

## Reviewed prompt/reply pilot

`review.json` records explicit approvals, exclusions, unreviewed examples, and source hashes.
`reviewed-train.jsonl` contains 26 inspected exchanges; `reviewed-validation.jsonl` contains 6.
Other examples were not used. The 16-example test split remains sealed. Text in the approved records
is unchanged from the attributed import. This subset is small and heavily weighted toward thanks
and acknowledgments; it is a format experiment, not a sufficient dialogue training collection.

The isolated trainer uses **BOS + prompt + SEP + reply + EOS**. Only reply characters and EOS
contribute to the loss; gradients still flow through the prompt. Vocabulary is built only from training
examples, with an explicit unknown character. Overlength examples are rejected rather than silently
cutting off answers. Public responses have one generic `assistant` identity, never a cast label.

```sh
node tools/dialogue.test.cjs
node tools/train_dialogue.cjs --epochs=40
```

Version-2 experimental weights are written only under `tools/training-runs/dialogue-*/`, alongside
an attribution notice, license and results. The live version-1 runtime refuses those weights.

The first pilot completed 40 epochs and selected epoch 20 by validation loss (4.2330 initially,
2.6581 at the selected checkpoint). Shuffling the questions changed loss by only **0.00013**:
there is no useful evidence of prompt understanding. Samples remained garbled. No model was
promoted. The separate two-question synthetic test does learn distinct correct replies, verifying
format, gradient and inference plumbing rather than claiming real-world conversation quality.

Results: `tools/training-runs/dialogue-1791169881771/report.json`. The best checkpoint was chosen
using validation only, not the test split. Further development needs more varied reviewed exchanges
and a larger evaluation set; more epochs on this narrow subset do not solve that limitation.
