// ============================================================
// media.js — File selection & quick stats
// ============================================================

import { state, filesData, VIDEO_FAMILIES, PRO_VIDEO_FAMILIES } from './state.js';
import {
  updateOutputFormatOptions, updateVideoCodecAvailability,
  updateAudioCodecAvailability, updateContainerAvailability, updatePanelTags
} from './output.js';
import { refreshFfmpegCommand } from './ffmpeg.js';

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
