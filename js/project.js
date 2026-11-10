// ========== 项目详情页脚本 ==========

// ==================== 0. 浏览器历史管理 ====================

/**
 * 处理浏览器前进/后退按钮
 * 当用户点击浏览器的前进/后退时，根据 URL 切换页面
 */
window.addEventListener('popstate', function(event) {
  // 读取 URL 中的 view 参数
  const url = new URL(window.location);
  const viewParam = url.searchParams.get('view');

  // 将 URL 参数映射回内部 ID
  const urlToViewMap = {
    'asset': 'a',     // 资产库
    'adapt': 'adapt', // 剧集改编
    'video': 'g',     // 视频生成
    'g': 'g'          // 兼容旧链接
  };

  const view = viewParam ? (urlToViewMap[viewParam] || 'p') : 'p';

  // 切换到对应的页面（不添加历史记录）
  switchViewWithoutHistory(view);
});

/**
 * 切换视图，但不修改浏览器历史
 * 用于响应 popstate 事件
 */
function switchViewWithoutHistory(which) {
  document.querySelectorAll(".vw").forEach((e) => e.classList.remove("on"));
  const targetView = document.getElementById("v-" + which);
  if (targetView) {
    targetView.classList.add("on");
  }

  document.querySelectorAll(".topnav .step").forEach((s) => s.classList.remove("on"));
  const targetStep = document.querySelector(`.topnav .step[data-view="${which}"]`);
  if (targetStep) {
    targetStep.classList.add("on");
  }
  updateTopnavStepStates(which);
  renderSyncedNoticeIfAny(which);
  renderEpisodeRegenNotice(which);

  // DEMO：追踪实时视图；切到视频页('g')时刷新集数面板状态
  window.SB_VIEW_LIVE = (which === 'g') ? 'video' : which;
  if (which === 'g') {
    if (typeof refreshEpisodeStatusBadges === "function") refreshEpisodeStatusBadges();
  }
  // 离开视频生成（切到项目/资产库/剧集改编）时，若正处于工作室态则退出并恢复页面滚动。
  // 工作室态会锁死 body/html overflow（键盘翻页设计），不恢复会导致其他功能页无法上下滚动。
  if (which !== 'g') {
    var _vgEl = document.getElementById('v-g');
    if (_vgEl && _vgEl.classList.contains('vg-studio-on') && typeof toggleVGView === 'function') {
      toggleVGView('board');
    }
  }
}

const TOPNAV_HINT_SEEN_KEY = "dr_topnav_click_hint_seen_v1";
let topnavHintTimer = null;

function markTopnavHintSeen() {
  try {
    localStorage.setItem(TOPNAV_HINT_SEEN_KEY, "1");
  } catch (_) {}
  const hint = document.getElementById("topnav-click-hint");
  if (hint) {
    hint.classList.remove("on");
    hint.setAttribute("aria-hidden", "true");
  }
  const stepsWrap = document.querySelector(".topnav .steps");
  if (stepsWrap) {
    stepsWrap.classList.remove("intro");
  }
  if (topnavHintTimer) {
    clearTimeout(topnavHintTimer);
    topnavHintTimer = null;
  }
}

function shouldShowTopnavHintOnce() {
  try {
    return localStorage.getItem(TOPNAV_HINT_SEEN_KEY) !== "1";
  } catch (_) {
    return true;
  }
}

function initTopnavClickHint() {
  if (!shouldShowTopnavHintOnce()) return;
  const hint = document.getElementById("topnav-click-hint");
  const stepsWrap = document.querySelector(".topnav .steps");
  if (!hint || !stepsWrap) return;
  hint.classList.add("on");
  hint.setAttribute("aria-hidden", "false");
  stepsWrap.classList.add("intro");
  topnavHintTimer = setTimeout(() => {
    markTopnavHintSeen();
  }, 3000);
}

// ==================== 0. 通用按钮状态管理器 ====================
class ButtonStateManager {
  constructor(btn) {
    this.btn = btn;
    var lb = btn.querySelector('.gen-shot-label, .gen-label');
    this.isGenBtn = !!lb;
    this.originalText = lb ? lb.textContent : btn.textContent;
    this.originalDisabled = btn.disabled;
    this.originalClasses = Array.from(btn.classList);
  }

  _setText(text) {
    var lb = this.btn.querySelector('.gen-shot-label, .gen-label');
    if (lb) lb.textContent = text;
    else this.btn.textContent = text;
  }

  loading(text) {
    this.btn.disabled = true;
    this._setText(text || (this.originalText + "中..."));
    this.btn.classList.add("btn-loading");
  }

  success(text, duration = 1500) {
    this.btn.classList.remove("btn-loading");
    this.btn.classList.add("btn-success");
    this._setText(text || "✓ 完成");
    this.btn.disabled = true;

    setTimeout(() => this.reset(), duration);
  }

  error(text, duration = 2000) {
    this.btn.classList.remove("btn-loading");
    this.btn.classList.add("btn-error");
    this._setText(text || "操作失败");
    this.btn.disabled = false;

    setTimeout(() => this.reset(), duration);
  }

  reset() {
    this.btn.classList.remove("btn-loading", "btn-success", "btn-error");
    this._setText(this.originalText);
    this.btn.disabled = this.originalDisabled;
  }
}

// ==================== 1. 全局变量和配置 ====================
const PID = window.PAGE_DATA.pid;
const CURRENT_VIEW = String(window.PAGE_DATA.currentView || "").trim();
const ANALYZE_DONE = window.PAGE_DATA.analyzeDone;
const SB_EP = window.PAGE_DATA.sbEp;
const SB_EPISODE_NUMS = Array.isArray(window.PAGE_DATA.sbEpisodeNums) ? window.PAGE_DATA.sbEpisodeNums : [];
const SB_PREVIEW_FINALS = window.PAGE_DATA.sbPreviewFinals;
const SB_DL_ITEMS = window.PAGE_DATA.sbDlItems;
const SB_SHOT_VERSIONS = window.PAGE_DATA.sbShotVersions || {};

// Demo: 为历史版本注入 mock 提示词数据（实际部署由后端提供 prompt 字段）
(function _injectShotVersionPrompts() {
  var now = Date.now();
  var HOUR = 3600000;
  var DAY = 86400000;

  function fmtTime(ts) {
    var d = new Date(ts);
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    var hh = String(d.getHours()).padStart(2, '0');
    var mi = String(d.getMinutes()).padStart(2, '0');
    return mm + '-' + dd + ' ' + hh + ':' + mi;
  }

  // 从当前页面 textarea 中提取现有提示词作为当前版本的 prompt
  document.querySelectorAll('.sb-shot-section').forEach(function(sec) {
    var sid = sec.getAttribute('data-sid');
    if (!sid) return;
    var ta = sec.querySelector('.sb-prompt-ta');
    var currentPrompt = ta ? ta.value : '';
    var state = SB_SHOT_VERSIONS[String(sid)];
    if (state && state.history) {
      state.history.forEach(function(h) {
        if (!h.prompt) h.prompt = currentPrompt;
        if (!h.created_at) h.created_at = fmtTime(now - 2 * HOUR);
      });
    }
  });

  // 为多个镜头增加额外历史版本
  var extraVersions = {
    '1': [
      {
        prompt: '【风格核心】电影级写实，偏暖调。\n@[hotel_stairwell_night_warm] 是Hotel Stairwell\n北美豪华酒店室内楼梯间，暖黄色射灯和紫色氛围灯，胡桃木扶手与大理石楼梯。\n@[Sophia_Smith_Black_White_Top] 是Sophia Smith\n22岁白人女性，棕色微卷长发，穿白色圆领内搭与黑色一字肩长袖针织衫。\n@[Beer_Can] 是Beer Can\n红色铝制易拉罐装啤酒，金属材质表面光滑。\n分镜1：\n景别：全景，平视。\n构图：中心对称，@[Sophia_Smith_Black_White_Top] 位于画面中央。\n运镜手法：缓慢推镜，从全景推至中景。\n画面内容：@[Sophia_Smith_Black_White_Top] 站姿，位于楼梯平台中央，右手握着@[Beer_Can]，左手自然下垂。暖黄色光线打在侧脸，先微微一笑，然后低头看手中的啤酒罐。\n分镜2：\n景别：近景。\n运镜手法：固定机位。\n画面内容：侧脸特写，眉头微蹙，眼神迷离，暖黄色光线勾勒出面部轮廓。她轻声说「你怎么才来」，语气带着一丝醉意。\n无BGM，仅保留对白和场景音效。',
        version: 'v0001', file_path: '1/1_v0001.mp4', created_at: fmtTime(now - 1 * DAY - 3 * HOUR)
      },
      {
        prompt: '【风格核心】动画风格，赛璐璐渲染。\n@[hotel_stairwell_night_warm] 是Hotel Stairwell\n动漫风格楼梯间，暖色调光影。\n@[Sophia_Smith_Black_White_Top] 是Sophia Smith\n动漫女性角色，棕色长发。\n分镜1：\n景别：全景。\n运镜手法：固定机位。\n画面内容：角色站在楼梯上，暖色光晕效果。',
        version: 'v0002', file_path: '1/1_v0002.mp4', created_at: fmtTime(now - 2 * DAY)
      }
    ],
    '2': [
      {
        prompt: '【风格核心】电影级写实，深色调。\n@[hotel_stairwell_night_warm] 是Hotel Stairwell\n北美豪华酒店室内楼梯间，光线昏暗，仅靠墙角微弱的暖光勾勒出楼梯轮廓。\n@[Sophia_Smith_Black_White_Top] 是Sophia Smith\n22岁白人女性，棕色微卷长发，穿黑色一字肩长袖针织衫。\n@[David_Chen_Gray_Suit] 是David Chen\n35岁亚裔男性，短发利落，深灰色西装。\n分镜1：\n景别：中景。\n运镜手法：缓慢跟拍。\n画面内容：@[Sophia_Smith_Black_White_Top] 与@[David_Chen_Gray_Suit] 在楼梯间相遇。他停下脚步，她抬头看向对方，两人对视。昏暗光线中面部仅有一侧被照亮。他沉声说「我一直在找你」，语气严肃。',
        version: 'v0001', file_path: '1/2_v0001.mp4', created_at: fmtTime(now - 5 * HOUR)
      }
    ],
    '3': [
      {
        prompt: '【风格核心】电影级写实，冷色调。\n@[hotel_stairwell_night_warm] 是Hotel Stairwell\n北美豪华酒店室内楼梯间，冷白色灯光与蓝色氛围灯交织，大理石地面反射冷光。\n@[Sophia_Smith_Black_White_Top] 是Sophia Smith\n22岁白人女性，棕色微卷长发，穿白色圆领内搭与黑色一字肩长袖针织衫。\n分镜1：\n景别：全景，俯视。\n构图：对角线构图，@[Sophia_Smith_Black_White_Top] 位于画面左下方。\n运镜手法：缓慢横移。\n画面内容：@[Sophia_Smith_Black_White_Top] 坐在楼梯台阶上，双手抱膝，头微微低下。冷白色灯光从上方洒落，在地面形成鲜明光斑。\n她低声说「我不知道该怎么办」，声音几乎听不见。',
        version: 'v0001', file_path: '1/3_v0001.mp4', created_at: fmtTime(now - 1 * DAY)
      }
    ],
    '5': [
      {
        prompt: '【风格核心】电影级写实，高对比度。\n@[luxury_hotel_suite_night] 是Luxury Hotel Suite\n北美豪华酒店套房，落地窗外城市夜景灯火通明，室内暖色台灯与冷色月光交织。\n@[Sophia_Smith_Black_White_Top] 是Sophia Smith\n22岁白人女性，棕色微卷长发。\n@[David_Chen_Gray_Suit] 是David Chen\n35岁亚裔男性，短发利落，深灰色西装。\n分镜1：\n景别：中近景。\n运镜手法：手持微晃。\n画面内容：@[Sophia_Smith_Black_White_Top] 站在落地窗前，背影面对镜头，窗外霓虹灯光映在玻璃上。@[David_Chen_Gray_Suit] 从身后走来，伸出手搭在她肩上。她微微侧头。\n她转过身，轻声说「我们还能回去吗」，眼中泛着泪光。',
        version: 'v0001', file_path: '1/5_v0001.mp4', created_at: fmtTime(now - 8 * HOUR)
      }
    ],
    '8': [
      {
        prompt: '【风格核心】电影级写实，暗调高反差。\n@[hotel_corridor_night] 是Hotel Corridor\n北美豪华酒店走廊，两侧客房门紧闭，壁灯发出昏黄光线，地毯深红色。\n@[David_Chen_Gray_Suit] 是David Chen\n35岁亚裔男性，西装领带松开，步伐急促。\n分镜1：\n景别：跟拍中景。\n运镜手法：斯坦尼康跟拍，保持等距。\n画面内容：@[David_Chen_Gray_Suit] 沿走廊快步走来，皮鞋踩在地毯上几乎无声。经过一扇门时突然停下，侧耳倾听。伸手去拧门把手，犹豫了一下又缩回手。他深吸一口气说「这次我不会再犹豫了」，推门而入。',
        version: 'v0001', file_path: '1/8_v0001.mp4', created_at: fmtTime(now - 6 * HOUR)
      }
    ]
  };

  Object.keys(extraVersions).forEach(function(sid) {
    var state = SB_SHOT_VERSIONS[sid];
    if (state && state.history) {
      extraVersions[sid].forEach(function(v) {
        state.history.unshift(v);
      });
    }
  });
})();
let ENABLE_VIDEO_EXTEND = !!(window.PAGE_DATA && window.PAGE_DATA.enableVideoExtend);
const ASSET_ACTIONS_ENABLED = window.PAGE_DATA.assetActionsEnabled;
const MIN_SHOT_DURATION_SEC = 1;
const MAX_SHOT_DURATION_SEC = 15;
const ASSET_STATS = window.PAGE_DATA.stats || {};
const TOTAL_ASSETS = Number(ASSET_STATS.characters || 0) + Number(ASSET_STATS.scenes || 0) + Number(ASSET_STATS.props || 0);
const ADAPTED_ASSETS = Number(ASSET_STATS.assets_adapted || 0);
const GENERATED_ASSETS = Number(ASSET_STATS.assets_generated || 0);
const REVIEW_BATCH_TOTAL = Number(ASSET_STATS.review_batch_total || 0);
const REVIEW_BATCH_DONE = Number(ASSET_STATS.review_batch_done || 0);
const CHAR_GROUPS_TOTAL = Number(ASSET_STATS.char_groups_total || 0);
const GROUPS_APPROVED = Number(ASSET_STATS.groups_approved || 0);
const REMAINING_OUTFITS_TOTAL = Number(ASSET_STATS.remaining_outfits_total || 0);
const REMAINING_OUTFITS_DONE = Number(ASSET_STATS.remaining_outfits_done || 0);
let ASSET_PIPELINE_PHASE = String(ASSET_STATS.asset_pipeline_phase || "2a");
const ASSET_ADAPT_RUNNING_SSR = Boolean(window.PAGE_DATA && window.PAGE_DATA.assetAdaptRunning);
const ASSET_BATCH_RUNNING_SSR = Boolean(window.PAGE_DATA && window.PAGE_DATA.assetBatchRunning);
const ASSET_BATCH_TASK_SSR = window.PAGE_DATA && window.PAGE_DATA.assetBatchTask
  ? String(window.PAGE_DATA.assetBatchTask)
  : "";
const ASSET_BATCH_STALE_SSR = Boolean(window.PAGE_DATA && window.PAGE_DATA.assetBatchStale);
const ASSET_BATCH_FORCE_REGEN_SSR = Boolean(window.PAGE_DATA && window.PAGE_DATA.assetBatchForceRegenerate);
const ASSET_SYNC_NOTICE_KEY = "dr_asset_sync_notice_" + String(PID);
const SHOT_REGEN_NOTICE_KEY = "dr_shot_regen_notice_" + String(PID);
const SHOT_TASK_STREAMS = new Map();
const EP_GENERATION_INFLIGHT = new Set();
const SHOT_PROMPT_MIN_CHARS = 140;
const SHOT_NEGATIVE_ASSET_PHRASES = ["不在画面中", "未出现", "不是本镜头内容", "并未出现"];
let ACTIVE_EPISODE_STATUS_POLLER = null;

function _epGenerationKey(ep) {
  return String(ep == null ? "" : ep).trim();
}

function _acquireEpGenerationInflight(ep) {
  const key = _epGenerationKey(ep);
  if (!key) return false;
  if (EP_GENERATION_INFLIGHT.has(key)) return false;
  EP_GENERATION_INFLIGHT.add(key);
  return true;
}

function _releaseEpGenerationInflight(ep) {
  const key = _epGenerationKey(ep);
  if (!key) return;
  EP_GENERATION_INFLIGHT.delete(key);
}

// ── 任务持久化（localStorage）──
// key: "sdr_tasks_{pid}"  value: [{ep, sid, taskId, startedAt}]
const _TASK_STORE_KEY = "sdr_tasks_" + (window.PAGE_DATA && window.PAGE_DATA.pid || "");

function _persistTask(ep, sid, taskId) {
  try {
    const raw = localStorage.getItem(_TASK_STORE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    // 去掉同一镜头的旧条目
    const filtered = list.filter(t => !(String(t.ep) === String(ep) && String(t.sid) === String(sid)));
    filtered.push({ ep: String(ep), sid: String(sid), taskId: String(taskId), startedAt: Date.now() });
    localStorage.setItem(_TASK_STORE_KEY, JSON.stringify(filtered));
  } catch (_) {}
}

function _clearPersistedTask(ep, sid) {
  try {
    const raw = localStorage.getItem(_TASK_STORE_KEY);
    if (!raw) return;
    const list = JSON.parse(raw);
    const filtered = list.filter(t => !(String(t.ep) === String(ep) && String(t.sid) === String(sid)));
    localStorage.setItem(_TASK_STORE_KEY, JSON.stringify(filtered));
  } catch (_) {}
}

function _getPersistedTasks() {
  try {
    const raw = localStorage.getItem(_TASK_STORE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    // 过滤超过 2 小时的旧任务（防止脏数据积累）
    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    return list.filter(t => t.startedAt > cutoff);
  } catch (_) { return []; }
}

function _shotTaskStreamKey(ep, sid) {
  return String(ep) + ":" + String(sid);
}

function isShotTaskGenerating(ep, sid) {
  const key = _shotTaskStreamKey(ep, sid);
  if (SHOT_TASK_STREAMS.has(key)) return true;
  const epStr = String(ep);
  const sidStr = String(sid);
  return _getPersistedTasks().some(
    (t) => String(t.ep) === epStr && String(t.sid) === sidStr
  );
}

function getShotGenIdleText(btn) {
  if (!btn) return "生成视频片段";
  const hasVideo = btn.getAttribute("data-has-video") === "1";
  const attr = hasVideo ? btn.getAttribute("data-regen-text") : btn.getAttribute("data-gen-text");
  return String(attr || "").trim() || (hasVideo ? "重新生成视频片段" : "生成视频片段");
}

async function resumePersistedShotTasks() {
  const tasks = _getPersistedTasks();
  if (!tasks.length) return;

  for (const t of tasks) {
    const ep = t.ep;
    const sid = t.sid;
    const taskId = t.taskId;
    if (CURRENT_VIEW === "video" && SB_EP && String(ep) !== String(SB_EP)) continue;

    const encodedPid = encodeURIComponent(PID);
    const encodedSid = encodeURIComponent(String(sid));
    const encodedTaskId = encodeURIComponent(String(taskId));

    try {
      const resp = await fetch(
        `/api/projects/${encodedPid}/episodes/${ep}/shots/${encodedSid}/tasks/${encodedTaskId}`,
        { cache: "no-store" }
      );
      if (resp.status === 404) {
        _clearPersistedTask(ep, sid);
        continue;
      }
      if (!resp.ok) continue;
      const snapshot = await resp.json();
      const st = String(snapshot.status || "");
      if (st === "succeeded") {
        _clearPersistedTask(ep, sid);
        if (CURRENT_VIEW === "video" && String(ep) === String(SB_EP)) {
          const filePath = String(snapshot.file_path || "").trim() || `${ep}/${sid}.mp4`;
          updateShotPreview(sid, filePath, true);
        }
        continue;
      }
      if (st === "failed") {
        _clearPersistedTask(ep, sid);
        continue;
      }
    } catch (_) {
      continue;
    }

    const shotSection = document.getElementById("sb-shot-" + sid);
    const btn = shotSection ? shotSection.querySelector(".sb-gen-big") : null;
    const idleText = getShotGenIdleText(btn);

    if (btn) {
      btn.setAttribute("data-generating", "1");
      btn.disabled = true;
      btn.textContent = "生成中（恢复）...";
      btn.classList.add("btn-loading");
      btn.classList.remove("btn-error", "btn-success");
      btn.setAttribute("aria-busy", "true");
    }
    setShotGeneratingStatus(sid, true);
    syncTopBarForShotTask(ep, sid);

    watchShotTaskBySSE(ep, sid, taskId, btn, idleText);
    console.info("[sdr] 已恢复监听任务 sid=" + sid + " taskId=" + taskId);
  }
}

// ── 单张素材图异步任务（localStorage + HTTP 轮询）──
const ASSET_TASK_POLLERS = new Map();
const ASSET_TASK_POLL_MAX_ERRORS = 3;
const _ASSET_TASK_STORE_KEY = "sdr_asset_tasks_" + (window.PAGE_DATA && window.PAGE_DATA.pid || "");

function _persistAssetTask(kind, aid, taskId) {
  try {
    const raw = localStorage.getItem(_ASSET_TASK_STORE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(
      (t) => !(String(t.kind) === String(kind) && String(t.aid) === String(aid))
    );
    filtered.push({
      kind: String(kind),
      aid: String(aid),
      taskId: String(taskId),
      startedAt: Date.now(),
    });
    localStorage.setItem(_ASSET_TASK_STORE_KEY, JSON.stringify(filtered));
  } catch (_) {}
}

function _clearPersistedAssetTask(kind, aid) {
  try {
    const raw = localStorage.getItem(_ASSET_TASK_STORE_KEY);
    if (!raw) return;
    const list = JSON.parse(raw);
    const filtered = list.filter(
      (t) => !(String(t.kind) === String(kind) && String(t.aid) === String(aid))
    );
    localStorage.setItem(_ASSET_TASK_STORE_KEY, JSON.stringify(filtered));
  } catch (_) {}
}

function _getPersistedAssetTasks() {
  try {
    const raw = localStorage.getItem(_ASSET_TASK_STORE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    return list.filter((t) => t.startedAt > cutoff);
  } catch (_) {
    return [];
  }
}

function _assetTaskStreamKey(kind, aid) {
  return String(kind) + ":" + String(aid);
}

function findAssetCardElement(kind, aid) {
  const targetAid = String(aid || "").trim();
  const targetKind = String(kind || "").trim();
  if (!targetAid || !targetKind) return null;
  const allCards = document.getElementById(targetKind + "-all-cards");
  if (allCards) {
    let card = null;
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
      card = allCards.querySelector('.asset-card[data-aid="' + CSS.escape(targetAid) + '"]');
    }
    if (!card) {
      card = Array.from(allCards.querySelectorAll(".asset-card[data-aid]")).find(
        (el) => String(el.getAttribute("data-aid") || "").trim() === targetAid
      ) || null;
    }
    if (card) return card;
  }
  const editContainer = document.getElementById(targetKind + "-edit-container");
  if (editContainer) {
    const card = editContainer.querySelector(".asset-card");
    if (card && String(card.getAttribute("data-aid") || "").trim() === targetAid) {
      return card;
    }
  }
  return null;
}

function findAssetGenerateButton(card) {
  if (!card) return null;
  const buttons = card.querySelectorAll("button");
  for (let i = 0; i < buttons.length; i++) {
    const text = String(buttons[i].textContent || "").trim();
    if (text === "生成素材图" || text.indexOf("生成中") >= 0 || text.indexOf("已生成") >= 0) {
      return buttons[i];
    }
  }
  return null;
}

function applyAssetGenerateResult(card, kind, aid, response) {
  if (!response || typeof response !== "object") return;
  const synced = response.synced || {};
  const syncedShots = Number(synced.changed_shots || 0);
  const syncedAssets = Number(synced.changed_assets || 0);
  if (typeof applySyncedAssetRefImgs === "function") {
    applySyncedAssetRefImgs(synced.affected_assets);
  }
  if (syncedShots > 0 && typeof saveAssetSyncNotice === "function") {
    saveAssetSyncNotice({
      kind: kind,
      aid: aid,
      version: "latest",
      changed_shots: syncedShots,
      changed_storyboards: Number(synced.changed_storyboards || 0),
      replaced_refs: Number(synced.replaced_refs || 0),
      affected_shots: Array.isArray(synced.affected_shots) ? synced.affected_shots : [],
      changed_assets: syncedAssets,
    });
  }
  const latestRow =
    typeof syncAssetRowFromResponse === "function"
      ? syncAssetRowFromResponse(kind, aid, response)
      : null;
  const latestFilePath =
    (latestRow && latestRow.file_path) || response.file_path;
  if (card && latestFilePath) {
    const thumb = card.querySelector(".thumb");
    const newSrc = "/files/" + PID + "/" + latestFilePath + "?t=" + Date.now();
    if (thumb && thumb.tagName === "IMG") {
      thumb.src = newSrc;
      thumb.setAttribute("title", "点击查看大图");
    } else if (thumb) {
      const img = document.createElement("img");
      img.className = "thumb";
      img.src = newSrc;
      img.width = 176;
      img.height = 176;
      img.alt = "";
      img.setAttribute("title", "点击查看大图");
      img.setAttribute("referrerpolicy", "no-referrer");
      if (typeof openAssetImgLightbox === "function") {
        img.addEventListener("click", function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          openAssetImgLightbox(
            img.currentSrc || img.src || "",
            typeof extractDisplayNameFromRefSource === "function"
              ? extractDisplayNameFromRefSource(img.currentSrc || img.src || "")
              : ""
          );
        });
      }
      thumb.replaceWith(img);
    }
    document.querySelectorAll(".char-outfit-grid .char-outfit-card").forEach(function (cardEl) {
      const onclick = String(cardEl.getAttribute("onclick") || "");
      if (onclick.indexOf("'" + aid + "'") >= 0 || onclick.indexOf('"' + aid + '"') >= 0) {
        const imgEl = cardEl.querySelector(".char-outfit-img img");
        if (imgEl) imgEl.src = newSrc;
      }
    });
    const groupEl = document.querySelector('.char-group.asset-group[data-kind="' + kind + '"]');
    if (groupEl) {
      const repImg = groupEl.querySelector(".char-group-rep img");
      if (repImg && card && card.querySelector('[data-field="name_trans"]')) {
        const isLeaderCard = typeof window.isCharacterGroupLeader === "function"
          ? window.isCharacterGroupLeader(aid)
          : false;
        if (isLeaderCard) repImg.src = newSrc;
      }
    }
  }
  if (syncedShots > 0 || syncedAssets > 0) {
    const parts = [];
    if (syncedShots > 0) parts.push(syncedShots + " 个镜头");
    if (syncedAssets > 0) parts.push(syncedAssets + " 个素材");
    toast("已生成：" + aid + "，并同步 " + parts.join("、") + " 引用", false, 4500);
  } else {
    toast("已生成：" + aid, false);
  }
}

function renderAssetTaskProgress(btn, snapshot, idleText) {
  if (!btn || !snapshot) return;
  const st = String(snapshot.status || "");
  if (st === "queued" || st === "running") {
    btn.disabled = true;
    btn.setAttribute("data-generating", "1");
    btn.setAttribute("aria-busy", "true");
    btn.classList.add("btn-loading");
    btn.classList.remove("btn-error", "btn-success");
    const msg = String(snapshot.message || "").trim();
    btn.textContent = msg ? "生成中… " + msg : "生成中…";
    return;
  }
  if (st === "succeeded") {
    btn.classList.remove("btn-loading");
    btn.classList.add("btn-success");
    btn.textContent = "✓ 已生成";
    btn.disabled = true;
    btn.removeAttribute("data-generating");
    btn.removeAttribute("aria-busy");
    setTimeout(function () {
      btn.classList.remove("btn-success");
      btn.textContent = idleText || "生成素材图";
      btn.disabled = false;
    }, 2000);
    return;
  }
  if (st === "failed") {
    btn.disabled = false;
    btn.removeAttribute("data-generating");
    btn.removeAttribute("aria-busy");
    btn.classList.remove("btn-loading");
    btn.classList.add("btn-error");
    btn.textContent = "生成失败";
    setTimeout(function () {
      btn.classList.remove("btn-error");
      btn.textContent = idleText || "生成素材图";
    }, 2000);
  }
}

function _assetTaskStatusUrl(kind, aid, taskId) {
  return (
    "/api/projects/" +
    encodeURIComponent(PID) +
    "/asset/" +
    encodeURIComponent(String(kind)) +
    "/" +
    encodeURIComponent(String(aid)) +
    "/tasks/" +
    encodeURIComponent(String(taskId))
  );
}

function closeAssetTaskPoller(kind, aid) {
  const key = _assetTaskStreamKey(kind, aid);
  const holder = ASSET_TASK_POLLERS.get(key);
  if (!holder) return;
  if (holder.timer) {
    clearInterval(holder.timer);
  }
  ASSET_TASK_POLLERS.delete(key);
}

function _resetAssetGenerateButtonAfterPollError(btn, idleText) {
  if (!btn) return;
  btn.disabled = false;
  btn.removeAttribute("data-generating");
  btn.removeAttribute("aria-busy");
  btn.classList.remove("btn-loading");
  btn.classList.add("btn-error");
  btn.textContent = "状态中断";
  setTimeout(function () {
    btn.classList.remove("btn-error");
    btn.textContent = idleText || "生成素材图";
  }, 1600);
}

function _handleAssetTaskSnapshot(snapshot, kind, aid, taskId, btn, card, idleText) {
  if (!snapshot || String(snapshot.task_id || "") !== String(taskId)) return false;
  renderAssetTaskProgress(btn, snapshot, idleText);
  if (snapshot.status === "succeeded") {
    closeAssetTaskPoller(kind, aid);
    _clearPersistedAssetTask(kind, aid);
    applyAssetGenerateResult(card, kind, aid, snapshot.result || snapshot);
    return true;
  }
  if (snapshot.status === "failed") {
    closeAssetTaskPoller(kind, aid);
    _clearPersistedAssetTask(kind, aid);
    const errorMsg = String(snapshot.error || snapshot.message || "素材图生成失败");
    showStickyError("素材图生成失败", errorMsg);
    return true;
  }
  return false;
}

async function _pollAssetTaskOnce(kind, aid, taskId, btn, card, idleText, state) {
  const holder = ASSET_TASK_POLLERS.get(_assetTaskStreamKey(kind, aid));
  if (!holder || String(holder.taskId) !== String(taskId)) return;

  try {
    const resp = await fetch(_assetTaskStatusUrl(kind, aid, taskId), { cache: "no-store" });
    if (resp.status === 404) {
      closeAssetTaskPoller(kind, aid);
      _clearPersistedAssetTask(kind, aid);
      _resetAssetGenerateButtonAfterPollError(btn, idleText);
      showStickyError("素材图生成状态丢失", "任务不存在或已过期，请重新点击生成");
      return;
    }
    if (!resp.ok) {
      throw new Error("HTTP " + resp.status);
    }
    state.errors = 0;
    const snapshot = await resp.json();
    _handleAssetTaskSnapshot(snapshot, kind, aid, taskId, btn, card, idleText);
  } catch (e) {
    state.errors += 1;
    if (state.errors < ASSET_TASK_POLL_MAX_ERRORS) return;
    closeAssetTaskPoller(kind, aid);
    _resetAssetGenerateButtonAfterPollError(btn, idleText);
    showStickyError("素材图状态查询失败", String((e && e.message) || e));
  }
}

function watchAssetTaskByPolling(kind, aid, taskId, btn, card) {
  const key = _assetTaskStreamKey(kind, aid);
  closeAssetTaskPoller(kind, aid);
  _persistAssetTask(kind, aid, taskId);
  const idleText = "生成素材图";
  const state = { errors: 0 };
  const tick = function () {
    _pollAssetTaskOnce(kind, aid, taskId, btn, card, idleText, state);
  };
  tick();
  const timer = setInterval(tick, POLLING_INTERVALS.ASSET_GENERATE_TASK);
  ASSET_TASK_POLLERS.set(key, {
    taskId: String(taskId),
    timer: timer,
    kind: String(kind),
    aid: String(aid),
  });
}

async function resumePersistedAssetTasks() {
  const tasks = _getPersistedAssetTasks();
  if (!tasks.length) return;

  for (const t of tasks) {
    const kind = t.kind;
    const aid = t.aid;
    const taskId = t.taskId;
    const encodedPid = encodeURIComponent(PID);
    const encodedKind = encodeURIComponent(String(kind));
    const encodedAid = encodeURIComponent(String(aid));
    const encodedTaskId = encodeURIComponent(String(taskId));

    try {
      const resp = await fetch(
        "/api/projects/" +
          encodedPid +
          "/asset/" +
          encodedKind +
          "/" +
          encodedAid +
          "/tasks/" +
          encodedTaskId,
        { cache: "no-store" }
      );
      if (resp.status === 404) {
        _clearPersistedAssetTask(kind, aid);
        continue;
      }
      if (!resp.ok) continue;
      const snapshot = await resp.json();
      const st = String(snapshot.status || "");
      if (st === "succeeded") {
        _clearPersistedAssetTask(kind, aid);
        const card = findAssetCardElement(kind, aid);
        applyAssetGenerateResult(card, kind, aid, snapshot.result || snapshot);
        continue;
      }
      if (st === "failed") {
        _clearPersistedAssetTask(kind, aid);
        continue;
      }
    } catch (_) {
      continue;
    }

    const card = findAssetCardElement(kind, aid);
    const btn = findAssetGenerateButton(card);
    if (btn) {
      btn.setAttribute("data-generating", "1");
      btn.disabled = true;
      btn.textContent = "生成中（恢复）…";
      btn.classList.add("btn-loading");
      btn.classList.remove("btn-error", "btn-success");
      btn.setAttribute("aria-busy", "true");
    }
    watchAssetTaskByPolling(kind, aid, taskId, btn, card);
    console.info("[sdr] 已恢复素材生成任务（轮询） kind=" + kind + " aid=" + aid + " taskId=" + taskId);
  }
}

window.addEventListener("beforeunload", () => {
  stopActiveEpisodeStatusPoller();
  SHOT_TASK_STREAMS.forEach((holder) => {
    if (!holder || !holder.es) return;
    try {
      holder.es.close();
    } catch (_) {}
  });
  SHOT_TASK_STREAMS.clear();
  ASSET_TASK_POLLERS.forEach(function (holder) {
    if (holder && holder.kind != null && holder.aid != null) {
      closeAssetTaskPoller(holder.kind, holder.aid);
    }
  });
});

function isAssetAdaptStepComplete() {
  if (TOTAL_ASSETS <= 0) return false;
  return ADAPTED_ASSETS >= TOTAL_ASSETS;
}

function saveAssetSyncNotice(payload) {
  try {
    sessionStorage.setItem(ASSET_SYNC_NOTICE_KEY, JSON.stringify(payload || {}));
  } catch (_) {}
}

function readAssetSyncNotice() {
  try {
    const raw = sessionStorage.getItem(ASSET_SYNC_NOTICE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function readShotRegenNoticeState() {
  try {
    const raw = sessionStorage.getItem(SHOT_REGEN_NOTICE_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch (_) {
    return {};
  }
}

function writeShotRegenNoticeState(state) {
  try {
    sessionStorage.setItem(SHOT_REGEN_NOTICE_KEY, JSON.stringify(state || {}));
  } catch (_) {}
}

function getEpisodeRegenShots(ep) {
  const state = readShotRegenNoticeState();
  const key = String(ep || "");
  const arr = state[key];
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => String(x)).filter(Boolean);
}

function markShotNeedsRegen(ep, sid) {
  const key = String(ep || "");
  const shotId = String(sid || "");
  if (!key || !shotId) return;
  const state = readShotRegenNoticeState();
  const arr = Array.isArray(state[key]) ? state[key].map((x) => String(x)) : [];
  if (arr.indexOf(shotId) < 0) arr.push(shotId);
  state[key] = arr;
  writeShotRegenNoticeState(state);
}

function clearShotNeedsRegen(ep, sid) {
  const key = String(ep || "");
  const shotId = String(sid || "");
  if (!key || !shotId) return;
  const state = readShotRegenNoticeState();
  const arr = Array.isArray(state[key]) ? state[key].map((x) => String(x)) : [];
  state[key] = arr.filter((x) => x !== shotId);
  writeShotRegenNoticeState(state);
}

function clearEpisodeNeedsRegen(ep) {
  const key = String(ep || "");
  if (!key) return;
  const state = readShotRegenNoticeState();
  state[key] = [];
  writeShotRegenNoticeState(state);
}

function refreshShotRegenMarkers(ep) {
  const key = String(ep || "");
  const pending = new Set(getEpisodeRegenShots(key));
  const cards = Array.from(document.querySelectorAll('.shot-card[data-ep="' + key + '"]'));
  cards.forEach((card) => {
    const sid = String(card.getAttribute("data-sid") || "");
    const need = pending.has(sid);
    card.classList.toggle("sb-needs-regen", need);
    const genBtn = card.querySelector(".sb-gen-big");
    if (genBtn) genBtn.classList.toggle("sb-needs-regen", need);
  });
}

function getAssetPipelineLabels() {
  let adaptLabel = "批量改编";

  let reviewBatchLabel = "批量生成参考首图";
  if (REVIEW_BATCH_TOTAL > 0 && REVIEW_BATCH_DONE >= REVIEW_BATCH_TOTAL) {
    reviewBatchLabel = `重新批量生成参考首图（${REVIEW_BATCH_DONE}/${REVIEW_BATCH_TOTAL}）`;
  } else if (REVIEW_BATCH_DONE > 0) {
    reviewBatchLabel = `继续批量生成参考首图（${REVIEW_BATCH_DONE}/${REVIEW_BATCH_TOTAL}）`;
  }

  let genRemainingLabel = "参考首图批量生成其他参考图";
  if (GROUPS_APPROVED <= 0 && CHAR_GROUPS_TOTAL > 0) {
    genRemainingLabel = `参考首图批量生成其他参考图（待首图确认 ${GROUPS_APPROVED}/${CHAR_GROUPS_TOTAL} 组）`;
  } else if (REMAINING_OUTFITS_TOTAL <= 0) {
    genRemainingLabel = "无其他参考图可生成";
  } else if (REMAINING_OUTFITS_TOTAL > 0 && REMAINING_OUTFITS_DONE >= REMAINING_OUTFITS_TOTAL) {
    genRemainingLabel = `重新参考首图批量生成其他参考图（${REMAINING_OUTFITS_DONE}/${REMAINING_OUTFITS_TOTAL}）`;
  } else if (REMAINING_OUTFITS_DONE > 0) {
    genRemainingLabel = `继续参考首图批量生成其他参考图（${REMAINING_OUTFITS_DONE}/${REMAINING_OUTFITS_TOTAL}）`;
  }

  return { adapt: adaptLabel, reviewBatch: reviewBatchLabel, genRemaining: genRemainingLabel };
}

function isReviewBatchActionEnabled() {
  if (!ASSET_ACTIONS_ENABLED || !isAssetAdaptStepComplete()) return false;
  if (typeof window.PAGE_DATA !== "undefined" && window.PAGE_DATA.stats) {
    return window.PAGE_DATA.stats.pipeline_review_enabled !== false
      && Boolean(window.PAGE_DATA.stats.pipeline_review_enabled);
  }
  return ASSET_PIPELINE_PHASE === "2a" || ASSET_PIPELINE_PHASE === "done";
}

function isGenRemainingActionEnabled() {
  if (!ASSET_ACTIONS_ENABLED || !isAssetAdaptStepComplete()) return false;
  if (GROUPS_APPROVED <= 0 || REMAINING_OUTFITS_TOTAL <= 0) return false;
  if (typeof window.PAGE_DATA !== "undefined" && window.PAGE_DATA.stats) {
    return window.PAGE_DATA.stats.pipeline_remaining_enabled !== false
      && Boolean(window.PAGE_DATA.stats.pipeline_remaining_enabled);
  }
  return ASSET_PIPELINE_PHASE === "2c" || ASSET_PIPELINE_PHASE === "done";
}

function applyAssetPipelinePhase(phase) {
  if (!phase) return;
  ASSET_PIPELINE_PHASE = String(phase);
  if (window.PAGE_DATA && window.PAGE_DATA.stats) {
    window.PAGE_DATA.stats.asset_pipeline_phase = ASSET_PIPELINE_PHASE;
    window.PAGE_DATA.stats.pipeline_review_enabled = ASSET_PIPELINE_PHASE === "2a" || ASSET_PIPELINE_PHASE === "done";
    window.PAGE_DATA.stats.pipeline_remaining_enabled = ASSET_PIPELINE_PHASE === "2c" || ASSET_PIPELINE_PHASE === "done";
  }
}

// 超时和轮询配置（单位：毫秒）
const POLLING_INTERVALS = {
  TASK_STATUS: 1500,        // 任务状态轮询间隔
  ASSET_GENERATE_TASK: 1500, // 单资产「生成素材图」任务轮询间隔
  SHOTS_STATUS: 2000,       // 镜头生成状态轮询间隔
  TOAST_DURATION: 3200,     // Toast 消息显示时长
  ANALYZE_TIMEOUT: 25 * 60 * 1000  // 分析任务超时（25分钟）
};

const ADAPT_REQUIREMENTS_STASH_KEY = "dr_adapt_requirements_stash_" + String(PID || "");

function getAdaptRequirementsInputEl() {
  return document.getElementById("adapt-requirements");
}

function getAdaptRequirements() {
  var el = getAdaptRequirementsInputEl();
  if (!el) return "";
  // 卡片模式下优先读已保存值（data-saved），未保存的草稿不算
  var saved = el.getAttribute("data-saved");
  return String(saved !== null ? saved : (el.value || "")).trim();
}

/** 改编完成后会 reload 刷新分镜数据；用 sessionStorage 暂存一次，reload 后恢复，手动刷新不恢复。 */
function stashAdaptRequirementsForReload() {
  var el = getAdaptRequirementsInputEl();
  if (!el) return;
  try {
    sessionStorage.setItem(ADAPT_REQUIREMENTS_STASH_KEY, getAdaptRequirements());
  } catch (_) {}
}

function restoreAdaptRequirementsAfterReload() {
  var el = getAdaptRequirementsInputEl();
  if (!el) return;
  try {
    var saved = sessionStorage.getItem(ADAPT_REQUIREMENTS_STASH_KEY);
    sessionStorage.removeItem(ADAPT_REQUIREMENTS_STASH_KEY);
    if (saved != null) {
      el.value = saved;
      el.setAttribute("data-saved", saved);
    }
  } catch (_) {}
  autoResizeAdaptRequirementsTextarea();
}

function autoResizeAdaptRequirementsTextarea() {
  var el = getAdaptRequirementsInputEl();
  if (!el) return;
  var style = window.getComputedStyle(el);
  var minH = parseFloat(style.minHeight) || 120;
  var maxH = parseFloat(style.maxHeight) || 320;
  if (!Number.isFinite(maxH) || maxH <= 0) maxH = 320;
  el.style.height = "auto";
  var contentH = el.scrollHeight;
  var next = Math.max(contentH, minH);
  if (next >= maxH) {
    el.style.height = maxH + "px";
    el.style.overflowY = "auto";
  } else {
    el.style.height = next + "px";
    el.style.overflowY = "hidden";
  }
}

function initAdaptRequirementsTextarea() {
  var el = getAdaptRequirementsInputEl();
  if (!el || el.getAttribute("data-adapt-req-init") === "1") return;
  el.setAttribute("data-adapt-req-init", "1");
  el.addEventListener("input", autoResizeAdaptRequirementsTextarea);
  autoResizeAdaptRequirementsTextarea();
}

function setAdaptRequirementsLocked(locked) {
  var el = getAdaptRequirementsInputEl();
  if (!el) return;
  el.disabled = !!locked;
  el.setAttribute("aria-disabled", locked ? "true" : "false");
}

function appendAdaptRequirementsConfirmSuffix(baseMsg, requirements) {
  var text = String(requirements || "").trim();
  if (!text) return baseMsg;
  var preview = text.length > 120 ? text.slice(0, 120) + "…" : text;
  return baseMsg + "\n\n将应用特殊要求：「" + preview + "」";
}

function formatTaskProgressText(prefix, progress, message) {
  const p = Number(progress);
  const hasRealProgress = Number.isFinite(p) && p > 0;
  const msg = (message || "").trim();
  if (hasRealProgress) {
    const pct = Math.max(1, Math.min(99, Math.round(p)));
    return msg ? `${prefix} ${pct}% - ${msg}` : `${prefix} ${pct}%`;
  }
  return msg ? `${prefix} - ${msg}` : `${prefix}...`;
}

var ASSET_PIPELINE_LABELS = getAssetPipelineLabels();
let assetPipelineRequestInFlight = false;
let assetAdaptProgressTimer = null;
let assetAdaptProgressInFlight = false;
let assetAdaptProgressMode = "normal"; // normal | rerun
let assetAdaptRunStartedAtMs = 0;
let assetGenerateProgressTimer = null;
let assetGenerateProgressInFlight = false;
let assetGenerateProgressMode = "normal"; // normal | rerun
let assetGenerateRecoverInFlight = false;
let assetGenerateForceRegenerate = false;
let assetGenerateAwaitServerDone = false;
let assetGenerateBaselineHistoryMap = {};
const ASSET_GEN_BASELINE_KEY = "dr_asset_gen_baseline_" + String(PID);
const ASSET_IMG_MODEL_KEY = "dr_asset_img_model_" + String(PID);
const ASSET_IMG_MODEL_OPTIONS = ["inherit", "seedream5.0", "gpt_image2"];
const ASSET_IMG_MODEL_DEFAULT = "seedream5.0";
const ASSET_IMG_MODEL_TEXT = {
  inherit: "模型：" + "seedream5.0" + "（默认）",
  "seedream5.0": "模型：seedream5.0",
  gpt_image2: "模型：gpt_image2",
};
const ASSET_CARD_IMG_MODEL_KEY = "dr_asset_card_img_model_" + String(PID);

function readAssetImgModelMode() {
  try {
    const raw = String(localStorage.getItem(ASSET_IMG_MODEL_KEY) || "").trim();
    if (ASSET_IMG_MODEL_OPTIONS.indexOf(raw) >= 0) return raw;
  } catch (_) {}
  return "inherit";
}

function writeAssetImgModelMode(mode) {
  try {
    localStorage.setItem(ASSET_IMG_MODEL_KEY, mode);
  } catch (_) {}
}

let ASSET_IMG_MODEL_MODE = readAssetImgModelMode();

function resolveAssetImgModelParam() {
  return ASSET_IMG_MODEL_MODE === "inherit" ? null : ASSET_IMG_MODEL_MODE;
}

function getAssetCardModelMap() {
  try {
    const raw = localStorage.getItem(ASSET_CARD_IMG_MODEL_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}

function setAssetCardModelMap(mapObj) {
  try {
    localStorage.setItem(ASSET_CARD_IMG_MODEL_KEY, JSON.stringify(mapObj || {}));
  } catch (_) {}
}

function getAssetCardModelKey(card) {
  if (!card) return "";
  const kind = String(card.getAttribute("data-kind") || "").trim();
  const aid = String(card.getAttribute("data-aid") || "").trim();
  if (!kind || !aid) return "";
  return kind + "::" + aid;
}

function getAssetCardModelMode(card) {
  const key = getAssetCardModelKey(card);
  if (!key) return "inherit";
  const mapObj = getAssetCardModelMap();
  const mode = String(mapObj[key] || "").trim();
  return ASSET_IMG_MODEL_OPTIONS.indexOf(mode) >= 0 ? mode : "inherit";
}

function setAssetCardModelMode(card, mode) {
  const key = getAssetCardModelKey(card);
  if (!key) return;
  const mapObj = getAssetCardModelMap();
  if (!mode || mode === "inherit") {
    delete mapObj[key];
  } else {
    mapObj[key] = mode;
  }
  setAssetCardModelMap(mapObj);
}

function resolveAssetImgModelParamForCard(card) {
  const mode = getAssetCardModelMode(card);
  if (mode !== "inherit") return mode;
  return resolveAssetImgModelParam();
}

function updateAssetImgModelButton() {
  const btn = document.getElementById("btn-asset-img-model");
  if (!btn) return;
  const full = ASSET_IMG_MODEL_TEXT[ASSET_IMG_MODEL_MODE] || ASSET_IMG_MODEL_TEXT.inherit;
  const val = btn.querySelector(".mc-value");
  if (val) val.textContent = full.replace("模型：", "");
  else btn.textContent = full;
  if (ASSET_IMG_MODEL_MODE === "inherit") {
    btn.title = "使用系统默认模型 seedream5.0；点击可切换为其他模型";
  } else {
    btn.title = "当前使用 " + ASSET_IMG_MODEL_MODE + "；点击可切换";
  }
  document.querySelectorAll(".mc-opt").forEach(function (o) {
    o.classList.toggle("on", o.getAttribute("data-mode") === ASSET_IMG_MODEL_MODE);
  });
}

function updateAssetCardImgModelButton(btn) {
  if (!btn) return;
  const card = btn.closest(".asset-card");
  if (!card) return;
  const localMode = getAssetCardModelMode(card);
  const effective = resolveAssetImgModelParamForCard(card) || "follow_default";
  if (localMode === "inherit") {
    const globalLabel = ASSET_IMG_MODEL_MODE === "inherit" ? "seedream5.0（默认）" : ASSET_IMG_MODEL_MODE;
    btn.textContent = "模型：" + globalLabel;
    btn.title = "当前使用全局模型 " + globalLabel + "；点击可单独指定";
  } else {
    btn.textContent = "模型：" + localMode;
    btn.title = "当前使用 " + localMode + "；点击可切换";
  }
  btn.setAttribute("data-effective-model", effective);
}

function updateAllAssetCardImgModelButtons() {
  document.querySelectorAll(".btn-asset-card-img-model").forEach((btn) => {
    updateAssetCardImgModelButton(btn);
  });
}

function toggleAssetCardImgModel(btn) {
  const card = btn && btn.closest ? btn.closest(".asset-card") : null;
  if (!card) return;
  const current = getAssetCardModelMode(card);
  const idx = ASSET_IMG_MODEL_OPTIONS.indexOf(current);
  const next = ASSET_IMG_MODEL_OPTIONS[(idx + 1) % ASSET_IMG_MODEL_OPTIONS.length];
  setAssetCardModelMode(card, next);
  updateAssetCardImgModelButton(btn);
  const effective = resolveAssetImgModelParamForCard(card);
  toast("单卡素材图模型：" + (effective || "跟随后端默认"), false, 1400);
}

function toggleAssetImgModel() {
  var d = document.getElementById("mc-dropdown");
  if (d) d.hidden = !d.hidden;
}
function selectAssetImgModel(mode) {
  ASSET_IMG_MODEL_MODE = mode;
  writeAssetImgModelMode(mode);
  updateAssetImgModelButton();
  updateAllAssetCardImgModelButtons();
  var d = document.getElementById("mc-dropdown");
  if (d) d.hidden = true;
  toast("生图模型已切换为：" + (resolveAssetImgModelParam() || "跟随后端默认"), false, 1600);
}
document.addEventListener("click", function (e) {
  var d = document.getElementById("mc-dropdown");
  var sel = document.querySelector(".model-select");
  if (d && sel && !sel.contains(e.target)) d.hidden = true;
});

window.toggleAssetImgModel = toggleAssetImgModel;
window.toggleAssetCardImgModel = toggleAssetCardImgModel;
updateAssetImgModelButton();
updateAllAssetCardImgModelButtons();

function forEachAssetRow(assetData, cb) {
  if (!assetData || typeof assetData !== "object") return;
  for (const kind of ["characters", "scenes", "props"]) {
    const rows = assetData[kind] || {};
    for (const key of Object.keys(rows)) {
      const row = rows[key];
      if (!row || typeof row !== "object") continue;
      cb(row, kind, key);
    }
  }
}

function countAdaptedAssets(assetData) {
  let done = 0;
  forEachAssetRow(assetData, (row) => {
    if (String(row.name_trans || "").trim() && String(row.prompt || "").trim()) {
      done += 1;
    }
  });
  return done;
}

function parseTimeMs(raw) {
  if (!raw) return 0;
  const s = String(raw).trim();
  if (!s) return 0;
  let ms = Date.parse(s);
  if (Number.isFinite(ms)) return ms;
  ms = Date.parse(s.replace(" ", "T"));
  return Number.isFinite(ms) ? ms : 0;
}

function countRerunUpdatedAssets(assetData, startedAtMs) {
  if (!startedAtMs) return 0;
  let done = 0;
  forEachAssetRow(assetData, (row) => {
    if (!(String(row.name_trans || "").trim() && String(row.prompt || "").trim())) return;
    const updatedAtMs = parseTimeMs(row.updated_at);
    if (updatedAtMs && updatedAtMs >= (startedAtMs - 1000)) done += 1;
  });
  return done;
}

function computeAssetAdaptProgressDone(assetData) {
  if (assetAdaptProgressMode === "rerun") {
    return countRerunUpdatedAssets(assetData, assetAdaptRunStartedAtMs);
  }
  return countAdaptedAssets(assetData);
}

function getAssetAdaptProgressLabel(baseLabel) {
  if (assetAdaptProgressMode === "rerun") return "重新实体改编中";
  return baseLabel || "实体改编进度";
}

async function ensureAssetAdaptTrackerContext() {
  if (assetAdaptRunStartedAtMs > 0) return;
  try {
    const res = await fetch(`/api/projects/${encodeURIComponent(PID)}/status`, { cache: "no-store" });
    if (!res.ok) return;
    const st = await res.json();
    if (st && st.status === "running" && st.task_name === "adapt_entities") {
      assetAdaptRunStartedAtMs = parseTimeMs(st.started_at);
      const baselineDone = countAdaptedAssets(window.PAGE_DATA.asset || {});
      if (assetAdaptRunStartedAtMs > 0 && baselineDone >= TOTAL_ASSETS) {
        assetAdaptProgressMode = "rerun";
      }
    }
  } catch (_) {}
}

// 批量按钮文本更新：按钮内含 .btn-step 步骤数字与 .btn-text 文本，只改文本以保留步骤标识
function setBatchBtnText(btn, text) {
  if (!btn) return;
  var t = btn.querySelector(".btn-text");
  if (t) t.textContent = text;
  else btn.textContent = text;
}

function updateAssetAdaptProgressOnButton(done, total, labelText) {
  const adaptBtn = document.getElementById("btn-asset-adapt");
  if (!adaptBtn) return;
  const t = Number(total) > 0 ? Number(total) : 0;
  const d = Math.max(0, Math.min(t || Number(done), Number(done) || 0));
  const pct = t > 0 ? Math.round((d * 100) / t) : 0;
  const label = labelText || "实体改编进度";
  setBatchBtnText(adaptBtn, `${label}（${d}/${t}，${pct}%）`);
}

async function fetchAndRenderAssetAdaptProgress(labelText) {
  if (assetAdaptProgressInFlight) return;
  if (TOTAL_ASSETS <= 0) return;
  assetAdaptProgressInFlight = true;
  try {
    await ensureAssetAdaptTrackerContext();
    const res = await fetch(`/files/${encodeURIComponent(PID)}/asset.json?_=${Date.now()}`, {
      cache: "no-store"
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const asset = await res.json();
    if (asset && typeof asset === "object") {
      window.PAGE_DATA.asset = asset;
      const done = computeAssetAdaptProgressDone(asset);
      updateAssetAdaptProgressOnButton(done, TOTAL_ASSETS, getAssetAdaptProgressLabel(labelText));
    }
  } catch (_) {
    // 读取失败时静默，避免干扰主流程
  } finally {
    assetAdaptProgressInFlight = false;
  }
}

function stopAssetAdaptProgressTracker(doneLabel) {
  if (assetAdaptProgressTimer) {
    clearInterval(assetAdaptProgressTimer);
    assetAdaptProgressTimer = null;
  }
  if (doneLabel) {
    const done = countAdaptedAssets(window.PAGE_DATA.asset || {});
    updateAssetAdaptProgressOnButton(done, TOTAL_ASSETS, doneLabel);
  }
  assetAdaptProgressMode = "normal";
  assetAdaptRunStartedAtMs = 0;
}

function startAssetAdaptProgressTracker(labelText) {
  if (TOTAL_ASSETS <= 0) return;
  stopAssetAdaptProgressTracker();
  const baselineDone = countAdaptedAssets(window.PAGE_DATA.asset || {});
  assetAdaptProgressMode = baselineDone >= TOTAL_ASSETS ? "rerun" : "normal";
  const initDone = computeAssetAdaptProgressDone(window.PAGE_DATA.asset || {});
  updateAssetAdaptProgressOnButton(initDone, TOTAL_ASSETS, getAssetAdaptProgressLabel(labelText || "实体改编进度"));
  fetchAndRenderAssetAdaptProgress(labelText || "实体改编中");
  assetAdaptProgressTimer = setInterval(() => {
    fetchAndRenderAssetAdaptProgress(labelText || "实体改编中");
  }, 2000);
}

function readAssetGenBaselineMap() {
  try {
    const raw = sessionStorage.getItem(ASSET_GEN_BASELINE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : null;
  } catch (_) {
    return null;
  }
}

function saveAssetGenBaselineMap(map) {
  try {
    sessionStorage.setItem(ASSET_GEN_BASELINE_KEY, JSON.stringify(map || {}));
  } catch (_) {}
}

function clearAssetGenBaselineMap() {
  try {
    sessionStorage.removeItem(ASSET_GEN_BASELINE_KEY);
  } catch (_) {}
}

function countGeneratedAssets(assetData) {
  let done = 0;
  forEachAssetRow(assetData, (row) => {
    if (String(row.file_path || "").trim() || String(row.oss_url || "").trim()) {
      done += 1;
    }
  });
  return done;
}

function buildAssetHistoryLengthMap(assetData) {
  const map = {};
  forEachAssetRow(assetData, (row, kind, key) => {
    const hist = Array.isArray(row.history) ? row.history : [];
    map[`${kind}:${key}`] = hist.length;
  });
  return map;
}

function countRerunGeneratedAssets(assetData, baselineMap) {
  if (!baselineMap || typeof baselineMap !== "object") return 0;
  let done = 0;
  forEachAssetRow(assetData, (row, kind, key) => {
    const currentLen = Array.isArray(row.history) ? row.history.length : 0;
    const baseLen = Number(baselineMap[`${kind}:${key}`] || 0);
    const hasImage = String(row.file_path || "").trim() || String(row.oss_url || "").trim();
    if (hasImage && currentLen > baseLen) done += 1;
  });
  return done;
}

function computeReviewStatsFromAsset(assetData) {
  const asset = assetData || {};
  const characters = asset.characters || {};
  const charGroups = ((asset.asset_groups || {}).characters) || {};
  let charGroupsTotal = Object.keys(charGroups).length;
  if (!charGroupsTotal) charGroupsTotal = Object.keys(characters).length;
  let charLeadersGenerated = 0;
  let groupsApproved = 0;
  let remainingTotal = 0;
  let remainingDone = 0;
  let scenesPropsTotal = Object.keys(asset.scenes || {}).length + Object.keys(asset.props || {}).length;
  let scenesPropsDone = 0;
  ["scenes", "props"].forEach((kind) => {
    Object.values(asset[kind] || {}).forEach((row) => {
      if (row && String(row.file_path || "").trim()) scenesPropsDone += 1;
    });
  });
  if (Object.keys(charGroups).length) {
    Object.values(charGroups).forEach((members) => {
      if (!Array.isArray(members) || !members.length) return;
      const leader = characters[members[0]] || {};
      if (String(leader.file_path || "").trim()) charLeadersGenerated += 1;
      if (String(leader.review_state || "") === "approved") groupsApproved += 1;
      members.slice(1).forEach((aid) => {
        const row = characters[aid] || {};
        remainingTotal += 1;
        if (String(row.file_path || "").trim()) remainingDone += 1;
      });
    });
  } else {
    Object.values(characters).forEach((row) => {
      if (row && String(row.file_path || "").trim()) charLeadersGenerated += 1;
    });
  }
  return {
    review_batch_total: scenesPropsTotal + charGroupsTotal,
    review_batch_done: scenesPropsDone + charLeadersGenerated,
    groups_approved: groupsApproved,
    remaining_outfits_total: remainingTotal,
    remaining_outfits_done: remainingDone,
    assets_generated: countGeneratedAssets(asset),
  };
}

function computeAssetGenerateProgressDone(assetData) {
  if (assetGenerateProgressMode === "review_batch") {
    return computeReviewStatsFromAsset(assetData).review_batch_done;
  }
  if (assetGenerateProgressMode === "remaining") {
    return computeReviewStatsFromAsset(assetData).remaining_outfits_done;
  }
  if (assetGenerateProgressMode === "rerun") {
    return countRerunGeneratedAssets(assetData, assetGenerateBaselineHistoryMap);
  }
  return countGeneratedAssets(assetData);
}

function getAssetGenerateProgressTotal() {
  if (assetGenerateProgressMode === "review_batch") {
    return REVIEW_BATCH_TOTAL || computeReviewStatsFromAsset(window.PAGE_DATA.asset || {}).review_batch_total;
  }
  if (assetGenerateProgressMode === "remaining") {
    return REMAINING_OUTFITS_TOTAL || computeReviewStatsFromAsset(window.PAGE_DATA.asset || {}).remaining_outfits_total;
  }
  return TOTAL_ASSETS;
}

function getAssetGenerateProgressLabel(baseLabel) {
  if (assetGenerateProgressMode === "review_batch") return baseLabel || "生成首图中";
  if (assetGenerateProgressMode === "remaining") return baseLabel || "生成剩余资产中";
  if (assetGenerateProgressMode === "rerun") return "重新生成素材图中";
  return baseLabel || "生成素材图中";
}

function getAssetGenerateProgressButtonId() {
  if (assetGenerateProgressMode === "remaining") return "btn-asset-gen-remaining";
  return "btn-asset-review-batch";
}

function updateAssetGenerateProgressOnButton(done, total, labelText) {
  const genBtn = document.getElementById(getAssetGenerateProgressButtonId());
  if (!genBtn) return;
  const t = Number(total) > 0 ? Number(total) : 0;
  const d = Math.max(0, Math.min(t || Number(done), Number(done) || 0));
  const pct = t > 0 ? Math.round((d * 100) / t) : 0;
  const label = labelText || getAssetGenerateProgressLabel();
  setBatchBtnText(genBtn, `${label}（${d}/${t}，${pct}%）`);
}

function ensureAssetGenerateTrackerContext() {
  if (assetGenerateProgressMode === "rerun" && Object.keys(assetGenerateBaselineHistoryMap).length > 0) return;
  const persisted = readAssetGenBaselineMap();
  if (persisted && typeof persisted === "object") {
    assetGenerateProgressMode = "rerun";
    assetGenerateBaselineHistoryMap = persisted;
  }
}

async function tryRecoverStuckAssetTask() {
  if (assetGenerateRecoverInFlight) return false;
  assetGenerateRecoverInFlight = true;
  try {
    const recoverRes = await fetch(`/api/projects/${encodeURIComponent(PID)}/status/recover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!recoverRes.ok) return false;
    const recoverData = await recoverRes.json();
    if (!recoverData || !recoverData.recovered) return false;
    const doneLabel =
      assetGenerateProgressMode === "remaining" ? "剩余资产生成完成" : "首图批次完成";
    stopAssetGenerateProgressTracker(doneLabel);
    setAssetPipelineBusy(null, false);
    if (recoverData.asset_pipeline_phase) {
      applyAssetPipelinePhase(recoverData.asset_pipeline_phase);
    }
    toast(recoverData.message || "任务已完成，状态已恢复", false);
    setTimeout(function () {
      reloadProjectStripStoryboardParams("asset");
    }, 800);
    return true;
  } catch (_) {
    return false;
  } finally {
    assetGenerateRecoverInFlight = false;
  }
}

async function maybeRecoverAssetGenerateIfComplete(done, total) {
  const t = Number(total) || 0;
  const d = Number(done) || 0;
  if (t <= 0 || d < t) return false;
  if (assetPipelineRequestInFlight || assetGenerateAwaitServerDone || assetGenerateForceRegenerate) {
    return false;
  }
  try {
    const res = await fetch(`/api/projects/${encodeURIComponent(PID)}/status`);
    if (!res.ok) return false;
    const status = await res.json();
    const st = String(status && status.status || "").toLowerCase();
    if (st !== "running" && st !== "stale") return false;
    if (status.force_regenerate) return false;
  } catch (_) {
    return false;
  }
  return tryRecoverStuckAssetTask();
}

async function refreshAssetGenerateButtonFromServerStatus(labelText) {
  if (!assetGenerateAwaitServerDone && !assetGenerateForceRegenerate) return;
  try {
    const res = await fetch(`/api/projects/${encodeURIComponent(PID)}/status`);
    if (!res.ok) return;
    const status = await res.json();
    const st = String(status && status.status || "").toLowerCase();
    if (st !== "running" && st !== "stale") return;
    const btn = document.getElementById(getAssetGenerateProgressButtonId());
    if (!btn) return;
    const label = getAssetGenerateProgressLabel(labelText);
    setBatchBtnText(btn, formatTaskProgressText(label, status.progress, status.message));
  } catch (_) {}
}

async function fetchAndRenderAssetGenerateProgress(labelText) {
  if (assetGenerateProgressInFlight) return;
  const progressTotal = getAssetGenerateProgressTotal();
  if (progressTotal <= 0 && assetGenerateProgressMode !== "review_batch") return;
  assetGenerateProgressInFlight = true;
  try {
    ensureAssetGenerateTrackerContext();
    const res = await fetch(`/files/${encodeURIComponent(PID)}/asset.json?_=${Date.now()}`, {
      cache: "no-store"
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const asset = await res.json();
    if (asset && typeof asset === "object") {
      window.PAGE_DATA.asset = asset;
      const stats = computeReviewStatsFromAsset(asset);
      window.PAGE_DATA.stats = Object.assign({}, window.PAGE_DATA.stats || {}, stats);
      const done = computeAssetGenerateProgressDone(asset);
      const total = getAssetGenerateProgressTotal() || progressTotal;
      if (assetGenerateForceRegenerate || assetGenerateAwaitServerDone) {
        await refreshAssetGenerateButtonFromServerStatus(labelText);
      } else {
        updateAssetGenerateProgressOnButton(done, total, getAssetGenerateProgressLabel(labelText));
        if (total > 0 && done >= total) {
          await maybeRecoverAssetGenerateIfComplete(done, total);
        }
      }
    }
  } catch (_) {
    // 读取失败静默
  } finally {
    assetGenerateProgressInFlight = false;
  }
}

async function syncLatestAssetSnapshot() {
  try {
    const res = await fetch(`/files/${encodeURIComponent(PID)}/asset.json?_=${Date.now()}`, {
      cache: "no-store"
    });
    if (!res.ok) return null;
    const asset = await res.json();
    if (asset && typeof asset === "object") {
      window.PAGE_DATA.asset = asset;
      return asset;
    }
  } catch (_) {}
  return null;
}

function clearAssetGenerateProgressTimer() {
  if (assetGenerateProgressTimer) {
    clearInterval(assetGenerateProgressTimer);
    assetGenerateProgressTimer = null;
  }
}

function stopAssetGenerateProgressTracker(doneLabel) {
  clearAssetGenerateProgressTimer();
  if (doneLabel) {
    const stats = computeReviewStatsFromAsset(window.PAGE_DATA.asset || {});
    const done = computeAssetGenerateProgressDone(window.PAGE_DATA.asset || {});
    const total = getAssetGenerateProgressTotal();
    updateAssetGenerateProgressOnButton(done, total, doneLabel);
    window.PAGE_DATA.stats = Object.assign({}, window.PAGE_DATA.stats || {}, stats);
  }
  assetGenerateProgressMode = "normal";
  assetGenerateBaselineHistoryMap = {};
  assetGenerateForceRegenerate = false;
  assetGenerateAwaitServerDone = false;
  clearAssetGenBaselineMap();
}

function startAssetGenerateProgressTracker(labelText, mode, options) {
  options = options || {};
  assetGenerateProgressMode = mode || "review_batch";
  assetGenerateForceRegenerate = Boolean(options.forceRegenerate);
  if (options.awaitServerDone !== false && assetGenerateForceRegenerate) {
    assetGenerateAwaitServerDone = true;
  }
  const progressTotal = getAssetGenerateProgressTotal();
  if (progressTotal <= 0 && assetGenerateProgressMode !== "review_batch") return;
  clearAssetGenerateProgressTimer();
  const initLabel = getAssetGenerateProgressLabel(labelText);
  const btn = document.getElementById(getAssetGenerateProgressButtonId());
  if (btn && (assetGenerateForceRegenerate || assetGenerateAwaitServerDone)) {
    setBatchBtnText(btn, initLabel + "…");
  } else {
    const initDone = computeAssetGenerateProgressDone(window.PAGE_DATA.asset || {});
    updateAssetGenerateProgressOnButton(initDone, progressTotal || REVIEW_BATCH_TOTAL, initLabel);
  }
  fetchAndRenderAssetGenerateProgress(labelText || initLabel);
  assetGenerateProgressTimer = setInterval(function () {
    fetchAndRenderAssetGenerateProgress(labelText || initLabel);
  }, 2000);
}

// ==================== 进度轮询器 ====================
class TaskPoller {
  constructor(pid) {
    this.pid = pid;
    this.interval = null;
    this.onProgress = null;
    this.onComplete = null;
    this.onError = null;
    this.consecutiveErrors = 0;
    this.maxConsecutiveErrors = 3; // 连续失败3次后停止轮询
  }

  start(callbacks) {
    this.onProgress = callbacks.onProgress || (() => {});
    this.onComplete = callbacks.onComplete || (() => {});
    this.onError = callbacks.onError || (() => {});

    this.interval = setInterval(() => this.poll(), POLLING_INTERVALS.TASK_STATUS);
    this.poll();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async poll() {
    try {
      const res = await fetch(`/api/projects/${this.pid}/status`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const status = await res.json();

      // 请求成功，重置错误计数
      this.consecutiveErrors = 0;

      if (status.status === 'running') {
        this.onProgress(status.progress, status.message);
      } else if (status.status === 'stale') {
        this.stop();
        this.onError(status.message || '任务长时间无进展，可能已中断');
      } else if (status.status === 'done') {
        this.stop();
        this.onComplete(status.message);
      } else if (status.status === 'error') {
        this.stop();
        this.onError(status.message);
      }
    } catch (e) {
      console.error('Poll status failed:', e);
      this.consecutiveErrors++;

      // 连续失败次数过多，停止轮询并通知用户
      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        this.stop();
        this.onError(`网络连接失败，请检查网络后刷新页面重试`);
      }
    }
  }
}

// 分集状态轮询器（优先读取 <ep>/.status.json）
class EpisodeStatusPoller {
  constructor(pid, ep) {
    this.pid = pid;
    this.ep = ep;
    this.interval = null;
    this.onProgress = null;
    this.onComplete = null;
    this.onError = null;
    this.consecutiveErrors = 0;
    this.maxConsecutiveErrors = 5;
  }

  start(callbacks) {
    this.onProgress = callbacks.onProgress || (() => {});
    this.onComplete = callbacks.onComplete || (() => {});
    this.onError = callbacks.onError || (() => {});
    this.interval = setInterval(() => this.poll(), POLLING_INTERVALS.SHOTS_STATUS);
    this.poll();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async poll() {
    try {
      const res = await fetch(`/api/projects/${this.pid}/episodes/${this.ep}/status`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const status = await res.json();
      this.consecutiveErrors = 0;
      this.onProgress(status);

      const st = String(status && status.status || "");
      if (st === "completed") {
        this.stop();
        this.onComplete(status);
      } else if (st === "failed" || st === "partial_failed") {
        this.stop();
        this.onError(status);
      }
    } catch (e) {
      console.error("Poll episode status failed:", e);
      this.consecutiveErrors += 1;
      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        this.stop();
        this.onError({ message: "无法获取分集状态，请刷新页面重试", status: "failed" });
      }
    }
  }
}

// 镜头生成进度轮询器
class ShotsProgressPoller {
  constructor(pid, ep) {
    this.pid = pid;
    this.ep = ep;
    this.interval = null;
    this.knownShots = new Map(); // sid -> has_video
    this.onShotGenerated = null;
    this.onProgress = null;
    this.onError = null;
    this.consecutiveErrors = 0;
    this.maxConsecutiveErrors = 5; // 镜头轮询允许更多失败次数
  }

  start(callbacks) {
    this.onShotGenerated = callbacks.onShotGenerated || (() => {});
    this.onProgress = callbacks.onProgress || (() => {});
    this.onError = callbacks.onError || (() => {});

    this.interval = setInterval(() => this.poll(), POLLING_INTERVALS.SHOTS_STATUS);
    this.poll();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async poll() {
    try {
      const res = await fetch(`/api/projects/${this.pid}/episodes/${this.ep}/shots_status`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      const shots = data.shots || [];

      // 请求成功，重置错误计数
      this.consecutiveErrors = 0;

      let generatedCount = 0;
      shots.forEach(shot => {
        if (shot.has_video) {
          generatedCount++;
          // 检查是否是新生成的
          if (!this.knownShots.get(shot.sid)) {
            this.knownShots.set(shot.sid, true);
            this.onShotGenerated(shot.sid, shot.file_path);
          }
        }
      });

      this.onProgress(generatedCount, shots.length);
    } catch (e) {
      console.error('Poll shots failed:', e);
      this.consecutiveErrors++;

      // 连续失败次数过多，停止轮询
      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        this.stop();
        if (this.onError) {
          this.onError('无法获取镜头生成状态，请刷新页面重试');
        }
      }
    }
  }
}

  function getAssetPipelineButtons() {
    return {
      adapt: document.getElementById("btn-asset-adapt"),
      reviewBatch: document.getElementById("btn-asset-review-batch"),
      genRemaining: document.getElementById("btn-asset-gen-remaining"),
      model: document.getElementById("btn-asset-img-model"),
    };
  }

  function setAssetPipelineBusy(mode, busy) {
    var b = getAssetPipelineButtons();
    var adapt = b.adapt;
    var reviewBatch = b.reviewBatch;
    var genRemaining = b.genRemaining;
    var model = b.model;
    if (!adapt || !reviewBatch || !genRemaining) return;
    if (busy) {
      adapt.disabled = true;
      reviewBatch.disabled = true;
      genRemaining.disabled = true;
      if (model) model.disabled = true;
      adapt.classList.add("btn-asset-task-busy");
      reviewBatch.classList.add("btn-asset-task-busy");
      genRemaining.classList.add("btn-asset-task-busy");
      if (mode === "adapt") {
        setBatchBtnText(adapt, "改编中…");
        setBatchBtnText(reviewBatch, ASSET_PIPELINE_LABELS.reviewBatch);
        setBatchBtnText(genRemaining, ASSET_PIPELINE_LABELS.genRemaining);
      } else if (mode === "review_batch") {
        setBatchBtnText(adapt, ASSET_PIPELINE_LABELS.adapt);
        setBatchBtnText(reviewBatch, "生成首图中…");
        setBatchBtnText(genRemaining, ASSET_PIPELINE_LABELS.genRemaining);
      } else if (mode === "gen_remaining") {
        setBatchBtnText(adapt, ASSET_PIPELINE_LABELS.adapt);
        setBatchBtnText(reviewBatch, ASSET_PIPELINE_LABELS.reviewBatch);
        setBatchBtnText(genRemaining, "生成剩余资产中…");
      }
    } else {
      adapt.classList.remove("btn-asset-task-busy");
      reviewBatch.classList.remove("btn-asset-task-busy");
      genRemaining.classList.remove("btn-asset-task-busy");
      setBatchBtnText(adapt, ASSET_PIPELINE_LABELS.adapt);
      setBatchBtnText(reviewBatch, ASSET_PIPELINE_LABELS.reviewBatch);
      setBatchBtnText(genRemaining, ASSET_PIPELINE_LABELS.genRemaining);
      adapt.removeAttribute("aria-busy");
      reviewBatch.removeAttribute("aria-busy");
      genRemaining.removeAttribute("aria-busy");
      adapt.disabled = !ASSET_ACTIONS_ENABLED;
      var genBlocked = !ASSET_ACTIONS_ENABLED || !isAssetAdaptStepComplete();
      reviewBatch.disabled = genBlocked || !isReviewBatchActionEnabled();
      genRemaining.disabled = genBlocked || !isGenRemainingActionEnabled();
      if (model) model.disabled = !ASSET_ACTIONS_ENABLED;
      if (genBlocked && ASSET_ACTIONS_ENABLED && !isAssetAdaptStepComplete()) {
        reviewBatch.setAttribute("title", "请先完成第 1 步「实体改编」（需覆盖全部资产）后再生成首图");
      } else if (reviewBatch && !genBlocked && !isReviewBatchActionEnabled()) {
        reviewBatch.setAttribute("title", "当前处于 ②c 阶段，请先完成剩余资产生成后再操作 ②a");
      } else if (genRemaining && !genBlocked) {
        if (!isGenRemainingActionEnabled() && GROUPS_APPROVED > 0 && REMAINING_OUTFITS_TOTAL > 0) {
          genRemaining.setAttribute("title", "当前处于 ②a 阶段，请先完成首图生成后再操作 ②c");
        } else if (GROUPS_APPROVED <= 0 && CHAR_GROUPS_TOTAL > 0) {
          genRemaining.setAttribute(
            "title",
            "首图尚未确认：请先完成 ②a 生成首图（将自动确认），或在 leader 历史版本中设为当前版本"
          );
        } else if (REMAINING_OUTFITS_TOTAL <= 0) {
          genRemaining.setAttribute("title", "所有角色组均只有一套服装；完成 ②b 确认首图后，本步骤无需执行");
        }
      }
    }
  }

  function analyzeBusyStorageKey() {
    return "dr_analyze_busy_" + String(PID);
  }
  function readAnalyzeBusyRaw() {
    var k = analyzeBusyStorageKey();
    try {
      var v = localStorage.getItem(k);
      if (v != null && v !== "") return v;
    } catch (_) {}
    try {
      var s = sessionStorage.getItem(k);
      if (s != null && s !== "") {
        try {
          localStorage.setItem(k, s);
        } catch (_) {}
        try {
          sessionStorage.removeItem(k);
        } catch (_) {}
        return s;
      }
    } catch (_) {}
    return null;
  }
  function setAnalyzeBusyPending() {
    var v = JSON.stringify({ t: Date.now() });
    try {
      localStorage.setItem(analyzeBusyStorageKey(), v);
    } catch (e) {
      try {
        sessionStorage.setItem(analyzeBusyStorageKey(), v);
      } catch (e2) {
        console.warn("[analyze] cannot persist busy flag", e2);
      }
    }
  }
  function clearAnalyzeBusyPending() {
    var k = analyzeBusyStorageKey();
    try {
      localStorage.removeItem(k);
    } catch (_) {}
    try {
      sessionStorage.removeItem(k);
    } catch (_) {}
  }
  function restoreAnalyzeBusyButtonIfPending() {
    if (ANALYZE_DONE) {
      clearAnalyzeBusyPending();
      return;
    }
    var btn = document.getElementById("btn-analyze-full");
    if (!btn) return;
    var raw = readAnalyzeBusyRaw();
    if (!raw) return;
    var o;
    try {
      o = JSON.parse(raw);
    } catch (_) {
      clearAnalyzeBusyPending();
      return;
    }
    var t = o && typeof o.t === "number" ? o.t : 0;
    if (Date.now() - t > POLLING_INTERVALS.ANALYZE_TIMEOUT) {
      clearAnalyzeBusyPending();
      return;
    }
    btn.disabled = true;
    btn.classList.remove("btn-analyze-go", "ba", "btn-analyze-wait", "btn-analyze-done");
    btn.classList.add("btn-analyze-busy");
    btn.textContent = "分析中…";
    btn.removeAttribute("title");
  }

  restoreAnalyzeBusyButtonIfPending();
  document.addEventListener("DOMContentLoaded", restoreAnalyzeBusyButtonIfPending);
  window.addEventListener("pageshow", function (ev) {
    if (ev.persisted) restoreAnalyzeBusyButtonIfPending();
  });

  (function () {
    function syncBatchSubIntent() {
      var si = document.getElementById("batch-subtitles-inp");
      var hid = document.getElementById("batch-sub-intent");
      if (!si || !hid) return;
      hid.value = si.files && si.files.length > 0 ? "1" : "0";
    }
    document.addEventListener("DOMContentLoaded", function () {
      var si = document.getElementById("batch-subtitles-inp");
      if (si) {
        syncBatchSubIntent();
        si.addEventListener("change", syncBatchSubIntent);
      }
      var batchForm = document.getElementById("form-batch-ep-upload");
      var progWrap = document.getElementById("batch-upload-progress-wrap");
      var prog = document.getElementById("batch-upload-progress");
      var progPct = document.getElementById("batch-upload-progress-pct");
      var progLabel = document.getElementById("batch-upload-progress-label");
      var progHint = document.getElementById("batch-upload-progress-hint");
      if (batchForm && progWrap && prog && progPct && progLabel) {
        batchForm.addEventListener("submit", function (ev) {
          ev.preventDefault();
          syncBatchSubIntent();
          if (typeof batchForm.reportValidity === "function" && !batchForm.reportValidity()) return;
          var btn = document.getElementById("btn-batch-ep-upload");
          var fd = new FormData(batchForm);
          progWrap.style.display = "block";
          prog.value = 0;
          progPct.textContent = "0%";
          progLabel.textContent = "正在上传，请勿关闭页面…";
          if (progHint) progHint.style.display = "block";
          if (btn) btn.disabled = true;
          var xhr = new XMLHttpRequest();
          xhr.open("POST", batchForm.action, true);
          xhr.upload.onprogress = function (e) {
            if (e.lengthComputable && e.total > 0) {
              var p = Math.min(100, Math.round((100 * e.loaded) / e.total));
              prog.value = p;
              progPct.textContent = p + "%";
            } else {
              prog.removeAttribute("value");
              progPct.textContent = "计算中…";
            }
          };
          xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 400) {
              prog.value = 100;
              progPct.textContent = "100%";
              progLabel.textContent = "上传完成，正在跳转…";
              window.location.href = xhr.responseURL || batchForm.action;
              return;
            }
            progWrap.style.display = "none";
            if (btn) btn.disabled = false;
            prog.value = 0;
            progPct.textContent = "";
            if (typeof toast === "function") toast("上传失败（HTTP " + xhr.status + "）", true);
            else alert("上传失败（HTTP " + xhr.status + "）");
          };
          xhr.onerror = function () {
            progWrap.style.display = "none";
            if (btn) btn.disabled = false;
            prog.value = 0;
            progPct.textContent = "";
            if (typeof toast === "function") toast("上传失败（网络错误）", true);
            else alert("上传失败（网络错误）");
          };
          xhr.send(fd);
        });
      }
    });
    window.addEventListener("pageshow", function (ev) {
      if (ev.persisted) syncBatchSubIntent();
    });
  })();

  (function () {
    function onUploadPanelFileChange(ev) {
      var t = ev.target;
      if (!t || t.type !== "file" || !t.hasAttribute("data-ep-video-auto")) return;
      if (!t.files || !t.files.length) return;
      var vid = t.getAttribute("id") || "";
      var n = vid.indexOf("vf-") === 0 ? vid.slice(3) : "";
      var fnEl = n ? document.getElementById("vfn-" + n) : null;
      var lbl = n ? document.getElementById("vfl-" + n) : null;
      if (fnEl) fnEl.textContent = "上传中…";
      if (lbl) {
        lbl.classList.add("file-btn-v-uploading");
        lbl.classList.remove("file-btn-v-active");
        lbl.textContent = "上传中…";
      }
      var form = t.closest("form");
      if (!form || !form.id || form.id.indexOf("form-up-") !== 0) return;
      if (typeof form.requestSubmit === "function") form.requestSubmit();
      else form.submit();
    }
    document.addEventListener("DOMContentLoaded", function () {
      var panel = document.getElementById("upload-panel");
      if (panel) panel.addEventListener("change", onUploadPanelFileChange);
    });
  })();

  function toast(msg, err, holdMs) {
    const el = document.getElementById("toast");
    if (!el) {
      console.warn("[toast]", msg);
      return;
    }
    el.textContent = msg;
    el.className = "toast on" + (err ? " err" : "");
    clearTimeout(window.__tt);
    var ms = typeof holdMs === "number" && holdMs > 0 ? holdMs : POLLING_INTERVALS.TOAST_DURATION;
    window.__tt = setTimeout(() => el.classList.remove("on"), ms);
  }

  function showStickyError(title, detail) {
    const text = (detail == null ? "" : String(detail)).trim();
    if (typeof showProjectErrorPanel === "function") {
      showProjectErrorPanel(title || "操作失败", text || "未知错误");
    }
    // 仍保留 toast，延长显示时间，避免用户错过
    toast(text || (title || "操作失败"), true, 12000);
  }

  function dismissProjectErrorPanel() {
    var panel = document.getElementById("project-error-panel");
    if (panel) {
      panel.classList.remove("on");
      panel.setAttribute("aria-hidden", "true");
    }
  }

  /** 长错误：固定条展示，需用户点 × 关闭（不自动消失） */
  function showProjectErrorPanel(title, detail) {
    var panel = document.getElementById("project-error-panel");
    var titleEl = document.getElementById("project-error-panel-title");
    var bodyEl = document.getElementById("project-error-panel-body");
    var text = (detail != null && detail !== "") ? String(detail) : "";
    if (!panel || !bodyEl) {
      toast((title ? title + "：" : "") + text, true, 120000);
      return;
    }
    if (titleEl) titleEl.textContent = title || "操作失败";
    bodyEl.textContent = text;
    panel.classList.add("on");
    panel.setAttribute("aria-hidden", "false");
  }

  window.dismissProjectErrorPanel = dismissProjectErrorPanel;
  window.showProjectErrorPanel = showProjectErrorPanel;

  async function postJSON(url, body) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    if (!r.ok) {
      let detail = r.statusText;
      try {
        const j = await r.json();
        if (j) {
          if (j.detail) detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
          else if (j.message) detail = typeof j.message === "string" ? j.message : JSON.stringify(j.message);
        }
      } catch (_) {}
      throw new Error(detail);
    }
    return r.json().catch(() => ({}));
  }

  async function patchJSON(url, body) {
    const r = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    if (!r.ok) {
      let detail = r.statusText;
      try {
        const j = await r.json();
        if (j) {
          if (j.detail) detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
          else if (j.message) detail = typeof j.message === "string" ? j.message : JSON.stringify(j.message);
        }
      } catch (_) {}
      throw new Error(detail);
    }
    return r.json().catch(() => ({}));
  }

  // 暴露到全局作用域供其他模块使用
  window.toast = toast;
  window.patchJSON = patchJSON;
  window.postJSON = postJSON;

  // ==================== 视频延续（模型 2：项目总开关 + 单镜例外） ====================
  function applyShotRefPrevUiFromCheckbox(cb) {
    if (!cb) return;
    const card = cb.closest(".shot-card");
    const group = card && card.querySelector(".sb-prompt-group");
    if (group) {
      group.classList.toggle("has-ref-prev", ENABLE_VIDEO_EXTEND && cb.checked);
    }
  }

  function applyVideoExtendUiState(enabled, options) {
    const opts = options && typeof options === "object" ? options : {};
    const syncCheckboxes = opts.syncCheckboxes === true;
    ENABLE_VIDEO_EXTEND = !!enabled;
    if (window.PAGE_DATA) {
      window.PAGE_DATA.enableVideoExtend = ENABLE_VIDEO_EXTEND;
    }
    const master = document.getElementById("chk-enable-video-extend");
    if (master) master.checked = ENABLE_VIDEO_EXTEND;

    document.querySelectorAll(".sb-shot-prev-cb").forEach((cb) => {
      const shotSection = cb.closest(".sb-shot-section");
      const sid = shotSection && String(shotSection.getAttribute("data-sid") || "").trim();
      cb.disabled = !ENABLE_VIDEO_EXTEND;
      if (!ENABLE_VIDEO_EXTEND) {
        cb.checked = false;
      } else if (syncCheckboxes && sid && sid !== "1") {
        cb.checked = true;
      }
      applyShotRefPrevUiFromCheckbox(cb);
    });
  }

  async function setProjectVideoExtend(enabled) {
    const master = document.getElementById("chk-enable-video-extend");
    const prev = ENABLE_VIDEO_EXTEND;
    const target = !!enabled;
    if (master) master.disabled = true;
    try {
      const resp = await patchJSON(
        "/api/projects/" + encodeURIComponent(PID) + "/video_extend",
        { enable_video_extend: target }
      );
      applyVideoExtendUiState(!!(resp && resp.enable_video_extend), { syncCheckboxes: true });
      const nEp = Array.isArray(resp && resp.synced_episodes) ? resp.synced_episodes.length : 0;
      const nShot = Number(resp && resp.synced_shots) || 0;
      const msg = target
        ? `已开启上一镜视频延续（已同步 ${nEp} 集、${nShot} 个镜头）`
        : `已关闭上一镜视频延续（已同步 ${nEp} 集、${nShot} 个镜头）`;
      toast(msg, false, 3200);
    } catch (e) {
      if (master) master.checked = prev;
      applyVideoExtendUiState(prev);
      showStickyError("视频延续设置失败", (e && e.message) || String(e));
      throw e;
    } finally {
      if (master) master.disabled = false;
    }
  }

  function initVideoExtendMasterControl() {
    const master = document.getElementById("chk-enable-video-extend");
    if (!master) return;
    applyVideoExtendUiState(ENABLE_VIDEO_EXTEND, { syncCheckboxes: false });
    if (master.getAttribute("data-bound") === "1") return;
    master.setAttribute("data-bound", "1");
    master.addEventListener("change", () => {
      setProjectVideoExtend(master.checked).catch(() => {});
    });
  }

  window.applyVideoExtendUiState = applyVideoExtendUiState;
  window.setProjectVideoExtend = setProjectVideoExtend;
  window.initVideoExtendMasterControl = initVideoExtendMasterControl;
  window.applyShotRefPrevUiFromCheckbox = applyShotRefPrevUiFromCheckbox;

  // ==================== 资产卡片颜色标识 ====================
  function initAssetCardColors() {
    // 简单的字符串哈希函数
    function hashString(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash);
    }

    // 为每个资产卡片分配颜色
    document.querySelectorAll('.asset-card').forEach(card => {
      const aid = card.getAttribute('data-aid');
      if (aid) {
        const colorIndex = hashString(aid) % 16; // 16种颜色
        card.setAttribute('data-asset-color', colorIndex);
      }
    });
  }

  // 页面加载时初始化
  document.addEventListener('DOMContentLoaded', initAssetCardColors);
  window.addEventListener('pageshow', function(ev) {
    if (ev.persisted) initAssetCardColors();
  });

  /** 去掉 sb_ep/sb_shot，避免误开「视频生成」。keepMain 为 "asset" 时设 view=asset，刷新后留在「资产库」。 */
  function reloadProjectStripStoryboardParams(keepMain) {
    try {
      var q = new URLSearchParams(window.location.search || "");
      q.delete("sb_ep");
      q.delete("sb_shot");
      if (keepMain === "asset") {
        q.set("view", "asset");
      } else {
        q.delete("view");
      }
      var s = q.toString();
      window.location.href = window.location.pathname + (s ? "?" + s : "");
    } catch (_) {
      window.location.reload();
    }
  }

  var ASSET_SCROLL_RESTORE_KEY = "drama_remake_asset_restore_v1";

  function stashAssetViewScrollForReload(kind, aid) {
    try {
      sessionStorage.setItem(
        ASSET_SCROLL_RESTORE_KEY,
        JSON.stringify({
          pid: PID,
          path: window.location.pathname,
          kind: kind || "",
          aid: aid || "",
          scrollY: window.scrollY || window.pageYOffset || 0,
          t: Date.now(),
        })
      );
    } catch (_) {}
  }

  function restoreAssetViewScrollIfNeeded() {
    try {
      var raw = sessionStorage.getItem(ASSET_SCROLL_RESTORE_KEY);
      if (!raw) return;
      sessionStorage.removeItem(ASSET_SCROLL_RESTORE_KEY);
      var data = JSON.parse(raw);
      if (!data || data.pid !== PID || data.path !== window.location.pathname) return;
      var q = new URLSearchParams(window.location.search || "");
      if (q.get("view") !== "asset") return;
      var va = document.getElementById("v-a");
      if (!va || !va.classList.contains("on")) return;
      var kind = data.kind;
      var aid = data.aid;
      var y = Number(data.scrollY);
      if (!Number.isFinite(y) || y < 0) y = 0;
      if (kind) {
        var tabBtn = document.querySelector("#v-a .tab[data-tab=\"" + kind + "\"]");
        if (tabBtn) stab(kind, tabBtn);
      }
      var card = null;
      if (kind && aid) {
        if (typeof CSS !== "undefined" && CSS.escape) {
          card = document.querySelector(
            "#v-a .asset-card[data-kind=\"" + kind + "\"][data-aid=\"" + CSS.escape(aid) + "\"]"
          );
        }
        if (!card) {
          document.querySelectorAll("#v-a .asset-card").forEach(function (el) {
            if (el.getAttribute("data-kind") === kind && el.getAttribute("data-aid") === aid) card = el;
          });
        }
      }
      var doScroll = function () {
        if (card && typeof card.scrollIntoView === "function") {
          card.scrollIntoView({ block: "center", behavior: "auto" });
        } else if (y > 0) {
          window.scrollTo(0, y);
        }
      };
      requestAnimationFrame(function () {
        requestAnimationFrame(doScroll);
      });
    } catch (_) {}
  }

  /** 本集改编完成后：显式带上 view=adapt 与 sb_ep，避免仅靠顶栏点击切 Tab、地址栏仍是 view=asset / 裸 sb_ep 导致 reload 落到其他 Tab。 */
  function reloadProjectStayAdaptTab(ep) {
    stashAdaptRequirementsForReload();
    try {
      var q = new URLSearchParams(window.location.search || "");
      q.set("view", "adapt");
      // 只有有效的集数才设置 sb_ep，否则删除该参数
      if (ep != null && Number.isFinite(parseInt(ep, 10))) {
        q.set("sb_ep", String(ep));
      } else {
        q.delete("sb_ep");
      }
      q.delete("sb_shot");
      var s = q.toString();
      window.location.href = window.location.pathname + (s ? "?" + s : "");
    } catch (_) {
      window.location.reload();
    }
  }

  function sw(which, el) {
    // 安全兜底：确保任何残留的 overflow:hidden 被清除（lightbox/弹窗异常关闭、视频工作室锁死时可能残留）
    // 工作室态会同时锁 body 与 html（documentElement）；切走时两者都要恢复，否则其他页面无法滚动
    if (document.body.style.overflow === "hidden") document.body.style.overflow = "";
    if (document.documentElement.style.overflow === "hidden") document.documentElement.style.overflow = "";
    // 切换显示的页面
    document.querySelectorAll(".vw").forEach((e) => e.classList.remove("on"));
    document.getElementById("v-" + which).classList.add("on");
    // 项目列表页隐藏顶栏中间 4 功能 step（对齐设计：未进项目时不显示功能键）
    if (which === "plist") document.body.classList.add("on-plist");
    else document.body.classList.remove("on-plist");
    document.querySelectorAll(".topnav .step").forEach((s) => s.classList.remove("on"));
    if (el) el.classList.add("on");
  updateTopnavStepStates(which);
  markTopnavHintSeen();
  renderSyncedNoticeIfAny(which);
  renderEpisodeRegenNotice(which);

    // DEMO：追踪实时视图；切到视频页('g')时刷新集数面板状态
    window.SB_VIEW_LIVE = (which === 'g') ? 'video' : which;
    if (which === 'g') {
      if (typeof refreshEpisodeStatusBadges === "function") refreshEpisodeStatusBadges();
      var _vgEl = document.getElementById('v-g'); if (_vgEl) _vgEl.classList.remove('vg-studio-on');
    }

    // 更新 URL 参数，保持当前页面状态
    const url = new URL(window.location);

    // 清除分镜相关参数（当切换到非视频生成页面时）
    if (which !== 'g' && which !== 'adapt') {
      url.searchParams.delete('sb_ep');
      url.searchParams.delete('sb_shot');
    }

    // 将内部 ID 映射到 URL 参数值
    const viewParamMap = {
      'p': null,        // 页面1是默认，不需要参数
      'a': 'asset',     // 页面2：资产库
      'adapt': 'adapt', // 页面3：剧集改编
      'g': 'video'      // 页面4：视频生成
    };

    const viewParam = viewParamMap[which];
    if (viewParam) {
      url.searchParams.set('view', viewParam);
    } else {
      url.searchParams.delete('view');
    }

    // 本地 Demo：禁用 URL 更新，保持地址栏干净
    if (!window.__LOCAL_DEMO__) {
      window.history.pushState({}, '', url);
    }
  }

function topnavStepKeydown(ev, which, el) {
  if (!ev) return;
  const k = ev.key || "";
  if (k === "Enter" || k === " ") {
    ev.preventDefault();
    sw(which, el);
  }
}

function getTopnavStepOrder(which) {
  const map = { p: 1, a: 2, adapt: 3, g: 4 };
  return map[which] || 1;
}

function updateTopnavStepStates(which) {
  // 简化：仅清除 done/pending，不设置进度状态（只保留选中态 on）
  document.querySelectorAll(".topnav .step").forEach(function (step) { step.classList.remove("done", "pending"); });
  document.querySelectorAll(".topnav .sa").forEach(function (bar) { bar.classList.remove("done"); });
}

document.addEventListener("DOMContentLoaded", function () {
  initTopnavClickHint();
  // 兜底：清理异常残留的遮罩层，避免整页发黑
  document.querySelectorAll(".dialog-backdrop.on").forEach(function (dlg) {
    dlg.classList.remove("on");
    dlg.setAttribute("aria-hidden", "true");
  });
});

  function _updateAssetUrlParams(patch) {
    if (window.__LOCAL_DEMO__) return;
    const url = new URL(window.location.href);
    Object.entries(patch || {}).forEach(([k, v]) => {
      if (v === null || v === undefined || v === "") {
        url.searchParams.delete(k);
      } else {
        url.searchParams.set(k, String(v));
      }
    });
    history.replaceState({}, "", url.pathname + (url.searchParams.toString() ? "?" + url.searchParams.toString() : ""));
  }

  function _getAssetTabButton(kind) {
    const target = String(kind || "").trim();
    if (!target) return null;
    return Array.from(document.querySelectorAll(".tabs .tab[data-tab]")).find(
      (el) => String(el.getAttribute("data-tab") || "").trim() === target
    ) || null;
  }

  function _findAssetCard(allCards, aid) {
    if (!allCards) return null;
    const targetAid = String(aid || "").trim();
    if (!targetAid) return null;
    let card = null;
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
      card = allCards.querySelector('.asset-card[data-aid="' + CSS.escape(targetAid) + '"]');
    }
    if (!card) {
      card = Array.from(allCards.querySelectorAll(".asset-card[data-aid]")).find(
        (el) => String(el.getAttribute("data-aid") || "").trim() === targetAid
      ) || null;
    }
    return card;
  }

  function _restoreAssetViewFromUrl() {
    if (CURRENT_VIEW !== "asset") return;
    const url = new URL(window.location.href);
    const tab = String(url.searchParams.get("asset_tab") || url.searchParams.get("asset_kind") || "characters").trim();
    const aid = String(url.searchParams.get("asset_aid") || "").trim();
    const kind = String(url.searchParams.get("asset_kind") || tab || "characters").trim();

    const tabBtn = _getAssetTabButton(tab);
    if (tabBtn) {
      stab(tab, tabBtn);
    }
    if (aid && kind) {
      openAssetEdit(kind, aid);
    }
  }

  function toggleExtremeNoSpace() {
    const url = new URL(window.location.href);
    const enabled = !!(window.PAGE_DATA && window.PAGE_DATA.extremeNoSpace);
    if (enabled) {
      url.searchParams.delete("tight_text");
    } else {
      url.searchParams.set("tight_text", "1");
    }
    window.location.href = url.pathname + (url.searchParams.toString() ? "?" + url.searchParams.toString() : "");
  }

  function stab(kind, btn) {
    document.querySelectorAll(".ast-tab").forEach((p) => (p.style.display = "none"));
    const p = document.getElementById("tab-" + kind);
    if (p) p.style.display = "block";
    const tabs = btn.parentElement.querySelectorAll(".tab");
    tabs.forEach((t) => t.classList.remove("on"));
    btn.classList.add("on");
    // 切换资产 tab 时，若处于编辑态则回到分组列表
    _assetShowGroupView(kind);
    updateAssetMergeToolbar(kind);
    _updateAssetUrlParams({
      view: "asset",
      asset_tab: kind,
      asset_kind: kind,
      asset_aid: null,
    });
  }

  // ── 资产分组视图切换（角色/场景/道具复用） ─────────────────────────────
  function toggleAssetGroup(kind, baseId) {
    const selector = '.asset-group[data-kind="' + CSS.escape(kind) + '"][data-base-id="' + CSS.escape(baseId) + '"]';
    const grp = document.querySelector(selector);
    if (!grp) return;
    // 多选模式：点击卡片只切换选中，不展开/折叠
    var va = document.getElementById('v-a');
    if (va && va.classList.contains('ms-mode')) {
      var c = grp.querySelector('.ms-check');
      if (c) { c.checked = !c.checked; if (typeof window.onMsCheck === 'function') window.onMsCheck(c); }
      return;
    }
    grp.classList.toggle('open');
  }

  function openAssetEdit(kind, aid, baseId) {
    const allCards = document.getElementById(kind + '-all-cards');
    const groupView = document.getElementById(kind + '-group-view');
    const editPanel = document.getElementById(kind + '-edit-panel');
    const container = document.getElementById(kind + '-edit-container');
    const breadcrumb = document.getElementById(kind + '-edit-breadcrumb');
    if (!allCards || !groupView || !editPanel || !container) return;

    const card = _findAssetCard(allCards, aid);
    if (!card) return;

    // 将 card 移入编辑容器
    container.innerHTML = '';
    container.appendChild(card);

    // 更新面包屑
    if (breadcrumb) {
      const idTransEl = card.querySelector('[data-field="name_trans"]');
      const nameOri = aid.split('_').slice(1).join('_') || aid;
      const nameTrans = idTransEl ? idTransEl.value : '';
      breadcrumb.textContent = (nameTrans || nameOri);
    }

    groupView.style.display = 'none';
    editPanel.style.display = 'block';
    var va = document.getElementById('v-a'); if (va) va.classList.add('asset-detail-on');

    // 详情态布局重组（上信息 + 下生成区左右分栏）
    _expandAssetCard(card);
    // 刷新参考图预览（因为 card 刚移入可见区域）
    if (window.assetRefPreview) {
      const promptEl = card.querySelector('textarea[data-field="prompt"]');
      window.assetRefPreview.update(card, promptEl ? promptEl.value : '');
    }
    _updateAssetUrlParams({
      view: "asset",
      asset_tab: kind,
      asset_kind: kind,
      asset_aid: aid,
    });
    window.__lastAssetGroup = { kind: kind, baseId: baseId };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeAssetEdit(kind) {
    const allCards = document.getElementById(kind + '-all-cards');
    const groupView = document.getElementById(kind + '-group-view');
    const editPanel = document.getElementById(kind + '-edit-panel');
    const container = document.getElementById(kind + '-edit-container');
    if (!allCards || !groupView || !editPanel || !container) return;

    // 把 card 归还到隐藏容器（先还原列表态结构）
    const card = container.querySelector('.asset-card');
    if (card) { _collapseAssetCard(card); allCards.appendChild(card); }

    container.innerHTML = '';
    editPanel.style.display = 'none';
    groupView.style.display = 'block';
    var va = document.getElementById('v-a'); if (va) va.classList.remove('asset-detail-on');
    _updateAssetUrlParams({
      view: "asset",
      asset_tab: kind,
      asset_kind: kind,
      asset_aid: null,
    });
    // 返回时回到原分组位置（而非页顶）
    var __last = window.__lastAssetGroup;
    var __grp = (__last && __last.kind === kind)
      ? document.querySelector('.asset-group[data-kind="' + CSS.escape(kind) + '"][data-base-id="' + CSS.escape(__last.baseId) + '"]')
      : null;
    if (__grp) {
      var __t = __grp;
      setTimeout(function () {
        var rect = __t.getBoundingClientRect();
        var target = window.scrollY + rect.top - (window.innerHeight - rect.height) / 2;
        window.scrollTo({ top: Math.max(0, Math.round(target)), behavior: 'smooth' });
      }, 80);
    } else window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 详情态：资产卡重组为「上信息 + 下生成区」，生成区完整复刻视频生成工作室布局
  // 一个统一容器（同背景）：左列=参考图条+提示词(浮动工具栏右下角,文字渐隐) | 右列=生成结果+历史(底部)
  function _expandAssetCard(card) {
    if (!card || card.querySelector('.ad-gen')) return;
    var flexWrap = card.querySelector(':scope > div');
    if (!flexWrap) return;
    var left = flexWrap.children[0];
    var right = flexWrap.children[1];
    if (!left || !right) return;
    card._assetOrigHTML = card.innerHTML;
    var thumb = left.querySelector('.thumb');
    var refPreview = left.querySelector('.asset-ref-preview');
    var refAdd = left.querySelector('.asset-ref-add-wrap');
    var titleBlock = right.children[0];
    var idBlock = right.children[1];
    var metaBlock = right.children[2];
    var grid = right.querySelector('.asset-grid');
    var promptTa = right.querySelector('textarea[data-field="prompt"]');
    var promptHint = promptTa ? promptTa.previousElementSibling : null;
    var promptLabel = promptHint ? promptHint.previousElementSibling : null;
    var actions = right.querySelector('.asset-actions');
    var historyBtn = null, genBtn = null, modelBtn = null;
    if (actions) {
      Array.prototype.forEach.call(actions.children, function (b) {
        var oc = b.getAttribute('onclick') || '';
        var cls = b.className || '';
        if (oc.indexOf('openAssetHistoryModal') >= 0) historyBtn = b;
        else if (oc.indexOf('genOneAsset') >= 0) genBtn = b;
        else if (cls.indexOf('btn-asset-card-img-model') >= 0) modelBtn = b;
      });
    }
    card.innerHTML = '';
    var info = document.createElement('div'); info.className = 'ad-info';
    [titleBlock, idBlock, metaBlock, grid].forEach(function (el) { if (el) info.appendChild(el); });

    // 生成区：统一容器（一个背景，左右两列共用）
    var gen = document.createElement('div'); gen.className = 'ad-gen';
    var genTitle = document.createElement('div'); genTitle.className = 'ad-gen-title'; genTitle.textContent = '素材生成';
    gen.appendChild(genTitle);
    var split = document.createElement('div'); split.className = 'ad-split';   // 等同 .sb-editor-split.vg-reshaped

    // 左列：参考图条（"引用参考"文字 + 横向缩略图）+ 提示词块
    var editCol = document.createElement('div'); editCol.className = 'ad-edit-col';   // 等同 .vg-edit-col
    var refStrip = document.createElement('div'); refStrip.className = 'ad-ref-strip';
    var refLabel = document.createElement('span'); refLabel.className = 'ad-ref-label'; refLabel.textContent = '引用参考';
    refStrip.appendChild(refLabel);
    if (refPreview) refStrip.appendChild(refPreview);   // 仅缩略图
    editCol.appendChild(refStrip);
    // 提示词块（对齐 .sb-prompt-block：撑满左列剩余）
    var promptBlock = document.createElement('div'); promptBlock.className = 'ad-prompt-block';
    if (promptLabel) promptBlock.appendChild(promptLabel);
    if (promptHint) promptBlock.appendChild(promptHint);
    // 提示词组（对齐 .sb-prompt-group：带边框容器 + bg1 + 圆角；textarea 不可拖动+内部滚动+文字渐隐）
    var promptGroup = document.createElement('div'); promptGroup.className = 'ad-prompt-group';
    if (promptTa) promptGroup.appendChild(promptTa);
    promptBlock.appendChild(promptGroup);
    editCol.appendChild(promptBlock);
    split.appendChild(editCol);

    // 右列：生成结果（图片自适应比例撑满居中）+ 历史（底部固定）
    var genCol = document.createElement('div'); genCol.className = 'ad-gen-col';   // 等同 .sb-col-gen
    var result = document.createElement('div'); result.className = 'ad-result';
    if (thumb) {
      thumb.addEventListener('click', function () {
        var src = thumb.getAttribute('src') || '';
        if (src && typeof openAssetImgLightbox === 'function') openAssetImgLightbox(src);
      });
      result.appendChild(thumb);
    }
    genCol.appendChild(result);
    if (historyBtn) {
      var hist = document.createElement('div'); hist.className = 'ad-history';
      historyBtn.classList.add('vg-tool-btn');
      historyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg><span>历史版本</span>';
      hist.appendChild(historyBtn);
      genCol.appendChild(hist);
    }
    split.appendChild(genCol);

    gen.appendChild(split);
    card.appendChild(info); card.appendChild(gen);

    // 去掉 label 中的英文字段名
    card.querySelectorAll('label.lbl').forEach(function (l) {
      l.textContent = l.textContent.replace(/\s+[a-z_]+\s*$/i, '').trim();
    });

    // 底部工具栏：此时 card 内 DOM 已挂载完成（textarea 在 .ad-prompt-group 内），
    // 主动注入 asset-ai-toolbar（提示词优化/反推），再把右侧按钮 append 进同一行（必须在加 ad-expanded 之前注入，否则被跳过）
    if (typeof _injectAssetAiToolbar === 'function') {
      try { _injectAssetAiToolbar(card); } catch (_) {}
    }
    var aiToolbar = card.querySelector('.asset-ai-toolbar');
    if (aiToolbar) {
      aiToolbar.classList.add('ad-toolbar');
      var rightGroup = document.createElement('div'); rightGroup.className = 'ad-toolbar-right';
      if (refAdd) {
        var refBtn = refAdd.querySelector('.asset-ref-upload-btn');
        if (refBtn) { refBtn.textContent = '添加参考图'; refBtn.title = '添加参考图'; refBtn.classList.add('ad-tool-btn', 'ad-ref-add'); }
        rightGroup.appendChild(refAdd);
      }
      if (typeof window.buildParamsDisplay === 'function') {
        var tmp = document.createElement('div'); tmp.innerHTML = window.buildParamsDisplay('card');
        if (tmp.firstChild) rightGroup.appendChild(tmp.firstChild);
      }
      if (modelBtn) { modelBtn.classList.add('ad-tool-btn'); rightGroup.appendChild(modelBtn); }
      if (genBtn) { genBtn.classList.add('ad-gen-btn'); rightGroup.appendChild(genBtn); }
      aiToolbar.appendChild(rightGroup);
    }

    card.classList.add('ad-expanded');
  }
  // 还原列表态结构
  function _collapseAssetCard(card) {
    if (!card) return;
    if (card._assetOrigHTML) { card.innerHTML = card._assetOrigHTML; delete card._assetOrigHTML; }
    card.classList.remove('ad-expanded');
  }

  function _assetShowGroupView(kind) {
    const groupView = document.getElementById(kind + '-group-view');
    const editPanel = document.getElementById(kind + '-edit-panel');
    const container = document.getElementById(kind + '-edit-container');
    const allCards = document.getElementById(kind + '-all-cards');
    if (!groupView || !editPanel) return;
    if (editPanel.style.display !== 'none') {
      // 归还 card
      const card = container && container.querySelector('.asset-card');
      if (card && allCards) allCards.appendChild(card);
      if (container) container.innerHTML = '';
      editPanel.style.display = 'none';
      groupView.style.display = 'block';
    }
  }

  window.stab = stab;
  window.toggleAssetGroup = toggleAssetGroup;
  window.openAssetEdit = openAssetEdit;
  window.closeAssetEdit = closeAssetEdit;

  // ── 资产软合并（共享参考图：角色 / 场景 / 道具） ───────────────────────
  let assetMergeKind = "characters";
  let assetMergePrefillCanonical = "";
  let assetMergeCanonicalId = "";
  const assetMergeSelectedSources = new Set();

  const ASSET_MERGE_KIND_META = {
    characters: {
      label: "角色",
      title: "合并角色（共享参考图）",
      intro:
        "保留所有角色条目与分镜 @[] 引用不变；并入后，被合并条目生图时将统一使用主资产（leader）的确认图或当前图。若误操作，可在组内卡片上点击「移出本组」撤销。",
      emptyToast: "暂无角色资产，请先完成视频分析",
      detachHint: "该条目将恢复为独立角色组",
    },
    scenes: {
      label: "场景",
      title: "合并场景（共享参考图）",
      intro:
        "保留所有场景条目与分镜 @[] 引用不变；并入后，被合并条目生图时将统一使用主场景（leader）的参考图。若误操作，可在组内卡片上点击「移出本组」撤销。",
      emptyToast: "暂无场景资产，请先完成视频分析",
      detachHint: "该条目将恢复为独立场景组",
    },
    props: {
      label: "道具",
      title: "合并道具（共享参考图）",
      intro:
        "保留所有道具条目与分镜 @[] 引用不变；并入后，被合并条目生图时将统一使用主道具（leader）的参考图。若误操作，可在组内卡片上点击「移出本组」撤销。",
      emptyToast: "暂无道具资产，请先完成视频分析",
      detachHint: "该条目将恢复为独立道具组",
    },
  };

  function getActiveAssetTabKind() {
    const active = document.querySelector(".ast-tabs .tab.on, .tabs .tab.on");
    if (!active) return "characters";
    const kind = String(active.getAttribute("data-kind") || active.getAttribute("data-tab") || "").trim();
    return ASSET_MERGE_KIND_META[kind] ? kind : "characters";
  }

  function updateAssetMergeToolbar(kind) {
    const resolved = ASSET_MERGE_KIND_META[kind] ? kind : "characters";
    const meta = ASSET_MERGE_KIND_META[resolved];
    const labelEl = document.getElementById("btn-asset-merge-soft-label");
    if (labelEl) labelEl.textContent = meta.title;
    const btn = document.getElementById("btn-asset-merge-soft");
    if (btn && !btn.disabled) {
      btn.title = "将多个" + meta.label + "条目绑定为同一组，共享 leader 参考图生图；不修改分镜引用";
    }
  }

  function getAssetGroupMembership(kind, aid) {
    const asset = (window.PAGE_DATA && window.PAGE_DATA.asset) || {};
    const groups = ((asset.asset_groups || {})[kind]) || {};
    const target = String(aid || "");
    for (const members of Object.values(groups)) {
      if (!Array.isArray(members)) continue;
      const normalized = members.map((m) => String(m));
      if (normalized.includes(target)) {
        return { leaderId: normalized[0], members: normalized };
      }
    }
    return { leaderId: target, members: [target] };
  }

  function pickDefaultAssetCanonicalId(kind, rows, prefill) {
    if (prefill && rows[prefill]) return String(prefill);
    const withImage = Object.keys(rows).find((aid) => String((rows[aid] || {}).file_path || "").trim());
    if (withImage) return withImage;
    const keys = Object.keys(rows);
    return keys.length ? keys[0] : "";
  }

  function _assetMergeRowMeta(row, aid) {
    const name = String((row && (row.name_trans || row.name_ori)) || aid);
    const idTrans = String((row && row.id_trans) || aid);
    return { name: name, idTrans: idTrans, aid: String(aid) };
  }

  function _assetMergeThumb(parent, row, pid) {
    const wrap = document.createElement("div");
    wrap.className = "asset-merge-row-thumb";
    const fp = String((row && row.file_path) || "").trim();
    if (fp) {
      const img = document.createElement("img");
      img.src = "/files/" + encodeURIComponent(pid) + "/" + fp;
      img.alt = "";
      wrap.appendChild(img);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "asset-merge-noimg";
      wrap.appendChild(placeholder);
    }
    parent.appendChild(wrap);
  }

  function renderAssetMergeModalLists() {
    const asset = (window.PAGE_DATA && window.PAGE_DATA.asset) || {};
    const rows = asset[assetMergeKind] || {};
    const aids = Object.keys(rows).sort();
    const canonicalList = document.getElementById("asset-merge-canonical-list");
    const sourceList = document.getElementById("asset-merge-source-list");
    if (!canonicalList || !sourceList) return;

    if (!assetMergeCanonicalId || !rows[assetMergeCanonicalId]) {
      assetMergeCanonicalId = pickDefaultAssetCanonicalId(assetMergeKind, rows, assetMergePrefillCanonical);
    }
    const canonicalGroup = getAssetGroupMembership(assetMergeKind, assetMergeCanonicalId);

    canonicalList.innerHTML = "";
    aids.forEach((aid) => {
      const row = rows[aid] || {};
      const meta = _assetMergeRowMeta(row, aid);
      const label = document.createElement("label");
      label.className = "asset-merge-row" + (aid === assetMergeCanonicalId ? " is-selected" : "");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "asset-merge-canonical";
      input.value = aid;
      input.checked = aid === assetMergeCanonicalId;
      input.addEventListener("change", function () {
        if (!input.checked) return;
        assetMergeCanonicalId = aid;
        assetMergeSelectedSources.clear();
        renderAssetMergeModalLists();
        refreshAssetMergePreview();
      });
      label.appendChild(input);
      _assetMergeThumb(label, row, PID);
      const text = document.createElement("div");
      text.className = "asset-merge-row-meta";
      const title = document.createElement("div");
      title.className = "asset-merge-row-title";
      title.textContent = meta.name;
      const sub = document.createElement("div");
      sub.className = "asset-merge-row-sub mono";
      sub.textContent = meta.aid;
      text.appendChild(title);
      text.appendChild(sub);
      label.appendChild(text);
      canonicalList.appendChild(label);
    });

    sourceList.innerHTML = "";
    aids.forEach((aid) => {
      if (aid === assetMergeCanonicalId) return;
      const row = rows[aid] || {};
      const meta = _assetMergeRowMeta(row, aid);
      const group = getAssetGroupMembership(assetMergeKind, aid);
      const sameGroup = group.leaderId === canonicalGroup.leaderId;
      const label = document.createElement("label");
      label.className =
        "asset-merge-row" +
        (assetMergeSelectedSources.has(aid) ? " is-selected" : "") +
        (sameGroup ? " is-disabled" : "");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = aid;
      input.disabled = sameGroup;
      input.checked = assetMergeSelectedSources.has(aid);
      if (sameGroup) {
        label.title = "已在同一组，无需重复合并";
      }
      input.addEventListener("change", function () {
        if (input.disabled) return;
        if (input.checked) assetMergeSelectedSources.add(aid);
        else assetMergeSelectedSources.delete(aid);
        label.classList.toggle("is-selected", input.checked);
        refreshAssetMergePreview();
      });
      label.appendChild(input);
      _assetMergeThumb(label, row, PID);
      const text = document.createElement("div");
      text.className = "asset-merge-row-meta";
      const title = document.createElement("div");
      title.className = "asset-merge-row-title";
      title.textContent = meta.name;
      const sub = document.createElement("div");
      sub.className = "asset-merge-row-sub mono";
      sub.textContent = meta.aid;
      text.appendChild(title);
      text.appendChild(sub);
      label.appendChild(text);
      sourceList.appendChild(label);
    });
  }

  async function refreshAssetMergePreview() {
    const preview = document.getElementById("asset-merge-preview");
    const submitBtn = document.getElementById("btn-asset-merge-submit");
    if (!preview) return;
    const sources = Array.from(assetMergeSelectedSources);
    if (!assetMergeCanonicalId) {
      preview.textContent = "请选择主资产。";
      if (submitBtn) submitBtn.disabled = true;
      return;
    }
    if (!sources.length) {
      preview.textContent = "请至少选择一个要并入的条目。";
      if (submitBtn) submitBtn.disabled = true;
      return;
    }
    preview.textContent = "正在加载预览…";
    if (submitBtn) submitBtn.disabled = true;
    try {
      const res = await fetch(
        "/api/projects/" +
          encodeURIComponent(PID) +
          "/asset/" +
          encodeURIComponent(assetMergeKind) +
          "/groups/" +
          encodeURIComponent(assetMergeCanonicalId)
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data && data.detail) || "预览失败");
      }
      const leaderPath = String(data.leader_approved_file_path || data.leader_file_path || "").trim();
      const aliasText = Array.isArray(data.aliases) && data.aliases.length ? data.aliases.join("、") : "（合并后写入）";
      preview.innerHTML =
        "将并入 <strong>" +
        sources.length +
        "</strong> 个条目到主资产 <span class=\"mono\">" +
        assetMergeCanonicalId +
        "</span>。" +
        (leaderPath ? " 当前 leader 参考图：<span class=\"mono\">" + leaderPath + "</span>。" : " 主资产尚无参考图，合并后请继续 ②a 生成首图。") +
        " 组内别名：" +
        aliasText +
        "。";
      if (submitBtn) submitBtn.disabled = false;
    } catch (err) {
      preview.textContent = String((err && err.message) || err || "预览失败");
      if (submitBtn) submitBtn.disabled = true;
    }
  }

  function _updateAssetMergeModalCopy() {
    const meta = ASSET_MERGE_KIND_META[assetMergeKind] || ASSET_MERGE_KIND_META.characters;
    const titleEl = document.getElementById("asset-merge-modal-title");
    const introEl = document.getElementById("asset-merge-modal-intro");
    if (titleEl) titleEl.textContent = meta.title;
    if (introEl) {
      introEl.innerHTML =
        meta.intro.replace(
          "@[]",
          '<span class="mono">@[]</span>'
        ).replace("「移出本组」", "<strong>移出本组</strong>");
    }
  }

  function openAssetMergeModal(kind, prefillCanonical) {
    const resolvedKind = ASSET_MERGE_KIND_META[kind] ? kind : getActiveAssetTabKind();
    assetMergeKind = resolvedKind;
    const meta = ASSET_MERGE_KIND_META[assetMergeKind];
    const asset = window.PAGE_DATA && window.PAGE_DATA.asset;
    if (!asset || !Object.keys(asset[assetMergeKind] || {}).length) {
      toast(meta.emptyToast, true);
      return;
    }
    assetMergePrefillCanonical = String(prefillCanonical || "");
    assetMergeCanonicalId = "";
    assetMergeSelectedSources.clear();
    _updateAssetMergeModalCopy();
    renderAssetMergeModalLists();
    refreshAssetMergePreview();
    const modal = document.getElementById("asset-merge-modal");
    if (!modal) return;
    modal.classList.add("on");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeAssetMergeModal() {
    const modal = document.getElementById("asset-merge-modal");
    if (!modal) return;
    modal.classList.remove("on");
    modal.setAttribute("aria-hidden", "true");
  }

  async function submitAssetMerge() {
    const sources = Array.from(assetMergeSelectedSources);
    if (!assetMergeCanonicalId || !sources.length) {
      toast("请选择主资产和至少一个并入条目", true);
      return;
    }
    const meta = ASSET_MERGE_KIND_META[assetMergeKind] || ASSET_MERGE_KIND_META.characters;
    const confirmMsg =
      "确认将以下 " +
      sources.length +
      " 个" +
      meta.label +
      "条目并入主资产「" +
      assetMergeCanonicalId +
      "」？\n\n" +
      sources.map((id) => "· " + id).join("\n") +
      "\n\n合并后可在组内卡片上点击「移出本组」撤销。";
    if (!confirm(confirmMsg)) return;
    const submitBtn = document.getElementById("btn-asset-merge-submit");
    const state = submitBtn ? new ButtonStateManager(submitBtn) : null;
    if (state) state.loading("合并中…");
    try {
      await postJSON(
        "/api/projects/" + encodeURIComponent(PID) + "/asset/" + encodeURIComponent(assetMergeKind) + "/merge",
        {
        canonical_asset_id: assetMergeCanonicalId,
        source_asset_ids: sources,
      });
      toast("已合并 " + sources.length + " 个" + meta.label + "条目，页面即将刷新", false);
      closeAssetMergeModal();
      window.setTimeout(function () {
        location.reload();
      }, 400);
    } catch (err) {
      toast(String((err && err.message) || err || "合并失败"), true);
      if (state) state.reset();
    }
  }

  async function detachAssetFromGroup(kind, aid, leaderId) {
    if (!aid) return;
    const resolvedKind = ASSET_MERGE_KIND_META[kind] ? kind : "characters";
    const meta = ASSET_MERGE_KIND_META[resolvedKind];
    const msg =
      "确认将「" +
      aid +
      "」移出当前组？\n\n" +
      meta.detachHint +
      "，不再共享 leader「" +
      (leaderId || "") +
      "」的参考图。分镜引用保持不变。";
    if (!confirm(msg)) return;
    try {
      await postJSON(
        "/api/projects/" + encodeURIComponent(PID) + "/asset/" + encodeURIComponent(resolvedKind) + "/detach",
        {
        asset_ids: [aid],
      });
      toast("已移出本组，页面即将刷新", false);
      window.setTimeout(function () {
        location.reload();
      }, 400);
    } catch (err) {
      toast(String((err && err.message) || err || "移出失败"), true);
    }
  }

  window.openAssetMergeModal = openAssetMergeModal;
  window.closeAssetMergeModal = closeAssetMergeModal;
  window.submitAssetMerge = submitAssetMerge;
  window.detachAssetFromGroup = detachAssetFromGroup;
  window.getActiveAssetTabKind = getActiveAssetTabKind;
  window.updateAssetMergeToolbar = updateAssetMergeToolbar;

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      function () {
        setTimeout(_restoreAssetViewFromUrl, 0);
        updateAssetMergeToolbar(getActiveAssetTabKind());
      },
      { once: true }
    );
  } else {
    setTimeout(_restoreAssetViewFromUrl, 0);
    updateAssetMergeToolbar(getActiveAssetTabKind());
  }

  function astSbApplyFilters() {
    var epEl = document.getElementById("ast-sb-epf");
    var qEl = document.getElementById("ast-sb-search");
    var q = ((qEl && qEl.value) || "").trim().toLowerCase();
    var epf = (epEl && epEl.value) || "all";
    function epMatch(epn, q) {
      var n = String(epn);
      var pad = n.length === 1 ? "0" + n : n;
      return ["e" + pad, "ep" + pad, "s01e" + pad, pad, n].indexOf(q) >= 0;
    }
    // 纯集号查询（数字 / e01 / ep01 / s01e01）只走精确 token 匹配；否则走 data-search 模糊匹配
    // 避免 data-search 里的 s01 前缀让搜 "1" 命中所有集
    var isEpQ = /^(\d+|e\d+|ep\d+|s\d+e\d+)$/.test(q);
    function match(epn, hay) {
      if (!q) return true;
      if (isEpQ) return epMatch(epn, q);
      return hay.indexOf(q) >= 0;
    }
    document.querySelectorAll(".ast-sb-tr").forEach(function (tr) {
      var epn = tr.getAttribute("data-ep") || "";
      var hay = (tr.getAttribute("data-search") || "").toLowerCase();
      var epOk = epf === "all" || String(epn) === String(epf);
      tr.style.display = epOk && match(epn, hay) ? "" : "none";
    });
    document.querySelectorAll(".ast-sb-ep").forEach(function (det) {
      var epn = det.getAttribute("data-ep") || "";
      var hay = (det.getAttribute("data-search") || "").toLowerCase();
      var epOk = epf === "all" || String(epn) === String(epf);
      det.style.display = epOk && match(epn, hay) ? "" : "none";
    });
  }

  // ── 集中式滚动锁：引用计数，确保最后一个弹窗关闭时才恢复滚动 ──
  var _scrollLockCount = 0;
  function lockBodyScroll() {
    _scrollLockCount++;
    if (_scrollLockCount === 1) document.body.style.overflow = 'hidden';
  }
  function unlockBodyScroll() {
    _scrollLockCount = Math.max(0, _scrollLockCount - 1);
    if (_scrollLockCount === 0) document.body.style.overflow = '';
  }
  // 兜底：任何弹窗关闭后，若无弹窗仍打开，强制恢复滚动
  function ensureScrollUnlocked() {
    var anyOpen = document.querySelector('.dialog-backdrop.on, .sb-demo-lightbox');
    if (!anyOpen) { _scrollLockCount = 0; document.body.style.overflow = ''; }
  }

  function extractDisplayNameFromRefSource(raw) {
    var value = String(raw || "").trim();
    if (!value) return "";
    // data URI / base64 无法提取名称，返回空（由调用方决定回退）
    if (value.indexOf("data:") === 0 || value.indexOf("base64") >= 0) return "";
    try {
      if (/^https?:\/\//i.test(value)) {
        var u = new URL(value, window.location.origin);
        value = decodeURIComponent(u.pathname || "");
      }
    } catch (_) {}
    var normalized = value.replace(/\\/g, "/");
    var seg = normalized.split("/").filter(Boolean);
    var filename = seg.length ? seg[seg.length - 1] : normalized;
    var dot = filename.lastIndexOf(".");
    return dot > 0 ? filename.slice(0, dot) : filename;
  }

  function openAssetImgLightbox(src, name) {
    var lb = document.getElementById("asset-img-lightbox");
    var img = document.getElementById("asset-img-lightbox-img");
    var nameEl = document.getElementById("asset-img-lightbox-name");
    if (!lb || !img || !src) return;
    // 优先使用传入的真实名称；过滤掉 data URI / base64 乱码
    var passedName = String(name || "").trim();
    if (passedName.indexOf("data:") === 0 || passedName.indexOf("base64") >= 0 || passedName.length > 80) {
      passedName = "";
    }
    var displayName = passedName || extractDisplayNameFromRefSource(src);
    img.src = src;
    if (nameEl) {
      nameEl.textContent = displayName;
      nameEl.style.display = displayName ? "block" : "none";
      nameEl.setAttribute("title", displayName);
    }
    lb.classList.add("on");
    lb.setAttribute("aria-hidden", "false");
    lockBodyScroll();
  }

  function closeAssetImgLightbox() {
    var lb = document.getElementById("asset-img-lightbox");
    var img = document.getElementById("asset-img-lightbox-img");
    var nameEl = document.getElementById("asset-img-lightbox-name");
    if (lb) {
      lb.classList.remove("on");
      lb.setAttribute("aria-hidden", "true");
    }
    if (img) {
      img.removeAttribute("src");
    }
    if (nameEl) {
      nameEl.textContent = "";
      nameEl.style.display = "none";
      nameEl.removeAttribute("title");
    }
    unlockBodyScroll();
  }

  function lookupAssetRow(kind, aid) {
    const asset = window.PAGE_DATA && window.PAGE_DATA.asset;
    if (!asset || !asset[kind]) return null;
    const row = asset[kind][aid];
    return row && typeof row === "object" ? row : null;
  }

  function syncAssetRowFromResponse(kind, aid, response) {
    const row = lookupAssetRow(kind, aid);
    if (!row || !response || typeof response !== "object") return row;
    const merged = Object.assign({}, row, response);
    if (!Array.isArray(merged.history)) {
      merged.history = Array.isArray(row.history) ? row.history : [];
    }
    if (!merged.file_path && typeof response.file_path === "string") {
      merged.file_path = response.file_path;
    }
    if (!merged.updated_at) {
      merged.updated_at = new Date().toISOString();
    }
    if (window.PAGE_DATA && window.PAGE_DATA.asset && window.PAGE_DATA.asset[kind]) {
      window.PAGE_DATA.asset[kind][aid] = merged;
    }
    return merged;
  }

  function applySyncedAssetRefImgs(affectedAssets) {
    if (!Array.isArray(affectedAssets) || !affectedAssets.length) return 0;
    const assetData = window.PAGE_DATA && window.PAGE_DATA.asset;
    if (!assetData) return 0;
    let count = 0;
    affectedAssets.forEach(function (item) {
      const kind = item && item.kind;
      const aid = item && item.asset_id;
      const refs = item && item.ref_imgs;
      if (!kind || !aid || !assetData[kind] || !assetData[kind][aid]) return;
      assetData[kind][aid].ref_imgs = Array.isArray(refs) ? refs.slice() : [];
      assetData[kind][aid].updated_at = new Date().toISOString();
      count += 1;
      const card = document.querySelector(
        '.asset-card[data-kind="' + kind + '"][data-aid="' + CSS.escape(aid) + '"]'
      );
      if (card && window.assetRefPreview) {
        const promptEl = card.querySelector('textarea[data-field="prompt"]');
        window.assetRefPreview.update(card, promptEl ? promptEl.value : "");
      }
    });
    return count;
  }
  window.syncAssetRowFromResponse = syncAssetRowFromResponse;
  window.applySyncedAssetRefImgs = applySyncedAssetRefImgs;

  function isCharacterGroupLeader(aid) {
    const asset = (window.PAGE_DATA && window.PAGE_DATA.asset) || {};
    const groups = ((asset.asset_groups || {}).characters) || {};
    return Object.values(groups).some(
      (members) => Array.isArray(members) && members.length && String(members[0]) === String(aid)
    );
  }
  window.isCharacterGroupLeader = isCharacterGroupLeader;

  function openAssetHistoryModal(btn) {
    var card = btn && btn.closest ? btn.closest(".asset-card") : null;
    if (!card) { console.log('[history] no card'); return; }
    var kind = card.getAttribute("data-kind") || "";
    var aid = card.getAttribute("data-aid") || "";
    console.log('[history] opening for', kind, aid);

    var modal = document.getElementById("asset-history-modal");
    if (modal) {
      modal.classList.remove("on");
      modal.setAttribute("aria-hidden", "true");
    }

    var row = lookupAssetRow(kind, aid);
    if (!row) {
      console.log('[history] row not found for', kind, aid);
      toast("未找到资产数据，请刷新后重试", true);
      return;
    }
    var history = Array.isArray(row.history) ? row.history : [];
    console.log('[history] versions:', history.length);
    if (!history.length) {
      toast("该资产暂无历史版本", true);
      return;
    }

    var body = document.getElementById("asset-history-modal-body");
    var meta = document.getElementById("asset-history-modal-meta");
    if (!modal || !body || !meta) {
      console.log('[history] DOM missing modal=' + !!modal + ' body=' + !!body + ' meta=' + !!meta);
      return;
    }

    const currentPath = String(row.file_path || "").trim();
    const displayName = String(row.name_trans || row.name_ori || aid);
    const isLeader = kind === "characters" && isCharacterGroupLeader(aid);
    meta.textContent = isLeader
      ? `${displayName} · 共 ${history.length} 个版本 · 当前：${currentPath || "未设置"}`
      : `${displayName} · 共 ${history.length} 个版本`;
    body.innerHTML = "";
    body.className = "shot-history-wrap";

    const pidEsc = encodeURIComponent(PID);
    const useLabel = isLeader ? "设为当前版本并确认首图" : "应用此版本";
    const validHistory = history.filter(
      (h) => h && typeof h === "object" && String(h.version || "").trim() && String(h.file_path || "").trim()
    );

    // 胶片条（缩略图）
    const strip = document.createElement("div");
    strip.className = "shot-history-strip";
    // 详情面板
    const detail = document.createElement("div");
    detail.className = "shot-history-detail";
    const footer = document.createElement("div");
    footer.className = "shot-history-footer";
    let applyState = { version: "", filePath: "", isCurrent: true };

    function showDetail(h) {
      const version = String(h.version || "").trim();
      const filePath = String(h.file_path || "").trim();
      const isCurrent = filePath === currentPath;
      const prompt = String(h.prompt || "").trim() || String(row.prompt || "").trim() || "（该版本未记录提示词）";
      const createdAt = String(h.created_at || h.updated_at || "").trim();
      applyState = { version, filePath, isCurrent };
      detail.innerHTML =
        '<div class="shot-history-detail__header">' +
          '<span class="shot-history-detail__ver">' + version + '</span>' +
          (createdAt ? '<span class="shot-history-detail__time">' + createdAt + '</span>' : '') +
          (isCurrent ? '<span class="asset-history-current">当前使用中</span>' : '') +
        '</div>' +
        '<div class="shot-history-detail__content">' +
          '<div class="shot-history-detail__video">' +
            '<img src="/files/' + pidEsc + '/' + filePath + '" alt="" style="width:100%;aspect-ratio:16/9;height:auto;object-fit:cover;border-radius:8px" />' +
          '</div>' +
          '<div class="shot-history-detail__prompt">' +
            '<div class="shot-history-detail__prompt-label">提示词</div>' +
            '<div class="shot-history-detail__prompt-text">' + prompt.replace(/</g, '&lt;') + '</div>' +
          '</div>' +
        '</div>';
      // 更新底部应用按钮
      footer.innerHTML = isCurrent
        ? '<span class="sb-muted" style="font-size:13px">当前版本</span>'
        : '<button type="button" class="b ba" id="asset-history-apply-btn">' + useLabel + '</button>';
      if (!isCurrent) {
        const applyBtn = footer.querySelector('#asset-history-apply-btn');
        if (applyBtn) applyBtn.addEventListener('click', function () {
          useAssetHistoryVersion(kind, aid, applyState.version, applyBtn);
        });
      }
    }

    validHistory.forEach((h) => {
      const version = String(h.version || "").trim();
      const filePath = String(h.file_path || "").trim();
      const isCurrent = filePath === currentPath;
      const createdAt = String(h.created_at || h.updated_at || "").trim();
      const item = document.createElement("div");
      item.className =
        "shot-history-strip__item" +
        (isCurrent ? " shot-history-strip__item--current" : "");
      item.innerHTML =
        '<img src="/files/' + pidEsc + '/' + filePath + '" alt="" />' +
        '<div class="shot-history-strip__label"><span class="mono">' + version + '</span>' +
        (createdAt ? '<span class="shot-history-strip__time">' + createdAt + '</span>' : '') + '</div>' +
        (isCurrent ? '<span class="shot-history-strip__badge">当前</span>' : '');
      item.addEventListener("click", function () {
        strip.querySelectorAll(".shot-history-strip__item").forEach((x) =>
          x.classList.remove("shot-history-strip__item--active"));
        item.classList.add("shot-history-strip__item--active");
        showDetail(h);
      });
      strip.appendChild(item);
    });

    body.appendChild(strip);
    body.appendChild(detail);
    body.appendChild(footer);
    // 默认选中当前版本或第一个
    const current = strip.querySelector(".shot-history-strip__item--current") ||
      strip.querySelector(".shot-history-strip__item");
    if (current) current.click();

    modal.style.display = "flex";
    modal.classList.add("on");
    modal.setAttribute("aria-hidden", "false");
    console.log('[history] modal opened, classList.on=' + modal.classList.contains('on') + ' display=' + modal.style.display);
  }

  function closeAssetHistoryModal() {
    const modal = document.getElementById("asset-history-modal");
    if (!modal) return;
    modal.classList.remove("on");
    modal.setAttribute("aria-hidden", "true");
    modal.style.display = "";
  }

  async function useAssetHistoryVersion(kind, aid, version, btn) {
    if (!kind || !aid || !version) return;
    const isLeader = kind === "characters" && isCharacterGroupLeader(aid);
    const confirmMsg = isLeader
      ? `确认将 ${aid} 切换到 ${version}，并作为该角色组首图确认版本，同时同步所有引用吗？`
      : `确认将 ${aid} 切换到 ${version}，并同步所有引用该素材的分镜与其它素材参考图吗？`;
    if (!confirm(confirmMsg)) return;
    const state = btn ? new ButtonStateManager(btn) : null;
    if (state) state.loading("同步中...");
    try {
      const res = await postJSON(
        "/api/projects/" +
          encodeURIComponent(PID) +
          "/asset/" +
          encodeURIComponent(kind) +
          "/" +
          encodeURIComponent(aid) +
          "/use_history",
        { version: version }
      );
      const row = lookupAssetRow(kind, aid);
      if (row) {
        row.selected_version = String((res && res.version) || version);
        row.file_path = res.file_path;
        row.oss_url = res.oss_url;
        row.updated_at = new Date().toISOString();
        if (res && res.leader_confirm) {
          row.review_state = String(res.leader_confirm.review_state || row.review_state || "");
          row.approved_version = String(res.leader_confirm.approved_version || row.approved_version || "");
          row.approved_file_path = String(res.leader_confirm.approved_file_path || row.approved_file_path || "");
        }
      }
      const synced = (res && res.synced) || {};
      applySyncedAssetRefImgs(synced.affected_assets);
      const noticePayload = {
        kind: kind,
        aid: aid,
        version: version,
        changed_shots: Number(synced.changed_shots || 0),
        changed_storyboards: Number(synced.changed_storyboards || 0),
        replaced_refs: Number(synced.replaced_refs || 0),
        affected_shots: Array.isArray(synced.affected_shots) ? synced.affected_shots : [],
        changed_assets: Number(synced.changed_assets || 0),
      };
      saveAssetSyncNotice(noticePayload);
      const shotCount = noticePayload.changed_shots || 0;
      const assetCount = noticePayload.changed_assets || 0;
      const parts = [];
      if (shotCount > 0) parts.push(`${shotCount} 个镜头`);
      if (assetCount > 0) parts.push(`${assetCount} 个素材`);
      const leaderNote = res && res.leader_confirmed ? "，并已确认该组首图" : "";
      toast(
        parts.length
          ? `已切换 ${version}，并同步 ${parts.join("、")} 引用${leaderNote}`
          : `已切换 ${version}${leaderNote}`,
        false,
        4000
      );
      if (state) state.success("✓ 已同步", 900);
      setTimeout(() => reloadProjectStripStoryboardParams("asset"), 500);
    } catch (e) {
      if (state) state.error("同步失败");
      toast((e && e.message) || String(e), true);
    }
  }

  function renderSyncedNoticeIfAny(which) {
    const bar = document.getElementById("sb-asset-sync-notice");
    const text = document.getElementById("sb-asset-sync-notice-text");
    if (!bar || !text) return;
    if (which !== "g") {
      bar.style.display = "none";
      return;
    }
    const notice = readAssetSyncNotice();
    if (!notice || !notice.changed_shots) {
      bar.style.display = "none";
      return;
    }
    text.textContent = `已影响 ${notice.changed_shots} 个镜头（${notice.changed_storyboards || 0} 集），建议先检查参考素材再重新生成视频。`;
    bar.style.display = "flex";
  }

  function renderEpisodeRegenNotice(which) {
    const bar = document.getElementById("sb-regen-notice");
    if (!bar) return;
    if (SB_EP) refreshShotRegenMarkers(SB_EP);
    // 避免顶部强提示造成误解，改为在预览/下载动作时再提示并处理。
    bar.style.display = "none";
  }

  function dismissRegenNotice() {
    clearEpisodeNeedsRegen(SB_EP);
    renderEpisodeRegenNotice("g");
  }

  function openRegenShotsModal() {
    const modal = document.getElementById("regen-shots-modal");
    const list = document.getElementById("regen-shots-list");
    if (!modal || !list) return;
    const shots = getEpisodeRegenShots(SB_EP);
    list.innerHTML = "";
    if (!shots.length) {
      const li = document.createElement("li");
      li.className = "sb-muted";
      li.textContent = "当前集没有需要重生成的镜头。";
      list.appendChild(li);
    } else {
      shots.forEach((sid) => {
        const li = document.createElement("li");
        li.innerHTML = `<a href="#sb-shot-${sid}" onclick="closeRegenShotsModal()">${sid}</a>`;
        list.appendChild(li);
      });
    }
    modal.classList.add("on");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeRegenShotsModal() {
    const modal = document.getElementById("regen-shots-modal");
    if (!modal) return;
    modal.classList.remove("on");
    modal.setAttribute("aria-hidden", "true");
  }

  function regenCurrentEpisodeFromNotice() {
    const btn = document.getElementById("btn-gen-current-ep");
    if (!btn || btn.disabled) return;
    sbGenCurrentEpisode(btn);
  }

  function dismissSyncedNotice() {
    try {
      sessionStorage.removeItem(ASSET_SYNC_NOTICE_KEY);
    } catch (_) {}
    renderSyncedNoticeIfAny("g");
  }

  function openSyncedShotsModal() {
    const modal = document.getElementById("synced-shots-modal");
    const list = document.getElementById("synced-shots-list");
    if (!modal || !list) return;
    const notice = readAssetSyncNotice();
    const shots = notice && Array.isArray(notice.affected_shots) ? notice.affected_shots : [];
    list.innerHTML = "";
    if (!shots.length) {
      const li = document.createElement("li");
      li.className = "sb-muted";
      li.textContent = "暂无受影响镜头记录。";
      list.appendChild(li);
    } else {
      shots.forEach((s) => {
        const li = document.createElement("li");
        li.textContent = `第 ${s.ep} 集 · 镜头 ${s.sid}（替换 ${s.replaced} 处）`;
        list.appendChild(li);
      });
    }
    modal.classList.add("on");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeSyncedShotsModal() {
    const modal = document.getElementById("synced-shots-modal");
    if (!modal) return;
    modal.classList.remove("on");
    modal.setAttribute("aria-hidden", "true");
  }

  function getShotVersionState(sid) {
    return SB_SHOT_VERSIONS[String(sid)] || { selected_version: "", selected_file_path: "", history: [] };
  }

  async function openShotHistoryModal(ep, sid) {
    const modal = document.getElementById("shot-history-modal");
    const meta = document.getElementById("shot-history-modal-meta");
    const body = document.getElementById("shot-history-modal-body");
    if (!modal || !meta || !body) return;

    meta.textContent = `第 ${ep} 集 · 镜头 ${sid} · 加载中…`;
    body.innerHTML = '<p class="sb-muted">正在加载历史版本…</p>';
    modal.classList.add("on");
    modal.setAttribute("aria-hidden", "false");

    // 本地 demo 模式跳过服务端请求（拦截器会返回空数据覆盖 mock）
    if (!window.__LOCAL_DEMO__) {
      try {
        const resp = await fetch(
          `/api/projects/${encodeURIComponent(PID)}/episodes/${encodeURIComponent(ep)}/shots/${encodeURIComponent(sid)}/versions`,
          { cache: "no-store" }
        );
        if (resp.ok) {
          const data = await resp.json();
          const key = String(sid);
          SB_SHOT_VERSIONS[key] = {
            selected_version: String(data.selected_version || ""),
            selected_file_path: String(data.selected_file_path || ""),
            history: Array.isArray(data.history) ? data.history : [],
          };
        }
      } catch (_) {}
    }

    const state = getShotVersionState(sid);
    const history = Array.isArray(state.history) ? state.history : [];
    const selectedVersion = String(state.selected_version || "").trim();
    const selectedPath = String(state.selected_file_path || "").trim();
    meta.textContent = `第 ${ep} 集 · 镜头 ${sid} · 共 ${history.length} 个版本`;
    body.innerHTML = "";
    body.className = "shot-history-wrap";

    if (!history.length) {
      body.innerHTML = '<p class="sb-muted">该镜头暂无历史版本。</p>';
      return;
    }

    var validHistory = history.filter(function(h) {
      return h && typeof h === "object" && String(h.version || "").trim() && String(h.file_path || "").trim();
    });

    // ---- 胶片条（顶部缩略图） ----
    var strip = document.createElement("div");
    strip.className = "shot-history-strip";

    // ---- 详情面板（底部） ----
    var detail = document.createElement("div");
    detail.className = "shot-history-detail";

    function showDetail(h) {
      var version = String(h.version || "").trim();
      var filePath = String(h.file_path || "").trim();
      var prompt = String(h.prompt || "").trim();
      var createdAt = String(h.created_at || "").trim();
      var isCurrent = (selectedVersion && selectedVersion === version) || (!selectedVersion && selectedPath === filePath);

      detail.innerHTML = "";

      // 版本号行
      var detailHeader = document.createElement("div");
      detailHeader.className = "shot-history-detail__header";
      var verLabel = document.createElement("span");
      verLabel.className = "shot-history-detail__ver mono";
      verLabel.textContent = version;
      detailHeader.appendChild(verLabel);
      if (createdAt) {
        var timeLabel = document.createElement("span");
        timeLabel.className = "shot-history-detail__time";
        timeLabel.textContent = createdAt;
        detailHeader.appendChild(timeLabel);
      }
      if (isCurrent) {
        var curBadge = document.createElement("span");
        curBadge.className = "asset-history-current";
        curBadge.textContent = "当前使用中";
        detailHeader.appendChild(curBadge);
      }
      detail.appendChild(detailHeader);

      // 内容区：视频 + 提示词
      var content = document.createElement("div");
      content.className = "shot-history-detail__content";

      // 视频
      var videoWrap = document.createElement("div");
      videoWrap.className = "shot-history-detail__video";
      var video = document.createElement("video");
      video.src = "/files/" + PID + "/" + filePath;
      video.controls = true;
      video.preload = "metadata";
      videoWrap.appendChild(video);
      content.appendChild(videoWrap);

      // 提示词
      if (prompt) {
        var promptWrap = document.createElement("div");
        promptWrap.className = "shot-history-detail__prompt";
        var promptLabel = document.createElement("div");
        promptLabel.className = "shot-history-detail__prompt-label";
        promptLabel.textContent = "提示词";
        promptWrap.appendChild(promptLabel);
        var promptText = document.createElement("div");
        promptText.className = "shot-history-detail__prompt-text";
        promptText.textContent = prompt;
        promptWrap.appendChild(promptText);
        content.appendChild(promptWrap);
      }

      detail.appendChild(content);
    }

    // 渲染缩略图条
    validHistory.forEach(function(h, idx) {
      var version = String(h.version || "").trim();
      var filePath = String(h.file_path || "").trim();
      var isCurrent = (selectedVersion && selectedVersion === version) || (!selectedVersion && selectedPath === filePath);
      var createdAt = String(h.created_at || "").trim();

      var thumb = document.createElement("div");
      thumb.className = "shot-history-strip__item" + (isCurrent ? " shot-history-strip__item--current" : "");
      if (idx === 0 || isCurrent) thumb.classList.add("shot-history-strip__item--active");

      var video = document.createElement("video");
      video.src = "/files/" + PID + "/" + filePath;
      video.preload = "metadata";
      video.muted = true;
      thumb.appendChild(video);

      var label = document.createElement("div");
      label.className = "shot-history-strip__label";
      label.innerHTML = '<span class="mono">' + version + '</span>' + (createdAt ? '<span class="shot-history-strip__time">' + createdAt + '</span>' : '');
      thumb.appendChild(label);

      if (isCurrent) {
        var badge = document.createElement("span");
        badge.className = "shot-history-strip__badge";
        badge.textContent = "当前";
        thumb.appendChild(badge);
      }

      (function(hItem, thumbEl) {
        thumb.onclick = function() {
          strip.querySelectorAll(".shot-history-strip__item--active").forEach(function(el) {
            el.classList.remove("shot-history-strip__item--active");
          });
          thumbEl.classList.add("shot-history-strip__item--active");
          showDetail(hItem);
        };
      })(h, thumb);

      strip.appendChild(thumb);
    });

    body.appendChild(strip);
    body.appendChild(detail);

    // 底部操作栏：关闭 + 应用（始终显示，右对齐）
    var footer = document.createElement("div");
    footer.className = "shot-history-footer";

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "b";
    closeBtn.textContent = "关闭";
    closeBtn.onclick = function() { closeShotHistoryModal(); };
    footer.appendChild(closeBtn);

    var applyBtn = document.createElement("button");
    applyBtn.type = "button";
    footer.appendChild(applyBtn);

    body.appendChild(footer);

    // 更新底部按钮状态
    function updateFooter(h) {
      var version = String(h.version || "").trim();
      var filePath = String(h.file_path || "").trim();
      var prompt = String(h.prompt || "").trim();
      var isCurrent = (selectedVersion && selectedVersion === version) || (!selectedVersion && selectedPath === filePath);
      applyBtn.className = isCurrent ? "b shot-history-detail__btn-disabled" : "b ba";
      applyBtn.textContent = isCurrent ? "当前版本" : "应用此版本";
      applyBtn.disabled = isCurrent;
      applyBtn.onclick = null;
      if (!isCurrent) {
        (function(e, s, v, f, p) {
          applyBtn.onclick = function() { useShotHistoryVersion(e, s, v, f, applyBtn, p); };
        })(ep, sid, version, filePath, prompt);
      }
    }

    // 默认显示当前版本
    var currentEntry = validHistory.find(function(h) {
      var v = String(h.version || "").trim();
      return (selectedVersion && selectedVersion === v) || (!selectedVersion && selectedPath === String(h.file_path || "").trim());
    });
    var defaultEntry = currentEntry || validHistory[0];
    showDetail(defaultEntry);
    updateFooter(defaultEntry);

    // 点击缩略图时同步更新底部按钮
    var origStripClicks = [];
    validHistory.forEach(function(h, idx) {
      var thumbs = strip.children;
      if (thumbs[idx]) {
        var origClick = thumbs[idx].onclick;
        (function(hItem) {
          thumbs[idx].onclick = function() {
            strip.querySelectorAll(".shot-history-strip__item--active").forEach(function(el) {
              el.classList.remove("shot-history-strip__item--active");
            });
            thumbs[idx].classList.add("shot-history-strip__item--active");
            showDetail(hItem);
            updateFooter(hItem);
          };
        })(h);
      }
    });
  }

  function closeShotHistoryModal() {
    const modal = document.getElementById("shot-history-modal");
    if (!modal) return;
    modal.classList.remove("on");
    modal.setAttribute("aria-hidden", "true");
  }

  async function useShotHistoryVersion(ep, sid, version, filePath, btn, prompt) {
    if (!ep || !sid || !version) return;
    const state = btn ? new ButtonStateManager(btn) : null;
    if (state) state.loading("切换中...");
    try {
      await patchJSON(
        "/api/projects/" +
          encodeURIComponent(PID) +
          "/episodes/" +
          encodeURIComponent(ep) +
          "/shots/" +
          encodeURIComponent(sid),
        { patch: { selected_version: version, updated_at: assetUtcNow() } }
      );
      const key = String(sid);
      const old = getShotVersionState(key);
      SB_SHOT_VERSIONS[key] = {
        selected_version: version,
        selected_file_path: filePath,
        history: Array.isArray(old.history) ? old.history : [],
      };
      markShotNeedsRegen(ep, sid);
      updateShotPreview(String(sid), filePath);

      // 同步恢复提示词到编辑器
      if (prompt) {
        var section = document.querySelector('.sb-shot-section[data-ep="' + ep + '"][data-sid="' + sid + '"]');
        if (section) {
          var ta = section.querySelector('.sb-prompt-ta');
          if (ta) {
            ta.value = prompt;
            var editor = ta.previousElementSibling;
            if (editor && editor.classList.contains('sb-prompt-editor')) {
              _renderHighlight(editor, prompt);
            }
          }
        }
      }

      if (state) state.success("✓ 已切换", 900);
      toast(`镜头 ${sid} 已切换到 ${version}（提示词已同步恢复）`, false, 2000);
      openShotHistoryModal(ep, sid);
      renderEpisodeRegenNotice("g");
    } catch (e) {
      if (state) state.error("切换失败");
      toast((e && e.message) || String(e), true);
    }
  }

  // ── 弹窗关闭系统：ESC / 点击外围 与 ✕ 按钮调用同一个关闭函数 ──
  // 注册表：modalId → 关闭函数名（与各弹窗 ✕ 按钮 onclick 调用的函数完全一致）
  var MODAL_CLOSE_FNS = {
    'sb-modal-preview': 'closeSbPreviewModal',
    'sb-modal-dl': 'closeSbDownloadModal',
    'asset-img-lightbox': 'closeAssetImgLightbox',
    'asset-library-picker-modal': 'closeAssetLibraryPicker',
    'shot-asset-library-picker-modal': 'closeShotAssetLibraryPicker',
    'shot-ai-modify-panel': 'closeAiModifyPanel',
    'asset-merge-modal': 'closeAssetMergeModal',
    'asset-add-modal': 'closeAssetAddModal',
    'asset-name-edit-modal': 'closeNameEditModal',
    'asset-subitem-add-modal': 'closeSubitemAddModal',
    'asset-delete-modal': 'closeAssetDeleteModal',
    'asset-history-modal': 'closeAssetHistoryModal',
    'synced-shots-modal': 'closeSyncedShotsModal',
    'shot-history-modal': 'closeShotHistoryModal',
    'regen-shots-modal': 'closeRegenShotsModal',
    'project-error-panel': 'dismissProjectErrorPanel',
  };

  // ESC：只关闭最上层那一个弹窗，且调用它与 ✕ 按钮相同的关闭函数
  // （不做通用的 .on 移除，确保内部状态与点击 ✕ 完全一致）
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    // 按 DOM 顺序找出所有打开的注册弹窗，取最后一个（最上层）
    var topId = null;
    Object.keys(MODAL_CLOSE_FNS).forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.classList.contains('on')) topId = id;
    });
    if (topId) {
      var fn = window[MODAL_CLOSE_FNS[topId]];
      if (typeof fn === 'function') { try { fn(); } catch (err) {} }
      ensureScrollUnlocked();
    }
    // 若无注册弹窗打开，则不处理 —— 动态弹窗（sb-demo-lightbox）的自有 ESC 监听会接管
  });

  // 全局兜底：部分弹窗的背景 onclick 可能遗漏，统一在捕获阶段补上
  // 同样只调用该弹窗注册的关闭函数（与 ✕ 一致），不做通用移除
  document.addEventListener("click", function (e) {
    var bd = e.target.closest && e.target.closest('.dialog-backdrop.on');
    if (!bd || e.target !== bd) return;
    var fnName = MODAL_CLOSE_FNS[bd.id];
    if (fnName && typeof window[fnName] === 'function') {
      e.stopPropagation();
      try { window[fnName](); } catch (err) {}
      ensureScrollUnlocked();
    }
  }, true);

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".asset-card img.thumb, .char-outfit-img img").forEach(function (im) {
      if (!im.getAttribute("title")) im.setAttribute("title", "点击查看大图");
      im.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        // 从卡片上下文提取真实名称（不依赖 src，避免单文件版 data URI 乱码）
        var card = im.closest('.asset-card, .char-outfit-card, .char-group');
        var nameEl = card && (card.querySelector('.char-outfit-idtrans') || card.querySelector('.asset-name') || card.querySelector('.char-group-name-trans strong'));
        var name = nameEl ? nameEl.textContent.trim() : extractDisplayNameFromRefSource(im.currentSrc || im.src || "");
        openAssetImgLightbox(im.currentSrc || im.src || "", name);
      });
    });
    document.addEventListener("click", function (ev) {
      var target = ev.target;
      if (!target || !target.closest) return;
      var im = target.closest(".sb-ref-cell img");
      if (!im) return;
      ev.preventDefault();
      ev.stopPropagation();
      var src = im.getAttribute("data-lightbox-src") || im.currentSrc || im.src || "";
      var cell = im.closest(".sb-ref-cell");
      var cap = cell && cell.querySelector(".sb-ref-cap[data-ref-path]");
      var refName = cap ? (cap.getAttribute("data-ref-name") || "") : "";
      var refPath = cap ? cap.getAttribute("data-ref-path") : "";
      // 名称优先取 data-ref-name（真实资产名），其次从 refPath 解析，最后回退
      var name = refName || extractDisplayNameFromRefSource(refPath) || extractDisplayNameFromRefSource(src);
      openAssetImgLightbox(src, name);
    });
    renderSyncedNoticeIfAny(document.getElementById("v-g") && document.getElementById("v-g").classList.contains("on") ? "g" : "");
    renderEpisodeRegenNotice(document.getElementById("v-g") && document.getElementById("v-g").classList.contains("on") ? "g" : "");
    requestAnimationFrame(function () {
      requestAnimationFrame(restoreAssetViewScrollIfNeeded);
    });
  });

  async function runAnalyze() {
    var btn = document.getElementById("btn-analyze-full");
    if (!btn || btn.disabled) return;
    var prevText = btn.textContent;
    var hadGo = btn.classList.contains("btn-analyze-go");
    btn.disabled = true;
    btn.classList.remove("btn-analyze-go", "ba");
    btn.classList.add("btn-analyze-busy");
    btn.textContent = "准备中...";
    btn.removeAttribute("title");
    setAnalyzeBusyPending();

    const poller = new TaskPoller(PID);
    poller.start({
      onProgress: (progress, message) => {
        btn.textContent = formatTaskProgressText("分析中", progress, message);
      },
      onComplete: (message) => {
        toast("全集分析完成", false);
        setTimeout(() => reloadProjectStripStoryboardParams(), 500);
      },
      onError: (message) => {
        clearAnalyzeBusyPending();
        showProjectErrorPanel("全集分析失败", message);
        btn.textContent = prevText;
        btn.classList.remove("btn-analyze-busy");
        if (hadGo) {
          btn.classList.add("btn-analyze-go", "ba");
          btn.disabled = false;
        }
      }
    });

    try {
      await postJSON("/api/projects/" + encodeURIComponent(PID) + "/analyze", { requirements: "" });
    } catch (e) {
      poller.stop();
      clearAnalyzeBusyPending();
      showProjectErrorPanel("全集分析失败", (e && e.message) || String(e));
      btn.textContent = prevText;
      btn.classList.remove("btn-analyze-busy");
      if (hadGo) {
        btn.classList.add("btn-analyze-go", "ba");
        btn.disabled = false;
      }
    }
  }

  async function runAdaptEntities() {
    if (!ASSET_ACTIONS_ENABLED) return;
    var b = getAssetPipelineButtons();
    if (!b.adapt || !b.reviewBatch) return;
    setAssetPipelineBusy("adapt", true);
    startAssetAdaptProgressTracker("实体改编中");

    const poller = new TaskPoller(PID);
    poller.start({
      onProgress: (progress, message) => {
        if (b.adapt) setBatchBtnText(b.adapt, formatTaskProgressText("改编中", progress, message));
      },
      onComplete: (message) => {
        stopAssetAdaptProgressTracker("实体改编完成");
        toast("实体改编完成", false);
        setTimeout(() => reloadProjectStripStoryboardParams("asset"), 500);
      },
      onError: (message) => {
        stopAssetAdaptProgressTracker("实体改编失败");
        showProjectErrorPanel("实体改编失败", message);
        setAssetPipelineBusy(null, false);
      }
    });

    try {
      await postJSON("/api/projects/" + encodeURIComponent(PID) + "/asset/adapt", { requirements: "" });
    } catch (e) {
      poller.stop();
      stopAssetAdaptProgressTracker("实体改编失败");
      showProjectErrorPanel("实体改编失败", (e && e.message) || String(e));
      setAssetPipelineBusy(null, false);
    }
  }

  async function runReviewBatchGenerate() {
    if (!ASSET_ACTIONS_ENABLED) return;
    if (assetPipelineRequestInFlight) {
      toast("任务正在提交中，请稍候", true);
      return;
    }
    if (!isAssetAdaptStepComplete()) {
      toast("请先完成第 1 步「实体改编」，再执行首图生成", true);
      return;
    }
    if (!isReviewBatchActionEnabled()) {
      toast("当前处于 ②c 阶段，请先完成剩余资产生成后再操作 ②a", true);
      return;
    }
    var b = getAssetPipelineButtons();
    if (!b.adapt || !b.reviewBatch) return;

    await syncLatestAssetSnapshot();
    const reviewStats = computeReviewStatsFromAsset(window.PAGE_DATA.asset || {});
    const rbDone = Number(reviewStats.review_batch_done || 0);
    const rbTotal = Number(reviewStats.review_batch_total || 0);
    let forceRegenerate = false;
    if (rbTotal > 0 && rbDone >= rbTotal) {
      const ok = window.confirm(
        "首图批次已全部生成（" + rbDone + "/" + rbTotal + "）。\n\n" +
        "重新生成将为场景、道具和各角色首套产出新版本图片；已确认的首图状态可能需要重新确认。\n\n" +
        "确定要重新生成首图批次吗？"
      );
      if (!ok) return;
      forceRegenerate = true;
    }

    setAssetPipelineBusy("review_batch", true);
    applyAssetPipelinePhase("2a");
    assetPipelineRequestInFlight = true;
    assetGenerateAwaitServerDone = true;
    startAssetGenerateProgressTracker(forceRegenerate ? "重新生成首图中" : "生成首图中", "review_batch", {
      forceRegenerate: forceRegenerate,
      awaitServerDone: true,
    });

    try {
      const body = { force_regenerate: forceRegenerate };
      const imgModel = resolveAssetImgModelParam();
      if (imgModel) body.img_model = imgModel;
      const resp = await postJSON("/api/projects/" + encodeURIComponent(PID) + "/asset/review_batch/generate", body);
      stopAssetGenerateProgressTracker(forceRegenerate ? "首图重新生成完成" : "首图批次完成");
      if (resp && resp.asset_pipeline_phase) {
        applyAssetPipelinePhase(resp.asset_pipeline_phase);
      }
      toast(
        forceRegenerate
          ? "首图已重新生成"
          : "首图批次已生成",
        false
      );
      setAssetPipelineBusy(null, false);
      setTimeout(() => reloadProjectStripStoryboardParams("asset"), 500);
    } catch (e) {
      stopAssetGenerateProgressTracker("首图生成失败");
      showProjectErrorPanel("首图批次生成失败", (e && e.message) || String(e));
      setAssetPipelineBusy(null, false);
    } finally {
      assetPipelineRequestInFlight = false;
    }
  }

  async function runGenerateRemaining() {
    if (!ASSET_ACTIONS_ENABLED) return;
    if (assetPipelineRequestInFlight) {
      toast("任务正在提交中，请稍候", true);
      return;
    }
    if (!isAssetAdaptStepComplete()) {
      toast("请先完成第 1 步「实体改编」", true);
      return;
    }
    if (!isGenRemainingActionEnabled()) {
      if (GROUPS_APPROVED <= 0) {
        toast("首图尚未确认：请先完成 ②a 生成首图，或在 leader 历史版本中设为当前版本", true);
      } else {
        toast("当前处于 ②a 阶段，请先完成首图生成后再操作 ②c", true);
      }
      return;
    }
    var b = getAssetPipelineButtons();
    if (!b.genRemaining) return;

    await syncLatestAssetSnapshot();
    const reviewStats = computeReviewStatsFromAsset(window.PAGE_DATA.asset || {});
    const remDone = Number(reviewStats.remaining_outfits_done || 0);
    const remTotal = Number(reviewStats.remaining_outfits_total || 0);
    let forceRegenerate = false;
    if (remTotal > 0 && remDone >= remTotal) {
      const ok = window.confirm(
        "剩余资产已全部生成（" + remDone + "/" + remTotal + "）。\n\n" +
        "重新生成将为各已确认角色组剩余资产生成新版本图片；②a 将暂时锁定直至本步完成。\n\n" +
        "确定要重新生成剩余资产吗？"
      );
      if (!ok) return;
      forceRegenerate = true;
    }

    setAssetPipelineBusy("gen_remaining", true);
    applyAssetPipelinePhase("2c");
    assetPipelineRequestInFlight = true;
    assetGenerateAwaitServerDone = true;
    startAssetGenerateProgressTracker(forceRegenerate ? "重新生成剩余资产中" : "生成剩余资产中", "remaining", {
      forceRegenerate: forceRegenerate,
      awaitServerDone: true,
    });

    try {
      const body = { force_regenerate: forceRegenerate };
      const imgModel = resolveAssetImgModelParam();
      if (imgModel) body.img_model = imgModel;
      const resp = await postJSON("/api/projects/" + encodeURIComponent(PID) + "/asset/review_batch/generate_remaining", body);
      stopAssetGenerateProgressTracker(forceRegenerate ? "剩余资产重新生成完成" : "剩余资产生成完成");
      if (resp && resp.asset_pipeline_phase) {
        applyAssetPipelinePhase(resp.asset_pipeline_phase);
      }
      toast(
        forceRegenerate
          ? "剩余资产已重新生成"
          : (resp && resp.already_complete ? "剩余资产已全部存在" : "剩余资产已生成"),
        false
      );
      setAssetPipelineBusy(null, false);
      setTimeout(() => reloadProjectStripStoryboardParams("asset"), 500);
    } catch (e) {
      stopAssetGenerateProgressTracker("剩余资产生成失败");
      showProjectErrorPanel("剩余资产生成失败", (e && e.message) || String(e));
      setAssetPipelineBusy(null, false);
    } finally {
      assetPipelineRequestInFlight = false;
    }
  }

  window.runReviewBatchGenerate = runReviewBatchGenerate;
  window.runGenerateRemaining = runGenerateRemaining;

  function assetUtcNow() {
    return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  }

  // 暴露到全局作用域
  window.assetUtcNow = assetUtcNow;

  async function saveAssetCard(btn) {
    const card = btn && btn.closest ? btn.closest(".asset-card") : null;
    if (!card || !btn) return;

    // 创建按钮状态管理器
    const state = new ButtonStateManager(btn);
    state.loading("保存中...");

    const kind = card.getAttribute("data-kind") || "";
    const aid = card.getAttribute("data-aid") || "";
    const pick = function (field) {
      const el = card.querySelector('[data-field="' + field + '"]');
      return el ? el.value : "";
    };

    // 获取原始 prompt
    const originalPrompt = pick("prompt");

    // 转换英文ID → 中文ID（只在页面2）
    const translatedPrompt = window.assetMentionPicker?.translateMentionsToOriginalIds
      ? window.assetMentionPicker.translateMentionsToOriginalIds(originalPrompt)
      : originalPrompt;

    const patch = {
      name_ori: pick("name_ori"),
      desc_ori: pick("desc_ori"),
      name_trans: pick("name_trans"),
      desc_trans: pick("desc_trans"),
      prompt: translatedPrompt,  // 使用转换后的
      updated_at: assetUtcNow(),
    };

    try {
      await patchJSON(
        "/api/projects/" + encodeURIComponent(PID) + "/asset/" + encodeURIComponent(kind) + "/" + encodeURIComponent(aid),
        { patch: patch }
      );
      state.success("✓ 已保存");
      toast("已保存资产 " + aid, false);
    } catch (e) {
      state.error("保存失败");
      toast(e.message, true);
    }
  }

  async function genOneAsset(btn, opts) {
    opts = opts || {};
    var card = btn && btn.closest ? btn.closest(".asset-card") : null;
    if (!card || !btn) return;

    var kind = card.getAttribute("data-kind") || "";
    var aid = card.getAttribute("data-aid") || "";
    if (!kind || !aid) {
      toast("无法读取资产卡片（缺少 data-kind / data-aid）", true);
      return;
    }

    // Demo 模式：模拟生成
    if (window.__LOCAL_DEMO__) { _demoGenOneAsset(btn, card, kind, aid); return; }

    if (btn.getAttribute("data-generating") === "1") return;

    btn.setAttribute("data-generating", "1");
    btn.disabled = true;
    btn.textContent = "生成中...";
    btn.classList.add("btn-loading");
    btn.classList.remove("btn-error", "btn-success");
    btn.setAttribute("aria-busy", "true");

    var promptEl = card.querySelector('textarea[data-field="prompt"]');
    var pv = promptEl && typeof promptEl.value === "string" ? promptEl.value.trim() : "";

    if (pv && window.assetMentionPicker?.translateMentionsToOriginalIds) {
      pv = window.assetMentionPicker.translateMentionsToOriginalIds(pv);
    }

    var body = pv ? { prompt_override: pv } : {};
    if (opts.refreshRefsFromPrompt === true) {
      body.refresh_refs_from_prompt = true;
    }
    const imgModel = resolveAssetImgModelParamForCard(card);
    if (imgModel) {
      body.img_model = imgModel;
    }
    try {
      toast("正在生成素材图（可能需数分钟），请稍候…", false, 600000);

      const resp = await postJSON(
        "/api/projects/" +
          encodeURIComponent(PID) +
          "/asset/" +
          encodeURIComponent(kind) +
          "/" +
          encodeURIComponent(aid) +
          "/generate_async",
        body
      );
      const taskId = String((resp && resp.task_id) || "").trim();
      if (!taskId) {
        throw new Error("后端未返回 task_id");
      }
      watchAssetTaskByPolling(kind, aid, taskId, btn, card);
    } catch (e) {
      btn.disabled = false;
      btn.removeAttribute("data-generating");
      btn.removeAttribute("aria-busy");
      btn.classList.remove("btn-loading");
      btn.classList.add("btn-error");
      btn.textContent = "生成失败";
      const errMsg = (e && e.message) || String(e);
      showStickyError("素材图生成失败", errMsg);
      console.error("genOneAsset", e);
      setTimeout(function () {
        btn.classList.remove("btn-error");
        btn.textContent = "生成素材图";
      }, 2000);
    }
  }
  window.genOneAsset = genOneAsset;

  // ── 参考图"+"下拉菜单 ────────────────────────────────────────────────

  function toggleRefAddDropdown(e, btn, kind, aid) {
    e.stopPropagation();
    const dd = btn && btn.parentElement && btn.parentElement.querySelector('.asset-ref-add-dropdown');
    if (!dd) return;
    const isOpen = dd.classList.contains('open');
    // 先关闭所有其他下拉
    closeRefAddDropdowns();
    if (!isOpen) {
      dd.classList.add('open');
      var r = dd.getBoundingClientRect();
      if (r.bottom > window.innerHeight - 8) dd.classList.add('drop-up'); else dd.classList.remove('drop-up');
    }
  }

  function closeRefAddDropdowns() {
    document.querySelectorAll('.asset-ref-add-dropdown.open').forEach(function (d) {
      d.classList.remove('open');
    });
  }

  // 点击页面任意处关闭下拉（但不能干扰文件选择对话框）
  document.addEventListener('click', function () {
    closeRefAddDropdowns();
  });

  // 暴露供 HTML 内联调用
  window.toggleRefAddDropdown = toggleRefAddDropdown;
  window.closeRefAddDropdowns = closeRefAddDropdowns;

  // ── 从资产库选取参考图 ────────────────────────────────────────────────

  var _libraryPickerContext = null; // { kind, aid }

  function openAssetLibraryPicker(kind, aid) {
    // 直接复用"从资产库选择参考图"弹窗（与视频生成页同模板：搜索 / Tab / 多选 / 确认）
    var modal = document.getElementById('shot-asset-library-picker-modal');
    if (!modal) return;

    _shotLibraryPickerContext = { assetMode: true, kind: kind, aid: aid };

    // 当前资产已有的 ref_imgs（用于"已添加"标记）
    var assetData = window.PAGE_DATA && window.PAGE_DATA.asset;
    var ownerRow = assetData && assetData[kind] && assetData[kind][aid];
    _shotPickerCurrentRefs = Array.isArray(ownerRow && ownerRow.ref_imgs) ? ownerRow.ref_imgs.slice() : [];

    // 采集资产（DOM 优先，本地 demo 可用）
    _shotPickerData = _collectPickerAssets();
    _shotPickerActiveTab = 'characters';
    _shotPickerSearchQuery = '';
    _shotPickerSelected = {};
    _shotPickerEpFilter = '';

    var searchInput = document.getElementById('shot-pk-search');
    if (searchInput) searchInput.value = '';
    var epSelect = document.getElementById('shot-pk-ep-filter');
    if (epSelect) { epSelect.value = ''; _populatePickerEpFilter(epSelect); }
    var tabs = document.querySelectorAll('.shot-pk-tab');
    tabs.forEach(function (t) { t.classList.remove('active'); });
    var charTab = document.querySelector('.shot-pk-tab[data-kind="characters"]');
    if (charTab) charTab.classList.add('active');

    _updatePickerCounts();
    _renderPickerContent();
    _updatePickerFooter();

    var meta = document.getElementById('shot-asset-library-picker-meta');
    if (meta) {
      var ownerName = ownerRow ? (ownerRow.name_trans || ownerRow.name_ori || aid) : aid;
      meta.textContent = '为「' + ownerName + '」选取参考图，点击卡片选择后确认添加';
    }
    var titleEl = modal.querySelector('.shot-pk-header h3');
    if (titleEl) titleEl.textContent = '从资产库选取参考图';

    modal.classList.add('on');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeAssetLibraryPicker() {
    const modal = document.getElementById('asset-library-picker-modal');
    if (!modal) return;
    modal.classList.remove('on');
    modal.setAttribute('aria-hidden', 'true');
    _libraryPickerContext = null;
  }

  async function addRefImgFromLibrary(ownerKind, ownerAid, assetFilePath, idTrans, assetName, itemEl) {
    if (!assetFilePath) {
      toast('该资产尚未生成图片', true);
      return;
    }

    const assetData = window.PAGE_DATA && window.PAGE_DATA.asset;
    const ownerRow = assetData && assetData[ownerKind] && assetData[ownerKind][ownerAid];
    const currentRefs = Array.isArray(ownerRow && ownerRow.ref_imgs) ? [...ownerRow.ref_imgs] : [];

    const alreadyIn = currentRefs.some(function (r) {
      return String(r || '').trim() === assetFilePath;
    });

    if (alreadyIn) {
      toast('已在参考图列表中：' + assetName, false);
      return;
    }

    const newRefs = currentRefs.concat([assetFilePath]);

    try {
      await patchJSON(
        '/api/projects/' + encodeURIComponent(PID) +
        '/asset/' + encodeURIComponent(ownerKind) +
        '/' + encodeURIComponent(ownerAid),
        { patch: { ref_imgs: newRefs } }
      );
    } catch (e) {
      toast((e && e.message) || '添加失败', true);
      return;
    }

    // 更新 PAGE_DATA
    if (ownerRow) {
      ownerRow.ref_imgs = newRefs;
    }

    // 在 prompt textarea 末尾插入 @[idTrans]（若未包含）
    const card = document.querySelector(
      '.asset-card[data-kind="' + ownerKind + '"][data-aid="' + CSS.escape(ownerAid) + '"]'
    );
    if (card && idTrans) {
      const promptEl = card.querySelector('textarea[data-field="prompt"]');
      if (promptEl) {
        const mention = '@[' + idTrans + ']';
        if (!promptEl.value.includes(mention)) {
          promptEl.value = promptEl.value + (promptEl.value && !promptEl.value.endsWith('\n') ? '\n' : '') + mention;
        }
      }
    }

    // 刷新参考图预览
    if (card && window.assetRefPreview) {
      const promptEl = card.querySelector('textarea[data-field="prompt"]');
      window.assetRefPreview.update(card, promptEl ? promptEl.value : '');
    }

    // 更新 modal 中该 item 的状态
    if (itemEl) {
      itemEl.classList.add('already-added');
      itemEl.title = '已添加：' + assetName;
      if (!itemEl.querySelector('.lib-added-badge')) {
        var badge = document.createElement('div');
        badge.className = 'lib-added-badge';
        badge.textContent = '已添加';
        itemEl.appendChild(badge);
      }
    }

    toast('已添加「' + assetName + '」为参考图，并在 prompt 中插入 @[' + idTrans + ']', false);
  }

  window.openAssetLibraryPicker = openAssetLibraryPicker;
  window.closeAssetLibraryPicker = closeAssetLibraryPicker;

  // ── 资产参考图上传 / 移除 ──────────────────────────────────────────────

  async function uploadAssetRefImg(input, kind, aid) {
    const file = input && input.files && input.files[0];
    if (!file) return;
    // 立即重置 input，允许重复上传同一文件
    input.value = "";

    const formData = new FormData();
    formData.append("file", file);

    toast("正在上传参考图…", false, 15000);
    try {
      const resp = await fetch(
        "/api/projects/" + encodeURIComponent(PID) +
        "/asset/" + encodeURIComponent(kind) +
        "/" + encodeURIComponent(aid) + "/upload_ref_img",
        { method: "POST", body: formData }
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: resp.statusText }));
        throw new Error(err.detail || resp.statusText);
      }
      const result = await resp.json();

      // 更新内存中的 PAGE_DATA，让 assetRefPreview 能读到最新 ref_imgs
      const assetData = window.PAGE_DATA && window.PAGE_DATA.asset;
      if (assetData && assetData[kind] && assetData[kind][aid]) {
        assetData[kind][aid].ref_imgs = result.ref_imgs;
      }

      // 刷新该卡片的参考图预览区
      const card = document.querySelector(
        '.asset-card[data-kind="' + kind + '"][data-aid="' + CSS.escape(aid) + '"]'
      );
      if (card && window.assetRefPreview) {
        const promptEl = card.querySelector('textarea[data-field="prompt"]');
        window.assetRefPreview.update(card, promptEl ? promptEl.value : "");
      }
      toast("参考图已上传", false);
    } catch (e) {
      toast((e && e.message) || "上传失败", true);
    }
  }

  async function removeAssetRefImg(kind, aid, filePath) {
    if (!confirm("确定移除这张参考图吗？")) return;
    // DEMO 短路：直接改内存 ref_imgs + 刷新预览（不走后端 API）
    if (window.__LOCAL_DEMO__) {
      const assetData = window.PAGE_DATA && window.PAGE_DATA.asset;
      const row = assetData && assetData[kind] && assetData[kind][aid];
      if (row && Array.isArray(row.ref_imgs)) {
        row.ref_imgs = row.ref_imgs.filter(function (p) { return String(p) !== String(filePath); });
      }
      const card = document.querySelector('.asset-card[data-kind="' + kind + '"][data-aid="' + CSS.escape(aid) + '"]');
      if (card && window.assetRefPreview) {
        const promptEl = card.querySelector('textarea[data-field="prompt"]');
        window.assetRefPreview.update(card, promptEl ? promptEl.value : "");
      }
      toast("已移除参考图", false);
      return;
    }
    try {
      const resp = await fetch(
        "/api/projects/" + encodeURIComponent(PID) +
        "/asset/" + encodeURIComponent(kind) +
        "/" + encodeURIComponent(aid) + "/ref_img",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file_path: filePath }),
        }
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: resp.statusText }));
        throw new Error(err.detail || resp.statusText);
      }
      const result = await resp.json();

      // 更新内存中的 PAGE_DATA
      const assetData = window.PAGE_DATA && window.PAGE_DATA.asset;
      if (assetData && assetData[kind] && assetData[kind][aid]) {
        assetData[kind][aid].ref_imgs = result.ref_imgs;
      }

      // 刷新该卡片的参考图预览区
      const card = document.querySelector(
        '.asset-card[data-kind="' + kind + '"][data-aid="' + CSS.escape(aid) + '"]'
      );
      if (card && window.assetRefPreview) {
        const promptEl = card.querySelector('textarea[data-field="prompt"]');
        window.assetRefPreview.update(card, promptEl ? promptEl.value : "");
      }
      toast("已移除参考图", false);
    } catch (e) {
      toast((e && e.message) || "移除失败", true);
    }
  }

  // 暴露到全局，asset-mention-picker.js 的 remove 按钮需要调用
  window.uploadAssetRefImg = uploadAssetRefImg;
  window.removeAssetRefImg = removeAssetRefImg;

  // ── 镜头参考图上传 / 资产库选取 / 移除 ─────────────────────────────────────

  function getShotCard(ep, sid) {
    return document.querySelector(
      '.shot-card.sb-shot-editor[data-ep="' + String(ep) + '"][data-sid="' + CSS.escape(String(sid)) + '"]'
    );
  }

  function getShotSection(ep, sid) {
    const card = getShotCard(ep, sid);
    if (!card) return null;
    return card.closest('.sb-shot-section');
  }

  function parseShotRefVideos(shotSection) {
    if (!shotSection) return [];
    try {
      const raw = shotSection.getAttribute('data-ref-videos') || '[]';
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.map(x => String(x || '').trim()).filter(Boolean) : [];
    } catch (_) {
      return [];
    }
  }

  function parseShotRefImgs(shotSection) {
    if (!shotSection) return [];
    try {
      const raw = shotSection.getAttribute('data-ref-imgs') || '[]';
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.map(x => String(x || '').trim()).filter(Boolean) : [];
    } catch (_) {
      return [];
    }
  }

  function setShotRefImgs(shotSection, refImgs) {
    if (!shotSection) return;
    shotSection.setAttribute('data-ref-imgs', JSON.stringify(dedupeStrings(refImgs || [])));
  }

  function collectShotRefImgPaths(shotSection) {
    return parseShotRefImgs(shotSection);
  }

  function dedupeStrings(items) {
    const out = [];
    const seen = new Set();
    (items || []).forEach(function (v) {
      const s = String(v || '').trim();
      if (!s || seen.has(s)) return;
      seen.add(s);
      out.push(s);
    });
    return out;
  }

  function ensureShotRefStrip(shotSection) {
    if (!shotSection) return null;
    const refCol = shotSection.querySelector('.sb-ref-col');
    if (!refCol) return null;
    let refStrip = refCol.querySelector('.sb-ref-strip');
    if (!refStrip) {
      const emptyDiv = refCol.querySelector('.sb-ref-empty');
      if (emptyDiv) emptyDiv.remove();
      refStrip = document.createElement('div');
      refStrip.className = 'sb-ref-strip';
      refCol.insertBefore(refStrip, refCol.querySelector('.asset-ref-add-wrap') || refCol.querySelector('.sb-ref-hint'));
    }
    return refStrip;
  }

  function applyShotRefImgs(ep, sid, refImgs) {
    const shotSection = getShotSection(ep, sid);
    const card = getShotCard(ep, sid);
    if (!shotSection || !card) return;
    setShotRefImgs(shotSection, refImgs || []);
    const promptTa = card.querySelector('[data-field="prompt_trans"]');
    const mentions = extractAssetMentions(promptTa ? String(promptTa.value || '') : '');
    const refVideos = parseShotRefVideos(shotSection);
    const tokens = dedupeStrings([...(parseShotRefImgs(shotSection) || []), ...refVideos, ...mentions]);
    const refStrip = ensureShotRefStrip(shotSection);
    updateRefImages(refStrip, tokens);
  }

  async function uploadShotRefImg(input, ep, sid) {
    const file = input && input.files && input.files[0];
    if (!file) return;
    input.value = "";
    // DEMO 短路：本地读取文件直接渲染到参考图列（API 被拦截）
    if (window.__LOCAL_DEMO__) {
      var reader = new FileReader();
      reader.onload = function (ev) {
        _demoAppendLocalRefImg(ep, sid, ev.target.result, file.name);
        toast("镜头参考图已上传", false);
      };
      reader.onerror = function () { toast("上传失败", true); };
      reader.readAsDataURL(file);
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    toast("正在上传镜头参考图…", false, 15000);
    try {
      const resp = await fetch(
        "/api/projects/" + encodeURIComponent(PID) +
        "/episodes/" + encodeURIComponent(ep) +
        "/shots/" + encodeURIComponent(sid) + "/upload_ref_img",
        { method: "POST", body: formData }
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: resp.statusText }));
        throw new Error(err.detail || resp.statusText);
      }
      const result = await resp.json();
      applyShotRefImgs(ep, sid, result.ref_imgs || []);
      toast("镜头参考图已上传", false);
    } catch (e) {
      toast((e && e.message) || "上传失败", true);
    }
  }

  // DEMO：把本地 dataURL 图片追加到某镜头的参考图列
  function _demoAppendLocalRefImg(ep, sid, dataUrl, name) {
    var sec = document.getElementById('sb-shot-' + sid);
    if (!sec) return;
    var strip = sec.querySelector('.sb-ref-strip');
    if (!strip) {
      var refCol = sec.querySelector('.sb-ref-col');
      if (!refCol) return;
      strip = document.createElement('div');
      strip.className = 'sb-ref-strip';
      var empty = refCol.querySelector('.sb-ref-empty');
      if (empty) empty.remove();
      refCol.insertBefore(strip, refCol.querySelector('.sb-ref-hint'));
    }
    var cell = document.createElement('div');
    cell.className = 'sb-ref-cell';
    cell.setAttribute('data-type', 'image');
    var baseName = (name || 'uploaded').replace(/\.[^.]+$/, '');
    cell.innerHTML =
      '<img src="' + dataUrl + '" alt="' + baseName + '" title="点击查看大图" data-lightbox-src="' + dataUrl + '" />' +
      '<div class="sb-ref-cap mono"><span class="sb-ref-type-badge">图</span>' +
      '<span class="sb-ref-cap-text"><span class="sb-ref-cap-name">' + baseName + '</span></span></div>';
    strip.appendChild(cell);
  }

  async function removeShotRefImg(ep, sid, filePath) {
    if (!confirm("确定移除这张镜头参考图吗？")) return;
    // DEMO 短路：直接从 DOM 移除对应 cell
    if (window.__LOCAL_DEMO__) {
      var sec = document.getElementById('sb-shot-' + sid);
      if (sec) {
        var cells = sec.querySelectorAll('.sb-ref-cell');
        cells.forEach(function (c) {
          var img = c.querySelector('img,video');
          var p = img && (img.getAttribute('src') || img.getAttribute('data-lightbox-src') || '');
          if (p && p.indexOf(filePath) >= 0) c.remove();
        });
      }
      toast("已移除参考图", false);
      return;
    }
    try {
      const resp = await fetch(
        "/api/projects/" + encodeURIComponent(PID) +
        "/episodes/" + encodeURIComponent(ep) +
        "/shots/" + encodeURIComponent(sid) + "/ref_img",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file_path: filePath }),
        }
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: resp.statusText }));
        throw new Error(err.detail || resp.statusText);
      }
      const result = await resp.json();
      applyShotRefImgs(ep, sid, result.ref_imgs || []);
      toast("已移除参考图", false);
    } catch (e) {
      toast((e && e.message) || "移除失败", true);
    }
  }

  // 替换参考素材：先移除旧的，再打开选择器
  function replaceShotRefImg(ep, sid, oldFilePath) {
    // 先标记旧素材置灰，并记录其在提示词里的实际 @[提及名]（用于文本替换，而非文件名）
    var sec = document.getElementById('sb-shot-' + sid);
    var oldMentionName = '';
    if (sec) {
      var cells = sec.querySelectorAll('.sb-ref-cell');
      cells.forEach(function (c) {
        var cap = c.querySelector('.sb-ref-cap');
        var capPath = cap ? cap.getAttribute('data-ref-path') || '' : '';
        if (capPath === oldFilePath || capPath.indexOf(oldFilePath) >= 0) {
          c.style.opacity = '0.3';
          if (!oldMentionName && cap) {
            oldMentionName = cap.getAttribute('data-ref-name') || '';
          }
        }
      });
    }
    // 打开资产选择器（复用现有面板）
    _replaceContext = { ep: Number(ep), sid: String(sid), oldPath: oldFilePath, oldMentionName: oldMentionName };
    openShotAssetLibraryPicker(ep, sid);
  }
  var _replaceContext = null;

  let _shotLibraryPickerContext = null; // { ep, sid }

  // ── Shot Library Picker: state ─────────────────────────────────────────
  var _shotPickerData = null;
  var _shotPickerCurrentRefs = [];
  var _shotPickerActiveTab = 'characters';
  var _shotPickerSearchQuery = '';
  var _shotPickerSelected = {};  // refPath → item data
  var _shotPickerEpFilter = '';  // '' = all, '1' = E01, etc.

  function openShotAssetLibraryPicker(ep, sid) {
    _shotLibraryPickerContext = { ep: Number(ep), sid: String(sid) };
    var modal = document.getElementById('shot-asset-library-picker-modal');
    var meta = document.getElementById('shot-asset-library-picker-meta');
    if (!modal) return;

    // Collect current refs for this shot（方案Y：本集资产池模式从池取 refPath，绕开 getShotSection 的 data-ep 错配，让"已添加"badge 在任意集都正确）
    if (window._epAssetPickerCtx && typeof window._getEpAssets === 'function') {
      _shotPickerCurrentRefs = window._getEpAssets(window._epAssetPickerCtx.ep)
        .map(function(a){ return a.refPath || ''; }).filter(Boolean);
    } else {
      var shotSection = getShotSection(ep, sid);
      _shotPickerCurrentRefs = collectShotRefImgPaths(shotSection);
    }

    // Collect all asset data (DOM first, then PAGE_DATA fallback)
    _shotPickerData = _collectPickerAssets();
    _shotPickerActiveTab = 'characters';
    _shotPickerSearchQuery = '';
    _shotPickerSelected = {};
    _shotPickerEpFilter = '';

    // Reset search input
    var searchInput = document.getElementById('shot-pk-search');
    if (searchInput) searchInput.value = '';

    // Reset & populate episode filter
    var epSelect = document.getElementById('shot-pk-ep-filter');
    if (epSelect) {
      epSelect.value = '';
      _populatePickerEpFilter(epSelect);
    }

    // Reset tab to characters
    var tabs = document.querySelectorAll('.shot-pk-tab');
    tabs.forEach(function(t) { t.classList.remove('active'); });
    var charTab = document.querySelector('.shot-pk-tab[data-kind="characters"]');
    if (charTab) charTab.classList.add('active');

    // Update counts
    _updatePickerCounts();

    // Render initial content
    _renderPickerContent();
    _updatePickerFooter();

    if (meta) meta.textContent = '为镜头 第' + ep + '集 / 片段' + sid + ' 选取参考图，点击卡片选择后确认添加';
    modal.classList.add('on');
    modal.setAttribute('aria-hidden', 'false');
  }

  /** Collect assets from DOM (.char-group elements) or PAGE_DATA fallback */
  function _collectPickerAssets() {
    var domGroups = document.querySelectorAll('.char-group.asset-group');
    if (domGroups.length > 0) return _collectPickerAssetsFromDOM(domGroups);
    return _collectPickerAssetsFromPageData();
  }

  function _collectPickerAssetsFromDOM(domGroups) {
    var result = { characters: [], scenes: [], props: [] };

    domGroups.forEach(function(g) {
      var kind = g.getAttribute('data-kind');
      var baseId = g.getAttribute('data-base-id');
      if (!kind || !baseId || !result[kind]) return;

      var nameTransEl = g.querySelector('.char-group-name-trans strong');
      var nameOriEl = g.querySelector('.char-group-name-ori');
      var nameTrans = nameTransEl ? nameTransEl.textContent.trim() : baseId;
      var nameOri = nameOriEl ? nameOriEl.textContent.replace(/^中文名\s*/, '').trim() : baseId;

      var repImg = g.querySelector('.char-group-rep img');
      var repSrc = repImg ? repImg.getAttribute('src') : '';

      var cards = g.querySelectorAll('.char-outfit-card');
      var items = [];

      cards.forEach(function(card) {
        var img = card.querySelector('.char-outfit-img img');
        var idTransEl = card.querySelector('.char-outfit-idtrans');
        var descEl = card.querySelector('.char-outfit-desc');

        // Extract asset_id from onclick: openAssetEdit('characters', '姜总_黑色西装', '姜总')
        var onclick = card.getAttribute('onclick') || '';
        var match = onclick.match(/openAssetEdit\('([^']+)',\s*'([^']+)'/);
        var assetId = match ? match[2] : '';

        var imgSrc = img ? img.getAttribute('src') : '';
        var idTrans = idTransEl ? idTransEl.textContent.trim() : '';
        var desc = descEl ? descEl.textContent.trim() : '';

        // Convert img src (images/X.png) to ref path (asset/X.png)
        var fileName = imgSrc.split('/').pop();
        var refPath = fileName ? 'asset/' + fileName : '';

        // Display name: Chinese sub-name from asset_id
        var subName = (assetId.length > baseId.length + 1)
          ? assetId.substring(baseId.length + 1)
          : baseId;

        // English variant: extract from idTrans after group prefix (case-insensitive)
        var groupPrefix = nameTrans.replace(/ /g, '_') + '_';
        var enVariant;
        if (idTrans.toLowerCase().indexOf(groupPrefix.toLowerCase()) === 0) {
          enVariant = idTrans.substring(groupPrefix.length).replace(/_/g, ' ');
        } else {
          enVariant = idTrans.replace(/_/g, ' ');
        }

        // Episode data: try OUTFIT_EP_MAP → ASSET_EP_MAP → DOM badges
        var episodes = [];
        if (window.OUTFIT_EP_MAP && window.OUTFIT_EP_MAP[assetId]) {
          episodes = window.OUTFIT_EP_MAP[assetId];
        } else if (window.ASSET_EP_MAP && window.ASSET_EP_MAP[assetId]) {
          episodes = window.ASSET_EP_MAP[assetId];
        } else if (window.ASSET_EP_MAP && window.ASSET_EP_MAP[baseId]) {
          episodes = window.ASSET_EP_MAP[baseId];
        }

        items.push({
          assetId: assetId,
          baseId: baseId,
          kind: kind,
          imgSrc: imgSrc,
          refPath: refPath,
          idTrans: idTrans,
          desc: desc,
          nameTrans: nameTrans,
          nameOri: nameOri,
          displayName: subName,
          displaySub: enVariant,
          episodes: episodes
        });
      });

      if (items.length > 0) {
        result[kind].push({
          baseId: baseId,
          nameTrans: nameTrans,
          nameOri: nameOri,
          repImgSrc: repSrc,
          items: items
        });
      }
    });

    return result;
  }

  function _collectPickerAssetsFromPageData() {
    var assetData = window.PAGE_DATA && window.PAGE_DATA.asset;
    if (!assetData) return { characters: [], scenes: [], props: [] };

    var aliases = assetData.asset_group_aliases || {};
    var result = { characters: [], scenes: [], props: [] };

    ['characters', 'scenes', 'props'].forEach(function(kind) {
      var items = assetData[kind] || {};
      var groupMap = {};
      var kindAliases = aliases[kind] || {};

      Object.entries(items).forEach(function(entry) {
        var aid = entry[0], row = entry[1];
        if (!row || !(row.file_path || row.oss_url)) return;

        var baseName = kindAliases[aid] || kindAliases[row.name_trans] || kindAliases[row.id_trans] || aid;

        if (!groupMap[baseName]) {
          var groupEnName = '';
          Object.entries(kindAliases).forEach(function(ae) {
            if (ae[1] === baseName && ae[0].indexOf('_') < 0 && ae[0].indexOf(' ') >= 0) {
              groupEnName = ae[0];
            }
          });
          groupMap[baseName] = {
            baseId: baseName,
            nameTrans: groupEnName || baseName,
            nameOri: baseName,
            repImgSrc: '',
            items: []
          };
        }

        var filePath = row.file_path || '';
        var imgSrc = filePath ? '/files/' + encodeURIComponent(PID) + '/' + filePath : (row.oss_url || '');

        var groupPrefix = groupMap[baseName].nameTrans.replace(/ /g, '_') + '_';
        var enVariant;
        if (row.id_trans && row.id_trans.toLowerCase().indexOf(groupPrefix.toLowerCase()) === 0) {
          enVariant = row.id_trans.substring(groupPrefix.length).replace(/_/g, ' ');
        } else {
          enVariant = (row.id_trans || aid).replace(/_/g, ' ');
        }

        groupMap[baseName].items.push({
          assetId: aid,
          baseId: baseName,
          kind: kind,
          imgSrc: imgSrc,
          refPath: filePath,
          idTrans: row.id_trans || aid,
          desc: (row.desc_trans || row.desc_ori || '').substring(0, 80),
          nameTrans: row.name_trans || aid,
          nameOri: row.name_ori || baseName,
          displayName: row.name_ori || enVariant,
          displaySub: enVariant,
          episodes: row.episodes || []
        });

        if (!groupMap[baseName].repImgSrc && imgSrc) {
          groupMap[baseName].repImgSrc = imgSrc;
        }
      });

      result[kind] = Object.values(groupMap);
    });

    return result;
  }

  function _renderPickerContent() {
    var kind = _shotPickerActiveTab;
    var query = _shotPickerSearchQuery;
    var groups = _shotPickerData[kind] || [];
    var container = document.getElementById('shot-asset-library-picker-body');
    if (!container) return;

    container.innerHTML = '';
    var totalCount = 0;
    var _seenKey = {};   // 跨组共享：按唯一资产 id 去重（不用图片路径，避免占位图全部塌缩成一个）

    // 资产唯一键：优先 idTrans/assetId，回退 refPath
    function _pkKey(it) { return String(it.idTrans || it.assetId || it.refPath || ''); }

    groups.forEach(function(group) {
      var filteredItems = group.items;
      // 去重：同一资产只保留首个
      filteredItems = filteredItems.filter(function(item) {
        var k = _pkKey(item);
        if (!k || _seenKey[k]) return false;
        _seenKey[k] = true;
        return true;
      });
      // Episode filter
      if (_shotPickerEpFilter) {
        var epNum = parseInt(_shotPickerEpFilter, 10);
        filteredItems = filteredItems.filter(function(item) {
          return Array.isArray(item.episodes) && item.episodes.indexOf(epNum) >= 0;
        });
      }
      // Search filter
      if (query) {
        var q = query.toLowerCase();
        filteredItems = filteredItems.filter(function(item) {
          return item.nameTrans.toLowerCase().indexOf(q) >= 0 ||
                 item.nameOri.toLowerCase().indexOf(q) >= 0 ||
                 item.idTrans.toLowerCase().indexOf(q) >= 0 ||
                 item.assetId.toLowerCase().indexOf(q) >= 0 ||
                 item.displayName.toLowerCase().indexOf(q) >= 0 ||
                 item.displaySub.toLowerCase().indexOf(q) >= 0;
        });
      }
      if (filteredItems.length === 0) return;
      totalCount += filteredItems.length;

      var groupEl = document.createElement('div');
      groupEl.className = 'shot-pk-group';

      // Group header
      var headerEl = document.createElement('div');
      headerEl.className = 'shot-pk-group-head';
      var subLabel = kind === 'characters' ? '套服装' : (kind === 'scenes' ? '个场景' : '个道具');
      headerEl.innerHTML =
        '<img class="shot-pk-group-rep" src="' + group.repImgSrc + '" alt="">' +
        '<span class="shot-pk-group-name">' + group.nameOri + '</span>' +
        '<span class="shot-pk-group-en">' + group.nameTrans + '</span>' +
        '<span class="shot-pk-group-count">' + filteredItems.length + ' ' + subLabel + '</span>' +
        '<span class="shot-pk-group-arrow">▾</span>';

      (function(gEl) {
        headerEl.addEventListener('click', function() { gEl.classList.toggle('collapsed'); });
      })(groupEl);
      groupEl.appendChild(headerEl);

      // Items grid
      var gridEl = document.createElement('div');
      gridEl.className = 'shot-pk-group-grid';

      filteredItems.forEach(function(item) {
        var alreadyAdded = _shotPickerCurrentRefs.some(function(r) {
          return String(r || '').trim() === item.refPath;
        });

        var itemEl = document.createElement('div');
        var _pkSelKey = item.idTrans || item.assetId || item.refPath || '';
        itemEl.className = 'shot-pk-item' + (alreadyAdded ? ' already-added' : '') + (_shotPickerSelected[_pkSelKey] ? ' selected' : '');
        itemEl.title = alreadyAdded ? '已添加：' + item.displayName : '选取：' + item.displayName;

        itemEl.innerHTML =
          '<img src="' + item.imgSrc + '" alt="' + item.displayName + '" loading="lazy" draggable="false">' +
          '<div class="shot-pk-item-name" title="' + item.displayName + '">' + item.displayName + '</div>' +
          (item.displaySub && item.displaySub !== item.displayName
            ? '<div class="shot-pk-item-sub" title="' + item.displaySub + '">' + item.displaySub + '</div>'
            : '') +
          (alreadyAdded ? '<div class="shot-pk-item-badge">已添加</div>' : '');

        (function(it, el) {
          var key = _pkKey(it);
          el.addEventListener('click', function() {
            // Skip already-added items
            if (el.classList.contains('already-added')) return;
            // 替换模式：单选（清空其他，仅选当前）
            if (_replaceContext) {
              _shotPickerSelected = {};
              document.querySelectorAll('#shot-asset-library-picker-modal .shot-pk-item.selected').forEach(function (x) { x.classList.remove('selected'); });
              _shotPickerSelected[key] = it;
              el.classList.add('selected');
            } else {
              // 多选：toggle（按唯一资产 id，避免共享路径互相取消）
              if (_shotPickerSelected[key]) {
                delete _shotPickerSelected[key];
                el.classList.remove('selected');
              } else {
                _shotPickerSelected[key] = it;
                el.classList.add('selected');
              }
            }
            _updatePickerFooter();
          });
        })(item, itemEl);

        gridEl.appendChild(itemEl);
      });

      groupEl.appendChild(gridEl);
      container.appendChild(groupEl);
    });

    if (totalCount === 0) {
      container.innerHTML = '<p class="shot-pk-empty">' +
        (query ? '没有找到匹配「' + query + '」的资产' : '暂无已生成的资产图，请先完成「生成素材图」步骤') +
        '</p>';
    }
  }

  function _updatePickerCounts() {
    var data = _shotPickerData;
    if (!data) return;
    ['characters', 'scenes', 'props'].forEach(function(kind) {
      var groups = data[kind] || [];
      var count = 0;
      groups.forEach(function(g) { count += g.items.length; });
      var el = document.getElementById('shot-pk-count-' + kind);
      if (el) el.textContent = count || '';
    });
  }

  /** Populate episode dropdown from sbEpisodeNums or fallback 1-10 */
  function _populatePickerEpFilter(selectEl) {
    if (!selectEl) return;
    var nums = (window.PAGE_DATA && window.PAGE_DATA.sbEpisodeNums) || [1,2,3,4,5,6,7,8,9,10];
    selectEl.innerHTML = '<option value="">全部集数</option>';
    nums.forEach(function(n) {
      var opt = document.createElement('option');
      opt.value = String(n);
      opt.textContent = 'E' + (n < 10 ? '0' : '') + n;
      selectEl.appendChild(opt);
    });
  }

  window._onPickerEpChange = function(val) {
    _shotPickerEpFilter = val || '';
    _shotPickerSelected = {};
    _renderPickerContent();
    _updatePickerFooter();
  };

  window._onPickerSearch = function(query) {
    _shotPickerSearchQuery = (query || '').trim();
    _renderPickerContent();
  };

  window._onPickerTabClick = function(kind, tabEl) {
    _shotPickerActiveTab = kind;
    _shotPickerSelected = {};  // Clear selection on tab switch
    // Keep search query and episode filter across tab switches
    var tabs = document.querySelectorAll('.shot-pk-tab');
    tabs.forEach(function(t) { t.classList.remove('active'); });
    if (tabEl) tabEl.classList.add('active');
    _renderPickerContent();
    _updatePickerFooter();
  };

  /** Update footer selection count and confirm button state */
  function _updatePickerFooter() {
    var keys = Object.keys(_shotPickerSelected);
    var info = document.getElementById('shot-pk-footer-info');
    var btn = document.getElementById('shot-pk-confirm-btn');
    var isReplace = !!_replaceContext;
    if (info) {
      if (isReplace) {
        info.innerHTML = keys.length > 0
          ? '已选择 <strong>1</strong> 项替换素材（单选）'
          : '选择一个素材进行替换（单选）';
      } else {
        info.innerHTML = keys.length > 0
          ? '已选择 <strong>' + keys.length + '</strong> 项资产'
          : '点击卡片选择资产（可多选）';
      }
    }
    if (btn) {
      btn.disabled = keys.length === 0;
      btn.textContent = isReplace ? '确认替换' : (keys.length > 0 ? '确认添加 (' + keys.length + ')' : '确认添加');
    }
  }

  /** Batch-add all selected items (or replace single item if _replaceContext is set) */
  window._onPickerConfirm = function() {
    // 团队管理·任务分配复用本选择器：把所选资产写回成员分配
    if (window._taskAssignPickerCtx) {
      var _taIdx = window._taskAssignPickerCtx.memberIdx;
      var _taAids = Object.keys(_shotPickerSelected || {}).map(function(k){ var it = _shotPickerSelected[k]; return it ? (it.assetId || it.idTrans || k) : k; }).filter(Boolean);
      window._taskAssignPickerCtx = null;
      try { if (typeof closeShotAssetLibraryPicker === 'function') closeShotAssetLibraryPicker(); } catch (_) {}
      if (typeof window._handleTaskAssignPickerResult === 'function') window._handleTaskAssignPickerResult(_taIdx, _taAids);
      return;
    }
    // 方案Y：本集资产池模式分流（add/replace 写独立集级池），已处理则直接返回，不破坏下方原 shot-level 逻辑
    if (window._epAssetPickerCtx && typeof window._handleEpAssetPickerConfirm === 'function') {
      var _epHandled = false;
      try { _epHandled = window._handleEpAssetPickerConfirm(); } catch (_) {}
      if (_epHandled) return;
    }
    var ctx = _shotLibraryPickerContext;
    if (!ctx) return;

    var items = Object.values(_shotPickerSelected);
    if (items.length === 0) return;

    // ── 资产卡片模式：把所选资产加到该资产的 ref_imgs（非镜头）──
    if (ctx.assetMode) {
      var aData = window.PAGE_DATA && window.PAGE_DATA.asset;
      var oRow = aData && aData[ctx.kind] && aData[ctx.kind][ctx.aid];
      var curRefs = Array.isArray(oRow && oRow.ref_imgs) ? oRow.ref_imgs.slice() : [];
      var toAddA = items.filter(function (it) {
        return !curRefs.some(function (r) { return String(r || '').trim() === it.refPath; });
      });
      if (toAddA.length === 0) { toast('所选资产均已在参考图列表中', false); return; }
      var newRefsA = curRefs.concat(toAddA.map(function (it) { return it.refPath; }));
      if (oRow) oRow.ref_imgs = newRefsA;
      var cardA = document.querySelector('.asset-card[data-kind="' + ctx.kind + '"][data-aid="' + CSS.escape(ctx.aid) + '"]');
      var promptElA = cardA && cardA.querySelector('textarea[data-field="prompt"]');
      if (cardA && window.assetRefPreview) window.assetRefPreview.update(cardA, promptElA ? promptElA.value : '');
      patchJSON('/api/projects/' + encodeURIComponent(PID) + '/asset/' + encodeURIComponent(ctx.kind) + '/' + encodeURIComponent(ctx.aid), { patch: { ref_imgs: newRefsA } }).catch(function () {});
      _shotPickerCurrentRefs = newRefsA;
      _shotPickerSelected = {};
      _renderPickerContent();
      _updatePickerFooter();
      var namesA = toAddA.map(function (it) { return it.displayName; }).join('、');
      toast('已添加「' + namesA + '」为参考图', false);
      return;
    }

    var shotSection = getShotSection(ctx.ep, ctx.sid);

    // ── 替换模式：用新素材替换旧素材 ──
    // 正确语义：把提示词里 @[旧资产提及] 改为 @[新资产提及]，ref_imgs 随之由 prompt 重算。
    // 与 blur 保存逻辑(buildShotPatchFromCard)完全一致：ref_imgs = computeRefImgsFromPrompt(prompt)。
    // @替换必须用旧资产在 prompt 里的实际提及名（旧 cell 的 data-ref-name），而非文件名
    // —— 文件名与提及名不一致（如中文资产 @[酒店客房_夜晚蓝光] 文件名是 hotel_room_night_blue_v0002）。
    if (_replaceContext && _replaceContext.ep === ctx.ep && _replaceContext.sid === ctx.sid) {
      var newItem = items[0];
      var newMentionName = newItem.idTrans || newItem.name || '';         // 新资产在 prompt 里的 @[提及名]
      var oldMentionName = _replaceContext.oldMentionName || '';          // 旧资产在 prompt 里的实际 @[提及名]
      var ta = shotSection.querySelector('textarea[data-field="prompt_trans"]');

      // 1) 改提示词文本 @[旧名] → @[新名]（用旧实际提及名匹配，非文件名）
      if (ta && oldMentionName && newMentionName && oldMentionName !== newMentionName) {
        var mentionRe = new RegExp('@\\[' + oldMentionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\]', 'g');
        ta.value = ta.value.replace(mentionRe, '@[' + newMentionName + ']');
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // 2) ref_imgs 由改后的 prompt 重算（与 blur 保存一致）。不手动 push 路径——否则
      //    路径token 与 prompt 提及token 各渲染一个 cell（语义键不同不去重），多出"示例画面"。
      applyShotRefImgs(ctx.ep, ctx.sid, computeRefImgsFromPrompt(ta ? ta.value : ''));

      toast('已替换为 ' + (newItem.displayName || newMentionName), false, 2000);
      _replaceContext = null;
      closeShotAssetLibraryPicker();
      return;
    }

    var currentRefs = collectShotRefImgPaths(shotSection);

    // Filter out already-added
    var toAdd = items.filter(function(it) {
      return !currentRefs.some(function(r) { return String(r || '').trim() === it.refPath; });
    });

    if (toAdd.length === 0) {
      toast('所选资产均已在参考图列表中', false);
      return;
    }

    var newRefs = currentRefs.concat(toAdd.map(function(it) { return it.refPath; }));

    // Apply to DOM
    applyShotRefImgs(ctx.ep, ctx.sid, newRefs);

    // Try API call (for real app; local demo will fail silently)
    patchJSON(
      '/api/projects/' + encodeURIComponent(PID) +
      '/episodes/' + encodeURIComponent(ctx.ep) +
      '/shots/' + encodeURIComponent(ctx.sid),
      { patch: { ref_imgs: newRefs } }
    ).catch(function() {
      // Local demo: API not available, DOM already updated above
    });

    // Update current refs and refresh picker UI
    _shotPickerCurrentRefs = newRefs;
    _shotPickerSelected = {};
    _renderPickerContent();
    _updatePickerFooter();

    // Toast feedback
    var names = toAdd.map(function(it) { return it.displayName; }).join('、');
    toast('已添加「' + names + '」为镜头参考图', false);
  };

  function closeShotAssetLibraryPicker() {
    const modal = document.getElementById('shot-asset-library-picker-modal');
    if (!modal) return;
    modal.classList.remove('on');
    modal.setAttribute('aria-hidden', 'true');
    _shotLibraryPickerContext = null;
    _replaceContext = null;   // 关闭时清理替换上下文，避免残留单选模式
    window._epAssetPickerCtx = null;   // 方案Y：清理本集资产池选择上下文
  }

  async function addShotRefImgFromLibrary(ep, sid, assetFilePath, assetName, itemEl) {
    if (!assetFilePath) {
      toast('该资产尚未生成图片', true);
      return;
    }
    const shotSection = getShotSection(ep, sid);
    const currentRefs = collectShotRefImgPaths(shotSection);
    const alreadyIn = currentRefs.some(r => String(r || '').trim() === assetFilePath);
    if (alreadyIn) {
      toast('已在参考图列表中：' + assetName, false);
      return;
    }
    const newRefs = currentRefs.concat([assetFilePath]);
    try {
      await patchJSON(
        '/api/projects/' + encodeURIComponent(PID) +
        '/episodes/' + encodeURIComponent(ep) +
        '/shots/' + encodeURIComponent(sid),
        { patch: { ref_imgs: newRefs } }
      );
    } catch (e) {
      toast((e && e.message) || '添加失败', true);
      return;
    }
    applyShotRefImgs(ep, sid, newRefs);
    if (itemEl) {
      itemEl.classList.add('already-added');
      itemEl.title = '已添加：' + assetName;
      if (!itemEl.querySelector('.lib-added-badge')) {
        var badge = document.createElement('div');
        badge.className = 'lib-added-badge';
        badge.textContent = '已添加';
        itemEl.appendChild(badge);
      }
    }
    toast('已添加「' + assetName + '」为镜头参考图', false);
  }

  window.uploadShotRefImg = uploadShotRefImg;
  window._demoAppendLocalRefImg = _demoAppendLocalRefImg;
  window.removeShotRefImg = removeShotRefImg;
  window.openShotAssetLibraryPicker = openShotAssetLibraryPicker;
  window.replaceShotRefImg = replaceShotRefImg;
  window.closeShotAssetLibraryPicker = closeShotAssetLibraryPicker;

  // ─────────────────────────────────────────────────────────────────────────
  // AI 辅助修改提示词
  // ─────────────────────────────────────────────────────────────────────────

  var _aiState = null; // { ep, sid, originalPrompt }

  /* 台词高亮：将引号内文本包裹在 <mark> 中 */
  function _highlightDialogue(text) {
    var html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // 1. Chinese quotes
    html = html.replace(/「([^」]+?)」/g, '<mark>「$1」</mark>');
    html = html.replace(/『([^』]+?)』/g, '<mark>『$1』</mark>');
    // Chinese full-width double quotes “ ”
    html = html.replace(/“([^”]+?)”/g, '<mark>“$1”</mark>');

    // 2. ASCII double quotes
    html = html.replace(/"([^"]+?)"/g, '<mark>"$1"</mark>');

    // 3. Single quotes: state machine to distinguish apostrophes from quotes
    //    Opening quote: ' NOT preceded by a letter (rules out Don', she')
    //    Internal apostrophe: ' followed by a letter (she's, don't, it's)
    //    Closing quote: ' NOT followed by a letter
    var result = '';
    var i = 0;
    while (i < html.length) {
      if (html.charCodeAt(i) === 0x27) { // apostrophe / single quote
        // Check if this is a valid opening quote (not after a letter)
        var isOpener = (i === 0) || !/[a-zA-Z]/.test(html.charAt(i - 1));
        if (isOpener) {
          // Scan forward to find the closing quote
          var j = i + 1;
          var found = false;
          while (j < html.length) {
            if (html.charCodeAt(j) === 0x27) {
              // Apostrophe inside quote (followed by letter)? Skip it.
              if (j + 1 < html.length && /[a-zA-Z]/.test(html.charAt(j + 1))) {
                j++;
                continue;
              }
              // Potential closing quote (not followed by a letter)
              if (j > i + 1) { found = true; }
              break;
            }
            j++;
          }
          if (found) {
            var content = html.substring(i + 1, j);
            // Check context: speech verb nearby or Chinese content
            var before = html.substring(Math.max(0, i - 30), i);
            var hasSpeechVerb = /[说答问道喊诉打断笑唱]/.test(before.slice(-15));
            var hasChinese = /[一-鿿]/.test(content);
            if (hasSpeechVerb || hasChinese) {
              result += '<mark>\x27' + content + '\x27</mark>';
            } else {
              result += html.charAt(i) + content + html.charAt(j);
            }
            i = j + 1;
            continue;
          }
        }
      }
      result += html.charAt(i);
      i++;
    }

    return result;
  }

  /* Render highlighted HTML into contenteditable editor */
  function _renderHighlight(editor, text) {
    var html = _highlightDialogue(text);
    editor.innerHTML = html.replace(/\n/g, '<br>');
  }

  /* Extract plain text from contenteditable editor */
  function _getPlainText(el) {
    var text = '';
    function walk(node) {
      if (node.nodeType === 3) { text += node.textContent; }
      else if (node.nodeType === 1) {
        var tag = node.tagName;
        if (tag === 'BR') { text += '\n'; }
        else if (tag === 'DIV' || tag === 'P' || tag === 'LI') {
          for (var i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i]);
          text += '\n';
        }
        else { for (var i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i]); }
      }
    }
    walk(el);
    // 去掉末尾多余的 \n（从最后的块级元素来的）
    while (text.length > 0 && text.charAt(text.length - 1) === '\n') {
      text = text.slice(0, -1);
    }
    return text;
  }

  /* Set cursor position by character offset */
  function _setCursor(el, offset) {
    var range = document.createRange();
    var sel = window.getSelection();
    var pos = 0;
    var found = false;
    function walk(node) {
      if (found) return;
      if (node.nodeType === 3) {
        if (pos + node.length >= offset) {
          range.setStart(node, offset - pos);
          range.collapse(true);
          found = true;
          return;
        }
        pos += node.length;
      } else if (node.nodeType === 1) {
        var tag = node.tagName;
        if (tag === 'BR') {
          if (pos === offset) {
            // Cursor before this <br>: put cursor before the BR element
            range.setStartBefore(node);
            range.collapse(true);
            found = true;
            return;
          }
          pos += 1; // <br> counts as \n
        } else {
          for (var i = 0; i < node.childNodes.length; i++) { walk(node.childNodes[i]); if (found) return; }
        }
      }
    }
    walk(el);
    if (found) { sel.removeAllRanges(); sel.addRange(range); }
  }

  /* Demo：透明 textarea + 高亮背景层（保留撤回/光标 + 实时引号高亮 + AI 按钮） */
  function _initPromptHighlightOverlay() {
    var tas = document.querySelectorAll('.sb-prompt-ta');
    tas.forEach(function(ta) {
      if (ta.dataset.hlOverlay) return;
      ta.dataset.hlOverlay = '1';

      // 创建包裹容器
      var wrap = document.createElement('div');
      wrap.className = 'prompt-hl-wrap';
      ta.parentNode.insertBefore(wrap, ta);
      wrap.appendChild(ta);

      // 创建高亮背景层
      var back = document.createElement('div');
      back.className = 'prompt-hl-back';
      back.setAttribute('aria-hidden', 'true');
      wrap.insertBefore(back, ta);

      // 初始渲染
      var text = ta.value;
      back.innerHTML = _highlightDialogue(text).replace(/\n/g, '<br>') || '&nbsp;';

      // 精确同步样式（字体/行高/padding/边框补偿，确保光标完全对齐）
      var cs = getComputedStyle(ta);
      var textStyles = ['font','fontSize','fontFamily','fontWeight','fontStyle',
        'lineHeight','letterSpacing','wordSpacing','textIndent','tabSize',
        'paddingTop','paddingRight','paddingBottom','paddingLeft'];
      textStyles.forEach(function(p) { back.style[p] = cs[p]; });
      back.style.boxSizing = 'border-box';

      // 补偿 textarea 边框宽度（backdrop 无边框，需额外 padding）
      var bwTop = parseFloat(cs.borderTopWidth) || 0;
      var bwRight = parseFloat(cs.borderRightWidth) || 0;
      var bwBottom = parseFloat(cs.borderBottomWidth) || 0;
      var bwLeft = parseFloat(cs.borderLeftWidth) || 0;
      back.style.paddingTop = (parseFloat(cs.paddingTop) + bwTop) + 'px';
      back.style.paddingRight = (parseFloat(cs.paddingRight) + bwRight) + 'px';
      back.style.paddingBottom = (parseFloat(cs.paddingBottom) + bwBottom) + 'px';
      back.style.paddingLeft = (parseFloat(cs.paddingLeft) + bwLeft) + 'px';

      // 输入时实时更新背景层（轻量 innerHTML，仅 <mark> 标签，性能可控）
      ta.addEventListener('input', function() {
        back.innerHTML = _highlightDialogue(ta.value).replace(/\n/g, '<br>') || '&nbsp;';
      });

      // 滚动同步
      ta.addEventListener('scroll', function() {
        back.scrollTop = ta.scrollTop;
        back.scrollLeft = ta.scrollLeft;
      });

      // studio 有润色按钮，不建额外 toolbar
      if (ta.closest('#v-g.vg-studio-on')) return;
      // 添加 AI 修改按钮工具栏
      var toolbar = document.createElement('div');
      toolbar.className = 'sb-prompt-toolbar';
      var aiBtn = document.createElement('button');
      aiBtn.type = 'button';
      aiBtn.className = 'shot-ai-trigger-btn';
      aiBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>AI 修改';
      aiBtn.onclick = function(e) {
        e.preventDefault(); e.stopPropagation();
        var section = ta.closest('.sb-shot-section');
        var ep = section ? section.getAttribute('data-ep') : '';
        var sid = section ? section.getAttribute('data-sid') : '';
        openAiModifyPanel(ep, sid);
      };
      toolbar.appendChild(aiBtn);
      wrap.parentNode.insertBefore(toolbar, wrap.nextSibling);
    });
  }

  /* Initialize: contenteditable editor with inline highlights + toolbar */
  function _initPromptEnhancements() {
    var tas = document.querySelectorAll('.sb-prompt-ta');
    tas.forEach(function(ta) {
      if (ta.dataset.enhanced) return;
      ta.dataset.enhanced = '1';

      // Create wrapper
      var wrap = document.createElement('div');
      wrap.className = 'sb-prompt-editor-wrap';
      ta.parentNode.insertBefore(wrap, ta);
      wrap.appendChild(ta);

      // Create contenteditable editor
      var editor = document.createElement('div');
      editor.className = 'sb-prompt-editor';
      editor.contentEditable = 'true';
      editor.spellcheck = false;
      editor.setAttribute('role', 'textbox');
      // Fixed height via CSS, do not copy min-height
      if (ta.placeholder) editor.setAttribute('data-placeholder', ta.placeholder);

      wrap.insertBefore(editor, ta);

      // Initial render
      _renderHighlight(editor, ta.value);

      // Hide original textarea
      ta.style.display = 'none';

      // 输入时只同步文本，不在打字过程中重建 DOM（避免光标跳变）
      editor.addEventListener('input', function() {
        ta.value = _getPlainText(editor);
      });
      // 离开时应用高亮（引号/对话标记），此时无需关心光标位置
      editor.addEventListener('blur', function() {
        var text = ta.value;
        _renderHighlight(editor, text);
      });

      // Paste as plain text
      editor.addEventListener('paste', function(e) {
        e.preventDefault();
        var text = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, text);
      });

      // Create toolbar with AI button
      var toolbar = document.createElement('div');
      toolbar.className = 'sb-prompt-toolbar';
      var aiBtn = document.createElement('button');
      aiBtn.type = 'button';
      aiBtn.className = 'shot-ai-trigger-btn';
      aiBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>AI 修改';
      aiBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        var section = ta.closest('.sb-shot-section');
        var ep = section ? section.getAttribute('data-ep') : '';
        var sid = section ? section.getAttribute('data-sid') : '';
        openAiModifyPanel(ep, sid);
      };
      toolbar.appendChild(aiBtn);
      wrap.parentNode.insertBefore(toolbar, wrap.nextSibling);
    });
  }

  /* Mock AI 生成 */
  function _mockAiGenerate(prompt, request) {
    var req = request.trim();
    var result = prompt;

    if (/简化|精简|缩减|更简洁/.test(req)) {
      var lines = result.split('\n').filter(function(l) {
        return l.trim().length > 0 && !/^\s*[/／]/.test(l);
      });
      result = lines.join('\n');
    } else if (/优化|增强|丰富|细节|画面/.test(req)) {
      if (!/空气|粒子|光束/.test(result)) {
        result = result + '\n画面细节：空气中漂浮着细微的尘埃粒子，在光线中若隐若现，增添了画面的层次感和真实感。';
      }
      if (!/色温|色彩/.test(result)) {
        result = result + '\n色彩：画面采用低饱和暖色系，暗部带有深蓝冷色调，形成冷暖对比的视觉张力。';
      }
    } else if (/运镜|镜头|推镜|拉镜|摇|跟踪|跟随/.test(req)) {
      if (/运镜/.test(result)) {
        result = result.replace(/运镜[^\n]*/, '运镜手法：缓慢推镜，从全景逐渐推至中近景，配合角色情绪变化调整推镜速度');
      } else {
        result = result + '\n运镜手法：缓慢推镜，从全景逐渐推至中近景，配合角色情绪变化调整推镜速度。';
      }
    } else if (/氛围|光线|色调|暖|冷|戏剧/.test(req)) {
      if (/光线|灯光/.test(result)) {
        result = result.replace(/(?:光线|灯光)[^\n]*/, '光线：采用侧逆光为主光，配合暖黄色辅助光，在角色面部形成明暗过渡，营造出温暖而富有戏剧感的氛围');
      } else {
        result = result + '\n光线：采用侧逆光为主光，配合暖黄色辅助光，在角色面部形成明暗过渡，营造出温暖而富有戏剧感的氛围。';
      }
    } else {
      result = result + '\n\n[AI 根据需求「' + req + '」进行了调整 — Demo 模拟结果]';
    }

    return result;
  }

  /* 打开 AI 修改面板（内联模式） */
  function openAiModifyPanel(ep, sid) {
    var section = document.querySelector('.sb-shot-section[data-ep="' + ep + '"][data-sid="' + sid + '"]');
    if (!section) return;

    // If panel already open for this section, close it (toggle behavior)
    var existing = section.querySelector('.shot-ai-inline');
    if (existing) {
      closeAiInline(existing, section);
      return;
    }

    // Close any other open AI panels first
    document.querySelectorAll('.shot-ai-inline').forEach(function(el) {
      var s = el.closest('.sb-shot-section');
      closeAiInline(el, s);
    });

    var ta = section.querySelector('.sb-prompt-ta');
    var prompt = ta ? ta.value : '';
    _aiState = { ep: ep, sid: sid, originalPrompt: prompt };

    var toolbar = section.querySelector('.sb-prompt-toolbar');
    if (!toolbar) return;

    // 1. Keep AI button visible, add shortcut chips to its left
    var aiBtn = toolbar.querySelector('.shot-ai-trigger-btn');
    if (aiBtn) {
      aiBtn.classList.add('active');
      aiBtn.title = '收起面板';
    }

    // Create chips container on the left of toolbar
    var chipsWrap = document.createElement('span');
    chipsWrap.className = 'shot-ai-toolbar-chips';
    chipsWrap.setAttribute('data-ai-temp', '1');
    var presets = [
      { label: '优化画面', text: '补充画面细节，增强视觉表现力，保持原有运镜和角色动作不变' },
      { label: '调整运镜', text: '优化镜头运动方式，使画面更有电影感和节奏感' },
      { label: '简化', text: '精简冗余描述，保留核心画面要素和角色动作，使提示词更简洁' },
      { label: '换氛围', text: '调整光线、色调和氛围描述，使画面更具戏剧张力和情绪感染力' }
    ];

    // Build panel first so we can reference input
    var panel = document.createElement('div');
    panel.className = 'shot-ai-inline';

    var input = document.createElement('textarea');
    input.className = 'shot-ai-inline-input';
    input.rows = 2;
    input.placeholder = '描述修改需求，如「增加暖色调光线」「改为缓慢推镜」…';
    input.id = 'shot-ai-inline-input-' + ep + '-' + sid;
    panel.appendChild(input);

    var genBtn = document.createElement('button');
    genBtn.type = 'button';
    genBtn.className = 'shot-ai-inline-gen';
    genBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>生成';
    panel.appendChild(genBtn);

    // Loading state
    var loadingWrap = document.createElement('div');
    loadingWrap.className = 'shot-ai-inline-loading';
    loadingWrap.style.display = 'none';
    loadingWrap.innerHTML = '<span class="shot-ai-inline-spin-lg"></span><span class="shot-ai-inline-loading-text">AI 正在生成修改…</span>';
    panel.appendChild(loadingWrap);

    // Result area
    var resultWrap = document.createElement('div');
    resultWrap.className = 'shot-ai-inline-result-wrap';
    resultWrap.style.display = 'none';

    var resultHint = document.createElement('div');
    resultHint.className = 'shot-ai-inline-result-hint';
    resultHint.textContent = 'AI 生成结果';
    resultWrap.appendChild(resultHint);

    var resultArea = document.createElement('textarea');
    resultArea.className = 'shot-ai-inline-result';
    resultArea.rows = 6;
    resultWrap.appendChild(resultArea);

    // Confirm overlay
    var confirmWrap = document.createElement('div');
    confirmWrap.className = 'shot-ai-inline-confirm';
    confirmWrap.style.display = 'none';
    confirmWrap.innerHTML = '<span class="shot-ai-inline-confirm-text">确认采纳此修改？将覆盖原有提示词内容。</span>';
    var confirmActions = document.createElement('div');
    confirmActions.className = 'shot-ai-inline-confirm-actions';
    var confirmCancel = document.createElement('button');
    confirmCancel.type = 'button';
    confirmCancel.className = 'shot-ai-inline-discard';
    confirmCancel.textContent = '取消';
    confirmCancel.onclick = function() { confirmWrap.style.display = 'none'; };
    var confirmOk = document.createElement('button');
    confirmOk.type = 'button';
    confirmOk.className = 'shot-ai-inline-adopt';
    confirmOk.textContent = '确认采纳';
    confirmOk.onclick = function() {
      var resultVal = resultArea.value;
      ta.value = resultVal;
      var editor = ta.previousElementSibling;
      if (editor && editor.classList.contains('sb-prompt-editor')) {
        _renderHighlight(editor, resultVal);
      }
      closeAiInline(panel, section);
    };
    confirmActions.appendChild(confirmCancel);
    confirmActions.appendChild(confirmOk);
    confirmWrap.appendChild(confirmActions);
    resultWrap.appendChild(confirmWrap);

    var resultActions = document.createElement('div');
    resultActions.className = 'shot-ai-inline-result-actions';
    var discardBtn = document.createElement('button');
    discardBtn.type = 'button';
    discardBtn.className = 'shot-ai-inline-discard';
    discardBtn.textContent = '放弃';
    discardBtn.onclick = function() {
      resultWrap.style.display = 'none';
      resultArea.value = '';
      genBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>生成';
    };
    var adoptBtn = document.createElement('button');
    adoptBtn.type = 'button';
    adoptBtn.className = 'shot-ai-inline-adopt';
    adoptBtn.textContent = '采纳修改';
    adoptBtn.onclick = function() { confirmWrap.style.display = 'flex'; };
    resultActions.appendChild(discardBtn);
    resultActions.appendChild(adoptBtn);
    resultWrap.appendChild(resultActions);
    panel.appendChild(resultWrap);

    // Now wire up chips to the input
    presets.forEach(function(p) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'shot-ai-inline-chip';
      btn.textContent = p.label;
      btn.onclick = function() {
        input.value = p.text;
        input.focus();
      };
      chipsWrap.appendChild(btn);
    });

    // Insert chips before AI button, switch toolbar to left-align layout
    // AI button (margin-left:auto) stays on the right and acts as toggle
    toolbar.style.justifyContent = 'flex-start';
    if (aiBtn) {
      toolbar.insertBefore(chipsWrap, aiBtn);
    } else {
      toolbar.appendChild(chipsWrap);
    }

    // Generate logic
    var isGenerating = false;
    genBtn.onclick = function() {
      var req = input.value.trim();
      if (!req) { input.focus(); return; }

      isGenerating = true;
      genBtn.style.display = 'none';
      input.style.display = 'none';
      loadingWrap.style.display = 'flex';
      resultWrap.style.display = 'none';

      setTimeout(function() {
        var newPrompt = _mockAiGenerate(_aiState.originalPrompt, req);
        resultArea.value = newPrompt;
        loadingWrap.style.display = 'none';
        resultWrap.style.display = 'block';
        genBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>重新生成';
        genBtn.style.display = '';
        input.style.display = '';
        isGenerating = false;
      }, 10000);
    };

    // Prevent closing while generating
    panel._getIsGenerating = function() { return isGenerating; };

    var _host = toolbar.closest('.prompt-wrap') || toolbar;
    _host.parentNode.insertBefore(panel, _host.nextSibling);
    _lockGenBtn(card, true);
    input.focus();
  }

  /* Close inline panel + restore toolbar */
  function closeAiInline(panel, section) {
    if (!panel || !section) return;
    // Block closing during generation
    if (panel._getIsGenerating && panel._getIsGenerating()) return;

    panel.remove();
    // Restore toolbar: reset AI button, remove temp chips, restore alignment
    var toolbar = section.querySelector('.sb-prompt-toolbar');
    if (toolbar) {
      toolbar.style.justifyContent = '';
      var aiBtn = toolbar.querySelector('.shot-ai-trigger-btn');
      if (aiBtn) {
        aiBtn.classList.remove('active');
        aiBtn.title = '';
      }
      toolbar.querySelectorAll('[data-ai-temp]').forEach(function(el) { el.remove(); });
    }
    _aiState = null;
  }

  /* 关闭面板 */
  function closeAiModifyPanel() {
    document.querySelectorAll('.shot-ai-inline').forEach(function(el) { el.remove(); });
    _aiState = null;
  }

  /* 导出函数到全局 */
  window.openAiModifyPanel = openAiModifyPanel;
  window.closeAiModifyPanel = closeAiModifyPanel;

  /* 本地 Demo：使用透明 textarea + 高亮背景层（保留撤回/光标稳定 + 实时引号高亮） */
  if (window.__LOCAL_DEMO__) {
    _initPromptHighlightOverlay();
  } else {
    _initPromptEnhancements();
  }

  /* DEMO 事件委托：所有 .shot-ai-trigger-btn 点击都打开 AI 面板
     （覆盖动态创建/SPA切换的 section，这些未被 _initPromptEnhancements 处理。
      已有 onclick 的按钮会 stopPropagation，不会重复触发）*/
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.shot-ai-trigger-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    var section = btn.closest('.sb-shot-section');
    var ep = section ? section.getAttribute('data-ep') : '';
    var sid = section ? section.getAttribute('data-sid') : '';
    openAiModifyPanel(ep, sid);
  });

  /* ── 资产详情页 AI 双入口（提示词优化 / 提示词反推） ── */
  // 反推素材词库（从现有资产名派生描述片段）
  var _ASSET_REVERSE_BANK = [
    '22岁女性，棕色微卷长发', '30岁男性，黑色短发，深色西装',
    '北美豪华酒店室内，暖黄色射灯', '现代都市夜景，霓虹灯氛围',
    '电影级写实，35mm 定焦镜头', 'ARRI Alexa 65，高对比度，柯达胶片质感',
    '浅景深，自然光', '冷色调蓝橙对比，情绪张力强'
  ];
  // 从文件名提取可读描述
  function _humanizeFileName(name) {
    var base = String(name || '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    if (!base) return '';
    // Sophia Smith Black White Top → Sophia Smith，黑色白色上衣
    return base;
  }
  // mock：反推图片 → 提示词
  function _mockReversePrompt(fileName) {
    var subject = _humanizeFileName(fileName) || '主体人物';
    var picks = [];
    while (picks.length < 3) {
      var w = _ASSET_REVERSE_BANK[Math.floor(Math.random() * _ASSET_REVERSE_BANK.length)];
      if (picks.indexOf(w) < 0) picks.push(w);
    }
    return '@[' + subject + ']，' + picks[0] + '，穿' + (picks[1].indexOf('女性') >= 0 ? '简约现代服饰' : '商务正装') +
      '。' + picks[1] + '，' + picks[2] + '。【AI 反推 · Demo 模拟结果】';
  }
  // mock：优化提示词
  function _mockAssetPromptOptimize(prompt, request) {
    var req = String(request || '').trim();
    var result = String(prompt || '');
    // 人物类
    if (/发型|发色/.test(req)) {
      result += '\n【发型发色】自然微卷长发，深棕色带浅金挑染，发丝柔顺有光泽，微风轻拂时发梢自然飘动。';
    } else if (/面部|五官|长相/.test(req)) {
      result += '\n【面部特征】五官精致立体，鼻梁高挺，肤色均匀细腻，下颌线条清晰柔和。';
    } else if (/服装|衣服|穿着|材质/.test(req)) {
      result += '\n【服装材质】高定西装面料，细腻羊毛混纺，自然垂坠感，在光线下呈现微妙的哑光质感。';
    } else if (/体态|姿态|姿势|身材/.test(req)) {
      result += '\n【体态姿态】挺拔优雅，肩背舒展，自然站姿微微侧身，手部动作轻柔自然。';
    } else if (/年龄|气质|神韵/.test(req)) {
      result += '\n【年龄气质】约30岁，成熟知性中带着温柔，眼神坚定而有故事感，嘴角微扬带一丝从容。';
    } else if (/表情|神态/.test(req)) {
      result += '\n【表情神韵】微妙的内敛笑容，眼神温柔而深邃，眉宇间透露出沉思与智慧的光芒。';
    // 场景类
    } else if (/光影|光线|照明|打光/.test(req)) {
      result += '\n【光影氛围】主光源从左侧45°斜射，暖金色调，辅以柔和的环境反射光，形成自然的明暗过渡。';
    } else if (/空间|布局|结构/.test(req)) {
      result += '\n【空间布局】纵深构图，前景虚化绿植框边，中景为主体活动区域，远景延伸至窗外城市天际线。';
    } else if (/色彩|色调|配色/.test(req)) {
      result += '\n【色彩基调】主调为暖米色与深棕色，点缀墨绿植物与铜色金属，整体偏暖偏柔和，饱和度克制。';
    } else if (/时间|时段|季节/.test(req)) {
      result += '\n【时间段】黄昏时刻，夕阳余晖透过落地窗洒入，形成长长的投影，天空渐变从暖橙过渡到深蓝。';
    } else if (/天气|气候|环境/.test(req)) {
      result += '\n【天气环境】初秋微凉，薄雾缭绕，空气中有细微的水汽粒子，远处景物略带朦胧感。';
    } else if (/建筑|风格|设计/.test(req)) {
      result += '\n【建筑风格】现代极简主义，大面积玻璃幕墙配以暖色木饰面，线条干净利落，空间通透敞亮。';
    // 道具类
    } else if (/材质|纹理|质感/.test(req)) {
      result += '\n【材质纹理】表面为磨砂金属，微细颗粒感，边缘有轻微做旧痕迹，触感真实可信。';
    } else if (/尺寸|比例|大小/.test(req)) {
      result += '\n【尺寸比例】与场景中其他物品保持真实比例关系，约手掌大小，在构图中作为点缀焦点。';
    } else if (/新旧|磨损|使用/.test(req)) {
      result += '\n【新旧程度】正常使用痕迹，边角有细微磨损露出底材色，表面保持整洁但不过于崭新。';
    } else if (/颜色|光泽|色泽/.test(req)) {
      result += '\n【颜色光泽】深琥珀色主体，表面有自然的高光反射，边缘处呈现渐变透明度，晶莹剔透。';
    } else if (/细节|装饰|花纹/.test(req)) {
      result += '\n【细节装饰】边缘雕刻精细回纹，镶嵌微小的金属铆钉，表面蚀刻细腻的几何图案。';
    } else if (/使用|状态|摆放/.test(req)) {
      result += '\n【使用状态】半开启状态，内部物品隐约可见，自然放置于桌面一侧，姿态符合日常使用习惯。';
    // 通用
    } else if (req) {
      result += '\n【AI 根据「' + req + '」优化 · Demo 模拟】';
    } else {
      result += '\n【AI 优化 · Demo 模拟】增强了画面细节与真实感。';
    }
    return result;
  }

  // 在资产 card 的 prompt textarea 内右下角注入 AI 工具栏（竖线分隔，背景同文本框）
  function _injectAssetAiToolbar(card) {
    if (!card || card.querySelector('.asset-ai-toolbar')) return;
    if (card.classList.contains('ad-expanded')) return;   // 已重组为详情态：按钮已并入工具栏，跳过
    var ta = card.querySelector('textarea[data-field="prompt"]');
    if (!ta) return;
    // 包裹 textarea 在 .prompt-wrap（relative 容器）
    var wrap = ta.parentNode.classList.contains('prompt-wrap') ? ta.parentNode : null;
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'prompt-wrap';
      ta.parentNode.insertBefore(wrap, ta);
      wrap.appendChild(ta);
    }
    var toolbar = document.createElement('div');
    toolbar.className = 'asset-ai-toolbar';
    toolbar.innerHTML =
      '<button type="button" class="asset-ai-btn asset-ai-optimize-btn" title="AI 润色优化当前提示词">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 3l2.1 5.6L20 11l-5.9 2.4L12 19l-2.1-5.6L4 11l5.9-2.4z"/></svg>提示词优化</button>' +
      '<span class="asset-ai-divider"></span>' +
      '<button type="button" class="asset-ai-btn asset-ai-btn--reverse asset-ai-reverse-btn" title="上传图片，AI 反推描述提示词">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="M21 16l-5-5L5 19"/></svg>提示词反推</button>';
    wrap.appendChild(toolbar);
  }

  // AI 面板打开期间隐藏生图按钮 + 参数配置（防误操作）
  function _lockGenBtn(card, on){
    if(!card) return;
    var genBtn = card.querySelector('button[onclick*="genOneAsset"]');
    var params = card.querySelector('.params-display');
    [genBtn, params].forEach(function(el){
      if(!el) return;
      el.style.display = on ? 'none' : '';
    });
  }

  // 初始化：遍历所有资产 card 注入工具栏
  function _initAssetAiToolbars() {
    document.querySelectorAll('.asset-card').forEach(_injectAssetAiToolbar);
  }

  // 打开「提示词优化」面板
  // 提示词优化弹窗（复刻视频生成 openVGOptimizePanel：左右对照 + 下方输入/快捷指令/生成/采纳/放弃）
  function openAssetOptimizeModal(card) {
    if (!card) return;
    var ta = card.querySelector('textarea[data-field="prompt"]');
    var origText = ta ? ta.value : '';
    var kind = card.getAttribute('data-kind') || 'characters';
    var chipsDef = {
      characters: [
        {label:'发型发色', prompt:'请详细描述该人物的发型和发色，包括发质、长度、颜色深浅、光泽度、造型特点以及与角色气质的匹配关系。'},
        {label:'面部特征', prompt:'请细化该人物的面部特征，包括脸型、五官比例、肤色质感、眉眼唇形等关键特征，增强辨识度。'},
        {label:'服装材质', prompt:'请描述该人物的服装款式与面料材质，包括剪裁轮廓、面料质感、垂坠感、色彩搭配以及光线下呈现的效果。'},
        {label:'体态姿态', prompt:'请优化人物的体态和姿态描述，包括身高体型、站姿或坐姿特点、肢体语言的表达，使角色更有存在感。'},
        {label:'年龄气质', prompt:'请补充该人物的年龄范围与整体气质，包括成熟度、精神面貌、气场类型（温柔/干练/威严/亲和等）。'},
        {label:'表情神韵', prompt:'请细化人物的表情和眼神描写，包括目光方向、微表情、情绪传达，使角色更有故事感和感染力。'}
      ],
      scenes: [
        {label:'光影氛围', prompt:'请优化场景的光影氛围，描述光源方向、主光源色温、阴影软硬程度、整体明暗对比和情绪基调。'},
        {label:'空间布局', prompt:'请描述场景的空间结构和构图布局，包括景深层次、前景中景远景关系、主要视觉动线和画面重心。'},
        {label:'色彩基调', prompt:'请确定场景的整体色彩方案，包括主色调、辅助色、点缀色、色彩饱和度和冷暖倾向。'},
        {label:'时间段', prompt:'请明确场景所处的时间段，包括具体时刻、光线特征（晨曦/正午/黄昏/夜晚）、对应的色温变化。'},
        {label:'天气环境', prompt:'请描述场景的天气条件和自然环境，包括天空状态、能见度、空气中粒子（雾气/尘埃/雨雪）的视觉影响。'},
        {label:'建筑风格', prompt:'请细化场景的建筑或空间风格，包括建筑类型、设计流派、主要材料、装饰细节和时代特征。'}
      ],
      props: [
        {label:'材质纹理', prompt:'请描述该道具的表面材质和纹理细节，包括材料类型（金属/木质/陶瓷/织物等）、触感特征和视觉纹理。'},
        {label:'尺寸比例', prompt:'请补充该道具的尺寸和与周围物品的比例关系，使其在场景中的大小关系真实可信。'},
        {label:'新旧程度', prompt:'请描述该道具的使用痕迹和新旧状态，包括磨损程度、氧化效果、划痕或光泽变化等岁月痕迹。'},
        {label:'颜色光泽', prompt:'请细化该道具的颜色和表面光泽，包括固有色、高光反射强度、透明度或半透明效果、金属反光等。'},
        {label:'细节装饰', prompt:'请补充该道具的装饰细节，包括雕刻纹样、镶嵌工艺、铭文或图案、边缘处理等精致元素。'},
        {label:'使用状态', prompt:'请描述该道具当前的使用状态，包括摆放方式、开启/闭合程度、与周围物体的交互关系。'}
      ]
    };
    var chips = chipsDef[kind] || chipsDef['characters'];

    var modal = document.getElementById('asset-optimize-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'asset-optimize-modal';
      modal.style.cssText = 'position:fixed;inset:0;z-index:300;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.6)';
      var cardEl = document.createElement('div');
      var cw = Math.min(1100, window.innerWidth - 40) + 'px';
      var ch = (window.innerHeight - 40) + 'px';
      cardEl.style.cssText = 'position:relative;width:'+cw+';height:'+ch+';max-height:'+ch+';background:var(--bg2);border:1px solid var(--bd);border-radius:12px;display:flex;flex-direction:column;overflow:hidden';
      var hd = document.createElement('div');
      hd.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:18px 24px 14px;border-bottom:1px solid var(--bd);flex-shrink:0';
      hd.innerHTML = '<h3 style="font-size:16px;font-weight:600;color:var(--t1);margin:0">提示词优化</h3><button type="button" class="asset-opt-close" style="background:none;border:none;color:var(--t3);font-size:18px;cursor:pointer;padding:4px 10px;border-radius:6px">✕</button>';
      cardEl.appendChild(hd);
      var cmp = document.createElement('div');
      cmp.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:18px 24px 14px;flex:1 1 auto;min-height:0;overflow:hidden;grid-template-rows:1fr';
      var colL = document.createElement('div'); colL.style.cssText = 'display:flex;flex-direction:column;gap:8px;min-height:0';
      colL.innerHTML = '<div style="font-size:12px;font-weight:600;color:var(--t3)">原始提示词</div><textarea readonly style="flex:1 1 auto;min-height:140px;background:var(--bg1);border:1px solid var(--bd);border-radius:8px;color:var(--t1);font-size:13px;padding:12px 14px;resize:none;font-family:inherit;line-height:1.7;overflow-y:auto"></textarea>';
      var colR = document.createElement('div'); colR.style.cssText = 'display:flex;flex-direction:column;gap:8px;min-height:0;flex:1 1 auto';
      colR.innerHTML = '<div style="font-size:12px;font-weight:600;color:var(--t3)">优化结果</div><div class="asset-opt-result-wrap" style="display:none;flex:1 1 auto;min-height:0"><textarea readonly style="flex:1 1 auto;min-height:140px;background:var(--bg1);border:1px solid var(--bd);border-radius:8px;color:var(--t1);font-size:13px;padding:12px 14px;resize:none;font-family:inherit;line-height:1.7;overflow-y:auto;min-height:0"></textarea></div>';
      cmp.appendChild(colL); cmp.appendChild(colR);
      cardEl.appendChild(cmp);
      var ft = document.createElement('div');
      ft.style.cssText = 'padding:14px 24px 18px;border-top:1px solid var(--bd);flex-shrink:0;display:flex;flex-direction:column;gap:10px';
      ft.innerHTML =
        '<textarea class="asset-opt-input" placeholder="描述优化需求，或点下方快捷指令…" rows="2" style="width:100%;background:var(--bg1);border:1px solid var(--bd);border-radius:8px;color:var(--t1);font-size:13px;padding:10px 14px;font-family:inherit;resize:none;min-height:52px;max-height:84px"></textarea>' +
        '<div class="asset-opt-chips" style="display:flex;gap:6px;flex-wrap:wrap"></div>' +
        '<div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;min-height:36px">' +
          '<span class="asset-opt-loading" style="font-size:13px;color:var(--t3);display:none;align-items:center;gap:8px"><span class="asset-ai-spin"></span>AI 优化中…</span>' +
          '<div class="asset-opt-complete" style="display:none;gap:8px">' +
            '<button type="button" class="asset-opt-discard" style="background:transparent;border:1px solid var(--bd);color:var(--t2);padding:8px 20px;border-radius:8px;font-size:13px;cursor:pointer">放弃</button>' +
            '<button type="button" class="asset-opt-adopt" style="background:rgba(255,255,255,0.12);color:var(--t1);font-weight:600;border:1px solid rgba(255,255,255,0.22);padding:8px 20px;border-radius:8px;font-size:13px;cursor:pointer">采纳</button>' +
          '</div>' +
          '<button type="button" class="asset-opt-gen b gen-btn" style="margin:0"></button>' +
        '</div>';
      cardEl.appendChild(ft);
      modal.appendChild(cardEl);
      document.body.appendChild(modal);
      modal.querySelector('.asset-opt-close').onclick = function () { modal.style.display = 'none'; };
      modal.addEventListener('click', function (ev) { if (ev.target === modal) modal.style.display = 'none'; });
    }

    // 重置内容
    modal.querySelectorAll('textarea')[0].value = origText;   // 原始提示词（第一个 textarea）
    var input = modal.querySelector('.asset-opt-input');
    input.value = '';
    var resultWrap = modal.querySelector('.asset-opt-result-wrap');
    resultWrap.style.display = 'none';
    resultWrap.querySelector('textarea').value = '';
    modal.querySelector('.asset-opt-loading').style.display = 'none';
    modal.querySelector('.asset-opt-complete').style.display = 'none';
    var genBtn = modal.querySelector('.asset-opt-gen');
    genBtn.style.display = '';
    genBtn.disabled = true;
    if (typeof _GEN_ICON !== 'undefined') genBtn.innerHTML = _GEN_ICON + '<span class="gen-score">1</span>生成';
    else genBtn.textContent = '生成';

    // 快捷指令
    var chipsEl = modal.querySelector('.asset-opt-chips');
    chipsEl.innerHTML = '';
    chipsEl.style.display = 'flex';
    chips.forEach(function (c) {
      var ch = document.createElement('span');
      ch.style.cssText = 'font-size:12px;padding:5px 12px;border-radius:18px;border:1px solid var(--bd);background:var(--bg1);color:var(--t2);cursor:pointer';
      ch.textContent = c.label;
      ch.onclick = function () { input.value = c.prompt; genBtn.disabled = false; };
      chipsEl.appendChild(ch);
    });

    genBtn.onclick = function () {
      var req = input.value.trim();
      if (!req) return;
      modal.querySelector('.asset-opt-loading').style.display = 'flex';
      chipsEl.style.display = 'none';
      genBtn.style.display = 'none';
      genBtn.disabled = true;
      setTimeout(function () {
        var result = typeof _mockAssetPromptOptimize === 'function' ? _mockAssetPromptOptimize(origText, req) : (origText + '\n\n[optimized: ' + req + ']');
        resultWrap.querySelector('textarea').value = result;
        resultWrap.style.display = 'flex';
        modal.querySelector('.asset-opt-loading').style.display = 'none';
        modal.querySelector('.asset-opt-complete').style.display = 'flex';
      }, 900);
    };
    input.oninput = function () { genBtn.disabled = !input.value.trim(); };
    modal.querySelector('.asset-opt-discard').onclick = function () {
      resultWrap.style.display = 'none'; resultWrap.querySelector('textarea').value = '';
      modal.querySelector('.asset-opt-complete').style.display = 'none';
      chipsEl.style.display = 'flex'; genBtn.style.display = ''; genBtn.disabled = !input.value.trim();
    };
    modal.querySelector('.asset-opt-adopt').onclick = function () {
      var result = resultWrap.querySelector('textarea').value;
      if (ta && result) { ta.value = result; ta.dispatchEvent(new Event('input', { bubbles: true })); }
      modal.style.display = 'none';
    };

    modal.style.display = 'flex';
  }
  window.openAssetOptimizeModal = openAssetOptimizeModal;

  // 提示词反推弹窗（上传图 → AI 反推描述 → 采纳/放弃）
  function openAssetReverseModal(card) {
    if (!card) return;
    var ta = card.querySelector('textarea[data-field="prompt"]');
    var modal = document.getElementById('asset-reverse-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'asset-reverse-modal';
      modal.style.cssText = 'position:fixed;inset:0;z-index:300;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.6)';
      var cardEl = document.createElement('div');
      cardEl.style.cssText = 'position:relative;width:min(560px,'+(window.innerWidth-40)+'px);max-height:'+(window.innerHeight-40)+'px;background:var(--bg2);border:1px solid var(--bd);border-radius:12px;display:flex;flex-direction:column;overflow:hidden';
      var hd = document.createElement('div');
      hd.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:18px 24px 14px;border-bottom:1px solid var(--bd);flex-shrink:0';
      hd.innerHTML = '<h3 style="font-size:16px;font-weight:600;color:var(--t1);margin:0">提示词反推</h3><button type="button" class="asset-rev-close" style="background:none;border:none;color:var(--t3);font-size:18px;cursor:pointer;padding:4px 10px;border-radius:6px">✕</button>';
      cardEl.appendChild(hd);
      var body = document.createElement('div');
      body.style.cssText = 'padding:20px 24px;flex:1 1 auto;overflow-y:auto;display:flex;flex-direction:column;gap:14px';
      body.innerHTML =
        '<div class="asset-rev-drop" style="border:1.5px dashed var(--bd);border-radius:10px;padding:32px 16px;text-align:center;color:var(--t3);font-size:13px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px">' +
          '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>' +
          '点击或拖入图片，AI 将反推描述提示词<input type="file" accept="image/*" hidden>' +
        '</div>' +
        '<div class="asset-rev-loading" style="font-size:13px;color:var(--t3);display:none;align-items:center;gap:8px"><span class="asset-ai-spin"></span>AI 正在分析图片…</div>' +
        '<div class="asset-rev-result" style="display:none;flex-direction:column;gap:10px">' +
          '<div style="font-size:12px;font-weight:600;color:var(--t3)">AI 反推提示词</div>' +
          '<textarea class="asset-rev-result-ta" readonly style="min-height:140px;background:var(--bg1);border:1px solid var(--bd);border-radius:8px;color:var(--t1);font-size:13px;padding:12px 14px;resize:none;font-family:inherit;line-height:1.7"></textarea>' +
        '</div>';
      cardEl.appendChild(body);
      var ft = document.createElement('div');
      ft.style.cssText = 'padding:14px 24px 18px;border-top:1px solid var(--bd);flex-shrink:0;display:flex;justify-content:flex-end;gap:10px';
      ft.innerHTML =
        '<div class="asset-rev-complete" style="display:none;gap:8px">' +
          '<button type="button" class="asset-rev-discard" style="background:transparent;border:1px solid var(--bd);color:var(--t2);padding:8px 20px;border-radius:8px;font-size:13px;cursor:pointer">放弃</button>' +
          '<button type="button" class="asset-rev-adopt" style="background:rgba(255,255,255,0.12);color:var(--t1);font-weight:600;border:1px solid rgba(255,255,255,0.22);padding:8px 20px;border-radius:8px;font-size:13px;cursor:pointer">采纳</button>' +
        '</div>' +
        '<button type="button" class="asset-rev-gen b gen-btn" style="margin:0;display:none"></button>';
      cardEl.appendChild(ft);
      modal.appendChild(cardEl);
      document.body.appendChild(modal);
      modal.querySelector('.asset-rev-close').onclick = function () { modal.style.display = 'none'; };
      modal.addEventListener('click', function (ev) { if (ev.target === modal) modal.style.display = 'none'; });
    }

    // 重置
    var drop = modal.querySelector('.asset-rev-drop');
    var fileInput = modal.querySelector('input[type="file"]');
    var loading = modal.querySelector('.asset-rev-loading');
    var result = modal.querySelector('.asset-rev-result');
    var resultTa = modal.querySelector('.asset-rev-result-ta');
    var genBtn = modal.querySelector('.asset-rev-gen');
    var complete = modal.querySelector('.asset-rev-complete');
    drop.style.display = 'flex'; drop.innerHTML = drop.innerHTML.replace(/<img[^>]*>/, '');   // 还原上传区
    // 重建上传区（保证干净）
    drop.outerHTML = '<div class="asset-rev-drop" style="border:1.5px dashed var(--bd);border-radius:10px;padding:32px 16px;text-align:center;color:var(--t3);font-size:13px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>点击或拖入图片，AI 将反推描述提示词<input type="file" accept="image/*" hidden></div>';
    drop = modal.querySelector('.asset-rev-drop');
    fileInput = modal.querySelector('input[type="file"]');
    loading.style.display = 'none'; result.style.display = 'none'; complete.style.display = 'none'; genBtn.style.display = 'none';
    resultTa.value = '';
    if (typeof _GEN_ICON !== 'undefined') genBtn.innerHTML = _GEN_ICON + '<span class="gen-score">1</span>分析图片'; else genBtn.textContent = '分析图片';

    var curName = '';
    function handleFile(file) {
      if (!file) return;
      curName = file.name;
      var reader = new FileReader();
      reader.onload = function (ev) {
        drop.innerHTML = '<img src="' + ev.target.result + '" alt="预览" style="max-width:100%;max-height:200px;border-radius:8px"><button type="button" class="asset-rev-clear" style="margin-top:8px;background:transparent;border:1px solid var(--bd);color:var(--t2);padding:6px 14px;border-radius:6px;font-size:12px;cursor:pointer">重新选择</button>';
        genBtn.style.display = '';
        drop.querySelector('.asset-rev-clear').onclick = function () { openAssetReverseModal(card); };
      };
      reader.readAsDataURL(file);
    }
    drop.onclick = function () { fileInput.click(); };
    fileInput.onchange = function () { handleFile(this.files[0]); this.value = ''; };
    drop.ondragover = function (e) { e.preventDefault(); drop.style.borderColor = 'var(--brand-green, #00DA5A)'; };
    drop.ondragleave = function () { drop.style.borderColor = ''; };
    drop.ondrop = function (e) { e.preventDefault(); drop.style.borderColor = ''; if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); };

    genBtn.onclick = function () {
      loading.style.display = 'flex'; result.style.display = 'none'; genBtn.style.display = 'none';
      setTimeout(function () {
        loading.style.display = 'none';
        resultTa.value = (typeof _mockReversePrompt === 'function' ? _mockReversePrompt(curName) : '[反推描述]');
        result.style.display = 'flex'; complete.style.display = 'flex';
      }, 900);
    };
    modal.querySelector('.asset-rev-discard').onclick = function () { result.style.display = 'none'; complete.style.display = 'none'; genBtn.style.display = ''; };
    modal.querySelector('.asset-rev-adopt').onclick = function () {
      if (ta && resultTa.value) { ta.value = resultTa.value; ta.dispatchEvent(new Event('input', { bubbles: true })); }
      modal.style.display = 'none';
    };

    modal.style.display = 'flex';
  }
  window.openAssetReverseModal = openAssetReverseModal;

  function _openAssetOptimizePanel(card) {
    var toolbar = card.querySelector('.asset-ai-toolbar');
    if (!toolbar) return;
    var existing = card.querySelector('.asset-ai-panel--optimize');
    if (existing) { existing.remove(); _resetToolbarActive(card); _lockGenBtn(card, false); return; }
    // 移除反推面板
    var rev = card.querySelector('.asset-ai-panel--reverse');
    if (rev) rev.remove();
    _resetToolbarActive(card);
    card.querySelector('.asset-ai-optimize-btn').classList.add('active');

    var ta = card.querySelector('textarea[data-field="prompt"]');
    var kind = card.getAttribute('data-kind') || '';

    // 按资产类型的快捷指令：短标签 + 长指令映射
    var chipsDef = {
      characters: [
        {label:'发型发色', prompt:'请详细描述该人物的发型和发色，包括发质、长度、颜色深浅、光泽度、造型特点以及与角色气质的匹配关系。'},
        {label:'面部特征', prompt:'请细化该人物的面部特征，包括脸型、五官比例、肤色质感、眉眼唇形等关键特征，增强辨识度。'},
        {label:'服装材质', prompt:'请描述该人物的服装款式与面料材质，包括剪裁轮廓、面料质感、垂坠感、色彩搭配以及光线下呈现的效果。'},
        {label:'体态姿态', prompt:'请优化人物的体态和姿态描述，包括身高体型、站姿或坐姿特点、肢体语言的表达，使角色更有存在感。'},
        {label:'年龄气质', prompt:'请补充该人物的年龄范围与整体气质，包括成熟度、精神面貌、气场类型（温柔/干练/威严/亲和等）。'},
        {label:'表情神韵', prompt:'请细化人物的表情和眼神描写，包括目光方向、微表情、情绪传达，使角色更有故事感和感染力。'}
      ],
      scenes: [
        {label:'光影氛围', prompt:'请优化场景的光影氛围，描述光源方向、主光源色温、阴影软硬程度、整体明暗对比和情绪基调。'},
        {label:'空间布局', prompt:'请描述场景的空间结构和构图布局，包括景深层次、前景中景远景关系、主要视觉动线和画面重心。'},
        {label:'色彩基调', prompt:'请确定场景的整体色彩方案，包括主色调、辅助色、点缀色、色彩饱和度和冷暖倾向。'},
        {label:'时间段', prompt:'请明确场景所处的时间段，包括具体时刻、光线特征（晨曦/正午/黄昏/夜晚）、对应的色温变化。'},
        {label:'天气环境', prompt:'请描述场景的天气条件和自然环境，包括天空状态、能见度、空气中粒子（雾气/尘埃/雨雪）的视觉影响。'},
        {label:'建筑风格', prompt:'请细化场景的建筑或空间风格，包括建筑类型、设计流派、主要材料、装饰细节和时代特征。'}
      ],
      props: [
        {label:'材质纹理', prompt:'请描述该道具的表面材质和纹理细节，包括材料类型（金属/木质/陶瓷/织物等）、触感特征和视觉纹理。'},
        {label:'尺寸比例', prompt:'请补充该道具的尺寸和与周围物品的比例关系，使其在场景中的大小关系真实可信。'},
        {label:'新旧程度', prompt:'请描述该道具的使用痕迹和新旧状态，包括磨损程度、氧化效果、划痕或光泽变化等岁月痕迹。'},
        {label:'颜色光泽', prompt:'请细化该道具的颜色和表面光泽，包括固有色、高光反射强度、透明度或半透明效果、金属反光等。'},
        {label:'细节装饰', prompt:'请补充该道具的装饰细节，包括雕刻纹样、镶嵌工艺、铭文或图案、边缘处理等精致元素。'},
        {label:'使用状态', prompt:'请描述该道具当前的使用状态，包括摆放方式、开启/闭合程度、与周围物体的交互关系。'}
      ]
    };
    var chips = chipsDef[kind] || chipsDef['characters'];
    var chipsHtml = chips.map(function(c) { return '<span class="asset-ai-chip" data-prompt="' + c.prompt.replace(/"/g, '&quot;') + '">' + c.label + '</span>'; }).join('');

    var panel = document.createElement('div');
    panel.className = 'asset-ai-panel asset-ai-panel--optimize';
    panel.innerHTML =
      '<div class="asset-ai-panel-row">' +
        '<textarea class="asset-ai-panel-input" placeholder="描述优化需求，或点下方快捷指令…"></textarea>' +
      '</div>' +
      '<div class="asset-ai-panel-row asset-ai-panel-row--chips" data-chips>' +
        chipsHtml +
        '<button type="button" class="asset-ai-panel-gen">' + (typeof _BEAN_ICON !== 'undefined' ? _BEAN_ICON : '') + '<span class="gen-score">1</span>生成</button>' +
      '</div>' +
      '<div class="asset-ai-loading" hidden><span class="asset-ai-spin"></span>AI 正在优化提示词…</div>' +
      '<div class="asset-ai-result-wrap" hidden>' +
        '<div class="asset-ai-result-hint">AI 优化结果</div>' +
        '<textarea class="asset-ai-result"></textarea>' +
        '<div class="asset-ai-result-actions">' +
          '<button type="button" class="asset-ai-discard">放弃</button>' +
          '<button type="button" class="asset-ai-adopt">采纳</button>' +
        '</div>' +
      '</div>';
    var _host = toolbar.closest('.prompt-wrap') || toolbar;
    _host.parentNode.insertBefore(panel, _host.nextSibling);
    _lockGenBtn(card, true);

    var input = panel.querySelector('.asset-ai-panel-input');
    var genBtn = panel.querySelector('.asset-ai-panel-gen');
    var loading = panel.querySelector('.asset-ai-loading');
    var resultWrap = panel.querySelector('.asset-ai-result-wrap');
    var resultTa = panel.querySelector('.asset-ai-result');

    function _syncGenEnabled(){ genBtn.disabled = !input.value.trim(); }
    _syncGenEnabled();
    input.addEventListener('input', _syncGenEnabled);

    panel.querySelectorAll('.asset-ai-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var promptText = chip.getAttribute('data-prompt') || chip.textContent;
        input.value = promptText;
        _syncGenEnabled();
        input.focus();
      });
    });
    genBtn.addEventListener('click', function () {
      var req = input.value.trim();
      if (!req) { toast('请输入或选择优化需求', true); return; }
      loading.hidden = false; resultWrap.hidden = true; genBtn.disabled = true;
      setTimeout(function () {
        loading.hidden = true;
        resultTa.value = _mockAssetPromptOptimize(ta ? ta.value : '', req);
        resultWrap.hidden = false;
        genBtn.disabled = false;
      }, 800);
    });
    panel.querySelector('.asset-ai-discard').addEventListener('click', function () {
      resultWrap.hidden = true; resultTa.value = '';
    });
    panel.querySelector('.asset-ai-adopt').addEventListener('click', function () {
      if (ta && resultTa.value) {
        ta.value = resultTa.value; ta.dispatchEvent(new Event('input', { bubbles: true }));
        _demoAddAssetHistory(card, resultTa.value);
        toast('已采纳优化结果（已添加历史版本）', false);
      }
      panel.remove(); _resetToolbarActive(card); _lockGenBtn(card, false);
    });
  }

  // 打开「提示词反推」面板
  function _openAssetReversePanel(card) {
    var toolbar = card.querySelector('.asset-ai-toolbar');
    if (!toolbar) return;
    var existing = card.querySelector('.asset-ai-panel--reverse');
    if (existing) { existing.remove(); _resetToolbarActive(card); _lockGenBtn(card, false); return; }
    var opt = card.querySelector('.asset-ai-panel--optimize');
    if (opt) opt.remove();
    _resetToolbarActive(card);
    card.querySelector('.asset-ai-reverse-btn').classList.add('active');

    var ta = card.querySelector('textarea[data-field="prompt"]');
    var panel = document.createElement('div');
    panel.className = 'asset-ai-panel asset-ai-panel--reverse';
    panel.innerHTML =
      '<div class="asset-ai-reverse-drop">' +
        '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>' +
        '点击或拖入图片，AI 将反推描述提示词' +
        '<input type="file" accept="image/*" hidden>' +
      '</div>' +
      '<div class="asset-ai-loading" hidden><span class="asset-ai-spin"></span>AI 正在分析图片…</div>' +
      '<div class="asset-ai-result-wrap" hidden>' +
        '<div class="asset-ai-result-hint">AI 反推提示词</div>' +
        '<textarea class="asset-ai-result"></textarea>' +
        '<div class="asset-ai-result-actions">' +
          '<button type="button" class="asset-ai-discard">放弃</button>' +
          '<button type="button" class="asset-ai-adopt">采纳</button>' +
        '</div>' +
      '</div>';
    var _host = toolbar.closest('.prompt-wrap') || toolbar;
    _host.parentNode.insertBefore(panel, _host.nextSibling);
    _lockGenBtn(card, true);

    var drop = panel.querySelector('.asset-ai-reverse-drop');
    var fileInput = panel.querySelector('input[type="file"]');
    var loading = panel.querySelector('.asset-ai-loading');
    var resultWrap = panel.querySelector('.asset-ai-result-wrap');
    var resultTa = panel.querySelector('.asset-ai-result');
    var curName = '';

    function handleFile(file) {
      if (!file) return;
      curName = file.name;
      var reader = new FileReader();
      reader.onload = function (ev) {
        // 预览替换上传区
        drop.outerHTML =
          '<div class="asset-ai-reverse-preview">' +
            '<img src="' + ev.target.result + '" alt="预览" />' +
            '<button type="button" class="asset-ai-reverse-preview-clear" title="重新选择">✕</button>' +
            '<button type="button" class="asset-ai-panel-gen" style="margin:8px;">' + (typeof _BEAN_ICON !== 'undefined' ? _BEAN_ICON : '') + '<span class="gen-score">1</span>分析图片</button>' +
          '</div>';
        // 重新绑定
        var preview = panel.querySelector('.asset-ai-reverse-preview');
        preview.querySelector('.asset-ai-reverse-preview-clear').addEventListener('click', function () {
          _openAssetReversePanel(card); // 重新打开重置
          var p2 = card.querySelector('.asset-ai-panel--reverse');
          if (p2) p2.querySelector('.asset-ai-loading').hidden = true;
        });
        preview.querySelector('.asset-ai-panel-gen').addEventListener('click', function () {
          loading.hidden = false; resultWrap.hidden = true;
          setTimeout(function () {
            loading.hidden = true;
            resultTa.value = _mockReversePrompt(curName);
            resultWrap.hidden = false;
          }, 900);
        });
      };
      reader.readAsDataURL(file);
    }

    drop.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () { handleFile(this.files[0]); this.value = ''; });
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.style.borderColor = 'var(--brand-green)'; });
    drop.addEventListener('dragleave', function () { drop.style.borderColor = ''; });
    drop.addEventListener('drop', function (e) {
      e.preventDefault(); drop.style.borderColor = '';
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
    panel.querySelector('.asset-ai-discard').addEventListener('click', function () { resultWrap.hidden = true; });
    panel.querySelector('.asset-ai-adopt').addEventListener('click', function () {
      if (ta && resultTa.value) {
        ta.value = resultTa.value; ta.dispatchEvent(new Event('input', { bubbles: true }));
        _demoAddAssetHistory(card, resultTa.value);
        toast('已采纳反推结果（已添加历史版本）', false);
      }
      panel.remove(); _resetToolbarActive(card); _lockGenBtn(card, false);
    });
  }

  function _resetToolbarActive(card) {
    card.querySelectorAll('.asset-ai-btn').forEach(function (b) { b.classList.remove('active'); });
  }

  // 文档级事件委托
  document.addEventListener('click', function (e) {
    var optBtn = e.target.closest('.asset-ai-optimize-btn');
    if (optBtn) { e.preventDefault(); var card = optBtn.closest('.asset-card'); if (card) openAssetOptimizeModal(card); return; }
    var revBtn = e.target.closest('.asset-ai-reverse-btn');
    if (revBtn) { e.preventDefault(); var card2 = revBtn.closest('.asset-card'); if (card2) openAssetReverseModal(card2); return; }
  });


  // 暴露 + 初始化
  window._initAssetAiToolbars = _initAssetAiToolbars;
  // DOM 就绪后注入（也覆盖 openAssetEdit 移动 card 后的场景）
  function _assetAiInitWhenReady() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _initAssetAiToolbars);
    } else {
      _initAssetAiToolbars();
    }
  }
  _assetAiInitWhenReady();
  // 原生 patch openAssetEdit：移动 card 后确保工具栏存在
  var _origOpenAssetEdit = window.openAssetEdit;
  if (typeof _origOpenAssetEdit === 'function') {
    window.openAssetEdit = function (kind, aid, baseId) {
      var r = _origOpenAssetEdit.apply(this, arguments);
      setTimeout(function () {
        var card = document.getElementById(kind + '-edit-container') &&
          document.querySelector('#' + kind + '-edit-container .asset-card');
        if (card) _injectAssetAiToolbar(card);
      }, 50);
      return r;
    };
  }


  (function _addPlaceholderEpisodes() {
    var epList = document.querySelector('.sb-ep-list');
    if (!epList) return;
    var existing = epList.querySelectorAll('.sb-ep-item-row').length;
    for (var i = existing + 1; i <= 65; i++) {
      var row = document.createElement('div');
      row.className = 'sb-ep-item-row';
      row.setAttribute('data-ep-row', String(i));
      var segs = 8 + (i * 7 + 3) % 12;
      row.innerHTML = '<a class="sb-ep-item" data-ep="' + i + '">' +
        '<span class="sb-ep-mainline"><span class="sb-ep-title">第' + i + '集</span><span class="sb-ep-count">' + segs + ' 段</span></span>' +
        '<span class="sb-ep-subline"><span class="sb-ep-progress-text" data-ep-progress="' + i + '">0/' + segs + '</span>' +
        '<span class="sb-ep-status-badge" data-ep-status="' + i + '">待处理</span></span>' +
        '</a>' +
        '<button type="button" class="b bs sb-ep-generate-btn" data-ep-generate="' + i + '">生成</button>';
      epList.appendChild(row);
    }
  })();

  // ─────────────────────────────────────────────────────────────────────────

  // 跟踪正在改编的集数（支持多集并发）
  var adaptEpRunning = false; // 全集/继续改编标志
  var runningEpisodes = new Set(); // 正在改编的单集集数

  async function adaptEp(ep, options) {
    // options: { continueAdapt: bool, allEpisodes: bool, requirements: string, maxWorkers: number }
    options = options || {};
    if (options.requirements == null) {
      options.requirements = getAdaptRequirements();
    }

    // 单集改编时验证集数
    if (!options.continueAdapt && !options.allEpisodes) {
      ep = parseInt(ep, 10);
      if (!Number.isFinite(ep) || ep < 1) {
        toast("无效集数", true);
        return;
      }

      // 检查该集是否已在改编中
      if (runningEpisodes.has(ep)) {
        toast(`第${ep}集正在改编中，请稍候…`, true);
        return;
      }
    }

    // 全集/继续改编时检查全局标志
    if ((options.continueAdapt || options.allEpisodes) && adaptEpRunning) {
      toast("改编任务进行中，请稍候…", true);
      return;
    }

    var sel = ".ast-sb-adapt-btn";
    var nodes = document.querySelectorAll(sel);
    var busyTr = !options.continueAdapt && !options.allEpisodes
      ? document.querySelector('.ast-sb-tr[data-ep="' + String(ep) + '"]')
      : null;

    // 标记任务运行状态
    if (options.continueAdapt || options.allEpisodes) {
      adaptEpRunning = true;
    } else {
      runningEpisodes.add(ep);
    }
    setAdaptRequirementsLocked(true);

    nodes.forEach(function (b) {
      var bEp = b.getAttribute("data-ep");

      if (!options.continueAdapt && !options.allEpisodes) {
        // 单集改编：只禁用和标记当前集按钮，其他集保持可点击
        if (bEp != null && String(bEp).trim() !== "" && parseInt(bEp, 10) === ep) {
          b.setAttribute("data-adapt-restore-disabled", b.disabled ? "1" : "0");
          b.setAttribute("data-adapt-restore-text", b.textContent);
          b.disabled = true;
          b.textContent = "进行中…";
          b.classList.add("ast-sb-adapt-btn--busy");
          b.setAttribute("aria-busy", "true");
        }
        // 其他集不做任何处理，保持可点击状态
      } else {
        // 全集/继续改编：禁用所有按钮
        b.setAttribute("data-adapt-restore-disabled", b.disabled ? "1" : "0");
        b.setAttribute("data-adapt-restore-text", b.textContent);
        b.disabled = true;
        b.classList.add("ast-sb-adapt-btn--disabled");
      }
    });
    if (busyTr) {
      busyTr.classList.add("ast-sb-tr--adapt-busy");
      busyTr.querySelectorAll(".ast-sb-gen-btn").forEach(function (g) {
        g.setAttribute("data-adapt-restore-disabled", g.disabled ? "1" : "0");
        g.disabled = true;
      });
    }

    // 确定任务描述
    var taskDesc = "改编中";
    if (options.continueAdapt) {
      taskDesc = "继续改编未完成剧集";
    } else if (options.allEpisodes) {
      taskDesc = "改编全部剧集";
    } else {
      taskDesc = "改编第" + ep + "集";
    }

    const poller = new TaskPoller(PID);
    poller.start({
      onProgress: (progress, message) => {
        if (!options.continueAdapt && !options.allEpisodes) {
          // 单集改编：使用集数生成专属的进度文本
          var epMessage = `正在改编第${ep}集...`;
          nodes.forEach(function (b) {
            var bEp = b.getAttribute("data-ep");
            if (bEp != null && parseInt(bEp, 10) === ep) {
              b.textContent = formatTaskProgressText("改编中", progress, epMessage);
            }
          });
        }
      },
      onComplete: (message) => {
        if (options.continueAdapt) {
          toast("继续改编完成", false);
        } else if (options.allEpisodes) {
          toast("全集改编完成", false);
        } else {
          toast("本集改编完成", false);
        }
        setTimeout(function () {
          if (options.continueAdapt || options.allEpisodes) {
            reloadProjectStayAdaptTab();
          } else {
            reloadProjectStayAdaptTab(ep);
          }
        }, 500);
      },
      onError: (message) => {
        showProjectErrorPanel(taskDesc + "失败", message);
      }
    });

    try {
      // 构建请求体
      var requestBody = {
        requirements: options.requirements || "",
        continue_adaption: !!options.continueAdapt,
        all_episodes: !!options.allEpisodes,
        episode_max_workers: options.maxWorkers || 6
      };

      // 单集改编或任意模式都可以使用这个端点（ep 参数可以是占位符）
      var epParam = (!options.continueAdapt && !options.allEpisodes) ? ep : 1;
      var result = await postJSON("/api/projects/" + encodeURIComponent(PID) + "/episodes/" + epParam + "/adapt", requestBody);

      // 处理结构化返回值
      if (result && result.mode) {
        console.log("改编完成，模式:", result.mode, "处理剧集:", result.episodes, "跳过:", result.skipped);
      }
    } catch (e) {
      // 智能处理 409 错误：如果任务已在运行，不显示错误，而是继续轮询
      var errorMsg = (e && e.message) || String(e);
      var is409Conflict = errorMsg.includes("409") || errorMsg.includes("项目正忙") || errorMsg.includes("正在执行");

      if (is409Conflict) {
        console.log("检测到任务已在运行，继续监控进度:", errorMsg);
        toast("任务已在后台运行中，正在监控进度...", false);

        // 对于全集/继续改编，保持按钮禁用状态
        if (options.continueAdapt || options.allEpisodes) {
          var smartBtn = document.getElementById("ast-sb-adapt-all-btn");
          if (smartBtn) {
            smartBtn.disabled = true;
            smartBtn.classList.add("btn-global-adapt--busy");
            if (options.continueAdapt) {
              smartBtn.textContent = "继续改编中...";
            } else {
              smartBtn.textContent = "全集改编中...";
            }
          }
        }

        // 不停止 poller，让它继续轮询
        // 不进入 finally 块重置状态
        return;
      }

      // 其他错误正常处理
      poller.stop();
      showProjectErrorPanel(taskDesc + "失败", errorMsg);
    } finally {
      // 清除运行状态
      if (options.continueAdapt || options.allEpisodes) {
        adaptEpRunning = false;
      } else {
        runningEpisodes.delete(ep);
      }
      setAdaptRequirementsLocked(false);

      nodes.forEach(function (b) {
        // 只恢复有保存状态的按钮（即被实际禁用过的按钮）
        if (b.hasAttribute("data-adapt-restore-text")) {
          var pt = b.getAttribute("data-adapt-restore-text");
          if (pt != null) b.textContent = pt;
          b.removeAttribute("data-adapt-restore-text");
        }
        if (b.hasAttribute("data-adapt-restore-disabled")) {
          b.disabled = b.getAttribute("data-adapt-restore-disabled") === "1";
          b.removeAttribute("data-adapt-restore-disabled");
        }
        b.classList.remove("ast-sb-adapt-btn--busy");
        b.classList.remove("ast-sb-adapt-btn--disabled");
        b.removeAttribute("aria-busy");
      });
      if (busyTr) {
        busyTr.classList.remove("ast-sb-tr--adapt-busy");
        busyTr.querySelectorAll(".ast-sb-gen-btn").forEach(function (g) {
          if (g.hasAttribute("data-adapt-restore-disabled")) {
            g.disabled = g.getAttribute("data-adapt-restore-disabled") === "1";
            g.removeAttribute("data-adapt-restore-disabled");
          }
        });
      }
    }
  }

  function collectAdaptableEpisodeNums(onlyUnadapted) {
    var selector = onlyUnadapted
      ? ".ast-sb-adapt-btn:not([disabled]):not(.ast-sb-adapt-btn--done)"
      : ".ast-sb-adapt-btn:not([disabled])";
    var list = [];
    document.querySelectorAll(selector).forEach(function (b) {
      var ep = parseInt(b.getAttribute("data-ep"), 10);
      if (Number.isFinite(ep) && ep >= 1) list.push(ep);
    });
    list.sort(function (a, b) {
      return a - b;
    });
    var out = [];
    var prev = -1;
    list.forEach(function (e) {
      if (e !== prev) {
        out.push(e);
        prev = e;
      }
    });
    return out;
  }

  function restoreAstSbRowAfterAdapt(ep, nodes) {
    var busyTr = document.querySelector('.ast-sb-tr[data-ep="' + String(ep) + '"]');
    nodes.forEach(function (b) {
      var bEp = b.getAttribute("data-ep");
      if (bEp != null && parseInt(bEp, 10) === ep) {
        var pt = b.getAttribute("data-adapt-restore-text");
        if (pt != null) b.textContent = pt;
        b.classList.remove("ast-sb-adapt-btn--busy");
        b.removeAttribute("aria-busy");
      }
    });
    if (busyTr) {
      busyTr.classList.remove("ast-sb-tr--adapt-busy");
      busyTr.querySelectorAll(".ast-sb-gen-btn").forEach(function (g) {
        if (g.hasAttribute("data-adapt-restore-disabled")) {
          g.disabled = g.getAttribute("data-adapt-restore-disabled") === "1";
          g.removeAttribute("data-adapt-restore-disabled");
        }
      });
    }
  }

  function closeAdaptAllDialog() {
    var dlg = document.getElementById("dlg-adapt-all");
    if (dlg) {
      dlg.classList.remove("on");
      dlg.setAttribute("aria-hidden", "true");
    }
    window.__adaptAllEpsPending = null;
  }

  function adaptAllEpisodes() {
    if (adaptEpRunning) {
      toast("改编任务进行中，请稍候…", true);
      return;
    }
    var allBtn = document.getElementById("ast-sb-adapt-all-btn");
    var isPartial = allBtn && allBtn.classList.contains("btn-global-adapt--partial");
    var eps = collectAdaptableEpisodeNums(isPartial);
    if (eps.length === 0) {
      toast("没有可改编的集（需已分析且该集有分镜）", true);
      return;
    }
    var dlg = document.getElementById("dlg-adapt-all");
    var desc = document.getElementById("dlg-adapt-all-desc");
    var progressWrap = document.getElementById("dlg-adapt-all-progress");
    var progressFill = document.getElementById("dlg-adapt-all-progress-fill");
    var progressText = document.getElementById("dlg-adapt-all-progress-text");
    var progressCurrent = document.getElementById("dlg-adapt-all-progress-current");
    var cbtn = document.getElementById("dlg-adapt-all-confirm");
    var xbtn = document.getElementById("dlg-adapt-all-cancel");
    if (!dlg || !desc) {
      toast("页面缺少确认对话框，请刷新后重试", true);
      return;
    }
    window.__adaptAllEpsPending = eps.slice();
    var reqText = getAdaptRequirements();
    if (isPartial) {
      desc.textContent =
        "将对 " +
        eps.length +
        " 个尚未改编的集依次执行「本集改编」，已改编的集将跳过。点「开始改编」后按集号顺序执行，请勿关闭页面。";
    } else {
      desc.textContent =
        "将对 " +
        eps.length +
        " 个有分镜的集依次执行「本集改编」，总耗时较长。点「开始改编」后按集号顺序执行，请勿关闭页面。";
    }
    if (reqText) {
      desc.textContent = appendAdaptRequirementsConfirmSuffix(desc.textContent, reqText);
    }
    if (progressWrap) progressWrap.style.display = "none";
    if (progressFill) progressFill.style.width = "0%";
    if (progressText) progressText.textContent = "总进度 0/" + eps.length + "（0%）";
    if (progressCurrent) progressCurrent.textContent = "当前：等待开始";
    if (cbtn) {
      cbtn.style.display = "";
      cbtn.textContent = "开始改编";
      cbtn.onclick = adaptAllEpisodesConfirm;
      cbtn.disabled = false;
    }
    if (xbtn) {
      xbtn.textContent = "取消";
      xbtn.disabled = false;
    }
    dlg.classList.add("on");
    dlg.setAttribute("aria-hidden", "false");
    if (cbtn) {
      setTimeout(function () {
        try {
          cbtn.focus();
        } catch (_) {}
      }, 0);
    }
  }

  async function adaptAllEpisodesConfirm() {
    var eps = window.__adaptAllEpsPending ? window.__adaptAllEpsPending.slice() : null;
    if (!eps || eps.length === 0) return;
    var progressWrap = document.getElementById("dlg-adapt-all-progress");
    var progressFill = document.getElementById("dlg-adapt-all-progress-fill");
    var progressText = document.getElementById("dlg-adapt-all-progress-text");
    var progressCurrent = document.getElementById("dlg-adapt-all-progress-current");
    var cbtn = document.getElementById("dlg-adapt-all-confirm");
    var xbtn = document.getElementById("dlg-adapt-all-cancel");
    if (progressWrap) progressWrap.style.display = "block";
    if (cbtn) {
      cbtn.textContent = "改编中…";
      cbtn.disabled = true;
    }
    if (xbtn) xbtn.disabled = true;

    var sel = ".ast-sb-adapt-btn";
    var nodes = document.querySelectorAll(sel);
    var allBtn = document.getElementById("ast-sb-adapt-all-btn");
    adaptEpRunning = true;
    setAdaptRequirementsLocked(true);
    var adaptRequirements = getAdaptRequirements();

    nodes.forEach(function (b) {
      b.setAttribute("data-adapt-restore-disabled", b.disabled ? "1" : "0");
      b.setAttribute("data-adapt-restore-text", b.textContent);
      b.disabled = true;
    });
    if (allBtn) {
      allBtn.setAttribute("data-adapt-restore-disabled", allBtn.disabled ? "1" : "0");
      allBtn.setAttribute("data-adapt-restore-text", allBtn.textContent);
      allBtn.disabled = true;
    }

    var n = eps.length;
    var failed = false;
    try {
      for (let i = 0; i < n; i++) {
        let ep = eps[i];
        if (progressText) {
          var basePct = Math.round((i * 100) / n);
          progressText.textContent = "总进度 " + i + "/" + n + "（" + basePct + "%）";
        }
        if (progressCurrent) {
          progressCurrent.textContent = "当前：第 " + (i + 1) + "/" + n + " 集（EP" + ep + "）";
        }
        if (progressFill) progressFill.style.width = Math.round((i * 100) / n) + "%";
        nodes.forEach(function (b) {
          var bEp = b.getAttribute("data-ep");
          if (bEp != null && String(bEp).trim() !== "" && parseInt(bEp, 10) === ep) {
            b.textContent = "进行中…";
            b.classList.add("ast-sb-adapt-btn--busy");
            b.setAttribute("aria-busy", "true");
          }
        });
        if (allBtn) {
          allBtn.textContent = "全剧改编 " + (i + 1) + "/" + n + "…";
        }
        var busyTr = document.querySelector('.ast-sb-tr[data-ep="' + String(ep) + '"]');
        if (busyTr) {
          busyTr.classList.add("ast-sb-tr--adapt-busy");
          busyTr.querySelectorAll(".ast-sb-gen-btn").forEach(function (g) {
            g.setAttribute("data-adapt-restore-disabled", g.disabled ? "1" : "0");
            g.disabled = true;
          });
        }

        var poller = new TaskPoller(PID);
        poller.start({
          onProgress: function (progress) {
            nodes.forEach(function (b) {
              var bEp = b.getAttribute("data-ep");
              if (bEp != null && parseInt(bEp, 10) === ep) {
                b.textContent = formatTaskProgressText("改编中", progress, "");
              }
            });
            if (allBtn) {
              var p = Number(progress);
              var pctText = Number.isFinite(p) && p > 0 ? `${Math.round(p)}%` : "处理中";
              allBtn.textContent = "全剧 " + (i + 1) + "/" + n + " · " + pctText;
            }
            if (progressFill || progressText) {
              var p = Number(progress);
              var innerPct = Number.isFinite(p) ? Math.max(0, Math.min(100, Math.round(p))) : 0;
              var overall = Math.round(((i + innerPct / 100) * 100) / n);
              if (progressFill) progressFill.style.width = overall + "%";
              if (progressText) progressText.textContent = "总进度 " + i + "/" + n + "（" + overall + "%）";
            }
          },
          onComplete: function () {},
          onError: function () {},
        });

        toast("全剧改编：第 " + (i + 1) + "/" + n + " 集（第 " + ep + " 集）…", false, 600000);

        try {
          await postJSON(
            "/api/projects/" + encodeURIComponent(PID) + "/episodes/" + encodeURIComponent(ep) + "/adapt",
            { requirements: adaptRequirements }
          );
        } catch (e) {
          poller.stop();
          showProjectErrorPanel(
            "全剧改编失败",
            "第 " + ep + " 集：\n" + ((e && e.message) || String(e))
          );
          failed = true;
          restoreAstSbRowAfterAdapt(ep, nodes);
          break;
        }
        poller.stop();
        restoreAstSbRowAfterAdapt(ep, nodes);
        if (progressFill) progressFill.style.width = Math.round(((i + 1) * 100) / n) + "%";
        if (progressText) {
          var donePct = Math.round(((i + 1) * 100) / n);
          progressText.textContent = "总进度 " + (i + 1) + "/" + n + "（" + donePct + "%）";
        }
      }

      if (!failed) {
        if (progressCurrent) progressCurrent.textContent = "当前：全部改编完成";
        toast("全剧改编已完成", false);
        setTimeout(function () {
          reloadProjectStayAdaptTab(eps[eps.length - 1]);
        }, 500);
      }
    } finally {
      adaptEpRunning = false;
      setAdaptRequirementsLocked(false);
      nodes.forEach(function (b) {
        var pt = b.getAttribute("data-adapt-restore-text");
        if (pt != null) b.textContent = pt;
        b.removeAttribute("data-adapt-restore-text");
        b.disabled = b.getAttribute("data-adapt-restore-disabled") === "1";
        b.removeAttribute("data-adapt-restore-disabled");
        b.classList.remove("ast-sb-adapt-btn--busy");
        b.removeAttribute("aria-busy");
      });
      if (allBtn) {
        var pta = allBtn.getAttribute("data-adapt-restore-text");
        if (pta != null) allBtn.textContent = pta;
        allBtn.removeAttribute("data-adapt-restore-text");
        allBtn.disabled = allBtn.getAttribute("data-adapt-restore-disabled") === "1";
        allBtn.removeAttribute("data-adapt-restore-disabled");
      }
      if (xbtn) {
        xbtn.disabled = false;
        xbtn.textContent = "关闭";
      }
      if (cbtn) {
        cbtn.style.display = "none";
      }
    }
  }

  // 更新智能改编按钮状态
  function updateSmartAdaptButton(statusData) {
    var btn = document.getElementById("ast-sb-adapt-all-btn");
    if (!btn) return;

    var taskName = statusData.task_name || "";
    var status = (statusData.status || "").toLowerCase();
    var message = statusData.message || "";

    // 检查是否是改编任务
    var isAdaptTask = taskName.includes("adapt_episode");

    if (isAdaptTask && status === "running") {
      // 正在运行中
      btn.disabled = true;
      btn.classList.add("btn-global-adapt--busy");
      setAdaptRequirementsLocked(true);

      // 根据任务类型显示不同文案
      if (taskName === "adapt_episode_continue") {
        btn.textContent = "继续改编中...";
      } else if (taskName === "adapt_episode_all") {
        btn.textContent = "全集改编中...";
      } else if (taskName.startsWith("adapt_episode_")) {
        var epNum = taskName.replace("adapt_episode_", "");
        btn.textContent = "改编第" + epNum + "集中...";
      } else {
        btn.textContent = "改编中...";
      }

      return true; // 返回 true 表示任务正在运行
    } else {
      // 任务未运行，恢复按钮状态
      btn.disabled = false;
      btn.classList.remove("btn-global-adapt--busy");
      setAdaptRequirementsLocked(false);

      // 恢复原始文案（根据 data 属性判断）
      var mode = btn.getAttribute("data-adapt-mode") || "all";
      var adaptedTotal = parseInt(btn.getAttribute("data-adapted-total"), 10) || 0;
      var adaptableTotal = parseInt(btn.getAttribute("data-adaptable-total"), 10) || 0;

      if (mode === "continue" && adaptedTotal > 0 && adaptedTotal < adaptableTotal) {
        btn.textContent = "继续改编（" + adaptedTotal + "/" + adaptableTotal + "）";
      } else if (adaptedTotal >= adaptableTotal && adaptableTotal > 0) {
        btn.textContent = "重新改编";
      } else {
        btn.textContent = "全集改编";
      }

      return false; // 返回 false 表示任务未运行
    }
  }

  // 智能改编：根据按钮当前状态自动选择模式
  async function smartAdaptEpisodes() {
    if (adaptEpRunning) {
      toast("改编任务进行中，请稍候…", true);
      return;
    }

    var btn = document.getElementById("ast-sb-adapt-all-btn");
    if (!btn) {
      toast("找不到改编按钮", true);
      return;
    }

    // 防止按钮被快速重复点击
    if (btn.disabled) {
      console.log("按钮已禁用，忽略点击");
      return;
    }

    var mode = btn.getAttribute("data-adapt-mode") || "all";
    var adaptedTotal = parseInt(btn.getAttribute("data-adapted-total"), 10) || 0;
    var adaptableTotal = parseInt(btn.getAttribute("data-adaptable-total"), 10) || 0;

    var confirmMsg = "";
    var options = {};
    var adaptRequirements = getAdaptRequirements();

    if (mode === "continue" && adaptedTotal > 0 && adaptedTotal < adaptableTotal) {
      // 部分已改编 → 继续改编未完成的
      confirmMsg = "将继续改编剩余 " + (adaptableTotal - adaptedTotal) + " 个未完成的剧集（后端并行处理），是否继续？";
      options = { continueAdapt: true };
    } else if (adaptedTotal >= adaptableTotal && adaptableTotal > 0) {
      // 全部已改编 → 重新改编
      confirmMsg = "将重新改编全部 " + adaptableTotal + " 个剧集（后端并行处理），是否继续？";
      options = { allEpisodes: true };
    } else {
      // 全部未改编 → 全集改编
      confirmMsg = "将改编全部 " + adaptableTotal + " 个剧集（后端并行处理），是否继续？";
      options = { allEpisodes: true };
    }
    confirmMsg = appendAdaptRequirementsConfirmSuffix(confirmMsg, adaptRequirements);
    options.requirements = adaptRequirements;

    if (!confirm(confirmMsg)) {
      return;
    }

    // 立即禁用按钮，防止重复点击
    btn.disabled = true;

    await adaptEp(null, options);
  }

  // 恢复智能改编进度（页面加载时）
  function resumeSmartAdaptProgress(taskName) {
    console.log("恢复智能改编进度:", taskName);
    setAdaptRequirementsLocked(true);

    // 更新按钮状态
    var btn = document.getElementById("ast-sb-adapt-all-btn");
    if (btn) {
      btn.disabled = true;
      btn.classList.add("btn-global-adapt--busy");

      if (taskName === "adapt_episode_continue") {
        btn.textContent = "继续改编中...";
      } else if (taskName === "adapt_episode_all") {
        btn.textContent = "全集改编中...";
      } else {
        btn.textContent = "改编中...";
      }
    }

    // 全集/继续改编时：禁用所有单集改编按钮
    var isGlobalAdapt = (taskName === "adapt_episode_continue" || taskName === "adapt_episode_all");
    if (isGlobalAdapt) {
      var adaptBtns = document.querySelectorAll(".ast-sb-adapt-btn");
      adaptBtns.forEach(function (b) {
        b.disabled = true;
        b.classList.add("ast-sb-adapt-btn--disabled");
      });
    }
    // 单集改编时：不禁用其他集按钮，让它们保持可点击以支持并发

    // 启动轮询
    var poller = new TaskPoller(PID);
    poller.start({
      onProgress: (progress, message) => {
        if (btn) {
          var progressText = Number.isFinite(progress) && progress > 0 ? ` (${Math.round(progress)}%)` : "";
          if (taskName === "adapt_episode_continue") {
            btn.textContent = "继续改编中" + progressText;
          } else if (taskName === "adapt_episode_all") {
            btn.textContent = "全集改编中" + progressText;
          } else {
            btn.textContent = "改编中" + progressText;
          }
        }
      },
      onComplete: (message) => {
        toast("改编完成", false);
        setAdaptRequirementsLocked(false);
        // 全集/继续改编：移除所有单集改编按钮的禁用样式
        if (isGlobalAdapt) {
          document.querySelectorAll(".ast-sb-adapt-btn").forEach(function (b) {
            b.classList.remove("ast-sb-adapt-btn--disabled");
          });
        }
        setTimeout(function () {
          reloadProjectStayAdaptTab();
        }, 500);
      },
      onError: (message) => {
        setAdaptRequirementsLocked(false);
        if (btn) {
          btn.disabled = false;
          btn.classList.remove("btn-global-adapt--busy");
        }
        // 全集/继续改编：移除所有单集改编按钮的禁用样式
        if (isGlobalAdapt) {
          document.querySelectorAll(".ast-sb-adapt-btn").forEach(function (b) {
            b.disabled = false;
            b.classList.remove("ast-sb-adapt-btn--disabled");
          });
        }
        showProjectErrorPanel("改编失败", message);
      }
    });

    // 保存 poller 引用，以便后续可能的操作
    window.__smartAdaptPoller = poller;
  }

  window.adaptAllEpisodes = adaptAllEpisodes;
  window.closeAdaptAllDialog = closeAdaptAllDialog;
  window.adaptAllEpisodesConfirm = adaptAllEpisodesConfirm;
  window.smartAdaptEpisodes = smartAdaptEpisodes;
  window.adaptEp = adaptEp;
  window.updateSmartAdaptButton = updateSmartAdaptButton;
  window.resumeSmartAdaptProgress = resumeSmartAdaptProgress;

  function getVideoGenButtons() {
    return {
      current: document.getElementById("btn-gen-current-ep"),
      all: document.getElementById("btn-gen-all-ep"),
    };
  }

  function getCurrentEpisodeButtonDefaultText() {
    const btn = document.getElementById("btn-gen-current-ep");
    if (!btn) return "生成当前剧集";
    const t = btn.getAttribute("data-default-text");
    return t && t.trim() ? t.trim() : "生成当前剧集";
  }

  // ── 全局生成状态条 ──────────────────────────────────────
  function showGlobalGenStatus(text) {
    const bar = document.getElementById("global-gen-status-bar");
    const txt = document.getElementById("global-gen-status-text");
    if (txt) txt.textContent = text || "";
    if (bar) bar.style.display = "";
  }
  function hideGlobalGenStatus() {
    const bar = document.getElementById("global-gen-status-bar");
    if (bar) bar.style.display = "none";
  }

  function stopActiveEpisodeStatusPoller() {
    if (ACTIVE_EPISODE_STATUS_POLLER) {
      ACTIVE_EPISODE_STATUS_POLLER.stop();
      ACTIVE_EPISODE_STATUS_POLLER = null;
    }
  }

  function renderEpisodeStatusBarText(ep, status) {
    const total = Number(status && status.total_shots || 0);
    const succeeded = Number(status && status.succeeded_shots || 0);
    const running = Number(status && status.running_shots || 0);
    const failed = Number(status && status.failed_shots || 0);
    const st = String(status && status.status || "");
  const staleSeconds = Number(status && status.stale_seconds || 0);
  const staleMinutes = staleSeconds > 0 ? Math.ceil(staleSeconds / 60) : 0;
  const runningShotIds = Array.isArray(status && status.current_shot_ids)
    ? status.current_shot_ids.map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  const runningShotText = runningShotIds.length > 0 ? runningShotIds.join("/") : "未知";
    if (st === "completed") {
      return `第${ep}集 · 生成完成 ${succeeded}/${total || succeeded} 镜头`;
    }
  if (st === "stale") {
    return `第${ep}集 · 疑似中断（卡在镜头 ${runningShotText}，${staleMinutes || "多"} 分钟无进展）`;
  }
    if (st === "partial_failed") {
      return `第${ep}集 · 部分失败（成功${succeeded} / 失败${failed}）`;
    }
    if (st === "failed") {
      return `第${ep}集 · 生成失败（失败${failed}）`;
    }
    if (running > 0 || st === "running") {
      return `第${ep}集 · 生成中 ${succeeded}/${total} 镜头…`;
    }
    if (total > 0) {
      return `第${ep}集 · 等待生成 ${succeeded}/${total} 镜头`;
    }
    return `第${ep}集 · 准备中…`;
  }

  function setVideoGenButtonsBusy(mode, busy) {
    const b = getVideoGenButtons();
    const currentBtn = b.current;
    const allBtn = b.all;
    if (!currentBtn && !allBtn) return;
    if (busy) {
      if (currentBtn) {
        currentBtn.disabled = true;
        // 按钮文字保持不变，进度交给状态条
      }
      if (allBtn) allBtn.disabled = true;
      // 锁定单镜头生成按钮
      const shotsWrap = document.querySelector(".sb-all-shots");
      if (shotsWrap) shotsWrap.classList.add("ep-video-generating");
      return;
    }
    if (currentBtn) {
      currentBtn.disabled = !SB_EP;
      currentBtn.classList.remove("btn-loading");
      currentBtn.removeAttribute("title");
      refreshCurrentEpisodeTopBar();
    }
    if (allBtn) {
      allBtn.disabled = false;
      allBtn.textContent = "生成全剧";
    }
    // 解锁单镜头生成按钮
    const shotsWrap = document.querySelector(".sb-all-shots");
    if (shotsWrap) shotsWrap.classList.remove("ep-video-generating");
    hideGlobalGenStatus();
  }

  function readShotDurationSec(card) {
    const durEl = card ? card.querySelector('[data-field="duration_sec"]') : null;
    var durationSec = parseInt(durEl && durEl.value, 10);
    if (!Number.isFinite(durationSec)) durationSec = MIN_SHOT_DURATION_SEC;
    durationSec = Math.max(MIN_SHOT_DURATION_SEC, Math.min(MAX_SHOT_DURATION_SEC, durationSec));
    if (durEl) durEl.value = String(durationSec);
    return durationSec;
  }

  function readCardFieldValue(card, field, fallback) {
    if (!card) return fallback;
    const el = card.querySelector('[data-field="' + field + '"]');
    if (!el || el.value == null) return fallback;
    return String(el.value);
  }

  function buildShotPatchFromCard(card) {
    const sid = card ? String(card.getAttribute("data-sid") || "").trim() : "";
    const refPrevShotEl = card ? card.querySelector('[data-field="ref_prev_shot"]') : null;
    const patch = {
      prompt_trans: readCardFieldValue(card, "prompt_trans", ""),
      video_ref_prompt: readCardFieldValue(card, "video_ref_prompt", ""),
      duration_sec: readShotDurationSec(card),
      ref_prev_shot: sid === "1" ? false : Boolean(refPrevShotEl && refPrevShotEl.checked),
      shot_type: readCardFieldValue(card, "shot_type", ""),
      updated_at: assetUtcNow(),
    };
    // 方向 A：ref_imgs 和 entity_refs 完全由 prompt_trans 的 @[...] 提及决定。
    // entity_refs 是工作流 stage3b 构建参考图的真正来源（prompt_trans_finalized=true 时）。
    //
    // 特殊情况：prompt 里同时包含用户上传图（/refs/ 路径）和资产图时，
    // 工作流在 entity_refs 非空时会丢弃 ref_imgs 里的用户上传路径。
    // 解决方案：此时强制 entity_refs 置空，让工作流走兜底分支，
    // 直接用 ref_imgs（包含两类图）作为完整参考图列表。
    const promptText = patch.prompt_trans || '';
    const computedRefImgs = computeRefImgsFromPrompt(promptText);
    const hasUserUploads = computedRefImgs.some(function (p) {
      return /\/refs\//.test(p) || p.startsWith('asset/refs/');
    });
    patch.ref_imgs = computedRefImgs;
    patch.entity_refs = hasUserUploads
      ? { characters: [], scenes: [], props: [] }
      : computeEntityRefsFromPrompt(promptText);
    const refVideosEl = card ? card.querySelector('[data-field="ref_videos"]') : null;
    if (refVideosEl) patch.ref_videos = refTextToList(refVideosEl);
    return patch;
  }

  async function persistShotDraftByCard(card, opts) {
    opts = opts || {};
    if (!card) return;
    const ep = card.getAttribute("data-ep");
    const sid = card.getAttribute("data-sid");
    if (!ep || !sid) return;
    const patch = buildShotPatchFromCard(card);
    await patchJSON(
      "/api/projects/" +
        encodeURIComponent(PID) +
        "/episodes/" +
        encodeURIComponent(ep) +
        "/shots/" +
        encodeURIComponent(sid),
      { patch: patch }
    );
    // 方向 A：保存后用计算出的 ref_imgs 同步 DOM ref strip
    applyShotRefImgs(ep, sid, patch.ref_imgs || []);
    if (!opts.silent) {
      toast("已保存镜头 " + sid, false);
    }
  }

  async function persistVisibleEpisodeDrafts(ep, opts) {
    opts = opts || {};
    const cards = Array.from(document.querySelectorAll('.shot-card[data-ep="' + String(ep) + '"]'));
    for (const card of cards) {
      await persistShotDraftByCard(card, { silent: true });
      clearPromptDirty(card);
    }
    if (!opts.silent && cards.length > 0) {
      toast("已保存当前集镜头时长与提示词", false, 1800);
    }
  }

  async function genEpVideos(ep, btn, opts) {
    if (!btn) return;
    opts = opts || {};
    const staleEps = Array.isArray(window.PAGE_DATA && window.PAGE_DATA.entityStaleEpisodes)
      ? window.PAGE_DATA.entityStaleEpisodes.map(Number)
      : [];
    if (staleEps.includes(Number(ep))) {
      toast(
        `第${ep}集分镜改编已过期（资产英文名已更新），请先重新执行「分镜改编」`,
        true,
        4500
      );
      return;
    }
    if (!_acquireEpGenerationInflight(ep)) {
      toast(`第${ep}集任务请求已发出，请勿重复点击`, true, 1800);
      return;
    }
    const reloadOnComplete = opts.reloadOnComplete !== false;
    const silentSuccessToast = opts.silentSuccessToast === true;
    const beforeRequest = typeof opts.beforeRequest === "function" ? opts.beforeRequest : null;
    const afterComplete = typeof opts.afterComplete === "function" ? opts.afterComplete : null;
    const afterError = typeof opts.afterError === "function" ? opts.afterError : null;
    const successToastText = typeof opts.successToastText === "string" && opts.successToastText.trim()
      ? opts.successToastText.trim()
      : "本集视频生成已完成，正在同步状态...";
    const apiPath = typeof opts.apiPath === "string" && opts.apiPath.trim()
      ? opts.apiPath.trim()
      : `/api/projects/${encodeURIComponent(PID)}/episodes/${encodeURIComponent(ep)}/generate_videos`;
    const completeOnHttpSuccess = opts.completeOnHttpSuccess === true;
    const forceRegenerate = opts.forceRegenerate === true;
    const isAlreadyRunningError = (msg) => {
      const text = String(msg || "");
      return text.includes("正在生成中") || text.includes("already running");
    };

    // 按钮进入启动态，进度由左栏与顶栏按钮文案承担（单集不使用全局状态条）
    setVideoGenButtonsBusy("current", true);
    btn.disabled = true;
    btn.classList.add("btn-loading");
    btn.textContent = "正在启动…";
    stopActiveEpisodeStatusPoller();

    // 任务级别的进度（fallback，镜头级优先）
    const taskPoller = new TaskPoller(PID);
    const episodeStatusPoller = new EpisodeStatusPoller(PID, ep);
    ACTIVE_EPISODE_STATUS_POLLER = episodeStatusPoller;
    let finished = false;
    const finishSuccess = async () => {
      if (finished) return;
      finished = true;
      taskPoller.stop();
      episodeStatusPoller.stop();
      if (ACTIVE_EPISODE_STATUS_POLLER === episodeStatusPoller) {
        ACTIVE_EPISODE_STATUS_POLLER = null;
      }
      shotsPoller.stop();
      clearEpisodeNeedsRegen(ep);
      btn.classList.remove("btn-loading");
      btn.classList.add("btn-success");
      btn.disabled = false;
      hideGlobalGenStatus();
      if (!silentSuccessToast) {
        toast(successToastText, false);
      }
      try {
        await fetch(`/api/projects/${PID}/episodes/${ep}/sync_videos`, {
          method: "POST",
        });
      } catch (e) {
        console.warn("同步视频状态失败:", e);
      }
      if (afterComplete) afterComplete();
      if (reloadOnComplete) {
        setTimeout(function () {
          location.reload();
        }, 2000);
      }
    };
    const finishError = (message) => {
      if (finished) return;
      finished = true;
      taskPoller.stop();
      episodeStatusPoller.stop();
      if (ACTIVE_EPISODE_STATUS_POLLER === episodeStatusPoller) {
        ACTIVE_EPISODE_STATUS_POLLER = null;
      }
      shotsPoller.stop();
      hideGlobalGenStatus();
      setVideoGenButtonsBusy(null, false);
      btn.classList.remove("btn-loading");
      btn.disabled = false;
      btn.textContent = getCurrentEpisodeButtonDefaultText();
      const errState = new ButtonStateManager(btn);
      errState.error("生成失败", 3000);
      showProjectErrorPanel("本集视频生成失败", message || "未知错误");
      if (afterError) afterError(message || "未知错误");
    };
    taskPoller.start({
      onProgress: (progress, message) => {
        // 仅当镜头poller未提供进度时才用任务级进度
      },
      onComplete: async () => {
        // 兜底：仅当该集状态已进入终态时才处理完成，避免并行任务串扰
        try {
          const res = await fetch(`/api/projects/${PID}/episodes/${ep}/status`);
          if (res.ok) {
            const s = await res.json();
            const st = String(s && s.status || "");
            if (st === "completed") {
              await finishSuccess();
            } else if (st === "failed" || st === "partial_failed") {
              finishError(renderEpisodeStatusBarText(ep, s));
            }
          }
        } catch (_) {}
      },
      onError: (message) => {
        // 保留分集轮询主导，不因项目级状态短暂异常直接判失败
        console.warn("task poller error:", message);
      }
    });

    // 镜头级别的进度 → 更新左栏数字
    const shotsPoller = new ShotsProgressPoller(PID, ep);
    shotsPoller.start({
      onProgress: (generated, total) => {
        updateEpisodeProgressUI(ep, generated, total);
      },
      onShotGenerated: (sid, filePath) => {
        clearShotNeedsRegen(ep, sid);
        if (Number(ep) === Number(SB_EP)) {
          updateShotPreview(sid, filePath);
        }
        renderEpisodeRegenNotice("g");
      },
      onError: (message) => {
        showProjectErrorPanel("镜头进度查询失败", message);
      }
    });
    episodeStatusPoller.start({
      onProgress: (status) => {
        applyEpisodeVideoStatus(ep, status);
      },
      onComplete: async () => {
        await finishSuccess();
      },
      onError: (status) => {
        if (status && status.status === "partial_failed") {
          applyEpisodeVideoStatus(ep, status);
          finishError(renderEpisodeStatusBarText(ep, status));
          return;
        }
        finishError(renderEpisodeStatusBarText(ep, status || {}));
      }
    });

    try {
      if (beforeRequest) await beforeRequest();
      console.log('[DEBUG] 发送生成视频请求:', { apiPath, forceRegenerate, ep });
      await postJSON(
        apiPath,
        { force_regenerate: forceRegenerate }
      );
      _releaseEpGenerationInflight(ep);
      if (completeOnHttpSuccess) {
        await finishSuccess();
      }
    } catch (e) {
      _releaseEpGenerationInflight(ep);
      taskPoller.stop();
      episodeStatusPoller.stop();
      if (ACTIVE_EPISODE_STATUS_POLLER === episodeStatusPoller) {
        ACTIVE_EPISODE_STATUS_POLLER = null;
      }
      shotsPoller.stop();
      const errMsg = (e && e.message) || String(e);
      if (isAlreadyRunningError(errMsg)) {
        btn.disabled = false;
        btn.classList.remove("btn-loading");
        state.reset();
        const livePoller = new EpisodeStatusPoller(PID, ep);
        ACTIVE_EPISODE_STATUS_POLLER = livePoller;
        livePoller.start({
          onProgress: (status) => {
            applyEpisodeVideoStatus(ep, status);
          },
          onComplete: () => {
            if (ACTIVE_EPISODE_STATUS_POLLER === livePoller) ACTIVE_EPISODE_STATUS_POLLER = null;
          },
          onError: () => {
            if (ACTIVE_EPISODE_STATUS_POLLER === livePoller) ACTIVE_EPISODE_STATUS_POLLER = null;
          }
        });
        toast(`第${ep}集任务已在后台运行，已同步状态`, false, 2200);
        return;
      }
      btn.disabled = false;
      btn.classList.remove("btn-loading");
      hideGlobalGenStatus();
      state.error("生成失败", 3000);
      showProjectErrorPanel("本集视频生成失败", errMsg);
      if (afterError) afterError(errMsg);
      console.error("genEpVideos", e);
    }
  }

  /**
   * 从服务器拉取最新的镜头版本信息，更新 SB_SHOT_VERSIONS 内存，
   * 使历史版本弹窗能够反映新生成的版本。
   */
  async function refreshShotVersions(ep, sid) {
    try {
      const resp = await fetch(
        `/api/projects/${encodeURIComponent(PID)}/episodes/${encodeURIComponent(ep)}/shots/${encodeURIComponent(sid)}/versions`,
        { cache: "no-store" }
      );
      if (!resp.ok) return;
      const data = await resp.json();
      const key = String(sid);
      SB_SHOT_VERSIONS[key] = {
        selected_version: String(data.selected_version || ""),
        selected_file_path: String(data.selected_file_path || ""),
        history: Array.isArray(data.history) ? data.history : [],
      };
    } catch (_) {
      // 静默失败，不影响主流程
    }
  }

  function updateShotPreview(sid, filePath, silent = false) {
    // 查找对应的镜头卡片
    const shotSection = document.getElementById('sb-shot-' + sid);
    if (!shotSection) return;
    const key = String(sid);
    const oldState = getShotVersionState(key);
    SB_SHOT_VERSIONS[key] = {
      selected_version: String(oldState.selected_version || ""),
      selected_file_path: String(filePath || ""),
      history: Array.isArray(oldState.history) ? oldState.history : [],
    };

    // 查找预览区域
    const previewArea = shotSection.querySelector('.sb-col-gen');
    if (!previewArea) return;

    // 更新状态
    const statusEl = previewArea.querySelector('.sb-gen-status');
    if (statusEl) {
      statusEl.textContent = '已生成 · 可预览';
      statusEl.classList.add('ok');
      statusEl.classList.remove('is-running');
    }

    // 更新视频
    const placeholder = previewArea.querySelector('.sb-preview-placeholder');
    if (placeholder) {
      const video = document.createElement('video');
      video.className = 'sb-preview-video';
      video.controls = true;
      video.src = '/files/' + PID + '/' + filePath + '?t=' + Date.now();
      placeholder.replaceWith(video);
    } else {
      // 如果已经有视频，刷新 src
      const video = previewArea.querySelector('.sb-preview-video');
      if (video) {
        video.src = '/files/' + PID + '/' + filePath + '?t=' + Date.now();
        video.load();
      }
    }

    const genBtn = shotSection.querySelector('.sb-gen-big');
    if (genBtn) {
      genBtn.setAttribute("data-has-video", "1");
      // 生成中时不重置按钮，避免 hydrate 覆盖恢复后的任务状态
      const generating = genBtn.getAttribute("data-generating") === "1"
        || isShotTaskGenerating(SB_EP, sid);
      if (!generating) {
        genBtn.disabled = false;
        genBtn.removeAttribute("aria-busy");
        const regenText = String(genBtn.getAttribute("data-regen-text") || "").trim() || "重新生成视频片段";
        __setShotBtnLabel(genBtn, regenText);
        genBtn.classList.remove("btn-loading", "btn-error", "btn-success");
        genBtn.removeAttribute("data-generating");
      }
    }

    if (!silent) {
      toast(`镜头 ${sid} 已生成`, false, 2000);
    }
  }

  // ── DEMO 视频占位（海报帧 + 播放钮 + 示例画面标识） ──────────────
  // 由 section 推断海报：先看 prompt_trans，再看 data-ref-imgs 首图
  function _demoSectionPoster(shotSection) {
    var ta = shotSection.querySelector('[data-field="prompt_trans"]');
    var p = _demoPickPosterFromPrompt(ta ? ta.value : '');
    if (p) return p;
    try {
      var arr = JSON.parse(shotSection.getAttribute('data-ref-imgs') || '[]');
      if (Array.isArray(arr) && arr[0]) return _demoLocalImage(arr[0]);
    } catch (_) {}
    return '';
  }

  // 渲染视频占位海报帧。opts.status: ready|generating|pending|empty
  function renderVideoPlaceholder(shotSection, opts) {
    opts = opts || {};
    var genCol = shotSection.querySelector('.sb-col-gen');
    if (!genCol) return;
    var rawStatus = opts.status || shotSection.getAttribute('data-shot-status') || 'pending';
    if (rawStatus === 'ok' || rawStatus === 'completed') rawStatus = 'ready';
    var status = ['ready', 'generating', 'pending', 'empty'].indexOf(rawStatus) >= 0 ? rawStatus : 'pending';
    var poster = opts.poster || _demoSectionPoster(shotSection);
    if (!poster && status === 'ready') status = 'empty';

    // 清除旧的 video / placeholder / frame
    genCol.querySelectorAll('.sb-preview-video, .sb-preview-placeholder, .sb-preview-frame').forEach(function (n) { n.remove(); });

    var frame = document.createElement('div');
    frame.className = 'sb-preview-frame sb-preview-frame--' + status;
    if (poster) {
      frame.setAttribute('data-poster', poster);
      frame.style.setProperty('--sb-poster', "url(" + JSON.stringify(new URL(poster, document.baseURI).href) + ")");
    }
    var inner =
      '<span class="sb-preview-corner">静态参考帧</span>' +
      '<span class="sb-preview-demo">DEMO</span>';
    if (status === 'ready') {
      inner += '<button type="button" class="sb-preview-play" aria-label="放大本镜参考帧"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9V3h6m6 0h6v6m0 6v6h-6M9 21H3v-6"/></svg></button>';
    } else if (status === 'generating') {
      inner += '<div class="sb-preview-scan"></div><span class="sb-preview-genlabel">正在生成中…</span>';
      var genEp = shotSection.getAttribute('data-ep') || '1';
      var genSid = shotSection.getAttribute('data-sid') || '1';
      inner += '<button type="button" class="sb-preview-stop-btn" onclick="event.stopPropagation();_demoStopGenerating(' + genEp + ',\'' + genSid + '\')" title="中止生成">⏹ 中止</button>';
    } else if (status === 'pending') {
      inner += '<span class="sb-preview-genlabel">未生成</span>';
    } else {
      inner += '<span class="sb-preview-genlabel">暂无预览</span>';
    }
    frame.innerHTML = inner;

    var statusEl = genCol.querySelector('.sb-gen-status');
    if (statusEl && statusEl.nextSibling) genCol.insertBefore(frame, statusEl.nextSibling);
    else genCol.appendChild(frame);
  }

  // 点击海报 → 全屏 lightbox（用图片模拟播放）
  function _openDemoLightbox(poster, frame) {
    if (document.querySelector('dialog.reference-dialog[open]')) return;
    const opener = frame.querySelector('button') || document.activeElement;
    var ov = document.createElement('dialog');
    ov.className = 'reference-dialog';
    ov.setAttribute('aria-label', '本镜参考帧');
    var img = document.createElement('img');
    img.src = poster; img.alt = '当前镜头的静态参考帧';
    var label = document.createElement('p'); label.textContent = '静态参考帧';
    var button = document.createElement('button'); button.type = 'button';
    button.setAttribute('aria-label','关闭参考帧'); button.textContent = '关闭';
    ov.append(img,label,button); document.body.appendChild(ov);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let animation;
    function frameTransform() {
      const origin = frame.getBoundingClientRect(), box = ov.getBoundingClientRect();
      const x = origin.left + origin.width / 2 - box.left - box.width / 2;
      const y = origin.top + origin.height / 2 - box.top - box.height / 2;
      const scale = Math.min(1, Math.max(.45, origin.width / box.width));
      return 'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')';
    }
    function dismiss() {
      if (!ov.open || ov.hasAttribute('data-closing')) return;
      const current = { transform:getComputedStyle(ov).transform, opacity:getComputedStyle(ov).opacity };
      if (animation) animation.cancel();
      if (reduce.matches || !ov.animate) { ov.close(); return; }
      ov.setAttribute('data-closing','');
      animation = ov.animate([current, {transform:frameTransform(),opacity:0}],
        {duration:140,easing:'cubic-bezier(.4,0,.75,.4)',fill:'both'});
      animation.onfinish = () => ov.close();
    }
    button.addEventListener('click',dismiss);
    ov.addEventListener('click',e=>{if(e.target===ov)dismiss();});
    ov.addEventListener('cancel',e=>{e.preventDefault();dismiss();});
    ov.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();dismiss();}});
    ov.addEventListener('close',()=>{
      if(animation)animation.cancel();
      ov.remove();
      if(opener && opener.isConnected)opener.focus({preventScroll:true});
    },{once:true});
    ov.showModal();
    if(!reduce.matches && ov.animate) {
      animation=ov.animate([{transform:frameTransform(),opacity:.25},{transform:'none',opacity:1}],
        {duration:290,easing:'cubic-bezier(.18,.78,.22,1)'});
    }
  }

  function _bindPreviewFrameClick() {
    document.addEventListener('click', function (e) {
      var frame = e.target.closest('.sb-preview-frame');
      if (!frame) return;
      if (frame.classList.contains('sb-preview-frame--generating')) return;
      var poster = frame.getAttribute('data-poster') || '';
      if (!poster) return;
      e.preventDefault();
      _openDemoLightbox(poster, frame);
    });
  }

  window._bindPreviewFrameClick = _bindPreviewFrameClick;
  window.renderVideoPlaceholder = renderVideoPlaceholder;

  async function hydrateEpisodeShotPreviews(ep) {
    if (CURRENT_VIEW !== "video" || !ep) return;
    try {
      const resp = await fetch(
        `/api/projects/${encodeURIComponent(PID)}/episodes/${encodeURIComponent(ep)}/shots_status`,
        { cache: "no-store" }
      );
      if (!resp.ok) return;
      const data = await resp.json();
      const shots = Array.isArray(data && data.shots) ? data.shots : [];
      shots.forEach((shot) => {
        const sid = String(shot && shot.sid || "").trim();
        const filePath = String(shot && shot.file_path || "").trim();
        if (!sid || !filePath) return;
        if (shot.has_video) {
          updateShotPreview(sid, filePath, true);
        }
      });
    } catch (e) {
      console.warn("hydrate shot previews failed:", e);
    }
  }

  function refTextToList(el) {
    if (!el) return [];
    return String(el.value || "")
      .split(/\r?\n/)
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
  }

  async function saveShotCard(btn) {
    const card = btn.closest(".shot-card");
    if (!card) return;
    try {
      await persistShotDraftByCard(card);
    } catch (e) {
      showStickyError("镜头保存失败", (e && e.message) || String(e));
    }
  }

  function getShotTaskStreamKey(ep, sid) {
    return String(ep) + ":" + String(sid);
  }

  function closeShotTaskStream(ep, sid) {
    const key = getShotTaskStreamKey(ep, sid);
    const holder = SHOT_TASK_STREAMS.get(key);
    if (holder && holder.es) {
      try {
        holder.es.close();
      } catch (_) {}
    }
    SHOT_TASK_STREAMS.delete(key);
  }

  function setShotInlineError(shotSection, message) {
    if (!shotSection) return;
    const box = shotSection.querySelector("[data-shot-error]");
    const textEl = box ? box.querySelector("span") : null;
    const msg = String(message || "").trim();
    if (!box || !textEl) return;
    if (!msg) {
      box.classList.add("hidden");
      textEl.textContent = "";
      shotSection.classList.remove("sb-shot-section--error");
      return;
    }
    textEl.textContent = msg;
    box.classList.remove("hidden");
    shotSection.classList.add("sb-shot-section--error");
  }

  function simplifyShotErrorMessage(rawMessage) {
    const msg = String(rawMessage || "").trim();
    if (!msg) return "";
    if (msg.includes("forbidden negative asset list")) {
      return "prompt_trans 包含“资产未出现/不在画面中”等负向资产列表描述，已被系统拦截。请改成仅描述画面中实际出现的资产。";
    }
    if (msg.includes("too short") || msg.includes("缺少合法的 prompt_trans")) {
      return `prompt_trans 内容不足，当前镜头需要至少 ${SHOT_PROMPT_MIN_CHARS} 个字符并具备可执行细节。`;
    }
    return msg;
  }

  function hasNegativeAssetMentions(prompt) {
    const text = String(prompt || "");
    const pattern = /(@\[[^\]]+\](?:\s*[、,，]\s*@\[[^\]]+\])*)/g;
    let m;
    while ((m = pattern.exec(text)) !== null) {
      const end = Number(m.index) + String(m[0] || "").length;
      const windowText = text.slice(end, end + 24);
      if (SHOT_NEGATIVE_ASSET_PHRASES.some((token) => windowText.includes(token))) {
        return true;
      }
    }
    return false;
  }

  function validateShotPromptBeforeGenerate(prompt) {
    const text = String(prompt || "").trim();
    if (!text) return "prompt_trans 为空，请先填写可执行的镜头提示词。";
    if (text.length < SHOT_PROMPT_MIN_CHARS) {
      return `prompt_trans 过短（当前 ${text.length} 字），至少需要 ${SHOT_PROMPT_MIN_CHARS} 字。`;
    }
    if (hasNegativeAssetMentions(text)) {
      return "prompt_trans 含有“资产未出现”类负向资产列表，系统会拒绝生成。";
    }
    return "";
  }

  function renderShotTaskProgress(btn, snapshot, fallbackText) {
    if (!btn || !snapshot) return;
    const status = String(snapshot.status || "");
    const current = Number(snapshot.current);
    const total = Number(snapshot.total);
    const hasCounter = Number.isFinite(current) && Number.isFinite(total) && total > 0;
    const message = String(snapshot.message || "").trim();

    if (status === "running" || status === "queued") {
      const shotSection = btn.closest(".sb-shot-section");
      const ep = shotSection && shotSection.getAttribute("data-ep");
      setShotInlineError(shotSection, "");
      btn.disabled = true;
      btn.setAttribute("data-generating", "1");
      btn.classList.add("btn-loading");
      btn.classList.remove("btn-error", "btn-success");
      btn.setAttribute("aria-busy", "true");
      const sid = shotSection && shotSection.getAttribute("data-sid");
      if (sid) setShotGeneratingStatus(sid, true);
      if (ep) syncTopBarForShotTask(ep, sid);
      if (hasCounter && String(snapshot.stage || "") === "upload_refs") {
        btn.textContent = `上传参考图 ${current}/${total}`;
      } else if (message) {
        btn.textContent = message;
      } else {
        btn.textContent = "生成中...";
      }
      return;
    }

    if (status === "failed") {
      const shotSection = btn.closest(".sb-shot-section");
      btn.disabled = false;
      btn.removeAttribute("aria-busy");
      btn.classList.remove("btn-loading");
      btn.classList.add("btn-error");
      btn.textContent = "生成失败";
      btn.removeAttribute("data-generating");
      const sid = shotSection && shotSection.getAttribute("data-sid");
      if (sid) restoreShotGenStatusEl(shotSection);
      refreshCurrentEpisodeTopBar();
      const errText = String(snapshot.error || snapshot.message || "未知错误");
      setTimeout(() => {
        btn.classList.remove("btn-error");
        btn.textContent = fallbackText;
      }, 1600);
      const friendly = simplifyShotErrorMessage(errText);
      setShotInlineError(shotSection, friendly);
      showStickyError("镜头生成失败", friendly);
    }
  }

  function watchShotTaskBySSE(ep, sid, taskId, btn, idleText) {
    const key = getShotTaskStreamKey(ep, sid);
    closeShotTaskStream(ep, sid);
    const encodedPid = encodeURIComponent(PID);
    const encodedSid = encodeURIComponent(String(sid));
    const encodedTaskId = encodeURIComponent(String(taskId));
    const url = `/api/projects/${encodedPid}/episodes/${ep}/shots/${encodedSid}/tasks/${encodedTaskId}/events`;
    const es = new EventSource(url);
    SHOT_TASK_STREAMS.set(key, { taskId: String(taskId), es });
    // 持久化任务，以便页面刷新后能恢复监听
    _persistTask(ep, sid, taskId);

    const handleSnapshot = (snapshot) => {
      if (!snapshot || String(snapshot.task_id || "") !== String(taskId)) return;
      renderShotTaskProgress(btn, snapshot, idleText);
      if (snapshot.status === "succeeded") {
        closeShotTaskStream(ep, sid);
        _clearPersistedTask(ep, sid);
        const filePath = String(snapshot.file_path || "").trim() || `${ep}/${sid}.mp4`;
        const shotSection = document.getElementById("sb-shot-" + sid);
        setShotInlineError(shotSection, "");
        clearShotNeedsRegen(ep, sid);
        updateShotPreview(sid, filePath);
        renderEpisodeRegenNotice("g");
        toast(`镜头 ${sid} 已生成`, false);
        // 刷新内存中的 history，让历史版本弹窗能看到新版本
        refreshShotVersions(ep, sid);
        refreshCurrentEpisodeTopBar();
      } else if (snapshot.status === "failed") {
        closeShotTaskStream(ep, sid);
        _clearPersistedTask(ep, sid);

        // 显示失败错误信息
        const errorMsg = String(snapshot.error || snapshot.message || "视频生成失败");
        const shotSection = btn ? btn.closest(".sb-shot-section") : document.getElementById("sb-shot-" + sid);

        // 设置镜头级别的错误提示
        setShotInlineError(shotSection, errorMsg);

        // 重置按钮状态
        if (btn) {
          btn.disabled = false;
          btn.removeAttribute("aria-busy");
          btn.classList.remove("btn-loading");
          btn.classList.add("btn-error");
          btn.textContent = "生成失败";
          btn.removeAttribute("data-generating");
          setTimeout(() => {
            btn.classList.remove("btn-error");
            btn.textContent = idleText;
          }, 3000);
        }
        if (shotSection) restoreShotGenStatusEl(shotSection);
        refreshCurrentEpisodeTopBar();

        // 判断是否是超时错误
        const isTimeout = errorMsg.includes("timed out") || errorMsg.includes("超时") || errorMsg.includes("timeout");
        const isServiceError = errorMsg.includes("api.example.com") || errorMsg.includes("ReadTimeout");

        // 显示友好的错误提示
        if (isTimeout || isServiceError) {
          showStickyError(
            `镜头 ${sid} 生成失败`,
            "视频生成服务响应超时（>200秒），可能是因为：\n1. 镜头内容复杂度较高\n2. 服务负载较大\n\n建议：稍后重试，或简化提示词。"
          );
        } else {
          showStickyError(`镜头 ${sid} 生成失败`, errorMsg);
        }
      }
    };

    const parseData = (raw) => {
      try {
        return JSON.parse(raw || "{}");
      } catch (_) {
        return null;
      }
    };

    es.addEventListener("progress", (evt) => {
      handleSnapshot(parseData(evt.data));
    });
    es.addEventListener("done", (evt) => {
      handleSnapshot(parseData(evt.data));
    });
    es.addEventListener("error", (evt) => {
      handleSnapshot(parseData(evt.data));
    });
    es.onmessage = (evt) => {
      handleSnapshot(parseData(evt.data));
    };
    es.onerror = async () => {
      // SSE 断线时降级查询一次任务状态，避免界面停留在”生成中”
      es.close();
      try {
        const resp = await fetch(
          `/api/projects/${encodedPid}/episodes/${ep}/shots/${encodedSid}/tasks/${encodedTaskId}`,
          { cache: "no-store" }
        );
        if (!resp.ok) {
          // 404 说明任务已被清理（可能是完成很久了或失败后被清理）
          if (resp.status === 404) {
            _clearPersistedTask(ep, sid);
            // 仅同步一次状态，不再自动刷新页面（避免刷新死循环）
            await fetch(`/api/projects/${encodedPid}/episodes/${ep}/sync_videos`, {
              method: "POST"
            }).catch(() => {});
            return;
          }
          throw new Error(`HTTP ${resp.status}`);
        }
        const snapshot = await resp.json();
        handleSnapshot(snapshot);
      } catch (e) {
        const shotSection = btn ? btn.closest(".sb-shot-section") : null;
        const errorMsg = String(e.message || e);

        // 根据错误类型显示不同的提示
        if (errorMsg.includes("404") || errorMsg.includes("任务已结束")) {
          _clearPersistedTask(ep, sid);
          setShotInlineError(shotSection, "任务已结束，已停止监听。");
          showStickyError("任务状态同步", "任务已完成或被清理，请手动刷新查看最新结果。");
        } else {
          setShotInlineError(shotSection, "进度流中断，已无法实时更新。可稍后刷新页面确认结果。");
          showStickyError("镜头进度流中断", errorMsg);
        }

        if (btn) {
          btn.disabled = false;
          btn.removeAttribute("aria-busy");
          btn.classList.remove("btn-loading");
          btn.classList.add("btn-error");
          btn.textContent = "状态中断";
          btn.removeAttribute("data-generating");
          setTimeout(() => {
            btn.classList.remove("btn-error");
            btn.textContent = idleText;
          }, 1600);
        }
      } finally {
        SHOT_TASK_STREAMS.delete(key);
      }
    };
  }

  // 视频生成按钮文本切换：只改 label span，保留 gen-btn 的图标+积分结构
  function __setShotBtnLabel(btn, text){ if(!btn) return; var lb = btn.querySelector('.gen-shot-label, .gen-label'); if(lb) lb.textContent = text; else btn.textContent = text; }
  async function genShot(ep, sid) {
    const card = document.querySelector('.shot-card[data-ep="' + ep + '"][data-sid="' + sid + '"]');
    const ta = card && card.querySelector('[data-field="prompt_trans"]');

    // 找到生成按钮
    const shotSection = document.getElementById('sb-shot-' + sid);
    const btn = shotSection ? shotSection.querySelector('.sb-gen-big') : null;
    const promptText = ta ? String(ta.value || "") : "";
    const promptError = validateShotPromptBeforeGenerate(promptText);
    if (promptError) {
      setShotInlineError(shotSection, promptError);
      showStickyError("镜头提示词不合法", promptError);
      return;
    }
    setShotInlineError(shotSection, "");

    // DEMO 模式短路：直接标记完成 + 显示海报帧，不走 API
    if (window.__LOCAL_DEMO__) { _demoGenShotInstant(ep, sid, shotSection, btn); return; }

    if (btn && btn.getAttribute("data-generating") === "1") return;
    const hadVideoBefore = !!(btn && btn.getAttribute("data-has-video") === "1");
    const idleText = String(
      (btn && btn.getAttribute(hadVideoBefore ? "data-regen-text" : "data-gen-text")) || ""
    ).trim() || (hadVideoBefore ? "重新生成视频片段" : "生成视频片段");

    if (btn) {
      btn.setAttribute("data-generating", "1");
      btn.disabled = true;
      __setShotBtnLabel(btn, "生成中...");
      btn.classList.add("btn-loading");
      btn.classList.remove("btn-error", "btn-success");
      btn.setAttribute("aria-busy", "true");
    }
    setShotGeneratingStatus(sid, true);
    syncTopBarForShotTask(ep, sid);

    try {
      if (card) {
        await persistShotDraftByCard(card, { silent: true });
        clearPromptDirty(card);
      }
      const resp = await postJSON(
        "/api/projects/" +
          encodeURIComponent(PID) +
          "/episodes/" +
          ep +
          "/shots/" +
          encodeURIComponent(sid) +
          "/generate_async",
        { prompt_override: ta ? ta.value : null }
      );
      const taskId = String((resp && resp.task_id) || "").trim();
      if (!taskId) {
        throw new Error("后端未返回 task_id");
      }
      watchShotTaskBySSE(ep, sid, taskId, btn, idleText);
    } catch (e) {
      setShotInlineError(shotSection, simplifyShotErrorMessage((e && e.message) || String(e)));
      restoreShotGenStatusEl(shotSection);
      refreshCurrentEpisodeTopBar();
      if (btn) {
        btn.disabled = false;
        btn.removeAttribute("aria-busy");
        btn.classList.remove("btn-loading");
        btn.classList.add("btn-error");
        btn.textContent = "生成失败";
        setTimeout(() => {
          btn.classList.remove("btn-error");
          btn.textContent = idleText;
        }, 1600);
        btn.removeAttribute("data-generating");
      }
      showStickyError("镜头生成失败", simplifyShotErrorMessage((e && e.message) || String(e)));
    }
  }

  // DEMO：点击生成 → 立即完成（无动画流程），仅更新展示状态
  // Demo：模拟生成（生成中 → 4 秒 → 完成），可通过中止取消
  var _demoGenTimers = {};   // sid → timer
  function _demoGenShotInstant(ep, sid, shotSection, btn) {
    if (!shotSection) return;
    // 清理已有定时器
    if (_demoGenTimers[sid]) { clearTimeout(_demoGenTimers[sid]); delete _demoGenTimers[sid]; }

    // ── 阶段 1：进入生成中 ──
    var stMap = {};
    shotSection.setAttribute('data-shot-status', 'generating');
    var stEl = shotSection.querySelector('.sb-gen-status');
    if (stEl) { stEl.textContent = '生成中…'; stEl.classList.add('is-running'); stEl.classList.remove('ok'); }
    if (typeof window.renderVideoPlaceholder === "function") window.renderVideoPlaceholder(shotSection, { status: 'generating' });
    // 加入 _DEMO_EP_STATUS 的 current_shot_ids，保证侧栏/顶部一致
    var s = window._DEMO_EP_STATUS && window._DEMO_EP_STATUS[ep];
    if (s) {
      if (!Array.isArray(s.current_shot_ids)) s.current_shot_ids = [];
      if (s.current_shot_ids.map(String).indexOf(String(sid)) < 0) s.current_shot_ids.push(String(sid));
      if (s.status !== 'running' && s.status !== 'completed') s.status = 'running';
      _syncShotStatusUI(ep);
    }
    if (btn) {
      btn.setAttribute('data-generating', '1');
      btn.setAttribute('aria-busy', 'true');
      btn.classList.add('btn-loading');
      btn.classList.remove('btn-error', 'btn-success');
      __setShotBtnLabel(btn, '生成中…');
    }

    // ── 阶段 2：4 秒后完成 ──
    _demoGenTimers[sid] = setTimeout(function () {
      delete _demoGenTimers[sid];
      _demoFinishShot(ep, sid, shotSection, btn);
    }, 4000);
  }

  // Demo：单个镜头生成完成
  function _demoFinishShot(ep, sid, shotSection, btn) {
    if (!shotSection) return;
    shotSection.setAttribute('data-shot-status', 'completed');
    var stEl = shotSection.querySelector('.sb-gen-status');
    if (stEl) { stEl.textContent = '已生成 · 可预览'; stEl.classList.add('ok'); stEl.classList.remove('is-running'); }
    if (typeof window.renderVideoPlaceholder === "function") window.renderVideoPlaceholder(shotSection, { status: 'ready' });
    // 从 current_shot_ids 移除，集进度 +1
    var s = window._DEMO_EP_STATUS && window._DEMO_EP_STATUS[ep];
    if (s) {
      if (Array.isArray(s.current_shot_ids)) s.current_shot_ids = s.current_shot_ids.filter(function (id) { return String(id) !== String(sid); });
      s.succeeded_shots = Math.min((s.succeeded_shots || 0) + 1, s.total_shots);
      if (s.succeeded_shots >= s.total_shots) { s.status = 'completed'; s.current_shot_ids = []; }
      _syncShotStatusUI(ep);
    }
    if (btn) {
      btn.disabled = false;
      btn.removeAttribute('data-generating');
      btn.removeAttribute('aria-busy');
      btn.classList.remove('btn-loading', 'btn-error');
      btn.setAttribute('data-has-video', '1');
      __setShotBtnLabel(btn, btn.getAttribute('data-regen-text') || '重新生成视频片段');
    }
    // 模拟添加历史版本
    var key = String(sid);
    var old = SB_SHOT_VERSIONS[key] || { selected_version: '', selected_file_path: '', history: [] };
    var newVer = 'v' + String(Array.isArray(old.history) ? old.history.length : 0).padStart(4, '0');
    var newPath = ep + '/' + sid + '_v' + (Array.isArray(old.history) ? old.history.length : 0) + '.mp4';
    if (!Array.isArray(old.history)) old.history = [];
    old.history.push({ version: newVer, file_path: newPath, created_at: new Date().toISOString() });
    old.selected_version = newVer;
    old.selected_file_path = newPath;
    SB_SHOT_VERSIONS[key] = old;
    if (typeof toast === "function") toast('镜头 ' + sid + ' 已生成（示例 · ' + newVer + '）', false, 2000);
  }

  // DEMO：整集生成 → 将该集所有非完成镜头标记完成
  // Demo：模拟生成单个资产素材图
  function _demoGenOneAsset(btn, card, kind, aid) {
    btn.setAttribute("data-generating", "1");
    btn.disabled = true;
    __setShotBtnLabel(btn, "生成中...");
    btn.classList.add("btn-loading");

    setTimeout(function() {
      btn.disabled = false;
      btn.removeAttribute("data-generating");
      btn.removeAttribute("aria-busy");
      btn.classList.remove("btn-loading");
      btn.classList.add("btn-success");
      __setShotBtnLabel(btn, "已生成");
      toast(kind === 'characters' ? '人物' : kind === 'scenes' ? '场景' : '道具' + '素材图已生成（Demo 模拟）', false, 2000);

      // 添加模拟历史版本
      var row = lookupAssetRow(kind, aid);
      if (!row) {
        if (!window.PAGE_DATA.asset) window.PAGE_DATA.asset = {};
        if (!window.PAGE_DATA.asset[kind]) window.PAGE_DATA.asset[kind] = {};
        row = window.PAGE_DATA.asset[kind][aid] = { name_trans: aid };
      }
      if (!Array.isArray(row.history)) row.history = [];
      var nextVer = 'v' + String(row.history.length).padStart(4, '0');
      row.history.push({
        version: nextVer,
        file_path: 'asset/' + aid + '_' + nextVer + '.png',
        prompt: row.prompt || '',
        created_at: new Date().toISOString()
      });
      row.file_path = 'asset/' + aid + '_' + nextVer + '.png';

      setTimeout(function() {
        btn.classList.remove("btn-success");
        btn.textContent = "重新生成";
      }, 3000);
    }, 800);
  }

  // Demo：为资产 card 添加模拟历史版本
  function _demoAddAssetHistory(card, newPrompt) {
    var kind = card.getAttribute('data-kind') || '';
    var aid = card.getAttribute('data-aid') || '';
    if (!kind || !aid) return;
    var row = lookupAssetRow(kind, aid);
    if (!row) {
      // 如果 PAGE_DATA.asset 中没有该行，创建一个
      if (!window.PAGE_DATA.asset) window.PAGE_DATA.asset = {};
      if (!window.PAGE_DATA.asset[kind]) window.PAGE_DATA.asset[kind] = {};
      row = window.PAGE_DATA.asset[kind][aid] = { file_path: kind + '/' + aid + '.png' };
    }
    if (!Array.isArray(row.history)) row.history = [];
    var nextVer = 'v' + String(row.history.length).padStart(4, '0');
    var entry = {
      version: nextVer,
      file_path: 'asset/' + aid + '_' + nextVer + '.png',
      prompt: String(newPrompt || '').slice(0, 200),
      created_at: new Date().toISOString()
    };
    row.history.push(entry);
    row.file_path = entry.file_path;
    console.log('[local-demo] 已为 ' + aid + ' 添加历史版本: ' + nextVer);
  }

  // Demo: stop generating for a shot（取消定时器，回退到 pending）
  function _demoStopGenerating(ep, sid) {
    // 取消未完成的生成定时器
    if (_demoGenTimers && _demoGenTimers[sid]) { clearTimeout(_demoGenTimers[sid]); delete _demoGenTimers[sid]; }
    var sec = document.getElementById('sb-shot-' + sid);
    if (sec) {
      sec.setAttribute('data-shot-status', 'pending');
      if (typeof window.renderVideoPlaceholder === 'function') {
        window.renderVideoPlaceholder(sec, { status: 'pending' });
      }
      // 复位生成按钮
      var btn = sec.querySelector('.sb-gen-big');
      if (btn) {
        btn.disabled = false;
        btn.removeAttribute('data-generating');
        btn.removeAttribute('aria-busy');
        btn.classList.remove('btn-loading');
        __setShotBtnLabel(btn, btn.getAttribute('data-gen-text') || '生成视频片段');
      }
      var s = _DEMO_EP_STATUS && _DEMO_EP_STATUS[Number(ep)];
      if (s && Array.isArray(s.current_shot_ids)) {
        s.current_shot_ids = s.current_shot_ids.filter(function(id) { return String(id) !== String(sid); });
        if (s.current_shot_ids.length === 0 && s.succeeded_shots >= s.total_shots) s.status = 'completed';
        else if (s.current_shot_ids.length === 0 && s.status === 'running') s.status = 'partial_failed';
      }
      _syncShotStatusUI(Number(ep));
    }
    if (typeof toast === 'function') toast('已中止镜头 ' + sid + ' 的生成', false, 2000);
  }
  window._demoStopGenerating = _demoStopGenerating;

  function _demoGenEpisodeInstant(ep, btn) {
    var sections = document.querySelectorAll('.sb-all-shots > .sb-shot-section');
    var count = 0;
    sections.forEach(function (sec, idx) {
      var st = sec.getAttribute('data-shot-status');
      if (st === 'completed' || st === 'ok') return;
      var sidSec = sec.getAttribute('data-sid');
      var b = sec.querySelector('.sb-gen-big');
      // 批量生成：错峰完成（每个间隔 600ms），演示"逐个生成"
      (function (theSec, theSid, theBtn, delay) {
        setTimeout(function () { _demoFinishShot(ep, theSid, theSec, theBtn); }, delay);
      })(sec, sidSec, b, count * 600);
      count++;
    });
    if (typeof toast === "function") toast('第' + ep + '集开始生成 ' + count + ' 个镜头（示例）', false, 2500);
  }

  // 暴露到全局作用域，供HTML onclick调用
  window.genShot = genShot;
  window.persistShotDraftByCard = persistShotDraftByCard;
  document.querySelectorAll(".sb-shot-section").forEach((shotSection) => {
    const errNode = shotSection.querySelector("[data-shot-error] span");
    const initialError = errNode ? String(errNode.textContent || "").trim() : "";
    if (initialError) {
      shotSection.classList.add("sb-shot-section--error");
    }
  });

  function sbGenCurrentEpisode(btn) {
    if (!SB_EP) {
      toast("请先选择分集", true);
      return;
    }
    // DEMO 短路：将当前集所有非完成镜头直接标记完成
    if (window.__LOCAL_DEMO__) { _demoGenEpisodeInstant(SB_EP, btn); return; }
    const generateMode = String((btn && btn.getAttribute("data-generate-mode")) || "").trim();
    const isResumeMissing = generateMode === "resume_missing";
    genEpVideos(SB_EP, btn, {
      reloadOnComplete: true,
      apiPath: isResumeMissing
        ? `/api/projects/${encodeURIComponent(PID)}/episodes/${encodeURIComponent(SB_EP)}/generate_missing_videos`
        : `/api/projects/${encodeURIComponent(PID)}/episodes/${encodeURIComponent(SB_EP)}/generate_videos`,
      completeOnHttpSuccess: isResumeMissing,
      forceRegenerate: !isResumeMissing,
      successToastText: isResumeMissing ? "未完成镜头补生成完成，正在同步状态..." : undefined,
      beforeRequest: async function () {
        await persistVisibleEpisodeDrafts(SB_EP, { silent: true });
      },
      afterError: function () {}
    });
  }

  function sbGenEpisodeDirect(ep, btn) {
    const epNum = Number(ep);
    if (!Number.isFinite(epNum) || epNum <= 0 || !btn) return;
    const generateMode = String(btn.getAttribute("data-generate-mode") || "").trim();
    const isResumeMissing = generateMode === "resume_missing";
    genEpVideos(epNum, btn, {
      reloadOnComplete: epNum === Number(SB_EP),
      apiPath: isResumeMissing
        ? `/api/projects/${encodeURIComponent(PID)}/episodes/${encodeURIComponent(epNum)}/generate_missing_videos`
        : `/api/projects/${encodeURIComponent(PID)}/episodes/${encodeURIComponent(epNum)}/generate_videos`,
      completeOnHttpSuccess: isResumeMissing,
      forceRegenerate: !isResumeMissing,
      successToastText: isResumeMissing ? "未完成镜头补生成完成，正在同步状态..." : undefined,
      beforeRequest: async function () {
        if (epNum === Number(SB_EP)) {
          await persistVisibleEpisodeDrafts(epNum, { silent: true });
        }
      },
      afterComplete: function () {
        refreshEpisodeStatusBadges();
      },
      afterError: function () {
        refreshEpisodeStatusBadges();
      }
    });
  }

  async function sbGenAllEpisodes(btn) {
    if (!btn) return;
    var ok = window.confirm("将按顺序生成全剧（仅处理已分析且有分镜的集），耗时较长。是否继续？");
    if (!ok) return;

    setVideoGenButtonsBusy("all", true);
    showGlobalGenStatus("全剧生成中…");

    const poller = new TaskPoller(PID);
    poller.start({
      onProgress: (progress, message) => {
        const p = Number(progress);
        const pctText = Number.isFinite(p) && p > 0 ? ` ${Math.round(p)}%` : "";
        showGlobalGenStatus(
          message ? `全剧生成中 · ${message}${pctText}` : `全剧生成中${pctText}`
        );
      },
      onComplete: async () => {
        hideGlobalGenStatus();
        toast("全剧生成完成，正在刷新页面...", false);
        setTimeout(() => location.reload(), 1600);
      },
      onError: (message) => {
        hideGlobalGenStatus();
        showProjectErrorPanel("全剧生成失败", message);
        setVideoGenButtonsBusy(null, false);
      }
    });

    try {
      if (SB_EP) {
        await persistVisibleEpisodeDrafts(SB_EP, { silent: true });
      }
      await postJSON(
        "/api/projects/" + encodeURIComponent(PID) + "/episodes/generate_all_videos",
        { video_max_workers: 6, skip_existing_final: true }
      );
    } catch (e) {
      poller.stop();
      state.error("生成失败", 3000);
      showProjectErrorPanel("全剧生成失败", (e && e.message) || String(e));
      setVideoGenButtonsBusy(null, false);
    }
  }

  // 暴露到全局作用域
  window.sbGenCurrentEpisode = sbGenCurrentEpisode;
  window.sbGenEpisodeDirect = sbGenEpisodeDirect;
  window.sbGenAllEpisodes = sbGenAllEpisodes;
  window.toggleExtremeNoSpace = toggleExtremeNoSpace;
  window.topnavStepKeydown = topnavStepKeydown;

  async function syncVideos() {
    if (!SB_EP) {
      toast("请先选择分集", true);
      return;
    }
    try {
      const resp = await fetch(`/api/projects/${PID}/episodes/${SB_EP}/sync_videos`, {
        method: "POST",
      });
      const data = await resp.json();
      if (data.ok) {
        const count = data.synced || 0;
        if (count > 0) {
          toast(`已同步 ${count} 个视频文件状态，页面将刷新`, false);
          setTimeout(() => window.location.reload(), 1500);
        } else {
          toast("所有视频状态已是最新，无需同步", false);
        }
      } else {
        toast(data.error || "同步失败", true);
      }
    } catch (e) {
      toast("同步失败: " + e.message, true);
    }
  }

  // 暴露到全局作用域
  window.syncVideos = syncVideos;

async function concatEpPreview(ep) {
  const resp = await fetch(
    `/api/projects/${encodeURIComponent(PID)}/episodes/${encodeURIComponent(ep)}/concat`,
    { method: "POST" }
  );
  let data = {};
  try {
    data = await resp.json();
  } catch (_) {}
  if (!resp.ok) {
    const detail = data && (data.detail || data.error);
    throw new Error(typeof detail === "string" ? detail : `HTTP ${resp.status}`);
  }
  if (!data.ok) {
    throw new Error((data && data.error) || "拼接失败");
  }
  clearEpisodeNeedsRegen(ep);
  renderEpisodeRegenNotice("g");
  return data;
}

function openSbPreviewModal() {
    const bd = document.getElementById("sb-modal-preview");
    const body = document.getElementById("sb-preview-body");
    if (!bd || !body) return;
    bd.classList.add("on");

    let ep = SB_EP;
    try {
      const q = new URLSearchParams(window.location.search || "");
      const sbEp = parseInt(q.get("sb_ep"), 10);
      if (Number.isFinite(sbEp) && sbEp > 0) ep = sbEp;
    } catch (_) {}

    // 本地 Demo：直接使用静态下载列表，不请求后端 API
    var items = (SB_DL_ITEMS && SB_DL_ITEMS.length) ? SB_DL_ITEMS : [];
    if (ep) {
      // 按当前集过滤：href 中包含 "/集数/" 模式
      var epPattern = "/" + ep + "/";
      var filtered = items.filter(function (it) {
        return it.href && it.href.indexOf(epPattern) !== -1;
      });
      if (filtered.length) items = filtered;
    }

    body.innerHTML = "";
    if (!items.length) {
      body.innerHTML = '<p class="sb-muted">当前集暂无可预览的视频（本地 Demo 模式）。</p>';
      return;
    }
    items.forEach(function (row) {
      var h = document.createElement("p");
      h.style.margin = "10px 0 4px";
      h.style.fontWeight = "600";
      h.textContent = row.label || "视频片段";
      body.appendChild(h);
      var v = document.createElement("video");
      v.controls = true;
      v.style.width = "100%";
      v.style.maxHeight = "220px";
      v.style.borderRadius = "8px";
      v.style.border = "1px solid var(--bd)";
      v.src = row.href || "";
      body.appendChild(v);
    });
  }

  function closeSbPreviewModal() {
    const bd = document.getElementById("sb-modal-preview");
    if (bd) bd.classList.remove("on");
  }

  function openSbDownloadModal() {
    const pending = getEpisodeRegenShots(SB_EP);
    if (pending.length) {
      const ok = confirm(
        `当前集有 ${pending.length} 个镜头版本已更新，下载结果可能不是最新。\n建议先点“本集预览”，系统会自动重新拼接后再下载。\n\n是否仍继续查看下载链接？`
      );
      if (!ok) return;
    }
    const bd = document.getElementById("sb-modal-dl");
    const body = document.getElementById("sb-dl-body");
    if (!bd || !body) return;
    body.innerHTML = "";
    if (!SB_DL_ITEMS || !SB_DL_ITEMS.length) {
      const li = document.createElement("li");
      li.className = "sb-muted";
      li.textContent = "当前无可下载的视频链接（请先生成镜头或成片）。";
      body.appendChild(li);
    } else {
      SB_DL_ITEMS.forEach(function (it) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = it.href;
        a.textContent = it.label + " — " + it.href;
        a.target = "_blank";
        a.rel = "noopener";
        li.appendChild(a);
        body.appendChild(li);
      });
    }
    bd.classList.add("on");
  }

  function closeSbDownloadModal() {
    const bd = document.getElementById("sb-modal-dl");
    if (bd) bd.classList.remove("on");
  }

  // ========== 已废弃：手动添加参考图功能 ==========
  // 参考图现在完全由 prompt 中的 @[资产名] 自动解析
  // 保留代码以防将来需要恢复此功能
  /*
  function sbAddRefPath(btn) {
    const wrap = btn && btn.closest ? btn.closest(".sb-shot-section") : null;
    if (!wrap || !btn) return;

    const inp = wrap.querySelector(".sb-ref-add-input");
    const ta = wrap.querySelector(".sb-shot-editor textarea[data-field='ref_imgs']");
    const strip = wrap.querySelector(".sb-ref-strip");
    if (!inp || !ta || !strip) return;

    const v = String(inp.value || "").trim();
    if (!v) {
      toast("请输入或选择路径", true);
      return;
    }

    const lines = refTextToList(ta);
    if (lines.indexOf(v) >= 0) {
      toast("路径已存在", true);
      return;
    }

    // 创建按钮状态管理器
    const state = new ButtonStateManager(btn);
    const originalText = btn.textContent;

    // 添加参考图
    lines.push(v);
    ta.value = lines.join("\n");
    inp.value = "";

    const cell = document.createElement("div");
    cell.className = "sb-ref-cell";
    const im = document.createElement("img");
    im.src = "/files/" + PID + "/" + v;
    im.alt = "";
    const cap = document.createElement("div");
    cap.className = "sb-ref-cap mono";
    cap.textContent = v;
    cell.appendChild(im);
    cell.appendChild(cap);
    strip.appendChild(cell);

    // 显示成功状态
    state.success("✓ 已添加", 1000);
    toast("已加入参考（请点保存本镜头落盘）", false);
  }

  // 暴露到全局作用域
  // window.sbAddRefPath = sbAddRefPath;
  */
  // ========== 已废弃功能结束 ==========

  document.addEventListener("DOMContentLoaded", function () {
    var h = location.hash || "";
    if (!h.startsWith("#sb-shot-")) return;
    try {
      var el = document.getElementById(h.slice(1));
      if (!el) return;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          el.scrollIntoView({ block: "start", behavior: "smooth" });
        });
      });
    } catch (_) {}
  });

function isAssetPipelineTaskName(taskName) {
  const tn = String(taskName || "").trim();
  return (
    tn === "adapt_entities" ||
    tn === "generate_asset_review_batch" ||
    tn === "generate_confirmed_asset_group_remaining" ||
    tn === "generate_all_assets"
  );
}

function bootstrapAssetPipelineFromSSR() {
  if (!ASSET_ACTIONS_ENABLED) return;
  if (ASSET_ADAPT_RUNNING_SSR) {
    setAssetPipelineBusy("adapt", true);
    return;
  }
  if (!ASSET_BATCH_RUNNING_SSR) return;
  assetGenerateAwaitServerDone = true;
  assetGenerateForceRegenerate = ASSET_BATCH_FORCE_REGEN_SSR;
  if (ASSET_BATCH_TASK_SSR === "remaining") {
    setAssetPipelineBusy("gen_remaining", true);
    return;
  }
  setAssetPipelineBusy("review_batch", true);
}

// ==================== 页面加载时自动恢复进度 ====================
document.addEventListener("DOMContentLoaded", async function() {
  restoreAdaptRequirementsAfterReload();
  initAdaptRequirementsTextarea();
  bootstrapAssetPipelineFromSSR();

  // 初始化实体改编按钮上的进度展示（静态初值；进行中任务不覆盖 SSR 文案）
  if (TOTAL_ASSETS > 0 && !ASSET_ADAPT_RUNNING_SSR) {
    const initDone = countAdaptedAssets(window.PAGE_DATA.asset || {});
    const btn = document.getElementById("btn-asset-adapt");
    if (btn && (btn.textContent || "").includes("重新实体改编")) {
      updateAssetAdaptProgressOnButton(initDone, TOTAL_ASSETS, "重新实体改编");
    }
  }

  // 检查是否有正在进行的任务（与 SSR 对齐并启动轮询）
  try {
    const res = await fetch(`/api/projects/${PID}/status`);
    const status = await res.json();
    const taskName = status.task_name || "";

    if (status.status === "running") {
      autoResumeProgress(status);
    } else if (status.status === "stale") {
      if (isAssetPipelineTaskName(taskName)) {
        autoResumeProgress(status);
      } else {
        setAssetPipelineBusy(null, false);
        stopAssetGenerateProgressTracker();
      }
      if (isAssetPipelineTaskName(taskName)) {
        toast("检测到任务长时间无进展，正在尝试恢复…", true, 5000);
        tryRecoverStuckAssetTask();
      }
    } else {
      setAssetPipelineBusy(null, false);
      bootstrapEpisodeStatusForCurrentTab();
    }
  } catch (e) {
    console.error("Failed to check task status on load:", e);
    if (ASSET_ADAPT_RUNNING_SSR || ASSET_BATCH_RUNNING_SSR) {
      bootstrapAssetPipelineFromSSR();
    } else {
      setAssetPipelineBusy(null, false);
    }
    bootstrapEpisodeStatusForCurrentTab();
  }

  // 无论当前是否有其它分集任务在跑，都回填当前分集已落盘视频预览（避免 Stub 假阴性）
  await hydrateEpisodeShotPreviews(SB_EP);
  // 预览回填后再恢复单镜头任务，避免按钮被 updateShotPreview 重置
  await resumePersistedShotTasks();
  await resumePersistedAssetTasks();

  refreshEpisodeStatusBadges();
  setInterval(refreshEpisodeStatusBadges, 3000);
});

function autoResumeProgress(status) {
  const taskName = status.task_name || '';
  const message = status.message || '';

  if (taskName === 'analyze_videos') {
    resumeAnalyzeProgress();
  } else if (taskName === 'adapt_entities') {
    resumeAssetAdaptProgress();
  } else if (taskName === 'generate_asset_review_batch') {
    resumeAssetReviewBatchProgress(status);
  } else if (taskName === 'generate_confirmed_asset_group_remaining') {
    resumeAssetRemainingProgress(status);
  } else if (taskName === 'generate_all_assets') {
    resumeAssetReviewBatchProgress(status);
  } else if (taskName === 'adapt_episode_all' || taskName === 'adapt_episode_continue') {
    // 全集改编或继续改编
    resumeSmartAdaptProgress(taskName);
  } else if (taskName.startsWith('adapt_episode_')) {
    const ep = parseInt(taskName.replace('adapt_episode_', ''), 10);
    if (Number.isFinite(ep)) resumeEpisodeAdaptProgress(ep);
  } else if (taskName.startsWith('generate_episode_missing_')) {
    const ep = parseInt(taskName.replace('generate_episode_missing_', ''), 10);
    if (Number.isFinite(ep) && Number(ep) === Number(SB_EP)) {
      resumeEpisodeVideoProgress(ep);
    }
  } else if (taskName.startsWith('generate_episode_')) {
    const ep = parseInt(taskName.replace('generate_episode_', ''), 10);
    if (Number.isFinite(ep) && Number(ep) === Number(SB_EP)) {
      resumeEpisodeVideoProgress(ep);
    }
  } else if (taskName === 'generate_all_episodes') {
    resumeAllEpisodesVideoProgress();
  } else {
    // 降级兼容：用 message 文本匹配（兼容旧状态文件）
    if (message.includes('分析')) {
      resumeAnalyzeProgress();
    } else if (message.includes('改编实体') || (message.includes('改编') && !message.includes('第') )) {
      resumeAssetAdaptProgress();
    } else if (message.includes('改编') && message.includes('第') && message.includes('集')) {
      const match = message.match(/第(\d+)集/);
      if (match) resumeEpisodeAdaptProgress(parseInt(match[1]));
    } else if (message.includes('首图')) {
      resumeAssetReviewBatchProgress(status);
    } else if (message.includes('剩余') && message.includes('服装')) {
      resumeAssetRemainingProgress(status);
    } else if (message.includes('生成素材图')) {
      resumeAssetReviewBatchProgress(status);
    } else if (message.includes('生成') && message.includes('全剧')) {
      resumeAllEpisodesVideoProgress();
    } else if (message.includes('生成') && message.includes('第') && message.includes('集')) {
      const match = message.match(/第(\d+)集/);
      if (match) {
        const ep = parseInt(match[1], 10);
        if (Number.isFinite(ep) && Number(ep) === Number(SB_EP)) {
          resumeEpisodeVideoProgress(ep);
        }
      }
    }
  }
}

function resumeAnalyzeProgress() {
  const btn = document.getElementById("btn-analyze-full");
  if (!btn) return;

  btn.disabled = true;
  btn.classList.remove("btn-analyze-go", "ba");
  btn.classList.add("btn-analyze-busy");
  btn.textContent = "分析中...";

  const poller = new TaskPoller(PID);
  poller.start({
    onProgress: (progress, message) => {
      btn.textContent = formatTaskProgressText("分析中", progress, message);
    },
    onComplete: (message) => {
      toast("全集分析完成", false);
      setTimeout(() => reloadProjectStripStoryboardParams(), 1000);
    },
    onError: (message) => {
      toast(`分析失败: ${message}`, true);
      setTimeout(() => reloadProjectStripStoryboardParams(), 2000);
    }
  });
}

function resumeAssetAdaptProgress() {
  const btn = document.getElementById("btn-asset-adapt");
  const reviewBtn = document.getElementById("btn-asset-review-batch");
  if (!btn || !reviewBtn) return;

  setAssetPipelineBusy("adapt", true);
  startAssetAdaptProgressTracker("实体改编中");

  const poller = new TaskPoller(PID);
  poller.start({
    onProgress: (progress, message) => {
      btn.textContent = formatTaskProgressText("改编中", progress, message);
    },
    onComplete: (message) => {
      stopAssetAdaptProgressTracker("实体改编完成");
      toast("实体改编完成", false);
      setTimeout(() => reloadProjectStripStoryboardParams("asset"), 1000);
    },
    onError: (message) => {
      stopAssetAdaptProgressTracker("实体改编失败");
      toast(`改编失败: ${message}`, true);
      setTimeout(() => reloadProjectStripStoryboardParams("asset"), 2000);
    }
  });
}

function resumeAssetReviewBatchProgress(initialStatus) {
  const btn = document.getElementById("btn-asset-review-batch");
  const adaptBtn = document.getElementById("btn-asset-adapt");
  if (!btn || !adaptBtn) return;

  const status = initialStatus || {};
  const forceRegen = Boolean(status.force_regenerate);
  const msg = String(status.message || "");
  const label = forceRegen || msg.indexOf("重新生成") >= 0 ? "重新生成首图中" : "生成首图中";

  setAssetPipelineBusy("review_batch", true);
  assetGenerateAwaitServerDone = true;
  startAssetGenerateProgressTracker(label, "review_batch", {
    forceRegenerate: forceRegen,
    awaitServerDone: true,
  });

  const poller = new TaskPoller(PID);
  poller.start({
    onProgress: (progress, message) => {
      btn.textContent = formatTaskProgressText(forceRegen ? "重新生成首图" : "生成首图", progress, message);
    },
    onComplete: (message) => {
      const doneLabel = forceRegen || (message && message.indexOf("重新生成") >= 0)
        ? "首图重新生成完成"
        : "首图批次完成";
      stopAssetGenerateProgressTracker(doneLabel);
      setAssetPipelineBusy(null, false);
      toast(message || (forceRegen ? "首图已重新生成" : "首图批次已生成"), false);
      setTimeout(() => reloadProjectStripStoryboardParams("asset"), 1000);
    },
    onError: (message) => {
      stopAssetGenerateProgressTracker("首图生成失败");
      setAssetPipelineBusy(null, false);
      toast(`首图生成失败: ${message}`, true);
      if (!forceRegen) {
        tryRecoverStuckAssetTask().then(function (recovered) {
          if (!recovered) {
            setTimeout(() => reloadProjectStripStoryboardParams("asset"), 2000);
          }
        });
      } else {
        setTimeout(() => reloadProjectStripStoryboardParams("asset"), 2000);
      }
    }
  });
}

function resumeAssetRemainingProgress(initialStatus) {
  const btn = document.getElementById("btn-asset-gen-remaining");
  const adaptBtn = document.getElementById("btn-asset-adapt");
  if (!btn || !adaptBtn) return;

  const status = initialStatus || {};
  const forceRegen = Boolean(status.force_regenerate);
  const msg = String(status.message || "");
  const label = forceRegen || msg.indexOf("重新生成") >= 0 ? "重新生成剩余资产中" : "生成剩余资产中";

  setAssetPipelineBusy("gen_remaining", true);
  assetGenerateAwaitServerDone = true;
  startAssetGenerateProgressTracker(label, "remaining", {
    forceRegenerate: forceRegen,
    awaitServerDone: true,
  });

  const poller = new TaskPoller(PID);
  poller.start({
    onProgress: (progress, message) => {
      btn.textContent = formatTaskProgressText(forceRegen ? "重新生成剩余资产" : "生成剩余资产", progress, message);
    },
    onComplete: (message) => {
      const doneLabel = forceRegen || (message && message.indexOf("重新生成") >= 0)
        ? "剩余资产重新生成完成"
        : "剩余资产生成完成";
      stopAssetGenerateProgressTracker(doneLabel);
      setAssetPipelineBusy(null, false);
      toast(message || (forceRegen ? "剩余资产已重新生成" : "剩余资产已生成"), false);
      setTimeout(() => reloadProjectStripStoryboardParams("asset"), 1000);
    },
    onError: (message) => {
      stopAssetGenerateProgressTracker("剩余资产生成失败");
      setAssetPipelineBusy(null, false);
      toast(`剩余资产生成失败: ${message}`, true);
      if (!forceRegen) {
        maybeRecoverAssetGenerateIfComplete(
          computeAssetGenerateProgressDone(window.PAGE_DATA.asset || {}),
          getAssetGenerateProgressTotal()
        ).then(function (recovered) {
          if (!recovered) {
            setTimeout(() => reloadProjectStripStoryboardParams("asset"), 2000);
          }
        });
      } else {
        setTimeout(() => reloadProjectStripStoryboardParams("asset"), 2000);
      }
    }
  });
}

function resumeAssetGenerateProgress() {
  resumeAssetReviewBatchProgress();
}

function resumeEpisodeAdaptProgress(ep) {
  const btn = document.querySelector(`.ast-sb-adapt-btn[data-ep="${ep}"]`);
  if (!btn) return;

  setAdaptRequirementsLocked(true);
  btn.disabled = true;
  btn.textContent = `改编中 - 正在改编第${ep}集...`;
  btn.classList.add("ast-sb-adapt-btn--busy");

  const poller = new TaskPoller(PID);
  const epMessage = `正在改编第${ep}集...`;
  poller.start({
    onProgress: (progress, message) => {
      btn.textContent = formatTaskProgressText("改编中", progress, epMessage);
    },
    onComplete: (message) => {
      setAdaptRequirementsLocked(false);
      toast("本集改编完成", false);
      setTimeout(function () {
        stashAdaptRequirementsForReload();
        location.reload();
      }, 1000);
    },
    onError: (message) => {
      setAdaptRequirementsLocked(false);
      toast(`改编失败: ${message}`, true);
      setTimeout(() => location.reload(), 2000);
    }
  });
}

function resumeEpisodeVideoProgress(ep) {
  setVideoGenButtonsBusy("current", true);
  stopActiveEpisodeStatusPoller();

  const shotsPoller = new ShotsProgressPoller(PID, ep);
  shotsPoller.start({
    onProgress: (generated, total) => {
      updateEpisodeProgressUI(ep, generated, total);
    },
    onShotGenerated: (sid, filePath) => {
      if (ep === SB_EP) updateShotPreview(sid, filePath);
    }
  });

  const episodeStatusPoller = new EpisodeStatusPoller(PID, ep);
  ACTIVE_EPISODE_STATUS_POLLER = episodeStatusPoller;
  episodeStatusPoller.start({
    onProgress: (status) => {
      applyEpisodeVideoStatus(ep, status);
    },
    onComplete: () => {},
    onError: (status) => {
      if (status) applyEpisodeVideoStatus(ep, status);
    }
  });

  // 任务级别轮询
  const taskPoller = new TaskPoller(PID);
  taskPoller.start({
    onProgress: () => {},
    onComplete: (message) => {
      episodeStatusPoller.stop();
      if (ACTIVE_EPISODE_STATUS_POLLER === episodeStatusPoller) {
        ACTIVE_EPISODE_STATUS_POLLER = null;
      }
      shotsPoller.stop();
      hideGlobalGenStatus();
      toast("本集视频生成已完成", false);
      setTimeout(() => location.reload(), 1000);
    },
    onError: (message) => {
      episodeStatusPoller.stop();
      if (ACTIVE_EPISODE_STATUS_POLLER === episodeStatusPoller) {
        ACTIVE_EPISODE_STATUS_POLLER = null;
      }
      shotsPoller.stop();
      hideGlobalGenStatus();
      setVideoGenButtonsBusy(null, false);
      toast(`生成失败: ${message}`, true);
    }
  });
}

function resumeAllEpisodesVideoProgress() {
  stopActiveEpisodeStatusPoller();
  setVideoGenButtonsBusy("all", true);
  showGlobalGenStatus("全剧生成中…");

  const poller = new TaskPoller(PID);
  poller.start({
    onProgress: (progress, message) => {
      const p = Number(progress);
      const pctText = Number.isFinite(p) && p > 0 ? ` ${Math.round(p)}%` : "";
      showGlobalGenStatus(
        message ? `全剧生成中 · ${message}${pctText}` : `全剧生成中${pctText}`
      );
    },
    onComplete: () => {
      hideGlobalGenStatus();
      toast("全剧生成完成", false);
      setTimeout(() => location.reload(), 1000);
    },
    onError: (message) => {
      hideGlobalGenStatus();
      setVideoGenButtonsBusy(null, false);
      toast(`全剧生成失败: ${message}`, true);
    }
  });
}

function bootstrapEpisodeStatusForCurrentTab() {
  if (CURRENT_VIEW !== "video" || !SB_EP) return;
  stopActiveEpisodeStatusPoller();
  const poller = new EpisodeStatusPoller(PID, SB_EP);
  ACTIVE_EPISODE_STATUS_POLLER = poller;
  poller.start({
    onProgress: (status) => {
      applyEpisodeVideoStatus(SB_EP, status);
    },
    onComplete: () => {
      if (ACTIVE_EPISODE_STATUS_POLLER === poller) {
        ACTIVE_EPISODE_STATUS_POLLER = null;
      }
      hideGlobalGenStatus();
    },
    onError: (status) => {
      if (status) {
        applyEpisodeVideoStatus(SB_EP, status);
      }
      if (ACTIVE_EPISODE_STATUS_POLLER === poller) {
        ACTIVE_EPISODE_STATUS_POLLER = null;
      }
    }
  });
}

function shotIdToSegLabel(sid) {
  const raw = String(sid || "").trim();
  if (!raw) return "";
  const num = parseInt(raw, 10);
  if (Number.isFinite(num)) return `片段${String(num).padStart(2, "0")}`;
  return `片段${raw}`;
}

function formatRunningSegLabels(shotIds) {
  const labels = (Array.isArray(shotIds) ? shotIds : [])
    .map((sid) => shotIdToSegLabel(sid))
    .filter(Boolean);
  return labels.join("/");
}

function getRunningShotIdsFromStatus(status) {
  if (!status || !Array.isArray(status.current_shot_ids)) return [];
  return status.current_shot_ids.map((x) => String(x || "").trim()).filter(Boolean);
}

function getLocalRunningShotIdsForEp(ep) {
  const epStr = String(ep);
  const ids = new Set();
  SHOT_TASK_STREAMS.forEach((_holder, key) => {
    const parts = String(key).split(":");
    if (parts[0] === epStr && parts[1]) ids.add(parts[1]);
  });
  _getPersistedTasks().forEach((task) => {
    if (String(task.ep) === epStr && task.sid) ids.add(String(task.sid));
  });
  document
    .querySelectorAll(`.sb-shot-section[data-ep="${epStr}"] .sb-gen-big[data-generating="1"]`)
    .forEach((btn) => {
      const section = btn.closest(".sb-shot-section");
      const sid = section && section.getAttribute("data-sid");
      if (sid) ids.add(String(sid));
    });
  return Array.from(ids);
}

function mergeRunningShotIds(status, ep) {
  const merged = new Set(getRunningShotIdsFromStatus(status));
  getLocalRunningShotIdsForEp(ep).forEach((sid) => merged.add(sid));
  return Array.from(merged);
}

function formatTopBarGeneratingText(shotIds) {
  const segPart = formatRunningSegLabels(shotIds);
  return segPart ? `生成中… · ${segPart}` : "生成中…";
}

function updateEpisodeProgressUI(ep, succeeded, total) {
  const progressText = document.querySelector(`[data-ep-progress="${String(ep)}"]`);
  if (progressText) {
    progressText.textContent = `${succeeded}/${total || 0}`;
  }
  const progressFill = document.querySelector(`[data-ep-progress-fill="${String(ep)}"]`);
  if (progressFill) {
    const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((succeeded / total) * 100))) : 0;
    progressFill.style.width = `${pct}%`;
  }
}

function applyRunningShotNavHighlights(ep, shotIds) {
  if (Number(ep) !== Number(SB_EP)) return;
  const idSet = new Set((Array.isArray(shotIds) ? shotIds : []).map((sid) => String(sid)));
  document.querySelectorAll(".sb-shot-item[data-sid]").forEach((item) => {
    const sid = item.getAttribute("data-sid");
    item.classList.toggle("is-running", !!(sid && idSet.has(String(sid))));
  });
}

function setShotGeneratingStatus(sid, generating) {
  const shotSection = document.getElementById("sb-shot-" + sid);
  if (!shotSection) return;
  const statusEl = shotSection.querySelector(".sb-gen-status");
  if (!statusEl) return;
  if (generating) {
    statusEl.textContent = "生成中…";
    statusEl.classList.add("is-running");
    statusEl.classList.remove("ok");
    return;
  }
  statusEl.classList.remove("is-running");
}

function restoreShotGenStatusEl(shotSection) {
  if (!shotSection) return;
  const statusEl = shotSection.querySelector(".sb-gen-status");
  const genBtn = shotSection.querySelector(".sb-gen-big");
  if (!statusEl) return;
  statusEl.classList.remove("is-running");
  const hasVideo = genBtn && genBtn.getAttribute("data-has-video") === "1";
  if (hasVideo) {
    statusEl.textContent = "已生成 · 可预览";
    statusEl.classList.add("ok");
  } else {
    statusEl.textContent = "未生成 / 排队中（Stub）";
    statusEl.classList.remove("ok");
  }
}

function applyEpisodeRowUI(ep, status) {
  const st = String(status && status.status || "");
  const badge = document.querySelector(`[data-ep-status="${String(ep)}"]`);
  const spinner = document.querySelector(`[data-ep-spinner="${String(ep)}"]`);
  const epItem = document.querySelector(`.sb-ep-item[data-ep="${String(ep)}"]`);

  if (spinner) spinner.hidden = st !== "running";
  if (epItem) epItem.classList.toggle("is-ep-running", st === "running");

  if (badge) {
    if (st === "running") {
      badge.textContent = "";
      badge.hidden = true;
      badge.classList.remove("is-running", "is-completed", "is-partial_failed", "is-failed");
    } else {
      badge.hidden = false;
      badge.textContent = episodeStatusText(status);
      badge.classList.remove("is-running", "is-completed", "is-partial_failed", "is-failed");
      const cls = episodeBadgeClass(status);
      if (cls) badge.classList.add(cls);
    }
  }

  const succeeded = Number(status && status.succeeded_shots || 0);
  const total = Number(status && status.total_shots || 0);
  updateEpisodeProgressUI(ep, succeeded, total);
  setEpisodeActionState(ep, status);
  applyRunningShotNavHighlights(ep, mergeRunningShotIds(status, ep));
}

function applyEpisodeVideoStatus(ep, status) {
  applyEpisodeRowUI(ep, status || {});
  if (Number(ep) === Number(SB_EP)) {
    syncCurrentEpisodeButton(status || {});
  }
}

async function refreshCurrentEpisodeTopBar() {
  if (!SB_EP) return;
  try {
    const res = await fetch(`/api/projects/${PID}/episodes/${SB_EP}/status`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    syncCurrentEpisodeButton(await res.json());
  } catch (_) {
    syncCurrentEpisodeButton({});
  }
}

function syncTopBarForShotTask(ep, sid) {
  if (Number(ep) !== Number(SB_EP)) return;
  syncCurrentEpisodeButton({}, { runningShotIds: mergeRunningShotIds({}, ep) });
  applyRunningShotNavHighlights(ep, mergeRunningShotIds({}, ep));
  if (sid) setShotGeneratingStatus(sid, true);
}

function episodeStatusText(status) {
  const st = String(status && status.status || "");
  const succeeded = Number(status && status.succeeded_shots || 0);
  const total = Number(status && status.total_shots || 0);
  if (st === "running") return "";
  if (st === "stale") return "疑似中断";
  if (st === "completed") return "已完成";
  if (st === "partial_failed") return "部分失败";
  if (st === "failed") return "失败";
  if (total > 0 && succeeded > 0) return "待继续";
  return "待生成";
}

function episodeBadgeClass(status) {
  const st = String(status && status.status || "");
  if (st === "running") return "";
  if (st === "stale") return "is-failed";
  if (st === "completed") return "is-completed";
  if (st === "partial_failed") return "is-partial_failed";
  if (st === "failed") return "is-failed";
  return "";
}

function syncCurrentEpisodeButton(status, opts) {
  opts = opts || {};
  const btn = document.getElementById("btn-gen-current-ep");
  if (!btn || !SB_EP) return;

  const st = String(status && status.status || "");
  const runningIds = Array.isArray(opts.runningShotIds)
    ? opts.runningShotIds.map((sid) => String(sid || "").trim()).filter(Boolean)
    : mergeRunningShotIds(status, SB_EP);
  const episodeRunning = st === "running";
  const singleShotRunning = !episodeRunning && runningIds.length > 0;

  if (episodeRunning || singleShotRunning) {
    btn.disabled = true;
    btn.classList.add("btn-loading");
    btn.textContent = formatTopBarGeneratingText(runningIds);
    btn.title = runningIds.length
      ? `第${SB_EP}集 · ${formatRunningSegLabels(runningIds)}`
      : `第${SB_EP}集正在生成`;
    return;
  }

  btn.classList.remove("btn-loading");
  if (st === "stale") {
    btn.disabled = false;
    btn.textContent = "继续生成未完成镜头";
    btn.setAttribute("data-default-text", "继续生成未完成镜头");
    btn.setAttribute("data-generate-mode", "resume_missing");
    const staleSeconds = Number(status && status.stale_seconds || 0);
    const staleMinutes = staleSeconds > 0 ? Math.ceil(staleSeconds / 60) : null;
    btn.title = staleMinutes ? `第${SB_EP}集疑似中断（约 ${staleMinutes} 分钟无进展）` : `第${SB_EP}集疑似中断`;
    return;
  }
  btn.setAttribute("data-generate-mode", "full");
  btn.disabled = false;
  btn.removeAttribute("title");
  if (st === "completed" || st === "partial_failed" || st === "failed") {
    btn.textContent = "重新生成当前剧集";
    btn.setAttribute("data-default-text", "重新生成当前剧集");
    return;
  }
  btn.textContent = "生成当前剧集";
  btn.setAttribute("data-default-text", "生成当前剧集");
}

function setEpisodeActionState(ep, status) {
  const btn = document.querySelector(`[data-ep-generate="${String(ep)}"]`);
  if (!btn) return;
  const st = String(status && status.status || "");
  btn.classList.remove("btn-loading");
  btn.disabled = false;
  btn.textContent = "生成";
  if (st === "running") {
    btn.disabled = true;
    btn.classList.add("btn-loading");
    btn.setAttribute("data-generate-mode", "full");
    return;
  }
  if (st === "stale") {
    btn.textContent = "继续未完成";
    btn.setAttribute("data-generate-mode", "resume_missing");
    return;
  }
  btn.setAttribute("data-generate-mode", "full");
  if (st === "failed" || st === "partial_failed") {
    btn.textContent = "重试";
    return;
  }
  if (st === "completed") {
    btn.textContent = "重生成";
  }
}

// ==================== DEMO 预置生成状态 ====================
// 字段名与 applyEpisodeRowUI/episodeStatusText 期望一致：succeeded_shots/total_shots/current_shot_ids
var _DEMO_EP_COUNTS = { 1: 12, 2: 14, 3: 17, 4: 13, 5: 12, 6: 12, 7: 11, 8: 15, 9: 8, 10: 9 };
var _DEMO_EP_STATUS = {
  1:  { status: 'running',        succeeded_shots: 10, total_shots: 12, current_shot_ids: ['11', '12'] },
  2:  { status: 'running',        succeeded_shots: 8,  total_shots: 14, current_shot_ids: ['9', '10'] },
  3:  { status: 'pending',        succeeded_shots: 0,  total_shots: 17, current_shot_ids: [] },
  4:  { status: 'pending',        succeeded_shots: 0,  total_shots: 13, current_shot_ids: [] },
  5:  { status: 'running',        succeeded_shots: 3,  total_shots: 12, current_shot_ids: ['4', '5'] },
  6:  { status: 'partial_failed', succeeded_shots: 7,  total_shots: 12, current_shot_ids: [] },
  7:  { status: 'pending',        succeeded_shots: 0,  total_shots: 11, current_shot_ids: [] },
  8:  { status: 'pending',        succeeded_shots: 0,  total_shots: 15, current_shot_ids: [] },
  9:  { status: 'completed',      succeeded_shots: 8,  total_shots: 8,  current_shot_ids: [] },
  10: { status: 'pending',        succeeded_shots: 0,  total_shots: 9,  current_shot_ids: [] }
};
// 某集 N 段的逐段状态数组（completed/generating/pending/failed），与 _DEMO_EP_STATUS 计数一致
function _demoEpisodeShotStatus(ep, n) {
  var st = _DEMO_EP_STATUS[ep];
  if (!st) return Array(n).fill('pending');
  var ok = Math.min(st.succeeded_shots, n);
  var running = Array.isArray(st.current_shot_ids) ? st.current_shot_ids.map(String) : [];
  var arr = [];
  for (var i = 0; i < n; i++) {
    var sid = String(i + 1);
    // generating 优先于 count 派生的 completed（支持"重新生成"进入生成中）
    if (running.indexOf(sid) >= 0) arr.push('generating');
    else if (i < ok) arr.push('completed');
    else if (st.status === 'partial_failed' && i === ok) arr.push('failed');
    else arr.push('pending');
  }
  return arr;
}
function _demoApplyEpisodePanelStatus(ep) {
  var st = _DEMO_EP_STATUS[ep] || { status: 'pending', succeeded_shots: 0, total_shots: _DEMO_EP_COUNTS[ep] || 0, current_shot_ids: [] };
  applyEpisodeRowUI(ep, st);
  if (Number(ep) === Number(window.SB_EP_LIVE || SB_EP)) syncCurrentEpisodeButton(st);
  // 同步当前集的逐段 UI（section 状态 + 侧栏圆点/spinner），避免状态刷新后失步
  if (Number(ep) === Number(window.SB_EP_LIVE || SB_EP)) _syncShotStatusUI(ep);
}

// 统一同步：根据 _DEMO_EP_STATUS 派生逐段状态，写入 section DOM + 侧栏圆点/spinner
// 这是分镜状态的唯一刷新入口，所有状态变更都应最终走到这里
function _syncShotStatusUI(ep) {
  var sections = document.querySelectorAll('.sb-all-shots > .sb-shot-section');
  if (!sections.length) return;
  var stMap = _demoEpisodeShotStatus(ep, sections.length);
  sections.forEach(function (sec, i) {
    // 新增分镜（data-status-manual）状态由用户操作管理，不按索引覆盖
    if (sec.getAttribute('data-status-manual') === '1') return;
    var newStatus = stMap[i] || 'pending';
    var oldStatus = sec.getAttribute('data-shot-status') || 'pending';
    sec.setAttribute('data-shot-status', newStatus);
    // 状态变化时才重渲染海报帧（避免反复重建 DOM）
    if (newStatus !== oldStatus && typeof window.renderVideoPlaceholder === 'function') {
      var opts = newStatus === 'completed' ? { status: 'ready' }
        : newStatus === 'generating' ? { status: 'generating' }
        : newStatus === 'failed' ? { status: 'empty' }
        : { status: 'pending' };
      window.renderVideoPlaceholder(sec, opts);
    }
  });
  _updateSidebarStatusDots();
}

// 让 running 集的进度条流动呼吸（活的生成网格）
var _demoRunningTimer = null;
var _demoRunningState = {};
function _demoAnimateRunningProgress() {
  if (_demoRunningTimer) return; // 已启动
  Object.keys(_DEMO_EP_STATUS).forEach(function (ep) {
    if (_DEMO_EP_STATUS[ep].status === 'running') _demoRunningState[ep] = _DEMO_EP_STATUS[ep].succeeded_shots;
  });
  _demoRunningTimer = setInterval(function () {
    Object.keys(_demoRunningState).forEach(function (ep) {
      var s = _DEMO_EP_STATUS[ep];
      if (!s || s.status !== 'running') return;
      var cur = _demoRunningState[ep];
      cur = Math.min(cur + 1, s.total_shots - s.current_shot_ids.length); // 封顶，保持生成中
      _demoRunningState[ep] = cur;
      s.succeeded_shots = cur;
      _demoApplyEpisodePanelStatus(Number(ep));
    });
  }, 4500);
}

async function refreshEpisodeStatusBadges() {
  var liveView = window.SB_VIEW_LIVE || CURRENT_VIEW;
  if (liveView !== "video" || !SB_EPISODE_NUMS.length) return;
  SB_EPISODE_NUMS.forEach(function (epNum) {
    var ep = Number(epNum);
    if (!Number.isFinite(ep) || ep <= 0) return;
    _demoApplyEpisodePanelStatus(ep);
  });
  _demoAnimateRunningProgress();
}

// ==================== 参考图实时同步 ====================

/**
 * 从文本中提取资产引用：@[id] 与无方括号的 @id（与资产页参考图解析一致）
 * @param {string} text - 提示词文本
 * @returns {Array<string>} - 资产名称列表（去重保序）
 */
function extractAssetMentions(text) {
  if (!text) return [];
  const seen = new Set();
  const matches = [];
  let m;
  const bracketRe = /@\[([^\]]+)\]/g;
  while ((m = bracketRe.exec(text)) !== null) {
    const id = m[1].trim();
    if (id && !seen.has(id)) {
      seen.add(id);
      matches.push(id);
    }
  }
  const bareRe = /[＠@](?!\[)[\s\u00a0\u200b-\u200d\ufeff]*([\w\u4e00-\u9fff-]+)/g;
  while ((m = bareRe.exec(text)) !== null) {
    const id = m[1].trim();
    if (id && !seen.has(id)) {
      seen.add(id);
      matches.push(id);
    }
  }
  return matches;
}

/**
 * 根据资产名称获取对应的文件路径和类型
 * @param {string} assetName - 资产名称（id_trans）
 * @returns {{path: string, type: 'image'|'video'}|null} - 文件路径和类型
 */
function getAssetFilePath(assetName) {
  const token = String(assetName || "").trim();
  if (!token) return null;

  // 允许在 video_ref_prompt 中直接引用视频相对路径：@[1/2.mp4]
  if (/\.(mp4|mov|avi|mkv|webm)$/i.test(token)) {
    return { path: token, type: 'video' };
  }

  // 也兼容直接引用图片路径：@[asset/A.png]
  if (/\.(png|jpg|jpeg|webp|gif)$/i.test(token)) {
    return { path: token, type: 'image' };
  }

  // 全局资产数据从页面传入
  const asset = window.PAGE_DATA?.asset;
  if (!asset) return null;

  // 在所有资产类型中查找
  for (const kind of ['characters', 'scenes', 'props']) {
    const items = asset[kind] || {};
    for (const [aid, data] of Object.entries(items)) {
      // 匹配 id_trans 或 id
      if (data.id_trans === assetName || data.id === assetName) {
        const path = data.file_path;
        if (!path) return null;

        // 根据文件扩展名判断类型
        const ext = path.split('.').pop().toLowerCase();
        const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
        const type = videoExts.includes(ext) ? 'video' : 'image';

        return { path, type };
      }
    }
  }
  return null;
}

/**
 * 从 prompt_trans 文本中解析所有 @[...] 提及，返回对应的图片 file_path 列表。
 * 这是方向 A 的核心：ref_imgs 完全由 prompt_trans 的 @ 提及决定。
 * - @[id_trans]   → 查资产库得到 file_path
 * - @[path/to/file.png] → 直接当路径用
 * - @[video.mp4]  → 忽略（ref_imgs 只存图片）
 */
function computeRefImgsFromPrompt(text) {
  const mentions = extractAssetMentions(text || '');
  const paths = [];
  const seen = new Set();
  mentions.forEach(function (id) {
    const result = getAssetFilePath(id);
    if (result && result.type === 'image' && result.path) {
      if (!seen.has(result.path)) {
        seen.add(result.path);
        paths.push(result.path);
      }
    }
  });
  return paths;
}

// ── DEMO 本地图片解析层 ──────────────────────────────────────────
// 将任意资产路径统一改写为本地 demo 可用的相对路径 images/X.png
// 输入形如 "asset/X.png" / "images/X.png" / "/files/PID/asset/X.png" / "X.png"
function _demoLocalImage(path) {
  // 单文件版：所有图片统一用占位图（运行时不再拼 images/ 路径，避免文件不存在）
  if (window.__DEMO_PLACEHOLDER_IMG__) return window.__DEMO_PLACEHOLDER_IMG__;
  var p = String(path || '').trim();
  if (!p) return '';
  p = p.replace(/^\/files\/[^/]+\/?/, '');   // 去掉 /files/PID/ 前缀
  var base = p.split('/').pop();              // 取 basename
  if (!base) return '';
  return 'images/' + base;
}

// 从改编分镜文本中挑一张场景图作为视频海报帧
function _demoPickPosterFromPrompt(text) {
  var mentions = extractAssetMentions(text || '');
  if (!mentions.length) return '';
  // 优先场景类（含环境/地点词）
  var sceneRe = /night|day|bright|warm|cold|sun|blue|courtyard|lobby|room|stair|garden|entrance|lounge|office|banquet|wedding|estate|mansion|hotel/i;
  var pick = mentions.find(function (m) { return sceneRe.test(m); });
  if (!pick) pick = mentions[0];
  var info = getAssetFilePath(pick);
  var raw = info && info.path ? info.path : (pick + '.png');
  return _demoLocalImage(raw);
}

/**
 * 从 prompt_trans 文本中解析所有 @[id_trans] 提及，返回对应的 entity_refs 结构。
 * 工作流在 prompt_trans_finalized=true 时读 entity_refs 来决定参考图，
 * 因此必须与 prompt 保持同步。
 *
 * 返回格式：{ characters: [原始中文ID, ...], scenes: [...], props: [...] }
 */
function computeEntityRefsFromPrompt(text) {
  const mentions = extractAssetMentions(text || '');
  const asset = window.PAGE_DATA && window.PAGE_DATA.asset;
  const refs = { characters: [], scenes: [], props: [] };
  if (!asset) return refs;

  const seenIds = new Set();
  mentions.forEach(function (idTrans) {
    for (const kind of ['characters', 'scenes', 'props']) {
      const items = asset[kind] || {};
      for (const [origId, data] of Object.entries(items)) {
        if (data.id_trans === idTrans || data.id === idTrans) {
          if (!seenIds.has(origId)) {
            seenIds.add(origId);
            refs[kind].push(origId);
          }
          return; // found, skip other kinds
        }
      }
    }
    // 直接路径（用户上传图）不属于 entity_refs，忽略
  });
  return refs;
}

function refPathBaseName(path) {
  const raw = String(path || "");
  const seg = raw.split("/").filter(Boolean);
  const filename = seg.length ? seg[seg.length - 1] : raw;
  const idx = filename.lastIndexOf(".");
  return idx > 0 ? filename.slice(0, idx) : filename;
}

function isLocalUploadedRefPath(path) {
  const s = String(path || "").trim();
  if (!s) return false;
  return s.startsWith("asset/refs/") || /(^|\/)refs\//.test(s);
}

function getAssetByToken(token) {
  const asset = window.PAGE_DATA?.asset;
  if (!asset) return null;
  const t = String(token || '').trim();
  if (!t) return null;
  for (const kind of ['characters', 'scenes', 'props']) {
    const items = asset[kind] || {};
    for (const [, data] of Object.entries(items)) {
      if (!data || typeof data !== 'object') continue;
      if (data.id_trans === t || data.id === t) {
        return {
          id: data.id,
          id_trans: data.id_trans,
          name_trans: data.name_trans || data.id_trans,
          kind: kind
        };
      }
    }
  }
  return null;
}

function buildRefSemanticKey(rawToken, fileInfo, resolvedPath) {
  const normalized = String(resolvedPath || '').trim();
  if (!normalized) return '';
  if (!fileInfo || fileInfo.type !== 'image') {
    return `path:${normalized}`;
  }
  if (isLocalUploadedRefPath(normalized)) {
    return `upload:${normalized}`;
  }
  const tokenAsset = getAssetByToken(rawToken);
  const pathAsset = getAssetByFilePath(normalized);
  const assetInfo = tokenAsset || pathAsset;
  if (assetInfo && assetInfo.id_trans) {
    return `asset:${assetInfo.kind}:${assetInfo.id_trans}`;
  }
  return `path:${normalized}`;
}

/**
 * 更新参考图显示
 * @param {HTMLElement} refStrip - 参考图容器
 * @param {Array<string>} assetNames - 资产名称列表
 */
function updateRefImages(refStrip, assetNames) {
  if (!refStrip) return;
  const shotSection = refStrip.closest('.sb-shot-section');
  const shotEp = shotSection ? String(shotSection.getAttribute('data-ep') || '') : '';
  const shotSid = shotSection ? String(shotSection.getAttribute('data-sid') || '') : '';

  // 获取或创建参考图容器
  let container = refStrip.querySelector('.sb-ref-cells');
  if (!container) {
    // 如果原来是空状态，移除空提示
    const emptyDiv = refStrip.parentElement.querySelector('.sb-ref-empty');
    if (emptyDiv) {
      emptyDiv.remove();
    }

    // 重建容器结构
    refStrip.innerHTML = '';
    container = refStrip;
  }

  // 清空现有内容
  container.innerHTML = '';

  // 如果没有引用，显示空状态
  if (assetNames.length === 0) {
    const parent = refStrip.parentElement;
    refStrip.remove();
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'sb-ref-empty';
    emptyDiv.innerHTML = '<p style="color: var(--t2); font-size: 13px; margin: 0;">暂无参考素材</p>';
    parent.insertBefore(emptyDiv, parent.querySelector('.sb-ref-hint'));
    return;
  }

  // 为每个资产添加参考素材（图片或视频）
  const seenSemanticKeys = new Set();
  assetNames.forEach(name => {
    let fileInfo = getAssetFilePath(name);
    // DEMO 兜底：getAssetFilePath 找不到时，尝试用名字直接拼本地图片
    if (!fileInfo) {
      const guess = 'images/' + String(name).replace(/[^A-Za-z0-9_.\-]/g, '_') + '.png';
      fileInfo = { path: guess, type: 'image' };
    }

    const resolvedPath = String(fileInfo.path || '').trim();
    const localSrc = _demoLocalImage(resolvedPath);   // DEMO：统一转本地相对路径
    const semanticKey = buildRefSemanticKey(name, fileInfo, resolvedPath);
    if (!resolvedPath || (semanticKey && seenSemanticKeys.has(semanticKey))) {
      return; // 语义去重：同一资产不同版本路径也只显示一份
    }
    if (semanticKey) seenSemanticKeys.add(semanticKey);

    // 创建参考素材卡片
    const cell = document.createElement('div');
    cell.className = 'sb-ref-cell';
    cell.setAttribute('data-type', fileInfo.type);

    const mediaTag = fileInfo.type === 'video'
      ? `<video src="${localSrc}" controls muted preload="metadata" style="width: 100%; height: 120px; object-fit: cover;"></video>`
      : `<img src="${localSrc}" alt="${name}" title="点击查看大图" data-lightbox-src="${localSrc}" onerror="this.style.opacity=.25" />`;

    const typeBadge = fileInfo.type === 'video'
      ? '<span class="sb-ref-type-badge sb-ref-type-video">视频</span>'
      : '<span class="sb-ref-type-badge">图</span>';
    const escPath = String(fileInfo.path || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const removeBtn = (fileInfo.type === 'image' && shotEp && shotSid)
      ? `<button type="button" class="sb-ref-remove-btn" title="移除" onclick="event.stopPropagation();removeShotRefImg(${shotEp},'${shotSid}','${escPath}')">✕</button>`
      : '';
    // 显示名：优先资产名（来自 @提及），过滤 data URI；回退到路径 basename
    var cleanName = String(name || '');
    if (cleanName.indexOf('data:') === 0 || cleanName.indexOf('base64') >= 0) cleanName = '';
    var baseName = refPathBaseName(fileInfo.path);
    if (baseName.indexOf('data') === 0 || baseName.indexOf('base64') >= 0) baseName = '';
    // 统一去除目录前缀（asset/ 等）和文件扩展名，只留资产名
    function _cleanDisplayName(s) {
      return String(s || '').replace(/^(asset\/|images\/|\/files\/[^/]+\/)/i, '').replace(/\.[^.]+$/, '');
    }
    var displayName = _cleanDisplayName(cleanName || baseName) || '示例画面';
    var dataRefName = _cleanDisplayName(cleanName || name || '');
    var escPath2 = String(fileInfo.path || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    cell.innerHTML = `
      ${removeBtn}
      <button type="button" class="sb-ref-replace-btn" title="替换为其他素材" onclick="event.stopPropagation();replaceShotRefImg(${shotEp},'${shotSid}','${escPath2}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10l-4-4 4-4"/><path d="M3 6h14"/><path d="M17 14l4 4-4 4"/><path d="M21 18H7"/></svg></button>
      ${mediaTag}
      <div class="sb-ref-cap" data-ref-path="${fileInfo.path}" data-ref-name="${dataRefName.replace(/"/g,'&quot;')}">
        <span class="sb-ref-cap-name">${displayName}</span>
      </div>
    `;
    cell.setAttribute('title', resolvedPath);
    const mediaEl = cell.querySelector('img,video');
    if (mediaEl) mediaEl.setAttribute('title', resolvedPath);
    container.appendChild(cell);
  });
}

/**
 * 初始化参考图实时同步
 */
function initRefImageSync() {
  // 为所有镜头编辑框添加监听（prompt_trans + video_ref_prompt）
  document.querySelectorAll('.shot-card.sb-shot-editor').forEach(card => {
    // 获取对应的参考图容器
    const shotSection = card.closest('.sb-shot-section');
    if (!shotSection) return;

    const refCol = shotSection.querySelector('.sb-ref-col');
    if (!refCol) return;
    const promptTa = card.querySelector('[data-field="prompt_trans"]');
    const videoRefTa = card.querySelector('[data-field="video_ref_prompt"]');
    const refPrevShotCb = card.querySelector('[data-field="ref_prev_shot"]');
    if (!promptTa && !videoRefTa) return;

    // 防抖处理，避免频繁更新
    let debounceTimer = null;
    const handleInput = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const promptText = promptTa ? String(promptTa.value || "") : "";
        const videoRefText = videoRefTa ? String(videoRefTa.value || "") : "";
        const mentions = extractAssetMentions(promptText);
        const shotSection = card.closest('.sb-shot-section');
        const lockedImgs = parseShotRefImgs(shotSection);
        const lockedVideos = parseShotRefVideos(shotSection);
        const merged = dedupeStrings([...lockedImgs, ...lockedVideos, ...mentions]);

        // 查找或创建参考图容器
        let refStrip = refCol.querySelector('.sb-ref-strip');
        if (!refStrip) {
          // 如果不存在，创建一个
          const emptyDiv = refCol.querySelector('.sb-ref-empty');
          if (emptyDiv) {
            emptyDiv.remove();
          }
          refStrip = document.createElement('div');
          refStrip.className = 'sb-ref-strip';
          refCol.insertBefore(refStrip, refCol.querySelector('.sb-ref-hint'));
        }

        updateRefImages(refStrip, merged);
      }, 300); // 300ms 防抖
    };

    if (promptTa) promptTa.addEventListener('input', handleInput);
    if (videoRefTa) videoRefTa.addEventListener('input', handleInput);

    // 页面加载时立即渲染一次，合并 data-ref-imgs + prompt 中的 @[...] 提及
    // 修复：切换资产历史版本后，ref_imgs 可能为空但 prompt 已有提及，需要初始化显示
    (function hydrateInitial() {
      const promptText = promptTa ? String(promptTa.value || "") : "";
      const mentions = extractAssetMentions(promptText);
      const lockedImgs = parseShotRefImgs(shotSection);
      const lockedVideos = parseShotRefVideos(shotSection);
      const merged = dedupeStrings([...lockedImgs, ...lockedVideos, ...mentions]);
      if (merged.length > 0) {
        let refStrip = refCol.querySelector('.sb-ref-strip');
        if (!refStrip) {
          const emptyDiv = refCol.querySelector('.sb-ref-empty');
          if (emptyDiv) emptyDiv.remove();
          refStrip = document.createElement('div');
          refStrip.className = 'sb-ref-strip';
          refCol.insertBefore(refStrip, refCol.querySelector('.sb-ref-hint'));
        }
        updateRefImages(refStrip, merged);
      }
    })();

    if (refPrevShotCb) {
      if (typeof window.applyShotRefPrevUiFromCheckbox === "function") {
        window.applyShotRefPrevUiFromCheckbox(refPrevShotCb);
      }
      refPrevShotCb.addEventListener('change', async () => {
        if (!ENABLE_VIDEO_EXTEND) {
          refPrevShotCb.checked = false;
          if (typeof window.applyShotRefPrevUiFromCheckbox === "function") {
            window.applyShotRefPrevUiFromCheckbox(refPrevShotCb);
          }
          return;
        }
        if (typeof window.applyShotRefPrevUiFromCheckbox === "function") {
          window.applyShotRefPrevUiFromCheckbox(refPrevShotCb);
        }
        try {
          if (typeof window.persistShotDraftByCard === 'function') {
            await window.persistShotDraftByCard(card, { silent: true });
          }
        } catch (e) {
          showStickyError("镜头保存失败", (e && e.message) || String(e));
        }
      });
    }
  });
}

// ==================== 分镜顺序管理（增删、拖拽、滚动同步） ====================

let shotOrder = [];
let nextNewSid = 100;
let activeScrollSpySid = null;
let scrollSpyObserver = null;
let scrollSpyRafId = null;
let clickScrollLock = false;        // 点击跳转锁：滚动期间禁止 observer 覆盖高亮
let clickScrollLockTimer = null;

// --- 时间格式化 ---
function _fmtSec(totalSec) {
  var m = Math.floor(totalSec / 60);
  var s = totalSec % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
function _fmtRange(startSec, endSec) {
  return _fmtSec(startSec) + ' – ' + _fmtSec(endSec);
}
function _segLabel(idx) {
  return '片段' + String(idx + 1).padStart(2, '0');
}

// --- 初始化：从 DOM 读取分镜顺序 ---
function initShotOrderFromDOM() {
  shotOrder = [];
  var sections = document.querySelectorAll('.sb-all-shots > .sb-shot-section');
  sections.forEach(function(sec) {
    var sid = sec.getAttribute('data-sid');
    var durInput = sec.querySelector('[data-field="duration_sec"]');
    var dur = durInput ? parseInt(durInput.value, 10) : 5;
    if (!Number.isFinite(dur) || dur < 1) dur = 5;
    shotOrder.push({ sid: sid, duration: dur });
    // 清理静态 HTML 残留的场景名 span 和分隔点，只保留时间
    var meta = sec.querySelector('.sb-seg-meta');
    if (meta) {
      var spans = meta.querySelectorAll('span');
      spans.forEach(function(sp, i) { if (i > 0) sp.remove(); });
    }
  });

  // 状态：从预置集状态派生逐段状态，确保侧边栏圆点与集数计数一致
  var ep = Number(window.SB_EP_LIVE || SB_EP);
  var stMap = _demoEpisodeShotStatus(ep, sections.length);
  sections.forEach(function(sec, i) {
    sec.setAttribute('data-shot-status', stMap[i] || 'pending');
  });

  // 填充集数下拉菜单 + 分镜进度（默认当集）
  _populateEpSelect(ep);

  renderSidebar();
  rebuildTimeRanges();
  initScrollSpy();
  initSidebarClickHandler();
  initDurationChangeListener();
  _updateRefPrevVisibility();

  // DEMO：为每个 section 渲染视频占位海报帧 + 参考图
  sections.forEach(function(sec) {
    if (typeof window.renderVideoPlaceholder === "function") window.renderVideoPlaceholder(sec);
    // 参考图：从 prompt 解析资产名（保留真实名称，不转 data URI）
    var ta = sec.querySelector('[data-field="prompt_trans"]');
    var refs = ta && ta.value ? extractAssetMentions(ta.value) : [];
    if (!refs.length) {
      try {
        var arr = JSON.parse(sec.getAttribute('data-ref-imgs') || '[]');
        if (Array.isArray(arr)) refs = arr.map(function(p){ return String(p).split('/').pop().replace(/\.[^.]+$/, ''); });
      } catch (_) {}
    }
    var strip = sec.querySelector('.sb-ref-strip');
    if (strip && refs.length) updateRefImages(strip, refs);
  });

  // 默认激活第一个
  if (shotOrder.length > 0 && !activeScrollSpySid) {
    activeScrollSpySid = shotOrder[0].sid;
    updateSidebarActiveState();
  }
}

// --- 侧边栏渲染 ---
function renderSidebar() {
  var nav = document.getElementById('sb-shot-nav');
  if (!nav) return;
  nav.innerHTML = '';

  shotOrder.forEach(function(entry, i) {
    // 在每个分镜前面插入 + 按钮
    var addBtn = document.createElement('button');
    addBtn.className = 'sb-shot-insert-btn';
    addBtn.setAttribute('data-insert-after', String(i - 1));
    addBtn.setAttribute('title', '新增分镜');
    addBtn.innerHTML = '<span class="sb-insert-circle">+</span><span class="sb-insert-label">新增分镜</span>';
    nav.appendChild(addBtn);

    // 分镜 item
    var a = document.createElement('a');
    a.className = 'sb-shot-item' + (entry.sid === activeScrollSpySid ? ' on' : '');
    a.setAttribute('href', '#sb-shot-' + entry.sid);
    a.setAttribute('data-sid', entry.sid);
    a.setAttribute('draggable', 'true');   // 支持拖拽调换顺序

    // 拖拽手柄（最左，点点图案）
    var grip = document.createElement('span');
    grip.className = 'sb-shot-grip';
    grip.setAttribute('title', '拖拽调换顺序');
    grip.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="14" fill="currentColor"><circle cx="9" cy="5" r="1.6"/><circle cx="15" cy="5" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="19" r="1.6"/><circle cx="15" cy="19" r="1.6"/></svg>';

    // 状态标注圆点（左侧：绿/橙/灰）
    var statusDot = document.createElement('span');
    statusDot.className = 'sb-shot-status';

    var segSpan = document.createElement('span');
    segSpan.className = 'sb-shot-seg';
    segSpan.textContent = _segLabel(i);

    var timeSpan = document.createElement('span');
    timeSpan.className = 'sb-shot-time';
    timeSpan.innerHTML = '<span class="sb-shot-dur"></span><span class="sb-shot-range"></span>';

    var delBtn = document.createElement('button');
    delBtn.className = 'sb-shot-delete-btn';
    delBtn.setAttribute('title', '删除此段');
    delBtn.innerHTML = '&#128465;';   // 🗑 垃圾箱图标

    // 转圈（最右，仅生成中显示）
    var spin = document.createElement('span');
    spin.className = 'sb-shot-spin';
    spin.setAttribute('title', '生成中');

    a.appendChild(grip);
    a.appendChild(statusDot);
    a.appendChild(segSpan);
    a.appendChild(timeSpan);
    a.appendChild(spin);
    a.appendChild(delBtn);
    nav.appendChild(a);
  });

  // 尾部 + 按钮
  var addEnd = document.createElement('button');
  addEnd.className = 'sb-shot-insert-btn';
  addEnd.setAttribute('data-insert-after', String(shotOrder.length - 1));
  addEnd.setAttribute('title', '新增分镜');
  addEnd.innerHTML = '<span class="sb-insert-circle">+</span><span class="sb-insert-label">新增分镜</span>';
  nav.appendChild(addEnd);

  rebuildTimeRanges();
  _updateSidebarStatusDots();
}

// --- 时间范围重算 ---
function rebuildTimeRanges() {
  var ranges = [];
  var cumulative = 0;
  for (var i = 0; i < shotOrder.length; i++) {
    var dur = shotOrder[i].duration;
    ranges.push({ startSec: cumulative, endSec: cumulative + dur });
    cumulative += dur;
  }
  updateSidebarTimeRanges(ranges);
  updateSectionTimeRanges(ranges);
  return ranges;
}

// 调换分镜顺序：把 sid 移动到目标索引 toIdx。同步 shotOrder + section DOM + 编号 + 时间
// 调换分镜顺序：把 sid 插入到目标索引 toIdx（在源移除后计算）。同步 shotOrder + section DOM + 编号 + 时间
function _moveShot(sid, toIdx) {
  var fromIdx = -1;
  for (var i = 0; i < shotOrder.length; i++) { if (String(shotOrder[i].sid) === String(sid)) { fromIdx = i; break; } }
  if (fromIdx < 0) return;
  toIdx = Math.max(0, Math.min(toIdx, shotOrder.length));
  var moved = shotOrder.splice(fromIdx, 1)[0];
  if (toIdx > fromIdx) toIdx -= 1;
  if (toIdx < 0) toIdx = 0;
  if (toIdx === fromIdx) { shotOrder.splice(fromIdx, 0, moved); return; }
  shotOrder.splice(toIdx, 0, moved);

  // ── 提前锁定激活态：在 DOM 重排/观察器重建之前设置，避免 observer 回调抢走高亮 ──
  activeScrollSpySid = sid;
  clickScrollLock = true;
  if (clickScrollLockTimer) clearTimeout(clickScrollLockTimer);

  // ── FLIP：按 sid 记录旧位置（侧栏 + 右侧 section），重排后对同 sid 元素算位移并过渡 ──
  var oldPos = {};
  document.querySelectorAll('#sb-shot-nav .sb-shot-item').forEach(function (it) {
    oldPos['nav:' + it.getAttribute('data-sid')] = it.getBoundingClientRect().top;
  });
  var wrap = document.querySelector('.sb-all-shots');
  if (wrap) {
    wrap.querySelectorAll(':scope > .sb-shot-section').forEach(function (sec) {
      oldPos['sec:' + sec.getAttribute('data-sid')] = sec.getBoundingClientRect().top;
    });
  }

  // 重排 DOM + 重算 + 侧栏重建
  if (wrap) {
    shotOrder.forEach(function (entry) {
      var sec = document.getElementById('sb-shot-' + entry.sid);
      if (sec) wrap.appendChild(sec);
    });
  }
  rebuildTimeRanges();
  if (typeof refreshScrollSpyObservations === 'function') refreshScrollSpyObservations();
  renderSidebar();
  updateSidebarActiveState();   // 确保侧栏高亮 = sid

  // FLIP 归位动画（重建后用 sid 匹配同一逻辑卡片的新旧位置）
  var flipEls = [];
  document.querySelectorAll('#sb-shot-nav .sb-shot-item').forEach(function (it) {
    var key = 'nav:' + it.getAttribute('data-sid');
    if (oldPos[key] != null) flipEls.push({ el: it, dy: oldPos[key] - it.getBoundingClientRect().top });
  });
  if (wrap) {
    wrap.querySelectorAll(':scope > .sb-shot-section').forEach(function (sec) {
      var key = 'sec:' + sec.getAttribute('data-sid');
      if (oldPos[key] != null) flipEls.push({ el: sec, dy: oldPos[key] - sec.getBoundingClientRect().top });
    });
  }
  flipEls.forEach(function (rec) {
    if (rec.dy === 0) return;
    rec.el.style.transition = 'none';
    rec.el.style.transform = 'translateY(' + rec.dy + 'px)';
  });
  requestAnimationFrame(function () {
    flipEls.forEach(function (rec) {
      if (rec.el.style.transform) {
        rec.el.style.transition = 'transform 0.35s cubic-bezier(0.22, 0.61, 0.36, 1)';
        rec.el.style.transform = '';
      }
    });
  });
  setTimeout(function () {
    flipEls.forEach(function (rec) { rec.el.style.transition = ''; rec.el.style.transform = ''; });
    // FLIP 结束后再次确认激活态 + 此时 section 已在最终位置，滚动到被调整片段
    activeScrollSpySid = sid;
    updateSidebarActiveState();
    var movedSec2 = document.getElementById('sb-shot-' + sid);
    if (movedSec2) movedSec2.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 460);

  // 保持较长锁定（覆盖 FLIP 460ms + 平滑滚动）
  clickScrollLockTimer = setTimeout(function () {
    clickScrollLock = false;
    activeScrollSpySid = sid;
    updateSidebarActiveState();
  }, 1400);

  // 调整顺序后，"延续上一镜"的锁定需按新顺序重算（首个分镜锁定）
  if (typeof _updateRefPrevVisibility === 'function') _updateRefPrevVisibility();
}

// 拖拽调换顺序：拖拽时在落点插入占位卡片（实时预览），松开后完成插入
var _dragShotSid = null;
var _dragPlaceholder = null;
function _ensureDragPlaceholder() {
  if (_dragPlaceholder) return _dragPlaceholder;
  _dragPlaceholder = document.createElement('div');
  _dragPlaceholder.className = 'sb-drag-placeholder';
  _dragPlaceholder.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg><span>松开插入此处</span>';
  return _dragPlaceholder;
}
function _removeDragPlaceholder() {
  if (_dragPlaceholder && _dragPlaceholder.parentNode) _dragPlaceholder.parentNode.removeChild(_dragPlaceholder);
}
function _bindShotDrag() {
  var nav = document.getElementById('sb-shot-nav');
  if (!nav || nav._dragBound) return;
  nav._dragBound = true;
  nav.addEventListener('dragstart', function (e) {
    var item = e.target.closest('.sb-shot-item');
    if (!item) return;
    _dragShotSid = item.getAttribute('data-sid');
    item.classList.add('sb-shot-dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', _dragShotSid); } catch (_) {}
    // 自定义拖拽影像：减少浏览器把它当作链接拖拽（触发拆分视图/新标签）的行为
    try { e.dataTransfer.setDragImage(item, 10, 10); } catch (_) {}
  });
  nav.addEventListener('dragend', function () {
    document.querySelectorAll('.sb-shot-item.sb-shot-dragging').forEach(function (el) { el.classList.remove('sb-shot-dragging'); });
    _removeDragPlaceholder();
    _dragShotSid = null;
  });
  nav.addEventListener('dragover', function (e) {
    if (!_dragShotSid) return;
    e.preventDefault();   // 始终允许 drop
    e.dataTransfer.dropEffect = 'move';
    var mouseY = e.clientY;

    // 被拖拽项在 shotOrder 中的索引（用于判定无操作落点）
    var dragIdx = -1;
    for (var i = 0; i < shotOrder.length; i++) { if (String(shotOrder[i].sid) === String(_dragShotSid)) { dragIdx = i; break; } }

    var items = nav.querySelectorAll('.sb-shot-item');
    var refNode = null;
    var placed = false;
    // 按鼠标 Y 与每张卡片中心线比较，找落点（跳过被拖拽项）
    for (var j = 0; j < items.length; j++) {
      var it = items[j];
      if (it.classList.contains('sb-shot-dragging')) continue;
      var r = it.getBoundingClientRect();
      if (mouseY < r.top + r.height / 2) { refNode = it; placed = true; break; }
    }
    if (!placed) refNode = null;   // 末尾

    // 先放到目标位置，再统计 toIdx 判定是否为"原地不动"
    var ph = _ensureDragPlaceholder();
    if (refNode && refNode !== ph) refNode.parentNode.insertBefore(ph, refNode);
    else if (!refNode) nav.appendChild(ph);

    // 统计占位卡之前的 shot-item 数 = toIdx
    var toIdx = 0;
    for (var node = ph.parentNode.firstChild; node && node !== ph; node = node.nextElementSibling) {
      if (node.classList && node.classList.contains('sb-shot-item')) toIdx++;
    }
    // 落在自身原位（toIdx === dragIdx 或 dragIdx+1）= 无操作，隐藏占位卡
    if (toIdx === dragIdx || toIdx === dragIdx + 1) {
      _removeDragPlaceholder();
    }
  });
  nav.addEventListener('dragleave', function (e) {
    var related = e.relatedTarget;
    if (!related || !nav.contains(related)) _removeDragPlaceholder();
  });
  nav.addEventListener('drop', function (e) {
    e.preventDefault();
    var sid = _dragShotSid;
    // 按占位卡在 nav 子节点中的位置计算插入索引（仅计 shot-item）
    var ph = _dragPlaceholder;
    var insertIdx = -1;
    if (ph && ph.parentNode === nav) {
      var shotCount = 0;
      for (var node = nav.firstChild; node; node = node.nextElementSibling) {
        if (node === ph) { insertIdx = shotCount; break; }
        if (node.classList && node.classList.contains('sb-shot-item')) shotCount++;
      }
      if (insertIdx === -1) insertIdx = shotCount;   // 末尾
    }
    _removeDragPlaceholder();
    _dragShotSid = null;
    if (!sid || insertIdx < 0) return;
    _moveShot(sid, insertIdx);
  });
}

function updateSidebarTimeRanges(ranges) {
  var items = document.querySelectorAll('#sb-shot-nav .sb-shot-item');
  items.forEach(function(item, i) {
    if (i >= ranges.length) return;
    var timeEl = item.querySelector('.sb-shot-time');
    if (timeEl) {
      var dur = ranges[i].endSec - ranges[i].startSec;
      var durEl = timeEl.querySelector('.sb-shot-dur');
      var rangeEl = timeEl.querySelector('.sb-shot-range');
      if (durEl) durEl.textContent = dur + 's';
      if (rangeEl) rangeEl.textContent = _fmtRange(ranges[i].startSec, ranges[i].endSec);
    }
  });
}

function _updateSidebarStatusDots() {
  var sections = document.querySelectorAll('.sb-all-shots > .sb-shot-section');
  var items = document.querySelectorAll('#sb-shot-nav .sb-shot-item');
  sections.forEach(function(sec, i) {
    if (i >= items.length) return;
    var status = sec.getAttribute('data-shot-status') || 'pending';
    var item = items[i];
    // 左侧状态标注点（绿/橙/灰）
    var dot = item.querySelector('.sb-shot-status');
    if (dot) dot.setAttribute('data-status', status);
    // 右侧转圈：仅生成中显示；生成中时隐藏删除（应中止而非删除）
    var isGen = status === 'generating';
    var spin = item.querySelector('.sb-shot-spin');
    var del = item.querySelector('.sb-shot-delete-btn');
    if (spin) spin.style.display = isGen ? 'inline-flex' : 'none';
    if (del) del.style.display = isGen ? 'none' : '';
  });
}

function updateSectionTimeRanges(ranges) {
  var sections = document.querySelectorAll('.sb-all-shots > .sb-shot-section');
  sections.forEach(function(sec, i) {
    if (i >= ranges.length) return;
    var segIdEl = sec.querySelector('.sb-seg-id');
    if (segIdEl) segIdEl.textContent = _segLabel(i);
    var metaSpans = sec.querySelectorAll('.sb-seg-meta > span');
    if (metaSpans[0]) metaSpans[0].textContent = _fmtRange(ranges[i].startSec, ranges[i].endSec);
  });
}

// --- Scroll Spy ---
function initScrollSpy() {
  if (scrollSpyObserver) scrollSpyObserver.disconnect();

  // 视口中线判定：把检测带收缩到视口中线附近一条窄带（顶 50% − 底 50%），
  // 哪个 section 覆盖这条中线带就高亮哪个 —— 等价于"顶部越过视口中线即切换"，
  // 比基于面积的 intersectionRatio 更准确、更符合"板块过半即高亮"的直觉。
  scrollSpyObserver = new IntersectionObserver(function(entries) {
    // 点击跳转滚动期间，不覆盖用户主动选定的高亮
    if (clickScrollLock) return;
    var bestSid = null;
    var bestBottom = -Infinity;
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        // 中线带被多个 section 覆盖时（边界处），选 bottom 最高的（即更靠下、更"当前"的那个）
        var b = entry.boundingClientRect.bottom;
        if (b > bestBottom) {
          bestBottom = b;
          bestSid = entry.target.getAttribute('data-sid');
        }
      }
    });
    if (bestSid && bestSid !== activeScrollSpySid) {
      activeScrollSpySid = bestSid;
      if (!scrollSpyRafId) {
        scrollSpyRafId = requestAnimationFrame(function() {
          updateSidebarActiveState();
          scrollSpyRafId = null;
        });
      }
    }
  }, {
    root: null,
    threshold: [0, 1],
    // 顶部留 90px（固定顶栏高度），上下各裁 ~45% 视口，留中间约 10% 作为中线检测带
    rootMargin: '-45% 0px -45% 0px'
  });

  document.querySelectorAll('.sb-all-shots > .sb-shot-section').forEach(function(sec) {
    scrollSpyObserver.observe(sec);
  });
}

function updateSidebarActiveState() {
  // 更新侧边栏
  document.querySelectorAll('#sb-shot-nav .sb-shot-item').forEach(function(item) {
    var sid = item.getAttribute('data-sid');
    item.classList.toggle('on', sid === activeScrollSpySid);
  });
  // 不再对右侧 section 添加高亮
}

function refreshScrollSpyObservations() {
  initScrollSpy();
}

// --- 侧边栏点击事件委托 ---
function initSidebarClickHandler() {
  var nav = document.getElementById('sb-shot-nav');
  if (!nav) return;
  if (nav._sbClickBound) return;       // 防止重复绑定（SPA 切换/多次 init 会累积监听）
  nav._sbClickBound = true;
  nav.addEventListener('click', function(e) {
    // 拖拽手柄不触发跳转
    if (e.target.closest('.sb-shot-grip')) { e.preventDefault(); e.stopPropagation(); return; }
    // 垃圾箱删除按钮 → 弹窗确认
    var delBtn = e.target.closest('.sb-shot-delete-btn');
    if (delBtn) {
      e.preventDefault();
      e.stopPropagation();
      var item = delBtn.closest('.sb-shot-item');
      var sid = item ? item.getAttribute('data-sid') : null;
      if (sid) _showDeleteConfirmModal(sid);
      return;
    }
    // 插入 + 按钮
    var insertBtn = e.target.closest('.sb-shot-insert-btn');
    if (insertBtn) {
      e.preventDefault();
      e.stopPropagation();
      var afterIdx = parseInt(insertBtn.getAttribute('data-insert-after'), 10);
      addShotAfterIndex(afterIdx);
      return;
    }
    // 分镜 item 点击 → scroll to section
    var shotItem = e.target.closest('.sb-shot-item');
    if (shotItem) {
      e.preventDefault();
      var sid = shotItem.getAttribute('data-sid');
      if (sid) {
        activeScrollSpySid = sid;
        updateSidebarActiveState();
        // 加锁：平滑滚动期间禁止 observer 抢走高亮
        clickScrollLock = true;
        if (clickScrollLockTimer) clearTimeout(clickScrollLockTimer);
        var sec = document.getElementById('sb-shot-' + sid);
        if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // 滚动结束后延时解锁（平滑滚动通常 < 800ms，留足余量）
        clickScrollLockTimer = setTimeout(function() { clickScrollLock = false; }, 900);
      }
    }
  });
}

// --- 删除确认弹窗 ---
function _showDeleteConfirmModal(sid) {
  var overlay = document.getElementById('sb-delete-modal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sb-delete-modal';
    overlay.className = 'sb-modal-overlay';
    overlay.innerHTML =
      '<div class="sb-modal-box">' +
        '<div class="sb-modal-icon-trash"></div>' +
        '<div class="sb-modal-title">确认删除此分镜？</div>' +
        '<div class="sb-modal-desc">删除后无法恢复，该分镜的所有内容将被移除。</div>' +
        '<div class="sb-modal-actions">' +
          '<button class="sb-modal-cancel">取消</button>' +
          '<button class="sb-modal-confirm">确认删除</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    // 点击遮罩关闭
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.classList.remove('sb-modal--visible');
    });
    overlay.querySelector('.sb-modal-cancel').addEventListener('click', function() {
      overlay.classList.remove('sb-modal--visible');
    });
  }
  // 绑定确认按钮（每次克隆防止重复绑定）
  var confirmBtn = overlay.querySelector('.sb-modal-confirm');
  var newConfirm = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
  newConfirm.addEventListener('click', function() {
    deleteShotBySid(sid);
    overlay.classList.remove('sb-modal--visible');
  });

  overlay.classList.add('sb-modal--visible');
}

// --- 时长联动 ---
function initDurationChangeListener() {
  var allShots = document.querySelector('.sb-all-shots');
  if (!allShots) return;
  allShots.addEventListener('input', function(e) {
    var el = e.target;
    if (!el || el.getAttribute('data-field') !== 'duration_sec') return;
    var section = el.closest('.sb-shot-section');
    if (!section) return;
    var sid = section.getAttribute('data-sid');
    var val = parseInt(el.value, 10);
    if (!Number.isFinite(val) || val < 1) val = 1;
    if (val > 15) val = 15;
    // 不立即写回 el.value，让用户能继续输入
    handleDurationChange(sid, val);
  });
  allShots.addEventListener('change', function(e) {
    var el = e.target;
    if (!el || el.getAttribute('data-field') !== 'duration_sec') return;
    var val = parseInt(el.value, 10);
    if (!Number.isFinite(val) || val < 1) val = 1;
    if (val > 15) val = 15;
    el.value = String(val);
    var section = el.closest('.sb-shot-section');
    if (!section) return;
    var sid = section.getAttribute('data-sid');
    handleDurationChange(sid, val);
  });
}

function handleDurationChange(sid, newDuration) {
  for (var i = 0; i < shotOrder.length; i++) {
    if (shotOrder[i].sid === sid) {
      shotOrder[i].duration = newDuration;
      break;
    }
  }
  rebuildTimeRanges();
}

// --- 插入新分镜 ---
function addShotAfterIndex(afterIndex) {
  var sid = String(nextNewSid++);
  var newEntry = { sid: sid, duration: 5 };
  var insertAt = afterIndex + 1;
  shotOrder.splice(insertAt, 0, newEntry);

  var section = createNewShotSection(sid);
  var allShots = document.querySelector('.sb-all-shots');
  if (insertAt >= allShots.children.length) {
    allShots.appendChild(section);
  } else {
    allShots.insertBefore(section, allShots.children[insertAt]);
  }

  section.classList.add('sb-shot-section--inserting');
  setTimeout(function() { section.classList.remove('sb-shot-section--inserting'); }, 350);

  renderSidebar();
  _updateRefPrevVisibility();
  refreshScrollSpyObservations();

  // 滚动到新分镜
  activeScrollSpySid = sid;
  updateSidebarActiveState();
  section.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // 绑定提示词高亮等
  _bindNewShotEditor(section);
  if (document.getElementById('v-g') && document.getElementById('v-g').classList.contains('vg-studio-on')) {
    if (typeof _vgReshapeSection === 'function') _vgReshapeSection(section);
    if (typeof _initPromptHighlightOverlay === 'function') _initPromptHighlightOverlay();
    if (typeof upgradeGenButtons === 'function') upgradeGenButtons();
    if (typeof _renderEpAssetPanel === 'function') _renderEpAssetPanel();   // 新片段也注入本集资产（界面一致）
    if (typeof switchShot === 'function') switchShot(sid);
  }
}

// 为缺少"延续上一镜视频"选项的 section 注入该元素（统一所有卡片结构）
function _ensurePrevShotLabel(sec) {
  if (sec.querySelector('.sb-shot-prev-lbl')) return;
  var metaRow = sec.querySelector('.sb-shot-meta-row');
  if (!metaRow) return;
  var sid = sec.getAttribute('data-sid') || '';
  var ep = sec.getAttribute('data-ep') || SB_EP || '1';
  var lbl = document.createElement('label');
  lbl.className = 'sb-shot-prev-lbl';
  lbl.setAttribute('for', 'prev-' + ep + '-' + sid);
  lbl.setAttribute('title', '勾选后将引用紧邻上一镜作为视频延续参考');
  lbl.innerHTML = '<input id="prev-' + ep + '-' + sid + '" type="checkbox" class="sb-shot-prev-cb" data-field="ref_prev_shot" /><span>延续上一镜视频</span>';
  metaRow.appendChild(lbl);
}

// 所有卡片都显示"延续上一镜视频"，首个分镜锁死（disabled），其余可用
function _updateRefPrevVisibility() {
  var sections = document.querySelectorAll('.sb-all-shots > .sb-shot-section');
  sections.forEach(function(sec, i) {
    _ensurePrevShotLabel(sec);
    var prevLbl = sec.querySelector('.sb-shot-prev-lbl');
    if (!prevLbl) return;
    var cb = prevLbl.querySelector('.sb-shot-prev-cb');
    if (i === 0) {
      // 首个分镜：锁死
      prevLbl.classList.add('is-locked');
      if (cb) { cb.disabled = true; cb.checked = false; }
    } else {
      // 其余：可用
      prevLbl.classList.remove('is-locked');
      if (cb) cb.disabled = false;
    }
  });
}

function createNewShotSection(sid) {
  var ep = SB_EP || '1';
  var sec = document.createElement('section');
  sec.id = 'sb-shot-' + sid;
  sec.className = 'sb-shot-section';
  sec.setAttribute('data-ep', ep);
  sec.setAttribute('data-sid', sid);
  sec.setAttribute('data-shot-status', 'pending');
  sec.setAttribute('data-status-manual', '1');   // 新增分镜：状态手动管理，不被 _syncShotStatusUI 按索引覆盖
  sec.setAttribute('data-ref-imgs', '[]');
  sec.setAttribute('data-ref-videos', '[]');

  sec.innerHTML =
    '<div class="sb-seg-head">' +
      '<div class="sb-seg-id">片段--</div>' +
      '<div class="sb-seg-meta">' +
        '<span>--:–– – ––:––</span>' +
      '</div>' +
      '<div class="sb-tag-row"></div>' +
    '</div>' +
    '<div class="sb-editor-split sb-editor-split--with-gen">' +
      '<div class="sb-prompt-block">' +
        '<label class="lbl">分镜提示词（prompt_trans）</label>' +
        '<div class="shot-card sb-shot-editor" data-ep="' + ep + '" data-sid="' + sid + '">' +
          '<div class="sb-shot-meta-row">' +
            '<label class="lbl sb-shot-duration-lbl" for="dur-' + ep + '-' + sid + '">视频时长（秒）</label>' +
            '<input id="dur-' + ep + '-' + sid + '" class="inp sb-shot-duration-inp" type="number" min="1" max="15" step="1" data-field="duration_sec" value="5" title="用于控制该镜头视频时长（秒）" />' +
            '<label class="sb-shot-prev-lbl" for="prev-' + ep + '-' + sid + '" title="勾选后将引用紧邻上一镜作为视频延续参考">' +
              '<input id="prev-' + ep + '-' + sid + '" type="checkbox" class="sb-shot-prev-cb" data-field="ref_prev_shot" />' +
              '<span>延续上一镜视频</span>' +
            '</label>' +
          '</div>' +
          '<input type="hidden" data-field="shot_type" value="empty" />' +
          '<input type="hidden" data-field="video_ref_prompt" value="" />' +
          '<div class="sb-prompt-group">' +
            '<div class="sb-video-ref-label" aria-hidden="true">延长上一段视频</div>' +
            '<textarea class="ta sb-prompt-ta" data-field="prompt_trans" style="min-height: 180px" placeholder="请输入分镜提示词…"></textarea>' +
          '</div>' +
          '<div class="sb-prompt-toolbar">' +
            '<button type="button" class="shot-ai-trigger-btn" data-ep="' + ep + '" data-sid="' + sid + '">AI 修改</button>' +
          '</div>' +
          '<div class="sb-ai-inline-panel" data-ep="' + ep + '" data-sid="' + sid + '" style="display:none"></div>' +
        '</div>' +
      '</div>' +
      '<div class="sb-ref-col">' +
        '<div class="sb-col-title">参考素材</div>' +
        '<div class="sb-ref-strip"></div>' +
        '<div class="asset-ref-add-wrap sb-ref-add-wrap">' +
          '<button type="button" class="asset-ref-upload-btn" onclick="toggleRefAddDropdown(event, this, \'shot\', \'' + ep + '\')" title="添加参考图">＋</button>' +
          '<div class="asset-ref-add-dropdown">' +
            '<label class="asset-ref-add-option">' +
              '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="flex-shrink:0"><path d="M8 2v9M4 7l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><rect x="2" y="13" width="12" height="1.5" rx="0.75" fill="currentColor"/></svg>' +
              '上传本地图片' +
              '<input type="file" accept="image/*" hidden onchange="uploadShotRefImg(this, ' + ep + ', \'' + sid + '\'); closeRefAddDropdowns()" />' +
            '</label>' +
            '<button type="button" class="asset-ref-add-option" onclick="closeRefAddDropdowns(); openShotAssetLibraryPicker(' + ep + ', \'' + sid + '\')">' +
              '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="flex-shrink:0"><rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/><circle cx="5.5" cy="6.5" r="1.5" fill="currentColor"/><path d="M1 11l3.5-3 3 3 2.5-2.5L15 13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              '从资产库选取' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div class="sb-ref-hint">' +
          '<p style="color: var(--t2); font-size: 12px; margin: 8px 0 0; line-height: 1.5;">💡 提示：参考素材支持通过「+」上传/选取；也可由提示词中的 <code>@[资产名]</code> 自动解析生成。</p>' +
        '</div>' +
      '</div>' +
      '<aside class="sb-col-gen sb-col-gen--shot">' +
        '<div class="sb-col-title">视频生成</div>' +
        '<div class="sb-gen-status">未生成</div>' +
        '<div class="sb-preview-placeholder"><span style="color:var(--t3)">暂无视频</span></div>' +
        '<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">' +
          '<button type="button" class="b ba sb-gen-big" data-gen-text="生成视频片段" data-regen-text="重新生成视频片段" data-has-video="0" onclick="genShot(' + ep + ', \'' + sid + '\')">生成视频片段</button>' +
          '<button type="button" class="b bs" onclick="openShotHistoryModal(' + ep + ', \'' + sid + '\')">历史版本</button>' +
        '</div>' +
        '<div class="sb-shot-error hidden" data-shot-error><strong>生成受阻：</strong><span></span></div>' +
      '</aside>' +
    '</div>';

  return sec;
}

function _bindNewShotEditor(section) {
  var card = section.querySelector('.shot-card.sb-shot-editor');
  if (!card) return;
  // 绑定提示词 textarea 保存事件
  var ta = card.querySelector('.sb-prompt-ta');
  if (ta && typeof bindPromptBlurSave === 'function') {
    bindPromptBlurSave(ta);
  }
  // 绑定 AI 按钮事件
  var aiBtn = card.querySelector('.shot-ai-trigger-btn');
  if (aiBtn && typeof initAiInlinePanel === 'function') {
    // AI 按钮通过事件委托处理，无需额外绑定
  }
  // 绑定内容可编辑高亮
  var promptTa = card.querySelector('.sb-prompt-ta');
  if (promptTa && typeof initPromptHighlight === 'function') {
    initPromptHighlight(promptTa);
  }
}

// --- 简单 Toast 提示 ---
function _shotToast(msg) {
  var existing = document.getElementById('sb-shot-toast');
  if (existing) existing.parentNode.removeChild(existing);
  var t = document.createElement('div');
  t.id = 'sb-shot-toast';
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);padding:10px 20px;background:#333;color:#fff;border-radius:8px;font-size:13px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,.2);transition:opacity .3s';
  document.body.appendChild(t);
  setTimeout(function() { t.style.opacity = '0'; }, 2000);
  setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, 2400);
}

// --- 删除分镜 ---
function deleteShotBySid(sid) {
  if (shotOrder.length <= 1) {
    _shotToast('至少保留一个镜头');
    return;
  }
  // 检查是否正在生成
  var section = document.getElementById('sb-shot-' + sid);
  var genBtn = section ? section.querySelector('.sb-gen-big') : null;
  if (genBtn && genBtn.getAttribute('data-generating') === '1') {
    _shotToast('该镜头正在生成中，请等待完成后再操作');
    return;
  }

  // 从数据模型移除
  var removedIndex = -1;
  for (var i = 0; i < shotOrder.length; i++) {
    if (shotOrder[i].sid === sid) { removedIndex = i; shotOrder.splice(i, 1); break; }
  }

  // 播放删除动画，然后用 setTimeout 兜底移除 DOM
  var _cleanupDelete = function() {
    if (section.parentNode) section.parentNode.removeChild(section);
    renderSidebar();
    refreshScrollSpyObservations();
    if (activeScrollSpySid === sid) {
      var newIdx = Math.min(removedIndex, shotOrder.length - 1);
      if (newIdx >= 0) {
        activeScrollSpySid = shotOrder[newIdx].sid;
        updateSidebarActiveState();
        if (typeof switchShot === 'function') switchShot(activeScrollSpySid);
      }
    }
  };
  if (section) {
    section.classList.add('sb-shot-section--removing');
    section.addEventListener('animationend', _cleanupDelete, { once: true });
    // 兜底：300ms 后强制清理（防止 animationend 不触发）
    setTimeout(_cleanupDelete, 300);
  } else {
    renderSidebar();
    refreshScrollSpyObservations();
  }
}


// ==================== DEMO 前10集 SPA 切换 ====================
window.SB_EP_LIVE = window.SB_EP_LIVE || SB_EP;

// 从资产面板 <details data-ep=N> 解析改编分镜：[{id,time,prompt}]
function _demoParseEpSegments(ep) {
  var details = document.querySelector('details.ast-sb-ep[data-ep="' + ep + '"]');
  if (!details) return [];
  var segs = [];
  details.querySelectorAll('.ast-sb-seg').forEach(function (seg) {
    var idEl = seg.querySelector('.ast-sb-seg-id');
    var timeEl = seg.querySelector('.ast-sb-seg-time');
    var cols = seg.querySelectorAll('.ast-sb-col-t');
    var adapted = cols.length >= 2 ? cols[cols.length - 1] : cols[0];
    segs.push({
      id: idEl ? idEl.textContent.trim() : '',
      time: timeEl ? timeEl.textContent.trim() : '',
      prompt: adapted ? adapted.textContent.trim() : ''
    });
  });
  return segs;
}

// 从时间范围 "00:00 – 00:05" 推断时长
function _demoDurFromTime(timeStr) {
  var m = String(timeStr || '').match(/(\d+):(\d+)\s*[–-]\s*(\d+):(\d+)/);
  if (!m) return 5;
  var s1 = +m[1] * 60 + +m[2], s2 = +m[3] * 60 + +m[4];
  var d = s2 - s1;
  return (d >= 1 && d <= 15) ? d : 5;
}

// 为某集渲染所有 shot section（替换 .sb-all-shots 内容）
function _demoRenderEpisodeShots(ep) {
  var wrap = document.querySelector('.sb-all-shots');
  if (!wrap) return;
  wrap.innerHTML = '';
  var segs = _demoParseEpSegments(ep);
  if (!segs.length) return; // 无数据则不动
  var stMap = _demoEpisodeShotStatus(ep, segs.length);
  segs.forEach(function (seg, i) {
    var sid = String(i + 1);
    var sec = createNewShotSection(sid);
    sec.setAttribute('data-ep', String(ep));
    sec.setAttribute('data-sid', sid);
    // 填 prompt
    var ta = sec.querySelector('[data-field="prompt_trans"]');
    if (ta && seg.prompt) ta.value = seg.prompt;
    // 时长
    var durInp = sec.querySelector('[data-field="duration_sec"]');
    if (durInp) durInp.value = _demoDurFromTime(seg.time);
    // 状态
    sec.setAttribute('data-shot-status', stMap[i] || 'pending');
    // 参考图写入 data-ref-imgs（保留真实路径）
    var refPaths = computeRefImgsFromPrompt(seg.prompt);
    sec.setAttribute('data-ref-imgs', JSON.stringify(refPaths));
    wrap.appendChild(sec);
    _bindNewShotEditor(sec);
    if (typeof window.renderVideoPlaceholder === "function") window.renderVideoPlaceholder(sec);
    var strip = sec.querySelector('.sb-ref-strip');
    var refNames = refPaths.map(function(p){ return String(p).split('/').pop().replace(/\.[^.]+$/, ''); });
    if (strip && refNames.length) updateRefImages(strip, refNames);
  });
  // 重置 activeScrollSpySid 让 initShotOrderFromDOM 重新激活第一个
  activeScrollSpySid = null;
  initShotOrderFromDOM();
}

// 拦截集数点击 → SPA 切换
function _demoInitEpSwitching() {
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a.sb-ep-item[data-ep]');
    if (!a) return;
    e.preventDefault();
    var ep = Number(a.getAttribute('data-ep'));
    if (!Number.isFinite(ep) || ep < 1) return;
    _demoSwitchEpisode(ep);
  });
}
function _demoSwitchEpisode(ep) {
  window.SB_EP_LIVE = ep;
  window.PAGE_DATA.sbEp = ep;
  document.querySelectorAll('.sb-ep-item').forEach(function (x) {
    x.classList.toggle('on', Number(x.getAttribute('data-ep')) === ep);
  });
  // 同步集数下拉菜单
  var sel = document.getElementById('sb-ep-select');
  if (sel) sel.value = String(ep);
  _updateShotsProgress(ep);
  _demoRenderEpisodeShots(ep);
  // 滚到顶
  var nav = document.getElementById('sb-shot-nav');
  if (nav) nav.scrollTop = 0;
  // 方案Y：切集后 reshape 新 section + 重渲染本集资产面板（读独立集级资产池）
  setTimeout(function(){
    try { if (typeof _vgReshapeAll === 'function') _vgReshapeAll(); } catch (_) {}
    try { if (typeof _renderEpAssetPanel === 'function') _renderEpAssetPanel(); } catch (_) {}
  }, 60);
}

// 更新分镜进度（已完成/总数）
function _updateShotsProgress(ep) {
  var el = document.getElementById('sb-shots-progress');
  if (!el) return;
  var st = (_DEMO_EP_STATUS && _DEMO_EP_STATUS[ep]) || { succeeded_shots: 0, total_shots: 0 };
  el.textContent = (st.succeeded_shots || 0) + '/' + (st.total_shots || 0);
}

// 填充并绑定集数下拉菜单
function _populateEpSelect(currentEp) {
  var sel = document.getElementById('sb-ep-select');
  if (!sel) return;
  sel.innerHTML = '';
  SB_EPISODE_NUMS.forEach(function (ep) {
    var opt = document.createElement('option');
    opt.value = String(ep);
    var st = (_DEMO_EP_STATUS && _DEMO_EP_STATUS[ep]) || {};
    var label = '第' + ep + '集';
    if (st.status === 'completed') label += ' · 已完成';
    else if (st.status === 'running') label += ' · 生成中';
    else if (st.status === 'partial_failed') label += ' · 部分失败';
    else label += ' · 待生成';
    opt.textContent = label;
    sel.appendChild(opt);
  });
  sel.value = String(currentEp);
  _updateShotsProgress(currentEp);
  if (!sel._bound) {
    sel._bound = true;
    sel.addEventListener('change', function () {
      var ep = Number(sel.value);
      if (Number.isFinite(ep) && ep > 0) _demoSwitchEpisode(ep);
    });
  }
}

// ── Agent 智能体入口：拖拽上传（demo mock 进度） ──
function _initAgentDropzone() {
  var list = document.getElementById('agent-file-list');
  if (!list) return;

  function addFiles(files, type) {
    Array.prototype.forEach.call(files, function (f) {
      var icon = type === 'video' ? '🎬' : type === 'sub' ? '📝' : '📄';
      var item = document.createElement('div');
      item.className = 'agent-file-item';
      item.innerHTML =
        '<span class="agent-file-icon">' + icon + '</span>' +
        '<span class="agent-file-name">' + f.name + '</span>' +
        '<span class="agent-file-bar"><span style="width:0%"></span></span>' +
        '<span class="agent-file-pct">0%</span>';
      list.appendChild(item);
      var bar = item.querySelector('.agent-file-bar span');
      var pct = item.querySelector('.agent-file-pct');
      var cur = 0;
      var timer = setInterval(function () {
        cur += Math.random() * 18 + 6;
        if (cur >= 100) { cur = 100; clearInterval(timer); item.classList.add('done'); pct.textContent = '完成'; }
        else { pct.textContent = Math.round(cur) + '%'; }
        bar.style.width = cur + '%';
      }, 250);
    });
  }

  function bind(dzId, inputId, type) {
    var dz = document.getElementById(dzId);
    var input = document.getElementById(inputId);
    if (!dz || !input) return;
    dz.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () { addFiles(this.files, type); this.value = ''; });
    dz.addEventListener('dragover', function (e) { e.preventDefault(); dz.classList.add('dragover'); });
    dz.addEventListener('dragleave', function () { dz.classList.remove('dragover'); });
    dz.addEventListener('drop', function (e) {
      e.preventDefault(); dz.classList.remove('dragover');
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files, type);
    });
  }
  bind('agent-dropzone-video', 'agent-video-input', 'video');
  bind('agent-dropzone-sub', 'agent-sub-input', 'sub');
}

// 页面加载完成后初始化
// 为静态 ref cell 注入替换按钮
function _injectReplaceButtons() {
  var swapSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10l-4-4 4-4"/><path d="M3 6h14"/><path d="M17 14l4 4-4 4"/><path d="M21 18H7"/></svg>';
  document.querySelectorAll('.sb-ref-cell').forEach(function(cell) {
    if (cell.querySelector('.sb-ref-replace-btn')) return;
    var cap = cell.querySelector('.sb-ref-cap');
    var refPath = cap ? cap.getAttribute('data-ref-path') || '' : '';
    if (!refPath) return;
    var sec = cell.closest('.sb-shot-section');
    var ep = sec ? (sec.getAttribute('data-ep') || '1') : '1';
    var sid = sec ? (sec.getAttribute('data-sid') || '1') : '1';
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'sb-ref-replace-btn';
    btn.title = '替换为其他素材'; btn.innerHTML = swapSvg;
    btn.onclick = function(e) { e.stopPropagation(); replaceShotRefImg(parseInt(ep), String(sid), refPath); };
    cell.insertBefore(btn, cell.firstChild);
    var badge = cap.querySelector('.sb-ref-type-badge');
    if (badge) badge.remove();
  });
}

function initShotEditorPageHooks() {
  if (typeof window.initVideoExtendMasterControl === "function") {
    window.initVideoExtendMasterControl();
  }
  initRefImageSync();
  initShotOrderFromDOM();
  if (typeof window._bindPreviewFrameClick === "function") window._bindPreviewFrameClick();
  _demoInitEpSwitching();
  _initAgentDropzone();
  if (window.__LOCAL_DEMO__) _injectReplaceButtons();
  _bindShotDrag();
  // DEMO：若初始就在视频页（?view=video），刷新集数面板状态
  var videoView = document.getElementById('v-g');
  if (videoView && videoView.classList.contains('on')) {
    window.SB_VIEW_LIVE = 'video';
    if (typeof refreshEpisodeStatusBadges === "function") refreshEpisodeStatusBadges();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initShotEditorPageHooks);
} else {
  initShotEditorPageHooks();
}

// ==================== @ 提及自动完成功能 ====================

/**
 * 根据文件路径查找对应的资产信息
 * @param {string} filePath - 文件路径（如 "asset/Julian_White_Outfit.png"）
 * @returns {{id: string, id_trans: string, name_trans: string, kind: string}|null}
 */
function getAssetByFilePath(filePath) {
  const asset = window.PAGE_DATA?.asset;
  if (!asset) return null;

  const normalizedPath = String(filePath || '').trim();
  if (!normalizedPath) return null;

  for (const kind of ['characters', 'scenes', 'props']) {
    const items = asset[kind] || {};
    for (const [aid, data] of Object.entries(items)) {
      if (!data || typeof data !== 'object') continue;
      if (data.file_path === normalizedPath) {
        return {
          id: data.id,
          id_trans: data.id_trans,
          name_trans: data.name_trans || data.id_trans,
          kind: kind
        };
      }
      const history = Array.isArray(data.history) ? data.history : [];
      const hit = history.some(rec => rec && typeof rec === 'object' && String(rec.file_path || '').trim() === normalizedPath);
      if (hit) {
        return {
          id: data.id,
          id_trans: data.id_trans,
          name_trans: data.name_trans || data.id_trans,
          kind: kind
        };
      }
    }
  }
  return null;
}

/**
 * 获取当前镜头右侧参考素材的 @ 候选列表
 * @param {HTMLElement} shotCard - 镜头编辑卡片
 * @returns {Array<{value: string, label: string, detail: string, type: string, kind: string, icon: string}>}
 */
function getMentionCandidatesFromCard(shotCard) {
  const shotSection = shotCard.closest('.sb-shot-section');
  if (!shotSection) return [];

  const refCells = shotSection.querySelectorAll('.sb-ref-cell');
  const candidates = [];
  const seen = new Set();

  let userUploadIndex = 0; // 用户上传图片计数器

  refCells.forEach(cell => {
    const capElement = cell.querySelector('.sb-ref-cap');
    if (!capElement) return;

    // 获取资产路径
    const refPath = capElement.getAttribute('data-ref-path');
    if (!refPath || seen.has(refPath)) return;
    seen.add(refPath);

    // 判断是否为用户上传的图片
    const isUserUpload = isLocalUploadedRefPath(refPath);

    if (isUserUpload) {
      // 用户上传的图片
      userUploadIndex++;
      const fileName = refPathBaseName(refPath);
      candidates.push({
        value: refPath,                    // 实际插入的值：路径
        label: `图片${userUploadIndex}`,    // 显示名称
        detail: fileName,                   // 副标题：文件名
        type: 'user-upload',
        kind: '',
        icon: '📷',
        thumbSrc: `/files/${window.PAGE_DATA.pid}/${refPath}`
      });
    } else {
      // 资产库图片
      const assetInfo = getAssetByFilePath(refPath);
      if (assetInfo) {
        const kindIcons = {
          characters: '🧑',
          scenes: '🏠',
          props: '📦'
        };
        candidates.push({
          value: assetInfo.id_trans,       // 实际插入的值：id_trans
          label: assetInfo.name_trans,     // 显示名称
          detail: assetInfo.id_trans,      // 副标题：英文ID
          type: 'asset',
          kind: assetInfo.kind,
          icon: kindIcons[assetInfo.kind] || '🖼️',
          thumbSrc: `/files/${window.PAGE_DATA.pid}/${refPath}`
        });
      } else {
        // 兜底：即使未映射到资产，也允许按路径引用，避免候选被误过滤为空
        candidates.push({
          value: refPath,
          label: refPathBaseName(refPath).replace(/\.[^.]+$/, ''),
          detail: refPath,
          type: 'asset',
          kind: '',
          icon: '🖼️',
          thumbSrc: `/files/${window.PAGE_DATA.pid}/${refPath}`
        });
      }
    }
  });

  return candidates;
}

/**
 * 自动完成下拉菜单类
 */
class MentionAutocomplete {
  constructor(textarea) {
    this.textarea = textarea;
    this.dropdown = null;
    this.candidates = [];
    this.filteredCandidates = [];
    this.selectedIndex = 0;
    this.mentionStart = -1;
    this.lastCursorPos = 0;
    this.isOpen = false;

    this.init();
  }

  init() {
    // 监听输入
    this.textarea.addEventListener('input', this.onInput.bind(this));
    this.textarea.addEventListener('keydown', this.onKeyDown.bind(this));

    // 监听失焦
    this.textarea.addEventListener('blur', () => {
      // 延迟关闭，以便点击下拉项生效
      this.blurTimer = setTimeout(() => {
        this.close();
      }, 200);
    });

    // 监听获得焦点时，清除关闭定时器
    this.textarea.addEventListener('focus', () => {
      if (this.blurTimer) {
        clearTimeout(this.blurTimer);
        this.blurTimer = null;
      }
    });
  }

  onInput(e) {
    const cursorPos = this.textarea.selectionStart;
    this.lastCursorPos = Number.isFinite(cursorPos) ? cursorPos : this.lastCursorPos;
    const text = this.textarea.value;

    // 检测是否输入了 @
    const beforeCursor = text.substring(0, cursorPos);
    const atMatch = beforeCursor.match(/[＠@](?:\[)?([^\s\]]*)$/);

    if (atMatch) {
      this.mentionStart = cursorPos - atMatch[0].length;
      const query = atMatch[1];

      // 获取候选列表
      const shotCard = this.textarea.closest('.shot-card');
      if (!shotCard) return;

      this.candidates = getMentionCandidatesFromCard(shotCard);

      // 过滤候选
      this.filterCandidates(query);

      if (this.filteredCandidates.length > 0) {
        this.open();
      } else {
        this.close();
      }
    } else {
      this.close();
    }
  }

  filterCandidates(query) {
    const lowerQuery = query.toLowerCase();
    this.filteredCandidates = this.candidates.filter(c => {
      return c.label.toLowerCase().includes(lowerQuery) ||
             c.detail.toLowerCase().includes(lowerQuery) ||
             c.value.toLowerCase().includes(lowerQuery);
    });
    this.selectedIndex = 0;
  }

  onKeyDown(e) {
    if (!this.isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectNext();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.selectPrev();
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        this.insertSelected();
        break;
      case 'Escape':
        e.preventDefault();
        this.close();
        break;
    }
  }

  selectNext() {
    this.selectedIndex = (this.selectedIndex + 1) % this.filteredCandidates.length;
    this.renderItems();
  }

  selectPrev() {
    this.selectedIndex = (this.selectedIndex - 1 + this.filteredCandidates.length) % this.filteredCandidates.length;
    this.renderItems();
  }

  insertSelected() {
    if (this.selectedIndex < 0 || this.selectedIndex >= this.filteredCandidates.length) {
      this.close();
      return;
    }

    const candidate = this.filteredCandidates[this.selectedIndex];
    this.insertMention(candidate);
    this.close();
  }

  insertMention(candidate) {
    if (!candidate || !candidate.value) {
      return;
    }

    const text = this.textarea.value;
    const cursorPos = Number.isFinite(this.textarea.selectionStart)
      ? this.textarea.selectionStart
      : this.lastCursorPos;

    // 构建插入的文本
    const mentionText = `@[${candidate.value}]`;

    // 替换文本（从 mentionStart 到 cursorPos 都替换掉）
    let start = this.mentionStart;
    if (!Number.isFinite(start) || start < 0 || start > cursorPos) {
      const beforeCursor = text.substring(0, cursorPos);
      const m = beforeCursor.match(/[＠@](?:\[)?([^\s\]]*)$/);
      start = m ? (cursorPos - m[0].length) : cursorPos;
    }
    // 优先使用原生区间替换，避免点击候选时 selection 异常导致写入丢失
    const insertText = mentionText + ' ';
    try {
      this.textarea.setRangeText(insertText, start, cursorPos, 'end');
    } catch (_err) {
      // 兜底：少数环境不支持时回退到字符串拼接
      const before = text.substring(0, start);
      const after = text.substring(cursorPos);
      const newValue = before + insertText + after;
      this.textarea.value = newValue;
      const newCursorPos = start + insertText.length;
      this.textarea.setSelectionRange(newCursorPos, newCursorPos);
    }

    // 触发输入事件（更新参考图）
    const inputEvent = new Event('input', { bubbles: true });
    this.textarea.dispatchEvent(inputEvent);

    // 立即保存镜头数据
    const card = this.textarea.closest('.shot-card');
    if (card) {
      const ep = card.getAttribute('data-ep');
      const sid = card.getAttribute('data-sid');
      // 使用异步保存,不阻塞用户操作
      (async () => {
        const saveStartTime = Date.now();
        console.log(`[MentionAutocomplete] 开始保存镜头 EP${ep}/SEG${sid}, 插入: ${mentionText}`);
        try {
          await persistShotDraftByCard(card, { silent: true });
          const duration = Date.now() - saveStartTime;
          console.log(`[MentionAutocomplete] 保存成功 EP${ep}/SEG${sid}, 耗时: ${duration}ms`);
          // 显示简短的成功提示
          toast("已添加素材引用", false, 1000);
        } catch (e) {
          const duration = Date.now() - saveStartTime;
          console.error(`[MentionAutocomplete] 保存失败 EP${ep}/SEG${sid}, 耗时: ${duration}ms, 错误:`, e);
          // 保存失败时显示错误
          toast("保存失败: " + ((e && e.message) || "未知错误"), true);
        }
      })();
    }

    // 确保焦点在 textarea 上
    this.textarea.focus();
  }

  open() {
    if (this.isOpen) {
      this.renderItems();
      return;
    }

    this.isOpen = true;
    this.createDropdown();
    this.renderItems();
    this.updatePosition();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    if (this.dropdown && this.dropdown.parentNode) {
      this.dropdown.parentNode.removeChild(this.dropdown);
    }
    this.dropdown = null;
  }

  createDropdown() {
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'mention-dropdown';
    this.dropdown.style.cssText = `
      position: absolute;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      max-height: 300px;
      overflow-y: auto;
      z-index: 1000;
      min-width: 280px;
    `;
    document.body.appendChild(this.dropdown);
  }

  renderItems() {
    if (!this.dropdown) return;

    this.dropdown.innerHTML = '';

    if (this.filteredCandidates.length === 0) {
      this.dropdown.innerHTML = '<div style="padding: 12px; color: #999; font-size: 13px;">暂无匹配的参考素材</div>';
      return;
    }

    this.filteredCandidates.forEach((candidate, index) => {
      const item = document.createElement('div');
      item.className = 'mention-item' + (index === this.selectedIndex ? ' selected' : '');
      item.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        ${index === this.selectedIndex ? 'background: #f0f0f0;' : ''}
      `;

      item.innerHTML = `
        ${candidate.thumbSrc
          ? `<img src="${this.escapeHtml(candidate.thumbSrc)}" alt="" style="width:36px;height:36px;object-fit:cover;border-radius:6px;flex-shrink:0;background:#f4f4f4;" />`
          : `<span style="font-size: 18px; width: 36px; text-align: center; flex-shrink: 0;">${candidate.icon}</span>`
        }
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 500; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${this.escapeHtml(candidate.label)}
          </div>
          <div style="font-size: 12px; color: #999; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${this.escapeHtml(candidate.detail)}
          </div>
        </div>
        <span style="font-size: 11px; color: #999; padding: 2px 6px; background: #f5f5f5; border-radius: 3px;">
          ${candidate.type === 'user-upload' ? '用户上传' : '资产'}
        </span>
      `;

      item.addEventListener('mouseenter', () => {
        this.selectedIndex = index;
        this.renderItems();
      });

      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // 立即插入，不等 blur
        this.insertMention(candidate);
        this.close();
        // 确保 textarea 重新获得焦点
        setTimeout(() => {
          this.textarea.focus();
        }, 10);
      });
      item.addEventListener('click', (e) => {
        // 兜底：某些环境 mousedown 触发不稳定
        e.preventDefault();
        e.stopPropagation();
        this.insertMention(candidate);
        this.close();
        this.textarea.focus();
      });

      this.dropdown.appendChild(item);
    });
  }

  updatePosition() {
    if (!this.dropdown) return;

    const rect = this.textarea.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    // 计算光标位置（简化版，实际位置在 textarea 底部）
    this.dropdown.style.left = (rect.left + scrollLeft) + 'px';
    this.dropdown.style.top = (rect.bottom + scrollTop + 4) + 'px';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

/**
 * prompt_trans 的 @ 提及功能已统一由 asset-mention-picker.js 中的
 * 全局资产选择器接管，MentionAutocomplete 仅作备用，不再对 prompt_trans 初始化。
 */
function initMentionAutocomplete() {
  // prompt_trans 的 @ 由 asset-mention-picker.js 处理，此处不再初始化
}

// ==================== prompt_trans blur 自动保存 + dirty 标记 ====================

/**
 * 为 card 上的 prompt_trans textarea 标记"有未保存改动"
 */
function markPromptDirty(card) {
  if (!card) return;
  card.classList.add('sb-prompt-dirty');
  let badge = card.querySelector('.sb-prompt-dirty-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'sb-prompt-dirty-badge';
    badge.textContent = '未保存';
    const metaRow = card.querySelector('.sb-shot-meta-row');
    if (metaRow) metaRow.appendChild(badge);
  }
}

/**
 * 清除 card 的 dirty 标记
 */
function clearPromptDirty(card) {
  if (!card) return;
  card.classList.remove('sb-prompt-dirty');
  const badge = card.querySelector('.sb-prompt-dirty-badge');
  if (badge) badge.remove();
}

/**
 * 为单个 prompt_trans textarea 绑定 dirty 标记 + blur 保存
 */
function bindPromptBlurSave(textarea) {
  if (!textarea || textarea._blurSaveBound) return;
  textarea._blurSaveBound = true;

  const card = textarea.closest('.shot-card.sb-shot-editor');
  if (!card) return;

  // 记录初始值，用于判断是否真的有改动（_promptSavedValue 供 @ picker 保存后同步基线）
  let savedValue = textarea.value;
  textarea._promptSavedValue = savedValue;

  textarea.addEventListener('input', function () {
    const baseline = textarea._promptSavedValue != null ? textarea._promptSavedValue : savedValue;
    if (textarea.value !== baseline) {
      markPromptDirty(card);
    } else {
      clearPromptDirty(card);
    }
  });

  textarea.addEventListener('blur', async function () {
    if (!card.classList.contains('sb-prompt-dirty')) return;
    const saveFn = typeof window.persistShotDraftByCard === 'function'
      ? window.persistShotDraftByCard
      : null;
    if (!saveFn) return;
    try {
      await saveFn(card, { silent: true });
      savedValue = textarea.value;
      textarea._promptSavedValue = savedValue;
      clearPromptDirty(card);
    } catch (e) {
      showStickyError('提示词保存失败', (e && e.message) || String(e));
    }
  });
}

/**
 * 初始化所有分镜编辑器的 blur 自动保存
 */
function initPromptBlurSave() {
  document.querySelectorAll('.sb-shot-editor textarea[data-field="prompt_trans"]').forEach(bindPromptBlurSave);
}

// 暴露到全局（动态加载镜头后可手动调用）
window.bindPromptBlurSave = bindPromptBlurSave;
window.initPromptBlurSave = initPromptBlurSave;
window.computeRefImgsFromPrompt = computeRefImgsFromPrompt;
window.clearPromptDirty = clearPromptDirty;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPromptBlurSave);
} else {
  initPromptBlurSave();
}

// ─────────────────────────────────────────────────────────────────────────
// 视频生成页“回到顶部”按钮
// 越过“集数选择”区域(#v-g .sb-col-ep)后淡入，点击平滑回顶。
// 按钮挂在 #v-g 内，父级 .vw{display:none} 自动在非视频视图隐藏，
// 故只需用 IntersectionObserver 监听 .sb-col-ep 是否离开视口。
// ─────────────────────────────────────────────────────────────────────────
function initBackTop() {
  var btn = document.getElementById('sb-back-top');
  var vg = document.getElementById('v-g');
  if (!btn || !vg) return;
  var ep = vg.querySelector('.sb-col-ep');

  var epGone = false;
  function update() {
    // 仅当处于视频视图(#v-g.on)且“集数选择”已滚出视口时显示
    var inVideo = vg.classList.contains('on');
    btn.classList.toggle('sb-back-top--visible', inVideo && epGone);
  }

  if (ep && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      epGone = !entries[0].isIntersecting;
      update();
    }, { threshold: 0 });
    io.observe(ep);
    // 切换视图时 .vw 的 display 变化会触发 observer 自动重算，此处无需额外 hook
  } else {
    // 兜底：无 IntersectionObserver 时按滚动距离判断
    window.addEventListener('scroll', function () {
      epGone = (window.pageYOffset || document.documentElement.scrollTop) > 300;
      update();
    }, { passive: true });
    update();
  }

  btn.addEventListener('click', function () {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBackTop);
} else {
  initBackTop();
}

/* === 项目列表页（v-plist，对齐设计 project-creation 网格 + 空间归属）=== */


function openProject(pid) {
  var p = PROJECT_LIST.find(function (x) { return x.id === pid; });
  if (p && window.PAGE_DATA) window.PAGE_DATA.pid = pid;
  const workspace = document.getElementById('v-p');
  if (workspace) {
    const cover = p && /^images\/[A-Za-z0-9_-]+\.(?:png|jpe?g|webp)$/.test(p.cover || '') ? p.cover : '';
    workspace.style.setProperty('--project-cover', cover ? 'url(' + JSON.stringify(new URL(cover, document.baseURI).href) + ')' : 'none');
  }
  var info = document.getElementById('topnav-project-info');
  if (info && p) info.textContent = ' · ' + p.name;
  sw('p');
}

function openCreateProject() {
  var name = window.prompt('创建新项目\n项目名称：', '');
  if (name && name.trim()) {
    PROJECT_LIST.unshift({
      id: 'p_' + Date.now(), name: name.trim(), episodes: 0, target: '欧美 / en-US',
      progress: 0, space: '个人空间', updated: '2026-06-23', color: '#00DA5A'
    });
    renderProjectList();
  }
}



/* === 项目卡（对齐设计 space-brandnew-item-card）=== */
function toggleProjectMenu(pid) {
  document.querySelectorAll('.space-card-menu').forEach(function (m) { if (m.id !== 'menu-' + pid) m.classList.remove('open'); });
  var menu = document.getElementById('menu-' + pid);
  if (menu) menu.classList.toggle('open');
}
function renameProject(pid) {
  var p = PROJECT_LIST.find(function (x) { return x.id === pid; });
  if (!p) return;
  var name = window.prompt('重命名项目', p.name);
  if (name && name.trim()) { p.name = name.trim(); renderProjectList(); }
}
function editProject(pid) { window.alert('编辑工作台（自定义封面等）— Demo 占位'); }
function projectMembers(pid) { window.alert('成员管理 — Demo 占位'); }
function moveToTrash(pid) {
  if (window.confirm('确认将此项目移动至回收站？')) {
    var index = PROJECT_LIST.findIndex(function (x) { return x.id === pid; });
    if (index >= 0) PROJECT_LIST.splice(index, 1);
    renderProjectList();
  }
}
document.addEventListener('click', function (e) {
  if (!e.target.closest('.space-card-more')) {
    document.querySelectorAll('.space-card-menu').forEach(function (m) { m.classList.remove('open'); });
  }
});

const PROJECT_LIST = [
  { id:'feihun', name:'示例短剧 · 英文版', episodes:65, target:'欧美 / en-US', progress:100, directions:['欧美'], cover:'images/ceo_office_day_bright_v0001.png', updated:'2026-06-15', color:'#00DA5A' },
  { id:'sample-drama', name:'短剧出海重制 demo_v3', episodes:10, target:'欧美 / en-US', progress:60, directions:['欧美'], cover:'images/hotel_entrance_day_outdoor.png', updated:'2026-06-08', color:'#67F9FF' },
  { id:'haiwai_v2', name:'海外版本 V2', episodes:12, target:'日韩 / ja-JP', progress:30, directions:['日本','欧美'], cover:'images/hotel_lobby_reception_day_bright_v0001.png', updated:'2026-05-29', color:'#A3FFEC' },
  { id:'test_canvas', name:'测试画布', episodes:3, target:'东南亚 / th-TH', progress:10, directions:['韩国'], cover:'images/hotel_lounge_area_day_bright.png', updated:'2026-05-20', color:'#5ee8ee' },
  { id:'ad_test', name:'广告测试画布', episodes:1, target:'欧美 / en-US', progress:5, directions:['欧美'], cover:'images/hotel_room_morning_sun_v0002.png', updated:'2026-05-15', color:'#65FFAA' },
];

function escapeProjectText(value) {
  return String(value).replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;', '"':'&quot;',"'":'&#39;'}[c];});
}

function renderProjectList() {
  var grid = document.getElementById('plist-grid');
  if (!grid) return;
  grid.innerHTML = PROJECT_LIST.map(function (p) {
    var doneBadge = p.progress >= 100 ? '<span class="space-card-done">✓</span>' : '';
    var dirs = (p.directions || []).map(function (d) { return '<span class="dir-tag">' + d + '</span>'; }).join('');
    return '<article class="space-card" data-item-id="' + p.id + '">' +
      '<button class="space-card-action space-card-select" type="button" title="选择"><svg class="svg-icon"><use xlink:href="#icon-space-select-normal"/></svg></button>' +
      '<button class="space-card-action space-card-favorite" type="button" title="收藏"><svg class="svg-icon"><use xlink:href="#icon-space-collect-normal"/></svg></button>' +
      '<button type="button" aria-label="进入' + escapeProjectText(p.name) + '" class="space-card-cover" onclick="openProject(\'' + p.id + '\')" >' +
        (p.cover ? '<img class="space-card-cover-img" src="' + p.cover + '" alt="" loading="lazy">' : '<div class="space-card-cover-bg" style="background:linear-gradient(135deg,' + p.color + '33,#1a1a1a)"></div>') +
        doneBadge +
      '</button>' +
      '<footer class="space-card-footer">' +
        '<span class="space-card-type-icon"><svg class="svg-icon"><use xlink:href="#icon-space-workbench"/></svg></span>' +
        '<div class="space-card-text">' +
          '<span class="space-card-title">' + escapeProjectText(p.name) + '</span>' +
          '<small>' + p.episodes + ' 集 · ' + p.updated + '</small>' +
          '<div class="space-card-dirs">' + dirs + '</div>' +
        '</div>' +
        '<div class="space-card-more">' +
          '<button class="space-card-action space-card-more-btn" type="button" onclick="toggleProjectMenu(\'' + p.id + '\')" title="更多"><svg class="svg-icon"><use xlink:href="#icon-space-more"/></svg></button>' +
          '<div class="space-card-menu" id="menu-' + p.id + '">' +
            '<button onclick="renameProject(\'' + p.id + '\')">重命名</button>' +
            '<button onclick="editProject(\'' + p.id + '\')">编辑工作台</button>' +
            '<button onclick="projectMembers(\'' + p.id + '\')">成员</button>' +
            '<button class="danger" onclick="moveToTrash(\'' + p.id + '\')">移动至回收站</button>' +
          '</div>' +
        '</div>' +
      '</footer>' +
    '</article>';
  }).join('');
}

// 初始化（PROJECT_LIST 定义之后调用，避免 TDZ）
renderProjectList();
document.body.classList.add("on-plist");

/* === 转化方向选择（子项目架构：原始共享、转化独立）=== */
function addTargetDirection() {
  var dir = window.prompt('新增转化方向（创建独立子项目）\n可选：欧美 / 日本 / 韩国', '日本');
  if (dir && dir.trim()) {
    window.alert('已创建「' + dir.trim() + '」转化方向子项目\n\n· 原始剧集解析、识别信息：共享\n· 转化后素材、参考图、配置：独立\n（Demo 占位）');
  }
}
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.target-opt').forEach(function (opt) {
    opt.addEventListener('click', function () {
      document.querySelectorAll('.target-opt').forEach(function (o) { o.classList.remove('on'); });
      opt.classList.add('on');
      var input = opt.querySelector('input'); if (input) input.checked = true;
    });
  });
});

function previewEpisodeFile(ep, type) {
  var modal = document.getElementById('preview-modal');
  var title = document.getElementById('preview-title');
  var body = document.getElementById('preview-body');
  if (!modal) return;
  title.textContent = '第 ' + ep + ' 集 · ' + (type === 'video' ? '视频预览' : '字幕预览');
  if (type === 'video') {
    body.innerHTML = '<video controls style="width:100%;max-height:60vh;background:#000;border-radius:8px"></video><p style="color:var(--t3);font-size:12px;margin-top:8px">支持：mp4 / mov / mpg / mpeg / flv</p>';
  } else {
    body.innerHTML = '<pre style="color:var(--t2);font-size:12px;white-space:pre-wrap;max-height:60vh;overflow:auto;background:rgba(0,0,0,0.3);padding:12px;border-radius:8px">[第 '+ep+' 集字幕预览]\n\n支持：json / srt / ass\n\n1\n00:00:01,000 --> 00:00:04,000\n（示例对白）</pre>';
  }
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
}
function closePreview() {
  var modal = document.getElementById('preview-modal');
  if (modal) modal.hidden = true;
  document.body.style.overflow = '';
}

/* === 剧集列表：预览按钮注入到视频/字幕上传列内 === */
function injectEpisodePreviewButtons() {
  document.querySelectorAll('#v-p .tbl tbody tr').forEach(function (tr, idx) {
    if (tr.querySelector('.ep-preview-btn')) return;
    var ep = idx + 1;
    var vLabel = tr.querySelector('.file-btn-v');
    var sLabel = tr.querySelector('.file-btn-s');
    if (vLabel) vLabel.insertAdjacentHTML('afterend', '<button type="button" class="ep-preview-btn" onclick="previewEpisodeFile(\''+ep+'\',\'video\')" title="预览视频">▶</button>');
    if (sLabel) sLabel.insertAdjacentHTML('afterend', '<button type="button" class="ep-preview-btn" onclick="previewEpisodeFile(\''+ep+'\',\'subtitle\')" title="预览字幕">预览</button>');
  });
}
document.addEventListener('DOMContentLoaded', injectEpisodePreviewButtons);

/* === 转化方向子项切换（topnav）=== */
function switchTargetDirection() {
  openTargetModal();
}

/* === Demo 状态切换器（悬浮，覆盖各状态显示）=== */
function toggleDemoStateSwitcher() {
  var p = document.getElementById('dss-panel');
  if (p) p.hidden = !p.hidden;
}
document.addEventListener('click', function (e) {
  var sw = document.getElementById('demo-state-switcher');
  var p = document.getElementById('dss-panel');
  if (sw && p && !sw.contains(e.target) && !p.hidden) p.hidden = true;
});

/* === 状态切换：完整联动看板（看板内容随状态变化，非仅文字）===
   pending : 进度 0%，单集全待处理(灰)，无统计/无结果预览，CTA「开始全集分析」
   parsing : 进度 60%，1-6集完成/第7集解析中/8-10待处理，无统计/无结果预览，CTA「解析中…」
   done    : 进度 100%，单集全完成(绿)，显示统计 + 解析结果预览，CTA「已完成分析」
*/
function setParseState(state, btn) {
  var card = document.querySelector('.agent-entry-card');
  var board = document.querySelector('#v-p .parse-board');
  var sr = document.querySelector('#v-p .sr');
  var preview = document.querySelector('#v-p .parse-result-preview');
  var ctaBtn = document.getElementById('btn-analyze-full');
  var badge = document.querySelector('.analyze-status-badge');
  var barFill = document.querySelector('.analyze-status-bar > span');
  var percent = document.querySelector('#v-p .progress-percent');
  var ecCells = document.querySelectorAll('#v-p .eb .ec');
  var numDone = document.querySelector('#v-p .sbar-num[data-key="done"]');
  var numPars = document.querySelector('#v-p .sbar-num[data-key="parsing"]');
  var numPend = document.querySelector('#v-p .sbar-num[data-key="pending"]');

  if (card) { card.classList.remove('parse-pending', 'parse-parsing', 'parse-done'); card.classList.add('parse-' + state); }
  if (board) board.style.display = ''; /* 看板始终显示，呈现各状态 */

  var cfg;
  if (state === 'done') {
    cfg = { badge: '● 已完成解析', pct: '100%', fill: '100%', btn: '已完成分析', disabled: true, nums: [10, 0, 0], showSR: true, showPreview: true };
  } else if (state === 'parsing') {
    cfg = { badge: '● 解析中', pct: '60%', fill: '60%', btn: '解析中…', disabled: true, nums: [6, 1, 3], showSR: false, showPreview: false };
  } else {
    cfg = { badge: '● 待解析', pct: '0%', fill: '0%', btn: '开始全集分析', disabled: false, nums: [0, 0, 10], showSR: false, showPreview: false };
  }

  if (badge) badge.textContent = cfg.badge;
  if (percent) percent.textContent = cfg.pct;
  if (barFill) barFill.style.width = cfg.fill;
  if (ctaBtn) {
    ctaBtn.disabled = cfg.disabled;
    if (cfg.disabled) {
      ctaBtn.innerHTML = '<span>' + cfg.btn + '</span>';
    } else {
      var _bean = (typeof _BEAN_ICON !== 'undefined') ? _BEAN_ICON : '';
      ctaBtn.innerHTML = _bean + '<span class="gen-score">100</span><span>' + cfg.btn + '</span>';
    }
  }
  if (sr) sr.style.display = cfg.showSR ? '' : 'none';
  if (preview) preview.style.display = cfg.showPreview ? '' : 'none';
  // 短剧重制三阶段：阶段1 状态/按钮 + 「查看解析结果」入口 + 解析结果占位
  var stageStatus = document.getElementById('vp-stage-parse-status');
  var stageBtn = document.getElementById('vp-stage-parse-btn');
  var stageView = document.getElementById('vp-stage-parse-view');
  var stageCard = document.getElementById('vp-stage-parse');
  var parseEmpty = document.querySelector('#vp-remake-parse .vp-parse-empty');
  if (stageStatus) {
    stageStatus.textContent = (state === 'done') ? '✓ 已完成' : (state === 'parsing' ? '解析中' : '未解析');
    stageStatus.classList.toggle('is-done', state === 'done');
  }
  if (stageBtn) {
    if (state === 'pending') { stageBtn.disabled = false; stageBtn.textContent = '开始解析'; stageBtn.style.display = ''; }
    else if (state === 'parsing') { stageBtn.disabled = false; stageBtn.textContent = '查看解析状态'; stageBtn.style.display = ''; }
    else { stageBtn.disabled = true; stageBtn.textContent = '已解析'; stageBtn.style.display = ''; }
  }
  if (stageView) stageView.style.display = (state === 'done') ? '' : 'none';
  if (stageCard) stageCard.classList.toggle('is-done', state === 'done');
  if (parseEmpty) parseEmpty.style.display = (state === 'done') ? 'none' : '';
  // 阶段②③完成态随解析状态联动：仅 done 时绿色，pending/parsing 不绿
  var dirCard = document.getElementById('vp-stage-dir');
  var dirBadge = document.getElementById('vp-stage-dir-status');
  if (dirCard) dirCard.classList.toggle('is-done', state === 'done');
  if (dirBadge) {
    if (state === 'done') {
      var curDir = (document.getElementById('sp-current') || {}).textContent || '欧美';
      dirBadge.textContent = '✓ 已选定：' + curDir;
      dirBadge.classList.add('is-done');
    } else {
      dirBadge.textContent = '待选定';
      dirBadge.classList.remove('is-done');
    }
  }
  var stage3cards = document.querySelectorAll('#vp-remake-overview .vp-flow-stage--vert');
  if (stage3cards.length >= 3) {
    var card3 = stage3cards[2];
    var badge3 = card3.querySelector('.vp-flow-stage-badge');
    card3.classList.toggle('is-done', state === 'done');
    if (badge3) {
      badge3.textContent = (state === 'done') ? '✓ 已完成' : '未开始';
      badge3.classList.toggle('is-done', state === 'done');
    }
  }
  if (numDone) numDone.textContent = cfg.nums[0];
  if (numPars) numPars.textContent = cfg.nums[1];
  if (numPend) numPend.textContent = cfg.nums[2];

  /* 单集色块：done 全绿；parsing 前6绿/第7橙/后3灰；pending 全灰 */
  ecCells.forEach(function (cell, idx) {
    cell.classList.remove('ec-d', 'ec-p', 'ec-w');
    var st;
    if (state === 'done') st = 'ec-d';
    else if (state === 'parsing') st = (idx < 6) ? 'ec-d' : (idx === 6 ? 'ec-p' : 'ec-w');
    else st = 'ec-w';
    cell.classList.add(st);
  });

  document.querySelectorAll('.dss-section:first-child .dss-opt').forEach(function (b) { b.classList.remove('on'); });
  if (btn) btn.classList.add('on');
}

/* === 项目管理板块：双子tab 切换（解析结果 / 团队与进度）=== */
function switchVPSubtab(which){
  document.querySelectorAll('#vp-panel-manage .vp-subtab').forEach(function(b){ b.classList.toggle('active', b.dataset.subtab === which); });
  document.querySelectorAll('#vp-panel-manage .vp-subtab-pane').forEach(function(p){ p.classList.toggle('active', p.id === 'vp-pane-' + which); });
}

/* === 顶层大类 TAB 切换（短剧重制 / 团队管理 / 项目进度）=== */
function switchVPTopTab(which){
  document.querySelectorAll('#v-p .vp-toptab').forEach(function(b){ b.classList.toggle('active', b.dataset.toptab === which); });
  document.querySelectorAll('#v-p .vp-toptab-pane').forEach(function(p){ p.classList.toggle('active', p.id === 'vp-toptab-' + which); });
  if (which === 'team'){ renderTeamOverview(); renderTeamNotice(); }
  else if (which === 'progress'){ renderProgressDashboard(); }
}

/* === 短剧重制内视图切换（overview 三阶段总览 / import 导入与解析 / parse 解析结果）=== */
function switchRemakeView(which){
  document.querySelectorAll('#vp-toptab-remake .vp-remake-view').forEach(function(v){ v.classList.toggle('active', v.id === 'vp-remake-' + which); });
  try { document.getElementById('vp-toptab-remake').scrollIntoView({ block: 'start' }); } catch (_) {}
}

/* === 团队协作与项目管理（demo 内存数据）===
   依 PRD§四「其他需求」/§五§4 +《团队协作与项目管理-功能与交互需求》：
   - 成员管理面板：仅治理（权限层级/转移负责人/添加/删除），不含任务分配。
   - 任务分配在团队管理 tab：成员缩略卡 → 详情弹窗（每资产/集+状态）→ 编辑分配。
   - 分配三维度：资产库(精细到具体资产，复用资产选择器) / 剧集改编(按集) / 视频生成(按集 E01-65)；分配即权限(编辑/生成/提交审核)。
   - 进度状态=审核流程：未开始/进行中/待审核/已完成（成员提交→管理员确认/驳回）。
   本次为面板看板层设置与展示，未下沉到各工作界面分镜/镜头级只读联动。*/
var TOTAL_EPS = 65;
var TEAM_INFO = { name: '创意工作室', id: 'CW-2026-001', creator: '张明', total: 8, admins: 2, members: 6 };
/* 协作机制设置（项目级，§四）：开关 + 阈值，机制细则见《多人协作与管理-需求文档》*/
var TEAM_CONFIG = {
  claim: true, claimTimeout: 48,          // 认领机制 + 超时阈值(h)
  auditAsset: true, auditAdapt: false, auditVideo: true, auditDouble: false,  // 审核三开关 + 双签
  limit: true, n1: 4, n2: 6,              // 数量上限 + 阈值
  quota: true, quotaTotal: 50000          // 积分配额 + 团队总额
};
function _range(a, b){ var r = []; for (var i = a; i <= b; i++) r.push(i); return r; }
var TEAM_MEMBERS = [
  { name: '张明', role: 'admin', title: '项目负责人', quota: 0, used: 8200 },
  { name: '李娜', role: 'admin', title: '制作主管', quota: 0, used: 5400 },
  { name: '王芳', role: 'member', title: '剪辑师', quota: 12000, used: 11800, assetAll:false, assets:[], adaptAll:false, adaptEps:[], videoAll:false, videoEps:_range(1,22) },
  { name: '刘洋', role: 'member', title: '翻译',   quota: 6000,  used: 2100, assetAll:false, assets:[], adaptAll:true,  adaptEps:[], videoAll:false, videoEps:[] },
  { name: '陈静', role: 'member', title: '美术',   quota: 8000,  used: 4300, assetAll:false, assets:['濯樱桥_夜晚灯光','姜家卧室_夜晚暖光','酒店客房_夜晚蓝光','酒店大堂前台_白天明亮','亲密照片','钻戒','定制礼服'], adaptAll:false, adaptEps:[], videoAll:false, videoEps:[] },
  { name: '赵磊', role: 'member', title: '剪辑师', quota: 12000, used: 9600, assetAll:false, assets:[], adaptAll:false, adaptEps:[], videoAll:false, videoEps:_range(23,44) },
  { name: '孙琳', role: 'member', title: '校对',   quota: 5000,  used: 5000, assetAll:false, assets:[], adaptAll:false, adaptEps:_range(1,20), videoAll:false, videoEps:[] },
  { name: '周杰', role: 'member', title: '运营',   quota: 7000,  used: 0,    assetAll:false, assets:[], adaptAll:false, adaptEps:[], videoAll:false, videoEps:_range(45,65) }
];
/* 进度状态=审核流程；65 集演示数据（分镜合计约 800）*/
var EP_STATUS_MAP = {
  done:   { cls: 'done',   text: '已完成' },
  review: { cls: 'review', text: '待审核' },
  doing:  { cls: 'doing',  text: '进行中' },
  todo:   { cls: 'todo',   text: '未开始' }
};
var EP_PROGRESS = (function(){
  var arr = [];
  for (var i = 1; i <= TOTAL_EPS; i++) {
    var shots = 11 + (i % 4);
    var vDone = 0, status = 'todo';
    if (i <= 18) { vDone = shots; status = 'done'; }                          /* 1-18 已完成（审核通过）*/
    else if (i <= 24) { vDone = Math.floor(shots * 0.55); status = 'review'; }/* 19-24 待审核（已提交）*/
    else if (i <= 30) { vDone = Math.floor(shots * 0.35); status = 'doing'; } /* 25-30 进行中；31-65 未开始 */
    arr.push({ ep: i, shots: shots, vDone: vDone, status: status });
  }
  return arr;
})();
/* 信息通知：msg=消息通知(审核/分配)，log=生成日志；me=与当前用户(张明/admin)有关 */
var _noticeTab = 'msg';
var _noticeMine = false;
var _currentMemberName = '张明';
var _NOTIFICATIONS = [
  /* 消息通知：审批提交 / 通过 / 驳回、任务分配、成员变动（新增 / 设置管理员）*/
  { type:'msg', text:'王芳 提交了 第19集 视频审核，请确认', time:'10:25', action:'去审核', act:'audit', me:true },
  { type:'msg', text:'王芳 提交了 第20集 视频审核，请确认', time:'10:02', action:'去审核', act:'audit', me:true },
  { type:'msg', text:'你 确认通过了 第18集 视频审核', time:'昨天', action:'查看', act:'view', me:true },
  { type:'msg', text:'你 驳回了 第24集 第07镜，需重新生成', time:'昨天', action:'查看', act:'view', me:true },
  { type:'msg', text:'张明 将 第23-44集 视频任务分配给 赵磊', time:'昨天', action:'查看任务', act:'task', me:true },
  { type:'msg', text:'新增成员「吴婷」加入团队（成员）', time:'昨天', action:null, act:'member', me:true },
  { type:'msg', text:'李娜 被设置为管理员', time:'昨天', action:null, act:'member', me:true },
  /* 生成日志：按 人 / 时间 / 操作 记录，含生成失败 */
  { type:'log', text:'[生成] 系统 · 第19集 批量生成 13 镜已排队', time:'10:20', action:null },
  { type:'log', text:'[生成] 系统 · 第18集 视频合成完成（13 镜）', time:'09:50', action:null },
  { type:'log', text:'[生成失败] 系统 · 第24集 第07镜 生成失败，已自动重试 2 次', time:'昨天', action:null },
  { type:'log', text:'[改编] 系统 · 资产库 批量改编完成（67 项）', time:'09:00', action:null },
  { type:'log', text:'[生成] 系统 · 第03集 第07镜 视频生成完成', time:'昨天', action:null }
];
var _memberPanelMode = 'admin';   /* 'admin' 可编辑 | 'readonly' 仅查看 */
var _detailIdx = -1;              /* 成员详情弹窗当前成员下标 */
var _detailView = 'detail';       /* 'detail' 概览 | 'assign' 编辑分配 */
var _addRole = 'member';

function _recalcTeamCounts(){
  var admins = TEAM_MEMBERS.filter(function(m){ return m.role === 'admin'; }).length;
  TEAM_INFO.admins = admins;
  TEAM_INFO.members = TEAM_MEMBERS.length - admins;
  TEAM_INFO.total = TEAM_MEMBERS.length;
}
function _refreshTeamAll(){ try { renderTeamOverview(); } catch(_){} try { renderProgressDashboard(); } catch(_){} try { renderTeamNotice(); } catch(_){} }
/* 集数数组 → "第01集-22"（连续折叠）*/
function _epSpan(s, e){ var pad = function(n){ return '第' + String(n).padStart(2,'0') + '集'; }; return (s === e) ? pad(s) : (pad(s) + '-' + e); }
function _epsLabel(eps){
  if (!eps || !eps.length) return '';
  var a = eps.slice().sort(function(x,y){ return x-y; });
  var parts = [], start = a[0], prev = a[0];
  for (var i = 1; i < a.length; i++) {
    if (a[i] === prev + 1) { prev = a[i]; continue; }
    parts.push(_epSpan(start, prev)); start = a[i]; prev = a[i];
  }
  parts.push(_epSpan(start, prev));
  return parts.join('、');
}
function _memberSummary(m){
  if (m.role === 'admin') return '全部权限 · 全集';
  var parts = [];
  if (m.assetAll) parts.push('资产库·全部');
  else if (m.assets && m.assets.length) parts.push('资产库·' + m.assets.length + '项');
  if (m.adaptAll) parts.push('改编·全集');
  else if (m.adaptEps && m.adaptEps.length) parts.push('改编·' + _epsLabel(m.adaptEps));
  if (m.videoAll) parts.push('视频·全集');
  else if (m.videoEps && m.videoEps.length) parts.push('视频·' + _epsLabel(m.videoEps));
  return parts.length ? parts.join(' · ') : '未分配任务';
}
/* 缩略卡三阶段短摘要（单维度），无则 null */
function _stageShort(m, dim){
  if (m.role === 'admin') return '全部';
  if (dim === 'asset') return m.assetAll ? '全部' : (m.assets && m.assets.length ? m.assets.length + '项' : null);
  if (dim === 'adapt') return m.adaptAll ? '全集' : (m.adaptEps && m.adaptEps.length ? _epsLabel(m.adaptEps) : null);
  if (dim === 'video') return m.videoAll ? '全集' : (m.videoEps && m.videoEps.length ? _epsLabel(m.videoEps) : null);
  return null;
}
/* 成员所分配内容的完成统计（视频优先，否则改编/资产）*/
function _memberScopeProgress(m){
  var done = 0, total = 0, review = 0;
  var vEps = m.videoAll ? _range(1, TOTAL_EPS) : (m.videoEps || []);
  if (vEps.length) {
    vEps.forEach(function(ep){ var e = EP_PROGRESS[ep-1]; if (e){ total++; if (e.status === 'done') done++; if (e.status === 'review') review++; } });
    return { done: done, total: total, pct: total ? Math.round(done/total*100) : 0, review: review, kind: 'video' };
  }
  var aEps = m.adaptAll ? _range(1, TOTAL_EPS) : (m.adaptEps || []);
  if (aEps.length) return { done: aEps.length, total: aEps.length, pct: 100, review: 0, kind: 'adapt' };
  if (m.assetAll || (m.assets && m.assets.length)) { var t = m.assetAll ? _assetTotal() : m.assets.length; return { done: t, total: t, pct: 100, review: 0, kind: 'asset' }; }
  return { done: 0, total: 0, pct: 0, review: 0, kind: 'none' };
}
/* 积分配额：团队已消耗 = 成员 used 之和；成员剩余 = quota - used（used 由工具侧生成规则回写）*/
function _quotaUsedTotal(){ return TEAM_MEMBERS.reduce(function(s,m){ return s + (Number(m.used)||0); }, 0); }
function _quotaAssignedTotal(){ return TEAM_MEMBERS.reduce(function(s,m){ return s + (Number(m.quota)||0); }, 0); }
function _quotaRemaining(m){ return (Number(m.quota)||0) - (Number(m.used)||0); }
function _quotaState(m){
  var r = _quotaRemaining(m);
  if (r <= 0) return 'exhausted';
  if (r <= (Number(m.quota)||0) * 0.1) return 'low';
  return 'ok';
}
/* 从资产库 DOM 读取真实资产，按类分组（角色·服装/场景/道具）*/
function _getAssetGroups(){
  var groups = { characters: [], scenes: [], props: [] };
  document.querySelectorAll('.asset-card[data-kind][data-aid]').forEach(function(c){
    var k = c.getAttribute('data-kind'), a = c.getAttribute('data-aid');
    if (groups[k] && groups[k].indexOf(a) < 0) groups[k].push(a);
  });
  return groups;
}
/* 按人物/场景/道具本身分组（base-id），含中文名 + 转化名 + 子项数 */
function _getAssetBaseGroups(){
  var groups = { characters: [], scenes: [], props: [] };
  var seen = { characters: {}, scenes: {}, props: {} };
  document.querySelectorAll('.char-group.asset-group[data-kind][data-base-id]').forEach(function(g){
    var k = g.getAttribute('data-kind'), bid = g.getAttribute('data-base-id');
    if (!groups[k] || !bid) return;
    var oriEl = g.querySelector('.char-group-name-ori');
    var transEl = g.querySelector('.char-group-name-trans strong');
    var nameOri = oriEl ? oriEl.textContent.replace(/^中文名\s*/, '').trim() : bid;
    var nameTrans = transEl ? transEl.textContent.trim() : '';
    var subCount = g.querySelectorAll('.char-outfit-card').length || 1;
    if (seen[k][bid]) { seen[k][bid].subCount += subCount; return; }
    var item = { baseId: bid, nameOri: nameOri, nameTrans: nameTrans, subCount: subCount, kind: k };
    seen[k][bid] = item; groups[k].push(item);
  });
  return groups;
}
function _assetTotal(){ var s = (window.PAGE_DATA && window.PAGE_DATA.stats) || {}; return (Number(s.characters)||0) + (Number(s.scenes)||0) + (Number(s.props)||0); }
function _epRangeStats(eps){ var c = { done:0, review:0, doing:0, todo:0 }; eps.forEach(function(ep){ var e = EP_PROGRESS[ep-1]; if (e && EP_STATUS_MAP[e.status]) c[e.status]++; }); return c; }

function _syncTeamName(){
  var el = document.getElementById('vp-team-name');
  if (el && !el.querySelector('input')) el.textContent = TEAM_INFO.name;
}
/* 团队昵称 inline 编辑（团队管理 tab 信息卡）*/
function editTeamName(){
  var el = document.getElementById('vp-team-name');
  if (!el || el.querySelector('input')) return;
  var old = el.textContent.trim();
  var input = document.createElement('input');
  input.type = 'text'; input.value = old; input.className = 'vp-team-name-input';
  el.textContent = ''; el.appendChild(input); input.focus(); input.select();
  input.addEventListener('blur', function(){ var v = (input.value||'').trim(); if (v) { TEAM_INFO.name = v; _syncTeamName(); } else el.textContent = old; });
  input.addEventListener('keydown', function(e){ if (e.key === 'Enter') input.blur(); else if (e.key === 'Escape') el.textContent = old; });
}

/* ============ 成员管理面板（治理：角色/转移负责人/增删，无任务分配）============ */
function openMemberPanel(mode){
  _memberPanelMode = (mode === 'readonly') ? 'readonly' : 'admin';
  var modal = document.getElementById('member-panel-modal');
  if (!modal) { modal = document.createElement('div'); modal.id = 'member-panel-modal'; modal.className = 'member-panel-modal'; document.body.appendChild(modal); }
  _renderMemberListView(modal);
  modal.classList.add('on'); document.body.style.overflow = 'hidden';
}
function _renderMemberListView(modal){
  var readonly = (_memberPanelMode === 'readonly');
  _recalcTeamCounts();
  var admins = TEAM_MEMBERS.filter(function(m){ return m.role === 'admin'; });
  var mems = TEAM_MEMBERS.filter(function(m){ return m.role !== 'admin'; });
  function itemHTML(m){
    var i = TEAM_MEMBERS.indexOf(m);
    var initial = (m.name || '?').charAt(0);
    var roleCls = m.role === 'admin' ? 'is-admin' : 'is-member';
    var roleText = m.role === 'admin' ? '管理员' : '成员';
    var isCreator = (TEAM_INFO.creator === m.name);
    var isSelf = (m.name === _currentMemberName);
    var ops = '';
    if (!readonly) {
      ops = '<div class="mp-item-ops">';
      if (m.role === 'admin') {
        if (!isCreator && !isSelf) ops += '<button type="button" class="mp-item-btn" onclick="changeMemberRole(' + i + ',\'member\')">设为成员</button>';
        if (!isCreator) ops += '<button type="button" class="mp-item-btn" onclick="setAsCreator(' + i + ')">移交负责人</button>';
      } else {
        if (!isSelf) ops += '<button type="button" class="mp-item-btn" onclick="changeMemberRole(' + i + ',\'admin\')">设为管理员</button>';
        if (!isSelf) ops += '<button type="button" class="mp-item-btn mp-item-del" onclick="removeMember(' + i + ')">移除</button>';
      }
      if (isSelf) {
        if (isCreator) ops += '<button type="button" class="mp-item-btn" disabled title="请先移交负责人权限后再退出">退出团队</button>';
        else ops += '<button type="button" class="mp-item-btn mp-item-del" onclick="exitTeamSelf()">退出团队</button>';
      }
      ops += '</div>';
    }
    return '<div class="member-panel-item">' +
      '<div class="member-panel-avatar">' + initial + '</div>' +
      '<div class="member-panel-item-main"><div class="member-panel-name">' + m.name + (m.title ? '<span class="mp-item-title">' + m.title + '</span>' : '') + (isCreator ? '<span class="mp-creator-tag">负责人</span>' : '') + '</div>' +
        '<div class="mp-item-summary">' + (m.role === 'admin' ? '全部权限 · 全集' : _memberSummary(m)) + '</div></div>' +
      '<span class="member-panel-role ' + roleCls + '">' + roleText + '</span>' + ops + '</div>';
  }
  modal.innerHTML =
    '<div class="member-panel-bg" onclick="closeMemberPanel()"></div>' +
    '<div class="member-panel-card">' +
      '<div class="member-panel-head"><div class="member-panel-head-info">' +
        '<div class="member-panel-head-title">' + TEAM_INFO.name + ' · 成员管理</div>' +
        '<div class="member-panel-head-meta">团队 ID <span class="mono">' + TEAM_INFO.id + '</span> · 负责人 ' + TEAM_INFO.creator +
        ' · 成员 ' + TEAM_INFO.total + '（管理员 ' + TEAM_INFO.admins + ' / 成员 ' + TEAM_INFO.members + '）</div>' +
      '</div><button type="button" class="member-panel-close" onclick="closeMemberPanel()" aria-label="关闭">×</button></div>' +
      '<div class="member-panel-body">' +
        (readonly ? '' : '<button type="button" class="mp-add-btn" onclick="openMemberAddForm()">+ 添加成员</button>') +
        '<div class="mp-panel-tip">成员管理用于设置权限层级、转移负责人与增删成员；具体任务分配请在「团队管理」页的成员卡片中设置。</div>' +
        '<div class="member-panel-group"><div class="member-panel-group-title">管理员 · ' + admins.length + '</div>' + (admins.length ? admins.map(itemHTML).join('') : '<div class="mp-empty">暂无管理员</div>') + '</div>' +
        '<div class="member-panel-group"><div class="member-panel-group-title">成员 · ' + mems.length + '</div>' + (mems.length ? mems.map(itemHTML).join('') : '<div class="mp-empty">暂无成员</div>') + '</div>' +
      '</div>' +
    '</div>';
}
function openMemberAddForm(){
  var modal = document.getElementById('member-panel-modal'); if (!modal) return;
  _addRole = 'member';
  modal.innerHTML =
    '<div class="member-panel-bg" onclick="closeMemberPanel()"></div>' +
    '<div class="member-panel-card">' +
      '<div class="member-panel-head"><div class="member-panel-head-info">' +
        '<div class="mp-back-row"><button type="button" class="mp-back" onclick="_backToList()" aria-label="返回">‹</button><span class="member-panel-head-title">添加成员</span></div>' +
        '<div class="member-panel-head-meta">新成员默认为「成员」角色，任务可在团队管理页分配</div>' +
      '</div><button type="button" class="member-panel-close" onclick="closeMemberPanel()" aria-label="关闭">×</button></div>' +
      '<div class="member-panel-body">' +
        '<div class="mp-section"><div class="mp-section-title">成员信息</div>' +
        '<div class="mp-form-row"><input type="text" id="mp-name-input" class="mp-input" placeholder="成员昵称" maxlength="12"></div>' +
        '<div class="mp-form-row"><input type="text" id="mp-title-input" class="mp-input" placeholder="职位 / 职责（选填）" maxlength="20"></div>' +
        '<div class="mp-form-row"><div class="mp-roles"><button type="button" class="mp-role selected" data-role="member" onclick="_pickAddRole(\'member\')">成员</button><button type="button" class="mp-role" data-role="admin" onclick="_pickAddRole(\'admin\')">管理员</button></div></div></div>' +
      '</div>' +
      '<div class="member-panel-foot"><button type="button" class="mp-btn mp-btn-ghost" onclick="_backToList()">取消</button><button type="button" class="mp-btn mp-btn-primary" onclick="saveMemberAdd()">添加</button></div>' +
    '</div>';
}
function _pickAddRole(r){ _addRole = r; document.querySelectorAll('#member-panel-modal .mp-role').forEach(function(b){ b.classList.toggle('selected', b.dataset.role === r); }); }
function _backToList(){ var modal = document.getElementById('member-panel-modal'); if (modal) _renderMemberListView(modal); }
function saveMemberAdd(){
  var name = (document.getElementById('mp-name-input').value || '').trim() || ('成员' + (TEAM_MEMBERS.length + 1));
  var title = (document.getElementById('mp-title-input').value || '').trim();
  var m = { name: name, role: _addRole, title: title, assetAll:false, assets:[], adaptAll:false, adaptEps:[], videoAll:false, videoEps:[] };
  if (_addRole === 'admin') { m.assetAll = true; m.adaptAll = true; m.videoAll = true; }
  TEAM_MEMBERS.push(m);
  _recalcTeamCounts(); _backToList(); _refreshTeamAll();
}
function changeMemberRole(idx, role){
  var m = TEAM_MEMBERS[idx]; if (!m) return;
  m.role = role;
  if (role === 'admin') { m.assetAll = true; m.adaptAll = true; m.videoAll = true; m.assets = []; m.adaptEps = []; m.videoEps = []; }
  else { m.assetAll = false; m.adaptAll = false; m.videoAll = false; }
  _recalcTeamCounts(); var modal = document.getElementById('member-panel-modal'); if (modal) _renderMemberListView(modal); _refreshTeamAll();
}
function setAsCreator(idx){
  var m = TEAM_MEMBERS[idx]; if (!m || m.role !== 'admin') return;
  if (!window.confirm('确认将项目负责人转移给「' + m.name + '」？转移后你将不再是负责人。')) return;
  TEAM_INFO.creator = m.name;
  var modal = document.getElementById('member-panel-modal'); if (modal) _renderMemberListView(modal);
  var cr = document.getElementById('vp-team-creator'); if (cr) cr.textContent = m.name;
  _refreshTeamAll();
}
function removeMember(idx){
  var m = TEAM_MEMBERS[idx]; if (!m || m.role === 'admin') return;
  if (!window.confirm('确认将成员「' + m.name + '」移出团队？其任务将释放，可重新分配给其他成员。')) return;
  TEAM_MEMBERS.splice(idx, 1); _recalcTeamCounts();
  var modal = document.getElementById('member-panel-modal'); if (modal) _renderMemberListView(modal); _refreshTeamAll();
}
/* 自己退出团队：负责人需先移交；非负责人可退出（演示仅提示，不实际实现退出功能）*/
function exitTeamSelf(){
  if (TEAM_INFO.creator === _currentMemberName) { window.alert('请先在成员管理中移交负责人权限，再退出团队。'); return; }
  window.alert('（演示）退出团队功能暂未实现；实际退出后将不再拥有本项目访问权限。');
}
function closeMemberPanel(){ var modal = document.getElementById('member-panel-modal'); if (modal) { modal.classList.remove('on'); modal.innerHTML = ''; } document.body.style.overflow = ''; }

/* ============ 团队管理 tab：成员缩略卡 + 信息通知 ============ */
function renderTeamOverview(){
  var box = document.getElementById('vp-team-overview'); if (!box) return;
  _recalcTeamCounts();
  var totalEl = document.getElementById('vp-team-count-total'); if (totalEl) totalEl.textContent = TEAM_INFO.total + ' 人';
  var amEl = document.getElementById('vp-team-count-am'); if (amEl) amEl.textContent = TEAM_INFO.admins + ' / ' + TEAM_INFO.members;
  function stageLine(label, val){
    return '<div class="vp-mcard-stage"><span class="vp-mcard-stage-k">' + label + '</span><span class="vp-mcard-stage-v' + (val ? '' : ' empty') + '">' + (val || '—') + '</span></div>';
  }
  var cards = TEAM_MEMBERS.map(function(m, i){
    var initial = (m.name || '?').charAt(0);
    var roleCls = m.role === 'admin' ? 'is-admin' : 'is-member';
    var roleText = m.role === 'admin' ? '管理员' : '成员';
    var sp = _memberScopeProgress(m);
    var pct, progTxt;
    if (m.role === 'admin') { pct = 100; progTxt = '全部权限'; }
    else { pct = sp.pct; progTxt = sp.kind === 'none' ? '未分配' : (sp.done + '/' + sp.total + (sp.review ? (' · 待审核 ' + sp.review) : '')); }
    var quotaLine = '';
    if (TEAM_CONFIG.quota && m.role !== 'admin') {
      var qst = _quotaState(m);
      var qstTxt = qst === 'exhausted' ? '已耗尽' : (qst === 'low' ? '不足' : '正常');
      quotaLine = '<div class="vp-mcard-quota ' + qst + '"><span class="vp-mcard-quota-k">份额</span>' +
        '<span class="vp-mcard-quota-v">' + m.used + '/' + m.quota + '</span>' +
        '<span class="vp-mcard-quota-st ' + qst + '">' + qstTxt + '</span></div>';
    }
    return '<div class="vp-mcard" onclick="openMemberDetail(' + i + ')">' +
      '<div class="vp-mcard-head"><div class="member-panel-avatar sm">' + initial + '</div>' +
        '<div class="vp-mcard-name">' + m.name + (m.title ? '<span class="mp-item-title">' + m.title + '</span>' : '') + '</div>' +
        '<span class="member-panel-role ' + roleCls + '">' + roleText + '</span></div>' +
      '<div class="vp-mcard-stages">' + stageLine('资产库', _stageShort(m,'asset')) + stageLine('剧集改编', _stageShort(m,'adapt')) + stageLine('视频生成', _stageShort(m,'video')) + '</div>' +
      '<div class="vp-mcard-prog"><div class="vp-mcard-prog-bar"><div class="vp-mcard-prog-inner" style="width:' + pct + '%"></div></div><span class="vp-mcard-prog-txt">' + progTxt + '</span></div>' +
      quotaLine +
    '</div>';
  }).join('');
  box.innerHTML = '<div class="vp-mcard-grid">' + cards + '</div>' +
    '<div class="vp-mcard-note">点击成员卡片查看任务详情与进度；任务分配由管理员在详情中设置。分配即权限——成员对所分配内容拥有编辑、生成、提交审核权限。</div>';
}
/* 协作设置（独立面板，按钮入口进入；机制细则见《多人协作与管理-需求文档》§四）*/
function openTeamConfigPanel(){
  var modal = document.getElementById('team-config-modal');
  if (!modal) { modal = document.createElement('div'); modal.id = 'team-config-modal'; modal.className = 'team-config-modal'; document.body.appendChild(modal); }
  renderTeamConfig();
  modal.classList.add('on'); document.body.style.overflow = 'hidden';
}
function closeTeamConfigPanel(){ var modal = document.getElementById('team-config-modal'); if (modal) { modal.classList.remove('on'); modal.innerHTML = ''; } document.body.style.overflow = ''; }
function renderTeamConfig(){
  var modal = document.getElementById('team-config-modal'); if (!modal) return;
  var isAdmin = (_memberPanelMode !== 'readonly');
  function toggle(id, on, label, hint){ return '<div class="vp-cfg-row"><label class="vp-cfg-toggle"><input type="checkbox" id="' + id + '" ' + (on?'checked':'') + ' ' + (isAdmin?'':'disabled') + ' onchange="onCfgToggle(\'' + id + '\',this.checked)"><span class="vp-cfg-label">' + label + '</span></label>' + (hint?'<span class="vp-cfg-hint">' + hint + '</span>':'') + '</div>'; }
  function numInput(id, val, unit){ return '<div class="vp-cfg-num"><input type="number" id="' + id + '" value="' + val + '" ' + (isAdmin?'':'disabled') + ' onchange="onCfgNum(\'' + id + '\',this.value)"><span class="vp-cfg-unit">' + unit + '</span></div>'; }
  var quotaHTML = '';
  if (TEAM_CONFIG.quota) {
    var used = _quotaUsedTotal(), total = TEAM_CONFIG.quotaTotal, remain = total - used;
    var pct = total ? Math.round(used/total*100) : 0;
    quotaHTML = '<div class="vp-cfg-quota"><div class="vp-cfg-quota-head"><span>团队积分配额</span><span class="vp-cfg-quota-num">已消耗 ' + used + ' / ' + total + '（剩余 ' + remain + '）</span></div>' +
      '<div class="vp-cfg-quota-bar"><div class="vp-cfg-quota-inner" style="width:' + pct + '%"></div></div>' +
      '<div class="vp-cfg-quota-hint">已分配份额 ' + _quotaAssignedTotal() + ' · 已消耗 ' + used + '（消耗由工具生成规则回写；成员份额在团队管理页各成员卡片中分配）</div></div>';
  }
  modal.innerHTML =
    '<div class="vp-cfg-bg" onclick="closeTeamConfigPanel()"></div>' +
    '<div class="vp-cfg-card">' +
      '<div class="vp-cfg-head"><div class="vp-cfg-title">协作设置<span class="vp-cfg-sub">项目级配置 · 机制详见《多人协作与管理-需求文档》</span></div>' +
        '<button type="button" class="member-panel-close" onclick="closeTeamConfigPanel()" aria-label="关闭">×</button></div>' +
      '<div class="vp-cfg-body">' +
      toggle('cfg-claim', TEAM_CONFIG.claim, '认领机制', '分配需成员认领，超时催办') +
      (TEAM_CONFIG.claim ? '<div class="vp-cfg-detail">认领超时阈值 ' + numInput('cfg-claimTimeout', TEAM_CONFIG.claimTimeout, 'h') + '</div>' : '') +
      '<div class="vp-cfg-divider"></div>' +
      '<div class="vp-cfg-group-title">审核机制（三项独立）</div>' +
      toggle('cfg-auditAsset', TEAM_CONFIG.auditAsset, '资产审核', '通过后才可被下游引用') +
      toggle('cfg-auditAdapt', TEAM_CONFIG.auditAdapt, '改编审核', '通过后才进入视频生成') +
      toggle('cfg-auditVideo', TEAM_CONFIG.auditVideo, '视频审核', '通过后才可下载') +
      toggle('cfg-auditDouble', TEAM_CONFIG.auditDouble, '审核双签', '需 2 名及以上管理员都通过') +
      '<div class="vp-cfg-divider"></div>' +
      toggle('cfg-limit', TEAM_CONFIG.limit, '数量上限', '单对象反复重跑防护网') +
      (TEAM_CONFIG.limit ? '<div class="vp-cfg-detail">正常上限 N1 ' + numInput('cfg-n1', TEAM_CONFIG.n1, '次') + '　通知阈值 N2 ' + numInput('cfg-n2', TEAM_CONFIG.n2, '次') + '<br><span class="vp-cfg-hint">≤N1 正常 · N1&lt;次数≤N2 通知 · &gt;N2 拦截</span></div>' : '') +
      '<div class="vp-cfg-divider"></div>' +
      toggle('cfg-quota', TEAM_CONFIG.quota, '积分配额', '成员分配份额；消耗由工具生成规则决定') +
      (TEAM_CONFIG.quota ? '<div class="vp-cfg-detail">团队总额 <span class="vp-cfg-readonly">' + TEAM_CONFIG.quotaTotal + ' 积分</span><span class="vp-cfg-hint">（由团队充值决定，不可在此修改）</span></div>' : '') +
      quotaHTML +
      '</div>' +
    '</div>';
}
function onCfgToggle(id, on){
  var map = { 'cfg-claim':'claim', 'cfg-auditAsset':'auditAsset', 'cfg-auditAdapt':'auditAdapt', 'cfg-auditVideo':'auditVideo', 'cfg-auditDouble':'auditDouble', 'cfg-limit':'limit', 'cfg-quota':'quota' };
  var k = map[id]; if (k) TEAM_CONFIG[k] = !!on;
  renderTeamConfig(); _refreshTeamAll();
}
function onCfgNum(id, v){
  var n = parseInt(v, 10); if (isNaN(n)) n = 0;
  var map = { 'cfg-claimTimeout':'claimTimeout', 'cfg-n1':'n1', 'cfg-n2':'n2', 'cfg-quotaTotal':'quotaTotal' };
  var k = map[id]; if (k) TEAM_CONFIG[k] = n;
  renderTeamConfig(); _refreshTeamAll();
}
function renderTeamNotice(){
  var box = document.getElementById('vp-team-notice'); if (!box) return;
  var list = _NOTIFICATIONS.filter(function(n){ return n.type === _noticeTab && (!(_noticeMine && !n.me)); });
  var items = list.length ? list.map(function(n){
    return '<div class="vp-notice-item' + (n.me ? ' mine' : '') + '">' +
      '<div class="vp-notice-dot ' + n.type + '"></div>' +
      '<div class="vp-notice-text">' + n.text + '</div>' +
      (n.action ? '<button type="button" class="vp-notice-action" onclick="onNoticeAction()">' + n.action + '</button>' : '') +
      '<div class="vp-notice-time">' + n.time + '</div></div>';
  }).join('') : '<div class="vp-notice-empty">暂无通知</div>';
  box.innerHTML =
    '<div class="vp-notice-head"><div class="vp-notice-tabs">' +
      '<button type="button" class="vp-notice-tab' + (_noticeTab === 'msg' ? ' active' : '') + '" onclick="switchNoticeTab(\'msg\')">消息通知</button>' +
      '<button type="button" class="vp-notice-tab' + (_noticeTab === 'log' ? ' active' : '') + '" onclick="switchNoticeTab(\'log\')">生成日志</button>' +
    '</div><label class="vp-notice-filter"><input type="checkbox" ' + (_noticeMine ? 'checked' : '') + ' onchange="toggleNoticeMine(this)"> 与我有关</label></div>' +
    '<div class="vp-notice-list">' + items + '</div>' +
    '<div class="vp-notice-hint">消息通知含审核提交/确认/驳回与任务分配；生成日志记录生成与批量操作事件。</div>';
}
function switchNoticeTab(t){ _noticeTab = t; renderTeamNotice(); }
function toggleNoticeMine(cb){ _noticeMine = !!cb.checked; renderTeamNotice(); }
function onNoticeAction(){ closeMemberDetail(); closeMemberPanel(); switchVPTopTab('progress'); }

/* ============ 成员详情弹窗（概览 + 编辑分配 两视图）============ */
function openMemberDetail(idx){
  _detailIdx = idx; _detailView = 'detail';
  var modal = document.getElementById('member-detail-modal');
  if (!modal) { modal = document.createElement('div'); modal.id = 'member-detail-modal'; modal.className = 'member-detail-modal'; document.body.appendChild(modal); }
  renderMemberDetail();
  modal.classList.add('on'); document.body.style.overflow = 'hidden';
}
function closeMemberDetail(){ var modal = document.getElementById('member-detail-modal'); if (modal) { modal.classList.remove('on'); modal.innerHTML = ''; } _detailIdx = -1; document.body.style.overflow = ''; }
function _statusBadge(status){ var s = EP_STATUS_MAP[status] || { cls: status, text: status }; return '<span class="md-status ' + s.cls + '">' + s.text + '</span>'; }
function _mdStage(title, items){ return '<div class="md-stage"><div class="md-stage-title">' + title + '</div><div class="md-items">' + items + '</div></div>'; }
function renderMemberDetail(){
  var modal = document.getElementById('member-detail-modal'); if (!modal) return;
  var m = TEAM_MEMBERS[_detailIdx]; if (!m) return;
  if (_detailView === 'assign') return renderMemberAssign();
  var initial = (m.name || '?').charAt(0);
  var roleCls = m.role === 'admin' ? 'is-admin' : 'is-member';
  var assetItems;
  if (m.role === 'admin' || m.assetAll) assetItems = '<div class="md-all">全部资产库（' + _assetTotal() + ' 项）' + _statusBadge('done') + '</div>';
  else if (m.assets && m.assets.length) assetItems = m.assets.map(function(a){ return '<div class="md-item"><span class="md-item-name">' + a + '</span>' + _statusBadge('done') + '</div>'; }).join('');
  else assetItems = '<div class="md-empty">未分配</div>';
  var adaptItems;
  if (m.role === 'admin' || m.adaptAll) adaptItems = '<div class="md-all">全部剧集（' + TOTAL_EPS + ' 集）' + _statusBadge('done') + '</div>';
  else if (m.adaptEps && m.adaptEps.length) adaptItems = m.adaptEps.map(function(e){ return '<div class="md-item"><span class="md-item-name">第' + String(e).padStart(2,'0') + '集</span>' + _statusBadge('done') + '</div>'; }).join('');
  else adaptItems = '<div class="md-empty">未分配</div>';
  var videoItems;
  if (m.role === 'admin' || m.videoAll) { var st = _epRangeStats(_range(1, TOTAL_EPS)); videoItems = '<div class="md-all">全部剧集（' + TOTAL_EPS + ' 集）</div><div class="md-statline">已完成 ' + st.done + ' · 待审核 ' + st.review + ' · 进行中 ' + st.doing + ' · 未开始 ' + st.todo + '</div>'; }
  else if (m.videoEps && m.videoEps.length) videoItems = m.videoEps.map(function(e){ var p = EP_PROGRESS[e-1]; return '<div class="md-item"><span class="md-item-name">第' + String(e).padStart(2,'0') + '集</span><span class="md-item-meta">' + (p ? (p.vDone + '/' + p.shots + ' 镜') : '') + '</span>' + _statusBadge(p ? p.status : 'todo') + '</div>'; }).join('');
  else videoItems = '<div class="md-empty">未分配</div>';
  var canEdit = (_memberPanelMode !== 'readonly');
  var quotaSection = '';
  if (TEAM_CONFIG.quota) {
    var q = Number(m.quota)||0, u = Number(m.used)||0, r = q - u;
    var qst = _quotaState(m), qstTxt = qst === 'exhausted' ? '已耗尽' : (qst === 'low' ? '不足' : '正常');
    var quotaBody = '<div class="md-quota">' +
      '<div class="md-quota-line"><span>份额</span>' + (canEdit && m.role !== 'admin' ? '<input type="number" class="md-quota-input" id="md-quota-input" value="' + q + '" min="0" onchange="setMemberQuota(' + _detailIdx + ',this.value)"><span class="md-quota-unit">积分</span>' : '<span class="md-quota-readonly">' + q + ' 积分</span>') + '</div>' +
      '<div class="md-quota-line"><span>已消耗</span><span class="md-quota-readonly">' + u + ' 积分（工具回写）</span></div>' +
      '<div class="md-quota-line"><span>剩余</span><span class="md-quota-readonly ' + qst + '">' + r + ' 积分 · ' + qstTxt + '</span></div>' +
      '</div>';
    quotaSection = _mdStage('积分份额', quotaBody);
  }
  modal.innerHTML =
    '<div class="md-bg" onclick="closeMemberDetail()"></div>' +
    '<div class="md-card">' +
      '<div class="md-head"><div class="md-head-info"><div class="md-head-title"><div class="member-panel-avatar sm">' + initial + '</div>' + m.name + (m.title ? '<span class="mp-item-title">' + m.title + '</span>' : '') + '</div>' +
        '<div class="md-head-meta"><span class="member-panel-role ' + roleCls + '">' + (m.role === 'admin' ? '管理员' : '成员') + '</span> ' + _memberSummary(m) + '</div></div>' +
        '<button type="button" class="member-panel-close" onclick="closeMemberDetail()" aria-label="关闭">×</button></div>' +
      '<div class="md-body">' + _mdStage('资产库', assetItems) + _mdStage('剧集改编', adaptItems) + _mdStage('视频生成', videoItems) + quotaSection + '</div>' +
      (canEdit ? '<div class="md-foot"><button type="button" class="mp-btn mp-btn-primary" onclick="_toAssign()">编辑分配</button></div>' : '') +
    '</div>';
}
function setMemberQuota(idx, v){
  var m = TEAM_MEMBERS[idx]; if (!m) return;
  var n = parseInt(v, 10); if (isNaN(n) || n < 0) n = 0;
  m.quota = n;
  _refreshTeamAll(); renderMemberDetail();
}
function _toAssign(){ _detailView = 'assign'; renderMemberAssign(); }
function _toDetail(){ _detailView = 'detail'; renderMemberDetail(); }
function renderMemberAssign(){
  var modal = document.getElementById('member-detail-modal'); if (!modal) return;
  var m = TEAM_MEMBERS[_detailIdx]; if (!m) return;
  function epChips(sel, attr){
    var html = '';
    for (var e = 1; e <= TOTAL_EPS; e++) {
      var on = sel.indexOf(e) >= 0;
      html += '<button type="button" class="mp-chip' + (on ? ' selected' : '') + '" data-' + attr + '="' + e + '" onclick="toggleAssignChip(this)">第' + String(e).padStart(2,'0') + '</button>';
    }
    return html;
  }
  var assetPicked = (m.assets && m.assets.length) ? m.assets.map(function(a, i){ return '<span class="ma-asset-chip">' + a + '<button type="button" class="ma-asset-x" onclick="removeAssignAsset(' + i + ')" aria-label="移除">×</button></span>'; }).join('') : '<span class="ma-asset-empty">未选择资产</span>';
  function epsBlock(attr, allFlag, selected){
    return '<div class="ma-eps' + (allFlag ? ' disabled' : '') + '"><input type="text" class="ma-ep-search" placeholder="搜索集号" oninput="filterAssignEps(\'' + attr + '\',this.value)">' +
      '<div class="mp-eps-quick"><button type="button" class="mp-mini-toggle" onclick="toggleAllAssignEps(\'' + attr + '\',true)">全选</button><button type="button" class="mp-mini-toggle" onclick="toggleAllAssignEps(\'' + attr + '\',false)">清空</button></div>' +
      '<div class="mp-eps-grid">' + epChips(selected || [], attr) + '</div></div>';
  }
  modal.innerHTML =
    '<div class="md-bg" onclick="closeMemberDetail()"></div>' +
    '<div class="md-card">' +
      '<div class="md-head"><div class="md-head-info"><div class="mp-back-row"><button type="button" class="mp-back" onclick="_toDetail()" aria-label="返回">‹</button><span class="md-head-title">编辑任务分配 · ' + m.name + '</span></div>' +
        '<div class="md-head-meta">分配即权限——成员对所分配内容拥有编辑、生成、提交审核权限</div></div>' +
        '<button type="button" class="member-panel-close" onclick="closeMemberDetail()" aria-label="关闭">×</button></div>' +
      '<div class="md-body">' +
        '<div class="mp-section"><div class="mp-section-title">资产库<span class="mp-section-hint">精细到具体资产</span><label class="mp-all-toggle"><input type="checkbox" ' + (m.assetAll ? 'checked' : '') + ' onchange="toggleAssignAll(\'asset\',this)"> 全部资产库</label></div>' +
          '<div class="ma-asset' + (m.assetAll ? ' disabled' : '') + '"><button type="button" class="ma-pick-btn" onclick="openTaskAssetPicker(' + _detailIdx + ')">＋ 选择资产</button><div class="ma-asset-picked">' + assetPicked + '</div></div></div>' +
        '<div class="mp-section"><div class="mp-section-title">剧集改编<span class="mp-section-hint">按集 E01-' + TOTAL_EPS + '</span><label class="mp-all-toggle"><input type="checkbox" ' + (m.adaptAll ? 'checked' : '') + ' onchange="toggleAssignAll(\'adapt\',this)"> 全部集</label></div>' + epsBlock('adaptep', m.adaptAll, m.adaptEps) + '</div>' +
        '<div class="mp-section"><div class="mp-section-title">视频生成<span class="mp-section-hint">按集 E01-' + TOTAL_EPS + '</span><label class="mp-all-toggle"><input type="checkbox" ' + (m.videoAll ? 'checked' : '') + ' onchange="toggleAssignAll(\'video\',this)"> 全部集</label></div>' + epsBlock('videoep', m.videoAll, m.videoEps) + '</div>' +
      '</div>' +
      '<div class="md-foot"><button type="button" class="mp-btn mp-btn-ghost" onclick="_toDetail()">取消</button><button type="button" class="mp-btn mp-btn-primary" onclick="saveMemberAssign()">保存</button></div>' +
    '</div>';
}
function toggleAssignChip(btn){ btn.classList.toggle('selected'); }
function toggleAllAssignEps(attr, on){ document.querySelectorAll('#member-detail-modal [data-' + attr + ']').forEach(function(b){ b.classList.toggle('selected', !!on); }); }
function filterAssignEps(attr, q){
  q = String(q || '').replace(/[^0-9]/g, '');
  document.querySelectorAll('#member-detail-modal [data-' + attr + ']').forEach(function(b){
    var ep = b.textContent.replace(/[^0-9]/g, '');
    b.style.display = (!q || ep.indexOf(q) >= 0) ? '' : 'none';
  });
}
function toggleAssignAll(dim, cb){
  var m = TEAM_MEMBERS[_detailIdx]; if (!m) return;
  if (dim === 'asset') m.assetAll = !!cb.checked;
  else if (dim === 'adapt') m.adaptAll = !!cb.checked;
  else if (dim === 'video') m.videoAll = !!cb.checked;
  renderMemberAssign();
}
function removeAssignAsset(i){ var m = TEAM_MEMBERS[_detailIdx]; if (m && m.assets) { m.assets.splice(i, 1); renderMemberAssign(); } }
function _readEps(card, attr){
  return Array.prototype.map.call(card.querySelectorAll('[data-' + attr + '].selected'), function(b){ return parseInt(b.dataset[attr], 10); }).filter(function(n){ return !isNaN(n); }).sort(function(a,b){ return a-b; });
}
function saveMemberAssign(){
  var m = TEAM_MEMBERS[_detailIdx]; if (!m) return;
  var card = document.querySelector('#member-detail-modal .md-card');
  if (!m.adaptAll) m.adaptEps = card ? _readEps(card, 'adaptep') : (m.adaptEps||[]); else m.adaptEps = [];
  if (!m.videoAll) m.videoEps = card ? _readEps(card, 'videoep') : (m.videoEps||[]); else m.videoEps = [];
  if (m.assetAll) m.assets = [];
  _detailView = 'detail'; renderMemberDetail(); _refreshTeamAll();
}

/* ============ 任务资产选择器：复用视频生成资产选择弹窗 ============
   直接调用 openShotAssetLibraryPicker（#shot-asset-library-picker-modal），
   复用其分类tab + 计数 + 搜索 + 按集筛选 + 多选；确认经 _onPickerConfirm 任务分支写回成员。*/
function openTaskAssetPicker(memberIdx){
  var m = TEAM_MEMBERS[memberIdx]; if (!m) return;
  window._taskAssignPickerCtx = { memberIdx: memberIdx };
  if (typeof openShotAssetLibraryPicker === 'function') openShotAssetLibraryPicker(1, '01');
  /* 任务模式：去除 ref-img「已添加」标记，按成员已分配资产预选 */
  _shotPickerCurrentRefs = [];
  _shotPickerSelected = {};
  var set = {}; (m.assets || []).forEach(function(a){ set[a] = true; });
  ['characters','scenes','props'].forEach(function(k){
    (_shotPickerData[k] || []).forEach(function(g){
      (g.items || []).forEach(function(it){
        if (set[it.assetId] || set[it.idTrans]) _shotPickerSelected[it.idTrans || it.assetId || it.refPath] = it;
      });
    });
  });
  if (typeof _renderPickerContent === 'function') _renderPickerContent();
  if (typeof _updatePickerFooter === 'function') _updatePickerFooter();
  var meta = document.getElementById('shot-asset-library-picker-meta');
  if (meta) meta.textContent = '为「' + m.name + '」选择负责的资产（可多选，支持分类 / 集数筛选 / 搜索）';
}
function _handleTaskAssignPickerResult(memberIdx, aids){
  var m = TEAM_MEMBERS[memberIdx]; if (!m) return;
  m.assets = aids.slice(); m.assetAll = false;
  renderMemberAssign(); _refreshTeamAll();
}

/* ============ 项目进度 tab：制作进度看板（65集/审核四态）============ */
var _epFStatus = 'all', _epFQuery = '';
function _shotsTotal(){ return EP_PROGRESS.reduce(function(s,e){ return s + e.shots; }, 0); }
function _videoDoneTotal(){ return EP_PROGRESS.reduce(function(s,e){ return s + e.vDone; }, 0); }
function _epAssignee(ep){
  var ms = TEAM_MEMBERS.filter(function(m){ return m.role !== 'admin' && (m.videoAll || (m.videoEps && m.videoEps.indexOf(ep) >= 0)); });
  if (!ms.length) ms = TEAM_MEMBERS.filter(function(m){ return m.role === 'admin'; });
  return ms.length ? ms[0].name : '—';
}
function renderProgressDashboard(){
  var box = document.getElementById('vp-progress-board'); if (!box) return;
  try {
  var shotsTotal = _shotsTotal(), vDone = _videoDoneTotal();
  var stats = (window.PAGE_DATA && window.PAGE_DATA.stats) || {};
  var assetTotal = _assetTotal(), assetDone = Number(stats.assets_generated) || assetTotal;
  var reviewCnt = EP_PROGRESS.filter(function(e){ return e.status === 'review'; }).length;
  function statBox(n, label){ return '<div class="vp-prog-stat"><div class="vp-prog-stat-num">' + n + '</div><div class="vp-prog-stat-label">' + label + '</div></div>'; }
  var STAGES = [
    { n:'① 剧集解析', s:'done', d:'已完成' },
    { n:'② 确定改编方向', s:'done', d:'欧美方向' },
    { n:'③ 内容重制转化', s:'done', d: assetDone + '/' + assetTotal + ' 资产' },
    { n:'④ 参考图生成', s:'done', d: assetDone + '/' + assetTotal + ' 资产' },
    { n:'⑤ 视频片段生成', s:'doing', d: vDone + '/' + shotsTotal + ' 镜' },
    { n:'⑥ 后期处理', s:'todo', d:'待开始' },
    { n:'⑦ 结果成片', s:'todo', d:'待开始' }
  ];
  var stageHTML = STAGES.map(function(st){ return '<div class="vp-stage ' + st.s + '"><span class="vp-stage-dot"></span><div class="vp-stage-name">' + st.n + '</div><div class="vp-stage-desc">' + st.d + '</div></div>'; }).join('');
  function statusBtn(s){
    if (s === 'all') return '<button type="button" class="vp-ep-filterbtn' + (_epFStatus === 'all' ? ' active' : '') + '" onclick="_epFilter(\'all\')">全部</button>';
    var m = EP_STATUS_MAP[s];
    return '<button type="button" class="vp-ep-filterbtn' + (_epFStatus === s ? ' active' : '') + '" onclick="_epFilter(\'' + s + '\')">' + m.text + '</button>';
  }
  var eps = EP_PROGRESS.filter(function(e){
    if (_epFStatus !== 'all' && e.status !== _epFStatus) return false;
    if (_epFQuery) { var n = String(e.ep).padStart(2,'0'); if (!(n.indexOf(_epFQuery) >= 0 || String(e.ep).indexOf(_epFQuery) >= 0)) return false; }
    return true;
  });
  var epHTML = eps.length ? eps.map(function(e){
    var pct = e.shots ? Math.round(e.vDone / e.shots * 100) : 0; var sm = EP_STATUS_MAP[e.status];
    var ops = '<div class="vp-ep-ops">' +
      '<button type="button" class="vp-ep-op" onclick="gotoEpVideo(' + e.ep + ')" title="跳转到该集视频生成">查看</button>' +
      '<button type="button" class="vp-ep-expand" onclick="toggleEpDetail(' + e.ep + ',this)">展开▾</button>' +
      '</div>';
    return '<div class="vp-ep-wrap">' +
      '<div class="vp-ep-row"><div class="vp-ep-no">第' + String(e.ep).padStart(2,'0') + '集</div>' +
      '<div class="vp-ep-bar"><div class="vp-ep-bar-inner ' + e.status + '" style="width:' + pct + '%"></div></div>' +
      '<div class="vp-ep-num">' + e.vDone + '/' + e.shots + ' 镜</div>' +
      '<div class="vp-ep-assignee">' + _epAssignee(e.ep) + '</div>' +
      '<span class="vp-ep-status ' + e.status + '">' + sm.text + '</span>' + ops + '</div>' +
      '<div class="vp-ep-detail" id="vp-ep-detail-' + e.ep + '" style="display:none"></div>' +
    '</div>';
  }).join('') : '<div class="vp-notice-empty">无匹配集次</div>';
  var memberHTML = TEAM_MEMBERS.filter(function(m){ return m.role !== 'admin'; }).map(function(m){
    var sp = _memberScopeProgress(m); var initial = (m.name || '?').charAt(0);
    return '<div class="vp-task-card"><div class="member-panel-avatar sm">' + initial + '</div>' +
      '<div class="vp-task-main"><div class="vp-task-name">' + m.name + (m.title ? '<span class="mp-item-title">' + m.title + '</span>' : '') + '</div><div class="mp-item-summary">' + _memberSummary(m) + '</div></div>' +
      '<div class="vp-task-prog"><div class="vp-task-bar"><div class="vp-task-bar-inner" style="width:' + sp.pct + '%"></div></div><span class="vp-task-pct">' + sp.done + '/' + sp.total + (sp.review ? (' · 待审核 ' + sp.review) : '') + '</span></div></div>';
  }).join('');
  box.innerHTML =
    '<div class="vp-prog-overview"><div class="vp-prog-stats">' + statBox(TOTAL_EPS,'集数') + statBox(shotsTotal,'分镜') + statBox(assetTotal,'资产') + statBox(vDone,'已生成视频') + statBox(reviewCnt,'待审核集') + '</div></div>' +
    '<div class="vp-prog-section"><div class="vp-prog-section-title">制作阶段进度<span class="vp-prog-section-hint">各阶段产出经人工审核确认后推进</span></div><div class="vp-stage-line">' + stageHTML + '</div></div>' +
    '<div class="vp-prog-section"><div class="vp-prog-section-title">成员任务统计</div><div class="vp-task-list">' + memberHTML + '</div></div>' +
    '<div class="vp-prog-section"><div class="vp-prog-section-title">各集制作进度</div>' +
      '<div class="vp-ep-filterbar"><input type="text" class="vp-ep-search" placeholder="搜索集号" value="' + _epFQuery + '" oninput="_epQ(this.value)"><div class="vp-ep-filters">' + statusBtn('all') + statusBtn('done') + statusBtn('review') + statusBtn('doing') + statusBtn('todo') + '</div></div>' +
      '<div class="vp-ep-head"><span>集次</span><span class="vp-ep-head-bar">视频生成</span><span>进度</span><span>负责</span><span>状态</span></div>' +
      '<div class="vp-ep-list">' + epHTML + '</div></div>' +
    '<div class="vp-prog-section"><div class="vp-prog-section-title">资产管理<span class="vp-prog-section-hint">管理员可对每个资产判定状态：通过 / 驳回（提醒负责成员）</span></div>' + _renderAssetManageHTML() + '</div>';
  } catch (e) {
    box.innerHTML = '<div class="vp-notice-empty">进度看板渲染异常：' + (e && e.message ? e.message : e) + '</div>';
  }
}
function _epFilter(s){ _epFStatus = s; renderProgressDashboard(); }
function _epQ(v){ _epFQuery = String(v || '').replace(/[^0-9]/g, ''); renderProgressDashboard(); var s = document.querySelector('#vp-progress-board .vp-ep-search'); if (s) { s.focus(); s.value = _epFQuery; } }

/* 资产审核状态（演示）：从 localStorage 取，默认多数已完成、个别待审核 */
var ASSET_AUDIT = window.__ASSET_AUDIT__ || {};
function _assetAuditKey(kind, bid){ return 'asset::' + kind + '::' + bid; }
function _assetAuditStatus(kind, bid){
  var k = _assetAuditKey(kind, bid);
  if (ASSET_AUDIT[k]) return ASSET_AUDIT[k];
  /* 默认：场景个别待审核，其余已完成 */
  if (kind === 'scenes') return bid.indexOf('卧室') >= 0 ? 'review' : 'done';
  return 'done';
}
/* 资产负责人：按 base-id 匹配成员分配（成员 assets 含该 baseId 或其子项 aid）*/
function _assetAssignee(kind, bid){
  var ms = TEAM_MEMBERS.filter(function(m){
    if (m.role === 'admin') return false;
    if (m.assetAll) return true;
    if (!m.assets || !m.assets.length) return false;
    return m.assets.indexOf(bid) >= 0 || m.assets.some(function(a){ return a.indexOf(bid) >= 0 || bid.indexOf(a.split('_')[0]) >= 0; });
  });
  if (!ms.length) ms = TEAM_MEMBERS.filter(function(m){ return m.role === 'admin'; });
  return ms.length ? ms[0].name : '—';
}
function _renderAssetManageHTML(){
  var groups = _getAssetBaseGroups();
  var KIND_LABEL = { characters: '角色', scenes: '场景', props: '道具' };
  function itemRow(it){
    var st = _assetAuditStatus(it.kind, it.baseId);
    var sm = EP_STATUS_MAP[st] || { cls: st, text: st };
    var ops = '<div class="vp-am-ops"><button type="button" class="vp-ep-op" onclick="gotoAsset(\'' + it.kind + '\',\'' + it.baseId.replace(/'/g,"\\'") + '\')" title="跳转到该资产详情">查看</button></div>';
    var subTxt = it.subCount > 1 ? '<span class="vp-am-sub">（' + it.subCount + ' 套）</span>' : '';
    var nameHTML = '<span class="vp-am-ori">' + it.nameOri + '</span>' + subTxt +
      (it.nameTrans ? '<span class="vp-am-trans">' + it.nameTrans + '</span>' : '');
    return '<div class="vp-am-item"><span class="vp-am-name">' + nameHTML + '</span>' +
      '<span class="vp-am-assignee">' + _assetAssignee(it.kind, it.baseId) + '</span>' +
      '<span class="vp-ep-status ' + st + '">' + sm.text + '</span>' + ops + '</div>';
  }
  function groupBlock(kind){
    var list = groups[kind] || [];
    if (!list.length) return '';
    return '<div class="vp-am-group"><div class="vp-am-group-title">' + KIND_LABEL[kind] + ' · ' + list.length + '</div>' + list.map(itemRow).join('') + '</div>';
  }
  var html = groupBlock('characters') + groupBlock('scenes') + groupBlock('props');
  return '<div class="vp-am-list">' + (html || '<div class="vp-notice-empty">暂无资产</div>') + '</div>';
}

/* 跳转：进度看板 → 视频生成对应集（审核在视频生成页具体内容中进行）*/
function gotoEpVideo(ep){
  closeMemberDetail(); closeMemberPanel();
  if (typeof sw === 'function') sw('g');
  try { if (typeof _demoSwitchEpisode === 'function') _demoSwitchEpisode(ep); } catch (_) {}
}
/* 跳转：进度看板 → 资产库对应资产详情（审核在资产库详情中进行）*/
function gotoAsset(kind, bid){
  closeMemberDetail(); closeMemberPanel();
  if (typeof sw === 'function') sw('a');
  try {
    var card = document.querySelector('.char-group.asset-group[data-kind="' + kind + '"][data-base-id="' + CSS.escape(bid) + '"]');
    if (card) { card.scrollIntoView({ block: 'center' }); card.classList.add('ast-flash'); setTimeout(function(){ card.classList.remove('ast-flash'); }, 1600); }
  } catch (_) {}
}
/* 展开集：显示该集单镜列表 */
var _epExpanded = {};
function toggleEpDetail(ep, btn){
  var box = document.getElementById('vp-ep-detail-' + ep);
  if (!box) return;
  var open = (box.style.display === 'none');
  if (open) { box.innerHTML = _renderEpShotsHTML(ep); box.style.display = ''; if (btn) btn.textContent = '收起▴'; }
  else { box.style.display = 'none'; if (btn) btn.textContent = '展开▾'; }
}
function _epShots(ep){ /* 该集单镜演示数据：每集 shots 个，前 vDone 已生成 */
  var e = EP_PROGRESS[ep-1]; if (!e) return [];
  var arr = [];
  for (var i = 1; i <= e.shots; i++) {
    var gen = (i <= e.vDone);
    var st = gen ? (e.status === 'done' ? 'done' : (i === e.vDone && e.status === 'review' ? 'review' : 'doing')) : 'todo';
    arr.push({ no: i, gen: gen, status: st });
  }
  return arr;
}
function _renderEpShotsHTML(ep){
  var shots = _epShots(ep);
  var rows = shots.map(function(s){
    var sm = EP_STATUS_MAP[s.status] || { text: '未生成' };
    var ops = '<div class="vp-am-ops"><button type="button" class="vp-ep-op" onclick="gotoEpVideo(' + ep + ')" title="跳转到该集视频生成">查看</button></div>';
    return '<div class="vp-am-item"><span class="vp-am-name">片段' + String(s.no).padStart(2,'0') + '</span>' +
      '<span class="vp-am-assignee">' + (s.gen ? '已生成' : '未生成') + '</span>' +
      '<span class="vp-ep-status ' + s.status + '">' + (s.gen ? sm.text : '未生成') + '</span>' + ops + '</div>';
  }).join('');
  return '<div class="vp-ep-shots"><div class="vp-am-group-title">分镜明细 · ' + shots.length + '</div>' + (rows || '<div class="vp-notice-empty">无分镜</div>') + '</div>';
}
/* 通知列表头部插入一条 */
function _unshiftNotice(n){
  _NOTIFICATIONS.unshift(n);
  if (_NOTIFICATIONS.length > 30) _NOTIFICATIONS.length = 30;
  try { renderTeamNotice(); } catch(_){}
}

window.switchVPSubtab = switchVPSubtab;
window.switchVPTopTab = switchVPTopTab;
window.switchRemakeView = switchRemakeView;
window.editTeamName = editTeamName;
window.openMemberPanel = openMemberPanel;
window.closeMemberPanel = closeMemberPanel;
window.openMemberAddForm = openMemberAddForm;
window._pickAddRole = _pickAddRole;
window._backToList = _backToList;
window.saveMemberAdd = saveMemberAdd;
window.changeMemberRole = changeMemberRole;
window.setAsCreator = setAsCreator;
window.removeMember = removeMember;
window.exitTeamSelf = exitTeamSelf;
window.renderTeamOverview = renderTeamOverview;
window.renderTeamNotice = renderTeamNotice;
window.renderTeamConfig = renderTeamConfig;
window.openTeamConfigPanel = openTeamConfigPanel;
window.closeTeamConfigPanel = closeTeamConfigPanel;
window.onCfgToggle = onCfgToggle;
window.onCfgNum = onCfgNum;
window.switchNoticeTab = switchNoticeTab;
window.toggleNoticeMine = toggleNoticeMine;
window.onNoticeAction = onNoticeAction;
window.openMemberDetail = openMemberDetail;
window.closeMemberDetail = closeMemberDetail;
window._toAssign = _toAssign;
window._toDetail = _toDetail;
window.renderMemberDetail = renderMemberDetail;
window.renderMemberAssign = renderMemberAssign;
window.toggleAssignChip = toggleAssignChip;
window.toggleAllAssignEps = toggleAllAssignEps;
window.filterAssignEps = filterAssignEps;
window.toggleAssignAll = toggleAssignAll;
window.removeAssignAsset = removeAssignAsset;
window.saveMemberAssign = saveMemberAssign;
window.setMemberQuota = setMemberQuota;
window.openTaskAssetPicker = openTaskAssetPicker;
window._handleTaskAssignPickerResult = _handleTaskAssignPickerResult;
window.renderProgressDashboard = renderProgressDashboard;
window._epFilter = _epFilter;
window._epQ = _epQ;
window.gotoEpVideo = gotoEpVideo;
window.gotoAsset = gotoAsset;
window.toggleEpDetail = toggleEpDetail;
window.projectMembers = function(id){ openMemberPanel(); };


/* 初始联动：与 dss-toggle 默认（done）保持一致，确保「导入与解析」板块初始隐藏、解析结果可见 */
document.addEventListener('DOMContentLoaded', function(){ try { setParseState('done'); } catch (_) {} });
/* 团队管理/项目进度 初始渲染（容器存在后即填充，切换 tab 时也会重渲染）*/
document.addEventListener('DOMContentLoaded', function(){ try { renderTeamOverview(); } catch(_){} try { renderTeamNotice(); } catch(_){} try { renderProgressDashboard(); } catch(_){} });
/* per-tab: 切换器仅在项目界面(v-p)显示 */
function updateSwitcherVisibility() {
  var vp = document.getElementById('v-p');
  var sw = document.getElementById('demo-state-switcher');
  if (sw) sw.style.display = (vp && vp.classList.contains('on')) ? 'block' : 'none';
}
document.querySelectorAll('.topnav .step, .topnav .brand, .plist-card').forEach(function (el) {
  el.addEventListener('click', function () { setTimeout(updateSwitcherVisibility, 60); });
});
/* per-tab: MutationObserver 监听 v-p.on 切换 */
document.addEventListener('DOMContentLoaded', function () {
  var vp = document.getElementById('v-p');
  if (vp && window.MutationObserver) {
    new MutationObserver(updateSwitcherVisibility).observe(vp, { attributes: true, attributeFilter: ['class'] });
  }
  updateSwitcherVisibility();
});

/* === per-tab：把切换器移入 v-p（v-p 隐藏时切换器自动隐藏）=== */
document.addEventListener('DOMContentLoaded', function () {
  var sw = document.getElementById('demo-state-switcher');
  var vp = document.getElementById('v-p');
  if (sw && vp) vp.appendChild(sw);
});

/* === 转化方向子项选择（modal，不 prompt）=== */
function openTargetModal() {
  var m=document.getElementById('target-modal');
  if(m){
    m.hidden=false; document.body.style.overflow='hidden';
    // 预选当前方向：该项 ✓ + 高亮
    var cur = (document.getElementById('sp-current') || {}).textContent || '欧美';
    document.querySelectorAll('.target-modal-item').forEach(function(it){
      var nameEl = it.querySelector('.tmi-name');
      var ck = it.querySelector('.tmi-check'); if (ck) ck.remove();
      var isCur = !!(nameEl && nameEl.textContent.trim() === cur.trim());
      it.classList.toggle('on', isCur);
      if (isCur) { var c = document.createElement('span'); c.className = 'tmi-check'; c.textContent = '✓'; it.appendChild(c); }
    });
  }
}
function closeTargetModal() { var m=document.getElementById('target-modal'); if(m){m.hidden=true; document.body.style.overflow='';} }
/* === 批量操作确认（防误触）：弹自定义确认框，确认后才执行 === */
function confirmBatch(actionName, fn) {
  var m = document.getElementById('batch-confirm-modal');
  var nameEl = document.getElementById('batch-confirm-name');
  if (!m || !nameEl) { if (window.confirm('确认执行「' + actionName + '」？')) { if (typeof fn === 'function') fn(); } return; }
  nameEl.textContent = actionName;
  m.hidden = false;
  document.body.style.overflow = 'hidden';
  var ok = document.getElementById('batch-confirm-ok');
  var cancel = document.getElementById('batch-confirm-cancel');
  var close = function () { m.hidden = true; document.body.style.overflow = ''; ok.onclick = null; cancel.onclick = null; };
  ok.onclick = function () { close(); if (typeof fn === 'function') fn(); };
  cancel.onclick = close;
}
function closeBatchConfirm() { var m = document.getElementById('batch-confirm-modal'); if (m) { m.hidden = true; document.body.style.overflow = ''; } }
function selectTarget(dir, el) {
  if (dir === 'new') { dir = window.prompt('新建转化方向名：',''); if(!dir||!dir.trim()) return; dir=dir.trim(); }
  var cur = (document.getElementById('sp-current') || {}).textContent || '欧美';
  // 选其他方向：提示切换需重新改编、原方向内容不覆盖，确认后切换
  if (dir !== cur) {
    var ok = window.confirm('切换到「' + dir + '」方向？\n\n· 切换后需重新进行该方向的资产与剧集改编\n· 原「' + cur + '」方向的内容不会被覆盖或清空，随时可切回继续');
    if (!ok) return;
  }
  if (document.getElementById('sp-current')) document.getElementById('sp-current').textContent = dir;
  // 更新项目工作台阶段②「确定改编方向」badge（绿色已选定）
  var dirBadge = document.getElementById('vp-stage-dir-status');
  if (dirBadge) dirBadge.textContent = '✓ 已选定：' + dir;
  // target-modal：当前方向打 ✓ + 高亮
  document.querySelectorAll('.target-modal-item').forEach(function(it){
    var nameEl = it.querySelector('.tmi-name');
    var ck = it.querySelector('.tmi-check');
    if (ck) ck.remove();
    var isCur = !!(nameEl && nameEl.textContent.trim() === dir);
    it.classList.toggle('on', isCur);
    if (isCur) { var c = document.createElement('span'); c.className = 'tmi-check'; c.textContent = '✓'; it.appendChild(c); }
  });
  closeTargetModal();
}
function updateSwitchBtnText() {
  var card = document.querySelector('.agent-entry-card');
  var btn = document.getElementById('sp-switch-btn');
  if (!btn || !card) return;
  btn.textContent = card.classList.contains('parse-done') ? '切换项目 ▾' : '选择转化方向 ▾';
}
