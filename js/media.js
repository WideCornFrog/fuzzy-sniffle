// ============================================================
// media.js — File selection, simulated explorer & quick stats
// ============================================================

import { state, filesData, fileOrder, VIDEO_FAMILIES, PRO_VIDEO_FAMILIES } from './state.js';
import {
  updateOutputFormatOptions, updateVideoCodecAvailability,
  updateAudioCodecAvailability, updateContainerAvailability, updatePanelTags
} from './output.js';
import { refreshFfmpegCommand } from './ffmpeg.js';

// ---- Simulated File Explorer ----
export function openFileExplorer() {
  renderFileExplorer();
  document.getElementById('fileExplorerModal').classList.add('active');
}

export function closeFileExplorer() {
  document.getElementById('fileExplorerModal').classList.remove('active');
}

function renderFileExplorer() {
  const list = document.getElementById('file-explorer-list');
  list.innerHTML = '';

  fileOrder.forEach(id => {
    const file = filesData[id];
    const isLoaded = state.loadedFileIds.includes(id);

    const item = document.createElement('div');
    item.className = 'file-explorer-item' + (isLoaded ? ' disabled' : '');
    item.innerHTML = `
      <div class="fe-icon">📄</div>
      <div class="fe-info">
        <div class="fe-name">${file.name}</div>
        <div class="fe-meta">${file.type.toUpperCase()} • ${file.stats.find(s => s.label === 'Size')?.value || 'Unknown size'}</div>
      </div>
      <button class="btn-${isLoaded ? 'cancel' : 'confirm'}" style="padding: 4px 12px; font-size: 12px;" ${isLoaded ? 'disabled' : ''}>${isLoaded ? 'Added' : 'Add'}</button>
    `;
    
    if (!isLoaded) {
      item.onclick = () => addFileToGUI(id);
    }
    list.appendChild(item);
  });
}

export function addFileToGUI(fileId) {
  if (state.loadedFileIds.includes(fileId)) return;
  state.loadedFileIds.push(fileId);
  
  const list = document.getElementById('media-list');
  const emptyText = document.getElementById('empty-list-text');
  if (emptyText) emptyText.style.display = 'none';

  const file = filesData[fileId];
  const item = document.createElement('div');
  item.className = 'media-item';
  item.dataset.id = fileId;
  item.onclick = () => selectMediaItem(item, fileId);
  item.innerHTML = `
    <div class="filename">${file.name}</div>
    <div class="progress-bg"></div><div class="progress-fill" style="width: 100%;"></div>
  `;
  
  list.appendChild(item);
  closeFileExplorer();
  selectMediaItem(item, fileId);
}

// ---- Media Selection ----
export function selectMediaItem(element, fileId) {
  document.querySelectorAll('.media-item').forEach(el => el.classList.remove('active'));
  element.classList.add('active');

  state.selectedFileId = fileId;
  const file = filesData[fileId];

  document.getElementById('box-video').classList.remove('no-file');
  document.getElementById('box-audio').classList.remove('no-file');

  renderQuickStats(fileId);
  document.getElementById('btn-view-details').disabled = false;

  const videoToggle = document.getElementById('enable-video');
  const audioToggle = document.getElementById('enable-audio');
  const boxVideo = document.getElementById('box-video');
  const boxAudio = document.getElementById('box-audio');

  if (file.hasVideo) {
    videoToggle.disabled = false; videoToggle.checked = true; boxVideo.classList.remove('disabled-box');
  } else {
    videoToggle.disabled = true;  videoToggle.checked = false; boxVideo.classList.add('disabled-box');
  }
  if (file.hasAudio) {
    audioToggle.disabled = false; audioToggle.checked = true; boxAudio.classList.remove('disabled-box');
  } else {
    audioToggle.disabled = true;  audioToggle.checked = false; boxAudio.classList.add('disabled-box');
  }

  const videoFam = VIDEO_FAMILIES[document.getElementById('video-codec').value];
  state.currentVideoCategory = PRO_VIDEO_FAMILIES.includes(videoFam) ? 'pro' : 'normal';

  updateOutputFormatOptions();
  updateVideoCodecAvailability();
  updateAudioCodecAvailability();
  updateContainerAvailability();
  updatePanelTags();
  refreshFfmpegCommand();
}

function renderQuickStats(fileId) {
  const file = filesData[fileId];
  const container = document.getElementById('stats-container');
  container.innerHTML = '';
  file.stats.forEach(stat => {
    const badge = document.createElement('div');
    badge.className = 'stat-badge';
    badge.innerHTML = `<span class="label">${stat.label}</span> ${stat.value}`;
    container.appendChild(badge);
  });
}
