// ============================================================
// ffmpeg.js — Live command preview + encode controls
// ============================================================

import {
  state, filesData, currentVideoAdvanced, currentVideoBasicState,
  codecCapabilities, isLosslessCodec, audioState, currentAudioAdvanced
} from './state.js';

let pending = false;

export function scheduleRefresh() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    refreshFfmpegCommand();
  });
}

function getOutputExtension() {
  const fmt = document.getElementById('output-format').value;
  const map = {
    'MKV (Matroska)': '.mkv', 'MP4': '.mp4', 'WebM': '.webm',
    'MOV': '.mov', 'AVI': '.avi', 'MXF': '.mxf'
  };
  return map[fmt] || (fmt.startsWith('.') ? fmt : '.mkv');
}

function getAudioEncoderName(codec) {
  if (codec === 'wav' || codec === 'pcm') {
    const bd = document.getElementById('audio-bit-depth').value;
    if (bd === '24-bit') return 'pcm_s24le';
    if (bd === '32-bit Float') return 'pcm_f32le';
    return 'pcm_s16le';
  }
  return codec;
}

function getVideoFfmpegArgs(codec) {
  const args = [];
  const adv = currentVideoAdvanced[codec] || {};
  const caps = codecCapabilities[codec];
  const basic = currentVideoBasicState[codec];
  if (!caps || !basic) return args;

  const isBitrateMode = ['vbr','cbr','vbr_peak','vbr_latency'].includes(adv.rateControl);

  if (isBitrateMode) {
    const br = basic.bitrate || '6000';
    args.push('-b:v', `${br}k`);
    if (adv.rateControl === 'cbr') args.push('-maxrate', `${br}k`, '-bufsize', `${parseInt(br) * 2}k`);
  } else if (caps.quality) {
    const q = basic.quality;
    if (codec.includes('nvenc')) args.push('-cq', q);
    else if (codec.includes('qsv')) args.push('-global_quality', q);
    else if (codec.includes('amf')) args.push('-qp_i', q);
    else if (codec === 'libaom-av1' || codec === 'libsvtav1' || codec === 'libvpx-vp9') args.push('-crf', q);
    else if (codec === 'libx264' || codec === 'libx265') args.push('-crf', q);
    else if (codec === 'prores') args.push('-profile:v', q);
  }

  if (caps.preset) {
    const p = basic.preset;
    if (codec === 'libx264' || codec === 'libx265') {
      const presets = ['ultrafast','superfast','veryfast','faster','fast','medium','slow','slower','veryslow'];
      args.push('-preset', presets[+p] || 'medium');
    } else if (codec.includes('nvenc')) args.push('-preset', `p${+p + 1}`);
    else if (codec.includes('qsv')) args.push('-preset', p);
    else if (codec.includes('amf')) args.push('-quality', p);
    else if (codec === 'libsvtav1') args.push('-preset', p);
    else if (codec === 'libaom-av1' || codec === 'libvpx-vp9') args.push('-cpu-used', p);
  }

  if (adv.tune && adv.tune !== 'none') args.push('-tune', adv.tune);
  if (adv.profile && adv.profile !== 'auto') args.push('-profile:v', adv.profile);
  if (adv.fastDecode) args.push('-tune', 'fastdecode');
  if (adv.pixelFormat) args.push('-pix_fmt', adv.pixelFormat);
  if (adv.customArgs && adv.customArgs.trim()) args.push(adv.customArgs.trim());

  return args;
}

function getAudioFfmpegArgs(codec) {
  const args = [];
  const lossless = isLosslessCodec(codec);

  if (!lossless) {
    const type = ({ libopus:'opus', libfdk_aac:'aac', libmp3lame:'mp3', libvorbis:'vorbis' })[codec];
    const s = audioState[type] || {};
    const adv = currentAudioAdvanced[codec] || {};
    
    if (codec === 'libopus') {
      if (s.mode === 'vbr') { args.push('-vbr', 'on'); if (s.vbrTarget) args.push('-b:a', `${s.vbrTarget}k`); }
      else args.push('-b:a', `${s.cbrBitrate || 192}k`);
    } else if (codec === 'libfdk_aac') {
      if (s.mode === 'vbr') args.push('-vbr', s.vbrQuality || 3);
      else args.push('-b:a', `${s.cbrBitrate || 192}k`);
    } else if (codec === 'libmp3lame') {
      if (s.mode === 'vbr') { args.push('-q:a', s.vbrQuality || 4); if (s.vbrLimit) args.push('-maxrate', `${s.vbrLimit}k`); }
      else if (s.mode === 'abr') { args.push('-abr', '1'); args.push('-b:a', `${s.abrBitrate || 192}k`); }
      else args.push('-b:a', `${adv.cbrBitrate || 192}k`);
    } else if (codec === 'libvorbis') {
      if (s.mode === 'vbr') args.push('-q:a', s.vbrQuality || 3.0);
      else args.push('-b:a', `${s.abrTarget || 192}k`);
    }
  } else {
    const compEl = document.getElementById('lossless-compression-slider');
    if (compEl) args.push('-compression_level', compEl.value);
  }

  if (lossless) {
    const bdEl = document.getElementById('audio-bit-depth');
    if (bdEl) {
      const bd = bdEl.value;
      if (bd === '16-bit') args.push('-sample_fmt', 's16');
      else if (bd === '24-bit') args.push('-sample_fmt', 's32');
      else if (bd === '32-bit Float') args.push('-sample_fmt', 'flt');
    }
  }

  const sr = document.getElementById('sample-rate-select').value;
  if (sr !== 'Same as source') args.push('-ar', sr);

  const ch = document.getElementById('audio-channels').value;
  const chMap = {'Mono (1.0)':'1','Stereo (2.0)':'2','Quadraphonic (4.0)':'4','Surround (5.0)':'5','Surround (5.1)':'6','Surround (6.1)':'7','Surround (7.1)':'8'};
  if (chMap[ch]) args.push('-ac', chMap[ch]);

  return args;
}

export function refreshFfmpegCommand() {
  const input = document.getElementById('ffmpeg-cmd');
  if (!state.selectedFileId) { input.value = ''; return; }

  const file = filesData[state.selectedFileId];
  const videoEnabled = document.getElementById('enable-video').checked && file.hasVideo;
  const audioEnabled = document.getElementById('enable-audio').checked && file.hasAudio;

  const parts = ['ffmpeg', '-i', `"${file.name}"`];

  if (videoEnabled) {
    const vCodec = document.getElementById('video-codec').value;
    parts.push('-c:v', vCodec, ...getVideoFfmpegArgs(vCodec));

    const fps = document.getElementById('fps-custom').value.trim() || document.getElementById('fps-select').value;
    if (fps !== 'Same as source' && fps) parts.push('-r', fps);

    const res = document.getElementById('res-custom').value.trim() || document.getElementById('res-select').value;
    if (res !== 'Same as source' && res) parts.push('-vf', `scale=${res.replace('x', ':')}`);
  } else parts.push('-vn');

  if (audioEnabled) {
    const aCodec = document.getElementById('audio-codec').value;
    parts.push('-c:a', getAudioEncoderName(aCodec), ...getAudioFfmpegArgs(aCodec));
  } else parts.push('-an');

  const outExt = getOutputExtension();
  const outPath = document.getElementById('output-path').value.replace(/\/$/, '');
  const baseName = file.name.replace(/\.[^.]+$/, '');
  parts.push(`"${outPath}/${baseName}${outExt}"`);

  input.value = parts.join(' ');
}

export function copyFfmpegCommand() {
  const input = document.getElementById('ffmpeg-cmd');
  if (!input.value) return;
  navigator.clipboard.writeText(input.value).then(() => {
    input.classList.add('copied');
    setTimeout(() => input.classList.remove('copied'), 600);
  }).catch(() => {
    input.select();
    document.execCommand('copy');
  });
}

export function triggerEncode() {
  document.getElementById('encode-dropdown').classList.remove('active');
  console.log("Starting encode...");
}

export function toggleEncodeDropdown(e) {
  e.stopPropagation();
  document.getElementById('encode-dropdown').classList.toggle('active');
}

export function selectEncodeMode(mode, btnElement) {
  document.getElementById('btn-encode-text').textContent = btnElement.textContent;
  document.querySelectorAll('.encode-dropdown button').forEach(btn => btn.classList.remove('active-option'));
  btnElement.classList.add('active-option');
  document.getElementById('encode-dropdown').classList.remove('active');
}
