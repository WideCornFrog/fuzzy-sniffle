// ============================================================
// details.js — Quick stats modal / info viewer
// ============================================================

import { state, filesData, fileOrder } from './state.js';

export function openInfoModal() {
  if (!state.selectedFileId) return;
  updateInfoModalContent();
  switchInfoTab('general', document.getElementById('tab-btn-general'));
  document.getElementById('infoModal').classList.add('active');
}

export function closeInfoModal() {
  document.getElementById('infoModal').classList.remove('active');
}

export function switchInfoTab(tabId, btnEl) {
  document.querySelectorAll('.info-tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.info-tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-content-' + tabId).classList.add('active');
  btnEl.classList.add('active');
}

export function navigateFile(direction) {
  const cur = fileOrder.indexOf(state.selectedFileId);
  const next = cur + direction;
  if (next >= 0 && next < fileOrder.length) {
    const newId = fileOrder[next];
    document.querySelectorAll('.media-item').forEach(el => el.classList.remove('active'));
    const el = document.querySelector(`.media-item[data-id="${newId}"]`);
    if (el) {
      el.classList.add('active');
      import('./media.js').then(m => m.selectMediaItem(el, newId));
    }
    updateInfoModalContent();
  }
}

function updateInfoModalContent() {
  if (!state.selectedFileId) return;
  const file = filesData[state.selectedFileId];
  document.getElementById('info-modal-title').textContent = `Media Information: ${file.name}`;

  const populate = (id, data) =>
    document.getElementById(id).innerHTML = data.map(r => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('');

  populate('list-general', file.details.general);
  populate('list-tags', file.details.tags);

  const vBtn = document.getElementById('tab-btn-video');
  if (file.hasVideo && file.details.video) {
    vBtn.classList.remove('hidden-tab');
    populate('list-video', file.details.video);
  } else vBtn.classList.add('hidden-tab');

  const aBtn = document.getElementById('tab-btn-audio');
  if (file.hasAudio && file.details.audio) {
    aBtn.classList.remove('hidden-tab');
    populate('list-audio', file.details.audio);
  } else aBtn.classList.add('hidden-tab');

  const idx = fileOrder.indexOf(state.selectedFileId);
  document.getElementById('btn-prev-file').disabled = (idx === 0);
  document.getElementById('btn-next-file').disabled = (idx === fileOrder.length - 1);
}
