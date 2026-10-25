// ============================================================
// ui-utils.js — Custom Modal Prompts (Prompt, Confirm, Reset)
// ============================================================

export function showPrompt(title, defaultValue = '') {
  return new Promise((resolve) => {
    const modal = document.getElementById('promptModal');
    const titleEl = document.getElementById('prompt-title');
    const input = document.getElementById('prompt-input');
    const btnCancel = document.getElementById('prompt-cancel');
    const btnConfirm = document.getElementById('prompt-confirm');

    titleEl.textContent = title;
    input.value = defaultValue;
    modal.classList.add('active');
    
    // Focus and select text after the modal transition starts
    setTimeout(() => { input.focus(); input.select(); }, 50);

    const cleanup = () => {
      modal.classList.remove('active');
      btnCancel.onclick = null;
      btnConfirm.onclick = null;
      input.onkeydown = null;
    };

    btnCancel.onclick = () => { cleanup(); resolve(null); };
    btnConfirm.onclick = () => { const v = input.value; cleanup(); resolve(v); };
    input.onkeydown = (e) => {
      if (e.key === 'Enter') { const v = input.value; cleanup(); resolve(v); }
      if (e.key === 'Escape') { cleanup(); resolve(null); }
    };
  });
}

export function showConfirm(title, message, confirmText = 'Confirm', isDanger = false) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirm-title');
    const msgEl = document.getElementById('confirm-message');
    const btnCancel = document.getElementById('confirm-cancel');
    const btnConfirm = document.getElementById('confirm-confirm');

    titleEl.textContent = title;
    msgEl.textContent = message;
    btnConfirm.textContent = confirmText;
    btnConfirm.className = 'btn-confirm' + (isDanger ? ' btn-preset-danger' : '');

    modal.classList.add('active');

    const cleanup = () => {
      modal.classList.remove('active');
      btnCancel.onclick = null;
      btnConfirm.onclick = null;
    };

    btnCancel.onclick = () => { cleanup(); resolve(false); };
    btnConfirm.onclick = () => { cleanup(); resolve(true); };
  });
}

export function showResetConfirm(title, message, showBasicOption) {
  return new Promise((resolve) => {
    const modal = document.getElementById('resetModal');
    const titleEl = document.getElementById('reset-title');
    const msgEl = document.getElementById('reset-message');
    const btnCancel = document.getElementById('reset-cancel');
    const btnBasic = document.getElementById('reset-basic');
    const btnAll = document.getElementById('reset-all');

    titleEl.textContent = title;
    msgEl.textContent = message;
    btnBasic.style.display = showBasicOption ? 'inline-block' : 'none';
    btnAll.textContent = showBasicOption ? 'Reset Basic & Advanced' : 'Reset Advanced';

    modal.classList.add('active');

    const cleanup = () => {
      modal.classList.remove('active');
      btnCancel.onclick = null;
      btnBasic.onclick = null;
      btnAll.onclick = null;
    };

    btnCancel.onclick = () => { cleanup(); resolve('cancel'); };
    btnBasic.onclick = () => { cleanup(); resolve('basic'); };
    btnAll.onclick = () => { cleanup(); resolve('all'); };
  });
}