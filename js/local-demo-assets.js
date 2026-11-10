// 资产→剧集映射（从剧集改编区域的 ast-chip 提取）
  var ASSET_EP_MAP = {
    "安小姐": [7,8,9,10],
    "段枫": [1],
    "粉裙贵妇": [7],
    "富婆": [1],
    "姜父": [2],
    "姜老太太": [8,9],
    "姜太太": [2,3,4,6,7,9,10],
    "宋言之": [1,2,3,5],
    "路人女甲": [2],
    "路人女乙": [2],
    "女佣": [5],
    "骚扰男": [7],
    "沈父": [3],
    "沈母": [3],
    "阳阳": [2,3,5],
    "助理": [2,6,7,10],
    "濯樱桥": [6,7,9,10],
    "姜家卧室": [4],
    "酒店楼梯间": [1],
    "酒店客房": [1,2,3],
    "酒店大堂前台": [2],
    "酒店门口": [2],
    "酒店VIP室": [2],
    "酒店休息区": [3],
    "婚礼宣誓区": [3],
    "总裁办公室": [4],
    "姜家起居室": [5],
    "姜家客厅": [5],
    "中式庭院": [5],
    "姜家老宅庭院": [8,9],
    "姜家老宅院子": [],
    "亲密照片": [9,10],
    "钻戒": [3,10],
    "啤酒瓶": [1],
    "古董花瓶": [8],
    "黑色轿车": [2,5],
    "咖啡杯": [],
    "领带": [1],
    "粉饼盒": [2],
    "定制礼服": [5],
    "翠绿玉镯": [9],
    "玉镯": [],
    "珍珠项链": [6],
    "小木盒": [8],
    "陕北苹果": [],
  };

  // 子项（妆造/状态）级别的出场集数映射
  // key 为完整 asset_id（如 "姜总_黑色西装"），value 为出场集数数组
  var OUTFIT_EP_MAP = {
    // 姜总 [1-10]：黑色西装是主要造型，出场最多
    "姜总_黑色西装": [1, 2, 6, 7, 8, 9, 10],
    "姜总_黑色西装领带": [2, 3],
    "姜总_黑色三件套西装": [3, 4],
    "姜总_深灰色真丝睡袍": [4, 5],
    "姜总_深灰睡衣": [4],
    "姜总_白衬衫卡其裤": [5],
    // 宋言之 [1,2,3,5]
    "宋言之_黑白拼色上衣": [1],
    "宋言之_裹身白被": [1, 2],
    "宋言之_黑色大堂经理制服": [2, 3, 5],
    // 姜太太 [2,3,4,6,7,9,10]
    "姜太太_黑色职业装": [2, 3],
    "姜太太_白色睡衣": [4],
    "姜太太_浅青色旗袍": [6, 7, 9, 10],
    // 安小姐 [7,8,9,10]
    "安小姐_淡黄色吊带裙": [7, 8, 9, 10],
    // 阳阳 [2,3,5]
    "阳阳_白色大堂经理制服": [2, 3, 5],
    // 沈父 [3]
    "沈父_深灰色西装": [3],
    // 沈母 [3]
    "沈母_白色小香风套装": [3],
    // 富婆 [1]
    "富婆_粉色连衣裙": [1],
    "富婆_粉色丝绸裙": [1],
    // 助理 [2,6,7,10]
    "助理_深色西装": [2, 6, 7, 10],
    // 路人
    "路人女甲_黑色无袖上衣": [2],
    "路人女乙_浅紫色连衣裙": [2],
    // 女佣 [5]
    "女佣_黑白女佣制服": [5],
    // 骚扰男 [7]
    "骚扰男_灰色T恤": [7],
    // 场景状态
    "酒店楼梯间_夜晚暖光": [1],
    "酒店客房_早晨阳光": [2, 3],
    "酒店客房_夜晚蓝调": [1],
    "酒店大堂前台_白天明亮": [2],
    "酒店VIP室_白天明亮": [2],
    "酒店休息区_白天明亮": [3],
    "姜家卧室_夜晚冷调": [4],
    "濯樱桥_夜晚灯光": [6, 7, 9, 10],
    "姜家老宅庭院_夜晚晚宴": [8, 9],
  };

  // 集数标签简化规则：超过 3 集即缩略，避免撑宽左侧分栏
  function formatEpBadges(eps) {
    if (!eps || eps.length === 0) return '';
    var sorted = eps.slice().sort(function(a,b){return a-b;});
    function pad(e){return 'E' + (e < 10 ? '0' : '') + e;}
    if (sorted.length <= 5) {
      return sorted.map(function(e){return '<span class="asset-ep-badge">' + pad(e) + '</span>';}).join('');
    }
    return '<span class="asset-ep-badge">' + pad(sorted[0]) + '...' + pad(sorted[sorted.length-1]) +
      ' (共' + sorted.length + '集)</span>';
  }

  // 为每个资产卡片添加剧集标签
  function addEpBadges() {
    // 1) 整体资产标签（角色/场景/道具）
    document.querySelectorAll('.asset-group').forEach(function(el) {
      if (el.querySelector('.char-group-header .asset-ep-badges')) return;
      var baseId = el.getAttribute('data-base-id');
      var eps = ASSET_EP_MAP[baseId];
      if (!eps || eps.length === 0) return;
      var header = el.querySelector('.char-group-header .char-group-info');
      if (!header) return;
      var badgeWrap = document.createElement('span');
      badgeWrap.className = 'asset-ep-badges';
      badgeWrap.innerHTML = formatEpBadges(eps);
      var nameTrans = header.querySelector('.char-group-name-trans');
      if (nameTrans) nameTrans.appendChild(badgeWrap);
    });

    // 2) 子项标签（妆造/状态）
    var subCards = document.querySelectorAll('.char-outfit-card');
    console.log('[ep-badge] sub-cards found:', subCards.length);
    var matched = 0, noMap = 0;
    subCards.forEach(function(card) {
      if (card.querySelector('.asset-ep-badges')) return;
      var onclick = card.getAttribute('onclick') || '';
      // 从 onclick="openAssetEdit('characters', '姜总_黑色西装', '姜总')" 中提取 asset_id
      var m = onclick.match(/openAssetEdit\([^,]+,\s*'([^']+)'/);
      if (!m) return;
      var assetId = m[1];
      var eps = OUTFIT_EP_MAP[assetId];
      if (!eps || eps.length === 0) { noMap++; return; }
      matched++;
      var badgeWrap = document.createElement('span');
      badgeWrap.className = 'asset-ep-badges asset-ep-badges--sub';
      badgeWrap.innerHTML = formatEpBadges(eps);
      // 插入到 idtrans 行前面
      var idtrans = card.querySelector('.char-outfit-idtrans');
      if (idtrans) {
        idtrans.parentNode.insertBefore(badgeWrap, idtrans);
      }
    });
    console.log('[ep-badge] sub-cards: matched=' + matched + ', noMap=' + noMap);

    // 3) 详情界面标签（asset-card 详情卡片，始终展开显示全部集数）
    document.querySelectorAll('.asset-card').forEach(function(card) {
      if (card.querySelector('.asset-ep-badges')) return;
      var aid = card.getAttribute('data-aid');
      if (!aid) return;
      var eps = OUTFIT_EP_MAP[aid];
      if (!eps || eps.length === 0) return;
      var badgeWrap = document.createElement('div');
      badgeWrap.className = 'asset-ep-badges asset-ep-badges--detail';
      // 详情界面始终展开，不简化
      eps.slice().sort(function(a,b){return a-b;}).forEach(function(ep) {
        var b = document.createElement('span');
        b.className = 'asset-ep-badge';
        b.textContent = 'E' + (ep < 10 ? '0' : '') + ep;
        badgeWrap.appendChild(b);
      });
      // 插入到标题行后面
      var titleRow = card.querySelector('h4');
      if (titleRow && titleRow.parentElement) {
        titleRow.parentElement.style.flexWrap = 'wrap';
        titleRow.appendChild(badgeWrap);
      }
    });
  }

  // 为每个角色/场景卡片注入「＋加妆造/状态」按钮
  // 获取当前资产类型
  function getCurrentAssetKind() {
    var activeTab = document.querySelector('.tabs .tab.on');
    return activeTab ? activeTab.getAttribute('data-tab') : 'characters';
  }

  var _trashSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>';

  function addOutfitButtons() {
    document.querySelectorAll('.asset-group').forEach(function(g) {
      if (g.querySelector('.card-del-btn')) return;
      var kind = g.getAttribute('data-kind');
      var baseId = g.getAttribute('data-base-id');

      // 1) 卡片头部 actions 区：编辑 + 删除按钮（统一位置、统一样式）
      var actionsEl = g.querySelector('.char-group-actions');
      if (actionsEl) {
        var delBtn = document.createElement('button');
        delBtn.className = 'card-del-btn';
        delBtn.type = 'button';
        delBtn.title = '删除此资产';
        delBtn.innerHTML = _trashSvg + '删除';
        delBtn.onclick = function(e) {
          e.stopPropagation();
          showDeleteConfirm(kind, baseId, baseId, 'whole');
        };
        actionsEl.insertBefore(delBtn, actionsEl.firstChild);
        var editBtn = document.createElement('button');
        editBtn.className = 'card-edit-btn';
        editBtn.type = 'button';
        editBtn.title = '编辑信息';
        editBtn.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11.5 2.5l2 2-8 8H3.5v-2z"/></svg>编辑';
        editBtn.onclick = function(e) { e.stopPropagation(); openNameEditModal(kind, baseId); };
        actionsEl.insertBefore(editBtn, actionsEl.firstChild); // [编辑][删除][并入]
      }

      // 2) 妆造/状态子卡片加删除按钮
      var cards = g.querySelectorAll('.char-outfit-card');
      cards.forEach(function(card) {
        if (card.querySelector('.outfit-del-btn')) return;
        var imgWrap = card.querySelector('.char-outfit-img');
        if (!imgWrap) return;
        imgWrap.style.position = 'relative';
        var subDel = document.createElement('button');
        subDel.className = 'outfit-del-btn';
        subDel.type = 'button';
        subDel.title = '删除此妆造/状态';
        subDel.innerHTML = _trashSvg + '删除';
        subDel.onclick = function(e) {
          e.stopPropagation();
          var idEl = card.querySelector('.char-outfit-idtrans');
          var itemId = idEl ? idEl.textContent : '';
          showDeleteConfirm(kind, baseId, itemId, 'item');
        };
        imgWrap.appendChild(subDel);
      });

      // 3) 子项列表末尾加「添加妆造/状态」按钮（弹窗输名称）
      var grid = g.querySelector('.char-outfit-grid');
      if (grid && !grid.querySelector('.add-outfit-btn')) {
        var btn = document.createElement('button');
        btn.className = 'add-outfit-btn';
        btn.type = 'button';
        var subText = kind === 'characters' ? '添加妆造' : '添加状态';
        btn.innerHTML = '<div class="add-outfit-img-area">+</div><div class="add-outfit-label-area">' + subText + '</div>';
        btn.onclick = function(e) { e.stopPropagation(); openSubitemAddModal(kind, baseId); };
        grid.appendChild(btn);
      }
    });
  }

  // === 名称编辑弹窗（人物名/实体名 + 别名）===
  function openNameEditModal(kind, baseId) {
    var g = document.querySelector('.asset-group[data-kind="' + CSS.escape(kind) + '"][data-base-id="' + CSS.escape(baseId) + '"]');
    if (!g) return;
    var transEl = g.querySelector('.char-group-name-trans strong');
    var oriEl = g.querySelector('.char-group-name-ori');
    var aliasEl = g.querySelector('.char-group-aliases');
    var descOriEl = g.querySelector('.char-group-desc-ori');
    var descTransEl = g.querySelector('.char-group-desc-trans');
    function txt(el, re) { return el ? (el.textContent || '').replace(re || '', '').trim() : ''; }
    document.getElementById('name-edit-trans').value = txt(transEl);
    document.getElementById('name-edit-ori').value = txt(oriEl, /^中文名\s*/);
    // 别名：原始部分 + 转化部分（编辑后格式「别名：xxx（转化：yyy）」）
    var aliasFull = txt(aliasEl, /^别名[:：]\s*/);
    var aliasOriPart = aliasFull.replace(/（转化：.*$/, '').trim();
    var aliasTransMatch = aliasFull.match(/转化[:：]\s*([^）]*)/);
    document.getElementById('name-edit-alias-ori').value = aliasOriPart;
    document.getElementById('name-edit-alias-trans').value = aliasTransMatch ? aliasTransMatch[1].trim() : '';
    document.getElementById('name-edit-desc-ori').value = txt(descOriEl, /^原始/);
    document.getElementById('name-edit-desc-trans').value = txt(descTransEl, /^转化/);
    var modal = document.getElementById('asset-name-edit-modal');
    modal.dataset.kind = kind;
    modal.dataset.baseId = baseId;
    modal.classList.add('on');
    modal.setAttribute('aria-hidden', 'false');
  }
  function closeNameEditModal() {
    var modal = document.getElementById('asset-name-edit-modal');
    if (!modal) return;
    modal.classList.remove('on');
    modal.setAttribute('aria-hidden', 'true');
  }
  function confirmNameEdit() {
    var modal = document.getElementById('asset-name-edit-modal');
    var kind = modal.dataset.kind, baseId = modal.dataset.baseId;
    var g = document.querySelector('.asset-group[data-kind="' + CSS.escape(kind) + '"][data-base-id="' + CSS.escape(baseId) + '"]');
    if (!g) { closeNameEditModal(); return; }
    var ori = document.getElementById('name-edit-ori').value.trim();
    var trans = document.getElementById('name-edit-trans').value.trim();
    var aliasOri = document.getElementById('name-edit-alias-ori').value.trim();
    var aliasTrans = document.getElementById('name-edit-alias-trans').value.trim();
    var descOri = document.getElementById('name-edit-desc-ori').value.trim();
    var descTrans = document.getElementById('name-edit-desc-trans').value.trim();
    var transEl = g.querySelector('.char-group-name-trans strong');
    if (transEl && trans) transEl.textContent = trans;
    var oriEl = g.querySelector('.char-group-name-ori');
    if (oriEl && ori) oriEl.textContent = '中文名 ' + ori;
    // 别名：原始 + 转化
    var aliasEl = g.querySelector('.char-group-aliases');
    var aliasShow = '';
    if (aliasOri) aliasShow = '别名：' + aliasOri;
    if (aliasTrans && aliasTrans !== aliasOri) aliasShow += (aliasShow ? '（转化：' : '别名（转化：') + aliasTrans + '）';
    if (aliasShow) {
      if (!aliasEl) { aliasEl = document.createElement('div'); aliasEl.className = 'char-group-aliases'; g.querySelector('.char-group-info').appendChild(aliasEl); }
      aliasEl.textContent = aliasShow;
    } else if (aliasEl) { aliasEl.remove(); }
    // 描述：直接重建两栏（编辑后独立，不再走名字映射）
    var desc = g.querySelector('.char-group-desc');
    if (desc) {
      desc.dataset.dualCol = '1';
      function clamp(t) { var M = 160; return (t && t.length > M) ? t.slice(0, M - 1) + '…' : (t || '—'); }
      function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }
      desc.innerHTML =
        '<div class="char-group-desc-col char-group-desc-trans" title="' + esc(descTrans) + '"><span class="char-group-desc-label">转化</span>' + clamp(descTrans) + '</div>' +
        '<div class="char-group-desc-col char-group-desc-ori" title="' + esc(descOri) + '"><span class="char-group-desc-label">原始</span>' + clamp(descOri) + '</div>';
    }
    closeNameEditModal();
    alert('[Demo] 已更新信息（实际需调用后端 API）');
  }

  // === 添加妆造/状态 弹窗 ===
  function openSubitemAddModal(kind, baseId) {
    var label = kind === 'characters' ? '妆造' : '状态';
    document.getElementById('asset-subitem-add-title').textContent = '添加' + label;
    document.getElementById('asset-subitem-add-name').value = '';
    document.getElementById('asset-subitem-add-hint').textContent = '输入' + label + '名称，确认后可在详情页编辑更多信息';
    var modal = document.getElementById('asset-subitem-add-modal');
    modal.dataset.kind = kind;
    modal.dataset.baseId = baseId;
    modal.classList.add('on');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(function(){ document.getElementById('asset-subitem-add-name').focus(); }, 50);
  }
  function closeSubitemAddModal() {
    var modal = document.getElementById('asset-subitem-add-modal');
    if (!modal) return;
    modal.classList.remove('on');
    modal.setAttribute('aria-hidden', 'true');
  }
  function confirmSubitemAdd() {
    var modal = document.getElementById('asset-subitem-add-modal');
    var kind = modal.dataset.kind, baseId = modal.dataset.baseId;
    var name = document.getElementById('asset-subitem-add-name').value.trim();
    if (!name) { alert('请输入名称'); return; }
    var label = kind === 'characters' ? '妆造' : '状态';
    alert('[Demo] 已为「' + baseId + '」添加' + label + '「' + name + '」\n（实际需调用后端 API）');
    closeSubitemAddModal();
  }

  // 删除确认弹窗 — 有引用则必须选替代，无引用则不需要
  // 整体删除时为每个妆造/状态分别列出替代选择
  function showDeleteConfirm(kind, baseId, itemId, targetType) {
    var kindLabel = kind === 'characters' ? '角色' : (kind === 'scenes' ? '场景' : '道具');
    var subLabel = kind === 'characters' ? '妆造' : '状态';
    var displayName = targetType === 'whole' ? baseId : itemId;
    var typeName = targetType === 'whole' ? kindLabel : subLabel;

    // 判断是否有分镜引用
    var assetEps = ASSET_EP_MAP[baseId] || [];
    var hasRefs = assetEps.length > 0;
    var epsText = assetEps.map(function(e){ return 'E'+(e<10?'0':'')+e; }).join('、');

    var panel = document.getElementById('tab-' + kind);

    // ---- 整体删除：为每个妆造/状态分别列替代 ----
    if (targetType === 'whole') {
      var group = panel ? panel.querySelector('.asset-group[data-base-id="' + baseId + '"]') : null;
      var outfitCards = group ? group.querySelectorAll('.char-outfit-card') : [];
      var subItems = [];
      outfitCards.forEach(function(card) {
        var idEl = card.querySelector('.char-outfit-idtrans');
        var id = idEl ? idEl.textContent : '';
        if (id) subItems.push(id);
      });

      // 收集同类型其他主体作为替代选项
      var replaceOptions = [];
      if (panel) {
        panel.querySelectorAll('.asset-group').forEach(function(g) {
          var bid = g.getAttribute('data-base-id');
          if (bid && bid !== baseId) {
            var nt = g.querySelector('.char-group-name-trans strong');
            replaceOptions.push({ id: bid, label: (nt ? nt.textContent : bid) + '（' + bid + '）' });
          }
        });
      }
      var hasReplacements = replaceOptions.length > 0;

      var replaceHtml = '';
      if (hasRefs) {
        if (subItems.length > 0) {
          // 列出每个妆造/状态的替代选择
          replaceHtml =
            '<div class="del-replace-section">' +
              '<div class="del-replace-label">' + subLabel + '引用迁移 <span class="req">有引用的项必须指定替代</span></div>' +
              '<div class="del-replace-hint" style="margin-bottom:8px">该角色在 ' + epsText + ' 中有 @引用。请为每个' + subLabel + '指定替代目标：</div>';
          subItems.forEach(function(sid, idx) {
            replaceHtml +=
              '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">' +
                '<span style="font-size:12px;font-weight:600;min-width:60px;color:var(--t2);flex-shrink:0;overflow:hidden;text-overflow:ellipsis" title="' + sid + '">' + sid.split('_').slice(1).join('_') + '</span>' +
                '<span style="font-size:11px;color:var(--t3)">→</span>';
            if (hasReplacements) {
              replaceHtml +=
                '<select class="del-replace-select del-sub-replace" data-sub-id="' + sid + '" style="flex:1;min-width:160px">' +
                  '<option value="">— 不替代（直接删除引用）—</option>';
              replaceOptions.forEach(function(o) {
                replaceHtml += '<option value="' + o.id + '">' + o.label + '</option>';
              });
              replaceHtml += '</select>';
            } else {
              replaceHtml += '<span style="font-size:11px;color:var(--danger)">无可用替代</span>';
            }
            replaceHtml += '</div>';
          });
          replaceHtml += '</div>';
        } else {
          // 无子项
          if (hasReplacements) {
            replaceHtml =
              '<div class="del-replace-section">' +
                '<div class="del-replace-label">替代' + kindLabel + ' <span class="req">*必选</span></div>' +
                '<select class="del-replace-select" id="del-replace-sel">' +
                  '<option value="">— 请选择替代资产 —</option>';
            replaceOptions.forEach(function(o) {
              replaceHtml += '<option value="' + o.id + '">' + o.label + '</option>';
            });
            replaceHtml += '</select></div>';
          } else {
            replaceHtml =
              '<div class="del-replace-section" style="border-color:var(--danger)">' +
                '<div class="del-replace-label" style="color:var(--danger)">⚠ 有引用但无可用替代</div>' +
                '<div class="del-replace-hint">该资产在 ' + epsText + ' 中有 @引用，请先新增替代资产</div>' +
              '</div>';
          }
        }
      } else {
        replaceHtml =
          '<div class="del-replace-section">' +
            '<div class="del-replace-label" style="color:var(--brand-green)">✓ 该资产无分镜引用</div>' +
            '<div class="del-replace-hint">删除后不会影响任何分镜，可直接确认</div>' +
          '</div>';
      }

      var overlay = document.createElement('div');
      overlay.className = 'del-confirm-overlay';
      overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
      overlay.innerHTML =
        '<div class="del-confirm-box" style="max-height:80vh;overflow-y:auto;width:480px">' +
          '<h4><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>确认删除' + typeName + '</h4>' +
          '<p>即将删除 <span class="del-input-name">' + displayName + '</span>（整个' + kindLabel + '及其 ' + subItems.length + ' 套' + subLabel + '），此操作不可撤销。</p>' +
          replaceHtml +
          '<p style="font-size:12px;color:var(--t3);margin:10px 0 6px">请输入 <strong style="color:var(--danger)">' + displayName + '</strong> 确认删除：</p>' +
          '<input class="del-input" type="text" placeholder="输入名称确认…" id="del-confirm-input">' +
          '<div class="del-actions">' +
            '<button class="b bs" style="font-size:12px;padding:6px 16px" onclick="this.closest(\'.del-confirm-overlay\').remove()">取消</button>' +
            '<button class="b danger" style="font-size:12px;padding:6px 16px;opacity:0.5" id="del-confirm-btn" disabled>确认删除</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(overlay);

      var input = overlay.querySelector('#del-confirm-input');
      var confirmBtn = overlay.querySelector('#del-confirm-btn');

      input.focus();
      input.oninput = function() {
        var match = input.value.trim() === displayName;
        confirmBtn.disabled = !match;
        confirmBtn.style.opacity = match ? '1' : '0.5';
      };
      confirmBtn.onclick = function() {
        if (confirmBtn.disabled) return;
        var subReplaces = overlay.querySelectorAll('.del-sub-replace');
        var mapping = {};
        subReplaces.forEach(function(sel) {
          if (sel.value) mapping[sel.getAttribute('data-sub-id')] = sel.value;
        });
        var msg = '[Demo] 已删除' + typeName + '「' + displayName + '」';
        var keys = Object.keys(mapping);
        if (keys.length) msg += '\n引用迁移：' + keys.map(function(k){ return k.split('_').slice(1).join('_') + ' → ' + mapping[k]; }).join('；');
        msg += '\n（实际需调用后端 API）';
        alert(msg);
        overlay.remove();
      };

    // ---- 子项删除（单个妆造/状态） ----
    } else {
      var replaceOptions2 = [];
      if (panel) {
        var group2 = panel.querySelector('.asset-group[data-base-id="' + baseId + '"]');
        if (group2) {
          group2.querySelectorAll('.char-outfit-card').forEach(function(card) {
            var idEl = card.querySelector('.char-outfit-idtrans');
            var id = idEl ? idEl.textContent : '';
            if (id && id !== itemId) {
              replaceOptions2.push({ id: id, label: id });
            }
          });
        }
      }
      var hasReplacements2 = replaceOptions2.length > 0;

      var replaceHtml2 = '';
      if (hasRefs) {
        if (hasReplacements2) {
          replaceHtml2 =
            '<div class="del-replace-section">' +
              '<div class="del-replace-label">替代' + subLabel + ' <span class="req">*必选</span></div>' +
              '<select class="del-replace-select" id="del-replace-sel">' +
                '<option value="">— 请选择替代 —</option>';
          replaceOptions2.forEach(function(o) {
            replaceHtml2 += '<option value="' + o.id + '">' + o.label + '</option>';
          });
          replaceHtml2 += '</select>' +
              '<div class="del-replace-hint">该' + subLabel + '在 ' + epsText + ' 中有 @引用，必须指定替代</div>' +
            '</div>';
        } else {
          replaceHtml2 =
            '<div class="del-replace-section" style="border-color:var(--danger)">' +
              '<div class="del-replace-label" style="color:var(--danger)">⚠ 有引用但无可用替代</div>' +
              '<div class="del-replace-hint">该' + subLabel + '在 ' + epsText + ' 中有引用，请先新增替代</div>' +
            '</div>';
        }
      } else {
        replaceHtml2 =
          '<div class="del-replace-section">' +
            '<div class="del-replace-label" style="color:var(--brand-green)">✓ 该' + subLabel + '无分镜引用</div>' +
            '<div class="del-replace-hint">删除后不会影响任何分镜</div>' +
          '</div>';
      }

      var overlay2 = document.createElement('div');
      overlay2.className = 'del-confirm-overlay';
      overlay2.onclick = function(e) { if (e.target === overlay2) overlay2.remove(); };
      overlay2.innerHTML =
        '<div class="del-confirm-box">' +
          '<h4><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>确认删除' + subLabel + '</h4>' +
          '<p>即将删除 <span class="del-input-name">' + displayName + '</span>（仅此' + subLabel + '），此操作不可撤销。</p>' +
          replaceHtml2 +
          '<p style="font-size:12px;color:var(--t3);margin:10px 0 6px">请输入 <strong style="color:var(--danger)">' + displayName + '</strong> 确认删除：</p>' +
          '<input class="del-input" type="text" placeholder="输入名称确认…" id="del-confirm-input">' +
          '<div class="del-actions">' +
            '<button class="b bs" style="font-size:12px;padding:6px 16px" onclick="this.closest(\'.del-confirm-overlay\').remove()">取消</button>' +
            '<button class="b danger" style="font-size:12px;padding:6px 16px;opacity:0.5" id="del-confirm-btn" disabled>确认删除</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(overlay2);

      var input2 = overlay2.querySelector('#del-confirm-input');
      var confirmBtn2 = overlay2.querySelector('#del-confirm-btn');
      var replaceSel2 = overlay2.querySelector('#del-replace-sel');

      function checkValid2() {
        var nameMatch = input2.value.trim() === displayName;
        var replaceOk = !hasRefs || !hasReplacements2 || (replaceSel2 && replaceSel2.value !== '');
        var valid = nameMatch && replaceOk;
        confirmBtn2.disabled = !valid;
        confirmBtn2.style.opacity = valid ? '1' : '0.5';
      }

      input2.focus();
      input2.oninput = checkValid2;
      if (replaceSel2) replaceSel2.onchange = checkValid2;
      confirmBtn2.onclick = function() {
        if (confirmBtn2.disabled) return;
        var replaceId = replaceSel2 ? replaceSel2.value : '';
        var msg = '[Demo] 已删除' + subLabel + '「' + displayName + '」';
        if (replaceId) msg += '\n引用已迁移至：' + replaceId;
        msg += '\n（实际需调用后端 API）';
        alert(msg);
        overlay2.remove();
      };
    }
  }

  // 模糊匹配：支持拼音首字母、拼音全拼、忽略空格/下划线/符号
  var _pinyinMap = {
    "安":"an","小姐":"xiaojie","段":"duan","枫":"feng","粉":"fen","裙":"qun","贵":"gui","妇":"fu","富":"fu",
    "姜":"jiang","总":"zong","父":"fu","母":"mu","老":"lao","太":"tai","路":"lu","人":"ren","女":"nv","甲":"jia","乙":"yi",
    "骚":"sao","扰":"rao","男":"nan","沈":"shen","阳":"yang","助":"zhu","理":"li","濯":"zhuo","樱":"ying","桥":"qiao",
    "卧":"wo","室":"shi","酒":"jiu","店":"dian","楼":"lou","梯":"ti","间":"jian","客":"ke","房":"fang","大":"da","堂":"tang",
    "前":"qian","门":"men","口":"kou","休":"xiu","息":"xi","区":"qu","婚":"hun","礼":"li","宣":"xuan","誓":"shi",
    "总":"zong","裁":"cai","办":"ban","公":"gong","起":"qi","居":"ju","厅":"ting","中":"zhong","式":"shi","庭":"ting","院":"yuan",
    "老":"lao","宅":"zhai","亲":"qin","密":"mi","照":"zhao","片":"pian","钻":"zuan","戒":"jie","啤":"pi","瓶":"ping",
    "古":"gu","董":"dong","花":"hua","黑":"hei","色":"se","轿":"jiao","车":"che","咖":"ka","啡":"fei","杯":"bei",
    "领":"ling","带":"dai","粉":"fen","饼":"bing","盒":"he","定":"ding","制":"zhi","礼":"li","服":"fu","翠":"cui","绿":"lv",
    "玉":"yu","镯":"zhuo","珍":"zhen","珠":"zhu","项":"xiang","链":"lian","小":"xiao","木":"mu","陕":"shan","北":"bei",
    "苹":"ping","果":"guo"
  };

  function fuzzyMatch(text, query) {
    if (!query) return true;
    text = text.toLowerCase();
    query = query.toLowerCase();
    // 1. 直接子串匹配
    if (text.indexOf(query) >= 0) return true;
    // 2. 忽略空格/下划线/中划线后匹配
    var clean = text.replace(/[\s_\-]/g, '');
    var cleanQ = query.replace(/[\s_\-]/g, '');
    if (clean.indexOf(cleanQ) >= 0) return true;
    // 3. 拆分关键词，每个都命中即匹配（支持 "so sm" 匹配 "Sophia Smith"）
    var words = query.split(/[\s,，、]+/).filter(Boolean);
    if (words.length > 1) {
      return words.every(function(w) { return text.indexOf(w) >= 0; });
    }
    // 4. 模糊字符序列匹配（查询字符按顺序出现在文本中即可）
    var ti = 0, qi = 0;
    while (ti < text.length && qi < query.length) {
      if (text[ti] === query[qi]) qi++;
      ti++;
    }
    if (qi === query.length) return true;
    return false;
  }

  function applyAssetFilters() {
    var keyword = (document.getElementById('asset-search').value || '').trim();
    var epFilter = document.getElementById('asset-ep-filter').value;
    var visibleCount = 0;
    var totalCount = 0;

    // Find active tab
    var activeTab = document.querySelector('.tabs .tab.on');
    var kind = activeTab ? activeTab.getAttribute('data-tab') : 'characters';
    var panel = document.getElementById('tab-' + kind);
    if (!panel) return;

    panel.querySelectorAll('.asset-group').forEach(function(el) {
      totalCount++;
      var baseId = el.getAttribute('data-base-id') || '';

      // Get all searchable text in this group
      var nameEl = el.querySelector('.char-group-name-trans');
      var nameOriEl = el.querySelector('.char-group-name-ori');
      var descEl = el.querySelector('.char-outfit-desc');
      var descTransEl = el.querySelector('.char-outfit-desc-trans');
      var outfitIdEl = el.querySelector('.char-outfit-idtrans');
      var searchText = [
        baseId,
        nameEl ? nameEl.textContent : '',
        nameOriEl ? nameOriEl.textContent : '',
        descEl ? descEl.textContent : '',
        descTransEl ? descTransEl.textContent : '',
        outfitIdEl ? outfitIdEl.textContent : ''
      ].join(' ');

      var matchSearch = !keyword || fuzzyMatch(searchText, keyword);

      var matchEp = true;
      if (epFilter) {
        var ep = parseInt(epFilter);
        var assetEps = ASSET_EP_MAP[baseId] || [];
        matchEp = assetEps.indexOf(ep) >= 0;
      }

      if (matchSearch && matchEp) {
        el.classList.remove('hidden-by-filter');
        visibleCount++;
      } else {
        el.classList.add('hidden-by-filter');
      }
    });

    document.getElementById('asset-filter-count').innerHTML = '显示 <strong>' + visibleCount + '</strong> / ' + totalCount + ' 项';
  }

  // Run after page loads
  document.addEventListener('DOMContentLoaded', function() {
    addEpBadges();
    addOutfitButtons();
    applyAssetFilters();
  });

  // Also run when tabs switch (stab function)
  var _origStab = window.stab;
  window.stab = function(tab, el) {
    if (_origStab) _origStab(tab, el);
    setTimeout(function() { addEpBadges(); addOutfitButtons(); applyAssetFilters(); }, 50);
  };

  // ========== 新增资产弹窗 ==========
  function openAssetAddModal() {
    var modal = document.getElementById('asset-add-modal');
    if (!modal) return;
    ['asset-add-ori','asset-add-trans','asset-add-alias-ori','asset-add-alias-trans','asset-add-desc-ori','asset-add-desc-trans'].forEach(function(id){
      var el = document.getElementById(id); if(el) el.value = '';
    });
    var kind = getCurrentAssetKind();
    var kindLabel = kind === 'characters' ? '角色' : (kind === 'scenes' ? '场景' : '道具');
    var titleEl = document.getElementById('asset-add-modal-title');
    if (titleEl) titleEl.textContent = '新增' + kindLabel;
    modal.classList.add('on');
    modal.setAttribute('aria-hidden', 'false');
  }
  function closeAssetAddModal() {
    var modal = document.getElementById('asset-add-modal');
    if (!modal) return;
    modal.classList.remove('on');
    modal.setAttribute('aria-hidden', 'true');
  }
  function confirmAddAsset() {
    var kind = getCurrentAssetKind();
    var kindLabel = kind === 'characters' ? '角色' : (kind === 'scenes' ? '场景' : '道具');
    var ori = document.getElementById('asset-add-ori').value.trim();
    var trans = document.getElementById('asset-add-trans').value.trim();
    if (!ori && !trans) { alert('请至少输入原始名称或转化名称'); return; }
    var aliasOri = document.getElementById('asset-add-alias-ori').value.trim();
    var aliasTrans = document.getElementById('asset-add-alias-trans').value.trim();
    var descOri = document.getElementById('asset-add-desc-ori').value.trim();
    var descTrans = document.getElementById('asset-add-desc-trans').value.trim();
    alert('[Demo] 已新增' + kindLabel + '「' + (trans || ori) + '」\n原始/转化名称：' + ori + ' / ' + trans + '\n别名：' + aliasOri + ' / ' + aliasTrans + '\n描述：' + (descOri||descTrans ? '已填' : '—') + '\n（实际需调用后端 API）');
    closeAssetAddModal();
  }

  // ========== 删除资产弹窗 ==========
  function openAssetDeleteModal() {
    var modal = document.getElementById('asset-delete-modal');
    if (!modal) return;
    renderDeleteList();
    modal.classList.add('on');
    modal.setAttribute('aria-hidden', 'false');
  }
  function closeAssetDeleteModal() {
    var modal = document.getElementById('asset-delete-modal');
    if (!modal) return;
    modal.classList.remove('on');
    modal.setAttribute('aria-hidden', 'true');
  }
  function renderDeleteList() {
    var container = document.getElementById('asset-delete-list');
    var activeTab = document.querySelector('.tabs .tab.on');
    var kind = activeTab ? activeTab.getAttribute('data-tab') : 'characters';
    var kindLabel = kind === 'characters' ? '角色' : (kind === 'scenes' ? '场景' : '道具');
    var subLabel = kind === 'characters' ? '妆造' : '状态';
    var groups = document.querySelectorAll('#tab-' + kind + ' .asset-group');

    // Build list of all assets for "replace with" dropdown
    var allAssets = [];
    groups.forEach(function(g) {
      var baseId = g.getAttribute('data-base-id');
      var nameTrans = g.querySelector('.char-group-name-trans strong');
      allAssets.push({ baseId: baseId, name: nameTrans ? nameTrans.textContent : baseId });
    });

    var html = '';
    groups.forEach(function(g) {
      var baseId = g.getAttribute('data-base-id');
      var nameTrans = g.querySelector('.char-group-name-trans strong');
      var nameText = nameTrans ? nameTrans.textContent : baseId;
      var outfits = g.querySelectorAll('.char-outfit-card');

      html += '<div style="border-bottom:1px solid var(--bd);padding:10px 12px">';
      // Delete whole entity
      html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
      html += '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;font-size:13px;flex-shrink:0">';
      html += '<input type="checkbox" class="asset-del-check" data-delete-target="whole" data-base-id="' + baseId + '" onchange="onWholeDeleteCheck(this)">';
      html += '删除「' + nameText + '」（整' + kindLabel + '）</label>';
      html += '<span style="font-size:11px;color:var(--t2)">→ 替代为</span>';
      html += '<select class="delete-replace-select" data-replace-for="whole-' + baseId + '">';
      html += '<option value="">（不替代，直接删除）</option>';
      allAssets.forEach(function(a) {
        if (a.baseId !== baseId) {
          html += '<option value="' + a.baseId + '">' + a.name + '（' + a.baseId + '）</option>';
        }
      });
      html += '</select>';
      html += '</div>';

      // Delete individual outfit/state
      if (outfits.length > 1) {
        html += '<div style="margin:6px 0 0 24px">';
        outfits.forEach(function(card, i) {
          var idtrans = card.querySelector('.char-outfit-idtrans');
          var idText = idtrans ? idtrans.textContent : (subLabel + (i+1));
          html += '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:3px 0">';
          html += '<label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:12px;color:var(--t2);flex-shrink:0">';
          html += '<input type="checkbox" class="asset-del-check" data-delete-target="item" data-base-id="' + baseId + '" data-item-id="' + idText + '">';
          html += '仅删除' + subLabel + '：' + idText + '</label>';
          html += '<span style="font-size:10px;color:var(--t2)">→ 替代为</span>';
          html += '<select class="delete-replace-select" data-replace-for="item-' + baseId + '-' + i + '">';
          html += '<option value="">（直接删除）</option>';
          outfits.forEach(function(oc, j) {
            if (j !== i) {
              var oid = oc.querySelector('.char-outfit-idtrans');
              html += '<option value="' + (oid ? oid.textContent : '') + '">' + (oid ? oid.textContent : subLabel + (j+1)) + '</option>';
            }
          });
          html += '</select>';
          html += '</div>';
        });
        html += '</div>';
      }
      html += '</div>';
    });
    if (!html) html = '<div style="padding:20px;text-align:center;color:var(--t2)">当前无资产</div>';
    container.innerHTML = html;
  }
  function onWholeDeleteCheck(el) {
    // When whole is checked, uncheck individual items
    var baseId = el.getAttribute('data-base-id');
    var checked = el.checked;
    var container = document.getElementById('asset-delete-list');
    container.querySelectorAll('input[data-delete-target="item"][data-base-id="' + baseId + '"]').forEach(function(cb) {
      cb.checked = false;
      cb.disabled = checked;
    });
  }
  function confirmDeleteAssets() {
    var checks = document.querySelectorAll('.asset-del-check:checked');
    if (!checks.length) { alert('请至少选择一项要删除的资产'); return; }
    var items = [];
    checks.forEach(function(cb) {
      var target = cb.getAttribute('data-delete-target');
      var baseId = cb.getAttribute('data-base-id');
      var line = '';
      if (target === 'whole') {
        line = '删除整项：' + baseId;
        // Check replacement
        var sel = document.querySelector('select[data-replace-for="whole-' + baseId + '"]');
        if (sel && sel.value) line += ' → 替代为「' + sel.value + '」';
      } else {
        line = '删除单项：' + baseId + ' / ' + cb.getAttribute('data-item-id');
      }
      items.push(line);
    });
    if (confirm('确认删除以下资产？\n\n' + items.join('\n') + '\n\n若指定了替代素材，该资产在分镜中的 @引用将自动替换为替代素材。\n此操作不可撤销！')) {
      alert('[Demo] 已删除 ' + items.length + ' 项！（实际需调用后端 API）');
      closeAssetDeleteModal();
    }
  }

  // ========== 合并弹窗：按角色分组 ==========
  var _mergeMode = 'group';

  function switchMergeMode(mode, tabEl) {
    _mergeMode = mode;
    document.querySelectorAll('.merge-mode-tab').forEach(function(t) { t.classList.remove('active'); });
    tabEl.classList.add('active');
  }

  // Override renderAssetMergeModalLists to add group headers + panel filters
  var _origRenderMerge = window.renderAssetMergeModalLists;
  if (typeof renderAssetMergeModalLists === 'function') {
    var _savedRender = renderAssetMergeModalLists;
    window.renderAssetMergeModalLists = function() {
      _savedRender();
      // After render, add group headers to both lists
      _addGroupHeaders('asset-merge-canonical-list');
      _addGroupHeaders('asset-merge-source-list');
      // Build independent filters for each panel
      _buildMergePanelFilters();
    };
  }

  // 左右面板各自的筛选状态
  var _mergeFilterState = { left: '', right: '' };

  function _buildMergePanelFilters() {
    _buildOnePanelFilter('merge-filter-left', 'asset-merge-canonical-list', 'left');
    _buildOnePanelFilter('merge-filter-right', 'asset-merge-source-list', 'right');
  }

  function _buildOnePanelFilter(filterId, listId, side) {
    var bar = document.getElementById(filterId);
    if (!bar) return;
    var list = document.getElementById(listId);
    if (!list) return;

    // 收集该面板内的角色名及数量
    var charCount = {};
    list.querySelectorAll('.asset-merge-row').forEach(function(row) {
      var input = row.querySelector('input');
      if (!input) return;
      var aid = input.value || '';
      var baseName = aid.split('_')[0];
      if (!charCount[baseName]) charCount[baseName] = 0;
      charCount[baseName]++;
    });

    // 构建横向滚动 tab 菜单
    var html = '<div class="merge-panel-filter-item active" onclick="_filterMergePanel(\'' + side + '\', \'\', this)">全部</div>';
    var names = Object.keys(charCount).sort();
    names.forEach(function(name) {
      html += '<div class="merge-panel-filter-item" onclick="_filterMergePanel(\'' + side + '\', \'' + name.replace(/'/g, "\\'") + '\', this)">' +
        name + '<span class="filter-count">(' + charCount[name] + ')</span></div>';
    });
    bar.innerHTML = html;

    // 恢复之前的筛选状态
    if (_mergeFilterState[side]) {
      _applyMergePanelFilter(side, _mergeFilterState[side]);
      // 激活对应的 tab
      bar.querySelectorAll('.merge-panel-filter-item').forEach(function(item) {
        var isAll = !item.querySelector('.filter-count');
        var itemName = isAll ? '' : item.textContent.replace(/\(\d+\)/, '').trim();
        item.classList.toggle('active', itemName === _mergeFilterState[side]);
      });
    }
  }

  function _filterMergePanel(side, charName, el) {
    // 切换当前面板的 tab 激活状态
    var filterId = side === 'left' ? 'merge-filter-left' : 'merge-filter-right';
    var bar = document.getElementById(filterId);
    if (bar) bar.querySelectorAll('.merge-panel-filter-item').forEach(function(p) { p.classList.remove('active'); });
    if (el) el.classList.add('active');

    _mergeFilterState[side] = charName;
    _applyMergePanelFilter(side, charName);
  }

  function _applyMergePanelFilter(side, charName) {
    var listId = side === 'left' ? 'asset-merge-canonical-list' : 'asset-merge-source-list';
    var list = document.getElementById(listId);
    if (!list) return;

    var hasGroups = !!list.querySelector('.merge-group-header');
    if (hasGroups) {
      list.querySelectorAll('.merge-group-header').forEach(function(header) {
        var match = !charName || header.textContent.trim() === charName;
        header.classList.toggle('hidden-by-merge-filter', !match);
        var section = header.nextElementSibling;
        if (section && section.classList.contains('merge-group-section')) {
          section.classList.toggle('hidden-by-merge-filter', !match);
        }
      });
    } else {
      list.querySelectorAll('.asset-merge-row').forEach(function(row) {
        var input = row.querySelector('input');
        if (!input) return;
        var aid = input.value || '';
        var baseName = aid.split('_')[0];
        var match = !charName || baseName === charName;
        row.classList.toggle('hidden-by-merge-filter', !match);
      });
    }
  }

  function _addGroupHeaders(listId) {
    var list = document.getElementById(listId);
    if (!list) return;
    var items = list.querySelectorAll('.asset-merge-row');
    if (!items.length) return;
    // Group by base_id prefix (before underscore = character name)
    var groups = {};
    items.forEach(function(item) {
      var input = item.querySelector('input');
      if (!input) return;
      var aid = input.value || '';
      var baseName = aid.split('_')[0];
      if (!groups[baseName]) groups[baseName] = [];
      groups[baseName].push(item);
    });
    // Rebuild with group headers
    var frag = document.createDocumentFragment();
    var groupNames = Object.keys(groups).sort();
    groupNames.forEach(function(name) {
      var header = document.createElement('div');
      header.className = 'merge-group-header';
      header.textContent = name;
      frag.appendChild(header);
      var section = document.createElement('div');
      section.className = 'merge-group-section';
      groups[name].forEach(function(item) {
        section.appendChild(item);
      });
      frag.appendChild(section);
    });
    list.innerHTML = '';
    list.appendChild(frag);
  }


  // Always try after a delay in case user navigates quickly
  setTimeout(function() {
    if (document.querySelector('.dlg-panel') === null) {
      console.log('[dialogue] retry injection...');
      if (typeof injectDialoguePanels === 'function') {
        injectDialoguePanels();
      }
    }
  }, 2000);


  // === char-group-desc 拆分为「转化前 / 转化后」两栏 ===
  // 角色名映射取自各分组的 转化名 / 中文名；转化前=英文→中文，转化后=中文→英文。
  function _buildCharGroupNameMap() {
    var map = [];
    document.querySelectorAll('.char-group.asset-group').forEach(function (g) {
      var transEl = g.querySelector('.char-group-name-trans strong');
      var oriEl = g.querySelector('.char-group-name-ori');
      if (!transEl || !oriEl) return;
      var t = (transEl.textContent || '').trim();
      var o = (oriEl.textContent || '').replace(/^中文名\s*/, '').trim();
      if (t && o && t !== o) map.push({ trans: t, ori: o });
    });
    map.sort(function (a, b) { return b.trans.length - a.trans.length; }); // 长名优先
    return map;
  }
  function _replaceNames(text, map, dir) {
    var out = text;
    map.forEach(function (m) {
      var from = dir === 'ori' ? m.trans : m.ori;
      var to = dir === 'ori' ? m.ori : m.trans;
      if (from && from !== to) out = out.split(from).join(to);
    });
    return out;
  }
  function splitCharGroupDescColumns() {
    var DESC_MAX = 160; // 单栏字数上限（大于当前最长 153 字，仅未来超长才省略）
    function clamp(t){ return (t && t.length > DESC_MAX) ? t.slice(0, DESC_MAX - 1) + '…' : (t || ''); }
    function esc(s){ return (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }
    var map = _buildCharGroupNameMap();
    document.querySelectorAll('.char-group.asset-group').forEach(function (g) {
      var desc = g.querySelector('.char-group-desc');
      if (!desc) return;
      // 1) 拆成「原始 / 转化」两栏（上下排列；幂等）
      if (!desc.dataset.dualCol) {
        var raw = (desc.textContent || '').trim();
        if (raw) {
          desc.dataset.dualCol = '1';
          var oriFull = _replaceNames(raw, map, 'ori');
          var transFull = _replaceNames(raw, map, 'trans');
          desc.innerHTML =
            '<div class="char-group-desc-col char-group-desc-trans" title="' + esc(transFull) + '"><span class="char-group-desc-label">转化</span>' + clamp(transFull) + '</div>' +
            '<div class="char-group-desc-col char-group-desc-ori" title="' + esc(oriFull) + '"><span class="char-group-desc-label">原始</span>' + clamp(oriFull) + '</div>';
        }
      }
      // 2) 迁入右侧 .char-group-desc-side（header 层级，竖线分隔；幂等）
      if (!desc.closest('.char-group-desc-side')) {
        var header = g.querySelector('.char-group-header');
        if (!header) return;
        var actions = header.querySelector('.char-group-actions');
        var side = document.createElement('div');
        side.className = 'char-group-desc-side';
        if (actions) header.insertBefore(side, actions);
        else header.appendChild(side);
        side.appendChild(desc);
      }
    });
  }
  if (document.readyState !== 'loading') splitCharGroupDescColumns();
  else document.addEventListener('DOMContentLoaded', splitCharGroupDescColumns);

  // === 角色详情卡：名称字段体现「服装名」而非人物名（人物名留在 header）===
  // 详情卡：h4 保留实体名（人物/场景/道具本身）；移除冗余 name_ori/trans 输入项；id 行改双 id 显示
  function rewriteAssetCardNameFields() {
    document.querySelectorAll('.asset-card').forEach(function (card) {
      if (card.dataset.nameFieldsAdjusted) return;
      card.dataset.nameFieldsAdjusted = '1';
      // 1) 移除 name_ori / name_trans 输入项（h4 已显示实体名）
      ['name_ori', 'name_trans'].forEach(function (f) {
        var inp = card.querySelector('input[data-field="' + f + '"]');
        if (inp) { var wrap = inp.closest('.asset-grid > div'); if (wrap) wrap.remove(); }
      });
      // 2) id 行改为「id_trans · id」双 id 显示（与 h4「英文 · 中文」呼应）
      var idDiv = card.querySelector('div[style*="monospace"]');
      if (idDiv && !idDiv.dataset.dualId) {
        var idTrans = (idDiv.textContent || '').trim();
        var idOri = card.getAttribute('data-aid') || '';
        idDiv.dataset.dualId = '1';
        idDiv.innerHTML = idTrans + '<span style="color:var(--t3)"> · ' + idOri + '</span>';
      }
    });
  }
  if (document.readyState !== 'loading') rewriteAssetCardNameFields();
  else document.addEventListener('DOMContentLoaded', rewriteAssetCardNameFields);

  // === 道具(props)子项文案对齐场景：统一称「状态」===
  function normalizePropsStateWording() {
    document.querySelectorAll('.char-group.asset-group[data-kind="props"]').forEach(function (g) {
      var title = g.querySelector('.char-outfit-list-title');
      if (title && !title.dataset.norm) { title.textContent = title.textContent.replace(/道具列表/, '状态列表'); title.dataset.norm = '1'; }
      var count = g.querySelector('.char-group-count');
      if (count && !count.dataset.norm) { count.textContent = count.textContent.replace(/个道具/, '个状态'); count.dataset.norm = '1'; }
    });
  }
  if (document.readyState !== 'loading') normalizePropsStateWording();
  else document.addEventListener('DOMContentLoaded', normalizePropsStateWording);

  // === 生成按钮升级：青色渐变 + 设计积分（对齐深色主题）===
  // 积分图标（圆形代币）
  var _BEAN_ICON = '<svg class="bean-icon" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6.5" fill="currentColor"/><circle cx="9" cy="9" r="2.6" fill="#06281a"/></svg>';
  var _GEN_ICON = _BEAN_ICON;
  var GEN_PRICES = { adapt: 2, video: 500 }; // 批量改编单价低（示例）；生图由 _genUnitPrice 计算
  // 定价（IGI2 高质量基准）：文生图 2K=8 / 4K=12；参考生图 +1（2K=9 / 4K=13）
  function _genUnitPrice(isRef, res){ var base = (res==='4K') ? 12 : 8; return isRef ? base + 1 : base; }
  function _genScopeUnitPrice(scope, res){
    if(scope==='refs') return _genUnitPrice(true, res);
    if(scope==='all') return _genUnitPrice(false, res) + _genUnitPrice(true, res);
    return _genUnitPrice(false, res);
  }
  function _beanScore(n){ return _BEAN_ICON + '<span class="gen-score">' + n + '</span>'; }
  function _cfg(k, def){ return (typeof GEN_CONFIG !== 'undefined') ? GEN_CONFIG[k] : def; }
  function upgradeGenButtons() {
    var res = _cfg('res', '2K'), qty = _cfg('count', 1);
    // 详情页「生成素材图」= 文生图
    document.querySelectorAll('button[onclick*="genOneAsset"]').forEach(function (b) {
      if (b.dataset.genUpgraded) return;
      b.dataset.genUpgraded = '1';
      b.className = 'b gen-btn';
      b.innerHTML = _GEN_ICON + '<span class="gen-score">' + (_genUnitPrice(false, res) * qty) + '</span><span class="gen-label">生成素材图</span>';
    });
    // 批量改编（文本改编，固定示例价）；积分图标+积分置于文字前
    var adapt = document.getElementById('btn-asset-adapt');
    if (adapt && !adapt.dataset.genUpgraded) {
      adapt.dataset.genUpgraded = '1';
      adapt.className = adapt.className.replace(/\bba\b/, '').replace(/\bbs\b/, '') + ' gen-btn';
      adapt.dataset.count = window.TOTAL_ASSETS || 67;
      var aTxt = adapt.querySelector('.btn-text');
      if (aTxt) aTxt.insertAdjacentHTML('beforebegin', _beanScore(GEN_PRICES.adapt * (window.TOTAL_ASSETS || 67)));
    }
    // 批量生成（按钮不显示积分，积分在弹窗内随选项实时计算）
    var gen = document.getElementById('btn-asset-gen');
    if (gen && !gen.dataset.genUpgraded) {
      gen.dataset.genUpgraded = '1';
      gen.className = gen.className.replace(/\bba\b/, '').replace(/\bbs\b/, '') + ' gen-btn';
      gen.dataset.count = window.REVIEW_BATCH_TOTAL || 49;
    }
    // 视频页「生成视频片段」（genShot）—— 保留 data-gen-text/regen-text 属性，结构改为 icon+score+label
    document.querySelectorAll('button[onclick^="genShot"]').forEach(function (b) {
      if (b.dataset.genUpgraded) return;
      b.dataset.genUpgraded = '1';
      b.className = b.className.replace(/\bba\b/, '').replace(/\bbs\b/, '') + ' gen-btn';
      var label = (b.dataset.regenText || b.dataset.genText || b.textContent || '生成视频片段').trim();
      b.innerHTML = _GEN_ICON + '<span class="gen-score">' + GEN_PRICES.video + '</span><span class="gen-shot-label">' + label + '</span>';
    });
    // AI 辅助「生成修改」按钮（提示词优化，1 积分）
    var aiGen = document.getElementById('shot-ai-generate-btn');
    if (aiGen && !aiGen.dataset.genUpgraded) {
      aiGen.dataset.genUpgraded = '1';
      aiGen.className = 'b gen-btn shot-ai-gen-btn';
      aiGen.innerHTML = _GEN_ICON + '<span class="gen-score">1</span><span>生成修改</span>';
    }
    // 「开始分析 / 已完成分析」按钮（全集解析，100 积分；仅未完成时显示积分）
    var analyzeBtn = document.getElementById('btn-analyze-full');
    if (analyzeBtn && !analyzeBtn.dataset.genUpgraded) {
      analyzeBtn.dataset.genUpgraded = '1';
      var analyzeLabel = (analyzeBtn.textContent || '').trim() || '开始分析';
      analyzeBtn.className = (analyzeBtn.className.replace(/\bbtn-analyze-\w+\b/g, '') + ' gen-btn').trim();
      if (analyzeBtn.disabled) {
        analyzeBtn.innerHTML = '<span>' + analyzeLabel + '</span>';
      } else {
        analyzeBtn.innerHTML = _GEN_ICON + '<span class="gen-score">100</span><span>' + analyzeLabel + '</span>';
      }
    }
    if (typeof _updateMsBtnState === 'function') _updateMsBtnState();
  }
  function updateGenScores() {
    if (typeof GEN_CONFIG === 'undefined') return;
    var res = GEN_CONFIG.res, qty = GEN_CONFIG.count;
    document.querySelectorAll('button[onclick*="genOneAsset"]').forEach(function (b) {
      var s = b.querySelector('.gen-score'); if (s) s.textContent = _genUnitPrice(false, res) * qty;
    });
    var gen = document.getElementById('btn-asset-gen');
    if (gen) { var n = parseInt(gen.dataset.count || '49', 10); var sg = gen.querySelector('.gen-score'); if (sg) sg.textContent = _genScopeUnitPrice(_genScope, res) * qty * n; }
    // 批量生成弹窗积分实时更新（范围 / 分辨率 / 数量 任一变化都重算）
    if (_bgAssetCount) { var bgEl = document.getElementById('bg-score'); if (bgEl) bgEl.innerHTML = _beanScore(_genScopeUnitPrice(_genScope, res) * qty * _bgAssetCount); }
  }
  window.__setGenQty = function (q) { if (typeof GEN_CONFIG !== 'undefined') GEN_CONFIG.count = q || 1; updateGenScores(); };
  if (document.readyState !== 'loading') upgradeGenButtons();
  else document.addEventListener('DOMContentLoaded', upgradeGenButtons);

  // === params-display 参数配置选单（对齐深色主题：厂商 tabs + 多参数）===
  var GEN_PROVIDERS = [
    { id:'platform', name:'平台模型', color:'#00DA5A', desc:'震撼的超写实照片，精准的文字与排版', models:['IGI 2 (测试版)','INB 2 (测试版)','INBP (测试版)','IMJ 8','IMJ 7'], res:['1K','2K','4K'], quality:['快速','平衡','高质量'] },
    { id:'jimeng', name:'即梦', color:'#3E8BFF', desc:'即梦最新生图模型', models:['即梦 5.0','即梦 4.5','即梦 4.0'], res:['2K','3K','4K'], quality:null },
    { id:'kling', name:'可灵', color:'#A855F7', desc:'基础图像生成到高阶细节编辑，全链路无缝衔接', models:['可灵 O1'], res:['1K','2K'], quality:null },
  ];
  var GEN_RATIOS = ['1:1','16:9','9:16','3:2','2:3','4:3','3:4','21:9','9:21'];
  var GEN_COUNTS = [1,2,3,4];
  var GEN_CONFIG = { provider:'platform', model:'IGI 2 (测试版)', ratio:'1:1', res:'2K', quality:'高质量', count:1 };
  function _provider(){ return GEN_PROVIDERS.filter(function(p){return p.id===GEN_CONFIG.provider;})[0] || GEN_PROVIDERS[0]; }
  function _providerDot(p){
    p = p || _provider();
    if(p.id==='jimeng') return '<svg class="pp-tab-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M5.257 1.808C8.768 6.74 14.431 9.45 20.064 8.403a7.398 7.398 0 0 0 1.281-.38c.855-.33 1.975 1.01 1.326 1.658-.43.428-.84.82-1.208 1.147a51.149 51.149 0 0 1-8.389 6.044 51.146 51.146 0 0 1-9.49 4.263c-.453.15-.98.304-1.546.457-.885.238-1.484-1.4-.77-1.975.378-.306.713-.617.978-.927C5.969 14.336 6.299 8.174 3.717 2.697a18.2 18.2 0 0 1-.364-.84C2.995.98 4.042.335 4.656 1.055c.243.284.453.545.601.753zM19.53 13.695c-2.324 2.863-2.816 5.944-2.378 8.583l.024.16c.117.79-.816 1.277-1.448.788a12.813 12.813 0 0 0-.093-.072c-2.12-1.614-4.62-2.828-7.948-2.446a27.95 27.95 0 0 0 6.086-2.627c2.21-1.275 4.147-2.774 5.756-4.386z"/></svg>';
    if(p.id==='kling') return '<svg class="pp-tab-icon" viewBox="0 0 24 24" fill="currentColor"><path clip-rule="evenodd" d="M5.493 21.234c-1.112-1.451-1.109-4.263-.081-7.459l-4.557-2.63a1.683 1.683 0 0 1-.85-1.304 1.505 1.505 0 0 1 .08-.622 13.18 13.18 0 0 1 1.037-2.255c3.476-6.02 10.916-8.23 16.619-4.938.46.266.82.67 1.081 1.184.785 1.545.685 4.096-.234 6.954l4.557 2.631c.339.196.596.492.736.832a1.53 1.53 0 0 1 .034 1.093 13.146 13.146 0 0 1-1.037 2.255c-3.476 6.02-10.916 8.23-16.619 4.938a2.6 2.6 0 0 1-.766-.68zm11.096-6.615c-2.073 3.591-5.808 5.316-8.343 3.852-1.267-.731-1.994-2.122-2.145-3.778-.095-1.035.036-2.173.4-3.32.217-.684.517-1.37.902-2.039l.008-.014c2.073-3.59 5.808-5.315 8.343-3.852.633.366 1.13.895 1.49 1.54.986 1.772.922 4.415-.285 6.914-.111.23-.232.457-.362.683l-.008.014z"/></svg>';
    return '<svg class="pp-tab-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2zM5 14l.9 2.7L8.6 17.6 5 18.5l-.9 2.7L3.2 18.5.5 17.6l2.7-.9L5 14zM17 13l1.2 3.6L21.8 17.8 17 19l-1.2 3.6L14.6 19l-3.6-1.2 3.6-1.2L17 13z"/></svg>';
  }
  function _ratioPreview(ratio){
    var parts=String(ratio).split(':'), w=parseFloat(parts[0])||1, h=parseFloat(parts[1])||1, max=42, rw, rh;
    if(w>=h){ rw=max; rh=Math.max(6, max*h/w); } else { rh=max; rw=Math.max(6, max*w/h); }
    return '<span class="pp-ratio-preview"><span style="width:'+rw.toFixed(1)+'px;height:'+rh.toFixed(1)+'px"></span></span>';
  }
  function _summaryHTML(){
    var p=_provider(), parts=[GEN_CONFIG.model, GEN_CONFIG.ratio, GEN_CONFIG.res];
    if(p.quality) parts.push(GEN_CONFIG.quality);
    parts.push(GEN_CONFIG.count+'张');
    return parts.map(function(t){return '<span class="pd-param"><span class="pd-text">'+t+'</span></span>';}).join('<span class="pd-sep"></span>');
  }
  function _radios(key, opts, val){
    return opts.map(function(o){
      var on=(String(o)===String(val))?' on':'';
      return '<button type="button" class="pp-radio'+on+'" title="'+o+'" onclick="selectGenParam(\''+key+'\',\''+o+'\')">'+o+'</button>';
    }).join('');
  }
  function _popoverBody(){
    var p=_provider();
    var html='<div class="pp-tabs">';
    html+=GEN_PROVIDERS.map(function(pr){var on=pr.id===GEN_CONFIG.provider?' on':'';return '<button type="button" class="pp-tab'+on+'" onclick="selectGenProvider(\''+pr.id+'\')">'+_providerDot(pr)+'<span>'+pr.name+'</span></button>';}).join('');
    html+='</div><div class="pp-desc">'+p.desc+'</div><div class="pp-form">';
    html+='<div class="pp-row"><label>模型版本</label><div class="pp-radios">'+_radios('model',p.models,GEN_CONFIG.model)+'</div></div>';
    html+='<div class="pp-row"><label>画幅比</label><div class="pp-ratio-field">'+_ratioPreview(GEN_CONFIG.ratio)+'<div class="pp-radios pp-radios--ratio">'+_radios('ratio',GEN_RATIOS,GEN_CONFIG.ratio)+'</div></div></div>';
    html+='<div class="pp-row"><label>分辨率</label><div class="pp-radios">'+_radios('res',p.res,GEN_CONFIG.res)+'</div></div>';
    if(p.quality) html+='<div class="pp-row"><label>质量</label><div class="pp-radios">'+_radios('quality',p.quality,GEN_CONFIG.quality)+'</div></div>';
    html+='<div class="pp-row"><label>生成数量</label><div class="pp-radios">'+_radios('count',GEN_COUNTS,GEN_CONFIG.count)+'</div></div>';
    html+='</div>';
    return html;
  }
  function buildParamsDisplay(scope){
    return '<div class="params-display" data-scope="'+scope+'" onclick="toggleGenParams(event,this)">'
      + '<span class="pd-provider-logo">'+_providerDot()+'</span>'
      + '<span class="pd-summary">'+_summaryHTML()+'</span>'
      + '<svg class="pd-chevron" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5l3 3 3-3"/></svg></div>';
  }
  function _ensurePopover(){
    var pop=document.getElementById('gen-params-popover');
    if(!pop){ pop=document.createElement('div'); pop.id='gen-params-popover'; pop.className='params-popover'; pop.hidden=true; document.body.appendChild(pop); }
    return pop;
  }
  function toggleGenParams(e, el){
    e.stopPropagation();
    var pop=_ensurePopover();
    if(!pop.hidden && pop._lastEl===el){ pop.hidden=true; return; }
    var r=el.getBoundingClientRect();
    pop.innerHTML=_popoverBody();
    pop.hidden=false; pop._lastEl=el;
    var popW=pop.offsetWidth||440;
    pop.style.left=Math.max(8, Math.min(r.left, window.innerWidth-popW-8))+'px';
    var popH=pop.offsetHeight||380;
    var below=window.innerHeight-r.bottom;
    if(below < popH+12 && r.top > below){ pop.style.top=(window.scrollY+r.top-popH-8)+'px'; }
    else { pop.style.top=(window.scrollY+r.bottom+8)+'px'; }
  }
  function _refreshAll(){
    var pop=document.getElementById('gen-params-popover');
    if(pop && !pop.hidden) pop.innerHTML=_popoverBody();
    document.querySelectorAll('.pd-provider-logo').forEach(function(el){ el.innerHTML=_providerDot(); });
    document.querySelectorAll('.pd-summary').forEach(function(s){ s.innerHTML=_summaryHTML(); });
  }
  function selectGenProvider(id){
    var p=GEN_PROVIDERS.filter(function(x){return x.id===id;})[0]; if(!p) return;
    GEN_CONFIG.provider=id; GEN_CONFIG.model=p.models[0];
    if(p.res.indexOf(GEN_CONFIG.res)<0) GEN_CONFIG.res=p.res[0];
    if(p.quality){ if(p.quality.indexOf(GEN_CONFIG.quality)<0) GEN_CONFIG.quality=p.quality[p.quality.length-1]; }
    else GEN_CONFIG.quality=null;
    _refreshAll();
  }
  function selectGenParam(key, val){
    GEN_CONFIG[key]=(key==='count')?parseInt(val,10):val;
    _refreshAll();
    updateGenScores();
  }
  document.addEventListener('click', function(e){
    if(!e.target.isConnected) return; // 元素被 popover 重建替换后脱离 DOM，忽略（防误关）
    if(!e.target.closest('.params-display') && !e.target.closest('#gen-params-popover')){
      var pop=document.getElementById('gen-params-popover'); if(pop) pop.hidden=true;
    }
  });
  window.toggleGenParams=toggleGenParams;
  window.selectGenProvider=selectGenProvider;
  window.selectGenParam=selectGenParam;
  window.buildParamsDisplay=buildParamsDisplay;
  function injectParamsDisplay(){
    var bpw=document.getElementById('batch-params-wrap');
    if(bpw && !bpw.dataset.inited){ bpw.dataset.inited='1'; bpw.innerHTML=buildParamsDisplay('batch'); }
    document.querySelectorAll('.btn-asset-card-img-model').forEach(function(b){
      if(b.dataset.paramReplaced) return;
      b.dataset.paramReplaced='1';
      var tmp=document.createElement('div'); tmp.innerHTML=buildParamsDisplay('card');
      var pd=tmp.firstChild;
      b.parentNode.replaceChild(pd, b);
    });
  }
  if (document.readyState !== 'loading') injectParamsDisplay();
  else document.addEventListener('DOMContentLoaded', injectParamsDisplay);

  // === 批量生成：范围下拉 + 资产多选弹窗（方案：单按钮 + 范围下拉）===
  var _genScope = 'first';
  var _genScopeLabels = { all: '全部（首图+参考图）', first: '仅首图', refs: '仅其他参考图' };
  function toggleGenScope(e, el){
    e.stopPropagation();
    var dd = el.parentNode.querySelector('.gen-scope-dropdown'); if(!dd) return;
    var will = dd.hidden;
    document.querySelectorAll('.gen-scope-dropdown:not([hidden])').forEach(function(d){ d.hidden = true; });
    dd.hidden = !will;
  }
  function selectGenScope(scope){
    _genScope = scope;
    document.querySelectorAll('.gen-scope-opt').forEach(function(o){ o.classList.toggle('on', o.dataset.scope === scope); });
    var lab = document.querySelector('.gen-scope-label'); if(lab) lab.textContent = scope==='all'?'全部':(scope==='first'?'仅首图':'仅参考图');
    var dd = document.querySelector('.gen-scope-dropdown'); if(dd) dd.hidden = true;
    var st = document.getElementById('bg-scope-text'); if(st) st.textContent = _genScopeLabels[scope];
    updateGenScores();
  }
  document.addEventListener('click', function(e){
    if(!e.target.closest('.gen-scope-select')){ document.querySelectorAll('.gen-scope-dropdown:not([hidden])').forEach(function(d){ d.hidden = true; }); }
  });
  function _assetGroupsForBatch(){
    return [['characters','角色'],['scenes','场景'],['props','道具']].map(function(k){
      var items = Array.from(document.querySelectorAll('.asset-group[data-kind="'+k[0]+'"]')).map(function(g){
        var name = (g.querySelector('.char-group-name-trans strong') || {}).textContent || g.getAttribute('data-base-id');
        return { id: g.getAttribute('data-base-id'), name: name };
      });
      return { kind: k[0], label: k[1], items: items };
    });
  }
  // 批量生成弹窗：范围 radio + 依赖说明 + 生图参数内联（要点1）
  var _bgScopeHints = {
    first: '首图 = 资产的主要形象（角色主造型 / 场景主状态），是生成其他参考图的基础。',
    refs: '其他参考图 = 同一资产的不同服装 / 状态，需以首图为参考生成，因此必须先生成首图。',
    all: '按顺序生成：先首图，再以其为参考生成其他参考图（服装 / 状态）。'
  };
  function _syncBgScopeRadio(){
    var radios = document.getElementsByName('bg-scope');
    for (var i = 0; i < radios.length; i++) { if (radios[i].value === _genScope) radios[i].checked = true; }
    var hint = document.getElementById('bg-scope-hint');
    if (hint) hint.textContent = _bgScopeHints[_genScope] || '';
  }
  var _bgAssetCount = 0;
  function _updateBgScore(n){
    if (typeof n === 'number') _bgAssetCount = n;
    var score = _genScopeUnitPrice(_genScope, GEN_CONFIG.res) * GEN_CONFIG.count * (_bgAssetCount || 0);
    var el = document.getElementById('bg-score');
    if (el) el.innerHTML = _beanScore(score);
  }
  function selectBgScope(scope){
    _genScope = scope;
    _syncBgScopeRadio();
    _updateBgScore();
    updateGenScores();
  }
  // 批量生成两步：① 首次点击进入多选模式（卡片勾选 + 全选）② 多选模式下且已勾选 → 弹批量弹窗
  function enterOrConfirmBatchGen(){
    var va = document.getElementById('v-a');
    var inMsMode = va && va.classList.contains('ms-mode');
    if (!inMsMode) {
      // 第一步：进入多选模式
      if (typeof toggleMsMode === 'function') toggleMsMode();
      if (typeof toast === 'function') toast('已进入多选模式：勾选要生成的资产，再次点击「批量生成」执行');
      return;
    }
    // 第二步：检查勾选数量
    var n = document.querySelectorAll('.ms-check:checked').length;
    if (n === 0) {
      if (typeof toast === 'function') toast('请先勾选要生成的资产（或点全选）', true);
      return;
    }
    openBatchGenModal();
  }
  function openBatchGenModal(){
    var modal = document.getElementById('batch-gen-modal'); if(!modal) return;
    // 多选模式下按勾选数量显示，否则全部
    var selN = document.querySelectorAll('.ms-check:checked').length;
    var inMsMode = document.getElementById('v-a') && document.getElementById('v-a').classList.contains('ms-mode');
    var n = (inMsMode && selN > 0) ? selN : (window.TOTAL_ASSETS || window.REVIEW_BATCH_TOTAL || document.querySelectorAll('.asset-group').length || 0);
    var pw = document.getElementById('bg-params-wrap');
    if (pw && !pw.dataset.inited) { pw.dataset.inited = '1'; pw.innerHTML = buildParamsDisplay('batch'); }
    _syncBgScopeRadio();
    document.getElementById('bg-selected-count').textContent = (inMsMode && selN > 0) ? ('已选 ' + n + ' 个资产') : ('全部 ' + n + ' 个资产');
    _updateBgScore(n);
    modal.classList.add('on'); modal.setAttribute('aria-hidden', 'false');
  }
  function closeBatchGenModal(){
    var modal = document.getElementById('batch-gen-modal'); if(!modal) return;
    modal.classList.remove('on'); modal.setAttribute('aria-hidden', 'true');
  }
  function confirmBatchGen(){
    closeBatchGenModal();
    if(_genScope==='all' || _genScope==='first'){ if(typeof runReviewBatchGenerate==='function') runReviewBatchGenerate(); }
    if(_genScope==='all' || _genScope==='refs'){ if(typeof runGenerateRemaining==='function') runGenerateRemaining(); }
  }
  // === 多选模式（卡片勾选 + 全选）===
  function _ensureMsToolbar(){
    var tb = document.getElementById('ms-toolbar'); if(tb) return tb;
    tb = document.createElement('div'); tb.id = 'ms-toolbar'; tb.className = 'ms-toolbar';
    tb.innerHTML = '<label class="ms-switch"><input type="checkbox" id="ms-all"><span class="ms-switch-track"></span></label><span style="color:var(--t1);font-weight:500;margin-left:2px">全选资产</span><span id="ms-count">已选 0 个</span><button type="button" class="ms-exit-btn">退出多选</button>';
    var btns = document.querySelector('.v-a-tabs') || document.querySelector('.batch-btns');
    if(btns && btns.parentNode) btns.parentNode.insertBefore(tb, btns.nextSibling);
    // 事件绑定（避免内联 onclick 作用域问题）
    var allCb = tb.querySelector('#ms-all'); if(allCb) allCb.addEventListener('change', function(){ toggleMsAll(this); });
    var exitBtn = tb.querySelector('.ms-exit-btn'); if(exitBtn) exitBtn.addEventListener('click', function(e){ e.stopPropagation(); exitMsMode(); });
    return tb;
  }
  function _injectMsChecks(){
    document.querySelectorAll('.asset-group').forEach(function(g){
      if(g.querySelector('.ms-check-wrap')) return;
      var header = g.querySelector('.char-group-header'); if(!header) return;
      var kind = g.getAttribute('data-kind'), id = g.getAttribute('data-base-id');
      var wrap = document.createElement('label');
      wrap.className = 'ms-check-wrap';
      wrap.innerHTML = '<input type="checkbox" class="ms-check" data-kind="'+kind+'" data-id="'+id+'" onchange="onMsCheck(this)">';
      header.insertBefore(wrap, header.firstChild);
    });
  }
  function toggleMsMode(btn){
    var va = document.getElementById('v-a'); if(!va) return;
    var on = va.classList.toggle('ms-mode');
    if(on){ document.querySelectorAll('.char-group.open').forEach(function(g){ g.classList.remove('open'); }); }
    _injectMsChecks();
    _ensureMsToolbar();
    _updateMsCount();
    var tog = btn || document.getElementById('btn-asset-multiselect');
    if(tog){ tog.classList.toggle('on', on); var t = tog.querySelector('.btn-text'); if(t) t.textContent = on ? '退出多选' : '多选'; }
  }
  function onMsCheck(el){
    var g = el.closest('.asset-group'); if(g) g.classList.toggle('ms-selected', el.checked);
    _updateMsCount();
  }
  function toggleMsAll(el){
    document.querySelectorAll('.ms-check').forEach(function(c){ c.checked = el.checked; var g = c.closest('.asset-group'); if(g) g.classList.toggle('ms-selected', el.checked); });
    _updateMsCount();
  }
  // 退出多选模式：清空勾选 + 移除 ms-mode
  function exitMsMode(){
    document.querySelectorAll('.ms-check').forEach(function(c){ c.checked = false; var g = c.closest('.asset-group'); if(g) g.classList.remove('ms-selected'); });
    var all = document.getElementById('ms-all'); if(all) all.checked = false;
    var va = document.getElementById('v-a'); if(va) va.classList.remove('ms-mode');
    _updateMsCount();
  }
  function _updateMsCount(){
    var n = document.querySelectorAll('.ms-check:checked').length;
    var total = document.querySelectorAll('.ms-check').length;
    var c = document.getElementById('ms-count'); if(c) c.textContent = '已选 ' + n + ' / ' + total + ' 个';
    var all = document.getElementById('ms-all'); if(all) all.checked = total > 0 && n === total;
    _updateMsBtnState();
  }
  function _updateMsBtnState(){
    // 无独立多选按钮：批量生成按钮始终可用（点击后由 openBatchGenModal 引导勾选）
  }
  window.toggleGenScope = toggleGenScope;
  window.selectGenScope = selectGenScope;
  window.selectBgScope = selectBgScope;
  window.openBatchGenModal = openBatchGenModal;
  window.enterOrConfirmBatchGen = enterOrConfirmBatchGen;
  window.closeBatchGenModal = closeBatchGenModal;
  window.confirmBatchGen = confirmBatchGen;
  window.toggleMsMode = toggleMsMode;
  window.exitMsMode = exitMsMode;
  window.onMsCheck = onMsCheck;
  window.toggleMsAll = toggleMsAll;
  // ESC 关闭注册
  if (window.MODAL_CLOSE_FNS) window.MODAL_CLOSE_FNS['batch-gen-modal'] = 'closeBatchGenModal';

  // === 剧集改编：进度看板 + 剧情概述加载 ===
  function _renderAdaptProgressBoard() {
    var box = document.getElementById('adapt-progress-dots');
    if (!box) return;
    var html = '';
    for (var i = 1; i <= 10; i++) {
      var done = true; // demo 全已改编
      html += '<span class="adapt-progress-dot' + (done ? ' adapt-progress-dot--done' : '') + '" data-ep="' + i + '" title="E' + (i < 10 ? '0' : '') + i + (done ? ' · 已改编' : ' · 未改编') + '" onclick="var d=document.querySelector(\'.ast-sb-ep[data-ep=\"' + i + '\"]\'); if(d){d.scrollIntoView({block:\'center\'});d.open=true;}">' + (i < 10 ? '0' : '') + i + '</span>';
    }
    box.innerHTML = html;
  }

  var _adaptStoryData = null;
  function _loadAdaptStoryData() {
    var body = document.getElementById('adapt-story-body');
    if (!body) return;
    if (_adaptStoryData) { _renderAdaptStory(); return; }
    // 优先用内联数据（file:// 安全）
    if (typeof ADAPT_STORY_DATA !== 'undefined') {
      _adaptStoryData = ADAPT_STORY_DATA;
      _renderAdaptStory();
      _injectEpSummaries(_adaptStoryData);
      return;
    }
    // fallback: fetch
    var paths = ['../projects/test-v2/merged_ep1-65.json', '../../projects/test-v2/merged_ep1-65.json'];
    function tryFetch(idx) {
      if (idx >= paths.length) {
        body.innerHTML = '<div style="color:var(--t3);font-size:13px">剧情数据加载失败</div>';
        return;
      }
      fetch(paths[idx]).then(function(r) { if(!r.ok) throw 0; return r.json(); })
        .then(function(data) { _adaptStoryData = data; _renderAdaptStory(); _injectEpSummaries(data); })
        .catch(function() { tryFetch(idx+1); });
    }
    tryFetch(0);
  }

  function _renderAdaptStory() {
    var body = document.getElementById('adapt-story-body');
    if (!body || !_adaptStoryData) return;
    var d = _adaptStoryData;
    var fps = d.full_plot_synopsis || {};
    var html = '';
    // 剧情梗概
    if (fps.background || fps.character_relationships) {
      html += '<div style="margin-bottom:16px">';
      html += '<div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:8px">剧情梗概</div>';
      var subs = [
        ['故事背景', fps.background],
        ['人物关系', fps.character_relationships],
        ['核心冲突', fps.main_conflict],
        ['情感主线', fps.emotional_arc],
        ['家族动态', fps.family_dynamics]
      ];
      subs.forEach(function(s) {
        if (s[1]) html += '<div style="margin-bottom:6px"><span style="font-size:11px;font-weight:600;color:var(--t3);margin-right:6px">' + s[0] + '</span><span style="font-size:13px;color:var(--t2);line-height:1.6">' + s[1] + '</span></div>';
      });
      html += '</div>';
    }
    // 完整故事概要
    if (d.story_synopsis) {
      html += '<div>';
      html += '<div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:8px">完整故事概要</div>';
      html += '<div style="font-size:13px;color:var(--t2);line-height:1.7">' + d.story_synopsis + '</div>';
      html += '</div>';
    }
    body.innerHTML = html || '<div style="color:var(--t3);font-size:13px">暂无剧情数据</div>';
  }

  // 分镜 @ 引用分类：人物 / 场景 / 道具（启发式，不依赖 scene name 与 @引用完全一致）
  var _SCENE_KW = /(楼梯|楼梯间|房间|酒店|客厅|庭院|卧室|大堂|休息室|vip|别墅|老宅|酒吧|餐厅|走廊|电梯|门口|石桥|主桌|寿宴|前台|马路|车内|办公室|公司|街道|床|沙发|桌子)/;
  var _LIGHT_KW = /(夜|日|暖光|冷光|暖黄|昏暗|蓝|黄|光|氛围|亮|暗|色调|浅|深)/;
  function _classifyRef(refName, charNames) {
    var main = refName.split('_')[0];
    for (var i = 0; i < charNames.length; i++) { if (refName.indexOf(charNames[i]) >= 0 || main === charNames[i]) return 'char'; }
    if (_SCENE_KW.test(main)) return 'scene';
    if (refName.indexOf('_') >= 0 && _LIGHT_KW.test(refName.split('_').slice(1).join(''))) return 'scene';
    // 含 "_" 通常是「人名_服装」格式（已排除场景_光线）→ 人物；纯名称无下划线 → 道具
    if (refName.indexOf('_') >= 0) return 'char';
    return 'prop';
  }
  // 场景/道具显示名：英文取前两段（hotel_stairwell_night → "hotel stairwell"，Beer_Can → "Beer Can"），中文取第一段
  function _refDisplayFull(refName) {
    var parts = refName.split('_');
    if (parts.length >= 2 && /^[A-Za-z]/.test(refName)) return parts.slice(0, 2).join(' ');
    return parts[0];
  }
  // 人物显示名：单名为主（Sophia / Dylan），称谓（Mrs/Mr…）+ 姓氏（Mrs Sterling）；中文取第一段
  function _refDisplayChar(refName) {
    var parts = refName.split('_');
    if (parts.length >= 2 && /^(Mrs|Mr|Ms|Dr|Prof|Miss|Lord|Lady)$/i.test(parts[0])) return parts[0] + ' ' + parts[1];
    return parts[0];
  }
  function _uniq(a) { var out = [], m = {}; a.forEach(function(x) { if (!m[x]) { m[x] = 1; out.push(x); } }); return out; }

  function _injectEpSummaries(data) {
    var eps = data.episodes || [];
    document.querySelectorAll('.ast-sb-ep').forEach(function(detail) {
      if (detail.dataset.epSummary) return;
      var ep = parseInt(detail.getAttribute('data-ep'), 10);
      var epData = eps[ep - 1];
      if (!epData) return;
      detail.dataset.epSummary = '1';
      var segList = detail.querySelector('.ast-sb-seg-list');
      if (!segList) return;
      var plotText = epData.detailed_plot || epData.summary || '';
      var charNames = (epData.characters || []).map(function(c){ return c.name || (typeof c === 'string' ? c : ''); }).filter(Boolean);
      var sceneNames = (epData.scenes || []).map(function(s){ return s.name || (typeof s === 'string' ? s : ''); }).filter(Boolean);

      // 分类收集（原始自分类；改编按位置对应原始引用的类别，避免英文启发式误判）
      function classifyRefs(refsArr, refOriArr) {
        var sc = [], ch = [], pr = [];
        refsArr.forEach(function(r, i) {
          var cls = (refOriArr && i < refOriArr.length) ? _classifyRef(refOriArr[i], charNames) : _classifyRef(r, charNames);
          if (cls === 'char') ch.push(_refDisplayChar(r));
          else if (cls === 'scene') sc.push(_refDisplayFull(r));
          else pr.push(_refDisplayFull(r));
        });
        return { scene: _uniq(sc), char: _uniq(ch), prop: _uniq(pr) };
      }
      function buildSegRows(c) {
        var rows = '';
        if (c.scene.length) rows += '<span class="ast-sb-seg-meta-row"><span class="ast-sb-seg-meta-label">场景</span><span class="ast-sb-seg-meta-val">' + c.scene.join('、') + '</span></span>';
        if (c.char.length) rows += '<span class="ast-sb-seg-meta-row"><span class="ast-sb-seg-meta-label">人物</span><span class="ast-sb-seg-meta-val">' + c.char.join('、') + '</span></span>';
        if (c.prop.length) rows += '<span class="ast-sb-seg-meta-row"><span class="ast-sb-seg-meta-label">道具</span><span class="ast-sb-seg-meta-val">' + c.prop.join('、') + '</span></span>';
        return rows;
      }
      function collectInto(c, bag) { c.scene.forEach(function(x){bag.scene.push(x);}); c.char.forEach(function(x){bag.char.push(x);}); c.prop.forEach(function(x){bag.prop.push(x);}); }

      // 分镜级：每个分镜在提示词上方注入「场景/人物/道具」左右两栏（原始 | 改编），并汇总全集
      var allOri = { scene: [], char: [], prop: [] };
      var allTrans = { scene: [], char: [], prop: [] };
      detail.querySelectorAll('.ast-sb-seg').forEach(function(seg) {
        if (seg.dataset.segMeta) return;
        var firstCol = seg.querySelector('.ast-sb-seg-cols > div:first-child .ast-sb-col-t');
        var lastCol = seg.querySelector('.ast-sb-seg-cols > div:last-child .ast-sb-col-t');
        var oriText = firstCol ? (firstCol.textContent || '') : '';
        var transText = lastCol ? (lastCol.textContent || '') : '';
        var refs = [], m, re = /@\[([^\]]+)\]/g;
        while ((m = re.exec(oriText)) !== null) refs.push(m[1]);
        var refsT = [], mt, reT = /@\[([^\]]+)\]/g;
        while ((mt = reT.exec(transText)) !== null) refsT.push(mt[1]);
        var refsOU = _uniq(refs), refsTU = _uniq(refsT);
        var oriCls = classifyRefs(refsOU, null);
        var transCls = classifyRefs(refsTU, refsOU);   // 改编按位置对应原始引用的类别
        collectInto(oriCls, allOri);
        collectInto(transCls, allTrans);
        seg.dataset.segMeta = '1';
        var oriRows = buildSegRows(oriCls);
        var transRows = buildSegRows(transCls);
        if (!oriRows && !transRows) return;
        var segMeta = document.createElement('div');
        segMeta.className = 'ast-sb-seg-meta';
        segMeta.innerHTML =
          '<div class="ast-sb-seg-meta-col"><div class="ast-sb-ep-summary-label">原始（转化前）</div><div class="ast-sb-seg-meta-rows">' + (oriRows || '<span class="ast-sb-seg-meta-empty">—</span>') + '</div></div>' +
          '<div class="ast-sb-seg-meta-col"><div class="ast-sb-ep-summary-label">改编（转化后）</div><div class="ast-sb-seg-meta-rows">' + (transRows || '<span class="ast-sb-seg-meta-empty">—</span>') + '</div></div>';
        var cols = seg.querySelector('.ast-sb-seg-cols');
        if (cols) seg.insertBefore(segMeta, cols);
      });

      // 剧情描述（左右对照：原始 | 改编占位）
      var summaryDiv = document.createElement('div');
      summaryDiv.className = 'ast-sb-ep-summary';
      summaryDiv.innerHTML =
        '<div class="ast-sb-ep-summary-cols">' +
          '<div class="ast-sb-ep-summary-col">' +
            '<div class="ast-sb-ep-summary-label">原始（转化前）</div>' +
            '<div class="ast-sb-ep-summary-text">' + plotText + '</div>' +
          '</div>' +
          '<div class="ast-sb-ep-summary-col">' +
            '<div class="ast-sb-ep-summary-label">改编（转化后）</div>' +
            '<div class="ast-sb-ep-summary-placeholder">改编后显示</div>' +
          '</div>' +
        '</div>';

      // 出场人物 / 场景 / 道具（左右对照：原始 | 改编）
      var epOri = { char: charNames, scene: sceneNames, prop: _uniq(allOri.prop) };
      var epTrans = { scene: _uniq(allTrans.scene), char: _uniq(allTrans.char), prop: _uniq(allTrans.prop) };
      function buildEpRows(c) {
        var rows = '';
        if (c.char.length) rows += '<div class="ast-sb-ep-meta-row"><span class="ast-sb-ep-meta-label">出场人物</span><span class="ast-sb-ep-meta-val">' + c.char.join('、') + '</span></div>';
        if (c.scene.length) rows += '<div class="ast-sb-ep-meta-row"><span class="ast-sb-ep-meta-label">场景</span><span class="ast-sb-ep-meta-val">' + c.scene.join('、') + '</span></div>';
        if (c.prop.length) rows += '<div class="ast-sb-ep-meta-row"><span class="ast-sb-ep-meta-label">道具</span><span class="ast-sb-ep-meta-val">' + c.prop.join('、') + '</span></div>';
        return rows;
      }
      var leftRows = buildEpRows(epOri);
      var rightRows = buildEpRows(epTrans);
      var metaDiv = document.createElement('div');
      metaDiv.className = 'ast-sb-ep-meta';
      metaDiv.innerHTML =
        '<div class="ast-sb-ep-meta-col">' +
          '<div class="ast-sb-ep-summary-label">原始（转化前）</div>' +
          '<div class="ast-sb-ep-meta-rows">' + (leftRows || '<span class="ast-sb-ep-summary-placeholder">—</span>') + '</div>' +
        '</div>' +
        '<div class="ast-sb-ep-meta-col">' +
          '<div class="ast-sb-ep-summary-label">改编（转化后）</div>' +
          '<div class="ast-sb-ep-meta-rows">' + (rightRows || '<span class="ast-sb-ep-summary-placeholder">—</span>') + '</div>' +
        '</div>';

      segList.parentNode.insertBefore(summaryDiv, segList);
      summaryDiv.parentNode.insertBefore(metaDiv, segList);
    });
  }

  // 开始创作按钮注入到每个集卡片 summary 行（重新改编按钮右侧）
  function _injectEpStartBtns() {
    document.querySelectorAll('.ast-sb-ep').forEach(function(detail) {
      if (detail.dataset.epStartInjected) return;
      var head = detail.querySelector('.ast-sb-ep-head');
      if (!head) { detail.dataset.epStartInjected = '1'; return; }
      var adaptBtn = head.querySelector('.ast-sb-ep-adapt-btn');
      var ep = detail.getAttribute('data-ep');
      var actions = document.createElement('span');
      actions.className = 'ast-sb-ep-head-actions';
      if (adaptBtn) {
        head.insertBefore(actions, adaptBtn);
        actions.appendChild(adaptBtn);
      } else {
        head.appendChild(actions);
      }
      var startBtn = document.createElement('button');
      startBtn.type = 'button';
      startBtn.className = 'ast-sb-ep-start-btn';
      startBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>开始创作';
      startBtn.setAttribute('onclick', "event.stopPropagation();if(typeof startCreateEp==='function')startCreateEp(" + ep + ");");
      actions.appendChild(startBtn);
      detail.dataset.epStartInjected = '1';
    });
  }

  // 开始创作：跳转视频生成页 → 直达生产工作室 + 指定集
  function startCreateEp(ep) {
    if (typeof sw === 'function') sw('g');
    try {
      var url = new URL(window.location);
      url.searchParams.set('view', 'video');
      url.searchParams.set('sb_ep', String(ep));
      url.searchParams.set('sb_shot', '1');
      history.replaceState({}, '', url);
    } catch (_) {}
    toggleVGView('studio', ep);
  }
  window.startCreateEp = startCreateEp;

  // === 视频生成页两态：剧集看板（态A）↔ 生产工作室（态B）===
  function _vgBoardData() {
    var eps = [];
    var seen = {};   // 按 ep 去重（#v-g 内 .sb-col-ep 与 .vg-episode-board 各有一份 .sb-ep-item，避免 1-65 重复）
    document.querySelectorAll('#v-g .sb-ep-item').forEach(function(a) {
      var ep = parseInt(a.getAttribute('data-ep'), 10);
      if (!ep || seen[ep]) return;
      seen[ep] = 1;
      var get = function(sel) { var el = a.querySelector(sel); return el ? (el.textContent || '').trim() : ''; };
      eps.push({ ep: ep, title: get('.sb-ep-title') || ('第' + ep + '集'), count: get('.sb-ep-count'), prog: get('.sb-ep-progress-text'), status: get('.sb-ep-status-badge') });
    });
    return eps;
  }
  // 看板卡片 HTML（onclickExpr: 'enterVGStudio'(态A) 或 'switchVGEpisode'(下拉)；withEnter 带进入按钮）
  // 复刻 .sb-ep-item 横向剧集条形式（同顶部 .sb-col-ep），非新卡片
  function _vgBoardCardsHTML(onclickExpr, withEnter, currentEp) {
    var eps = _vgBoardData();
    if (!eps.length) return '<div class="vg-board-empty">暂无剧集</div>';
    var html = '<div class="sb-ep-list vg-ep-board-list">';
    eps.forEach(function(e) {
      var pad = e.ep < 10 ? '0' + e.ep : '' + e.ep;
      var cnt = e.count || '';
      // 剧集状态（基于 _demoEpisodeShotStatus：已完成/进行中/未开始 + 真实进度数字）
      var statusCls = 'is-completed', statusText = '已完成', done = 0, total = 0, spinnerHTML = '';
      if (typeof _demoEpisodeShotStatus === 'function') {
        var details = document.querySelector('details.ast-sb-ep[data-ep="' + e.ep + '"]');
        var segN = details ? details.querySelectorAll('.ast-sb-seg').length : 0;
        var epSt = typeof _DEMO_EP_STATUS !== 'undefined' && _DEMO_EP_STATUS[e.ep];
        total = epSt ? epSt.total_shots : segN;
        if (segN || total) {
          var stMap = _demoEpisodeShotStatus(e.ep, total || segN);
          done = stMap.filter(function(s){return s==='completed'||s==='ready'||s==='ok';}).length;
          var hasGen = stMap.some(function(s){return s==='generating';});
          var allDone = total > 0 && done >= total;
          if (hasGen) { statusCls = 'is-running'; statusText = '进行中'; spinnerHTML = '<span class="sb-ep-running-spinner"></span>'; }
          else if (!allDone) { statusCls = 'is-pending'; statusText = '未开始'; }
        }
      }
      var prog = (total > 0) ? (done + '/' + total) : '';
      html += '<div class="sb-ep-item-row">' +
        '<button type="button" class="sb-ep-item' + (currentEp && e.ep === currentEp ? ' on' : '') + '" data-ep="' + e.ep + '" onclick="event.stopPropagation();' + onclickExpr + '(' + e.ep + ');return false;">' +
          '<span class="sb-ep-mainline"><span class="sb-ep-title">E' + pad + '</span>' + (cnt ? '<span class="sb-ep-count">' + cnt + '</span>' : '') + '</span>' +
          '<span class="sb-ep-subline">' + (prog ? '<span class="sb-ep-progress-text">' + prog + '</span>' : '') + spinnerHTML + '<span class="sb-ep-status-badge ' + statusCls + '">' + statusText + '</span></span>' +
        '</button>' +
      '</div>';
    });
    return html + '</div>';
  }
  function renderVGEpisodeBoard() {
    var board = document.getElementById('vg-episode-board');
    if (board) board.innerHTML = '<div class="vg-board-title">集数选择 <span class="vg-board-sub">点击进入剧集生产</span></div>' + _vgBoardCardsHTML('enterVGStudio', true);
  }
  function enterVGStudio(ep) { toggleVGView('studio', ep); }

  // studio 内切集（看板下拉点卡片）
  function switchVGEpisode(ep) {
    const vg=document.getElementById('v-g');if(vg)vg.dataset.studioEp=String(ep);
    if (typeof _demoSwitchEpisode === 'function') _demoSwitchEpisode(ep);
    toggleVGEpPicker(true);
    _updateVGEpPickerLabel(ep);
    _focusFirstShotWhenReady();
    setTimeout(_renderEpAssetPanel, 800);   // ep 切换后重建本集资产区（等分镜渲染完）
  }
  function _updateVGEpPickerLabel(ep) {
    var lab = document.querySelector('#vg-ep-picker .vg-ep-picker-label');
    if (lab && ep) lab.textContent = '集数 E' + (ep < 10 ? '0' + ep : ep);
  }
  // 看板下拉（左栏集数按钮）
  function toggleVGEpPicker(forceClose) {
    var modal = document.getElementById('vg-ep-picker-modal');
    var btn = document.getElementById('vg-ep-picker');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'vg-ep-picker-modal';
      modal.className = 'vg-ep-picker-modal';
      modal.innerHTML = '<div class="vg-ep-picker-modal-bg"></div><div class="vg-ep-picker-modal-card"><div class="vg-ep-picker-modal-title">集数选择<button type="button" class="vg-ep-picker-modal-close">✕</button></div><div class="vg-ep-picker-modal-body"></div></div>';
      document.body.appendChild(modal);
      modal.querySelector('.vg-ep-picker-modal-bg').onclick = function(){ toggleVGEpPicker(true); };
      modal.querySelector('.vg-ep-picker-modal-close').onclick = function(){ toggleVGEpPicker(true); };
    }
    var willClose = forceClose || modal.style.display === 'flex';
    if (willClose) {
      modal.style.display = 'none';
      if (btn) btn.classList.remove('on');
    } else {
      var curEp = 0;
      var activeSec = document.querySelector('#v-g .sb-shot-section.vg-active') || document.querySelector('#v-g .sb-shot-section');
      if (activeSec) curEp = parseInt(activeSec.getAttribute('data-ep'), 10) || 0;
      modal.querySelector('.vg-ep-picker-modal-body').innerHTML = _vgBoardCardsHTML('switchVGEpisode', false, curEp);
      // 集数选择菜单宽度 ≈ 态A集数看板宽度（与进入视频生成的看板同宽）
      var card = modal.querySelector('.vg-ep-picker-modal-card');
      var vgEl = document.getElementById('v-g');
      if (card && vgEl) card.style.width = Math.max(320, Math.min(vgEl.clientWidth - 24, window.innerWidth - 32)) + 'px';
      modal.style.display = 'flex';
      if (btn) btn.classList.add('on');
    }
  }
  // 单分镜聚焦：切换 active section + 左栏高亮 + 主区滚顶
  function switchShot(sid) {
    var vg = document.getElementById('v-g');
    if (!vg) return;
    var target;
    vg.querySelectorAll('.sb-shot-section').forEach(function(s) {
      if (s.id === 'sb-shot-' + sid) { s.classList.add('vg-active'); target = s; }
      else s.classList.remove('vg-active');
    });
    const rail=vg.querySelector('.sb-shot-list');
    const hadFocus=rail?.contains(document.activeElement);
    vg.querySelectorAll('.sb-shot-item').forEach(function(it) {
      const selected=String(it.dataset.sid)===String(sid);
      it.classList.toggle('on',selected);
      if(!it.closest('.sb-shot-list'))return;
      it.tabIndex=selected?0:-1;
      if(selected)it.setAttribute('aria-current','true');else it.removeAttribute('aria-current');
      if(selected&&hadFocus){
        it.focus({preventScroll:true});
        const item=it.getBoundingClientRect(),box=rail.getBoundingClientRect();
        if(rail.scrollWidth>rail.clientWidth)rail.scrollLeft+=item.left<box.left?item.left-box.left:Math.max(0,item.right-box.right);
        if(rail.scrollHeight>rail.clientHeight)rail.scrollTop+=item.top<box.top?item.top-box.top:Math.max(0,item.bottom-box.bottom);
      }
    });
    // 切换动效（淡入 + 轻微上滑）
    if (target) {
      target.classList.remove('vg-shot-enter');
      void target.offsetWidth;   // 重置动画
      target.classList.add('vg-shot-enter');
    }
  }
  // 镜头切换（上下翻页，非滚动浏览）：当前 sid ± delta → switchShot，边界不循环
  function _vgSwitchByDelta(delta) {
    var vg = document.getElementById('v-g');
    if (!vg) return;
    var cur = vg.querySelector('.sb-shot-section.vg-active');
    if (!cur) return;
    var curSid = parseInt((cur.id || '').replace('sb-shot-', ''), 10) || 1;
    var sids = Array.prototype.map.call(vg.querySelectorAll('.sb-shot-item'), function(it) {
      return parseInt(it.getAttribute('data-sid'), 10) || 0;
    }).filter(function(n) { return n > 0; }).sort(function(a, b) { return a - b; });
    if (!sids.length) return;
    var idx = sids.indexOf(curSid);
    if (idx < 0) idx = 0;
    var newIdx = Math.max(0, Math.min(sids.length - 1, idx + delta));
    if (newIdx === idx) return;   // 边界停留
    switchShot(sids[newIdx]);
  }
  var _vgWheelArmed = false;   // 本次手势内已触发过切换
  var _vgWheelQuietT = 0;
  function _vgOnWheel(e) {
    var vg = document.getElementById('v-g');
    if (!vg || !vg.classList.contains('vg-studio-on') || matchMedia('(max-width:760px)').matches) return;
    var main = vg.querySelector('.sb-col-main');
    if (!main || !main.contains(e.target)) return;
    // 文本框/弹窗内：让其自身滚动，不翻页
    if (e.target.closest('textarea, input, .sb-prompt-ta, .params-popover, .vg-ep-picker-modal, .adapt-req-panel, .dialog-backdrop')) return;
    e.preventDefault();
    // 一次手势只翻一页：持续滚轮事件期间 armed 锁定，静默 220ms 后才解锁下一次
    clearTimeout(_vgWheelQuietT);
    _vgWheelQuietT = setTimeout(function () { _vgWheelArmed = false; }, 220);
    if (_vgWheelArmed) return;
    _vgWheelArmed = true;
    _vgSwitchByDelta(e.deltaY > 0 ? 1 : -1);
  }
  function _vgOnKey(e) {
    var vg = document.getElementById('v-g');
    if (!vg || !vg.classList.contains('on') || !vg.classList.contains('vg-studio-on')) return;
    if (document.querySelector('dialog[open], .dialog-backdrop.on') || e.target.closest('textarea,input,select,[contenteditable="true"],[role="dialog"]')) return;   // 输入框不拦截
    var delta = 0;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') delta = 1;
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') delta = -1;
    if (delta) { e.preventDefault(); _vgSwitchByDelta(delta); }
  }
  // section 内部重组：三列 → 两列（编辑 + 视频），参考素材移入编辑区下方
  // === 本集资产区：该集 sb-ref-cell 汇总，对照资产库分类，横向 scroll ===
  function _classifyBySrc(src){
    if(!src) return 'prop';
    var file = src.split('/').pop();
    var groups = document.querySelectorAll('#v-a .asset-group');
    for(var i=0;i<groups.length;i++){
      var g = groups[i];
      var imgs = g.querySelectorAll('img');
      for(var j=0;j<imgs.length;j++){
        var gSrc = (imgs[j].getAttribute('src')||'').split('/').pop();
        if(gSrc && gSrc === file) return g.getAttribute('data-kind') || 'prop';
      }
    }
    return 'prop';
  }
  // === 方案Y：独立集级资产池（脱离 sb-ref-cell，避免提示词驱动重算与单 section 写入错配）===
  window._epAssetPool = {};   // { ep(String): [{name, src, kind}, ...] }
  window._epAssetPickerCtx = null;   // 本集资产选择上下文 {ep, mode:'add'|'replace', oldSrc?, oldName?}
  function _currentVGEp(){
    var sec = document.querySelector('#v-g .sb-shot-section.vg-active') || document.querySelector('#v-g .sb-shot-section');
    var ep = sec ? (sec.getAttribute('data-ep') || '') : '';
    if(!ep && typeof PAGE_DATA !== 'undefined') ep = PAGE_DATA.sbEp || '';
    return String(ep || '1');
  }
  // 首次进入某集：从该集 sb-ref-cell 汇总 seed 一次（之后池独立，手动增删改都改池）
  function _seedEpAssets(ep){
    ep = String(ep);
    if(window._epAssetPool[ep]) return window._epAssetPool[ep];
    var assets = []; var seen = {};
    document.querySelectorAll('#v-g .sb-shot-section .sb-ref-cell').forEach(function(cell){
      var secEp = cell.closest('.sb-shot-section');
      var se = secEp ? String(secEp.getAttribute('data-ep')||'') : '';
      if(se && se !== ep) return;   // demo 同时只渲染一集，按 section data-ep 过滤
      var img = cell.querySelector('img,video');
      var nameEl = cell.querySelector('.sb-ref-cap-name');
      var cap = cell.querySelector('.sb-ref-cap');
      var src = img ? (img.getAttribute('src')||'') : '';
      var name = nameEl ? nameEl.textContent.trim() : (img ? (img.getAttribute('alt')||'').trim() : '');
      if(!src && !name) return;
      var key = src || name;
      if(seen[key]) return; seen[key] = 1;
      var refPath = cap ? (cap.getAttribute('data-ref-path')||'') : '';   // 供资产库弹窗"已添加"badge 比对
      assets.push({ name: name || '未命名', src: src, kind: _classifyBySrc(src), refPath: refPath });
    });
    window._epAssetPool[ep] = assets;
    return assets;
  }
  function _getEpAssets(ep){ ep = String(ep||'1'); if(!window._epAssetPool[ep]) _seedEpAssets(ep); return window._epAssetPool[ep]; }
  // 资产库选择器确认 → 写池（add/replace）。由 project.js 的 _onPickerConfirm 开头 hook 调用，返回 true 表示已处理（阻止原 shot-level 逻辑）
  window._handleEpAssetPickerConfirm = function(){
    var ctx = window._epAssetPickerCtx;
    if(!ctx) return false;
    var items = Object.values(window._shotPickerSelected || {});
    if(!items.length){ window._epAssetPickerCtx = null; return true; }
    var assets = _getEpAssets(ctx.ep);
    if(ctx.mode === 'add'){
      var added = 0;
      items.forEach(function(it){
        var src = it.imgSrc || '';
        var name = it.displayName || it.idTrans || it.nameTrans || it.nameOri || '未命名';
        var kind = it.kind || _classifyBySrc(src);
        var exist = assets.some(function(a){ return (src && a.src === src) || a.name === name; });
        if(!exist){ assets.push({ name: name, src: src, kind: kind, refPath: it.refPath || '' }); added++; }
      });
      if(typeof toast === 'function') toast(added > 0 ? ('已添加 '+added+' 项到本集资产') : '所选资产均已在池中');
    } else if(ctx.mode === 'replace'){
      var ni = items[0];
      var idx = -1;
      for(var i=0;i<assets.length;i++){ if(assets[i].src === ctx.oldSrc || (!ctx.oldSrc && ctx.oldName && assets[i].name === ctx.oldName)){ idx=i; break; } }
      if(idx >= 0){
        var oldName = assets[idx].name;
        var newName = ni.displayName || ni.idTrans || ni.nameTrans || oldName;
        assets[idx] = { name: newName, src: ni.imgSrc || assets[idx].src, kind: ni.kind || assets[idx].kind };
        if(oldName && newName && oldName !== newName && typeof _replacePromptRefsAll === 'function') _replacePromptRefsAll(oldName, newName);   // 同步本集提示词 @[旧名]→@[新名]
        if(typeof toast === 'function') toast('已替换为「'+newName+'」');
      } else if(typeof toast === 'function') toast('未找到原资产，替换失败', true);
    }
    window._epAssetPickerCtx = null;
    if(typeof closeShotAssetLibraryPicker === 'function') closeShotAssetLibraryPicker();
    if(typeof _renderEpAssetPanel === 'function') _renderEpAssetPanel();
    return true;
  };
  window._getEpAssets = _getEpAssets;       // 供 asset-mention-picker.js 的 @引用选单读取
  window._currentVGEp = _currentVGEp;
  function _buildEpAssetPanel(){
    var chars = [], scenes = [], props = [];
    var assets = _getEpAssets(_currentVGEp());   // 方案Y：读独立集级资产池（非 sb-ref-cell）
    var seen = {};
    assets.forEach(function(item){
      var key = item.src || item.name;
      if(seen[key]) return; seen[key] = 1;
      var it = { name: item.name || '未命名', src: item.src || '' };
      var kind = item.kind || _classifyBySrc(it.src);   // 对照资产库 data-kind（非启发式全角色）
      if(kind === 'characters') chars.push(it);
      else if(kind === 'scenes') scenes.push(it);
      else props.push(it);
    });
    function card(it){
      var safe = String(it.name).replace(/"/g,'').replace(/</g,'&lt;');
      var thumb = it.src ? '<img src="'+it.src+'" alt="'+safe+'" loading="lazy" referrerpolicy="no-referrer"/>' : safe.charAt(0);
      return '<div class="vg-ep-asset-card" data-src="'+(it.src||'')+'" data-name="'+safe+'" title="点击查看原图：'+safe+'" style="cursor:pointer"><div class="vg-ep-asset-thumb'+(it.src?' has-img':'')+'">'+thumb+'<button type="button" class="vg-ep-asset-replace" title="替换" onclick="event.stopPropagation();_replaceEpAsset(this,\''+safe.replace(/'/g,"\\'")+'\')">⟳</button><button type="button" class="vg-ep-asset-remove" title="删除" onclick="event.stopPropagation();_removeEpAsset(this,\''+(it.src||'').replace(/'/g,"\\'")+'\')">✕</button></div><div class="vg-ep-asset-name">'+safe+'</div></div>';
    }
    function seg(label, items){
      if(!items.length) return '';
      return '<div class="vg-ep-asset-seg"><div class="vg-ep-asset-seg-label">'+label+'</div><div class="vg-ep-asset-cards">'+items.map(card).join('')+'</div></div>';
    }
    var body = seg('角色',chars)+seg('场景',scenes)+seg('道具',props);
    if(!body) body = '<span class="vg-ep-asset-empty">暂无本集资产</span>';
    return '<div class="vg-ep-assets"><div class="vg-ep-assets-vtitle">本集素材</div><div class="vg-ep-assets-scroll">'+body+'</div><button type="button" class="vg-ep-asset-add-btn" onclick="event.stopPropagation();if(typeof _openEpAssetAdd===\'function\')_openEpAssetAdd(event)" title="添加参考素材到本集">＋添加</button></div>';
  }
  // 本集素材「添加参考素材」选单：上传 / 从资产库选取（添加到当前集，重建汇总）
  function _openEpAssetAdd(e){
    e.stopPropagation();
    var sec = document.querySelector('#v-g .sb-shot-section.vg-active');
    var ep = _currentVGEp();
    var sid = sec ? (sec.id||'sb-shot-1').replace('sb-shot-','') : '1';
    var pop = document.getElementById('vg-ep-asset-add-menu');
    if(!pop){ pop = document.createElement('div'); pop.id='vg-ep-asset-add-menu'; pop.className='vg-save-menu'; document.body.appendChild(pop); }
    if(pop.dataset.open==='1'){ _closeEpAssetAddMenu(); return; }
    pop.innerHTML =
      '<label class="vg-save-opt" style="cursor:pointer;display:flex;flex-direction:column;align-items:flex-start"><input type="file" accept="image/*" hidden onchange="_doAddEpAssetUpload(this,\''+ep+'\',\''+sid+'\')"><span class="vg-save-opt-label">上传本地图片</span><span class="vg-save-opt-desc">添加到本集资产池</span></label>' +
      '<button type="button" class="vg-save-opt" onclick="_closeEpAssetAddMenu();window._epAssetPickerCtx={ep:\''+ep+'\',mode:\'add\'};if(typeof openShotAssetLibraryPicker===\'function\')openShotAssetLibraryPicker('+ep+',\''+sid+'\')"><span class="vg-save-opt-label">从资产库选取</span><span class="vg-save-opt-desc">从已有资产选参考图（确认后加入本集）</span></button>';
    pop.dataset.open='1'; pop.style.display='block';
    var r = e.currentTarget.getBoundingClientRect();
    pop.style.left = Math.max(8, r.right - 220) + 'px';
    pop.style.top = (window.scrollY + r.bottom + 6) + 'px';
  }
  function _closeEpAssetAddMenu(){ var p=document.getElementById('vg-ep-asset-add-menu'); if(p){p.dataset.open='0';p.style.display='none';} }
  // 添加：上传本地图片（FileReader onload 后追加 cell + 重建）
  function _doAddEpAssetUpload(input, ep, sid){
    _closeEpAssetAddMenu();
    var file = input.files && input.files[0];
    if(!file) return;
    var epKey = _currentVGEp();
    var reader = new FileReader();
    reader.onload = function(ev){
      var dataUrl = ev.target.result;
      var baseName = file.name.replace(/\.[^.]+$/,'');
      var assets = _getEpAssets(epKey);   // 写入集级资产池（非 sb-ref-cell）
      var exist = assets.some(function(a){ return a.src === dataUrl; });
      if(!exist) assets.push({ name: baseName, src: dataUrl, kind: _classifyBySrc(dataUrl) });
      if(typeof _renderEpAssetPanel === 'function') _renderEpAssetPanel();
      if(typeof toast === 'function') toast('已添加「'+baseName+'」到本集资产');
    };
    reader.readAsDataURL(file);
  }
  window._doAddEpAssetUpload = _doAddEpAssetUpload;
  window._openEpAssetAdd = _openEpAssetAdd;
  window._closeEpAssetAddMenu = _closeEpAssetAddMenu;
  function _renderEpAssetPanel(){
    var html = _buildEpAssetPanel();
    document.querySelectorAll('#v-g .sb-shot-section').forEach(function(sec){
      var split = sec.querySelector('.sb-editor-split');
      if(!split) return;
      var old = sec.querySelector(':scope > .vg-ep-assets');
      if(old) old.remove();
      var wrap = document.createElement('div');
      wrap.innerHTML = html;
      sec.insertBefore(wrap.firstChild, split);   // 注入 section 顶部（editor-split 前，横跨 edit-col + gen）
    });
    // card 点击查看原图（lightbox）
    document.querySelectorAll('#v-g .vg-ep-asset-card[data-src]').forEach(function(card){
      if(card.dataset.lbBound) return;
      card.dataset.lbBound = '1';
      card.addEventListener('click', function(){
        var src = card.getAttribute('data-src');
        var name = card.getAttribute('data-name');
        if(src && typeof openAssetImgLightbox === 'function') openAssetImgLightbox(src, name);
      });
    });
    // 光标在本集资产区滚轮 → 横向滚动（不触发镜头切换）
    document.querySelectorAll('#v-g .vg-ep-assets-scroll').forEach(function(sc){
      if(sc.dataset.wheelBound) return; sc.dataset.wheelBound = '1';
      sc.addEventListener('wheel', function(e){
        if(Math.abs(e.deltaY) > Math.abs(e.deltaX)){
          sc.scrollLeft += e.deltaY;
          e.preventDefault(); e.stopPropagation();
        }
      }, { passive: false });
    });
  }
  // 提示词上方引用缩略图（板块③内）：该镜 @引用，只图、真实图（匹配本集池 src）
  function _updatePromptRefs(sec){
    var row = sec.querySelector('.vg-prompt-refs');
    if(!row) return;
    var ta = sec.querySelector('.sb-prompt-ta');
    var refs = [];
    if(ta && ta.value){
      var m, re = /@\[([^\]]+)\]/g;
      while((m = re.exec(ta.value)) !== null) refs.push(m[1]);
    }
    refs = _uniq(refs);
    if(!refs.length){ row.innerHTML = '<span class="vg-prompt-refs-label">引用资产</span><span class="vg-prompt-refs-empty">提示词输入 @ 引用本集资产</span>'; return; }
    var pool = {};
    _getEpAssets(_currentVGEp()).forEach(function(a){   // 方案Y：从独立集级资产池查 src
      if(a.name) pool[a.name] = a.src;
      if(a.src){ var f = a.src.split('/').pop(); if(f) pool[f] = a.src; }   // 也按文件名匹配
    });
    row.innerHTML = '<span class="vg-prompt-refs-label">引用资产</span>' + refs.map(function(n){
      var src = pool[n] || '';
      var safe = String(n).replace(/</g,'&lt;');
      var thumb = src ? '<img src="'+src+'" alt="'+safe+'" loading="lazy" referrerpolicy="no-referrer"/>' : safe.charAt(0);
      return '<div class="vg-prompt-ref" title="'+safe+'"><div class="vg-prompt-ref-thumb'+(src?' has-img':'')+'">'+thumb+'</div></div>';
    }).join('');
    // hover 显示大图浮层
    row.querySelectorAll('.vg-prompt-ref').forEach(function(el){
      if(el.dataset.hoverBound) return; el.dataset.hoverBound = '1';
      var img = el.querySelector('img');
      var hsrc = img ? img.getAttribute('src') : '';
      el.addEventListener('mouseenter', function(){
        if(!hsrc || el._tip) return;
        var tip = document.createElement('div'); tip.className = 'vg-ref-hover-tip';
        tip.innerHTML = '<img src="'+hsrc+'" referrerpolicy="no-referrer"/>';
        document.body.appendChild(tip);
        var r = el.getBoundingClientRect();
        tip.style.left = Math.max(8, r.left + r.width/2 - 60) + 'px';
        tip.style.top = (window.scrollY + r.top - 128) + 'px';
        el._tip = tip;
      });
      el.addEventListener('mouseleave', function(){ if(el._tip){ el._tip.remove(); el._tip = null; } });
    });
  }
  // 本集资产卡片替换/删除（操作该集 sb-ref-cell + 本集所有提示词 @引用）
  function _deleteOldEpAsset(oldSrc){
    if(!oldSrc) return;
    var file = oldSrc.split('/').pop();
    document.querySelectorAll('#v-g .sb-shot-section .sb-ref-cell').forEach(function(cell){
      var img = cell.querySelector('img');
      var s = img ? (img.getAttribute('src')||'') : '';
      if(s && (s === oldSrc || s.split('/').pop() === file)) cell.remove();
    });
  }
  function _replacePromptRefsAll(oldName, newName){
    var re = new RegExp('@\\['+oldName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\]','g');
    document.querySelectorAll('#v-g .sb-shot-section').forEach(function(sec){
      var ta = sec.querySelector('.sb-prompt-ta');
      if(ta && ta.value){
        ta.value = ta.value.replace(re, '@['+newName+']');
        ta.dispatchEvent(new Event('input', {bubbles:true}));
        if(typeof bindPromptBlurSave === 'function') bindPromptBlurSave(ta);
      }
    });
  }
  function _removePromptRefsAll(name){
    var re = new RegExp('@\\['+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\]\\s*','g');
    document.querySelectorAll('#v-g .sb-shot-section').forEach(function(sec){
      var ta = sec.querySelector('.sb-prompt-ta');
      if(ta && ta.value){
        ta.value = ta.value.replace(re, '');
        ta.dispatchEvent(new Event('input', {bubbles:true}));
        if(typeof bindPromptBlurSave === 'function') bindPromptBlurSave(ta);
      }
    });
  }
  function _removeEpAsset(btn, src){
    if(!src) return;
    var card = btn.closest('.vg-ep-asset-card');
    var name = card ? (card.getAttribute('data-name')||'') : '';
    if(!confirm('确认从本集资产移除「'+name+'」？\n该资产及本集所有提示词中的 @['+name+'] 引用将一并删除。')) return;
    var epKey = _currentVGEp();
    var assets = _getEpAssets(epKey);   // 池内删除
    for(var i=0;i<assets.length;i++){ if(assets[i].src === src || (!src && assets[i].name === name)){ assets.splice(i,1); break; } }
    if(name) _removePromptRefsAll(name);   // 同步本集提示词 @引用
    if(typeof _renderEpAssetPanel === 'function') _renderEpAssetPanel();
    if(typeof toast === 'function') toast('已从本集资产移除「'+name+'」');
  }
  function _replaceEpAsset(btn, name){
    var card = btn.closest('.vg-ep-asset-card');
    var oldSrc = card ? (card.getAttribute('data-src')||'') : '';
    var ep = _currentVGEp();
    var activeSec = document.querySelector('#v-g .sb-shot-section.vg-active');
    var sid = activeSec ? (activeSec.id||'sb-shot-1').replace('sb-shot-','') : '1';
    var pop = document.getElementById('vg-ep-asset-replace-menu');
    if(!pop){ pop = document.createElement('div'); pop.id='vg-ep-asset-replace-menu'; pop.className='vg-save-menu'; document.body.appendChild(pop); }
    if(pop.dataset.open==='1'){ _closeReplaceEpMenu(); return; }
    pop.innerHTML =
      '<label class="vg-save-opt" style="cursor:pointer;display:flex;flex-direction:column;align-items:flex-start"><input type="file" accept="image/*" hidden onchange="_doReplaceEpUpload(this,\''+name.replace(/'/g,"\\'")+'\',\''+oldSrc.replace(/'/g,"\\'")+'\')"><span class="vg-save-opt-label">上传本地图片</span><span class="vg-save-opt-desc">替换本集「'+name+'」</span></label>' +
      '<button type="button" class="vg-save-opt" onclick="_closeReplaceEpMenu();window._epAssetPickerCtx={ep:\''+ep+'\',mode:\'replace\',oldSrc:\''+oldSrc.replace(/'/g,"\\'")+'\',oldName:\''+name.replace(/'/g,"\\'")+'\'};if(typeof openShotAssetLibraryPicker===\'function\')openShotAssetLibraryPicker('+ep+',\''+sid+'\')"><span class="vg-save-opt-label">从资产库选取</span><span class="vg-save-opt-desc">单选替换（资产库弹窗，确认后写池）</span></button>';
    pop.dataset.open='1'; pop.style.display='block';
    var r = btn.getBoundingClientRect();
    pop.style.left = Math.max(8, r.left) + 'px';
    pop.style.top = (window.scrollY + r.bottom + 4) + 'px';
  }
  function _closeReplaceEpMenu(){ var p=document.getElementById('vg-ep-asset-replace-menu'); if(p){p.dataset.open='0';p.style.display='none';} }
  function _doReplaceEpUpload(input, oldName, oldSrc){
    _closeReplaceEpMenu();
    var file = input.files && input.files[0];
    if(!file) return;
    var newName = file.name.replace(/\.[^.]+$/,'');
    var epKey = _currentVGEp();
    var reader = new FileReader();
    reader.onload = function(ev){
      var dataUrl = ev.target.result;
      var assets = _getEpAssets(epKey);   // 池内替换
      var idx = -1;
      for(var i=0;i<assets.length;i++){ if(assets[i].src === oldSrc || (!oldSrc && assets[i].name === oldName)){ idx=i; break; } }
      if(idx >= 0) assets[idx] = { name: newName, src: dataUrl, kind: assets[idx].kind || _classifyBySrc(dataUrl) };
      if(newName && oldName) _replacePromptRefsAll(oldName, newName);   // 同步本集提示词 @[旧名]→@[新名]
      if(typeof _renderEpAssetPanel === 'function') _renderEpAssetPanel();
      if(typeof toast === 'function') toast('已替换「'+oldName+'」→「'+newName+'」');
    };
    reader.readAsDataURL(file);
  }
  window._removeEpAsset = _removeEpAsset;
  window._replaceEpAsset = _replaceEpAsset;
  window._closeReplaceEpMenu = _closeReplaceEpMenu;
  window._doReplaceEpUpload = _doReplaceEpUpload;
  function _vgReshapeSection(sec) {
    if (!sec || sec.dataset.vgReshaped) return;
    sec.dataset.vgReshaped = '1';
    var split = sec.querySelector('.sb-editor-split');
    var prompt = sec.querySelector('.sb-prompt-block');
    var ref = sec.querySelector('.sb-ref-col');
    var gen = sec.querySelector('.sb-col-gen');
    if (!split || !prompt) return;
    split.classList.add('vg-reshaped');
    // 移除原「AI 修改」按钮栏（已被提示词右下角的润色按钮替代）
    var aiToolbar = sec.querySelector('.sb-prompt-toolbar'); if (aiToolbar) aiToolbar.remove();
    // SEG 标题行：去资产标签 + 右侧加信息提示
    var tagRow = sec.querySelector('.sb-tag-row'); if (tagRow) tagRow.style.display = 'none';
    var segHead = sec.querySelector('.sb-seg-head');
    if (segHead && !segHead.querySelector('.vg-seg-tip')) {
      var tip = document.createElement('span');
      tip.className = 'vg-seg-tip';
      tip.innerHTML = '提示词中输入 <b>@</b> 可引用角色 / 场景 / 道具';
      segHead.appendChild(tip);
    }
    // edit-col：板块①本集资产(_renderEpAssetPanel 汇总) → 板块②片段标题 → 板块③提示词
    var editCol = document.createElement('div');
    editCol.className = 'vg-edit-col';
    split.insertBefore(editCol, prompt);
    editCol.appendChild(prompt);
    if (segHead) editCol.insertBefore(segHead, prompt);   // 板块② 片段标题
    if (ref) ref.style.display = 'none';   // sb-ref-col 隐藏（本集资产区由 _renderEpAssetPanel 汇总其 sb-ref-cell）
    // 板块③ 提示词上方：该镜 @引用 缩略图
    var promptGroup = sec.querySelector('.sb-prompt-group');
    if (promptGroup && !promptGroup.querySelector('.vg-prompt-refs')) {
      var refsRow = document.createElement('div');
      refsRow.className = 'vg-prompt-refs';
      promptGroup.insertBefore(refsRow, promptGroup.firstChild);
      var pta = sec.querySelector('.sb-prompt-ta');
      if (pta) pta.addEventListener('input', function() { _updatePromptRefs(sec); });
      _updatePromptRefs(sec);
    }
    // 提示词右下角浮动控件（润色 + 生成按钮移自视频区）
    var genBtn = sec.querySelector('.sb-gen-big');
    if (promptGroup && genBtn && !promptGroup.querySelector('.vg-prompt-actions')) {
      promptGroup.classList.add('vg-prompt-relative');
      var oldDiv = genBtn.parentNode;
      var metaRow = sec.querySelector('.sb-shot-meta-row'); if (metaRow) metaRow.style.display = 'none';
      var actions = document.createElement('div');
      actions.className = 'vg-prompt-actions';
      var polish = document.createElement('button');
      polish.type = 'button';
      polish.className = 'b vg-prompt-polish';
      polish.title = 'AI 润色优化提示词';
      polish.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 6.95H22l-6.2 4.5 2.4 7.05L12 16l-6.2 4.5 2.4-7.05L2 8.95h7.6z"/></svg>润色';
      polish.onclick = function(e) { e.stopPropagation(); var ep=sec.getAttribute('data-ep')||'1', sid=sec.getAttribute('data-sid')||'1'; openVGOptimizePanel(ep,sid); };
      actions.appendChild(polish);
      // 视频参数选单（复用 params-display 样式 + 设计视频参数菜单 5 厂商）
      var vpWrap = document.createElement('div');
      vpWrap.style.display = 'contents';
      vpWrap.innerHTML = buildVideoParamsDisplay();
      if (vpWrap.firstChild) actions.appendChild(vpWrap.firstChild);
      // 生成按钮改 gen-btn（青色渐变，复用统一生成按钮样式）+ label 精简
      if (genBtn.className.indexOf('gen-btn') < 0) genBtn.className = 'b gen-btn sb-gen-big';
      genBtn.setAttribute('data-gen-text', '生成');
      genBtn.setAttribute('data-regen-text', '重新生成');
      actions.appendChild(genBtn);
      promptGroup.appendChild(actions);
      if (oldDiv && oldDiv !== gen && !oldDiv.querySelector('.sb-gen-big')) oldDiv.remove();
    }
    // 视频区精简（去标题/状态文字）+ 工具按钮区
    if (gen) {
      // 新镜头用旧结构（sb-preview-placeholder）→ 统一换成 sb-preview-frame--pending
      var ph = gen.querySelector('.sb-preview-placeholder');
      if (ph) {
        ph.classList.remove('sb-preview-placeholder');
        ph.classList.add('sb-preview-frame', 'sb-preview-frame--pending');
        ph.innerHTML = '<span class="sb-preview-corner">待生成</span><span class="sb-preview-demo">片段-'+sec.getAttribute('data-sid')+'</span>';
        // 确保 data-shot-status 为 pending，renderVideoPlaceholder 不会覆盖为 ready
        sec.setAttribute('data-shot-status', 'pending');
      }
      var status = gen.querySelector('.sb-gen-status'); if (status) status.style.display = 'none';
      var genTitle = gen.querySelector('.sb-col-title'); if (genTitle) genTitle.style.display = 'none';
      if (!gen.querySelector('.vg-video-tools')) {
        var ep = sec.getAttribute('data-ep') || (typeof PAGE_DATA !== 'undefined' && PAGE_DATA.sbEp) || 1;
        var sid = (sec.id || 'sb-shot-1').replace('sb-shot-', '');
        var tools = document.createElement('div');
        tools.className = 'vg-video-tools';
        tools.innerHTML =
          '<button type="button" class="vg-tool-btn" title="放大当前镜头的静态参考帧" onclick="var frame=this.closest(\'section\').querySelector(\'.sb-preview-frame[data-poster]\');if(frame)frame.click();else toast(\'当前镜头尚无参考帧\');"><span>查看参考帧</span></button>' +
          '<button type="button" class="vg-tool-btn" title="预览完整一集（拼接播放）" onclick="event.stopPropagation();if(typeof openSbPreviewModal===\'function\')openSbPreviewModal()"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z"/></svg><span>预览全集</span></button>' +
          '<button type="button" class="vg-tool-btn vg-tool-btn--save" title="保存视频：当前片段 / 完整一集 / 批量下载本集" onclick="event.stopPropagation();_toggleVgSaveMenu(event,' + ep + ',\'' + sid + '\')"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg><span>保存视频</span></button>' +
          '<button type="button" class="vg-tool-btn" title="查看本镜历史版本" onclick="event.stopPropagation();if(typeof openShotHistoryModal===\'function\')openShotHistoryModal(' + ep + ',' + sid + ')"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg><span>历史版本</span></button>';
        gen.appendChild(tools);
      }
    }
  }
  function _vgReshapeAll() {
    document.querySelectorAll('#v-g .sb-shot-section').forEach(_vgReshapeSection);
    // 升级新渲染的 genShot 按钮（积分图标 + 500 积分；upgradeGenButtons 仅 DOMContentLoaded 跑，新 section 的按钮没升级）
    if (typeof upgradeGenButtons === 'function') upgradeGenButtons();
    if (typeof _initPromptHighlightOverlay === 'function') _initPromptHighlightOverlay();
    // 强制 textarea 透明 + back 层 mask（绕过浏览器文件 CSS 缓存）
    document.querySelectorAll('#v-g .prompt-hl-wrap .sb-prompt-ta').forEach(function(t) {
      t.style.color = 'transparent'; t.style.caretColor = 'var(--t1)'; t.style.background = 'transparent';
    });
    // 确保文字渐隐在 back 层生效（绕过浏览器文件缓存）
    document.querySelectorAll('#v-g .prompt-hl-back').forEach(function(back) {
      back.style.webkitMaskImage = 'linear-gradient(to bottom, black 0%, black calc(100% - 52px), transparent 100%)';
      back.style.maskImage = 'linear-gradient(to bottom, black 0%, black calc(100% - 52px), transparent 100%)';
    });
    // 确保 wrap 撑满 + overflow hidden
    document.querySelectorAll('#v-g .prompt-hl-wrap').forEach(function(w) {
      w.style.display = 'grid'; w.style.flex = '1 1 auto'; w.style.minHeight = '0';
      w.style.overflow = 'hidden'; w.style.borderRadius = '8px';
    });
    _renderEpAssetPanel();   // 本集资产区汇总注入每镜 edit-col 顶部（板块①）
  }
  // 视频设置选单（秒数 + 延续上一镜）popover
  // === 设计视频参数菜单（复刻深色主题 视频生成参数：5 厂商 + 全参数）===
  var VIDEO_PROVIDERS = [
    { id:'jimeng', name:'即梦', logo:'jimeng', tag:'音画同步', desc:'全能参考，高品质，智能多镜(已支持真人图片及视频)', models:['Seedance 2.0','Seedance 2.0 Fast','Seedance 2.0 Mini'], ratios:['21:9','16:9','4:3','1:1','3:4','9:16'], res:['480p','720p','1080p','4K'], audiosync:true, dur:[4,5,6,7,8,9,10,11,12,13,14,15] },
    { id:'kling', name:'可灵', logo:'kling', tag:'音画同步', desc:'可灵最新大模型，支持多模态输入', models:['可灵 3.0 Omni','可灵 O1'], ratios:['16:9','9:16'], res:['720p','1080p','4K'], audiosync:true, dur:[3,4,5,6,7,8,9,10,11,12,13,14,15] },
    { id:'happyhorse', name:'Happy Horse', logo:'happyhorse', tag:'音画同步', activity:'限时6折', desc:'阿里最新大模型，支持智能多镜、多模态输入', models:['Happy Horse 1.1','Happy Horse 1.0'], ratios:['16:9','4:3','9:16'], res:['720p','1080p'], dur:[3,4,5,6,7,8,9,10,11,12,13,14,15] },
    { id:'vidu', name:'Vidu', logo:'vidu', desc:'动态效果好，生成细节丰富', models:['Vidu Q2 Pro'], ratios:['16:9','4:3','9:16'], res:['720p','1080p'], dur:[1,2,3,4,5,6,7,8,9,10] },
    { id:'platform', name:'平台模型', logo:'platform', tag:'音画同步', desc:'支持4K超高清', models:['VV 3.1 (测试版)'], ratios:['16:9','9:16'], res:['720p','1080p','4K'], audiosync:true, dur:[8] }
  ];
  var VIDEO_COUNTS = [1,2,3,4];
  var VIDEO_CONFIG = { provider:'jimeng', model:'Seedance 2.0', ratio:'9:16', res:'1080p', audiosync:'开', dur:5, count:1 };
  function _videoProvider(){ return VIDEO_PROVIDERS.filter(function(p){return p.id===VIDEO_CONFIG.provider;})[0] || VIDEO_PROVIDERS[0]; }
  var _HH_ICON = '<path d="M3.074 1.102a20.714 20.714 0 0 1-.078-.351c0-.003.038 0 .083.007.16.03.316.075.468.132.047.023.077.023.234-.004.134-.022.251-.028.453-.02.18.006.323.022.419.047.081.02.217.064.302.097a2.165 2.165 0 0 1 .478.261c.049.035.157.13.24.21.084.08.198.21.253.287.118.174.214.362.286.56.013.04.135.685.27 1.432.136.745.252 1.36.257 1.366.006.007.256.058.556.113.413.078.583.118.7.166a.91.91 0 0 1 .16.078c.004.008.019.015.031.015.014 0 .038-.02.054-.045.068-.104.153-.194.254-.267a1.254 1.254 0 0 1 .385-.194c.075-.022.178-.032.317-.032.17 0 .228.01.35.052.081.028.203.087.272.13.069.046.162.124.21.176.046.052.114.15.15.218.037.067.08.174.096.236.016.063.036.173.043.246.007.073.025.18.039.237.015.057.046.147.069.199.023.052.082.153.133.225.05.072.14.175.317.323l-.104.066a1.06 1.06 0 0 1-.216.1.993.993 0 0 1-.272.033.816.816 0 0 1-.288-.044 1.114 1.114 0 0 1-.215-.102 1.171 1.171 0 0 1-.158-.131 1.14 1.14 0 0 1-.123-.153 1.3 1.3 0 0 1-.101-.256 2.087 2.087 0 0 0-.102-.277.92.92 0 0 0-.14-.192 1.07 1.07 0 0 0-.184-.147 1.083 1.083 0 0 0-.205-.087.914.914 0 0 0-.254-.03l.078.118c.042.065.1.178.126.25.026.073.058.205.07.294.016.12.015.2-.002.313a1.657 1.657 0 0 1-.057.246 1.805 1.805 0 0 1-.083.189 1.534 1.534 0 0 1-.131.198 2.001 2.001 0 0 0-.166.275c-.111.21-.16.446-.14.682.008.164.03.252.16.672l.157.501c.005.011-.03.035-.075.054a6.94 6.94 0 0 1-.862.294 1.56 1.56 0 0 1-.307.064 2.754 2.754 0 0 1-.109-.223 41.32 41.32 0 0 0-.254-.549l-.16-.35a15.834 15.834 0 0 0-.138-.298 1.513 1.513 0 0 1-.075-.17c0-.007.063-.03.14-.048.08-.019.2-.067.274-.109a.855.855 0 0 0 .146-.097c.011-.017-.022-.02-.132-.009a1.468 1.468 0 0 1-.287-.006c-.089-.012-.378-.1-.77-.236-.346-.118-.739-.254-1.117-.386l-.598.372c-.33.205-.599.383-.6.396 0 .013.06.236.135.497.105.358.138.502.137.591a.468.468 0 0 1-.038.194.566.566 0 0 1-.082.124.688.688 0 0 1-.08.07c-.028.02-.059.014-.185-.034a8.608 8.608 0 0 1-.416-.179l-.06-.189-.241-.762c-.135-.418-.184-.6-.183-.672a.45.45 0 0 1 .045-.194.55.55 0 0 1 .102-.144c.032-.027.218-.155.771-.518l-.064-.022a154.08 154.08 0 0 1-.592-.204 10.715 10.715 0 0 0-.55-.182c-.015 0-.061.147-.125.403-.041.177-.093.35-.156.52a.818.818 0 0 1-.368.368 1.11 1.11 0 0 1-.195.07c-.047.012-.143.021-.21.021a.405.405 0 0 1-.121-.009c0-.005.115-.455.255-.998.14-.545.27-1.023.289-1.065a.683.683 0 0 1 .083-.133.589.589 0 0 1 .155-.109.429.429 0 0 1 .217-.052c.083 0 .21.03.487.115.207.064.387.117.402.119.02.002.154-.359.87-2.403l.098-.094c.06-.058.115-.12.165-.188.037-.052.095-.154.129-.228.034-.072.067-.16.074-.193.006-.034.008-.062.002-.062a.343.343 0 0 0-.06.08 1.324 1.324 0 0 1-.142.173.837.837 0 0 1-.178.135c-.06.03-.122.057-.185.081a5.964 5.964 0 0 0-.249.107 1.89 1.89 0 0 1-.16.067c-.006 0-.131.053-.278.115l-.395.17a.549.549 0 0 1-.239.056.591.591 0 0 1-.175-.024.596.596 0 0 1-.131-.083.527.527 0 0 1-.115-.16.337.337 0 0 1-.035-.215c.01-.094.027-.136.098-.237l.298-.426.747-1.07-.078-.344Z"/><path d="M1.463 9.17a.3.3 0 0 1 .151-.139c.09-.046.12-.052.203-.043.08.01.146.042.361.18.145.092.347.213.448.268A6.91 6.91 0 0 0 4.01 10c.112.031.309.08.438.107.128.028.353.067.497.088.177.026.418.042.74.05.304.006.574.001.742-.013.144-.012.39-.043.545-.069.156-.025.406-.077.556-.115.304-.078.604-.176.897-.292.418-.175.819-.387 1.198-.635.102-.066.216-.126.254-.132a.465.465 0 0 1 .151.01.414.414 0 0 1 .251.205c.015.034.027.1.027.147a.408.408 0 0 1-.037.156c-.02.04-.114.136-.22.223-.1.084-.24.195-.309.248a7.218 7.218 0 0 1-.799.506 6.677 6.677 0 0 1-.555.266 8.236 8.236 0 0 1-.537.196 8.24 8.24 0 0 1-.448.128c-.334.076-.672.13-1.013.16a6.8 6.8 0 0 1-.702.014 6.565 6.565 0 0 1-.702-.05 8.818 8.818 0 0 1-.41-.067 7.001 7.001 0 0 1-1.12-.33 7.103 7.103 0 0 1-.956-.474 8.15 8.15 0 0 1-.467-.313 8.764 8.764 0 0 1-.386-.302c-.11-.094-.18-.168-.2-.215a.482.482 0 0 1-.03-.156c0-.052.018-.118.047-.17Z"/>';
  var _VIDU_ICON = '<path d="M20.607 2.247c-2.917-.966-5.426 1.084-6.011 2.96 0 0-2.105 6.76-3.002 9.58-.428 1.346-1.489 3.548-3.487 3.548-1.627 0-2.463-1.527-2.816-2.437L2.865 9.431c-.281-.681.013-2.04 1.14-2.447 1.204-.432 1.978.575 2.178 1.11l3.022 7.74c.72-.928 1.178-2.438 1.476-3.507l-1.984-5.21C7.756 4.686 5.267 3.58 2.962 4.43 1.095 5.118-.702 7.474.275 10.435l2.504 6.44c.38.976 1.881 4.163 5.275 4.163 4.073 0 5.601-3.473 6.449-6.218.424-1.373 2.749-8.797 2.749-8.797.338-1.109 1.71-1.428 2.568-1.148.605.196 1.698 1.031 1.345 2.325-.066.236-1.92 6.209-2.604 8.026-.357.948-1.262 3.006-3.324 2.72-.628 1.39-1.15 2.199-1.94 2.925 2.572 1.218 6.32-.009 7.898-4.776.586-1.773 2.644-8.166 2.644-8.166.598-1.963-.469-4.768-3.232-5.682z"/>';
  function _videoLogo(p){
    p = p || _videoProvider();
    if(p.id==='jimeng') return '<svg class="pp-tab-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M5.257 1.808C8.768 6.74 14.431 9.45 20.064 8.403a7.398 7.398 0 0 0 1.281-.38c.855-.33 1.975 1.01 1.326 1.658-.43.428-.84.82-1.208 1.147a51.149 51.149 0 0 1-8.389 6.044 51.146 51.146 0 0 1-9.49 4.263c-.453.15-.98.304-1.546.457-.885.238-1.484-1.4-.77-1.975.378-.306.713-.617.978-.927C5.969 14.336 6.299 8.174 3.717 2.697a18.2 18.2 0 0 1-.364-.84C2.995.98 4.042.335 4.656 1.055c.243.284.453.545.601.753z"/></svg>';
    if(p.id==='kling') return '<svg class="pp-tab-icon" viewBox="0 0 24 24" fill="currentColor"><path clip-rule="evenodd" d="M5.493 21.234c-1.112-1.451-1.109-4.263-.081-7.459l-4.557-2.63a1.683 1.683 0 0 1-.85-1.304 1.505 1.505 0 0 1 .08-.622 13.18 13.18 0 0 1 1.037-2.255c3.476-6.02 10.916-8.23 16.619-4.938.46.266.82.67 1.081 1.184.785 1.545.685 4.096-.234 6.954l4.557 2.631c.339.196.596.492.736.832a1.53 1.53 0 0 1 .034 1.093 13.146 13.146 0 0 1-1.037 2.255c-3.476 6.02-10.916 8.23-16.619 4.938a2.6 2.6 0 0 1-.766-.68z"/></svg>';
    if(p.id==='platform') return _providerDot({id:'platform'});   // 平台模型图标
    if(p.id==='happyhorse') return '<svg class="pp-tab-icon" viewBox="0 0 24 24" fill="currentColor">'+_HH_ICON+'</svg>';
    if(p.id==='vidu') return '<svg class="pp-tab-icon" viewBox="0 0 24 24" fill="currentColor">'+_VIDU_ICON+'</svg>';
    return '<span class="pp-tab-letter">'+p.name[0]+'</span>';
  }
  function _videoSummaryInner(){
    var parts=[VIDEO_CONFIG.model, VIDEO_CONFIG.dur+'s', VIDEO_CONFIG.count+'条'];   // 折叠态精简 3 项（防换行）
    return '<span class="pd-provider-logo">'+_videoLogo()+'</span><span class="pd-summary">'+parts.map(function(t){return '<span class="pd-param"><span class="pd-text">'+t+'</span></span>';}).join('<span class="pd-sep"></span>')+'</span>';
  }
  function buildVideoParamsDisplay(){
    return '<div class="params-display vg-video-params" onclick="toggleVideoParams(event,this)">'+_videoSummaryInner()+'<svg class="pd-chevron" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5l3 3 3-3"/></svg></div>';
  }
  function _videoRadios(key, opts, val){
    return opts.map(function(o){
      var on=(String(o)===String(val))?' on':'';
      var label = (key==='dur') ? (o+'s') : ((key==='count') ? (o+'条') : o);
      return '<button type="button" class="pp-radio'+on+'" onclick="selectVideoParam(\''+key+'\',\''+o+'\')">'+label+'</button>';
    }).join('');
  }
  function _videoPopoverBody(){
    var p=_videoProvider();
    var html='<div class="pp-tabs">';
    html+=VIDEO_PROVIDERS.map(function(pr){
      var on=pr.id===VIDEO_CONFIG.provider?' on':'';
      var act=pr.activity?'<span class="pp-activity">'+pr.activity+'</span>':'';
      return '<button type="button" class="pp-tab'+on+'" onclick="selectVideoProvider(\''+pr.id+'\')">'+_videoLogo(pr)+'<span>'+pr.name+'</span>'+act+'</button>';
    }).join('');
    html+='</div><div class="pp-desc">'+(p.tag?'<span class="pp-tag">'+p.tag+'</span> ':'')+p.desc+'</div><div class="pp-form">';
    html+='<div class="pp-row"><label>模型版本</label><div class="pp-radios">'+_videoRadios('model',p.models,VIDEO_CONFIG.model)+'</div></div>';
    html+='<div class="pp-row"><label>画幅比</label><div class="pp-radios pp-radios--ratio">'+_videoRadios('ratio',p.ratios,VIDEO_CONFIG.ratio)+'</div></div>';
    html+='<div class="pp-row"><label>分辨率</label><div class="pp-radios">'+_videoRadios('res',p.res,VIDEO_CONFIG.res)+'</div></div>';
    if(p.audiosync) html+='<div class="pp-row"><label>音画同步</label><div class="pp-radios">'+_videoRadios('audiosync',['开','关'],VIDEO_CONFIG.audiosync)+'</div></div>';
    html+='<div class="pp-row"><label>视频时长</label><div class="pp-radios">'+_videoRadios('dur',p.dur,VIDEO_CONFIG.dur)+'</div></div>';
    html+='<div class="pp-row"><label>生成数量</label><div class="pp-radios">'+_videoRadios('count',VIDEO_COUNTS,VIDEO_CONFIG.count)+'</div></div>';
    html+='</div>';
    return html;
  }
  function _ensureVideoPopover(){
    var pop=document.getElementById('vg-video-params-popover');
    if(!pop){ pop=document.createElement('div'); pop.id='vg-video-params-popover'; pop.className='params-popover vg-video-params-popover'; pop.style.display='none'; document.body.appendChild(pop); }
    return pop;
  }
  function toggleVideoParams(e, el){
    if(e) e.stopPropagation();
    var pop=_ensureVideoPopover();
    if(pop.style.display==='block' && pop._lastEl===el){ pop.style.display='none'; el.classList.remove('on'); return; }
    pop.innerHTML=_videoPopoverBody();
    pop.style.display='block'; pop._lastEl=el;
    var r=el.getBoundingClientRect();
    pop.style.left='0px'; pop.style.top='0px';
    var popW=pop.offsetWidth||500;
    var popH=pop.offsetHeight||420;
    pop.style.left=Math.max(8, Math.min(r.left, window.innerWidth-popW-8))+'px';
    var below=window.innerHeight-r.bottom;
    pop.style.top = (below < popH+12 && r.top > below) ? (window.scrollY+r.top-popH-8)+'px' : (window.scrollY+r.bottom+8)+'px';
    if(el) el.classList.add('on');
  }
  function selectVideoProvider(id){
    var p=VIDEO_PROVIDERS.filter(function(x){return x.id===id;})[0]; if(!p) return;
    VIDEO_CONFIG.provider=id;
    VIDEO_CONFIG.model=p.models[0];
    VIDEO_CONFIG.res=p.res[p.res.length-1] || p.res[0];
    if(p.audiosync) VIDEO_CONFIG.audiosync='开';
    if(p.dur.indexOf(VIDEO_CONFIG.dur)<0) VIDEO_CONFIG.dur = p.dur.indexOf(5)>=0 ? 5 : p.dur[0];
    if(p.ratios.indexOf(VIDEO_CONFIG.ratio)<0) VIDEO_CONFIG.ratio=p.ratios[p.ratios.length-1] || p.ratios[0];
    _refreshVideoParams();
  }
  function selectVideoParam(key, val){
    VIDEO_CONFIG[key]=val;
    _refreshVideoParams();
    if(key==='dur'){ document.querySelectorAll('#v-g .sb-shot-section[data-ep] [data-field="duration_sec"]').forEach(function(inp){ inp.value=val; }); }
  }
  function _refreshVideoParams(){
    var pop=document.getElementById('vg-video-params-popover');
    if(pop && !pop.hidden) pop.innerHTML=_videoPopoverBody();
    document.querySelectorAll('.vg-video-params').forEach(function(el){
      var logo=el.querySelector('.pd-provider-logo'); if(logo) logo.innerHTML=_videoLogo();
      var sum=el.querySelector('.pd-summary'); if(sum){
        var parts=[VIDEO_CONFIG.model,VIDEO_CONFIG.dur+'s',VIDEO_CONFIG.count+'条'];
        sum.innerHTML=parts.map(function(t){return '<span class="pd-param"><span class="pd-text">'+t+'</span></span>';}).join('<span class="pd-sep"></span>');
      }
    });
  }
  function _closeVGVideoParams() {
    var pop = document.getElementById('vg-video-params-popover');
    if (pop) pop.style.display = 'none';
    document.querySelectorAll('#v-g .vg-video-params.on').forEach(function(b){ b.classList.remove('on'); });
  }
  window.toggleVideoParams = toggleVideoParams;
  window.selectVideoProvider = selectVideoProvider;
  window.selectVideoParam = selectVideoParam;
  window.toggleVGVideoParams = function(e, sec){ var el=document.querySelector('#v-g .vg-video-params'); if(el) toggleVideoParams(e, el); };
  // 等当前集分镜渲染就绪后聚焦第一个（_demoSwitchEpisode 异步渲染 section）
  function _focusFirstShotWhenReady(preferredSid = 1) {
    var vg = document.getElementById('v-g');
    var allShots = vg && vg.querySelector('.sb-all-shots');
    if (!allShots) return;
    const episode = vg.dataset.studioEp;
    const ready = function() {
      if(!vg.classList.contains('on')||!vg.classList.contains('vg-studio-on')||vg.dataset.studioEp!==episode)return;
      _vgReshapeAll();switchShot(vg.querySelector('#sb-shot-' + Number(preferredSid)) ? Number(preferredSid) : 1);
      const current = vg.querySelector('.sb-shot-list .sb-shot-item.on');
      current?.focus({preventScroll:true});
    };
    if (allShots.querySelector('.sb-shot-section')) { ready(); return; }
    var obs = new MutationObserver(function() {
      if (allShots.querySelector('.sb-shot-section')) { obs.disconnect(); ready(); }
    });
    obs.observe(allShots, { childList: true, subtree: false });
    setTimeout(function() { try { obs.disconnect(); } catch (_) {} }, 1500);
  }
  // 工作室左栏初始化（首次进入 studio 调用）
  function _initVGStudio() {
    var vg = document.getElementById('v-g');
    if (!vg) return;
    // 每次进入 studio 都重建左栏 UI（epBtn/batchPanel），保证从任何入口进入显示一致
    // per-shot 开关自身有 sec.querySelector guard，重复调用安全
    // 清理旧实例（如果是从看板切换回 studio、再次从改编进入等）
    var oldEpBtn = document.getElementById('vg-ep-picker');
    if (oldEpBtn) oldEpBtn.remove();
    var oldBatch = document.querySelector('.vg-batch-actions');
    if (oldBatch) oldBatch.remove();
    // 顶部工具栏已隐藏：默认开启全局视频延续，使每镜延续 toggle 可用
    var extCb = document.getElementById('chk-enable-video-extend');
    if (extCb && !extCb.checked) { extCb.checked = true; if (typeof applyVideoExtendUiState === 'function') applyVideoExtendUiState(true); }
    // 镜头切换：键盘 ↑↓ / PageUp·PageDown 翻页（取消滚轮翻页，滚轮仅本集资产区横向滚动）
    var mainEl = vg.querySelector('.sb-col-main');
    if (!vg.dataset.vgKeyInit) {
      document.addEventListener('keydown', _vgOnKey);
      vg.dataset.vgKeyInit = '1';
    }
    // 监听本集 sb-ref-cell 变化（添加/替换/删除后）→ debounce 重建（等 sb-ref-cell 最终态，避开提示词驱动中间态覆盖）
    if (!vg.dataset.vgRefObsInit) {
      var _refObs = new MutationObserver(function(){ clearTimeout(window._epRefT); window._epRefT = setTimeout(function(){ if (typeof _renderEpAssetPanel === 'function') _renderEpAssetPanel(); }, 400); });
      vg.querySelectorAll('.sb-ref-col').forEach(function(col){ _refObs.observe(col, {childList: true, subtree: true}); });
      vg.dataset.vgRefObsInit = '1';
    }
    var shotsCol = vg.querySelector('.sb-col-shots');
    if (!shotsCol) return;
    var header = shotsCol.querySelector('.sb-shots-header');
    if (header) {
      var sel = header.querySelector('#sb-ep-select'); if (sel) sel.style.display = 'none';
      var eyebrow = header.querySelector('.sb-shots-eyebrow'); if (eyebrow) eyebrow.style.display = 'none';
    }
    var epBtn = document.createElement('button');
    epBtn.type = 'button';
    epBtn.className = 'vg-ep-picker';
    epBtn.id = 'vg-ep-picker';
    epBtn.innerHTML = '<span class="vg-ep-picker-label">集数 E01</span><svg class="vg-ep-picker-chev" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>';
    epBtn.onclick = function(e) { e.stopPropagation(); toggleVGEpPicker(); };
    if (header) header.insertBefore(epBtn, header.firstChild);
    // 左栏批量操作区（集数选择按钮下方）
    var batchPanel = document.createElement('div');
    batchPanel.className = 'vg-batch-actions';
    var col = header ? header.parentElement : shotsCol;

    // 1) 批量生成当前集按钮：青色 gen-btn + 积分图标 + 该集总积分
    var batchGen = document.createElement('button');
    batchGen.type = 'button';
    batchGen.className = 'b gen-btn vg-batch-gen-btn';
    batchGen.title = '批量生成当前集所有镜头';
    batchGen.innerHTML = '<svg class="bean-icon" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6.5" fill="currentColor"/><circle cx="9" cy="9" r="2.6" fill="#06281a"/></svg><span class="gen-score">' + ((typeof GEN_PRICES !== 'undefined' ? GEN_PRICES.video : 500) * document.querySelectorAll('#v-g .sb-shot-section').length) + '</span><span>批量生成本集</span>';
    batchGen.onclick = function(e) { e.stopPropagation(); _vgBatchGenConfirm(); };
    batchPanel.appendChild(batchGen);

    col.insertBefore(batchPanel, header ? header.nextSibling : col.firstChild);

    // 3) Per-shot 延续三态按钮（自动 / 开启 / 关闭）：等 sections reshape 完毕后注入
    //    锁定规则：只有「集内首镜」锁定为「首镜」态（无上一镜可参考）
    function _injectPerShotPrevOnce() {
      var secs = document.querySelectorAll('#v-g .sb-shot-section');
      if (secs.length === 0) return false;
      var allReady = true;
      secs.forEach(function(sec) { if (!sec.querySelector('.vg-prompt-actions')) allReady = false; });
      if (!allReady) return false;
      secs.forEach(function(sec, idx) {
        if (sec.querySelector('.vg-prev-switch')) return;
        var actions = sec.querySelector('.vg-prompt-actions');
        if (!actions) return;
        var sw = document.createElement('button');
        sw.type = 'button';
        sw.className = 'vg-prev-switch is-off';
        sw.setAttribute('data-prev-mode', 'off');
        sw.innerHTML = '<span class="vg-prev-icon">↻</span><span class="vg-prev-label">延续</span><span class="vg-prev-mode-label">关闭</span>';
        var hidden = sec.querySelector('input[data-field="ref_prev_shot"]');
        if (hidden) hidden.value = '0';
        if (idx === 0) {
          sw.classList.add('is-locked');
          sw.setAttribute('data-prev-mode', 'locked');
          var ml = sw.querySelector('.vg-prev-mode-label'); if (ml) ml.textContent = '首镜';
          sw.title = '本集第一个镜头，无上一镜可延续';
        } else {
          sw.title = '延续上一镜（点击切换：自动 / 开启 / 关闭）';
          sw.onclick = function(e) { e.stopPropagation(); _toggleVgPrevMenu(e, sec); };
        }
        actions.insertBefore(sw, actions.firstChild);
      });
      return true;
    }
    if (!_injectPerShotPrevOnce()) {
      var _prevObs = new MutationObserver(function() { if (_injectPerShotPrevOnce()) _prevObs.disconnect(); });
      _prevObs.observe(vg, { childList: true, subtree: true });
      setTimeout(function() { _injectPerShotPrevOnce(); if (_prevObs) _prevObs.disconnect(); }, 1500);
    }

    if (header) header.insertBefore(epBtn, header.firstChild);
    var dropdown = document.createElement('div');
    dropdown.className = 'vg-ep-picker-dropdown';
    dropdown.id = 'vg-ep-picker-dropdown';
    dropdown.style.display = 'none';
    document.body.appendChild(dropdown);   // 挂 body：fixed 全宽，不受左栏 containing block 影响
    // 获取 section 的场景标识（用于「每个场景的第二镜头起」判定）
    function _getShotScene(sec) {
      if (!sec) return '';
      // 优先取 data-scene（项目页面写入），其次取 prompt 中的 @[scene:...] 引用
      var ds = sec.getAttribute('data-scene');
      if (ds) return ds;
      var sceneInput = sec.querySelector('[data-field="shot_scene"]');
      if (sceneInput) return (sceneInput.value || '').trim();
      var ta = sec.querySelector('.sb-prompt-ta');
      if (ta && ta.value) {
        var m = ta.value.match(/@\[scene:([^\]]+)\]/);
        if (m) return m[1].trim();
        var m2 = ta.value.match(/@\[([^\]\s]+)\]/);
        if (m2) return m2[1].trim();
      }
      return '';
    }
    // === 单镜延续三态：自动 / 开启 / 关闭（要点3）===
    var _VgPrevModeLabels = { auto: '自动', on: '开启', off: '关闭', locked: '首镜' };
    function _vgSetPrevMode(sec, mode) {
      var sw = sec.querySelector('.vg-prev-switch');
      if (!sw || sw.classList.contains('is-locked')) return;
      // "自动"模式：该集所有非首镜都设 auto（自动延续=批量），非只该镜
      if (mode === 'auto') {
        document.querySelectorAll('#v-g .sb-shot-section').forEach(function(s, i){
          if (i === 0) return;   // 跳过集内首镜
          var sSw = s.querySelector('.vg-prev-switch');
          if (!sSw || sSw.classList.contains('is-locked')) return;
          sSw.setAttribute('data-prev-mode', 'auto');
          sSw.classList.remove('is-auto','is-on','is-off');
          sSw.classList.add('is-auto');
          var sLbl = sSw.querySelector('.vg-prev-mode-label');
          if (sLbl) sLbl.textContent = _VgPrevModeLabels['auto'];
        });
        _vgResolveAutoPrev();
        return;
      }
      sw.setAttribute('data-prev-mode', mode);
      sw.classList.remove('is-auto', 'is-on', 'is-off');
      sw.classList.add('is-' + mode);
      var lbl = sw.querySelector('.vg-prev-mode-label');
      if (lbl) lbl.textContent = _VgPrevModeLabels[mode] || mode;
      var hidden = sec.querySelector('input[data-field="ref_prev_shot"]');
      if (hidden) hidden.value = (mode === 'on') ? '1' : '0';
    }
    // 自动模式解析：同场景镜头延续、场景切换不延续
    function _vgResolveAutoPrev() {
      var secs = document.querySelectorAll('#v-g .sb-shot-section');
      var prevScene = '';
      secs.forEach(function(sec, i) {
        var sw = sec.querySelector('.vg-prev-switch');
        var mode = sw ? sw.getAttribute('data-prev-mode') : 'off';
        var scene = _getShotScene(sec);
        if (mode === 'auto') {
          var cont = i > 0 && !!scene && scene === prevScene;
          var hidden = sec.querySelector('input[data-field="ref_prev_shot"]');
          if (hidden) hidden.value = cont ? '1' : '0';
        }
        if (scene) prevScene = scene;
      });
    }
    // 批量「自动延续」：集内首镜外全部设为 auto，再按场景解析
    function _vgApplyAutoPrev() {
      document.querySelectorAll('#v-g .sb-shot-section').forEach(function(sec, i) { if (i > 0) _vgSetPrevMode(sec, 'auto'); });
      _vgResolveAutoPrev();
    }
    // 单镜三态上拉菜单
    function _toggleVgPrevMenu(e, sec) {
      e.stopPropagation();
      var btn = e.currentTarget;
      var pop = document.getElementById('vg-prev-menu');
      if (!pop) { pop = document.createElement('div'); pop.id = 'vg-prev-menu'; pop.className = 'vg-prev-menu'; document.body.appendChild(pop); }
      var cur = btn.getAttribute('data-prev-mode');
      if (pop.dataset.open === '1' && pop.dataset.sec === (sec.id || '')) { _closeVgPrevMenu(); return; }
      var opts = [
        { mode: 'auto', desc: '同场景延续，场景切换不延续' },
        { mode: 'on', desc: '强制延续上一镜视频' },
        { mode: 'off', desc: '不延续上一镜' }
      ];
      pop.innerHTML = opts.map(function(o) {
        var on = o.mode === cur ? ' on' : '';
        return '<button type="button" class="vg-prev-opt' + on + '" onclick="_vgSetPrevModeById(\'' + (sec.id || '') + '\',\'' + o.mode + '\')"><span class="vg-prev-opt-label">' + _VgPrevModeLabels[o.mode] + '</span><span class="vg-prev-opt-desc">' + o.desc + '</span></button>';
      }).join('');
      pop.dataset.sec = sec.id || ''; pop.dataset.open = '1'; pop.style.display = 'block';
      var r = btn.getBoundingClientRect();
      var popH = pop.offsetHeight || 132, popW = pop.offsetWidth || 220;
      pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - popW - 8)) + 'px';
      pop.style.top = (r.top > popH + 8 ? (window.scrollY + r.top - popH - 6) : (window.scrollY + r.bottom + 6)) + 'px';
    }
    function _closeVgPrevMenu() { var p = document.getElementById('vg-prev-menu'); if (p) { p.dataset.open = '0'; p.style.display = 'none'; } }
    function _vgSetPrevModeById(secId, mode) {
      var sec = document.getElementById(secId);
      if (sec) _vgSetPrevMode(sec, mode);
      _closeVgPrevMenu();
    }
    // === 批量生成本集：弹窗确认（延续三态：自动/开启/关闭）（要点3）===
    function _vgBatchGenConfirm() {
      var vg = document.getElementById('v-g');
      var secs = vg ? vg.querySelectorAll('.sb-shot-section') : [];
      var n = secs.length;
      if (!n) { if (typeof toast === 'function') toast('当前集无镜头'); return; }
      var ep = parseInt((typeof PAGE_DATA !== 'undefined' && PAGE_DATA.sbEp) || 1, 10);
      var price = (typeof GEN_PRICES !== 'undefined' ? GEN_PRICES.video : 500);
      var total = price * n;
      var old = document.getElementById('vg-batch-confirm-modal'); if (old) old.remove();
      var m = document.createElement('div');
      m.id = 'vg-batch-confirm-modal'; m.className = 'dialog-backdrop on'; m.setAttribute('aria-hidden', 'false');
      var optRow = function(mode, label, desc, checked) {
        return '<label class="vgbc-prev-opt' + (checked ? ' on' : '') + '" data-mode="' + mode + '">' +
          '<span class="vgbc-prev-radio' + (checked ? ' on' : '') + '"></span>' +
          '<span class="vgbc-prev-text"><span class="vgbc-prev-label">' + label + '</span>' +
          '<span class="vgbc-prev-desc">' + desc + '</span></span></label>';
      };
      m.innerHTML =
        '<div class="sb-modal" onclick="event.stopPropagation()" role="dialog" aria-modal="true" style="width:min(480px,calc(100vw - 32px))">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">' +
            '<h3 style="margin:0;font-size:16px">批量生成本集</h3>' +
            '<button type="button" class="b" id="vgbc-close" style="padding:4px 10px;font-size:13px">关闭</button>' +
          '</div>' +
          '<div style="font-size:13px;color:var(--t2);margin-bottom:14px">集号 <strong style="color:var(--t1)">E' + (ep < 10 ? '0' + ep : ep) + '</strong> · 共 <strong style="color:var(--t1)">' + n + '</strong> 个镜头 · 单价 <strong style="color:var(--t1)">' + price + '</strong> 积分</div>' +
          '<div style="font-size:12px;font-weight:600;color:var(--t1);margin-bottom:8px">延续上一镜</div>' +
          '<div class="vgbc-prev-opts" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">' +
            optRow('auto', '自动', '同场景镜头自动延续上一镜，场景切换时不延续（集内首镜不延续）', true) +
            optRow('on', '开启', '遵循每个镜头的单镜延续设置：单镜开启则延续，单镜关闭则不延续，不强制统一') +
            optRow('off', '关闭', '整体关闭延续，集内所有镜头均不延续上一镜') +
          '</div>' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid var(--bd)">' +
            '<span style="font-size:13px;color:var(--t2)">预计消耗 <strong style="color:var(--brand-green,#00DA5A);font-size:15px">' + total + '</strong> 积分（' + n + ' × ' + price + '）</span>' +
            '<div><button type="button" class="b" id="vgbc-cancel">取消</button> <button type="button" class="b ba gen-btn" id="vgbc-ok">确认生成</button></div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(m);
      var close = function() { m.remove(); };
      m.onclick = function(ev) { if (ev.target === m) close(); };
      document.getElementById('vgbc-close').onclick = close;
      document.getElementById('vgbc-cancel').onclick = close;
      // 三态单选切换
      var curMode = 'auto';
      m.querySelectorAll('.vgbc-prev-opt').forEach(function(opt) {
        opt.addEventListener('click', function() {
          curMode = opt.getAttribute('data-mode');
          m.querySelectorAll('.vgbc-prev-opt').forEach(function(o) {
            o.classList.toggle('on', o === opt);
            var r = o.querySelector('.vgbc-prev-radio'); if (r) r.classList.toggle('on', o === opt);
          });
        });
      });
      document.getElementById('vgbc-ok').onclick = function() {
        var mode = curMode;
        close();
        // 按选择应用延续模式
        if (mode === 'auto') {
          _vgApplyAutoPrev();   // 集内非首镜全设 auto + 按场景解析
        } else if (mode === 'off') {
          secs.forEach(function(sec, i) { if (i > 0) _vgSetPrevMode(sec, 'off'); });
        }
        // mode === 'on'：不批量覆盖，保留各镜单镜设置
        secs.forEach(function(sec, i) {
          var sid = (sec.id || 'sb-shot-1').replace('sb-shot-', '');
          var genBtn = sec.querySelector('.sb-gen-big');
          setTimeout(function() {
            if (typeof _demoGenShotInstant === 'function') _demoGenShotInstant(ep, sid, sec, genBtn);
          }, i * 600);
        });
        if (typeof toast === 'function') toast('已开始批量生成本集 ' + n + ' 个镜头（延续：' + _VgPrevModeLabels[mode] + '）');
      };
    }
    window._vgSetPrevModeById = _vgSetPrevModeById;

    // 镜头索引点击 → switchShot（事件委托，替代锚点滚动）
    if (!vg.dataset.vgShotClickInit) {
      shotsCol.addEventListener('click', function _vgShotClickHandler(e) {
      var item = e.target.closest('.sb-shot-item');
      if (!item) return;
      if (e.target.closest('.sb-shot-delete-btn') || e.target.closest('.sb-shot-grip')) return;
      e.preventDefault();
      var sid = item.getAttribute('data-sid');
      if (sid) switchShot(sid);
    });
      vg.dataset.vgShotClickInit = '1';
    }
    // 外部点击关闭看板下拉 / 视频设置 popover
    if (!vg.dataset.vgDocClickInit) {
      document.addEventListener('click', function _vgDocClickHandler(e) {
      var dd = document.getElementById('vg-ep-picker-dropdown');
      if (dd && !dd.hidden && !e.target.closest('#vg-ep-picker') && !e.target.closest('#vg-ep-picker-dropdown')) toggleVGEpPicker(true);
      var vp = document.getElementById('vg-video-params-popover');
      if (vp && vp.dataset.open === '1' && !e.target.closest('.vg-video-params') && !e.target.closest('#vg-video-params-popover')) _closeVGVideoParams();
      var sm = document.getElementById('vg-save-menu');
      if (sm && sm.dataset.open === '1' && !e.target.closest('.vg-tool-btn--save') && !e.target.closest('#vg-save-menu')) _closeVgSaveMenu();
      var pm = document.getElementById('vg-prev-menu');
      if (pm && pm.dataset.open === '1' && !e.target.closest('.vg-prev-switch') && !e.target.closest('#vg-prev-menu')) _closeVgPrevMenu();
      var am = document.getElementById('vg-ep-asset-add-menu');
      if (am && am.dataset.open === '1' && !e.target.closest('.vg-ep-asset-add-btn') && !e.target.closest('#vg-ep-asset-add-menu')) _closeEpAssetAddMenu();
      var rm2 = document.getElementById('vg-ep-asset-replace-menu');
      if (rm2 && rm2.dataset.open === '1' && !e.target.closest('.vg-ep-asset-replace') && !e.target.closest('#vg-ep-asset-replace-menu')) _closeReplaceEpMenu();
      });
      vg.dataset.vgDocClickInit = '1';
    }
    // 仅首进时设置 init flag（防止反复加事件），但每次都重建 UI 元素
    vg.dataset.vgStudioInit = '1';
  }
  // === 保存视频选单：当前片段 / 完整一集 / 批量下载本集（要点5）===
  function _toggleVgSaveMenu(e, ep, sid) {
    e.stopPropagation();
    var btn = e.currentTarget;
    var pop = document.getElementById('vg-save-menu');
    if (!pop) {
      pop = document.createElement('div');
      pop.id = 'vg-save-menu';
      pop.className = 'vg-save-menu';
      document.body.appendChild(pop);
    }
    if (pop.dataset.open === '1' && pop.dataset.ep == ep && pop.dataset.sid == sid) { _closeVgSaveMenu(); return; }
    pop.innerHTML =
      '<button type="button" class="vg-save-opt" onclick="_doVgSave(\'clip\')"><span class="vg-save-opt-label">保存当前片段</span><span class="vg-save-opt-desc">仅下载本分镜视频</span></button>' +
      '<button type="button" class="vg-save-opt" onclick="_doVgSave(\'episode\')"><span class="vg-save-opt-label">下载完整一集</span><span class="vg-save-opt-desc">拼接本集所有片段为单集</span></button>' +
      '<button type="button" class="vg-save-opt" onclick="_doVgSave(\'batch\')"><span class="vg-save-opt-label">批量下载本集</span><span class="vg-save-opt-desc">每个片段 + 完整剧集打包</span></button>';
    pop.dataset.ep = ep; pop.dataset.sid = sid; pop.dataset.open = '1';
    pop.style.display = 'block';
    var r = btn.getBoundingClientRect();
    var popW = pop.offsetWidth || 240;
    var popH = pop.offsetHeight || 140;
    pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - popW - 8)) + 'px';
    if (r.top > popH + 8) { pop.style.top = (window.scrollY + r.top - popH - 6) + 'px'; pop.classList.add('drop-up'); }
    else { pop.style.top = (window.scrollY + r.bottom + 6) + 'px'; pop.classList.remove('drop-up'); }
  }
  function _closeVgSaveMenu() {
    var pop = document.getElementById('vg-save-menu');
    if (pop) { pop.dataset.open = '0'; pop.style.display = 'none'; }
  }
  function _doVgSave(kind) {
    _closeVgSaveMenu();
    var msg = kind === 'clip' ? '已开始保存当前视频片段…'
      : kind === 'episode' ? '已开始拼接并下载完整一集…'
      : '已开始打包下载本集全部片段与完整剧集…';
    if (typeof toast === 'function') toast(msg); else alert(msg);
  }
  window._toggleVgSaveMenu = _toggleVgSaveMenu;
  window._closeVgSaveMenu = _closeVgSaveMenu;
  window._doVgSave = _doVgSave;
  function toggleVGView(state, ep, shot) {
    var vg = document.getElementById('v-g');
    if (!vg) return;
    if (state === 'studio') {
      vg.dataset.studioEp=String(ep || window.PAGE_DATA?.sbEp || 1);
      if (!vg.classList.contains('vg-studio-on')) vg.dataset.boardScroll=String(window.scrollY);
      vg.classList.add('vg-studio-on');
      window.scrollTo({top:0,behavior:'instant'});
      document.body.style.overflow = 'hidden';   // studio 锁死 body 滚动
      document.documentElement.style.overflow = 'hidden';   // 锁死 html 滚动（消除下方空白/上下滑动）
      if (ep && typeof _demoSwitchEpisode === 'function') _demoSwitchEpisode(ep);
      _initVGStudio();
      _updateVGEpPickerLabel(ep || (typeof PAGE_DATA !== 'undefined' && PAGE_DATA.sbEp) || 1);
      _focusFirstShotWhenReady(shot);
    } else {
      vg.classList.remove('vg-studio-on');
      document.body.style.overflow = '';   // 恢复
      document.documentElement.style.overflow = '';
      if (vg.classList.contains('on')) {
        renderVGEpisodeBoard();
        const origin=vg.querySelector('#vg-episode-board [data-ep="' + CSS.escape(vg.dataset.studioEp||'1') + '"]');
        window.scrollTo({top:Number(vg.dataset.boardScroll)||0,behavior:'instant'});
        origin?.focus({preventScroll:true});
      }
    }
  }
  window.renderVGEpisodeBoard = renderVGEpisodeBoard;
  window.toggleVGView = toggleVGView;
  window.enterVGStudio = enterVGStudio;
  window.switchVGEpisode = switchVGEpisode;
  window.toggleVGEpPicker = toggleVGEpPicker;
  window.switchShot = switchShot;

  // === Topnav 角色标签（管理员 / 成员）===
  function setTopnavRole(role) {
    var badge = document.querySelector('.topnav-role-badge');
    if (!badge) return;
    if (role === 'admin') {
      badge.className = 'topnav-role-badge is-admin';
      badge.textContent = '管理员';
      badge.title = '管理员 · 点击管理成员';
      badge.onclick = function(e) { e.stopPropagation(); if(typeof openMemberPanel==='function')openMemberPanel(); };
    } else {
      badge.className = 'topnav-role-badge is-member';
      badge.textContent = '成员';
      badge.title = '成员 · 点击查看权限';
      badge.onclick = function(e) { e.stopPropagation(); if(typeof openMemberPanel==='function') openMemberPanel('readonly'); };
    }
  }
  setTopnavRole('admin');
  window.setTopnavRole = setTopnavRole;

  // === 视频生成提示词优化（润色）弹窗 ===
  // === 视频生成提示词优化（润色）弹窗 ===
  var _vgOptState = {};   // 按 ep_sid 保留进度，关闭不清空
  var _VG_OPT_CHIPS = [
    {label:'镜头语言', prompt:'请优化镜头语言描述，包括景别（特写/中近/远景）、镜头运动（推/拉/摇/跟）和视角方式，使画面更有电影感。'},
    {label:'画面氛围', prompt:'请强化画面氛围与情绪基调，包括光线质感、色温倾向（冷/暖/中性）和整体情绪，与剧情情感相匹配。'},
    {label:'人物动作', prompt:'请细化人物的动作与肢体语言，包括表情、姿态、眼神方向、微小动作，使角色更有存在感和真实感。'},
    {label:'光影质感', prompt:'请优化光影描述，包括光源位置、主光/辅光/背光关系、阴影软硬程度和光的颜色，提升视觉层次。'},
    {label:'节奏张力', prompt:'请调整描述节奏，通过动词选择和句式结构体现镜头的紧张度或舒缓度，与场景情绪匹配。'},
    {label:'细节质感', prompt:'请补充环境细节和质感描述，包括材质纹理、道具状态、背景层次和环境氛围细节，丰富画面信息。'}
  ];

  function openVGOptimizePanel(ep, sid) {
    ep = ep || '1'; sid = sid || '1';
    var key = ep + '_' + sid;
    var ta = document.querySelector('#v-g .sb-shot-section.vg-active .sb-prompt-ta');
    var origText = ta ? ta.value : '';

    var modal = document.getElementById('vg-optimize-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'vg-optimize-modal';
      modal.style.cssText = 'position:fixed;inset:0;z-index:300;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.6)';
      var card = document.createElement('div');
      var cw = Math.min(1100, window.innerWidth - 40) + 'px';
      var ch = (window.innerHeight - 40) + 'px';
      card.style.cssText = 'position:relative;width:'+cw+';height:'+ch+';max-height:'+ch+';background:var(--bg2);border:1px solid var(--bd);border-radius:12px;display:flex;flex-direction:column;overflow:hidden';

      // header
      var hd = document.createElement('div');
      hd.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:18px 24px 14px;border-bottom:1px solid var(--bd);flex-shrink:0';
      hd.innerHTML = '<h3 style="font-size:16px;font-weight:600;color:var(--t1);margin:0">提示词润色优化</h3><button type="button" class="vg-opt-close" style="background:none;border:none;color:var(--t3);font-size:18px;cursor:pointer;padding:4px 10px;border-radius:6px">✕</button>';
      card.appendChild(hd);

      // comparison area (top)
      var cmp = document.createElement('div');
      cmp.className = 'vg-opt-cmp';
      cmp.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:18px 24px 14px;flex:1 1 auto;min-height:0;overflow:hidden;grid-template-rows:1fr';
      var colL = document.createElement('div'); colL.style.cssText = 'display:flex;flex-direction:column;gap:8px;min-height:0';
      colL.innerHTML = '<div style="font-size:12px;font-weight:600;color:var(--t3)">原始提示词</div><textarea readonly style="flex:1 1 auto;min-height:140px;background:var(--bg1);border:1px solid var(--bd);border-radius:8px;color:var(--t1);font-size:13px;padding:12px 14px;resize:none;font-family:inherit;line-height:1.7;overflow-y:auto"></textarea>';
      var colR = document.createElement('div'); colR.style.cssText = 'display:flex;flex-direction:column;gap:8px;min-height:0;flex:1 1 auto';
      colR.innerHTML = '<div style="font-size:12px;font-weight:600;color:var(--t3)">优化结果</div><div class="vg-opt-result-wrap" style="display:none;flex:1 1 auto;min-height:0"><textarea readonly style="flex:1 1 auto;min-height:140px;background:var(--bg1);border:1px solid var(--bd);border-radius:8px;color:var(--t1);font-size:13px;padding:12px 14px;resize:none;font-family:inherit;line-height:1.7;overflow-y:auto;min-height:0"></textarea></div>';
      cmp.appendChild(colL); cmp.appendChild(colR);
      card.appendChild(cmp);

      // footer (bottom)
      var ft = document.createElement('div');
      ft.className = 'vg-opt-ft';
      ft.style.cssText = 'padding:14px 24px 18px;border-top:1px solid var(--bd);flex-shrink:0;display:flex;flex-direction:column;gap:10px';
      ft.innerHTML =
        '<textarea placeholder="描述优化需求，或点下方快捷指令…" rows="2" style="width:100%;background:var(--bg1);border:1px solid var(--bd);border-radius:8px;color:var(--t1);font-size:13px;padding:10px 14px;font-family:inherit;resize:none;min-height:52px;max-height:84px"></textarea>' +
        '<div class="vg-opt-chips" style="display:flex;gap:6px;flex-wrap:wrap"></div>' +
        '<div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;min-height:36px">' +
          '<span class="vg-opt-loading" style="font-size:13px;color:var(--t3);display:none;align-items:center;gap:8px"><span class="asset-ai-spin"></span>AI 润色中…</span>' +
          '<div class="vg-opt-complete-actions" style="display:none;gap:8px">' +
            '<button type="button" style="background:transparent;border:1px solid var(--bd);color:var(--t2);padding:8px 20px;border-radius:8px;font-size:13px;cursor:pointer">放弃</button>' +
            '<button type="button" style="background:rgba(255,255,255,0.12);color:var(--t1);font-weight:600;border:1px solid rgba(255,255,255,0.22);padding:8px 20px;border-radius:8px;font-size:13px;cursor:pointer">采纳</button>' +
          '</div>' +
          '<button type="button" class="vg-opt-gen-btn b gen-btn" style="margin:0"></button>' +
        '</div>';
      card.appendChild(ft);
      modal.appendChild(card);
      document.body.appendChild(modal);

      // chips
      var chipsEl = modal.querySelector('.vg-opt-chips');
      _VG_OPT_CHIPS.forEach(function(c) {
        var ch = document.createElement('span');
        ch.style.cssText = 'font-size:12px;padding:5px 12px;border-radius:18px;border:1px solid var(--bd);background:var(--bg1);color:var(--t2);cursor:pointer';
        ch.textContent = c.label;
        ch.onmouseenter = function() { ch.style.borderColor='rgba(255,255,255,0.3)'; ch.style.color='var(--t1)'; };
        ch.onmouseleave = function() { ch.style.borderColor=''; ch.style.color=''; };
        ch.onclick = function() { modal.querySelectorAll('.vg-opt-ft textarea')[0].value = c.prompt; _vgOptSync(modal); };
        chipsEl.appendChild(ch);
      });

      // gen btn
      var genBtn = modal.querySelector('.vg-opt-gen-btn');
      if (typeof _GEN_ICON !== 'undefined') genBtn.innerHTML = _GEN_ICON + '<span class="gen-score">1</span>生成';
      else genBtn.textContent = '生成';

      // close
      modal.querySelector('.vg-opt-close').onclick = function() { _vgOptSaveAndClose(modal, key); };
      modal.addEventListener('click', function(ev) { if (ev.target === modal) _vgOptSaveAndClose(modal, key); });

      // input sync
      modal.querySelectorAll('.vg-opt-ft textarea')[0].addEventListener('input', function() { _vgOptSync(modal); });

      // generate
      genBtn.addEventListener('click', function() {
        var req = modal.querySelectorAll('.vg-opt-ft textarea')[0].value.trim();
        if (!req) return;
        // loading stage
        modal.querySelector('.vg-opt-loading').style.display = 'flex';
        modal.querySelector('.vg-opt-chips').style.display = 'none';
        genBtn.style.display = 'none';
        genBtn.disabled = true;
        setTimeout(function() {
          var orig = colL.querySelector('textarea').value;
          var result = typeof _mockAssetPromptOptimize === 'function'
            ? _mockAssetPromptOptimize(orig, req)
            : orig + '\n\n[optimized: ' + req + ']';
          var resultTa = colR.querySelector('.vg-opt-result-wrap textarea');
          resultTa.value = result;
          colR.querySelector('.vg-opt-result-wrap').style.display = 'flex';
          resultTa.style.flex = '1 1 auto';
          resultTa.style.minHeight = '0';
          // done stage
          modal.querySelector('.vg-opt-loading').style.display = 'none';
          modal.querySelector('.vg-opt-complete-actions').style.display = 'flex';
          _vgOptState[key] = _vgOptState[key] || {};
          _vgOptState[key].result = result;
        }, 900);
      });

      // adopt
      modal.querySelector('.vg-opt-complete-actions button:last-child').onclick = function() {
        var result = colR.querySelector('.vg-opt-result-wrap textarea').value;
        var activeTa = document.querySelector('#v-g .sb-shot-section.vg-active .sb-prompt-ta');
        if (activeTa && result) { activeTa.value = result; activeTa.dispatchEvent(new Event('input', {bubbles:true})); }
        delete _vgOptState[key];
        modal.style.display = 'none';
      };

      // discard
      modal.querySelector('.vg-opt-complete-actions button:first-child').onclick = function() {
        colR.querySelector('.vg-opt-result-wrap').style.display = 'none';
        colR.querySelector('.vg-opt-result-wrap textarea').value = '';
        modal.querySelector('.vg-opt-complete-actions').style.display = 'none';
        modal.querySelector('.vg-opt-loading').style.display = 'none';
        modal.querySelector('.vg-opt-chips').style.display = 'flex';
        genBtn.style.display = '';
        genBtn.disabled = false;
        if (_vgOptState[key]) delete _vgOptState[key].result;
      };
    }

    // restore state
    modal.querySelectorAll('.vg-opt-cmp textarea')[0].value = origText;
    var saved = _vgOptState[key] || {};
    modal.querySelectorAll('.vg-opt-ft textarea')[0].value = saved.input || '';
    if (saved.result) {
      modal.querySelector('.vg-opt-result-wrap').style.display = 'flex';
      modal.querySelector('.vg-opt-result-wrap textarea').value = saved.result;
      modal.querySelector('.vg-opt-result-wrap textarea').style.flex = '1 1 auto';
      modal.querySelector('.vg-opt-result-wrap textarea').style.minHeight = '0';
      modal.querySelector('.vg-opt-complete-actions').style.display = 'flex';
      modal.querySelector('.vg-opt-gen-btn').style.display = 'none';
      modal.querySelector('.vg-opt-chips').style.display = 'none';
    } else {
      modal.querySelector('.vg-opt-result-wrap').style.display = 'none';
      modal.querySelector('.vg-opt-complete-actions').style.display = 'none';
      modal.querySelector('.vg-opt-loading').style.display = 'none';
      modal.querySelector('.vg-opt-gen-btn').style.display = '';
      modal.querySelector('.vg-opt-chips').style.display = 'flex';
    }
    _vgOptSync(modal);

    modal.querySelectorAll('.vg-opt-ft textarea')[0].oninput = function() {
      _vgOptState[key] = _vgOptState[key] || {};
      _vgOptState[key].input = this.value;
      _vgOptSync(modal);
    };
    modal.setAttribute('data-key', key);
    modal.style.display = 'flex';
  }

    function _vgOptSync(modal) {
    var btn = modal.querySelector('.vg-opt-gen-btn');
    var input = modal.querySelectorAll('.vg-opt-ft textarea')[0];
    if (btn && input) btn.disabled = !input.value.trim();
  }
  function _vgOptSaveAndClose(modal, key) {
    var saved = _vgOptState[key] || {};
    saved.input = modal.querySelectorAll('.vg-opt-ft textarea')[0].value;
    _vgOptState[key] = saved;
    modal.style.display = 'none';
  }
  
window.openVGOptimizePanel = openVGOptimizePanel;

  // === 改编确认弹窗（要点2）：去掉独立特殊要求按钮，点改编时弹窗填写 ===
  var _ADAPT_UNIT_PRICE = 5;          // 单集改编单价（豆）
  var _ADAPT_PAGE_EPS = 10;           // 改编页当前集数
  var _adaptReqBatches = [];          // 已执行的需求批次 [{ep, text}]
  function openAdaptConfirmModal(mode, ep) {
    var modal = document.getElementById('adapt-confirm-modal');
    if (!modal) return;
    var isAll = mode === 'all';
    var epNum = parseInt(ep, 10) || 0;
    document.getElementById('adapt-confirm-title').textContent = isAll ? '批量改编全部剧集' : ('重新改编 E' + (epNum < 10 ? '0' + epNum : epNum));
    document.getElementById('adapt-confirm-range').textContent = isAll ? ('当前页全部 ' + _ADAPT_PAGE_EPS + ' 集') : ('仅第 ' + epNum + ' 集');
    var price = _ADAPT_UNIT_PRICE * (isAll ? _ADAPT_PAGE_EPS : 1);
    document.getElementById('adapt-confirm-score').innerHTML = _beanScore(price);
    var ta = document.getElementById('adapt-requirements');
    if (ta) { var saved = ta.getAttribute('data-saved'); ta.value = saved !== null ? saved : ''; }
    modal.dataset.mode = mode; modal.dataset.ep = ep || '';
    modal.classList.add('on'); modal.setAttribute('aria-hidden', 'false');
    setTimeout(function(){ if (ta) ta.focus(); }, 30);
  }
  function closeAdaptConfirmModal() {
    var modal = document.getElementById('adapt-confirm-modal');
    if (modal) { modal.classList.remove('on'); modal.setAttribute('aria-hidden', 'true'); }
  }
  function confirmAdaptRun() {
    var modal = document.getElementById('adapt-confirm-modal');
    if (!modal) return;
    var mode = modal.dataset.mode;
    var epNum = parseInt(modal.dataset.ep, 10);
    var ta = document.getElementById('adapt-requirements');
    var req = ta ? String(ta.value || '').trim() : '';
    if (ta) { ta.setAttribute('data-saved', req); ta.value = req; }   // 供 getAdaptRequirements 读取
    closeAdaptConfirmModal();
    _recordAdaptBatch(mode, epNum, req);
    if (mode === 'all') { if (typeof smartAdaptEpisodes === 'function') smartAdaptEpisodes(); }
    else { if (typeof adaptEp === 'function') adaptEp(epNum); }
  }
  function _recordAdaptBatch(mode, ep, req) {
    if (!req) return;   // 留空不回显
    var eps = mode === 'all' ? [1,2,3,4,5,6,7,8,9,10] : [ep];
    eps.forEach(function(e){ _adaptReqBatches.push({ ep: e, text: req }); _renderAdaptReqBadge(e, req); });
  }
  function _renderAdaptReqBadge(ep, text) {
    var detail = document.querySelector('.ast-sb-ep[data-ep="' + ep + '"]');
    if (!detail) return;
    var head = detail.querySelector('.ast-sb-ep-head');
    if (!head) return;
    var adaptBtn = head.querySelector('.ast-sb-ep-adapt-btn');
    var badge = head.querySelector('.adapt-req-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'adapt-req-badge';
      if (adaptBtn && adaptBtn.parentNode) adaptBtn.parentNode.insertBefore(badge, adaptBtn); else head.appendChild(badge);
    }
    badge.textContent = '要求：' + text;
    badge.title = '点击查看完整改编要求';
    badge.onclick = function(ev){ ev.preventDefault(); ev.stopPropagation(); _showAdaptReqFull(text); };
  }
  function _showAdaptReqFull(text) {
    var old = document.getElementById('adapt-req-full-modal');
    if (old) old.remove();
    var m = document.createElement('div');
    m.id = 'adapt-req-full-modal';
    m.className = 'dialog-backdrop on';
    m.setAttribute('aria-hidden', 'false');
    var safe = String(text || '').replace(/</g, '&lt;');
    m.innerHTML = '<div class="sb-modal" onclick="event.stopPropagation()" role="dialog" aria-modal="true" style="width:min(440px,calc(100vw - 32px))">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
      '<h3 style="margin:0;font-size:15px">本批次改编要求</h3>' +
      '<button type="button" class="b" onclick="document.getElementById(\'adapt-req-full-modal\').remove()" style="padding:4px 10px;font-size:13px">关闭</button></div>' +
      '<p style="margin:0;font-size:13px;line-height:1.7;color:var(--t1);white-space:pre-wrap">' + safe + '</p></div>';
    m.onclick = function(){ m.remove(); };
    document.body.appendChild(m);
  }
  // Demo 预置 mock 改编需求回显（要点2 展示）
  function _injectMockAdaptReqBadges(){
    var mocks = {
      1: '突出女主面对家族压力时的隐忍与反击，对白更克制、情绪更内敛',
      2: '增加男主内心独白，强化两人初次交锋的情感张力'
    };
    Object.keys(mocks).forEach(function(ep){ _renderAdaptReqBadge(parseInt(ep, 10), mocks[ep]); });
  }
  window.openAdaptConfirmModal = openAdaptConfirmModal;
  window.closeAdaptConfirmModal = closeAdaptConfirmModal;
  window.confirmAdaptRun = confirmAdaptRun;

  _renderAdaptProgressBoard();
  _injectEpStartBtns();
  renderVGEpisodeBoard();
  _injectMockAdaptReqBadges();
  // 延迟加载剧情（展开时才加载）
  var storyOverview = document.getElementById('adapt-story-overview');
  if (storyOverview) {
    storyOverview.addEventListener('toggle', function() {
      if (storyOverview.open) _loadAdaptStoryData();
    });
  }
  // 页面加载时也注入每集 summary
  setTimeout(function() { _loadAdaptStoryData(); }, 1500);
