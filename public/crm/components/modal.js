const Modal = (() => {
  let overlay;

  const ensure = () => {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(4px);';
      overlay.addEventListener('click', (e) => { if (e.target === overlay) Modal.close(); });
      document.body.appendChild(overlay);
    }
  };

  const open = ({ title, body, footer, onClose, size = 'md' }) => {
    ensure();
    const maxW = { sm: '400px', md: '560px', lg: '720px', full: '100%' }[size] || '560px';
    overlay.innerHTML = `
      <div class="modal-sheet" style="background:var(--card);border-radius:16px 16px 0 0;width:100%;max-width:${maxW};max-height:90vh;display:flex;flex-direction:column;animation:slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1);">
        <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
          <span style="font-size:16px;font-weight:700;">${title}</span>
          <button onclick="Modal.close()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:20px;padding:4px;line-height:1;">✕</button>
        </div>
        <div class="modal-body" style="padding:20px;overflow-y:auto;flex:1;">${body}</div>
        ${footer ? `<div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end;flex-shrink:0;">${footer}</div>` : ''}
      </div>
    `;
    overlay.style.display = 'flex';
    if (!document.getElementById('modal-anim')) {
      const s = document.createElement('style');
      s.id = 'modal-anim';
      s.textContent = '@keyframes slideUp{from{transform:translateY(100%)}to{transform:none}}';
      document.head.appendChild(s);
    }
    if (onClose) overlay._onClose = onClose;
    tg.BackButton?.show();
    tg.BackButton?.onClick(() => Modal.close());
  };

  const close = () => {
    if (!overlay) return;
    overlay.style.display = 'none';
    overlay.innerHTML = '';
    if (overlay._onClose) { overlay._onClose(); overlay._onClose = null; }
    tg.BackButton?.hide();
  };

  return { open, close };
})();
