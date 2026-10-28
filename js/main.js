// ============================================================
// main.js — Bootstrap & wire everything to window
// ============================================================

import {
  state,
  audioActivePresets, audioCustomPresets,
  videoActivePresets, videoCustomPresets
} from './state.js';

import { 
  selectMediaItem, openFileExplorer, closeFileExplorer, 
  toggleRowSelect, toggleGlobalSelect, toggleGroupSelect, removeMediaItem, renderMediaList,
  clearSettings
} from './media.js';

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
  // Media
  selectMediaItem, openFileExplorer, closeFileExplorer, 
  toggleRowSelect, toggleGlobalSelect, toggleGroupSelect, removeMediaItem, renderMediaList, clearSettings,

  // Video
  onVideoCodecChange, onVideoEnableChange, resetVideoPanel, onVideoPanelChange,
  openVideoAdvancedModal, closeVideoAdvancedModal,
  resetAllVideoAdvancedSettings, resetSpecificVideoSettings, markVideoEdited,
  applyVideoPreset, renameVideoPreset, saveVideoPresetSettings, deleteVideoPreset,

  // Audio
  onAudioCodecChange, onAudioPanelChange, onAudioModeChange, onAudioEnableChange,
  resetAudioPanel, openAudioAdvancedModal, closeAudioAdvancedModal,
  resetAllAudioAdvancedSettings, resetSpecificAudioSettings, markAudioAdvancedEdited,
  applyAudioPreset, renameAudioPreset, saveAudioPresetSettings, deleteAudioPreset,

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

window.addEventListener('DOMContentLoaded', () => {
  initAllCustomSelects();
  
  // Force UI to an empty, unchecked state immediately on boot before other UI updates
  clearSettings(); 

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
  
  document.addEventListener('change', (e) => {
    refreshFfmpegCommand();
    // Remove focus highlight from native dropdowns after selection
    if (e.target.tagName === 'SELECT') {
      e.target.blur();
    }
  });

  let lastActiveSelect = null;

  // Force blur on native selects if clicked twice (closing without picking) or clicking outside
  document.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'SELECT') {
      if (lastActiveSelect === e.target) {
        lastActiveSelect = null;
        // Let the native toggle occur, then remove focus
        setTimeout(() => { e.target.blur(); }, 10);
      } else {
        lastActiveSelect = e.target;
      }
    } else if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      lastActiveSelect = null;
      if (document.activeElement && document.activeElement.tagName === 'SELECT') {
        document.activeElement.blur();
      }
    }
  });

  // Blur text inputs when Enter is pressed to remove the highlight/focus state
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const tag = e.target.tagName;
      if (tag === 'INPUT' && e.target.type === 'text' || tag === 'TEXTAREA') {
        e.target.blur();
      }
    }
  });

  void state; void updateOutputFormatOptions;

  // FINAL STEP: Reveal the fully initialized UI to eliminate layout shifts
  document.querySelector('.app-container').classList.add('loaded');
});
