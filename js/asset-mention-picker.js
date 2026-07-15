// ==================== 资产 @ 提及选择器 ====================

(function() {
  let currentTextarea = null;
  let atSymbolPosition = -1;
  let allAssets = [];
  let pickerMode = 'asset';

  // 初始化
  function initAssetMentionPicker() {
    const asset = window.PAGE_DATA?.asset;
    if (!asset) return;

    // 构建英文ID → 中文ID的映射表（只用于页面2）
    window.__assetIdTransMap = {};

    // 收集所有资产
    allAssets = [];

    // 角色
    if (asset.characters) {
      Object.keys(asset.characters).forEach(key => {
        const item = asset.characters[key];
        const idTrans = item.id_trans || key;

        // 构建映射：英文ID → 中文ID
        if (item.id_trans) {
          window.__assetIdTransMap[item.id_trans] = key;
        }

        allAssets.push({
          id: idTrans,  // 使用英文ID
          originalId: key,  // 保留中文ID用于查找
          type: 'character',
          typeLabel: '角色',
          name: item.name_trans || item.name_ori || key,
          desc: item.desc_trans || item.desc_ori || '',
          filePath: item.file_path || '',
          url: item.oss_url || ''
        });
      });
    }

    // 场景
    if (asset.scenes) {
      Object.keys(asset.scenes).forEach(key => {
        const item = asset.scenes[key];
        const idTrans = item.id_trans || key;

        // 构建映射：英文ID → 中文ID
        if (item.id_trans) {
          window.__assetIdTransMap[item.id_trans] = key;
        }

        allAssets.push({
          id: idTrans,  // 使用英文ID
          originalId: key,  // 保留中文ID用于查找
          type: 'scene',
          typeLabel: '场景',
          name: item.name_trans || item.name_ori || key,
          desc: item.desc_trans || item.desc_ori || '',
          filePath: item.file_path || '',
          url: item.oss_url || ''
        });
      });
    }

    // 道具
    if (asset.props) {
      Object.keys(asset.props).forEach(key => {
        const item = asset.props[key];
        const idTrans = item.id_trans || key;

        // 构建映射：英文ID → 中文ID
        if (item.id_trans) {
          window.__assetIdTransMap[item.id_trans] = key;
        }

        allAssets.push({
          id: idTrans,  // 使用英文ID
          originalId: key,  // 保留中文ID用于查找
          type: 'prop',
          typeLabel: '道具',
          name: item.name_trans || item.name_ori || key,
          desc: item.desc_trans || item.desc_ori || '',
          filePath: item.file_path || '',
          url: item.oss_url || ''
        });
      });
    }

    // 监听所有资产卡片中的 textarea
    document.addEventListener('input', handleTextareaInput);
    document.addEventListener('click', handleDocumentClick);

    // 搜索框输入
    const searchInput = document.getElementById('asset-mention-search');
    if (searchInput) {
      searchInput.addEventListener('input', handleSearchInput);
    }
  }

  // 处理 textarea 输入
  function handleTextareaInput(e) {
    const target = e.target;

    // 只处理资产卡片或分镜编辑器中的 textarea
    if (target.tagName !== 'TEXTAREA') return;
    const isAssetCard = target.closest('.asset-card');
    const isShotEditor = target.closest('.sb-shot-editor');
    if (!isAssetCard && !isShotEditor) return;
    const fieldName = target.getAttribute('data-field') || '';

    const value = target.value;
    const cursorPos = target.selectionStart;

    // 触发条件1：刚输入 @ / ＠
    const justTypedAt = cursorPos > 0 && (value[cursorPos - 1] === '@' || value[cursorPos - 1] === '＠');
    // 触发条件2：一次性输入成 @[ / ＠[（如输入法合并输入）
    const justTypedAtBracket =
      cursorPos > 1 &&
      (value[cursorPos - 2] === '@' || value[cursorPos - 2] === '＠') &&
      value[cursorPos - 1] === '[';

    if (justTypedAt || justTypedAtBracket) {
      currentTextarea = target;
      atSymbolPosition = justTypedAtBracket ? (cursorPos - 2) : (cursorPos - 1);
      pickerMode = getPickerMode(target);
      showPicker(target);
      renderMentionOptions('');
    } else if (currentTextarea === target && atSymbolPosition >= 0) {
      // 用户继续输入，提取 @ 后的内容作为搜索词
      const textAfterAt = value.substring(atSymbolPosition + 1, cursorPos);

      // 如果输入了空格或换行，关闭选择器
      if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
        hidePicker();
      } else {
        renderMentionOptions(textAfterAt);
      }
    }
  }

  // 处理搜索框输入
  function handleSearchInput(e) {
    const keyword = e.target.value;
    renderMentionOptions(keyword);
  }

  // 显示选择器
  function showPicker(textarea) {
    const picker = document.getElementById('asset-mention-picker');
    if (!picker) return;

    picker.style.display = 'block';
    picker.style.position = 'fixed';
    positionPicker(textarea);

    // 清空搜索框
    const searchInput = document.getElementById('asset-mention-search');
    if (searchInput) {
      searchInput.value = '';
      searchInput.placeholder = pickerMode === 'video'
        ? '搜索视频（镜头号/路径）...'
        : pickerMode === 'shot-ref'
          ? '搜索已添加的参考图...'
          : '搜索资产...';
    }
  }

  // 计算光标在 textarea 内的坐标（相对内容区，含滚动偏移修正）
  // 镜像 div 法：复制 textarea 样式，插入到光标处的 span，读取其 offset
  var _caretDiv = null;
  function getCaretCoords(textarea, pos) {
    if (!textarea) return { top: 0, left: 0 };
    var cs = getComputedStyle(textarea);
    if (!_caretDiv) {
      _caretDiv = document.createElement('div');
      _caretDiv.style.position = 'absolute';
      _caretDiv.style.visibility = 'hidden';
      _caretDiv.style.zIndex = '-1';
      _caretDiv.style.whiteSpace = 'pre-wrap';
      _caretDiv.style.wordWrap = 'break-word';
      document.body.appendChild(_caretDiv);
    }
    var props = ['boxSizing','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth',
      'paddingTop','paddingRight','paddingBottom','paddingLeft','width','fontFamily','fontSize','fontWeight',
      'fontStyle','letterSpacing','lineHeight','textIndent','wordSpacing','tabSize'];
    props.forEach(function (p) { _caretDiv.style[p] = cs[p]; });
    _caretDiv.textContent = textarea.value.substring(0, pos);
    var span = document.createElement('span');
    span.textContent = textarea.value.substring(pos, pos + 1) || '.';
    _caretDiv.appendChild(span);
    var coords = { top: span.offsetTop, left: span.offsetLeft };
    // 修正滚动：textarea 内容滚动后，可视光标位置相应上移/左移
    coords.top -= textarea.scrollTop;
    coords.left -= textarea.scrollLeft;
    return coords;
  }

  // 根据光标位置自动定位选择器（优先下方，空间不足时向上弹出）
  function positionPicker(textarea) {
    const picker = document.getElementById('asset-mention-picker');
    if (!picker || !textarea) return;

    const rect = textarea.getBoundingClientRect();
    // 光标的视口坐标 = textarea 左上角 + 光标在内容中的相对坐标
    var caretPos = textarea.selectionStart;
    if (typeof atSymbolPosition === 'number' && atSymbolPosition >= 0) caretPos = atSymbolPosition + 1;
    const cc = getCaretCoords(textarea, caretPos);
    const caretX = rect.left + cc.left;
    const caretY = rect.top + cc.top;

    const viewportW = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportH = window.innerHeight || document.documentElement.clientHeight || 0;
    const gap = 6;
    const minTopPadding = 8;
    const desiredWidth = Math.min(400, Math.max(220, rect.width), Math.max(220, viewportW - minTopPadding * 2));

    const belowSpace = Math.max(0, viewportH - caretY - gap - minTopPadding);
    const aboveSpace = Math.max(0, caretY - gap - minTopPadding);
    const openUpward = belowSpace < 220 && aboveSpace > belowSpace;
    const availableHeight = Math.max(180, Math.min(400, openUpward ? aboveSpace : belowSpace));

    picker.style.width = desiredWidth + 'px';
    picker.style.maxHeight = availableHeight + 'px';

    // 水平：以光标 X 为基准左对齐，超出右边界则右对齐
    let left = caretX;
    if (left + desiredWidth > viewportW - minTopPadding) {
      left = caretX - desiredWidth;
    }
    left = Math.max(minTopPadding, Math.min(left, viewportW - desiredWidth - minTopPadding));
    picker.style.left = left + 'px';

    if (openUpward) {
      const pickerHeight = Math.min(picker.offsetHeight || availableHeight, availableHeight);
      picker.style.top = Math.max(minTopPadding, caretY - pickerHeight - gap) + 'px';
    } else {
      picker.style.top = Math.max(minTopPadding, caretY + gap) + 'px';
    }
  }

  // 隐藏选择器
  function hidePicker() {
    const picker = document.getElementById('asset-mention-picker');
    if (picker) {
      picker.style.display = 'none';
    }
    currentTextarea = null;
    atSymbolPosition = -1;
  }

  function syncPickerPosition() {
    if (!currentTextarea) return;
    const picker = document.getElementById('asset-mention-picker');
    if (!picker || picker.style.display === 'none') return;
    positionPicker(currentTextarea);
  }

  // 渲染资产列表
  function renderMentionOptions(keyword) {
    const normalizedKeyword = normalizeMentionKeyword(keyword);
    if (pickerMode === 'video') {
      renderVideos(normalizedKeyword);
      return;
    }
    if (pickerMode === 'shot-ref') {
      renderShotRefImages(normalizedKeyword);
      return;
    }
    renderAssets(normalizedKeyword);
  }

  // 兼容两种输入方式：@id 与 @[id
  function normalizeMentionKeyword(keyword) {
    let kw = String(keyword || '');
    if (kw.startsWith('[')) kw = kw.slice(1);
    if (kw.endsWith(']')) kw = kw.slice(0, -1);
    return kw.trim();
  }

  function getPickerMode(textarea) {
    if (!textarea) return 'asset';
    const fieldName = textarea.getAttribute('data-field') || '';
    if (fieldName === 'video_ref_prompt') return 'video';
    // 分镜编辑器的 prompt_trans：只显示已添加到 ref strip 的图
    if (fieldName === 'prompt_trans' && textarea.closest('.sb-shot-editor')) return 'shot-ref';
    return 'asset';
  }

  function isVideoPath(path) {
    return /\.(mp4|mov|avi|mkv|webm)(\?.*)?$/i.test(String(path || '').trim());
  }

  function extractRelativeFilePathFromUrl(url) {
    const s = String(url || '').trim();
    if (!s) return '';
    const m = s.match(/\/files\/[^/]+\/(.+?)(?:\?|$)/);
    return m && m[1] ? decodeURIComponent(m[1]) : '';
  }

  function buildVideoOptionsForTextarea(textarea) {
    const out = [];
    const seen = new Set();
    const shotCard = textarea ? textarea.closest('.shot-card.sb-shot-editor') : null;
    const ep = shotCard ? String(shotCard.getAttribute('data-ep') || '') : '';
    const curSid = shotCard ? String(shotCard.getAttribute('data-sid') || '') : '';
    if (!ep) return out;

    const shotCards = Array.from(document.querySelectorAll(`.shot-card.sb-shot-editor[data-ep="${ep}"]`));
    shotCards.forEach((card) => {
      const sid = String(card.getAttribute('data-sid') || '');
      if (!sid || sid === curSid) return;
      const state = (window.PAGE_DATA && window.PAGE_DATA.sbShotVersions && window.PAGE_DATA.sbShotVersions[sid]) || {};
      const addPath = (p, label) => {
        const rel = String(p || '').trim();
        if (!rel || !isVideoPath(rel) || seen.has(rel)) return;
        seen.add(rel);
        out.push({
          mentionId: rel,
          id: rel,
          name: label,
          typeLabel: '视频',
          desc: rel,
          filePath: rel,
          isVideo: true,
        });
      };

      addPath(state.selected_file_path, `镜头 ${sid} · 当前版本`);
      const history = Array.isArray(state.history) ? state.history : [];
      history.forEach((h) => {
        if (!h || typeof h !== 'object') return;
        const ver = String(h.version || '').trim();
        const fp = String(h.file_path || '').trim();
        addPath(fp, `镜头 ${sid}${ver ? ` · ${ver}` : ''}`);
      });

      const previewVideo = document.querySelector(`#sb-shot-${sid} .sb-preview-video`);
      if (previewVideo && previewVideo.src) {
        const relFromSrc = extractRelativeFilePathFromUrl(previewVideo.src);
        addPath(relFromSrc, `镜头 ${sid} · 预览`);
      }
    });
    return out;
  }

  // 只展示当前镜头 ref strip 里已有的图片（用于 prompt_trans 的 @ 提示）
  function renderShotRefImages(keyword) {
    const list = document.getElementById('asset-mention-list');
    if (!list) return;
    const kw = String(keyword || '').toLowerCase();

    // 方案Y：优先读独立集级资产池（反映用户在本集资产区的添加/替换/删除），fallback 到 sb-ref-cell
    const cells = [];
    if (typeof window._getEpAssets === 'function' && typeof window._currentVGEp === 'function') {
      window._getEpAssets(window._currentVGEp()).forEach(function(a){
        cells.push({ src: a.src || '', name: a.name || '', kind: a.kind || '' });
      });
    } else {
      const seen = {};
      document.querySelectorAll('#v-g .sb-shot-section .sb-ref-cell[data-type="image"]').forEach(function(cell){
        var img = cell.querySelector('img');
        var nameEl = cell.querySelector('.sb-ref-cap-name');
        var src = img ? (img.getAttribute('src')||'') : '';
        var name = nameEl ? nameEl.textContent.trim() : (img ? (img.getAttribute('alt')||'').trim() : '');
        if(!src && !name) return;
        var key = src || name;
        if(seen[key]) return; seen[key] = 1;
        cells.push({ src: src, name: name, kind: '' });
      });
    }

    // 对照资产库 data-kind 分类（池 item 已带 kind 时直接用）
    function kindOf(src, preset){
      if(preset) return preset;
      if(!src) return 'props';
      var file = src.split('/').pop();
      var groups = document.querySelectorAll('#v-a .asset-group');
      for(var i=0;i<groups.length;i++){
        var imgs = groups[i].querySelectorAll('img');
        for(var j=0;j<imgs.length;j++){
          var gf = (imgs[j].getAttribute('src')||'').split('/').pop();
          if(gf && gf === file) return groups[i].getAttribute('data-kind') || 'props';
        }
      }
      return 'props';
    }

    let items = [];
    cells.forEach(function(c){
      var label = c.name || '未命名';
      if (kw && label.toLowerCase().indexOf(kw) < 0) return;
      var kind = kindOf(c.src, c.kind);
      items.push({ src: c.src, label: label, mentionId: c.name || c.src, typeLabel: ({characters:'角色',scenes:'场景',props:'道具'}[kind]) || '道具' });
    });

    if (items.length === 0) {
      list.innerHTML = '<div class="asset-mention-empty">本集暂无参考图，请先添加</div>';
      return;
    }

    // 垂直分组：角色 → 场景 → 道具（一个 list，上下滚动，不需点选 tab）
    var order = ['角色','场景','道具'];
    var groups = {};
    items.forEach(function(it){ (groups[it.typeLabel] || (groups[it.typeLabel]=[])).push(it); });
    var html = '';
    order.forEach(function(g){
      if(!groups[g] || !groups[g].length) return;
      html += '<div class="asset-mention-group"><div class="asset-mention-group-header">' + g + '</div>';
      groups[g].forEach(function(it){
        var safe = String(it.label).replace(/"/g,'').replace(/</g,'&lt;');
        var thumb = it.src ? '<img src="'+it.src+'" alt="" class="asset-mention-thumb" referrerpolicy="no-referrer"/>' : '<div class="asset-mention-thumb asset-mention-thumb-empty"></div>';
        html += '<div class="asset-mention-item" data-shot-ref-id="' + it.mentionId + '">' + thumb +
          '<div class="asset-mention-info"><div class="asset-mention-name">' + safe + '</div></div></div>';
      });
      html += '</div>';
    });
    list.innerHTML = html;

    list.querySelectorAll('.asset-mention-item[data-shot-ref-id]').forEach(function (el) {
      el.addEventListener('click', function () {
        insertMention(el.getAttribute('data-shot-ref-id'), null);
      });
    });
  }

  function renderVideos(keyword) {
    const list = document.getElementById('asset-mention-list');
    if (!list) return;
    const options = buildVideoOptionsForTextarea(currentTextarea);
    const kw = String(keyword || '').toLowerCase();
    const filtered = options.filter((it) => {
      return String(it.name || '').toLowerCase().includes(kw) ||
             String(it.filePath || '').toLowerCase().includes(kw) ||
             String(it.desc || '').toLowerCase().includes(kw);
    });
    if (filtered.length === 0) {
      list.innerHTML = '<div class="asset-mention-empty">暂无可选视频（请先生成其它镜头）</div>';
      return;
    }
    list.innerHTML = filtered.map((item) => {
      const src = `/files/${window.PAGE_DATA.pid}/${item.filePath}`;
      return `
        <div class="asset-mention-item" data-mention-id="${item.mentionId}">
          <video src="${src}" class="asset-mention-thumb" muted preload="metadata"></video>
          <div class="asset-mention-info">
            <div class="asset-mention-name">${item.name}</div>
            <div class="asset-mention-meta">
              <span class="asset-mention-type">${item.typeLabel}</span>
              <span class="mono">${item.filePath}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    list.querySelectorAll('.asset-mention-item').forEach(item => {
      item.addEventListener('click', () => {
        const mentionId = item.getAttribute('data-mention-id') || '';
        insertMention(mentionId, null);
      });
    });
  }

  function renderAssets(keyword) {
    const list = document.getElementById('asset-mention-list');
    if (!list) return;

    const kw = keyword.toLowerCase();
    const pid = window.PAGE_DATA && window.PAGE_DATA.pid;

    // ── 当在资产卡或分镜 prompt 中触发时，额外收集已上传参考图 ──
    let uploadedItems = []; // [{ label, path, mentionId, mentionMode }]
    const inAssetCard = currentTextarea && currentTextarea.closest('.asset-card');
    const inShotCard = currentTextarea && currentTextarea.closest('.shot-card.sb-shot-editor');
    if (inAssetCard) {
      const card = currentTextarea.closest('.asset-card');
      const kind = card.getAttribute('data-kind') || '';
      const aid  = card.getAttribute('data-aid')  || '';
      const assetData = window.PAGE_DATA && window.PAGE_DATA.asset;
      const row = assetData && assetData[kind] && assetData[kind][aid];
      const refImgs = Array.isArray(row && row.ref_imgs) ? row.ref_imgs : [];
      let userImgCount = 0;
      refImgs.forEach(function (path) {
        if (typeof path === 'string' && path.startsWith('asset/refs/')) {
          userImgCount++;
          const label = '@图片' + userImgCount;
          // keyword 过滤
          if (!kw || label.includes(kw) || path.toLowerCase().includes(kw)) {
            uploadedItems.push({
              label: label,
              path: path,
              mentionId: label,       // 资产页沿用 @图片N 文本插入
              mentionMode: 'label'
            });
          }
        }
      });
    } else if (inShotCard) {
      const shotSection = currentTextarea.closest('.sb-shot-section');
      const refCaps = shotSection
        ? Array.from(shotSection.querySelectorAll('.sb-ref-cell[data-type="image"] .sb-ref-cap[data-ref-path]'))
        : [];
      let userImgCount = 0;
      refCaps.forEach(function (cap) {
        const path = String(cap.getAttribute('data-ref-path') || '').trim();
        if (!path) return;
        const isLocalUploaded =
          /^asset\/refs\//.test(path) ||
          /^\d+\/refs\//.test(path) ||
          /\/refs\//.test(path);
        if (isLocalUploaded) {
          userImgCount++;
          const filename = path.split('/').pop() || path;
          const label = '@图片' + userImgCount;
          if (!kw || label.toLowerCase().includes(kw) || path.toLowerCase().includes(kw)) {
            uploadedItems.push({
              label: label,
              path: path,
              mentionId: path,       // 分镜页插入 @[相对路径]，可被 getAssetFilePath 直接解析
              mentionMode: 'path'
            });
          }
        }
      });
    }

    // ── 在资产卡内，@ 仅限已上传/已选参考图，不列全量资产库 ──
    let pickedAssets = [];
    if (inAssetCard) {
      const card0 = currentTextarea.closest('.asset-card');
      const k0 = card0.getAttribute('data-kind') || '';
      const a0 = card0.getAttribute('data-aid') || '';
      const ad0 = window.PAGE_DATA && window.PAGE_DATA.asset;
      const row0 = ad0 && ad0[k0] && ad0[k0][a0];
      const refs0 = Array.isArray(row0 && row0.ref_imgs) ? row0.ref_imgs : [];
      const pickedPaths = refs0.filter(function (p) {
        return typeof p === 'string' && !(/^asset\/refs\//.test(p) || /\/refs\//.test(p));
      });
      pickedAssets = allAssets.filter(function (asset) {
        return pickedPaths.indexOf(asset.filePath) >= 0 || pickedPaths.indexOf(asset.url) >= 0;
      });
    }

    // ── 资产过滤（资产卡内仅已选参考资产，其余场景全量）──
    const sourceAssets = inAssetCard ? pickedAssets : allAssets;
    const filtered = sourceAssets.filter(function (asset) {
      return asset.name.toLowerCase().includes(kw) ||
             asset.id.toLowerCase().includes(kw) ||
             asset.desc.toLowerCase().includes(kw);
    });

    if (uploadedItems.length === 0 && filtered.length === 0) {
      const msg = inAssetCard ? '请先上传图片或从资产库选取参考图，再使用 @ 引用' : '未找到匹配的资产';
      list.innerHTML = '<div class="asset-mention-empty">' + msg + '</div>';
      return;
    }

    let html = '';

    // 上传参考图分区
    if (uploadedItems.length > 0) {
      if (filtered.length > 0) {
        html += '<div class="asset-mention-section-title">已上传参考图</div>';
      }
      html += uploadedItems.map(function (item) {
        const imgSrc = pid ? '/files/' + pid + '/' + item.path : '';
        return '<div class="asset-mention-item" data-upload-label="' + item.label + '" data-upload-mention-id="' + item.mentionId + '" data-upload-mention-mode="' + item.mentionMode + '">' +
          (imgSrc ? '<img src="' + imgSrc + '" alt="" class="asset-mention-thumb" />' :
                    '<div class="asset-mention-thumb asset-mention-thumb-empty"></div>') +
          '<div class="asset-mention-info">' +
            '<div class="asset-mention-name">' + item.label + '</div>' +
            '<div class="asset-mention-meta"><span class="asset-mention-type">已上传</span></div>' +
          '</div></div>';
      }).join('');
    }

    // 资产库分区
    if (filtered.length > 0) {
      if (uploadedItems.length > 0) {
        html += '<div class="asset-mention-section-title">' + (inAssetCard ? '已选参考资产' : '资产库') + '</div>';
      }
      html += filtered.map(function (asset) {
        const imgSrc = asset.filePath
          ? '/files/' + (pid || '') + '/' + asset.filePath
          : (asset.url || '');
        const imgHtml = imgSrc
          ? '<img src="' + imgSrc + '" alt="" class="asset-mention-thumb" />'
          : '<div class="asset-mention-thumb asset-mention-thumb-empty"></div>';
        return '<div class="asset-mention-item" data-asset-id="' + asset.id + '">' +
          imgHtml +
          '<div class="asset-mention-info">' +
            '<div class="asset-mention-name">' + asset.name + '</div>' +
            '<div class="asset-mention-meta">' +
              '<span class="asset-mention-type">' + asset.typeLabel + '</span>' +
              '<span class="mono">' + asset.id + '</span>' +
            '</div>' +
          '</div></div>';
      }).join('');
    }

    list.innerHTML = html;

    // 绑定：上传参考图点击 → 插入 @图片N 文本
    list.querySelectorAll('.asset-mention-item[data-upload-label]').forEach(function (item) {
      item.addEventListener('click', function () {
        const mentionMode = item.getAttribute('data-upload-mention-mode') || 'label';
        if (mentionMode === 'path') {
          insertMention(item.getAttribute('data-upload-mention-id') || '', null);
        } else {
          insertUploadedImgMention(item.getAttribute('data-upload-label') || '');
        }
      });
    });

    // 绑定：资产库点击 → 插入 @[id_trans]
    list.querySelectorAll('.asset-mention-item[data-asset-id]').forEach(function (item) {
      item.addEventListener('click', function () {
        const assetId = item.getAttribute('data-asset-id');
        const asset = allAssets.find(function (a) { return a.id === assetId; });
        insertMention(assetId, asset);
      });
    });
  }

  // @ picker 插入后：持久化分镜编辑器（prompt_trans / video_ref_prompt 等）
  async function persistShotEditorAfterMention() {
    const ta = currentTextarea;
    if (!ta || !ta.closest('.sb-shot-editor')) return;

    const card = ta.closest('.shot-card.sb-shot-editor') || ta.closest('.shot-card');
    if (!card || typeof window.persistShotDraftByCard !== 'function') return;

    try {
      await window.persistShotDraftByCard(card, { silent: true });
      ta._promptSavedValue = ta.value;
      if (typeof window.clearPromptDirty === 'function') {
        window.clearPromptDirty(card);
      }
      toast('已添加素材引用', false, 1000);
    } catch (e) {
      toast('保存失败: ' + ((e && e.message) || String(e)), true);
      console.error('保存镜头 mention 失败:', e);
    } finally {
      // 保存完成后再触发 input，避免 await 期间 hidePicker 清空 currentTextarea
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // 插入上传参考图的 @图片N 标签（不加方括号，纯文字引用）
  async function insertUploadedImgMention(label) {
    if (!currentTextarea || atSymbolPosition < 0) return;
    const value = currentTextarea.value;
    const cursorPos = currentTextarea.selectionStart;
    const before = value.substring(0, atSymbolPosition);
    const after  = value.substring(cursorPos);
    currentTextarea.value = before + label + after;
    const newPos = atSymbolPosition + label.length;
    currentTextarea.selectionStart = newPos;
    currentTextarea.selectionEnd   = newPos;
    currentTextarea.focus();
    // 更新参考图预览
    if (currentTextarea.closest('.asset-card') && window.assetRefPreview) {
      window.assetRefPreview.update(
        currentTextarea.closest('.asset-card'),
        currentTextarea.value
      );
    }
    await persistShotEditorAfterMention();
    hidePicker();
  }

  // 插入引用（资产或视频）
  async function insertMention(mentionId, asset) {
    if (!currentTextarea || atSymbolPosition < 0) return;

    const value = currentTextarea.value;
    const cursorPos = currentTextarea.selectionStart;

    // 删除 @ 和之后输入的内容，插入 @[资产ID]
    const before = value.substring(0, atSymbolPosition);
    const after = value.substring(cursorPos);
    const mention = `@[${mentionId}]`;

    currentTextarea.value = before + mention + after;

    // 移动光标到插入内容之后
    const newCursorPos = atSymbolPosition + mention.length;
    currentTextarea.selectionStart = newCursorPos;
    currentTextarea.selectionEnd = newCursorPos;
    currentTextarea.focus();

    // 如果是在页面4的分镜编辑器中，添加预览图并保存
    const fieldName = currentTextarea.getAttribute('data-field') || '';
    if (currentTextarea.closest('.sb-shot-editor') && fieldName === 'prompt_trans' && asset) {
      await addRefPreviewAndSave(asset);
    }

    // 如果是在页面2的资产卡片中，立即更新参考图预览
    if (currentTextarea.closest('.asset-card') && window.assetRefPreview) {
      const card = currentTextarea.closest('.asset-card');
      window.assetRefPreview.update(card, currentTextarea.value);
    }

    await persistShotEditorAfterMention();
    hidePicker();
  }

  // 添加参考图预览并保存到后端
  async function addRefPreviewAndSave(asset) {
    if (!asset.filePath) {
      toast('该资产暂无生成的图片', true);
      return;
    }

    const shotSection = currentTextarea.closest('.sb-shot-section');
    if (!shotSection) return;

    const refStrip = shotSection.querySelector('.sb-ref-strip');
    if (!refStrip) return;

    // 检查是否已存在该图片
    const existing = Array.from(refStrip.querySelectorAll('.sb-ref-cap'))
      .find(cap => String(cap.getAttribute('data-ref-path') || '').trim() === asset.filePath);
    if (existing) {
      toast('该参考图已存在', true);
      return;
    }

    // 添加预览图到DOM
    const cell = document.createElement('div');
    cell.className = 'sb-ref-cell';
    cell.setAttribute('data-type', 'image');
    cell.innerHTML = `
      <img src="/files/${window.PAGE_DATA.pid}/${asset.filePath}" alt="" />
      <div class="sb-ref-cap mono" data-ref-path="${asset.filePath}">
        <span class="sb-ref-type-badge">图</span>
        ${asset.filePath}
      </div>
    `;
    refStrip.appendChild(cell);

    // 收集当前所有的 ref_imgs
    const refImgs = Array.from(refStrip.querySelectorAll('.sb-ref-cell[data-type="image"] .sb-ref-cap'))
      .map(cap => String(cap.getAttribute('data-ref-path') || '').trim())
      .filter(Boolean);

    // 保存到后端
    await saveRefImgs(refImgs);
  }

  // 保存 ref_imgs 到后端
  async function saveRefImgs(refImgs) {
    const shotCard = currentTextarea.closest('.shot-card');
    if (!shotCard) return;

    const ep = shotCard.getAttribute('data-ep');
    const sid = shotCard.getAttribute('data-sid');
    if (!ep || !sid) return;

    try {
      await window.patchJSON(
        `/api/projects/${encodeURIComponent(window.PAGE_DATA.pid)}/episodes/${encodeURIComponent(ep)}/shots/${encodeURIComponent(sid)}`,
        {
          patch: {
            ref_imgs: refImgs,
            updated_at: window.assetUtcNow ? window.assetUtcNow() : new Date().toISOString()
          }
        }
      );
      toast('已添加参考图', false);
    } catch (e) {
      toast('保存参考图失败: ' + (e.message || String(e)), true);
      console.error('保存参考图失败:', e);
    }
  }

  // 处理文档点击（点击外部关闭选择器）
  function handleDocumentClick(e) {
    const picker = document.getElementById('asset-mention-picker');
    if (!picker) return;

    // 如果点击的是选择器内部或当前 textarea，不关闭
    if (picker.contains(e.target) || e.target === currentTextarea) {
      return;
    }

    hidePicker();
  }

  /** 无方括号 @id / ＠id：@ 与 id 之间可含空白、零宽字符；支持全角 ＠（与 extractMentions 规则一致） */
  function bareMentionReplaceRe() {
    return /[＠@](?!\[)[\s\u00a0\u200b-\u200d\ufeff]*([\w\u4e00-\u9fff-]+)/g;
  }

  // 转换函数：将文本中的英文ID转换为中文ID（只用于页面2保存时）
  function translateMentionsToOriginalIds(text) {
    if (!text || typeof text !== 'string') return text;

    let out = text.replace(/@\[([^\]]+)\]/g, (match, id) => {
      // 查映射表：英文ID → 中文ID
      const originalId = window.__assetIdTransMap?.[id];
      if (originalId) {
        return `@[${originalId}]`;
      }
      // 找不到映射，保持原样（可能用户手动输入的中文ID）
      return match;
    });
    // 无方括号 @id（每次新正则，避免 /g 的 lastIndex 污染）
    out = out.replace(bareMentionReplaceRe(), (match, id) => {
      const originalId = window.__assetIdTransMap?.[id];
      if (originalId) {
        return `@[${originalId}]`;
      }
      return match;
    });
    return out;
  }

  // 反向转换函数：将文本中的中文ID转换为英文ID（页面加载时使用）
  function translateOriginalIdsToMentions(text) {
    if (!text || typeof text !== 'string') return text;

    // 构建反向映射表：中文ID → 英文ID
    const reverseMap = {};
    Object.entries(window.__assetIdTransMap || {}).forEach(([transId, origId]) => {
      reverseMap[origId] = transId;
    });

    let out = text.replace(/@\[([^\]]+)\]/g, (match, id) => {
      // 查反向映射表：中文ID → 英文ID
      const transId = reverseMap[id];
      if (transId) {
        return `@[${transId}]`;
      }
      // 找不到映射，保持原样（可能已经是英文ID）
      return match;
    });
    out = out.replace(bareMentionReplaceRe(), (match, id) => {
      const transId = reverseMap[id];
      if (transId) {
        return `@[${transId}]`;
      }
      return match;
    });
    return out;
  }

  // 页面加载时初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAssetMentionPicker);
  } else {
    initAssetMentionPicker();
  }

  window.addEventListener('resize', syncPickerPosition);
  window.addEventListener('scroll', syncPickerPosition, true);

  // 暴露到全局（方便调试和project.js使用）
  window.assetMentionPicker = {
    show: showPicker,
    hide: hidePicker,
    translateMentionsToOriginalIds: translateMentionsToOriginalIds,
    translateOriginalIdsToMentions: translateOriginalIdsToMentions
  };
})();

// ==================== 资产参考图预览 ====================
(function() {
  // 监听所有资产卡片的 prompt 输入
  document.addEventListener('input', handlePromptInput);

  // 页面加载时初始化所有已有 prompt 的预览
  // 注意：需要在 assetMentionPicker 初始化之后执行，确保映射表已构建
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      // 使用 setTimeout 确保在 assetMentionPicker 初始化之后执行
      setTimeout(initAllAssetRefPreviews, 0);
    });
  } else {
    // 如果已经加载完成，直接执行
    setTimeout(initAllAssetRefPreviews, 0);
  }

  function handlePromptInput(e) {
    const target = e.target;

    // 只处理资产卡片中的 prompt textarea
    if (target.tagName !== 'TEXTAREA') return;
    if (target.getAttribute('data-field') !== 'prompt') return;
    const card = target.closest('.asset-card');
    if (!card) return;

    updateAssetRefPreview(card, target.value);
  }

  function updateAssetRefPreview(card, _promptText) {
    const container = card.querySelector('.asset-ref-preview');
    if (!container) return;

    const row = getAssetRowByCard(card);
    const lockedRefs = getLockedRefImgs(row); // 来自 ref_imgs 的路径列表

    // 资产页参考图预览仅以 ref_imgs 为准；prompt 中的 @ 仅用于生成语义，不参与预览
    if (lockedRefs.length > 0) {
      renderLockedRefPreviews(container, lockedRefs);
    } else {
      renderPlaceholder(container);
    }
  }

  function renderMergedPreviews(container, lockedRefPaths, promptOnlyAssets) {
    const pid = window.PAGE_DATA?.pid;
    if (!pid) return;

    const card = container.closest('.asset-card');
    const kind = card ? (card.getAttribute('data-kind') || '') : '';
    const aid  = card ? (card.getAttribute('data-aid')  || '') : '';

    const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    let userImgCount = 0;

    // ── 来自 ref_imgs 的图（已锁定，全部可移除）──
    const lockedHtml = lockedRefPaths.map((path) => {
      const isUploaded = isUserUploadedRef(path);
      let label;
      if (isUploaded) {
        userImgCount++;
        label = `@图片${userImgCount}`;
      } else {
        label = refPathBaseName(path) || path;
      }
      const removeHtml = `<button class="asset-ref-remove-btn"
        onclick="event.stopPropagation();removeAssetRefImg('${esc(kind)}','${esc(aid)}','${esc(path)}')"
        title="移除">✕</button>`;
      const imgSrc = path.startsWith('http') ? path : `/files/${pid}/${path}`;
      return `
        <div class="asset-ref-preview-item">
          ${removeHtml}
          <img src="${imgSrc}" alt="${label}"
            onclick="openAssetImgLightbox('${esc(imgSrc)}')" />
          <div class="asset-ref-label">${label}</div>
        </div>`;
    }).join('');

    // ── 仅来自 prompt 的图（可通过删 prompt 中 @[id_trans] 来移除）──
    const promptHtml = promptOnlyAssets.map((asset) => {
      const imgSrc = (asset.filePath || '').startsWith('http')
        ? asset.filePath
        : `/files/${pid}/${asset.filePath}`;
      const removePromptBtn = `<button class="asset-ref-remove-btn"
        onclick="event.stopPropagation();removePromptMention('${esc(kind)}','${esc(aid)}','${esc(asset.id)}')"
        title="移除（将从 prompt 中删除 @[${asset.id}]）">✕</button>`;
      return `
        <div class="asset-ref-preview-item asset-ref-from-prompt">
          ${removePromptBtn}
          <img src="${imgSrc}" alt="${asset.name}"
            onclick="openAssetImgLightbox('${esc(imgSrc)}')" />
          <div class="asset-ref-label">${asset.name}</div>
          <div class="asset-ref-prompt-badge">来自 prompt</div>
        </div>`;
    }).join('');

    const hasLocked = lockedRefPaths.length > 0;
    const title = hasLocked ? '参考图（已锁定）' : '参考图';

    container.innerHTML = `
      <div class="asset-ref-preview-title">${title}</div>
      <div class="asset-ref-preview-grid">${lockedHtml}${promptHtml}</div>
    `;
  }

  function extractMentions(text) {
    if (!text || typeof text !== 'string') return [];

    const matches = [];
    const seen = new Set();

    const bracketRe = /@\[([^\]]+)\]/g;
    let match;
    while ((match = bracketRe.exec(text)) !== null) {
      const id = match[1].trim();
      if (id && !seen.has(id)) {
        seen.add(id);
        matches.push(id);
      }
    }

    const bareRe = /[＠@](?!\[)[\s\u00a0\u200b-\u200d\ufeff]*([\w\u4e00-\u9fff-]+)/g;
    while ((match = bareRe.exec(text)) !== null) {
      const id = match[1].trim();
      if (id && !seen.has(id)) {
        seen.add(id);
        matches.push(id);
      }
    }

    return matches;
  }

  function findRefAssets(mentionIds) {
    const asset = window.PAGE_DATA?.asset;
    if (!asset) return [];

    const results = [];
    const allAssets = [
      ...(asset.characters ? Object.entries(asset.characters).map(([id, data]) => ({ ...data, id, kind: 'characters', type: 'character' })) : []),
      ...(asset.scenes ? Object.entries(asset.scenes).map(([id, data]) => ({ ...data, id, kind: 'scenes', type: 'scene' })) : []),
      ...(asset.props ? Object.entries(asset.props).map(([id, data]) => ({ ...data, id, kind: 'props', type: 'prop' })) : [])
    ];

    mentionIds.forEach(mentionId => {
      // 匹配 id_trans 或 originalId
      const found = allAssets.find(a =>
        a.id_trans === mentionId || a.id === mentionId
      );

      if (found && found.file_path) {
        results.push({
          id: found.id_trans || found.id,
          originalId: found.id || '',
          kind: found.kind || '',
          name: found.name_trans || found.name_ori || found.id,
          filePath: found.file_path,
          type: found.type
        });
      }
    });

    return results;
  }

  function getAssetRowByCard(card) {
    if (!card) return null;
    const kind = String(card.getAttribute('data-kind') || '').trim();
    const aid = String(card.getAttribute('data-aid') || '').trim();
    if (!kind || !aid) return null;
    const asset = window.PAGE_DATA?.asset;
    if (!asset || !asset[kind]) return null;
    const row = asset[kind][aid];
    return row && typeof row === 'object' ? row : null;
  }

  function assetSemanticKey(kind, originalId) {
    const k = String(kind || '').trim();
    const id = String(originalId || '').trim();
    if (!k || !id) return '';
    return `${k}:${id}`;
  }

  function resolveAssetByPath(path) {
    const normalizedPath = String(path || '').trim();
    if (!normalizedPath) return null;
    const asset = window.PAGE_DATA?.asset;
    if (!asset) return null;
    for (const kind of ['characters', 'scenes', 'props']) {
      const items = asset[kind] || {};
      for (const [id, data] of Object.entries(items)) {
        if (!data || typeof data !== 'object') continue;
        if (String(data.file_path || '').trim() === normalizedPath) {
          return { kind, id, idTrans: String(data.id_trans || '').trim() };
        }
        const history = Array.isArray(data.history) ? data.history : [];
        const hit = history.some((rec) => rec && typeof rec === 'object' && String(rec.file_path || '').trim() === normalizedPath);
        if (hit) {
          return { kind, id, idTrans: String(data.id_trans || '').trim() };
        }
      }
    }
    return null;
  }

  function getLockedRefImgs(row) {
    if (!row || !Array.isArray(row.ref_imgs)) return [];
    return row.ref_imgs
      .map((p) => String(p || '').trim())
      .filter(Boolean);
  }

  function refPathBaseName(path) {
    const raw = String(path || '').trim();
    if (!raw) return '';
    const noQuery = raw.split('?')[0];
    const filename = noQuery.split('/').pop() || noQuery;
    return filename.replace(/\.[^.]+$/, '');
  }

  function lookupAssetNameByPath(path) {
    const asset = window.PAGE_DATA?.asset;
    if (!asset) return '';
    const byKind = ['characters', 'scenes', 'props'];
    for (const kind of byKind) {
      const items = asset[kind] || {};
      for (const [, data] of Object.entries(items)) {
        if (!data || typeof data !== 'object') continue;
        if (String(data.file_path || '').trim() === path) {
          return data.name_trans || data.name_ori || data.id_trans || data.id || '';
        }
      }
    }
    return '';
  }

  function renderPlaceholder(container) {
    container.innerHTML = `
      <div class="asset-ref-preview-title">参考图</div>
      <div class="asset-ref-preview-placeholder"></div>
    `;
  }

  function renderRefPreviews(container, refAssets) {
    if (refAssets.length === 0) {
      renderPlaceholder(container);
      return;
    }

    const pid = window.PAGE_DATA?.pid;
    if (!pid) return;

    const html = `
      <div class="asset-ref-preview-title">参考图</div>
      <div class="asset-ref-preview-grid">
        ${refAssets.map(asset => `
          <div class="asset-ref-preview-item">
            <img
              src="/files/${pid}/${asset.filePath}"
              alt="${asset.name}"
              onclick="openAssetImgLightbox('/files/${pid}/${asset.filePath}')"
            />
            <div class="asset-ref-label">${asset.name}</div>
          </div>
        `).join('')}
      </div>
    `;

    container.innerHTML = html;
  }

  function isUserUploadedRef(path) {
    return typeof path === 'string' && path.startsWith('asset/refs/');
  }

  function renderLockedRefPreviews(container, refPaths) {
    if (!Array.isArray(refPaths) || refPaths.length === 0) {
      renderPlaceholder(container);
      return;
    }

    const pid = window.PAGE_DATA?.pid;
    if (!pid) return;

    const card = container.closest('.asset-card');
    const kind = card ? (card.getAttribute('data-kind') || '') : '';
    const aid = card ? (card.getAttribute('data-aid') || '') : '';

    let userImgCount = 0;
    const itemsHtml = refPaths.map((path) => {
      const isUploaded = isUserUploadedRef(path);
      let label;
      if (isUploaded) {
        userImgCount++;
        label = `@图片${userImgCount}`;
      } else {
        label = refPathBaseName(path) || path;
      }
      const ep = path.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      const ek = kind.replace(/'/g, "\\'");
      const ea = aid.replace(/'/g, "\\'");
      const removeHtml = `<button class="asset-ref-remove-btn"
        onclick="event.stopPropagation();removeAssetRefImg('${ek}','${ea}','${ep}')"
        title="移除">✕</button>`;
      const imgSrc = path.startsWith('http') ? path : `/files/${pid}/${path}`;
      const escapedSrc = imgSrc.replace(/'/g, "\\'");
      return `
        <div class="asset-ref-preview-item">
          ${removeHtml}
          <img
            src="${imgSrc}"
            alt="${label}"
            onclick="openAssetImgLightbox('${escapedSrc}')"
          />
          <div class="asset-ref-label">${label}</div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="asset-ref-preview-title">参考图（已锁定）</div>
      <div class="asset-ref-preview-grid">${itemsHtml}</div>
    `;
  }

  function initAllAssetRefPreviews() {
    document.querySelectorAll('.asset-card').forEach(card => {
      const promptEl = card.querySelector('textarea[data-field="prompt"]');
      if (promptEl) {
        // 先将 prompt 中的中文ID转换为英文ID
        if (window.assetMentionPicker?.translateOriginalIdsToMentions) {
          const translatedPrompt = window.assetMentionPicker.translateOriginalIdsToMentions(promptEl.value || '');
          if (translatedPrompt !== promptEl.value) {
            promptEl.value = translatedPrompt;
          }
        }
        // 然后更新参考图预览
        updateAssetRefPreview(card, promptEl.value || '');
      }
    });
  }

  // 从 prompt textarea 中删除指定 @[idTrans] mention，并刷新参考图预览
  function removePromptMention(kind, aid, idTrans) {
    const card = document.querySelector(
      '.asset-card[data-kind="' + kind + '"][data-aid="' + CSS.escape(aid) + '"]'
    );
    if (!card) return;
    const promptEl = card.querySelector('textarea[data-field="prompt"]');
    if (!promptEl) return;

    const escapedId = idTrans.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    promptEl.value = promptEl.value
      .replace(new RegExp('@\\[' + escapedId + '\\]', 'g'), '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (window.assetRefPreview) {
      window.assetRefPreview.update(card, promptEl.value);
    }
  }

  // 暴露到全局（方便调试）
  window.assetRefPreview = {
    update: updateAssetRefPreview,
    initAll: initAllAssetRefPreviews
  };
  window.removePromptMention = removePromptMention;
})();

// ==================== 分镜 prompt_trans @提及 → ref strip 实时 DOM 同步 ====================
// 方向 A：ref_imgs 以 prompt_trans 的 @[...] 为唯一来源。
// 持久化由 persistShotDraftByCard（blur/生成时）统一负责。
// 这里只做实时 DOM 反馈：删掉 @[...] 时立即从 ref strip 移除对应图片。
(function () {

  // 从文本中提取所有 @[...] 的 mentionId 集合
  function extractMentionIds(text) {
    const set = new Set();
    const re = /@\[([^\]]+)\]/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const id = m[1].trim();
      if (id) set.add(id);
    }
    return set;
  }

  // 对单个 textarea 做一次实时 DOM 同步（不 PATCH 后端）
  function syncDomOnChange(textarea, prevMentionIds) {
    const newIds = extractMentionIds(textarea.value);

    // 只处理有删减的情况
    let anyRemoved = false;
    prevMentionIds.forEach(id => { if (!newIds.has(id)) anyRemoved = true; });
    if (!anyRemoved) return newIds;

    // 用 project.js 已有的 computeRefImgsFromPrompt 重新计算当前应有的图片集合
    const computeFn = typeof window.computeRefImgsFromPrompt === 'function'
      ? window.computeRefImgsFromPrompt
      : null;
    if (!computeFn) return newIds;

    const newRefPaths = new Set(computeFn(textarea.value));

    // 从 ref strip 里移除不再需要的图片 cell
    const shotSection = textarea.closest('.sb-shot-section');
    if (!shotSection) return newIds;

    const refCaps = Array.from(
      shotSection.querySelectorAll('.sb-ref-cell[data-type="image"] .sb-ref-cap[data-ref-path]')
    );
    refCaps.forEach(function (cap) {
      const p = cap.getAttribute('data-ref-path');
      if (p && !newRefPaths.has(p)) {
        const cell = cap.closest('.sb-ref-cell');
        if (cell) cell.remove();
      }
    });

    return newIds;
  }

  // 为所有 prompt_trans textarea 绑定实时 DOM 监听
  function initShotRefSync() {
    document.querySelectorAll('.sb-shot-editor textarea[data-field="prompt_trans"]').forEach(function (ta) {
      if (ta._shotRefSyncBound) return;
      ta._shotRefSyncBound = true;

      let prevIds = extractMentionIds(ta.value);
      ta.addEventListener('input', function () {
        prevIds = syncDomOnChange(ta, prevIds);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShotRefSync);
  } else {
    initShotRefSync();
  }

  window.initShotRefSync = initShotRefSync;

})();
