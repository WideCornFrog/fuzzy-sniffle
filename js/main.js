// ============================================================
// main.js — Bootstrap & wire everything to window
// ============================================================

import {
  state,
  audioActivePresets, audioCustomPresets,
  videoActivePresets, videoCustomPresets
} from './state.js';
import { selectMediaItem } from './media.js';
import {
  updateVideoOptions, onVideoCodecChange, resetVideoPanel, onVideoPanelChange,
  openVideoAdvancedModal, closeVideoAdvancedModal,
  resetAllVideoAdvancedSettings, resetSpecificVideoSettings,
  markVideoEdited, onVideoEnableChange, applyVideoPreset, renameVideoPreset,
  saveVideoPresetSettings, deleteVideoPreset
} from './video.js';
import {
  updateAudioOptions, onAudioCodecChange, onAudioPanelChange, onAudioModeChange,
  resetAudioPanel, openAudioAdvancedModal, closeAudioAdvancedModal,
  resetAllAudioAdvancedSettings, resetSpecificAudioSettings,
  markAudioAdvancedEdited, onAudioEnableChange, applyAudioPreset, renameAudioPreset,
  saveAudioPresetSettings, deleteAudioPreset
} from './audio.js';
import {
  updateOutputFormatOptions, updateVideoCodecAvailability,
  updateAudioCodecAvailability, updateContainerAvailability,
  onContainerChange, updatePanelTags
} from './output.js';
import {
  refreshFfmpegCommand, copyFfmpegCommand,
  triggerEncode, toggleEncodeDropdown, selectEncodeMode
} from './ffmpeg.js';
import { openInfoModal, closeInfoModal, switchInfoTab, navigateFile } from './details.js';
import { openSettings, closeSettings } from './settings.js';
import { initAllCustomSelects, setEditedChecker, setLabelSuffixProvider, refreshSelect } from './custom-select.js';
import { isVideoBasicEdited, isVideoAdvancedEdited } from './video.js';
import { isAudioBasicEdited, isAudioAdvancedEdited } from './audio.js';

setEditedChecker((selectId, value) => {
  if (selectId === 'video-codec')
    return { basic: isVideoBasicEdited(value), advanced: isVideoAdvancedEdited(value) };
  if (selectId === 'audio-codec')
    return { basic: isAudioBasicEdited(value), advanced: isAudioAdvancedEdited(value) };
  return { basic: false, advanced: false };
});

// Shows the active preset next to each codec — always displays a suffix.
setLabelSuffixProvider((selectId, value) => {
  if (selectId === 'audio-codec') {
    const active = audioActivePresets[value];
    if (!active || active === 'standard') return '· Standard';
    if (active === 'high') return '· High Quality';
    const custom = (audioCustomPresets[value] || []).find(p => p.id === active);
    return custom ? `· ${custom.name}` : '· Standard';
  }
  if (selectId === 'video-codec') {
    const active = videoActivePresets[value];
    if (!active || active === 'standard') return '· Standard';
    const custom = (videoCustomPresets[value] || []).find(p => p.id === active);
    return custom ? `· ${custom.name}` : '· Standard';
  }
  return null;
});

Object.assign(window, {
  selectMediaItem,

  onVideoCodecChange, onVideoEnableChange, resetVideoPanel, onVideoPanelChange,
  openVideoAdvancedModal, closeVideoAdvancedModal,
  resetAllVideoAdvancedSettings, resetSpecificVideoSettings, markVideoEdited,
  applyVideoPreset, renameVideoPreset, saveVideoPresetSettings, deleteVideoPreset,

  onAudioCodecChange, onAudioPanelChange, onAudioModeChange, onAudioEnableChange,
  resetAudioPanel, openAudioAdvancedModal, closeAudioAdvancedModal,
  resetAllAudioAdvancedSettings, resetSpecificAudioSettings, markAudioAdvancedEdited,
  applyAudioPreset, renameAudioPreset, saveAudioPresetSettings, deleteAudioPreset,

  onContainerChange,

  refreshFfmpegCommand, copyFfmpegCommand, triggerEncode, toggleEncodeDropdown, selectEncodeMode,

  openInfoModal, closeInfoModal, switchInfoTab, navigateFile,

  openSettings, closeSettings,

  handleTurboToggle: (cb) => { if (cb.checked) document.getElementById('turboModal').classList.add('active'); },
  confirmTurbo: () => document.getElementById('turboModal').classList.remove('active'),
  cancelTurbo: () => document.getElementById('turboModal').classList.remove('active')
});

window.addEventListener('DOMContentLoaded', () => {
  initAllCustomSelects();
  updateVideoOptions();
  updateAudioOptions();
  updateVideoCodecAvailability();
  updateAudioCodecAvailability();
  updateContainerAvailability();
  updatePanelTags();
  refreshFfmpegCommand();

  ['video-codec', 'audio-codec', 'output-format'].forEach(id =>
    document.getElementById(id).addEventListener('change', () => refreshSelect(id)));

  document.addEventListener('input', () => refreshFfmpegCommand());
  document.addEventListener('change', () => refreshFfmpegCommand());

  void state; void updateOutputFormatOptions;
});
