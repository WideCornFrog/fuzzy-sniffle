// ============================================================
// video.js — Video settings panel + Advanced Video modal
// ============================================================

import {
  state, codecCapabilities, currentVideoBasicState,
  defaultVideoAdvanced, currentVideoAdvanced,
  VIDEO_FAMILIES, PRO_VIDEO_FAMILIES, audioStateByCategory
} from './state.js';

import { updatePanelTags, updateContainerAvailability, updateAudioCodecAvailability } from './output.js';
import { refreshSelect } from './custom-select.js';
import { scheduleRefresh } from './ffmpeg.js';
import { captureAudioState, restoreAudioState } from './audio.js';

const SKIP_KEYS = ['quality','preset','tune','profile','level','colorRange','fastDecode'];

// ---- Basic state helpers ----
export function getVideoDefaultBasic(codec) {
  const caps = codecCapabilities[codec];
  return {
    quality: caps && caps.quality ? caps.quality.default : 23,
    preset: caps && caps.preset ? caps.preset.default : 5,
    bitrate: '6000',
    fpsCustom: '', fpsSelect: 'Same as source',
    resCustom: '', resSelect: 'Same as source'
  };
}

export function saveVideoStateUI() {
  const codec = document.getElementById('video-codec').value;
  if (!currentVideoBasicState[codec]) currentVideoBasicState[codec] = getVideoDefaultBasic(codec);
  Object.assign(currentVideoBasicState[codec], {
    fpsCustom: document.getElementById('fps-custom').value,
    fpsSelect: document.getElementById('fps-select').value,
    resCustom: document.getElementById('res-custom').value,
    resSelect: document.getElementById('res-select').value
  });
}

export function isVideoBasicEdited(codec) {
  const cur = currentVideoBasicState[codec];
  if (!cur) return false;
  const def = getVideoDefaultBasic(codec);
  // Loop over scalar fields
  const scalars = ['quality','preset','bitrate','fpsCustom','fpsSelect','resCustom','resSelect'];
  return scalars.some(k => String(cur[k] ?? '') !== String(def[k] ?? ''));
}

export function isVideoAdvancedEdited(codec) {
  return JSON.stringify(currentVideoAdvanced[codec]) !== JSON.stringify(defaultVideoAdvanced[codec]);
}

export function resetVideoPanel() {
  const codec = document.getElementById('video-codec').value;
  const basicEdited = isVideoBasicEdited(codec);
  const advEdited = isVideoAdvancedEdited(codec);
  if (!basicEdited && !advEdited) return;

  let alsoAdvanced = false;
  if (basicEdited && advEdited) {
    alsoAdvanced = confirm("Do you also want to reset the advanced settings for this codec?");
  } else if (advEdited) {
    alsoAdvanced = confirm("Do you want to reset the advanced settings for this codec?");
  }

  if (basicEdited) {
    currentVideoBasicState[codec] = getVideoDefaultBasic(codec);
    document.getElementById('fps-custom').value = '';
    document.getElementById('fps-select').value = 'Same as source';
    document.getElementById('res-custom').value = '';
    document.getElementById('res-select').value = 'Same as source';
  }
  if (alsoAdvanced) {
    currentVideoAdvanced[codec] = JSON.parse(JSON.stringify(defaultVideoAdvanced[codec]));
  }

  updateVideoOptions();
  refreshSelect('video-codec');
  updatePanelTags();
  scheduleRefresh();
}

// ---- Change handlers ----
export function onVideoCodecChange() {
  if (!state.selectedFileId) { updateVideoOptions(); return; }
  saveVideoStateUI();

  const videoCodec = document.getElementById('video-codec').value;
  const videoFam = VIDEO_FAMILIES[videoCodec];
  const newCategory = PRO_VIDEO_FAMILIES.includes(videoFam) ? 'pro' : 'normal';

  if (state.currentVideoCategory !== newCategory) {
    audioStateByCategory[state.currentVideoCategory] = captureAudioState();

    if (newCategory === 'pro') {
      if (audioStateByCategory.pro) {
        restoreAudioState(audioStateByCategory.pro);
      } else {
        const aSel = document.getElementById('audio-codec');
        aSel.value = 'wav';
        aSel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else if (audioStateByCategory.normal) {
      restoreAudioState(audioStateByCategory.normal);
    }

    state.currentVideoCategory = newCategory;
  }

  updateVideoOptions();
  updateContainerAvailability();
  updateAudioCodecAvailability();
  updatePanelTags();
  scheduleRefresh();
}

export function onVideoEnableChange(cb) {
  document.getElementById('box-video').classList.toggle('disabled-box', !cb.checked);
  import('./output.js').then(m => {
    m.updateOutputFormatOptions();
    m.updateVideoCodecAvailability();
    m.updateAudioCodecAvailability();
    m.updateContainerAvailability();
  });
  scheduleRefresh();
}

// ---- Dynamic UI ----
function getSliderLabel(val, presetDef) {
  return presetDef && presetDef.valueLabels ? (presetDef.valueLabels[+val] ?? val) : val;
}

export function updateVideoOptions() {
  const codec = document.getElementById('video-codec').value;
  const caps = codecCapabilities[codec];
  const adv = currentVideoAdvanced[codec];

  if (!currentVideoBasicState[codec]) currentVideoBasicState[codec] = getVideoDefaultBasic(codec);
  const basic = currentVideoBasicState[codec];

  const isVbr = ['vbr','vbr_peak','vbr_latency'].includes(adv.rateControl);
  const isCbr = adv.rateControl === 'cbr';
  const isBitrateMode = isVbr || isCbr;

  const container = document.getElementById('video-dynamic-controls');
  container.innerHTML = '';
  if (!caps) { updatePanelTags(); scheduleRefresh(); return; }

  if (caps.quality) {
    const q = caps.quality;
    const row = document.createElement('div');
    row.className = 'setting-row';

    if (q.type === 'select') {
      row.innerHTML = `<label>${q.label}</label><select id="dyn-quality">${
        q.options.map(o => `<option value="${o}" ${o===basic.quality?'selected':''}>${o}</option>`).join('')
      }</select>`;
      row.querySelector('#dyn-quality').addEventListener('change', (e) => {
        currentVideoBasicState[codec].quality = e.target.value;
        updatePanelTags(); scheduleRefresh();
      });
    } else {
      const labelText = isCbr ? 'CBR bitrate' : isVbr ? 'VBR bitrate' : q.label;
      if (isBitrateMode) {
        row.innerHTML = `
          <label>${labelText}</label>
          <div class="combo-group">
            <input type="text" id="bitrate-limit" value="${basic.bitrate}" placeholder="Kbps limit (e.g. 6000)">
            <div class="checkbox-group-row" style="justify-content:flex-start;">
              <label class="custom-checkbox-label"><input type="checkbox" id="dyn-multipass"> Multi-pass</label>
              <label class="custom-checkbox-label"><input type="checkbox" id="dyn-turbo" onchange="handleTurboToggle(this)"> Turbo</label>
            </div>
          </div>`;
        row.querySelector('#bitrate-limit').addEventListener('input', (e) => {
          currentVideoBasicState[codec].bitrate = e.target.value;
          updatePanelTags(); scheduleRefresh();
        });
      } else {
        row.innerHTML = `
          <label>${labelText}</label>
          <div class="combo-group" style="grid-template-columns:1fr;">
            <div class="slider-group">
              <input type="range" class="custom-slider" id="dyn-quality" min="${q.min}" max="${q.max}" value="${basic.quality}" step="${q.step}">
              <span class="slider-value" id="dyn-quality-val">${basic.quality}</span>
            </div>
          </div>`;
        const slider = row.querySelector('#dyn-quality');
        const valD = row.querySelector('#dyn-quality-val');
        slider.addEventListener('input', (e) => {
          valD.textContent = e.target.value;
          currentVideoBasicState[codec].quality = e.target.value;
          updatePanelTags(); scheduleRefresh();
        });
      }
    }
    container.appendChild(row);
  }

  if (caps.preset) {
    const p = caps.preset;
    const row = document.createElement('div');
    row.className = 'setting-row';
    if (p.type === 'select') {
      row.innerHTML = `<label>${p.label}</label><select id="dyn-preset">${
        p.options.map(o => `<option value="${o}" ${o===basic.preset?'selected':''}>${o}</option>`).join('')
      }</select>`;
      row.querySelector('#dyn-preset').addEventListener('change', (e) => {
        currentVideoBasicState[codec].preset = e.target.value;
        updatePanelTags(); scheduleRefresh();
      });
    } else {
      row.innerHTML = `
        <label>${p.label}</label>
        <div class="slider-group">
          <input type="range" class="custom-slider" id="dyn-preset" min="${p.min}" max="${p.max}" value="${basic.preset}" step="${p.step}">
          <span class="slider-value" id="dyn-preset-val">${getSliderLabel(basic.preset, p)}</span>
        </div>`;
      const slider = row.querySelector('#dyn-preset');
      const valD = row.querySelector('#dyn-preset-val');
      slider.addEventListener('input', (e) => {
        valD.textContent = getSliderLabel(e.target.value, p);
        currentVideoBasicState[codec].preset = e.target.value;
        updatePanelTags(); scheduleRefresh();
      });
    }
    container.appendChild(row);
  }

  updatePanelTags();
  scheduleRefresh();
}

// ---- Advanced modal ----
export function openVideoAdvancedModal() {
  buildVideoAdvancedUI();
  switchVideoTab(document.getElementById('video-codec').value);
  updateVideoAdvancedIndicators();
  document.getElementById('advancedModal').classList.add('active');
}

export function closeVideoAdvancedModal() {
  document.getElementById('advancedModal').classList.remove('active');
  updateVideoOptions();
  scheduleRefresh();
}

function buildVideoAdvancedUI() {
  const sidebar = document.getElementById('video-adv-tabs');
  const main = document.getElementById('video-adv-settings-container');
  sidebar.innerHTML = '';
  main.innerHTML = '';

  const vendors = {
    'NVIDIA (NVENC)': ['h264_nvenc','hevc_nvenc','av1_nvenc'],
    'AMD (AMF)': ['h264_amf','hevc_amf','av1_amf'],
    'Intel (QSV)': ['h264_qsv','hevc_qsv','av1_qsv'],
    'CPU': ['libx264','libx265','libaom-av1','libsvtav1','libvpx-vp9','prores','dnxhd','rawvideo','ffv1']
  };

  for (const vendor in vendors) {
    const header = document.createElement('div');
    header.style.cssText = 'font-size:11px;text-transform:uppercase;color:#666;margin:12px 0 4px 8px;font-weight:700;letter-spacing:0.5px;';
    header.textContent = vendor;
    header.style.marginTop = sidebar.children.length > 0 ? '16px' : '0px';
    sidebar.appendChild(header);

    vendors[vendor].forEach(codec => {
      if (!codecCapabilities[codec]) return;
      const btn = document.createElement('button');
      btn.className = 'adv-tab-btn';
      btn.dataset.codec = codec;
      const optEl = document.getElementById('video-codec').querySelector(`option[value="${codec}"]`);
      const displayName = optEl ? optEl.text.replace(/^⛔\s*/,'') : codec;
      btn.innerHTML = `<span>${displayName}</span><div class="edit-dot" id="vid-edit-dot-${codec}"></div>`;
      btn.onclick = () => switchVideoTab(codec);
      sidebar.appendChild(btn);
    });
  }

  Object.keys(codecCapabilities).forEach(codec => {
    const caps = codecCapabilities[codec];
    const optEl = document.getElementById('video-codec').querySelector(`option[value="${codec}"]`);
    const displayName = optEl ? optEl.text.replace(/^⛔\s*/,'') : codec;
    const panel = document.createElement('div');
    panel.className = 'adv-panel';
    panel.id = `vid-panel-${codec}`;

    let html = `<div class="panel-header">
      <div class="panel-header-left">
        <h3>${displayName} Settings</h3>
        <span id="vid-panel-edit-${codec}" class="edit-indicator" style="display:none;">Edited</span>
      </div>
      <button class="btn-cancel" id="vid-reset-btn-${codec}" style="padding: 4px 12px; font-size: 12px; display:none;" onclick="resetSpecificVideoSettings('${codec}')">Reset ${displayName} to Default</button>
    </div>`;

    if (caps.tune) html += `<div class="setting-row"><label>Tune</label><select id="vid-tune-${codec}" onchange="markVideoEdited('${codec}')">
      ${caps.tune.options.map(o => `<option value="${o}">${o}</option>`).join('')}</select></div>`;
    if (caps.profile) html += `<div class="setting-row"><label>Profile</label><select id="vid-profile-${codec}" onchange="markVideoEdited('${codec}')">
      ${caps.profile.options.map(o => `<option value="${o}">${o}</option>`).join('')}</select></div>`;
    if (caps.level) html += `<div class="setting-row"><label>Level</label><select id="vid-level-${codec}" onchange="markVideoEdited('${codec}')">
      ${caps.level.options.map(o => `<option value="${o}">${o}</option>`).join('')}</select></div>`;
    if (caps.colorRange) html += `<div class="setting-row"><label>Color Range</label><select id="vid-color-${codec}" onchange="markVideoEdited('${codec}')">
      ${caps.colorRange.options.map(o => `<option value="${o}">${o}</option>`).join('')}</select></div>`;
    if (caps.fastDecode) html += `<div class="setting-row"><label>Fast Decode</label>
      <div><label class="custom-checkbox-label"><input type="checkbox" id="vid-fastdecode-${codec}" onchange="markVideoEdited('${codec}')"><span>Enable</span></label></div></div>`;

    for (const key in caps) {
      if (SKIP_KEYS.includes(key)) continue;
      const s = caps[key];
      if (s.type === 'checkbox') {
        html += `<div class="setting-row"><label>${s.label}</label>
          <div><label class="custom-checkbox-label"><input type="checkbox" id="vid-${key}-${codec}" onchange="markVideoEdited('${codec}')"><span>Enable</span></label></div></div>`;
      } else if (s.type === 'slider') {
        html += `<div class="setting-row"><label>${s.label}</label>
          <div class="slider-group">
            <input type="range" class="custom-slider" id="vid-${key}-${codec}" min="${s.min}" max="${s.max}" value="${s.default}" step="${s.step}" oninput="markVideoEdited('${codec}')">
            <span class="slider-value" id="vid-${key}-val-${codec}">${s.default}</span>
          </div></div>`;
      } else if (s.type === 'text') {
        html += `<div class="setting-row"><label>${s.label}</label>
          <input type="text" id="vid-${key}-${codec}" placeholder="${s.placeholder}" oninput="markVideoEdited('${codec}')"></div>`;
      } else if (s.options) {
        html += `<div class="setting-row"><label>${s.label || key}</label>
          <select id="vid-${key}-${codec}" onchange="markVideoEdited('${codec}')">
            ${s.options.map(o => `<option value="${o}">${o}</option>`).join('')}</select></div>`;
      }
    }
    html += `<div style="margin-top:16px;">
      <label style="display:block;font-size:14px;color:#b2b2b2;margin-bottom:6px;">Custom FFmpeg Options</label>
      <textarea class="custom-args-box" id="vid-args-${codec}" oninput="markVideoEdited('${codec}')" placeholder="e.g. -x264-params keyint=120"></textarea>
    </div>`;
    panel.innerHTML = html;
    main.appendChild(panel);
  });
}

export function switchVideoTab(codec) {
  state.activeVideoTab = codec;
  document.querySelectorAll('#video-adv-tabs .adv-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.codec === codec);
  });
  document.querySelectorAll('#video-adv-settings-container .adv-panel').forEach(p => {
    p.classList.toggle('active', p.id === `vid-panel-${codec}`);
  });

  const settings = currentVideoAdvanced[codec];
  const setVal = (id, val, prop='value') => { const el = document.getElementById(id); if (el) el[prop] = val; };

  if (settings.tune !== undefined) setVal(`vid-tune-${codec}`, settings.tune);
  if (settings.profile !== undefined) setVal(`vid-profile-${codec}`, settings.profile);
  if (settings.level !== undefined) setVal(`vid-level-${codec}`, settings.level);
  if (settings.colorRange !== undefined) setVal(`vid-color-${codec}`, settings.colorRange);
  if (settings.fastDecode !== undefined) setVal(`vid-fastdecode-${codec}`, settings.fastDecode, 'checked');

  const caps = codecCapabilities[codec];
  for (const key in caps) {
    if (SKIP_KEYS.includes(key)) continue;
    const s = caps[key];
    if (s.type === 'checkbox') setVal(`vid-${key}-${codec}`, settings[key], 'checked');
    else if (s.type === 'slider') {
      setVal(`vid-${key}-${codec}`, settings[key]);
      const ve = document.getElementById(`vid-${key}-val-${codec}`);
      if (ve) ve.textContent = settings[key];
    } else if (s.type === 'text' || s.options) setVal(`vid-${key}-${codec}`, settings[key]);
  }
  setVal(`vid-args-${codec}`, settings.customArgs);

  const isEdited = isVideoAdvancedEdited(codec);
  document.getElementById(`vid-panel-edit-${codec}`).style.display = isEdited ? 'inline-block' : 'none';
  document.getElementById(`vid-reset-btn-${codec}`).style.display = isEdited ? 'block' : 'none';
}

export function updateVideoAdvancedIndicators() {
  Object.keys(codecCapabilities).forEach(codec => {
    const isEdited = isVideoAdvancedEdited(codec);
    const dot = document.getElementById(`vid-edit-dot-${codec}`);
    if (dot) {
      dot.style.display = isEdited ? 'block' : 'none';
      const btn = dot.closest('.adv-tab-btn');
      if (btn) btn.classList.toggle('has-edits', isEdited);
    }
    if (codec === state.activeVideoTab) {
      document.getElementById(`vid-panel-edit-${codec}`).style.display = isEdited ? 'inline-block' : 'none';
      document.getElementById(`vid-reset-btn-${codec}`).style.display = isEdited ? 'block' : 'none';
    }
  });
  updatePanelTags();
}

export function markVideoEdited(codec) {
  const caps = codecCapabilities[codec];
  const s = currentVideoAdvanced[codec];
  const getVal = (id, prop='value') => { const el = document.getElementById(id); return el ? el[prop] : undefined; };

  if (s.tune !== undefined) s.tune = getVal(`vid-tune-${codec}`);
  if (s.profile !== undefined) s.profile = getVal(`vid-profile-${codec}`);
  if (s.level !== undefined) s.level = getVal(`vid-level-${codec}`);
  if (s.colorRange !== undefined) s.colorRange = getVal(`vid-color-${codec}`);
  if (s.fastDecode !== undefined) s.fastDecode = getVal(`vid-fastdecode-${codec}`, 'checked');

  for (const key in caps) {
    if (SKIP_KEYS.includes(key)) continue;
    const st = caps[key];
    if (st.type === 'checkbox') s[key] = getVal(`vid-${key}-${codec}`, 'checked');
    else if (st.type === 'slider') {
      s[key] = +getVal(`vid-${key}-${codec}`);
      const ve = document.getElementById(`vid-${key}-val-${codec}`);
      if (ve) ve.textContent = s[key];
    } else if (st.type === 'text' || st.options) s[key] = getVal(`vid-${key}-${codec}`);
  }
  s.customArgs = getVal(`vid-args-${codec}`);

  updateVideoAdvancedIndicators();
  refreshSelect('video-codec');
  scheduleRefresh();
}

export function resetSpecificVideoSettings(codec) {
  currentVideoAdvanced[codec] = JSON.parse(JSON.stringify(defaultVideoAdvanced[codec]));
  switchVideoTab(codec);
  updateVideoAdvancedIndicators();
  refreshSelect('video-codec');
  updatePanelTags();
  scheduleRefresh();
}

export function resetAllVideoAdvancedSettings() {
  if (!confirm("Are you sure you want to reset ALL advanced video settings to default?")) return;
  Object.assign(currentVideoAdvanced, JSON.parse(JSON.stringify(defaultVideoAdvanced)));
  buildVideoAdvancedUI();
  switchVideoTab(state.activeVideoTab);
  updateVideoAdvancedIndicators();
  refreshSelect('video-codec');
  scheduleRefresh();
}

export function applyVideoPreset(preset) {
  if (!preset) return;
  const codec = document.getElementById('video-codec').value;
  const caps = codecCapabilities[codec];
  if (!caps || !caps.preset) return;
  
  let val = 5;
  if (preset === 'fast') val = caps.preset.type === 'slider' ? 2 : 'p2';
  else if (preset === 'slow') val = caps.preset.type === 'slider' ? 8 : 'p7';
  else if (preset === 'medium') val = caps.preset.type === 'slider' ? 5 : 'p5';
  
  const pSelect = document.getElementById('dyn-preset');
  if (pSelect) {
    pSelect.value = val;
    pSelect.dispatchEvent(new Event('input')); 
  }
  
  if (!currentVideoBasicState[codec]) currentVideoBasicState[codec] = getVideoDefaultBasic(codec);
  currentVideoBasicState[codec].preset = val;
  
  updatePanelTags();
  scheduleRefresh();
}
