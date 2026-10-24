// ============================================================
// main.js — Bootstrap & wire everything to window
// ============================================================

import { state } from './state.js';
import { selectMediaItem } from './media.js';
import {
  updateVideoOptions, onVideoCodecChange, resetVideoPanel,
  openVideoAdvancedModal, closeVideoAdvancedModal,
  resetAllVideoAdvancedSettings, resetSpecificVideoSettings,
  markVideoEdited, onVideoEnableChange, applyVideoPreset
} from './video.js';
import {
  updateAudioOptions, onAudioCodecChange, onAudioPanelChange, onAudioModeChange,
  resetAudioPanel, openAudioAdvancedModal, closeAudioAdvancedModal,
  resetAllAudioAdvancedSettings, resetSpecificAudioSettings,
  markAudioAdvancedEdited, onAudioEnableChange, applyAudioPreset, renameAudioPreset
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
import { initAllCustomSelects, setEditedChecker, refreshSelect } from './custom-select.js';
import { isVideoBasicEdited, isVideoAdvancedEdited } from './video.js';
import { isAudioBasicEdited, isAudioAdvancedEdited } from './audio.js';

// Wire up custom-select's edited-checker callback
setEditedChecker((selectId, value) => {
  if (selectId === 'video-codec')
    return { basic: isVideoBasicEdited(value), advanced: isVideoAdvancedEdited(value) };
  if (selectId === 'audio-codec')
    return { basic: isAudioBasicEdited(value), advanced: isAudioAdvancedEdited(value) };
  return { basic: false, advanced: false };
});

// Expose everything needed by inline HTML handlers in one shot
Object.assign(window, {
  // Media
  selectMediaItem,

  // Video
  onVideoCodecChange, onVideoEnableChange, resetVideoPanel,
  openVideoAdvancedModal, closeVideoAdvancedModal,
  resetAllVideoAdvancedSettings, resetSpecificVideoSettings, markVideoEdited,
  applyVideoPreset,

  // Audio
  onAudioCodecChange, onAudioPanelChange, onAudioModeChange, onAudioEnableChange,
  resetAudioPanel, openAudioAdvancedModal, closeAudioAdvancedModal,
  resetAllAudioAdvancedSettings, resetSpecificAudioSettings, markAudioAdvancedEdited,
  applyAudioPreset, renameAudioPreset,

  // Output
  onContainerChange,

  // FFmpeg
  refreshFfmpegCommand, copyFfmpegCommand, triggerEncode, toggleEncodeDropdown, selectEncodeMode,

  // Details
  openInfoModal, closeInfoModal, switchInfoTab, navigateFile,

  // Settings
  openSettings, closeSettings,

  // Turbo modal
  handleTurboToggle: (cb) => { if (cb.checked) document.getElementById('turboModal').classList.add('active'); },
  confirmTurbo: () => document.getElementById('turboModal').classList.remove('active'),
  cancelTurbo: () => document.getElementById('turboModal').classList.remove('active')
});

// Boot
window.addEventListener('DOMContentLoaded', () => {
  initAllCustomSelects();
  updateVideoOptions();
  updateAudioOptions();
  updateVideoCodecAvailability();
  updateAudioCodecAvailability();
  updateContainerAvailability();
  updatePanelTags();
  refreshFfmpegCommand();

  // Custom-select needs re-rendering on native change
  ['video-codec', 'audio-codec', 'output-format'].forEach(id =>
    document.getElementById(id).addEventListener('change', () => refreshSelect(id)));

  // Global debounced ffmpeg refresh
  document.addEventListener('input', () => refreshFfmpegCommand());
  document.addEventListener('change', () => refreshFfmpegCommand());

  void state; void updateOutputFormatOptions;
});
