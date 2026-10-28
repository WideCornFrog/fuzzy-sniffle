// ============================================================
// custom-select.js — Reusable custom <select> wrapper
// ============================================================

export const customSelects = {};
let activeTooltipEl = null;
let globalOptionIndexCounter = 0;

function getOrCreateTooltip() {
  if (activeTooltipEl) return activeTooltipEl;
  activeTooltipEl = document.createElement('div');
  activeTooltipEl.className = 'cselect-tooltip';
  document.body.appendChild(activeTooltipEl);
  return activeTooltipEl;
}
function hideTooltip() { if (activeTooltipEl) activeTooltipEl.classList.remove('visible'); }

export function sortSelectOptions(selectEl) {
  const currentValue = selectEl.value;
  const items = [];

  Array.from(selectEl.children).forEach(child => {
    const add = (opt, group) => {
      if (!opt.dataset.originalGroup) {
        opt.dataset.originalGroup = (group === 'NOT SUPPORTED BY CODEC(S)') ? '' : (group || '');
      }
      if (opt.dataset.originalIndex === undefined) {
        opt.dataset.originalIndex = globalOptionIndexCounter++;
      }
      items.push({ opt, group: opt.dataset.originalGroup, index: +opt.dataset.originalIndex });
    };
    if (child.tagName === 'OPTGROUP') {
      Array.from(child.children).forEach(opt => add(opt, child.label));
    } else if (child.tagName === 'OPTION') {
      add(child, '');
    }
  });

  items.sort((a, b) => {
    if (!a.opt.disabled && b.opt.disabled) return -1;
    if (a.opt.disabled && !b.opt.disabled) return 1;
    return a.index - b.index;
  });

  selectEl.innerHTML = '';
  let lastGroup = null;
  let currentOptgroup = null;

  items.forEach(item => {
    const groupLabel = item.opt.disabled ? 'NOT SUPPORTED BY CODEC(S)' : (item.group || null);
    if (groupLabel !== lastGroup) {
      if (groupLabel) {
        currentOptgroup = document.createElement('optgroup');
        currentOptgroup.label = groupLabel;
        selectEl.appendChild(currentOptgroup);
      } else {
        currentOptgroup = null;
      }
      lastGroup = groupLabel;
    }
    (currentOptgroup || selectEl).appendChild(item.opt);
  });

  if (currentValue) selectEl.value = currentValue;
}

let editedChecker = () => ({ basic: false, advanced: false });
export function setEditedChecker(fn) { editedChecker = fn; }

let labelSuffixProvider = () => null;
export function setLabelSuffixProvider(fn) { labelSuffixProvider = fn; }

export function initCustomSelect(selectEl) {
  const wrapper = document.createElement('div');
  wrapper.className = 'cselect';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'cselect-trigger';

  const panel = document.createElement('div');
  panel.className = 'cselect-panel';
  panel.setAttribute('role', 'listbox');

  selectEl.parentNode.insertBefore(wrapper, selectEl);
  wrapper.appendChild(trigger);
  wrapper.appendChild(panel);
  wrapper.appendChild(selectEl);
  selectEl.style.display = 'none';

  const controller = new AbortController();
  const { signal } = controller;

  let isOpen = false;
  let ctrl = null;

  function positionPanel() {
    const rect = trigger.getBoundingClientRect();
    const panelMaxH = 320;
    let top = rect.bottom + 4;
    if (top + panelMaxH > window.innerHeight && rect.top > panelMaxH) {
      top = rect.top - panelMaxH - 4;
    }
    
    // Measure natural content width and clamp it
    panel.style.width = 'max-content';
    panel.style.minWidth = rect.width + 'px';
    
    let width = panel.offsetWidth;
    const maxAvailable = window.innerWidth - 20;
    width = Math.min(width, maxAvailable, 480); 
    
    let left = rect.left;
    if (left + width > window.innerWidth - 10) {
      left = Math.max(10, window.innerWidth - width - 10);
    }

    panel.style.top = top + 'px';
    panel.style.left = left + 'px';
    panel.style.width = width + 'px';
  }

  function buildOption(opt) {
    const el = document.createElement('div');
    el.className = 'cselect-option';
    el.setAttribute('role', 'option');
    if (opt.disabled) el.classList.add('cselect-option--disabled');
    if (opt.selected) el.classList.add('cselect-option--selected');

    const span = document.createElement('span');
    span.textContent = opt.textContent.replace(/^⛔\s*/, '');
    span.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    el.appendChild(span);

    const right = document.createElement('div');
    right.style.cssText = 'display:flex;align-items:center;gap:8px;margin-left:auto;flex-shrink:0;';

    const suffix = labelSuffixProvider(selectEl.id, opt.value);
    if (suffix) {
      const s = document.createElement('span');
      s.textContent = suffix;
      s.style.cssText = 'color:#888;font-size:11px;font-style:italic;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis;';
      right.appendChild(s);
    }

    const { basic, advanced } = editedChecker(selectEl.id, opt.value);
    if (basic || advanced) {
      const tagsDiv = document.createElement('div');
      tagsDiv.style.cssText = 'display:flex;align-items:center;gap:6px;width:130px;justify-content:flex-end;flex-shrink:0;';
      
      if (basic) {
        const t = document.createElement('span');
        t.className = 'cselect-edited-tag';
        t.textContent = 'EDITED';
        tagsDiv.appendChild(t);
      }
      if (advanced) {
        const t = document.createElement('span');
        t.className = 'cselect-edited-tag cselect-edited-tag-red';
        t.textContent = 'ADVANCED';
        tagsDiv.appendChild(t);
      }
      right.appendChild(tagsDiv);
    }

    const checkDiv = document.createElement('div');
    checkDiv.style.cssText = 'width:16px;display:flex;justify-content:center;flex-shrink:0;';
    if (opt.selected) {
      const c = document.createElement('span');
      c.textContent = '✓';
      c.style.cssText = 'color:#2563eb;font-size:12px;';
      checkDiv.appendChild(c);
    }
    right.appendChild(checkDiv);

    el.appendChild(right);

    if (opt.disabled && opt.title) {
      el.addEventListener('mouseenter', (e) => {
        const tip = getOrCreateTooltip();
        tip.textContent = opt.title;
        tip.classList.add('visible');
        const r = e.currentTarget.getBoundingClientRect();
        let left = r.right + 10;
        const maxLeft = window.innerWidth - 380;
        if (left > maxLeft) left = Math.max(10, r.left - 370);
        tip.style.left = left + 'px';
        tip.style.top = (r.top - 2) + 'px';
      });
      el.addEventListener('mouseleave', hideTooltip);
    }

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (opt.disabled) return;
      
      if (opt.value !== selectEl.value) {
        selectEl.value = opt.value;
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      close();
    });

    return el;
  }

  function render() {
    trigger.disabled = !!selectEl.disabled;

    const selOpt = selectEl.selectedOptions[0];
    trigger.innerHTML = `<span class="cselect-label"></span>
      <svg class="cselect-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>`;

    const baseText = selOpt ? selOpt.textContent.replace(/^⛔\s*/, '') : '';
    const suffix = selOpt ? labelSuffixProvider(selectEl.id, selOpt.value) : null;
    trigger.querySelector('.cselect-label').textContent =
      baseText + (suffix ? ' ' + suffix : '');

    panel.innerHTML = '';
    let lastGroup = null;

    Array.from(selectEl.children).forEach(child => {
      if (child.tagName === 'OPTGROUP') {
        if (child.label !== lastGroup) {
          const g = document.createElement('div');
          g.className = 'cselect-group';
          if (child.label === 'NOT SUPPORTED BY CODEC(S)') g.classList.add('cselect-group--disabled');
          g.textContent = child.label;
          panel.appendChild(g);
          lastGroup = child.label;
        }
        Array.from(child.children).forEach(opt => panel.appendChild(buildOption(opt)));
      } else if (child.tagName === 'OPTION') {
        lastGroup = null;
        panel.appendChild(buildOption(child));
      }
    });
  }

  function open() {
    if (selectEl.disabled) return;
    hideTooltip();
    render();
    Object.values(customSelects).forEach(cs => { if (cs && cs !== ctrl) cs.close(); });
    isOpen = true;
    wrapper.classList.add('open');
    positionPanel();
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    wrapper.classList.remove('open');
    hideTooltip();
    render();
    trigger.blur();
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isOpen) close(); else open();
  });

  document.addEventListener('click', () => { if (isOpen) close(); }, { signal });
  window.addEventListener('resize', () => { if (isOpen) positionPanel(); }, { signal });

  render();
  ctrl = { refresh: render, close, wrapper, destroy: () => controller.abort() };
  return ctrl;
}

export function initAllCustomSelects() {
  [
    'video-codec', 'audio-codec', 'output-format',
    'video-preset', 'audio-preset',
    'fps-select', 'res-select', 'sample-rate-select', 'audio-channels'
  ].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) customSelects[id] = initCustomSelect(sel);
  });
}

export function refreshSelect(id) {
  const cs = customSelects[id];
  if (cs) cs.refresh();
}
