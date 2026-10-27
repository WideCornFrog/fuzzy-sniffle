// ============================================================
// state.js — All shared data, constants, and mutable state
// ============================================================

// These are the templates shown in the File Explorer
export const fileTemplates = {
  'file1': {
    name: 'File with only audio.flac', type: 'audio', hasVideo: false, hasAudio: true,
    stats: [
      { label: 'Codec', value: 'FLAC' }, { label: 'Size', value: '120 MB' },
      { label: 'Length', value: '15:30' }, { label: 'Audio Format', value: '16-bit / 44.1 kHz' }
    ],
    details: {
      general: [['Format:', 'FLAC'], ['File size:', '120.0 MiB'], ['Duration:', '15 min 30 s'], ['Overall bit rate:', '1 082 kb/s']],
      audio: [['Format:', 'FLAC'], ['Format/Info:', 'Free Lossless Audio Codec'], ['Duration:', '15 min 30 s'], ['Bit rate mode:', 'Variable'], ['Channel(s):', '2 channels'], ['Sampling rate:', '44.1 kHz'], ['Bit depth:', '16 bits'], ['Compression mode:', 'Lossy']],
      tags: [['ARTIST:', 'Various Artists'], ['ALBUM:', 'Test Album']]
    }
  },
  'file2': {
    name: 'File with only video.mp4', type: 'video', hasVideo: true, hasAudio: false,
    stats: [
      { label: 'Video', value: 'HEVC' }, { label: 'Size', value: '4.2 GB' },
      { label: 'Length', value: '01:45:00' }, { label: 'FPS', value: '24' }
    ],
    details: {
      general: [['Format:', 'MPEG-4'], ['File size:', '4.20 GiB'], ['Duration:', '1 h 45 min'], ['Overall bit rate:', '5 716 kb/s']],
      video: [['Format:', 'HEVC'], ['Format/Info:', 'High Efficiency Video Coding'], ['Duration:', '1 h 45 min'], ['Bit rate:', '5 500 kb/s'], ['Width:', '1 920 pixels'], ['Height:', '1 080 pixels'], ['Frame rate:', '24.000 FPS'], ['Bit depth:', '10 bits']],
      tags: [['ENCODER:', 'Video Tool'], ['DATE:', '2023-01-01']]
    }
  },
  'file3': {
    name: 'File with video and audio.mkv', type: 'video', hasVideo: true, hasAudio: true,
    stats: [
      { label: 'Video', value: 'HEVC' }, { label: 'Size', value: '2.1 GB' },
      { label: 'Length', value: '01:30:00' }, { label: 'FPS', value: '24' },
      { label: 'Audio', value: 'AAC / 192 kbps' }
    ],
    details: {
      general: [['Format:', 'Matroska'], ['File size:', '2.10 GiB'], ['Duration:', '1 h 30 min'], ['Overall bit rate:', '3 342 kb/s']],
      video: [['Format:', 'HEVC'], ['Format/Info:', 'High Efficiency Video Coding'], ['Duration:', '1 h 30 min'], ['Bit rate:', '3 100 kb/s'], ['Width:', '1 920 pixels'], ['Height:', '1 080 pixels'], ['Frame rate:', '24.000 FPS'], ['Bit depth:', '10 bits']],
      audio: [['Format:', 'AAC'], ['Duration:', '1 h 30 min'], ['Bit rate:', '192 kb/s'], ['Channel(s):', '1 channel'], ['Sampling rate:', '48.0 kHz']],
      tags: [['ENCODER:', 'SVT-AV1'], ['DATE:', '2023-05-15']]
    }
  }
};

// These populate dynamically as the user adds files via the explorer
export const filesData = {};
export const fileOrder = [];

// ---- Mutable runtime state ----
export const state = {
  selectedFileId: null,
  selectedFileIds: [],
  loadedFileIds: [],
  bulkSelectMode: 'all',
  currentVideoCategory: 'normal',
  currentRenderedAudioCodec: '',
  currentRenderedVideoCodec: '',
  activeVideoTab: 'h264_nvenc',
  activeAudioTab: 'libopus'
};

// ---- Compatibility matrix ----
export const CONTAINERS = ['MKV (Matroska)', 'MP4', 'WebM', 'MOV', 'AVI', 'MXF'];

export const VIDEO_FAMILIES = {
  'h264_nvenc':'H.264','hevc_nvenc':'H.265','av1_nvenc':'AV1',
  'h264_amf':'H.264','hevc_amf':'H.265','av1_amf':'AV1',
  'h264_qsv':'H.264','hevc_qsv':'H.265','av1_qsv':'AV1',
  'libx264':'H.264','libx265':'H.265','libaom-av1':'AV1','libsvtav1':'AV1',
  'libvpx-vp9':'VP9','prores':'ProRes','dnxhd':'DNxHD','rawvideo':'Rawvideo','ffv1':'FFV1'
};

export const AUDIO_FAMILIES = {
  'libopus':'Opus','libfdk_aac':'AAC','libmp3lame':'MP3','libvorbis':'Vorbis',
  'flac':'FLAC','alac':'ALAC','ape':'APE','wavpack':'WavPack','wav':'PCM','pcm':'PCM'
};

export const CONTAINER_VIDEO_SUPPORT = {
  'MKV (Matroska)': ['H.264','H.265','AV1','VP9','ProRes','DNxHD','FFV1','Rawvideo'],
  'MP4':            ['H.264','H.265','AV1','VP9'],
  'WebM':           ['VP8','VP9','AV1'],
  'MOV':            ['ProRes','DNxHD','H.264','H.265'],
  'AVI':            ['H.264','Rawvideo','FFV1','MPEG-4'],
  'MXF':            ['ProRes','DNxHD','H.264','MPEG-2']
};

export const CONTAINER_AUDIO_SUPPORT = {
  'MKV (Matroska)': ['Opus','AAC','MP3','Vorbis','FLAC','ALAC','APE','WavPack','PCM'],
  'MP4':            ['AAC','MP3','FLAC','PCM','ALAC'],
  'WebM':           ['Opus','Vorbis'],
  'MOV':            ['AAC','ALAC','PCM'],
  'AVI':            ['MP3','AAC','PCM'],
  'MXF':            ['PCM']
};

export const ALL_AUDIO_FAMILIES = ['Opus','AAC','MP3','Vorbis','FLAC','ALAC','APE','WavPack','PCM'];
export const VIDEO_COMPATIBLE_AUDIO = { 'ProRes': ['PCM'], 'DNxHD': ['PCM'], 'Rawvideo': ['PCM'] };
export const PRO_VIDEO_FAMILIES = ['ProRes', 'DNxHD', 'Rawvideo'];
export const getAllowedAudioFamilies = (fam) => VIDEO_COMPATIBLE_AUDIO[fam] || ALL_AUDIO_FAMILIES;

// ---- Extensions ----
export const AUDIO_EXTENSIONS = {
  'libopus':    { default: '.opus', options: ['.opus','.ogg','.mka','.webm'] },
  'libfdk_aac': { default: '.m4a',  options: ['.m4a','.aac','.mka','.mp4','.ts'] },
  'libmp3lame': { default: '.mp3',  options: ['.mp3','.mka','.ts'] },
  'libvorbis':  { default: '.ogg',  options: ['.ogg','.mka','.webm'] },
  'flac':       { default: '.flac', options: ['.flac','.mka','.ogg'] },
  'alac':       { default: '.m4a',  options: ['.m4a','.mka','.caf'] },
  'ape':        { default: '.ape',  options: ['.ape','.mka'] },
  'wavpack':    { default: '.wv',   options: ['.wv','.mka'] },
  'wav':        { default: '.wav',  options: ['.wav','.rf64','.w64'] },
  'pcm':        { default: '.raw',  options: ['.raw','.wav','.aiff','.caf','.au'] }
};

export const ALL_AUDIO_EXTENSIONS = [
  '.opus','.ogg','.mka','.m4a','.aac','.webm','.mp4','.ts',
  '.mp3','.flac','.wav','.rf64','.w64','.raw','.aiff','.caf','.au','.wv','.ape'
];

export const AUDIO_CODEC_DISPLAY = {
  'libopus':'Opus','libfdk_aac':'AAC','libmp3lame':'MP3','libvorbis':'Vorbis',
  'flac':'FLAC','alac':'ALAC','ape':'APE','wavpack':'WavPack','wav':'WAV','pcm':'PCM'
};

// ---- Shared UI-friendly names and options ----
export const audioCodecNames = {
  'libopus':'Opus','libfdk_aac':'AAC','libmp3lame':'MP3','libvorbis':'Vorbis',
  'flac':'FLAC','alac':'ALAC','ape':"Monkey's Audio",'wavpack':'WavPack','wav':'WAV','pcm':'PCM'
};

export const DEFAULT_SAMPLE_RATES = `
  <option value="Same as source" selected>Same as source</option>
  <option value="8000">8 kHz</option><option value="11025">11.025 kHz</option>
  <option value="12000">12 kHz</option><option value="16000">16 kHz</option>
  <option value="22050">22.05 kHz</option><option value="24000">24 kHz</option>
  <option value="32000">32 kHz</option><option value="44100">44.1 kHz</option>
  <option value="48000">48 kHz</option><option value="64000">64 kHz</option>
  <option value="88200">88.2 kHz</option><option value="96000">96 kHz</option>
  <option value="176400">176.4 kHz</option><option value="192000">192 kHz</option>
  <option value="352800">352.8 kHz</option><option value="384000">384 kHz</option>`;

export const DEFAULT_CHANNELS = `
  <option value="Same as source" selected>Same as source</option>
  <option value="Mono (1.0)">Mono</option><option value="Stereo (2.0)">Stereo</option>
  <option value="Quadraphonic (4.0)">Quadraphonic</option>
  <option value="Surround (5.0)">5.0 surround</option>
  <option value="Surround (5.1)">5.1 surround</option>
  <option value="Surround (6.1)">6.1 surround</option>
  <option value="Surround (7.1)">7.1 surround</option>`;

export const MP3_CHANNELS = `
  <option value="Same as source" selected>Same as source</option>
  <option value="Mono (1.0)">Mono</option><option value="Stereo (2.0)">Stereo</option>`;

export const AAC_SAMPLE_RATES = [
  { val: "8000", label: "8 kHz" }, { val: "11025", label: "11.025 kHz" },
  { val: "12000", label: "12 kHz" }, { val: "16000", label: "16 kHz" },
  { val: "22050", label: "22.05 kHz" }, { val: "24000", label: "24 kHz" },
  { val: "32000", label: "32 kHz" }, { val: "44100", label: "44.1 kHz" },
  { val: "48000", label: "48 kHz" }, { val: "64000", label: "64 kHz" },
  { val: "88200", label: "88.2 kHz" }, { val: "96000", label: "96 kHz" }
];

export const MP3_SAMPLE_RATES = [
  { val: "32000", label: "32 kHz" }, { val: "44100", label: "44.1 kHz" },
  { val: "48000", label: "48 kHz" }
];

// ---- Utility helpers (single source of truth) ----
export const isLosslessCodec = (c) => ['flac','alac','ape','wav','wavpack','pcm'].includes(c);
export const getContainersForVideoFamily = (f) => CONTAINERS.filter(c => (CONTAINER_VIDEO_SUPPORT[c]||[]).includes(f));
export const getContainersForAudioFamily = (f) => CONTAINERS.filter(c => (CONTAINER_AUDIO_SUPPORT[c]||[]).includes(f));
export const getAudioCodecsForExtension = (ext) =>
  Object.keys(AUDIO_EXTENSIONS).filter(c => (AUDIO_EXTENSIONS[c].options||[]).includes(ext));

// ---- Audio runtime state (lossy + lossless all keyed by codec) ----
export const audioState = {
  opus: { mode: 'vbr', vbrTarget: 128, cbrBitrate: 128 },
  aac: { mode: 'vbr', vbrQuality: 3, cbrBitrate: 192 },
  mp3: { mode: 'vbr', vbrQuality: 4, abrBitrate: 192, cbrBitrate: 192, vbrLimit: '' },
  vorbis: { mode: 'vbr', vbrQuality: 3.0, abrTarget: 192, sampleRate: '48000' },
  flac: { compression: '5', sampleRate: 'Same as source', channels: 'Same as source', bitDepth: 'Same as source' },
  alac: { compression: '3', sampleRate: 'Same as source', channels: 'Same as source', bitDepth: 'Same as source' },
  wavpack: { compression: '1', sampleRate: 'Same as source', channels: 'Same as source', bitDepth: 'Same as source' },
  ape: { compression: '2', sampleRate: 'Same as source', channels: 'Same as source', bitDepth: 'Same as source' },
  wav: { sampleRate: 'Same as source', channels: 'Same as source', bitDepth: 'Same as source' },
  pcm: { sampleRate: 'Same as source', channels: 'Same as source', bitDepth: 'Same as source' }
};

// Per-codec list of user-created presets. Each entry: { id, name, data }
export const audioCustomPresets = {
  'libopus': [], 'libfdk_aac': [], 'libmp3lame': [], 'libvorbis': [],
  'flac': [], 'alac': [], 'ape': [], 'wavpack': [], 'wav': [], 'pcm': []
};

// Active preset per codec: 'standard' | 'high' | custom id ('custom1', 'custom2', …)
export const audioActivePresets = {
  'libopus': 'standard', 'libfdk_aac': 'standard', 'libmp3lame': 'standard', 'libvorbis': 'standard',
  'flac': 'standard', 'alac': 'standard', 'ape': 'standard', 'wavpack': 'standard', 'wav': 'standard', 'pcm': 'standard'
};

export const audioPresetStateCache = {}; 

export const currentVideoBasicState = {};
export const audioStateByCategory = { normal: null, pro: null };
export const videoPresetStateCache = {}; 

// ---- Video capability matrix ----
export const codecCapabilities = {
  'h264_nvenc': {
    quality: { label: 'Quality (CQ)', type: 'slider', min: 0, max: 51, default: 23, step: 1 },
    preset: { type: 'select', label: 'Preset', options: ['p1','p2','p3','p4','p5','p6','p7'], default: 'p5' },
    tune: { options: ['none','hq','ll','ull','lossless'], default: 'none' },
    profile: { options: ['auto','baseline','main','high'], default: 'auto' },
    level: { options: ['auto','1','2','3','4','5'], default: 'auto' },
    colorRange: { options: ['Same as source','tv','pc'], default: 'Same as source' },
    rateControl: { options: ['constqp','vbr','cbr'], default: 'constqp' },
    bFrames: { type: 'slider', label: 'B-Frames', min: 0, max: 5, default: 0, step: 1 },
    bRefMode: { options: ['disabled','each','middle'], default: 'disabled' },
    spatialAQ: { type: 'checkbox', label: 'Spatial AQ', default: false },
    temporalAQ: { type: 'checkbox', label: 'Temporal AQ', default: false },
    aqStrength: { type: 'slider', label: 'AQ Strength', min: 1, max: 15, default: 8, step: 1 },
    lookahead: { type: 'slider', label: 'Lookahead', min: 0, max: 64, default: 0, step: 1 }
  },
  'hevc_nvenc': {
    quality: { label: 'Quality (CQ)', type: 'slider', min: 0, max: 51, default: 23, step: 1 },
    preset: { type: 'select', label: 'Preset', options: ['p1','p2','p3','p4','p5','p6','p7'], default: 'p5' },
    tune: { options: ['none','hq','ll','ull','lossless'], default: 'none' },
    profile: { options: ['auto','main','main10'], default: 'auto' },
    level: { options: ['auto','1','2','3','4','5'], default: 'auto' },
    colorRange: { options: ['Same as source','tv','pc'], default: 'Same as source' },
    rateControl: { options: ['constqp','vbr','cbr'], default: 'constqp' },
    bFrames: { type: 'slider', label: 'B-Frames', min: 0, max: 5, default: 0, step: 1 },
    bRefMode: { options: ['disabled','each','middle'], default: 'disabled' },
    spatialAQ: { type: 'checkbox', label: 'Spatial AQ', default: false },
    temporalAQ: { type: 'checkbox', label: 'Temporal AQ', default: false },
    aqStrength: { type: 'slider', label: 'AQ Strength', min: 1, max: 15, default: 8, step: 1 },
    lookahead: { type: 'slider', label: 'Lookahead', min: 0, max: 64, default: 0, step: 1 }
  },
  'av1_nvenc': {
    quality: { label: 'Quality (CQ)', type: 'slider', min: 0, max: 51, default: 23, step: 1 },
    preset: { type: 'select', label: 'Preset', options: ['p1','p2','p3','p4','p5','p6','p7'], default: 'p5' },
    tune: { options: ['none','hq','ll','ull','lossless'], default: 'none' },
    profile: { options: ['auto','main'], default: 'auto' },
    level: { options: ['auto','2','3','4','5','6'], default: 'auto' },
    colorRange: { options: ['Same as source','tv','pc'], default: 'Same as source' },
    rateControl: { options: ['constqp','vbr','cbr'], default: 'constqp' },
    bFrames: { type: 'slider', label: 'B-Frames', min: 0, max: 5, default: 0, step: 1 },
    bRefMode: { options: ['disabled','each','middle'], default: 'disabled' },
    spatialAQ: { type: 'checkbox', label: 'Spatial AQ', default: false },
    temporalAQ: { type: 'checkbox', label: 'Temporal AQ', default: false },
    aqStrength: { type: 'slider', label: 'AQ Strength', min: 1, max: 15, default: 8, step: 1 },
    lookahead: { type: 'slider', label: 'Lookahead', min: 0, max: 64, default: 0, step: 1 }
  },
  'h264_amf': {
    quality: { label: 'Quality (QP)', type: 'slider', min: 0, max: 51, default: 23, step: 1 },
    preset: { type: 'select', label: 'Quality Mode', options: ['speed','balanced','quality'], default: 'balanced' },
    profile: { options: ['auto','baseline','main','high'], default: 'auto' },
    level: { options: ['auto','1','2','3','4','5'], default: 'auto' },
    colorRange: { options: ['Same as source','tv','pc'], default: 'Same as source' },
    rateControl: { options: ['cqp','qvbr','vbr_peak','vbr_latency','cbr'], default: 'cqp' },
    usage: { options: ['transcoding','ultralowlatency','lowlatency','webcam','high_quality'], default: 'transcoding' },
    preencode: { type: 'checkbox', label: 'Pre-encode', default: false }
  },
  'hevc_amf': {
    quality: { label: 'Quality (QP)', type: 'slider', min: 0, max: 51, default: 23, step: 1 },
    preset: { type: 'select', label: 'Quality Mode', options: ['speed','balanced','quality'], default: 'balanced' },
    profile: { options: ['auto','main','main10'], default: 'auto' },
    level: { options: ['auto','1','2','3','4','5'], default: 'auto' },
    colorRange: { options: ['Same as source','tv','pc'], default: 'Same as source' },
    rateControl: { options: ['cqp','qvbr','vbr_peak','vbr_latency','cbr'], default: 'cqp' },
    usage: { options: ['transcoding','ultralowlatency','lowlatency','webcam','high_quality'], default: 'transcoding' },
    preencode: { type: 'checkbox', label: 'Pre-encode', default: false }
  },
  'av1_amf': {
    quality: { label: 'Quality (QP)', type: 'slider', min: 0, max: 51, default: 23, step: 1 },
    preset: { type: 'select', label: 'Quality Mode', options: ['speed','balanced','quality'], default: 'balanced' },
    profile: { options: ['auto','main'], default: 'auto' },
    level: { options: ['auto','2','3','4','5','6'], default: 'auto' },
    colorRange: { options: ['Same as source','tv','pc'], default: 'Same as source' },
    rateControl: { options: ['cqp','qvbr','vbr_peak','vbr_latency','cbr'], default: 'cqp' },
    usage: { options: ['transcoding','ultralowlatency','lowlatency','webcam','high_quality'], default: 'transcoding' },
    preencode: { type: 'checkbox', label: 'Pre-encode', default: false }
  },
  'h264_qsv': {
    quality: { label: 'Quality (ICQ)', type: 'slider', min: 1, max: 51, default: 23, step: 1 },
    preset: { type: 'select', label: 'Preset', options: ['veryfast','faster','fast','medium','slow'], default: 'medium' },
    profile: { options: ['auto','baseline','main','high'], default: 'auto' },
    level: { options: ['auto','1','2','3','4','5'], default: 'auto' },
    colorRange: { options: ['Same as source','tv','pc'], default: 'Same as source' },
    rateControl: { options: ['icq','cqp','vbr','cbr'], default: 'icq' },
    extbrc: { type: 'checkbox', label: 'Extended BRC', default: false },
    lookAheadDepth: { type: 'slider', label: 'Lookahead Depth', min: 0, max: 100, default: 0, step: 1 },
    asyncDepth: { type: 'slider', label: 'Async Depth', min: 1, max: 64, default: 4, step: 1 }
  },
  'hevc_qsv': {
    quality: { label: 'Quality (ICQ)', type: 'slider', min: 1, max: 51, default: 23, step: 1 },
    preset: { type: 'select', label: 'Preset', options: ['veryfast','faster','fast','medium','slow'], default: 'medium' },
    profile: { options: ['auto','main','main10'], default: 'auto' },
    level: { options: ['auto','1','2','3','4','5'], default: 'auto' },
    colorRange: { options: ['Same as source','tv','pc'], default: 'Same as source' },
    rateControl: { options: ['icq','cqp','vbr','cbr'], default: 'icq' },
    extbrc: { type: 'checkbox', label: 'Extended BRC', default: false },
    lookAheadDepth: { type: 'slider', label: 'Lookahead Depth', min: 0, max: 100, default: 0, step: 1 },
    asyncDepth: { type: 'slider', label: 'Async Depth', min: 1, max: 64, default: 4, step: 1 }
  },
  'av1_qsv': {
    quality: { label: 'Quality (ICQ)', type: 'slider', min: 1, max: 51, default: 23, step: 1 },
    preset: { type: 'select', label: 'Preset', options: ['veryfast','faster','fast','medium','slow'], default: 'medium' },
    profile: { options: ['auto','main'], default: 'auto' },
    level: { options: ['auto','2','3','4','5','6'], default: 'auto' },
    colorRange: { options: ['Same as source','tv','pc'], default: 'Same as source' },
    rateControl: { options: ['icq','cqp','vbr','cbr'], default: 'icq' },
    extbrc: { type: 'checkbox', label: 'Extended BRC', default: false },
    lookAheadDepth: { type: 'slider', label: 'Lookahead Depth', min: 0, max: 100, default: 0, step: 1 },
    asyncDepth: { type: 'slider', label: 'Async Depth', min: 1, max: 64, default: 4, step: 1 }
  },
  'libx264': {
    quality: { label: 'Quality (CRF)', type: 'slider', min: 0, max: 51, default: 23, step: 1 },
    preset: { type: 'slider', label: 'Preset (Speed)', min: 0, max: 8, default: 5, step: 1, valueLabels: ['0 (fastest)','1','2','3','4','5 (default)','6','7','8 (slowest)'] },
    tune: { options: ['none','film','animation','grain'], default: 'none' },
    profile: { options: ['auto','baseline','main','high'], default: 'auto' },
    level: { options: ['auto','1','2','3','4','5'], default: 'auto' },
    colorRange: { options: ['Same as source','tv','pc'], default: 'Same as source' },
    fastDecode: true,
    x264Params: { type: 'text', label: 'x264 Params', placeholder: 'e.g. keyint=120:min-keyint=120' }
  },
  'libx265': {
    quality: { label: 'Quality (CRF)', type: 'slider', min: 0, max: 51, default: 28, step: 1 },
    preset: { type: 'slider', label: 'Preset (Speed)', min: 0, max: 8, default: 5, step: 1, valueLabels: ['0 (fastest)','1','2','3','4','5 (default)','6','7','8 (slowest)'] },
    tune: { options: ['none','psnr','ssim','grain'], default: 'none' },
    profile: { options: ['auto','main','main10'], default: 'auto' },
    level: { options: ['auto','1','2','3','4','5'], default: 'auto' },
    colorRange: { options: ['Same as source','tv','pc'], default: 'Same as source' },
    fastDecode: true,
    x265Params: { type: 'text', label: 'x265 Params', placeholder: 'e.g. keyint=240:min-keyint=24' }
  },
  'libaom-av1': {
    quality: { label: 'Quality (CRF)', type: 'slider', min: 0, max: 63, default: 30, step: 1 },
    preset: { type: 'slider', label: 'Preset (Speed)', min: 0, max: 8, default: 4, step: 1, valueLabels: ['0 (slowest)','1','2','3','4','5','6','7','8 (fastest)'] },
    cpuUsed: { type: 'slider', label: 'CPU Used', min: 0, max: 8, default: 1, step: 1 },
    rowMt: { type: 'checkbox', label: 'Row Multi-threading', default: false },
    tileColumns: { type: 'slider', label: 'Tile Columns', min: 0, max: 6, default: 0, step: 1 },
    aqMode: { type: 'slider', label: 'AQ Mode', min: 0, max: 3, default: 0, step: 1 }
  },
  'libsvtav1': {
    quality: { label: 'Quality (CRF)', type: 'slider', min: 0, max: 63, default: 30, step: 1 },
    preset: { type: 'slider', label: 'Preset (Speed)', min: 0, max: 13, default: 8, step: 1, valueLabels: ['0 (slowest)','1','2','3','4','5','6','7','8 (default)','9','10','11','12','13 (fastest)'] },
    tune: { options: ['0 (psnr)','1 (subjective)','2 (vq)','3 (ssim)','4 (ms-ssim)','5 (vmaf)','6 (film grain)'], default: '1 (subjective)' },
    filmGrain: { type: 'slider', label: 'Film Grain', min: 0, max: 50, default: 0, step: 1 },
    fastDecode: true
  },
  'libvpx-vp9': {
    quality: { label: 'Quality (CRF)', type: 'slider', min: 0, max: 63, default: 31, step: 1 },
    preset: { type: 'slider', label: 'Preset (Speed)', min: 0, max: 8, default: 4, step: 1, valueLabels: ['0 (slowest)','1','2','3','4','5','6','7','8 (fastest)'] },
    deadline: { options: ['best','good','realtime'], default: 'good' },
    cpuUsed: { type: 'slider', label: 'CPU Used', min: 0, max: 8, default: 0, step: 1 },
    rowMt: { type: 'checkbox', label: 'Row Multi-threading', default: false },
    tileColumns: { type: 'slider', label: 'Tile Columns', min: 0, max: 6, default: 0, step: 1 },
    aqMode: { type: 'slider', label: 'AQ Mode', min: 0, max: 3, default: 0, step: 1 }
  },
  'prores': {
    quality: { label: 'Profile', type: 'select', options: ['proxy','lt','standard','hq','4444','4444xq'], default: 'hq' },
    vendor: { options: ['auto','apl0','fmpg'], default: 'auto' }
  },
  'dnxhd': {
    profile: { options: ['dnxhr_lb','dnxhr_sq','dnxhr_hq','dnxhr_hqx','dnxhr_444'], default: 'dnxhr_hq' },
    bitDepth: { options: ['8','10','12'], default: '10' }
  },
  'rawvideo': { pixelFormat: { options: ['yuv420p','yuv422p','yuv444p','rgb24'], default: 'yuv420p' } },
  'ffv1': {
    level: { options: ['1','3'], default: '3' },
    coder: { options: ['range','golomb'], default: 'range' },
    context: { options: ['small','large'], default: 'small' },
    sliceCrc: { type: 'checkbox', label: 'Slice CRC', default: false }
  }
};

export const videoCodecKeys = Object.keys(codecCapabilities);

export const videoCustomPresets = Object.fromEntries(videoCodecKeys.map(c => [c, []]));
export const videoActivePresets = Object.fromEntries(videoCodecKeys.map(c => [c, 'standard']));

// ---- Default advanced state (generated) ----
export const defaultVideoAdvanced = {};
videoCodecKeys.forEach(codec => {
  const caps = codecCapabilities[codec];
  const d = {};
  const skipped = ['quality','preset','tune','profile','level','colorRange','fastDecode'];
  for (const key in caps) {
    if (skipped.includes(key)) continue;
    const s = caps[key];
    if (s.type === 'checkbox' || s.type === 'slider' || s.options) d[key] = s.default;
    else if (s.type === 'text') d[key] = "";
  }
  if (caps.tune) d.tune = caps.tune.default;
  if (caps.profile) d.profile = caps.profile.default;
  if (caps.level) d.level = caps.level.default;
  if (caps.colorRange) d.colorRange = caps.colorRange.default;
  if (caps.fastDecode) d.fastDecode = false;
  d.customArgs = "";
  defaultVideoAdvanced[codec] = d;
});

export const defaultAudioAdvanced = Object.fromEntries(
  ['libopus','libfdk_aac','libmp3lame','libvorbis','flac','alac','ape','wavpack','wav','pcm']
    .map(c => {
      if (c === 'libmp3lame') return [c, { preserveMetadata: true, cbrBitrate: 192 }];
      return [c, { preserveMetadata: true }];
    })
);

// Mutable runtime state
export const currentVideoAdvanced = JSON.parse(JSON.stringify(defaultVideoAdvanced));
export const currentAudioAdvanced = JSON.parse(JSON.stringify(defaultAudioAdvanced));
