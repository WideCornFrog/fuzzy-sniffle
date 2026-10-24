// ============================================================
// output.js — Output format select + codec availability rules
// ============================================================

import {
  state, filesData, CONTAINERS,
  VIDEO_FAMILIES, AUDIO_FAMILIES,
  CONTAINER_VIDEO_SUPPORT, CONTAINER_AUDIO_SUPPORT,
  ALL_AUDIO_EXTENSIONS, AUDIO_EXTENSIONS, ALL_AUDIO_FAMILIES,
  getContainersForVideoFamily, getContainersForAudioFamily,
  getAudioCodecsForExtension, AUDIO_CODEC_DISPLAY,
  getAllowedAudioFamilies
} from './state.js';

import {
  refreshSelect, sortSelectOptions
} from './custom-select.js';

import { isVideoBasicEdited, isVideoAdvancedEdited, updateVideoOptions } from './video.js';
import { isAudioBasicEdited, isAudioAdvancedEdited, updateAudioOptions } from './audio.js';
import { scheduleRefresh } from './ffmpeg.js';

let lastVideoContainer = 'MKV (Matroska)';
let lastAudioExtension = null;

export function isTreatAsAudioOnly() {
  const file = state.selectedFileId ? filesData[state.selectedFileId] : null;
  if (!file) return false;
  const videoEnabled = document.getElementById('enable-video').checked;
  return !file.hasVideo || (file.hasVideo && !videoEnabled);
}

export function updateOutputFormatOptions() {
  const select = document.getElementById('output-format');
  if (!select) return;

  if (isTreatAsAudioOnly()) {
    if (CONTAINERS.includes(select.value)) lastVideoContainer = select.value;

    const codec = document.getElementById('audio-codec').value;
    const codecExts = AUDIO_EXTENSIONS[codec] || { default: '.mka', options: ['.mka'] };
    const compatible = codecExts.options || [];

    select.innerHTML = ALL_AUDIO_EXTENSIONS.map(ext => {
      const ok = compatible.includes(ext);
      const title = ok ? '' : `Not compatible with ${AUDIO_CODEC_DISPLAY[codec]||codec}. Works with: ${
        getAudioCodecsForExtension(ext).map(c => AUDIO_CODEC_DISPLAY[c]||c).join(', ') || '(none)'
      }`;
      return `<option value="${ext}"${ok ? '' : ' disabled'}${title ? ` title="${title}"` : ''}>${ext}</option>`;
    }).join('');

    if (lastAudioExtension && compatible.includes(lastAudioExtension)) {
      select.value = lastAudioExtension;
    } else {
      select.value = codecExts.default;
      lastAudioExtension = codecExts.default;
    }
  } else {
    if (select.value.startsWith('.')) lastAudioExtension = select.value;
    select.innerHTML = CONTAINERS.map(c => `<option value="${c}">${c}</option>`).join('');
    if (lastVideoContainer && CONTAINERS.includes(lastVideoContainer)) select.value = lastVideoContainer;
  }

  sortSelectOptions(select);
  refreshSelect('output-format');
}

export function updateVideoCodecAvailability() {
  const file = state.selectedFileId ? filesData[state.selectedFileId] : null;
  if (file && !file.hasVideo) return;
  if (file && file.hasVideo && !document.getElementById('enable-video').checked) return;

  const container = document.getElementById('output-format').value;
  const select = document.getElementById('video-codec');
  const supported = CONTAINER_VIDEO_SUPPORT[container] || [];

  Array.from(select.options).forEach(opt => {
    if (!opt.value) return;
    const fam = VIDEO_FAMILIES[opt.value];
    if (!fam) return;
    if (!opt.dataset.originalText) opt.dataset.originalText = opt.textContent.replace(/^⛔\s*/, '');

    const ok = supported.includes(fam);
    opt.disabled = !ok;
    if (!ok) {
      opt.title = `Not compatible with ${container}. Works with: ${getContainersForVideoFamily(fam).join(', ') || '(none)'}`;
      opt.textContent = '⛔ ' + opt.dataset.originalText;
    } else {
      opt.removeAttribute('title');
      opt.textContent = opt.dataset.originalText;
    }
  });

  const selected = select.options[select.selectedIndex];
  if (selected && selected.disabled) {
    const first = Array.from(select.options).find(o => !o.disabled && o.value);
    if (first) { select.value = first.value; updateVideoOptions(); }
  }

  sortSelectOptions(select);
  refreshSelect('video-codec');
  scheduleRefresh();
}

export function updateAudioCodecAvailability() {
  const file = state.selectedFileId ? filesData[state.selectedFileId] : null;
  const select = document.getElementById('audio-codec');

  if (file && isTreatAsAudioOnly()) {
    Array.from(select.options).forEach(opt => {
      if (!opt.value) return;
      if (!opt.dataset.originalText) opt.dataset.originalText = opt.textContent.replace(/^⛔\s*/, '');
      opt.disabled = false;
      opt.removeAttribute('title');
      opt.textContent = opt.dataset.originalText;
    });
    sortSelectOptions(select);
    refreshSelect('audio-codec');
    scheduleRefresh();
    return;
  }

  const container = document.getElementById('output-format').value;
  const supportedContainer = CONTAINER_AUDIO_SUPPORT[container] || [];
  const videoFam = VIDEO_FAMILIES[document.getElementById('video-codec').value];
  const supportedVideo = getAllowedAudioFamilies(videoFam);

  Array.from(select.options).forEach(opt => {
    if (!opt.value) return;
    const fam = AUDIO_FAMILIES[opt.value];
    if (!fam) return;
    if (!opt.dataset.originalText) opt.dataset.originalText = opt.textContent.replace(/^⛔\s*/, '');

    const okContainer = supportedContainer.includes(fam);
    const okVideo = supportedVideo.includes(fam);
    const ok = okContainer && okVideo;
    opt.disabled = !ok;
    if (!ok) {
      const reasons = [];
      if (!okContainer) reasons.push(`container "${container}" (works with: ${getContainersForAudioFamily(fam).join(', ') || 'none'})`);
      if (!okVideo) reasons.push(`video codec "${videoFam}"`);
      opt.title = `Not compatible with current ${reasons.join(' and ')}.`;
      opt.textContent = '⛔ ' + opt.dataset.originalText;
    } else {
      opt.removeAttribute('title');
      opt.textContent = opt.dataset.originalText;
    }
  });

  const selected = select.options[select.selectedIndex];
  if (selected && selected.disabled) {
    const first = Array.from(select.options).find(o => !o.disabled && o.value);
    if (first) { select.value = first.value; updateAudioOptions(); }
  }

  sortSelectOptions(select);
  refreshSelect('audio-codec');
  scheduleRefresh();
}

export function updateContainerAvailability() {
  const file = state.selectedFileId ? filesData[state.selectedFileId] : null;
  const select = document.getElementById('output-format');

  if (file && isTreatAsAudioOnly()) { refreshSelect('output-format'); return; }

  const videoFam = VIDEO_FAMILIES[document.getElementById('video-codec').value];
  const audioFam = AUDIO_FAMILIES[document.getElementById('audio-codec').value];
  const videoEnabled = document.getElementById('enable-video').checked;
  const audioEnabled = document.getElementById('enable-audio').checked;

  Array.from(select.options).forEach(opt => {
    const c = opt.value;
    if (!CONTAINERS.includes(c)) return;
    const vOk = !videoEnabled || !file || !file.hasVideo || (CONTAINER_VIDEO_SUPPORT[c]||[]).includes(videoFam);
    const aOk = !audioEnabled || !file || !file.hasAudio || (CONTAINER_AUDIO_SUPPORT[c]||[]).includes(audioFam);
    const ok = vOk && aOk;
    if (!opt.dataset.originalText) opt.dataset.originalText = opt.textContent.replace(/^⛔\s*/, '');
    opt.disabled = !ok;
    if (!ok) {
      const reasons = [];
      if (!vOk) reasons.push(`video (${videoFam})`);
      if (!aOk) reasons.push(`audio (${audioFam})`);
      opt.title = `Not compatible with current ${reasons.join(' and ')} codec.`;
      opt.textContent = '⛔ ' + opt.dataset.originalText;
    } else {
      opt.removeAttribute('title');
      opt.textContent = opt.dataset.originalText;
    }
  });

  const selected = select.options[select.selectedIndex];
  if (selected && selected.disabled) {
    const first = Array.from(select.options).find(o => !o.disabled);
    if (first) {
      select.value = first.value;
      updateVideoCodecAvailability();
      updateAudioCodecAvailability();
    }
  }

  sortSelectOptions(select);
  refreshSelect('output-format');
  scheduleRefresh();
}

export function onContainerChange() {
  const select = document.getElementById('output-format');
  if (isTreatAsAudioOnly()) { lastAudioExtension = select.value; scheduleRefresh(); return; }
  lastVideoContainer = select.value;
  updateVideoCodecAvailability();
  updateAudioCodecAvailability();
  scheduleRefresh();
}

export function updatePanelTags() {
  const vCodec = document.getElementById('video-codec').value;
  const aCodec = document.getElementById('audio-codec').value;

  const vTags = document.getElementById('video-panel-tags');
  vTags.innerHTML = '';
  if (isVideoBasicEdited(vCodec)) vTags.insertAdjacentHTML('beforeend', '<span class="panel-tag">Edited</span>');
  if (isVideoAdvancedEdited(vCodec)) vTags.insertAdjacentHTML('beforeend', '<span class="panel-tag panel-tag-red">Advanced</span>');
  
  // Only show reset button if BASIC settings are edited
  document.getElementById('btn-reset-video-panel').style.display =
    isVideoBasicEdited(vCodec) ? 'block' : 'none';

  const aTags = document.getElementById('audio-panel-tags');
  aTags.innerHTML = '';
  if (isAudioBasicEdited(aCodec)) aTags.insertAdjacentHTML('beforeend', '<span class="panel-tag">Edited</span>');
  if (isAudioAdvancedEdited(aCodec)) aTags.insertAdjacentHTML('beforeend', '<span class="panel-tag panel-tag-red">Advanced</span>');
  
  // Only show reset button if BASIC settings are edited
  document.getElementById('btn-reset-audio-panel').style.display =
    isAudioBasicEdited(aCodec) ? 'block' : 'none';
}

// Silence unused import warning
void ALL_AUDIO_FAMILIES;
