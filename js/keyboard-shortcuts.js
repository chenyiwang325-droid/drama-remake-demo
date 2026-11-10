/**
 * 键盘快捷键支持
 * Alt + 1/2/3/4 切换步骤
 * Esc 关闭弹窗
 */

(function() {
  'use strict';

  // 快捷键配置
  const shortcuts = {
    'Alt+1': () => switchView('p'),
    'Alt+2': () => switchView('a'),
    'Alt+3': () => switchView('adapt'),
    'Alt+4': () => switchView('g'),
    'Escape': () => {
      const picker=document.getElementById('vg-ep-picker-modal');
      if(picker?.style.display==='flex'){
        window.toggleVGEpPicker?.(true);document.getElementById('vg-ep-picker')?.focus({preventScroll:true});return;
      }
      const layer=document.activeElement?.closest('[role="dialog"],dialog,.dialog-backdrop,.shortcuts-help-modal');
      const openPopup=[...document.querySelectorAll('[data-open="1"],[aria-modal="true"],dialog[open],.shortcuts-help-modal,.dialog-backdrop.on,.project-error-panel.on')].some(n=>n.getClientRects().length);
      if(layer||openPopup){closeModals();return;}
      const vg=document.getElementById('v-g');
      if(vg?.matches('.on.vg-studio-on')){window.toggleVGView?.('board');return;}
      window.returnToPreviousDemoView?.();
    },
    '?': () => showShortcutsHelp(),
  };

  // 切换视图
  function switchView(view) {
    if (typeof window.sw === 'function') {
      window.sw(view);
    }
  }

  // 关闭所有弹窗：调用各弹窗的标准关闭函数（与 ✕ 按钮一致）
  // 绝不设置 display:none（会覆盖 .on 的 display:flex，导致无法重开）
  function closeModals() {
    let closed = false;
    const closeFns = {
      'sb-modal-preview': 'closeSbPreviewModal',
      'sb-modal-dl': 'closeSbDownloadModal',
      'asset-img-lightbox': 'closeAssetImgLightbox',
      'asset-library-picker-modal': 'closeAssetLibraryPicker',
      'shot-asset-library-picker-modal': 'closeShotAssetLibraryPicker',
      'shot-ai-modify-panel': 'closeAiModifyPanel',
      'asset-merge-modal': 'closeAssetMergeModal',
      'asset-add-modal': 'closeAssetAddModal',
      'asset-delete-modal': 'closeAssetDeleteModal',
      'asset-history-modal': 'closeAssetHistoryModal',
      'synced-shots-modal': 'closeSyncedShotsModal',
      'shot-history-modal': 'closeShotHistoryModal',
      'regen-shots-modal': 'closeRegenShotsModal',
      'project-error-panel': 'dismissProjectErrorPanel',
    };
    Object.keys(closeFns).forEach(id => {
      const el = document.getElementById(id);
      if (el && el.classList.contains('on')) {
        closed = true;
        const fn = window[closeFns[id]];
        if (typeof fn === 'function') { try { fn(); } catch (e) {} }
        else { el.classList.remove('on'); el.setAttribute('aria-hidden', 'true'); }
      }
    });
    // 兜底：清理任何未注册的残留遮罩（只移除 .on，不动 display）
    document.querySelectorAll('.dialog-backdrop.on').forEach(el => {
      closed = true;
      el.classList.remove('on');
      el.setAttribute('aria-hidden', 'true');
    });
    // A bare Escape in a field must not unlock the studio's own scroll layout.
    if (!closed) return;
    if (typeof window.ensureScrollUnlocked === 'function') window.ensureScrollUnlocked();
    else document.body.style.overflow = '';
  }

  // 显示快捷键帮助
  function showShortcutsHelp() {
    const helpHtml = `
      <div class="shortcuts-help-modal">
        <h3>⌨️ 键盘快捷键</h3>
        <div class="shortcuts-list">
          <div class="shortcut-item">
            <kbd>Alt</kbd> + <kbd>1</kbd>
            <span>切换到项目界面</span>
          </div>
          <div class="shortcut-item">
            <kbd>Alt</kbd> + <kbd>2</kbd>
            <span>切换到资产库</span>
          </div>
          <div class="shortcut-item">
            <kbd>Alt</kbd> + <kbd>3</kbd>
            <span>切换到剧集改编</span>
          </div>
          <div class="shortcut-item">
            <kbd>Alt</kbd> + <kbd>4</kbd>
            <span>切换到视频生成</span>
          </div>
          <div class="shortcut-item">
            <kbd>Esc</kbd>
            <span>关闭弹窗</span>
          </div>
          <div class="shortcut-item">
            <kbd>?</kbd>
            <span>显示此帮助</span>
          </div>
        </div>
        <button class="b ba" onclick="this.closest('.dialog-backdrop').classList.remove('on')">
          知道了
        </button>
      </div>
    `;

    let helpDialog = document.getElementById('shortcuts-help-dialog');
    if (!helpDialog) {
      helpDialog = document.createElement('div');
      helpDialog.id = 'shortcuts-help-dialog';
      helpDialog.className = 'dialog-backdrop';
      document.body.appendChild(helpDialog);
    }

    helpDialog.innerHTML = helpHtml;
    helpDialog.classList.add('on');

    // 点击背景关闭
    helpDialog.addEventListener('click', (e) => {
      if (e.target === helpDialog) {
        helpDialog.classList.remove('on');
      }
    });
  }

  // 监听键盘事件
  document.addEventListener('keydown', (e) => {
    if(e.defaultPrevented||e.isComposing||e.key==='Escape'&&e.repeat)return;
    // 忽略在输入框中的按键
    if (e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable) {
      // 但 Escape 总是有效
      if (e.key === 'Escape') {
        closeModals();
        e.target.blur(); // 取消焦点
      }
      return;
    }

    // 构建按键组合
    let combo = [];
    if (e.altKey) combo.push('Alt');
    if (e.ctrlKey) combo.push('Ctrl');
    if (e.shiftKey) combo.push('Shift');
    if (e.metaKey) combo.push('Meta');

    // 添加主键
    let mainKey = e.key;
    if (mainKey === 'Escape') mainKey = 'Escape';
    else if (mainKey === ' ') mainKey = 'Space';
    else if (mainKey.length === 1) mainKey = mainKey;

    combo.push(mainKey);
    const comboStr = combo.join('+');

    // 执行快捷键
    if (shortcuts[comboStr]) {
      e.preventDefault();
      shortcuts[comboStr]();
    }
  });

  // 首次访问显示提示
  const hasSeenTip = localStorage.getItem('shortcuts-tip-seen');
  if (!hasSeenTip) {
    setTimeout(() => {
      const tip = document.createElement('div');
      tip.className = 'shortcuts-tip';
      tip.innerHTML = `
        <div class="shortcuts-tip-content">
          💡 提示：按 <kbd>?</kbd> 查看键盘快捷键
          <button class="shortcuts-tip-close" onclick="this.parentElement.parentElement.remove(); localStorage.setItem('shortcuts-tip-seen', 'true')">
            ×
          </button>
        </div>
      `;
      document.body.appendChild(tip);

      // 5秒后自动隐藏
      setTimeout(() => {
        if (tip.parentElement) {
          tip.style.opacity = '0';
          setTimeout(() => tip.remove(), 300);
          localStorage.setItem('shortcuts-tip-seen', 'true');
        }
      }, 5000);
    }, 2000);
  }

  console.log('⌨️ 键盘快捷键已启用。按 ? 查看帮助。');
})();
