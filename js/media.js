// ============================================================
// media.js — File selection, simulated explorer & quick stats
// ============================================================

import { state, fileTemplates, filesData, fileOrder, VIDEO_FAMILIES, PRO_VIDEO_FAMILIES } from './state.js';
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

  Object.keys(fileTemplates).forEach(baseId => {
    const file = fileTemplates[baseId];

    const item = document.createElement('div');
    item.className = 'file-explorer-item';
    item.innerHTML = `
      <div class="fe-icon">📄</div>
      <div class="fe-info">
        <div class="fe-name">${file.name}</div>
        <div class="fe-meta">${file.type.toUpperCase()} • ${file.stats.find(s => s.label === 'Size')?.value || 'Unknown size'}</div>
      </div>
      <button class="btn-confirm" style="padding: 4px 12px; font-size: 12px;">Add</button>
    `;
    
    item.onclick = () => addFileToGUI(baseId);
    list.appendChild(item);
  });
}

export function addFileToGUI(baseId) {
  const id = 'item_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  
  filesData[id] = JSON.parse(JSON.stringify(fileTemplates[baseId]));
  filesData[id].id = id;
  fileOrder.push(id);

  closeFileExplorer();
  renderMediaList();
  selectMediaItem(id);
}

// ---- HELPER: Generate the exact inline text ----
function getInlineMetadata(file) {
  const isVid = file.hasVideo;
  const stats = file.stats;
  const getStat = (label) => stats.find(s => s.label === label)?.value || '';

  if (isVid) {
    const parts = [];
    
    // 1. Video Codec (e.g., HEVC)
    const vCodec = getStat('Video').split(' ')[0];
    if (vCodec) parts.push(vCodec);

    // 2. Resolution (e.g., 1080p)
    const hStr = file.details?.video?.find(d => d[0] === 'Height:')?.[1] || '';
    const h = parseInt(hStr.replace(/\D/g, ''), 10);
    if (h) parts.push(h === 2160 ? '4K' : `${h}p`);

    // 3. Framerate (e.g., 24fps)
    const fps = getStat('FPS');
    if (fps) parts.push(`${fps}fps`);

    // 4. Audio Codec (e.g., AAC)
    const aStr = getStat('Audio');
    if (aStr) parts.push(aStr.split('/')[0].trim());

    // 5. Audio Channels (e.g., Mono)
    const cStr = file.details?.audio?.find(d => d[0] === 'Channel(s):')?.[1] || '';
    if (cStr.includes('1')) parts.push('Mono');
    else if (cStr.includes('2')) parts.push('Stereo');
    else if (cStr.includes('6')) parts.push('5.1');
    else if (cStr.includes('8')) parts.push('7.1');
    else if (cStr) parts.push(cStr);

    return parts.join(' • ');
  } else {
    // Audio only fallback
    return file.stats
      .filter(s => s.label !== 'Length' && s.label !== 'Size')
      .map(s => s.value)
      .join(' • ');
  }
}

// ---- RENDER MEDIA LIST ----
function generateHUD(file) {
  const isVid = file.hasVideo;
  const stats = file.stats;
  const getStat = (label) => stats.find(s => s.label === label)?.value || 'N/A';

  if (isVid) {
    return `
      <div class="tt-grid">
        <div class="tt-item"><span class="tt-key">Format</span><span class="tt-val">${file.name.split('.').pop().toUpperCase()}</span></div>
        <div class="tt-item"><span class="tt-key">Video</span><span class="tt-val">${getStat('Video').split(' ')[0]}</span></div>
        <div class="tt-item"><span class="tt-key">Res</span><span class="tt-val">${file.details?.video?.find(d => d[0] === 'Width:')?.[1] || 'N/A'} x ${file.details?.video?.find(d => d[0] === 'Height:')?.[1] || 'N/A'}</span></div>
        <div class="tt-item"><span class="tt-key">FPS</span><span class="tt-val">${getStat('FPS')} fps</span></div>
        <div class="tt-item"><span class="tt-key">Audio</span><span class="tt-val">${getStat('Audio') || 'None'}</span></div>
        <div class="tt-item"><span class="tt-key">Length</span><span class="tt-val">${getStat('Length')}</span></div>
      </div>
    `;
  } else {
    return `
      <div class="tt-grid">
        <div class="tt-item"><span class="tt-key">Format</span><span class="tt-val">${file.name.split('.').pop().toUpperCase()}</span></div>
        <div class="tt-item"><span class="tt-key">Audio</span><span class="tt-val">Lossless</span></div>
        <div class="tt-item"><span class="tt-key">Bitrate</span><span class="tt-val">N/A</span></div>
        <div class="tt-item"><span class="tt-key">Depth</span><span class="tt-val">16-bit</span></div>
        <div class="tt-item"><span class="tt-key">Rate</span><span class="tt-val">44.1 kHz</span></div>
        <div class="tt-item"><span class="tt-key">Length</span><span class="tt-val">${getStat('Length')}</span></div>
      </div>
    `;
  }
}

export function renderMediaList() {
  const panel = document.getElementById('media-panel');
  
  if (fileOrder.length === 0) {
    panel.innerHTML = '<div class="empty-list-text" id="empty-list-text">No media added yet.<br>Click above to browse.</div>';
    return;
  }

  const videos = fileOrder.filter(id => filesData[id].type === 'video');
  const audios = fileOrder.filter(id => filesData[id].type === 'audio');

  let html = `
    <div class="global-toolbar">
      <label>
        <input type="checkbox" class="select-all-cb" id="global-select" onchange="toggleGlobalSelect(this.checked)">
        Select All Files
      </label>
    </div>
  `;

  const renderGroup = (title, type, items) => {
    if (items.length === 0) return '';
    
    let groupHtml = `
      <div class="group-header">
        <div class="group-title">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
          ${title} (${items.length})
        </div>
        <button class="group-select-all" onclick="toggleGroupSelect('${type}')">Select All ${type.charAt(0).toUpperCase() + type.slice(1)}</button>
      </div>
    `;

    items.forEach(id => {
      const file = filesData[id];
      const isSelected = state.selectedFileIds.includes(id);
      const hudContent = generateHUD(file);
      const inlineMeta = getInlineMetadata(file);

      groupHtml += `
        <div class="media-row" id="row-${id}">
          <input type="checkbox" class="row-checkbox" ${isSelected ? 'checked' : ''} onchange="toggleRowSelect('${id}', this.checked)">
          <div class="col-info" onclick="selectMediaItem('${id}')">
            <div class="col-name">${file.name}</div>
            <div class="col-meta">${inlineMeta}</div>
          </div>
          <div class="col-size">${file.stats.find(s => s.label === 'Size')?.value || ''}</div>
          <div class="col-actions">
            <div class="tooltip-wrapper">
              <button class="btn-icon" title="Info">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><circle cx="12" cy="8" r="1.5" fill="currentColor" stroke="none"></circle>
                </svg>
              </button>
              <div class="info-tooltip">${hudContent}</div>
            </div>
            <button class="btn-icon btn-remove" title="Remove" onclick="removeMediaItem('${id}', event)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      `;
    });
    return groupHtml;
  };

  html += renderGroup('Video Files', 'video', videos);
  html += renderGroup('Audio Files', 'audio', audios);

  panel.innerHTML = html;
  syncCheckboxStates();
}

// ---- SELECTION LOGIC ----
export function toggleRowSelect(id, isChecked) {
  if (isChecked) {
    if (!state.selectedFileIds.includes(id)) state.selectedFileIds.push(id);
    selectMediaItem(id);
  } else {
    state.selectedFileIds = state.selectedFileIds.filter(fId => fId !== id);
    if (state.selectedFileId === id) {
      if (state.selectedFileIds.length > 0) {
        selectMediaItem(state.selectedFileIds[state.selectedFileIds.length - 1]);
      } else {
        clearSettings();
      }
    }
  }
  syncCheckboxStates();
  updateSelectionUI();
}

export function toggleGlobalSelect(isChecked) {
  if (isChecked) {
    state.selectedFileIds = [...fileOrder];
    if (fileOrder.length > 0) selectMediaItem(fileOrder[0]);
  } else {
    state.selectedFileIds = [];
    clearSettings();
  }
  renderMediaList();
  updateSelectionUI();
}

export function toggleGroupSelect(type) {
  const itemsOfType = fileOrder.filter(id => filesData[id].type === type);
  const allSelected = itemsOfType.every(id => state.selectedFileIds.includes(id));
  
  if (allSelected) {
    state.selectedFileIds = state.selectedFileIds.filter(id => !itemsOfType.includes(id));
    if (state.selectedFileId && !state.selectedFileIds.includes(state.selectedFileId)) {
      if (state.selectedFileIds.length > 0) selectMediaItem(state.selectedFileIds[state.selectedFileIds.length - 1]);
      else clearSettings();
    }
  } else {
    itemsOfType.forEach(id => {
      if (!state.selectedFileIds.includes(id)) state.selectedFileIds.push(id);
    });
    if (itemsOfType.length > 0) selectMediaItem(itemsOfType[0]);
  }
  renderMediaList();
  updateSelectionUI();
}

function syncCheckboxStates() {
  const globalCb = document.getElementById('global-select');
  if (globalCb) {
    globalCb.checked = fileOrder.length > 0 && state.selectedFileIds.length === fileOrder.length;
  }
}

// ---- MEDIA SELECTION (Right Panel Sync) ----
export function selectMediaItem(id) {
  state.selectedFileId = id;
  if (!state.selectedFileIds.includes(id)) {
    state.selectedFileIds.push(id);
    syncCheckboxStates();
    updateSelectionUI();
  }
  
  const file = filesData[id];

  document.getElementById('box-video').classList.remove('no-file');
  document.getElementById('box-audio').classList.remove('no-file');

  renderQuickStats(id);
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

function clearSettings() {
  state.selectedFileId = null;
  document.getElementById('box-video').classList.add('no-file');
  document.getElementById('box-audio').classList.add('no-file');
  document.getElementById('btn-view-details').disabled = true;
  document.getElementById('stats-container').innerHTML = '<span class="empty-text">Select a file to view statistics</span>';
  document.getElementById('ffmpeg-cmd').value = '';
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

// ---- REMOVE ITEM ----
export function removeMediaItem(id, event) {
  if (event) event.stopPropagation();

  state.selectedFileIds = state.selectedFileIds.filter(fId => fId !== id);
  const index = fileOrder.indexOf(id);
  if (index > -1) fileOrder.splice(index, 1);
  delete filesData[id];

  if (state.selectedFileId === id) {
    if (fileOrder.length > 0) {
      selectMediaItem(fileOrder[0]);
    } else {
      clearSettings();
    }
  }

  renderMediaList();
  updateSelectionUI();
}

// ---- UI UPDATE HELPER ----
function updateSelectionUI() {
  const count = state.selectedFileIds.length;
  const btn = document.getElementById('btn-encode-text');
  if (btn) {
    if (count > 1) btn.textContent = `Encode ${count} selected files`;
    else btn.textContent = 'Encode selected files';
  }
}
