/* Playback and replay UI for the original cast conversations. */
(() => {
  'use strict';
  const api = window.CircusScenes;
  const $ = id => document.getElementById(id);
  const library = $('sceneLibrary');
  let opener;
  function open(trigger) {
    if (library.open) return;
    opener = trigger;
    $('sceneLibraryProgress').textContent = `${api.progress().heard} of ${api.SCENES.length} scenes visited. Pick any scene to watch again.`;
    library.showModal(); $('sceneLibraryClose').focus();
  }
  api.SCENES.forEach((scene, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = `${String(index + 1).padStart(2, '0')} · ${scene.title}`;
    button.addEventListener('click', () => { library.close(); api.playScene(scene.id); });
    $('sceneLibraryList').append(button);
  });
  $('voiceTest').addEventListener('click', async () => {
    $('voiceTestStatus').textContent = 'Starting character sound…';
    const message = await window.TADC?.testVoice?.();
    $('voiceTestStatus').textContent = message || 'Character audio is unavailable. Reload the circus and try again.';
  });
  $('sceneBtn').addEventListener('click', () => open($('sceneBtn')));
  $('sceneBrowse').addEventListener('click', () => open($('sceneBrowse')));
  $('sceneLibraryClose').addEventListener('click', () => library.close());
  library.addEventListener('close', () => {
    if (opener?.getClientRects().length) opener.focus(); else $('sceneBtn').focus();
  });
  $('scenePause').addEventListener('click', () => api.paused ? api.resume() : api.pause());
  $('sceneNext').addEventListener('click', () => api.playNext());
  api.subscribe(state => {
    $('scenePlayback').hidden = !state.active;
    $('sceneTitle').textContent = state.title.replace(/^🎬\s*/, '');
    $('sceneSpeaker').textContent = state.index ? `${state.speaker} · line ${state.index} of ${state.total}` : 'The cast is taking their places…';
    $('sceneCaption').textContent = state.line;
    $('scenePause').textContent = state.paused ? '▶ Resume' : 'Ⅱ Pause';
    $('scenePause').setAttribute('aria-pressed', String(state.paused));
  });
})();
