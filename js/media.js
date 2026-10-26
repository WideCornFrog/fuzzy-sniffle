// ============================================================
// media.js — File selection, simulated explorer & quick stats
// ============================================================

import { state, filesData, fileOrder, VIDEO_FAMILIES, PRO_VIDEO_FAMILIES } from './state.js';
import {
  updateOutputFormatOptions, updateVideoCodecAvailability,
  updateAudioCodecAvailability, updateContainerAvailability, updatePanelTags
} from './output.js';
import { refreshFfmpegCommand } from './ffmpeg.js';

// Close bulk dropdown when clicking outside
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('bulk-select-dropdown');
  if (dropdown && dropdown.classList.contains('active')) {
    if (!e.target.closest('.bulk-select-wrapper')) {
      dropdown.classList.remove('active');
    }
  }
});

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
  item.dataset.type = file.type; // Store type for bulk selection
  
  // Update the click handler to pass the event object for multi-select (Ctrl/Cmd)
  item.onclick = (e) => selectMediaItem(item, fileId, e);
  
  item.innerHTML = `
    <div class="filename">${file.name}</div>
    <div class="progress-bg"></div><div class="progress-fill" style="width: 100%;"></div>
  `;
  
  list.appendChild(item);
  closeFileExplorer();
  selectMediaItem(item, fileId, null);
}

// ---- Bulk Selection Split Button ----
export function toggleBulkSelectDropdown(e) {
  e.stopPropagation();
  document.getElementById('bulk-select-dropdown').classList.toggle('active');
}

export function triggerBulkSelect() {
  selectAllMedia(state.bulkSelectMode);
}

export function selectBulkMode(mode, btnElement) {
  state.bulkSelectMode = mode;
  
  // Update button text
  document.getElementById('btn-bulk-main-text').textContent = btnElement.textContent;
  
  // Update active state in dropdown
  document.querySelectorAll('.bulk-select-dropdown button').forEach(btn => btn.classList.remove('active-option'));
  btnElement.classList.add('active-option');
  
  // Close dropdown
  document.getElementById('bulk-select-dropdown').classList.remove('active');
  
  // Trigger the selection immediately
  selectAllMedia(mode);
}

export function selectAllMedia(type) {
  document.querySelectorAll('.media-item').forEach(el => el.classList.remove('active'));
  state.selectedFileIds = [];
  
  let firstId = null;
  document.querySelectorAll('.media-item').forEach(el => {
    if (type === 'all' || el.dataset.type === type) {
      el.classList.add('active');
      const id = el.dataset.id;
      state.selectedFileIds.push(id);
      if (!firstId) firstId = id;
    }
  });
  
  if (firstId) {
    updateSettingsForFile(firstId);
  } else {
    clearSettings();
  }
}

// ---- Media Selection ----
export function selectMediaItem(element, fileId, event = null) {
  const isMultiSelect = event && (event.ctrlKey || event.metaKey);
  
  // If it's a standard click, clear all other selections
  if (!isMultiSelect) {
    document.querySelectorAll('.media-item').forEach(el => el.classList.remove('active'));
    state.selectedFileIds = [];
  }
  
  // If multi-selecting and clicking an already active item, deselect it
  if (element.classList.contains('active') && isMultiSelect) {
    element.classList.remove('active');
    state.selectedFileIds = state.selectedFileIds.filter(id => id !== fileId);
    if (state.selectedFileIds.length > 0) {
      updateSettingsForFile(state.selectedFileIds[state.selectedFileIds.length - 1]);
    } else {
      clearSettings();
    }
    return;
  }
  
  // Add to selection
  element.classList.add('active');
  if (!state.selectedFileIds.includes(fileId)) {
    state.selectedFileIds.push(fileId);
  }
  
  updateSettingsForFile(fileId);
}

// Extracted to support bulk select keeping the UI in sync with the last selected file
function updateSettingsForFile(fileId) {
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
