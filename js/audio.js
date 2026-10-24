// ============================================================
// audio.js — Audio settings panel + Advanced Audio modal
// ============================================================

import {
  state, audioState, currentAudioAdvanced, defaultAudioAdvanced,
  audioCodecNames, DEFAULT_SAMPLE_RATES, DEFAULT_CHANNELS, MP3_CHANNELS,
  AAC_SAMPLE_RATES, MP3_SAMPLE_RATES, isLosslessCodec,
  audioPresetNames, audioActivePresets
} from './state.js';

import { updatePanelTags, updateContainerAvailability, updateAudioCodecAvailability, isTreatAsAudioOnly, updateOutputFormatOptions } from './output.js';
import { refreshSelect } from './custom-select.js';
import { scheduleRefresh } from './ffmpeg.js';

let skipSaveAudioState = false;

// ---- State key helpers ----
function getAudioStateKey(codec) {
  return ({ libopus:'opus', libfdk_aac:'aac', libmp3lame:'mp3', libvorbis:'vorbis' })[codec] || null;
}

// Define what "Standard" and "High Quality" mean for each codec
function getStandardState(codec) {
  return {
    libopus: { mode: 'vbr', vbrTarget: 128, cbrBitrate: 128, sampleRate: '48000', channels: 'Same as source', bitDepth: 'Same as source' },
    libfdk_aac: { mode: 'vbr', vbrQuality: 4, cbrBitrate: 192, sampleRate: '48000', channels: 'Same as source', bitDepth: 'Same as source' },
    libmp3lame: { mode: 'vbr', vbrQuality: 4, abrBitrate: 192, cbrBitrate: 192, vbrLimit: '', sampleRate: '48000', channels: 'Same as source', bitDepth: 'Same as source' },
    libvorbis: { mode: 'vbr', vbrQuality: 3.0, abrTarget: 192, sampleRate: '48000', channels: 'Same as source', bitDepth: 'Same as source' }
  }[codec] || { compression: '5', sampleRate: 'Same as source', channels: 'Same as source', bitDepth: 'Same as source' };
}

function getHighQualityState(codec) {
  return {
    libopus: { mode: 'vbr', vbrTarget: 256, cbrBitrate: 256, sampleRate: '48000', channels: 'Same as source', bitDepth: 'Same as source' },
    libfdk_aac: { mode: 'vbr', vbrQuality: 5, cbrBitrate: 320, sampleRate: '48000', channels: 'Same as source', bitDepth: 'Same as source' },
    libmp3lame: { mode: 'vbr', vbrQuality: 2, abrBitrate: 320, cbrBitrate: 320, vbrLimit: '', sampleRate: '48000', channels: 'Same as source', bitDepth: 'Same as source' },
    libvorbis: { mode: 'vbr', vbrQuality: 8.0, abrTarget: 320, sampleRate: '48000', channels: 'Same as source', bitDepth: 'Same as source' }
  }[codec] || { compression: '8', sampleRate: 'Same as source', channels: 'Same as source', bitDepth: '24-bit' };
}

// ---- Basic edited check ----
export function isAudioBasicEdited(codec) {
  const type = getAudioStateKey(codec);
  if (!type) return false;
  
  const activePreset = audioActivePresets[codec] || 'standard';
  const baseState = activePreset === 'high' ? getHighQualityState(codec) : getStandardState(codec);
  const cur = audioState[type] || {};

  // Check dynamic keys
  const keys = Object.keys(baseState).filter(k => !['sampleRate', 'channels', 'bitDepth'].includes(k));
  if (keys.some(k => String(cur[k] ?? '') !== String(baseState[k]))) return true;

  // Check common UI keys
  if (cur.sampleRate && cur.sampleRate !== baseState.sampleRate) return true;
  if (cur.channels && cur.channels !== baseState.channels) return true;
  if (cur.bitDepth && cur.bitDepth !== baseState.bitDepth) return true;

  return false;
}

export function isAudioAdvancedEdited(codec) {
  return JSON.stringify(currentAudioAdvanced[codec]) !== JSON.stringify(defaultAudioAdvanced[codec]);
}

// ---- State capture/restore ----
export function saveAudioStateUI() {
  const codec = state.currentRenderedAudioCodec;
  if (!codec) return;
  const type = getAudioStateKey(codec);
  if (!type) return;
  if (!audioState[type]) audioState[type] = {};

  audioState[type].sampleRate = document.getElementById('sample-rate-select').value;
  audioState[type].channels = document.getElementById('audio-channels').value;
  const bdEl = document.getElementById('audio-bit-depth');
  if (bdEl) audioState[type].bitDepth = bdEl.value;

  if (codec === 'libopus') {
    const vbr = document.getElementById('chk-opus-vbr');
    if (vbr) {
      audioState.opus.mode = vbr.checked ? 'vbr' : 'cbr';
      audioState.opus.vbrTarget = document.getElementById('opus-vbr-target').value;
      audioState.opus.cbrBitrate = document.getElementById('opus-cbr-slider').value;
    }
  } else if (codec === 'libfdk_aac') {
    const vbr = document.getElementById('chk-aac-vbr');
    if (vbr) {
      audioState.aac.mode = vbr.checked ? 'vbr' : 'cbr';
      audioState.aac.vbrQuality = document.getElementById('aac-vbr-quality').value;
      audioState.aac.cbrBitrate = document.getElementById('aac-cbr-slider').value;
    }
  } else if (codec === 'libmp3lame') {
    const vbr = document.getElementById('chk-mp3-vbr');
    if (vbr) {
      audioState.mp3.mode = vbr.checked ? 'vbr' : (document.getElementById('chk-mp3-abr').checked ? 'abr' : 'cbr');
      audioState.mp3.vbrQuality = document.getElementById('mp3-vbr-quality').value;
      audioState.mp3.abrBitrate = document.getElementById('mp3-abr-bitrate').value;
      audioState.mp3.cbrBitrate = document.getElementById('mp3-cbr-bitrate').value;
    }
  } else if (codec === 'libvorbis') {
    const vbr = document.getElementById('chk-vorbis-vbr');
    if (vbr) {
      audioState.vorbis.mode = vbr.checked ? 'vbr' : 'abr';
      audioState.vorbis.vbrQuality = document.getElementById('vorbis-vbr-quality').value;
      audioState.vorbis.abrTarget = document.getElementById('vorbis-abr-target').value;
    }
  } else if (isLosslessCodec(codec)) {
    const compEl = document.getElementById('lossless-compression-slider');
    if (compEl) audioState[type].compression = compEl.value;
  }
}

export function captureAudioState() {
  saveAudioStateUI();
  return {
    codec: document.getElementById('audio-codec').value,
    state: JSON.parse(JSON.stringify(audioState)),
    advanced: JSON.parse(JSON.stringify(currentAudioAdvanced)),
    sampleRate: document.getElementById('sample-rate-select').value,
    channels: document.getElementById('audio-channels').value
  };
}

export function restoreAudioState(saved) {
  if (!saved) return;
  document.getElementById('audio-codec').value = saved.codec;
  Object.assign(audioState, saved.state);
  Object.assign(currentAudioAdvanced, JSON.parse(JSON.stringify(saved.advanced)));

  state.currentRenderedAudioCodec = '';
  updateAudioOptions();
  refreshSelect('audio-codec');
  scheduleRefresh();
}

// ---- Panel reset ----
export function resetAudioPanel() {
  const codec = document.getElementById('audio-codec').value;
  const basicEdited = isAudioBasicEdited(codec);
  const advEdited = isAudioAdvancedEdited(codec);
  if (!basicEdited && !advEdited) return;

  let alsoAdvanced = false;
  if (basicEdited && advEdited) {
    alsoAdvanced = confirm("Do you also want to reset the advanced settings for this codec?");
  } else if (advEdited) {
    alsoAdvanced = confirm("Do you want to reset the advanced settings for this codec?");
  }

  if (basicEdited) {
    const type = getAudioStateKey(codec);
    if (type) {
      const activePreset = audioActivePresets[codec] || 'standard';
      // Standard or Custom -> reset to Standard. High -> reset to High.
      const baseState = activePreset === 'high' ? getHighQualityState(codec) : getStandardState(codec);
      
      audioState[type] = JSON.parse(JSON.stringify(baseState));
    }
    
    state.currentRenderedAudioCodec = '';
    skipSaveAudioState = true; // Prevent overwriting the reset with old UI values
    updateAudioOptions();
  }
  
  if (alsoAdvanced) {
    currentAudioAdvanced[codec] = JSON.parse(JSON.stringify(defaultAudioAdvanced[codec]));
  }

  refreshSelect('audio-codec');
  updatePanelTags();
  scheduleRefresh();
}

// ---- Change handlers ----
export function onAudioCodecChange() {
  saveAudioStateUI();
  updateAudioOptions();
  if (state.selectedFileId && !isTreatAsAudioOnly()) {
    updateAudioCodecAvailability();
    updateContainerAvailability();
  }
  refreshSelect('audio-codec');
  updatePanelTags();
  scheduleRefresh();
}

export function onAudioPanelChange() {
  saveAudioStateUI();
  updatePanelTags();
  refreshSelect('audio-codec');
  scheduleRefresh();
}

export function onAudioEnableChange(cb) {
  document.getElementById('box-audio').classList.toggle('disabled-box', !cb.checked);
  updateContainerAvailability();
  scheduleRefresh();
}

// ---- Preset Logic ----
export function applyAudioPreset(preset) {
  if (!preset) return;
  const codec = document.getElementById('audio-codec').value;
  const type = getAudioStateKey(codec);
  
  audioActivePresets[codec] = preset;

  if (preset === 'standard' || preset === 'high') {
    if (type) {
      const baseState = preset === 'high' ? getHighQualityState(codec) : getStandardState(codec);
      audioState[type] = JSON.parse(JSON.stringify(baseState));
    }
    state.currentRenderedAudioCodec = '';
    skipSaveAudioState = true;
    updateAudioOptions();
  } else {
    // Custom presets simply keep whatever the user has set.
    updateAudioOptions();
  }
}

export function renameAudioPreset() {
  const codec = document.getElementById('audio-codec').value;
  const active = audioActivePresets[codec];
  if (!active.startsWith('custom')) return;
  
  const currentName = audioPresetNames[codec][active];
  const newName = prompt("Rename preset:", currentName);
  if (newName && newName.trim() !== '') {
    audioPresetNames[codec][active] = newName.trim();
    updateAudioOptions();
  }
}

// ---- Dynamic UI ----
export function updateAudioOptions() {
  const codec = document.getElementById('audio-codec').value;
  
  if (!skipSaveAudioState) {
    saveAudioStateUI();
  }
  skipSaveAudioState = false;

  if (state.currentRenderedAudioCodec !== codec) {
    renderAudioDynamicUI(codec);
    state.currentRenderedAudioCodec = codec;
  }

  // Update Preset Dropdown
  const presetSelect = document.getElementById('audio-preset');
  const activePreset = audioActivePresets[codec] || 'standard';
  const names = audioPresetNames[codec];
  
  presetSelect.innerHTML = `
    <option value="standard">Standard</option>
    <option value="high">High Quality</option>
    <option value="custom1">${names.custom1}</option>
    <option value="custom2">${names.custom2}</option>
    <option value="custom3">${names.custom3}</option>
  `;
  presetSelect.value = activePreset;

  // Show/hide Pencil icon
  const btnRename = document.getElementById('btn-rename-preset');
  btnRename.style.display = activePreset.startsWith('custom') ? 'flex' : 'none';

  const sampleRateSelect = document.getElementById('sample-rate-select');
  const channelsSelect = document.getElementById('audio-channels');
  const srTooltip = document.getElementById('sample-rate-tooltip');

  if (codec === 'libopus') {
    sampleRateSelect.innerHTML = DEFAULT_SAMPLE_RATES;
    sampleRateSelect.value = '48000';
    sampleRateSelect.disabled = true; sampleRateSelect.style.opacity = '0.4';
    srTooltip.classList.add('show-tooltip');
  } else if (codec === 'libfdk_aac') {
    sampleRateSelect.innerHTML = '<option value="Same as source">Same as source</option>' +
      AAC_SAMPLE_RATES.map(r => `<option value="${r.val}">${r.label}</option>`).join('');
    sampleRateSelect.value = '48000';
    sampleRateSelect.disabled = false; sampleRateSelect.style.opacity = '1';
    srTooltip.classList.remove('show-tooltip');
  } else if (codec === 'libmp3lame') {
    sampleRateSelect.innerHTML = '<option value="Same as source">Same as source</option>' +
      MP3_SAMPLE_RATES.map(r => `<option value="${r.val}">${r.label}</option>`).join('');
    sampleRateSelect.value = '48000';
    sampleRateSelect.disabled = false; sampleRateSelect.style.opacity = '1';
    srTooltip.classList.remove('show-tooltip');
  } else {
    sampleRateSelect.innerHTML = DEFAULT_SAMPLE_RATES;
    sampleRateSelect.disabled = false; sampleRateSelect.style.opacity = '1';
    srTooltip.classList.remove('show-tooltip');
  }

  channelsSelect.innerHTML = codec === 'libmp3lame' ? MP3_CHANNELS : DEFAULT_CHANNELS;

  restoreAudioStateUI(codec);

  if (isTreatAsAudioOnly()) updateOutputFormatOptions();
  updatePanelTags();
  scheduleRefresh();
}

function restoreAudioStateUI(codec) {
  const type = getAudioStateKey(codec);
  const s = (type && audioState[type]) || {};

  const srSelect = document.getElementById('sample-rate-select');
  if (s.sampleRate && srSelect.querySelector(`option[value="${s.sampleRate}"]`)) {
    srSelect.value = s.sampleRate;
  }

  const chSelect = document.getElementById('audio-channels');
  if (s.channels && chSelect.querySelector(`option[value="${s.channels}"]`)) {
    chSelect.value = s.channels;
  }

  const bdEl = document.getElementById('audio-bit-depth');
  if (bdEl) bdEl.value = s.bitDepth || 'Same as source';

  if (codec === 'libopus') {
    const opus = s || getStandardState('libopus');
    document.getElementById('chk-opus-vbr').checked = opus.mode === 'vbr';
    document.getElementById('chk-opus-cbr').checked = opus.mode === 'cbr';
    document.getElementById('opus-vbr-target').value = opus.vbrTarget;
    document.getElementById('opus-vbr-target-value').textContent = opus.vbrTarget + 'k';
    document.getElementById('opus-cbr-slider').value = opus.cbrBitrate;
    document.getElementById('opus-cbr-slider-value').textContent = opus.cbrBitrate + 'k';
    document.getElementById('opus-vbr-target').disabled = opus.mode !== 'vbr';
    document.getElementById('opus-cbr-slider').disabled = opus.mode !== 'cbr';
  } else if (codec === 'libfdk_aac') {
    const aac = s || getStandardState('libfdk_aac');
    document.getElementById('chk-aac-vbr').checked = aac.mode === 'vbr';
    document.getElementById('chk-aac-cbr').checked = aac.mode === 'cbr';
    document.getElementById('aac-vbr-quality').value = aac.vbrQuality;
    document.getElementById('aac-vbr-quality-value').textContent = aac.vbrQuality;
    document.getElementById('aac-cbr-slider').value = aac.cbrBitrate;
    document.getElementById('aac-cbr-slider-value').textContent = aac.cbrBitrate + 'k';
    document.getElementById('aac-vbr-quality').disabled = aac.mode !== 'vbr';
    document.getElementById('aac-cbr-slider').disabled = aac.mode !== 'cbr';
  } else if (codec === 'libmp3lame') {
    const mp3 = s || getStandardState('libmp3lame');
    document.getElementById('chk-mp3-vbr').checked = mp3.mode === 'vbr';
    document.getElementById('chk-mp3-abr').checked = mp3.mode === 'abr';
    document.getElementById('chk-mp3-cbr').checked = mp3.mode === 'cbr';
    document.getElementById('mp3-vbr-quality').value = mp3.vbrQuality;
    document.getElementById('mp3-vbr-quality-value').textContent = mp3.vbrQuality;
    document.getElementById('mp3-abr-bitrate').value = mp3.abrBitrate;
    document.getElementById('mp3-abr-bitrate-value').textContent = mp3.abrBitrate + 'k';
    document.getElementById('mp3-cbr-bitrate').value = mp3.cbrBitrate;
    document.getElementById('mp3-cbr-bitrate-value').textContent = mp3.cbrBitrate + 'k';
    document.getElementById('mp3-vbr-quality').disabled = mp3.mode !== 'vbr';
    document.getElementById('mp3-abr-bitrate').disabled = mp3.mode !== 'abr';
    document.getElementById('mp3-cbr-bitrate').disabled = mp3.mode !== 'cbr';
  } else if (codec === 'libvorbis') {
    const vorbis = s || getStandardState('libvorbis');
    document.getElementById('chk-vorbis-vbr').checked = vorbis.mode === 'vbr';
    document.getElementById('chk-vorbis-abr').checked = vorbis.mode === 'abr';
    document.getElementById('vorbis-vbr-quality').value = vorbis.vbrQuality;
    document.getElementById('vorbis-vbr-quality-value').textContent = (+vorbis.vbrQuality).toFixed(1);
    document.getElementById('vorbis-abr-target').value = vorbis.abrTarget;
    document.getElementById('vorbis-abr-target-value').textContent = vorbis.abrTarget + 'k';
    document.getElementById('vorbis-vbr-quality').disabled = vorbis.mode !== 'vbr';
    document.getElementById('vorbis-abr-target').disabled = vorbis.mode !== 'abr';
  } else if (isLosslessCodec(codec)) {
    const compEl = document.getElementById('lossless-compression-slider');
    if (compEl) {
      compEl.value = s.compression || '5';
      document.getElementById('lossless-compression-slider-value').textContent = compEl.value;
    }
  }
}

function renderAudioDynamicUI(codec) {
  const c = document.getElementById('audio-dynamic-controls');
  c.innerHTML = '';

  if (codec === 'libopus') {
    c.innerHTML = `
      <div class="setting-row">
        <label>VBR Target Bitrate</label>
        <div class="combo-group" style="grid-template-columns: 1fr auto; align-items: center;">
          <div class="slider-group">
            <input type="range" class="custom-slider" id="opus-vbr-target" min="6" max="510" step="2" value="128">
            <span class="slider-value" id="opus-vbr-target-value">128k</span>
          </div>
          <label class="custom-checkbox-label" style="white-space: nowrap;">
            <input type="checkbox" id="chk-opus-vbr" checked onchange="onAudioModeChange('opus', 'vbr')"> <span>VBR</span>
          </label>
        </div>
      </div>
      <div class="setting-row">
        <label>CBR Bitrate</label>
        <div class="combo-group" style="grid-template-columns: 1fr auto; align-items: center;">
          <div class="slider-group">
            <input type="range" class="custom-slider" id="opus-cbr-slider" min="6" max="510" step="2" value="128">
            <span class="slider-value" id="opus-cbr-slider-value">128k</span>
          </div>
          <label class="custom-checkbox-label" style="white-space: nowrap;">
            <input type="checkbox" id="chk-opus-cbr" onchange="onAudioModeChange('opus', 'cbr')"> <span>CBR</span>
          </label>
        </div>
      </div>`;
    bindAudioSlider('#opus-vbr-target', '#opus-vbr-target-value', 'k');
    bindAudioSlider('#opus-cbr-slider', '#opus-cbr-slider-value', 'k');
    ['chk-opus-vbr', 'chk-opus-cbr'].forEach(id =>
      document.getElementById(id).addEventListener('change', () => scheduleRefresh()));
  } else if (codec === 'libfdk_aac') {
    c.innerHTML = `
      <div class="setting-row">
        <label>VBR Quality</label>
        <div class="combo-group" style="grid-template-columns: 1fr auto; align-items: center;">
          <div class="slider-group">
            <input type="range" class="custom-slider" id="aac-vbr-quality" min="1" max="5" step="1" value="4">
            <span class="slider-value" id="aac-vbr-quality-value">4</span>
          </div>
          <label class="custom-checkbox-label" style="white-space: nowrap;">
            <input type="checkbox" id="chk-aac-vbr" checked onchange="onAudioModeChange('aac', 'vbr')"> <span>VBR</span>
          </label>
        </div>
      </div>
      <div class="setting-row">
        <label>CBR Bitrate</label>
        <div class="combo-group" style="grid-template-columns: 1fr auto; align-items: center;">
          <div class="slider-group">
            <input type="range" class="custom-slider" id="aac-cbr-slider" min="16" max="512" step="16" value="192">
            <span class="slider-value" id="aac-cbr-slider-value">192k</span>
          </div>
          <label class="custom-checkbox-label" style="white-space: nowrap;">
            <input type="checkbox" id="chk-aac-cbr" onchange="onAudioModeChange('aac', 'cbr')"> <span>CBR</span>
          </label>
        </div>
      </div>`;
    bindAudioSlider('#aac-vbr-quality', '#aac-vbr-quality-value', '');
    bindAudioSlider('#aac-cbr-slider', '#aac-cbr-slider-value', 'k');
    ['chk-aac-vbr', 'chk-aac-cbr'].forEach(id =>
      document.getElementById(id).addEventListener('change', () => scheduleRefresh()));
  } else if (codec === 'libmp3lame') {
    c.innerHTML = `
      <div class="setting-row">
        <label>VBR Quality</label>
        <div class="combo-group" style="grid-template-columns: 1fr auto; align-items: center;">
          <div class="slider-group">
            <input type="range" class="custom-slider" id="mp3-vbr-quality" min="0" max="9" step="1" value="4">
            <span class="slider-value" id="mp3-vbr-quality-value">4</span>
          </div>
          <label class="custom-checkbox-label" style="white-space: nowrap;">
            <input type="checkbox" id="chk-mp3-vbr" checked onchange="onAudioModeChange('mp3', 'vbr')"> <span>VBR</span>
          </label>
        </div>
      </div>
      <div class="setting-row">
        <label>ABR Target Bitrate</label>
        <div class="combo-group" style="grid-template-columns: 1fr auto; align-items: center;">
          <div class="slider-group">
            <input type="range" class="custom-slider" id="mp3-abr-bitrate" min="8" max="320" step="8" value="192">
            <span class="slider-value" id="mp3-abr-bitrate-value">192k</span>
          </div>
          <label class="custom-checkbox-label" style="white-space: nowrap;">
            <input type="checkbox" id="chk-mp3-abr" onchange="onAudioModeChange('mp3', 'abr')"> <span>ABR</span>
          </label>
        </div>
      </div>
      <div class="setting-row">
        <label>CBR Bitrate</label>
        <div class="combo-group" style="grid-template-columns: 1fr auto; align-items: center;">
          <div class="slider-group">
            <input type="range" class="custom-slider" id="mp3-cbr-bitrate" min="8" max="320" step="8" value="192">
            <span class="slider-value" id="mp3-cbr-bitrate-value">192k</span>
          </div>
          <label class="custom-checkbox-label" style="white-space: nowrap;">
            <input type="checkbox" id="chk-mp3-cbr" onchange="onAudioModeChange('mp3', 'cbr')"> <span>CBR</span>
          </label>
        </div>
      </div>`;
    bindAudioSlider('#mp3-vbr-quality', '#mp3-vbr-quality-value', '');
    bindAudioSlider('#mp3-abr-bitrate', '#mp3-abr-bitrate-value', 'k');
    bindAudioSlider('#mp3-cbr-bitrate', '#mp3-cbr-bitrate-value', 'k');
    ['chk-mp3-vbr', 'chk-mp3-abr', 'chk-mp3-cbr'].forEach(id =>
      document.getElementById(id).addEventListener('change', () => scheduleRefresh()));
  } else if (codec === 'libvorbis') {
    c.innerHTML = `
      <div class="setting-row">
        <label>VBR Quality</label>
        <div class="combo-group" style="grid-template-columns: 1fr auto; align-items: center;">
          <div class="slider-group">
            <input type="range" class="custom-slider" id="vorbis-vbr-quality" min="-1" max="10" step="0.1" value="3.0">
            <span class="slider-value" id="vorbis-vbr-quality-value">3.0</span>
          </div>
          <label class="custom-checkbox-label" style="white-space: nowrap;">
            <input type="checkbox" id="chk-vorbis-vbr" checked onchange="onAudioModeChange('vorbis', 'vbr')"> <span>VBR</span>
          </label>
        </div>
      </div>
      <div class="setting-row">
        <label>ABR Target Bitrate</label>
        <div class="combo-group" style="grid-template-columns: 1fr auto; align-items: center;">
          <div class="slider-group">
            <input type="range" class="custom-slider" id="vorbis-abr-target" min="0" max="512" step="16" value="192">
            <span class="slider-value" id="vorbis-abr-target-value">192k</span>
          </div>
          <label class="custom-checkbox-label" style="white-space: nowrap;">
            <input type="checkbox" id="chk-vorbis-abr" onchange="onAudioModeChange('vorbis', 'abr')"> <span>ABR</span>
          </label>
        </div>
      </div>`;
    bindAudioSlider('#vorbis-vbr-quality', '#vorbis-vbr-quality-value', '', true);
    bindAudioSlider('#vorbis-abr-target', '#vorbis-abr-target-value', 'k');
    ['chk-vorbis-vbr', 'chk-vorbis-abr'].forEach(id =>
      document.getElementById(id).addEventListener('change', () => scheduleRefresh()));
  } else if (isLosslessCodec(codec)) {
    let comp = '';
    if (codec !== 'wav' && codec !== 'pcm') {
      const params = { flac: [0,12,5], alac: [0,3,3], wavpack: [0,8,1], ape: [0,5,2] }[codec] || [0,12,5];
      comp = `<div class="setting-row">
        <label>Compression Level</label>
        <div class="slider-group">
          <input type="range" class="custom-slider" id="lossless-compression-slider" min="${params[0]}" max="${params[1]}" step="1" value="${params[2]}">
          <span class="slider-value" id="lossless-compression-slider-value">${params[2]}</span>
        </div>
      </div>`;
    }
    c.innerHTML = comp + `<div class="setting-row">
      <label>Bit Depth</label>
      <select id="audio-bit-depth" onchange="onAudioPanelChange()">
        <option value="Same as source">Same as source</option>
        <option value="16-bit">16-bit</option>
        <option value="24-bit">24-bit</option>
        <option value="32-bit Float">32-bit Float</option>
      </select>
    </div>`;
    const compEl = document.getElementById('lossless-compression-slider');
    if (compEl) {
      compEl.addEventListener('input', (e) => {
        document.getElementById('lossless-compression-slider-value').textContent = e.target.value;
        onAudioPanelChange();
      });
    }
  }
}

function bindAudioSlider(sliderSel, valueSel, suffix, float = false) {
  const s = document.querySelector(sliderSel);
  const v = document.querySelector(valueSel);
  if (!s || !v) return;
  s.addEventListener('input', (e) => {
    v.textContent = float ? (+e.target.value).toFixed(1) : e.target.value + suffix;
    onAudioPanelChange();
  });
}

export function onAudioModeChange(type, mode) {
  const st = audioState[type];
  const cb = document.getElementById('chk-' + type + '-' + mode);
  if (!cb.checked && st.mode === mode) { cb.checked = true; return; }
  st.mode = mode;

  if (type === 'mp3') {
    document.getElementById('chk-mp3-vbr').checked = mode === 'vbr';
    document.getElementById('chk-mp3-abr').checked = mode === 'abr';
    document.getElementById('chk-mp3-cbr').checked = mode === 'cbr';
    document.getElementById('mp3-vbr-quality').disabled = mode !== 'vbr';
    document.getElementById('mp3-abr-bitrate').disabled = mode !== 'abr';
    document.getElementById('mp3-cbr-bitrate').disabled = mode !== 'cbr';
  } else if (type === 'opus') {
    document.getElementById('chk-opus-vbr').checked = mode === 'vbr';
    document.getElementById('chk-opus-cbr').checked = mode === 'cbr';
    document.getElementById('opus-vbr-target').disabled = mode !== 'vbr';
    document.getElementById('opus-cbr-slider').disabled = mode !== 'cbr';
  } else if (type === 'aac') {
    document.getElementById('chk-aac-vbr').checked = mode === 'vbr';
    document.getElementById('chk-aac-cbr').checked = mode === 'cbr';
    document.getElementById('aac-vbr-quality').disabled = mode !== 'vbr';
    document.getElementById('aac-cbr-slider').disabled = mode !== 'cbr';
  } else if (type === 'vorbis') {
    document.getElementById('chk-vorbis-vbr').checked = mode === 'vbr';
    document.getElementById('chk-vorbis-abr').checked = mode === 'abr';
    document.getElementById('vorbis-vbr-quality').disabled = mode !== 'vbr';
    document.getElementById('vorbis-abr-target').disabled = mode !== 'abr';
  }

  saveAudioStateUI();
  refreshSelect('audio-codec');
  updatePanelTags();
  scheduleRefresh();
}

// ---- Advanced modal ----
export function openAudioAdvancedModal() {
  buildAudioAdvancedUI();
  switchAudioTab(document.getElementById('audio-codec').value);
  updateAudioAdvancedIndicators();
  document.getElementById('audioAdvancedModal').classList.add('active');
}

export function closeAudioAdvancedModal() {
  document.getElementById('audioAdvancedModal').classList.remove('active');
  updateAudioOptions();
  scheduleRefresh();
}

function buildAudioAdvancedUI() {
  const sidebar = document.getElementById('audio-adv-tabs');
  const main = document.getElementById('audio-adv-settings-container');
  sidebar.innerHTML = '';
  main.innerHTML = '';

  for (const codec in currentAudioAdvanced) {
    const btn = document.createElement('button');
    btn.className = 'adv-tab-btn';
    btn.dataset.codec = codec;
    btn.innerHTML = `<span>${audioCodecNames[codec]}</span><div class="edit-dot" id="aud-edit-dot-${codec}"></div>`;
    btn.onclick = () => switchAudioTab(codec);
    sidebar.appendChild(btn);

    const panel = document.createElement('div');
    panel.className = 'adv-panel';
    panel.id = `aud-panel-${codec}`;
    panel.innerHTML = `
      <div class="panel-header">
        <div class="panel-header-left">
          <h3>${audioCodecNames[codec]} Settings</h3>
          <span id="aud-panel-edit-${codec}" class="edit-indicator" style="display:none;">Edited</span>
        </div>
        <button class="btn-cancel" id="aud-reset-btn-${codec}" style="padding: 4px 12px; font-size: 12px; display:none;" onclick="resetSpecificAudioSettings('${codec}')">Reset ${audioCodecNames[codec]} to Default</button>
      </div>
      <div class="setting-row" style="grid-template-columns:140px 1fr;">
        <label>Metadata</label>
        <label class="custom-checkbox-label">
          <input type="checkbox" id="aud-meta-${codec}" onchange="markAudioAdvancedEdited('${codec}')">
          <span style="color:#ccc;">Preserve metadata (title, artist, etc.)</span>
        </label>
      </div>`;
    main.appendChild(panel);
  }
}

export function switchAudioTab(codec) {
  state.activeAudioTab = codec;
  document.querySelectorAll('#audio-adv-tabs .adv-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.codec === codec);
  });
  document.querySelectorAll('#audio-adv-settings-container .adv-panel').forEach(p => {
    p.classList.toggle('active', p.id === `aud-panel-${codec}`);
  });

  document.getElementById(`aud-meta-${codec}`).checked = currentAudioAdvanced[codec].preserveMetadata;
  const isEdited = isAudioAdvancedEdited(codec);
  document.getElementById(`aud-panel-edit-${codec}`).style.display = isEdited ? 'inline-block' : 'none';
  document.getElementById(`aud-reset-btn-${codec}`).style.display = isEdited ? 'block' : 'none';
}

export function updateAudioAdvancedIndicators() {
  for (const codec in currentAudioAdvanced) {
    const isEdited = isAudioAdvancedEdited(codec);
    const dot = document.getElementById(`aud-edit-dot-${codec}`);
    if (dot) {
      dot.style.display = isEdited ? 'block' : 'none';
      const btn = dot.closest('.adv-tab-btn');
      if (btn) btn.classList.toggle('has-edits', isEdited);
    }
    if (codec === state.activeAudioTab) {
      document.getElementById(`aud-panel-edit-${codec}`).style.display = isEdited ? 'inline-block' : 'none';
      document.getElementById(`aud-reset-btn-${codec}`).style.display = isEdited ? 'block' : 'none';
    }
  }
  updatePanelTags();
}

export function markAudioAdvancedEdited(codec) {
  currentAudioAdvanced[codec].preserveMetadata = document.getElementById(`aud-meta-${codec}`).checked;
  updateAudioAdvancedIndicators();
  refreshSelect('audio-codec');
  scheduleRefresh();
}

export function resetSpecificAudioSettings(codec) {
  currentAudioAdvanced[codec] = JSON.parse(JSON.stringify(defaultAudioAdvanced[codec]));
  switchAudioTab(codec);
  updateAudioAdvancedIndicators();
  refreshSelect('audio-codec');
  updatePanelTags();
  scheduleRefresh();
}

export function resetAllAudioAdvancedSettings() {
  if (!confirm("Are you sure you want to reset ALL advanced audio settings to default?")) return;
  Object.assign(currentAudioAdvanced, JSON.parse(JSON.stringify(defaultAudioAdvanced)));
  buildAudioAdvancedUI();
  switchAudioTab(state.activeAudioTab);
  updateAudioAdvancedIndicators();
  refreshSelect('audio-codec');
  scheduleRefresh();
}
