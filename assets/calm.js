/* Big-top visual preference; independent of audio and act gameplay. */
(function (root) {
  'use strict';
  const media = root.matchMedia('(prefers-reduced-motion: reduce)');
  const key = 'tadc-big-top-calm-v1';
  let saved;
  try { saved = root.localStorage.getItem(key); } catch {}
  let explicit = saved === 'true' || saved === 'false';
  let enabled = explicit ? saved === 'true' : media.matches;
  function paint() {
    document.documentElement.classList.toggle('circus-calm', enabled);
    const button = document.getElementById('calmBtn');
    if (button) {
      button.textContent = enabled ? '☁ Calm: on' : '☁ Calm: off';
      button.setAttribute('aria-pressed', String(enabled));
      button.title = 'Reduce motion and visual surprises in the big top. Sound has its own switch.';
    }
    const confetti = document.getElementById('confettiBtn');
    if (confetti) { confetti.disabled = enabled; confetti.title = enabled ? 'Confetti rests in Calm Mode' : 'Throw confetti'; }
    if (enabled) document.getAnimations?.().forEach(animation => animation.cancel());
  }
  function set(value) {
    enabled = !!value; explicit = true;
    try { root.localStorage.setItem(key, String(enabled)); } catch {}
    paint();
  }
  root.CircusCalm = { get: () => enabled, set, toggle: () => set(!enabled) };
  media.addEventListener?.('change', event => { if (!explicit) { enabled = event.matches; paint(); } });
  root.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    const value = event.key === null ? null : event.newValue;
    explicit = value === 'true' || value === 'false';
    enabled = explicit ? value === 'true' : media.matches; paint();
  });
  paint();
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('calmBtn').addEventListener('click', () => root.CircusCalm.toggle());
    paint();
  });
})(window);
