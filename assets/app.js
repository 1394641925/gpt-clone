/* ChatGPT 客户端 · 核心逻辑
 * 会话管理 / 真实 API / 深度思考 / 联网搜索 / 过渡动画 / 全按钮功能
 */
(function () {
  'use strict';

  var $ = function (s, p) { return (p || document).querySelector(s); };
  var $$ = function (s, p) { return Array.prototype.slice.call((p || document).querySelectorAll(s)); };
  var STORE_KEY = 'gpt_clone_state_v1';
  var API_URL = 'https://xcs-ai.pages.dev/';
  var API_PASS = 'sunxiaochuan666';
  var API_MODEL = 'THUDM/GLM-4-9B-0414';
  var REASON_MODEL = 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B'; // 原生推理模型：思考真实、免费

  function uid() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function mid() { return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function now() { return Date.now(); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return '网页'; } }
  // 把 "周一, 24 11月 2026 06:42:00 GMT" 精简为 "2026-11-24"
  function shortDate(d) {
    if (!d) return '';
    var m = String(d).match(/(\d{1,2})\s*(\d{1,2})月\s*(\d{4})/);
    if (m) return m[3] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');
    var m2 = String(d).match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    return m2 ? m2[1] + '-' + String(m2[2]).padStart(2, '0') + '-' + String(m2[3]).padStart(2, '0') : '';
  }

  /* ============ SVG 图标（替代 emoji，避免劣质观感） ============ */
  var ICON = {
    pin: '<svg viewBox="0 0 24 24" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M9 4h6l-1 6 3 3v2H7v-2l3-3-1-6zM12 15v5"/></svg>',
    edit: '<svg viewBox="0 0 24 24" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v5M14 11v5"/></svg>',
    export: '<svg viewBox="0 0 24 24" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 3v12M8 11l4 4 4-4M4 17v3h16v-3"/></svg>',
    good: '<svg viewBox="0 0 24 24" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M7 10v10H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h3zm0 0l4-7a2 2 0 0 1 3 2l-1 5h5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16.8 20H7"/></svg>',
    bad: '<svg viewBox="0 0 24 24" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M7 14V4H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3zm0 0l4 7a2 2 0 0 0 3-2l-1-5h5a2 2 0 0 0 2-2.3l-1.2-6A2 2 0 0 0 16.8 4H7"/></svg>',
    brain: '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M12 5a3 3 0 0 0-5.6-1.5A3 3 0 0 0 4 8a3 3 0 0 0-1 5.6A3 3 0 0 0 6 19a3 3 0 0 0 6 1V5zM12 5a3 3 0 0 1 5.6-1.5A3 3 0 0 1 20 8a3 3 0 0 1 1 5.6A3 3 0 0 1 18 19a3 3 0 0 1-6 1"/></svg>',
    globe: '<svg viewBox="0 0 24 24" width="13" height="13"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    bulb: '<svg viewBox="0 0 22 22" width="19" height="19"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M9 18h4M10 21h2M8 14.5a6 6 0 1 1 6 0c-.7.5-1 1.2-1 2H9c0-.8-.3-1.5-1-2z"/></svg>',
    pen: '<svg viewBox="0 0 22 22" width="19" height="19"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M4 17l1-4L15 3l4 4L8 17l-4 1zM13 5l4 4"/></svg>',
    chart: '<svg viewBox="0 0 22 22" width="19" height="19"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M4 20V4M4 20h15M8 16v-4M12 16V8M16 16v-6"/></svg>',
    star: '<svg viewBox="0 0 22 22" width="19" height="19"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" d="M11 3l2.2 5.2L19 9l-5 4.2L15.5 19 11 16l-4.5 3L8 13.2 3 9l5.8-.8L11 3z"/></svg>'
  };

  /* ============ 状态 ============ */
  // model 现在是思考档位：Instant（即时）/ Thinking（深度思考）/ Pro（最强推理）
  var TIER_INSTANT = 'Instant', TIER_THINK = 'Thinking', TIER_PRO = 'Pro';
  var state = { chats: [], activeId: null, theme: 'light', model: TIER_THINK, deepThink: true, webSearch: false, gpt: 'default' };
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && Array.isArray(s.chats)) {
          state.chats = s.chats;
          state.activeId = s.activeId || (s.chats[0] && s.chats[0].id) || null;
          state.theme = s.theme || 'light';
          var oldModel = s.model || '';
          // 兼容老存档：把旧的模型名/开关映射成新的思考档位
          if (oldModel === TIER_INSTANT || oldModel === TIER_THINK || oldModel === TIER_PRO) {
            state.model = oldModel;
          } else if (oldModel === 'GPT-4o' || (oldModel === 'GPT-5' && !s.deepThink)) {
            state.model = TIER_INSTANT;
          } else {
            state.model = s.deepThink ? TIER_THINK : TIER_INSTANT;
          }
          state.deepThink = state.model !== TIER_INSTANT; // 档位决定是否深度思考
          state.webSearch = !!s.webSearch;
          state.gpt = s.gpt || 'default';
        }
      }
    } catch (e) {}
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {} }
  function activeChat() { return state.chats.find(function (c) { return c.id === state.activeId; }) || null; }
  function makeChat(title) { return { id: uid(), title: title || '新建对话', pinned: false, createdAt: now(), updatedAt: now(), messages: [], gpt: 'default' }; }

  /* ============ 提示 ============ */
  var toastTimer;
  function toast(msg) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  /* ============ 轻量 Markdown ============ */
  // 思考过程专用渲染：把推理按句切成多步，视觉上像逐条想法浮现
  function thinkMd(text) {
    var t = String(text == null ? '' : text).trim();
    // 保留模型自己分的换行；若是一整段，按句号/分号/问号切成步骤（每步尽量一句）
    if (!/[\n]/.test(t)) {
      t = t.replace(/([。！？；])\s*/g, '$1\n');
    }
    return md(t);
  }
  function searchStepInner(s) {
    var tail = s.count != null ? (' → 找到 ' + s.count + ' 条结果') : ' → 搜索中…';
    return ICON.globe + '<span>我搜索了「' + esc(s.query) + '」' + tail + '</span>';
  }
  // 分层思考渲染：把"思考段"和"搜索动作"按顺序拼成有层次的过程
  function stepsHtml(steps) {
    if (!steps || !steps.length) return '';
    return steps.map(function (s) {
      if (s.t === 'search') return '<div class="ts-step ts-search">' + searchStepInner(s) + '</div>';
      return '<div class="ts-step ts-think">' + thinkMd(s.text) + '</div>';
    }).join('');
  }
  // 思考后处理：强制第一人称私人独白口吻，杜绝第二人称对话感与回答式结构
  function polishThink(text) {
    var s = scrubNames(String(text == null ? '' : text))
      .replace(/(用户|对方|提问者|问我的人)(问的是|想要的是|关心的是|想知道)/g, '我面对$2')
      .replace(/(用户|对方|提问者|问我的人)/g, '我')
      // 第二人称兜底：把"你想知道/你要回答/你面对"转成属于"我"的念头
      .replace(/你想知道/g, '我想弄清').replace(/你要回答/g, '我要回答').replace(/你要找/g, '我要找')
      .replace(/你(问的是|想要的是|关心的是)/g, '我面对$1')
      .replace(/你说的是/g, '我面对的是').replace(/你给的信息/g, '手上的信息')
      .replace(/你(需要|应该|可以|会|得)/g, '我$1')
      .replace(/我想知道我|我问我|我让我/g, '我想知道')
      // 敬称"您"一律视角化：这是对说话对象用的，思考草稿里改成第一人称念头
      .replace(/您夸(奖)?我/g, '被夸奖').replace(/您夸/g, '被夸')
      .replace(/您(问|说|告诉|需要|希望)(我)?/g, '$1$2')
      .replace(/您的/g, '我的').replace(/您/g, '我')
      // 整句客套/回答式套话：这些是"回复"不是"思考"，直接从草稿里剔除
      .replace(/[^。！？\n]*(谢谢夸奖|谢谢[您你]|感谢[您你]|请别?要?(过度|这么)?夸|过奖|请随时告诉我|如果有(其他|别的)?问题[，,]?(请|随时)|如需(更多|进一步)?帮助|希望(这|以上)?(对|能对你)有帮助|我可以结束这次对话|我表示不介意|我只是?尽力完成我被设定的功能)[^。！？\n]*[。！？]?/g, '')
      // 回答式结构词：思考里不该出现，去掉编号前缀
      .replace(/^\s*(首先|其次|再次|最后|综上|总之|第一|第二|第三)[，,、:：]/gm, '')
      // 去掉"我很熟/不用搜"这类自大口吻，改成谨慎核实的表述
      .replace(/我(知道|清楚|很了解|很熟悉)|(?:我很|我对[^。！？]{0,24})(熟悉|了解|清楚)/g, '我不敢仅凭印象下结论')
      .replace(/(可以直接回答|不需要搜索|不用搜索|无需搜索|不必搜索|直接回答就行|可以直接给出)/g, '需要先核对再回答')
      .replace(/(我记得|我确定|我记得是|我敢肯定)/g, '印象里')
      .replace(/\s{2,}/g, ' ').trim();
    return s;
  }
  // 从模型输出里稳健解析决策 JSON（容忍前后文字、代码块包裹）
  function parseDecision(raw) {
    var s = String(raw == null ? '' : raw);
    var m = s.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      var d = JSON.parse(m[0]);
      if (!d || typeof d.think !== 'string') return null;
      d.need = (d.need === 'search') ? 'search' : 'answer';
      d.query = String(d.query || '').trim();
      return d;
    } catch (e) { return null; }
  }
  function md(text) {
    var s = esc(String(text == null ? '' : text).trim());
    s = s.replace(/```([\w-]*)\n?([\s\S]*?)```/g, function (m, lang, code) { return '<pre><code>' + code.replace(/^\n|\n$/g, '') + '</code></pre>'; });
    s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/^###\s+(.+)$/gm, '<h4>$1</h4>').replace(/^##\s+(.+)$/gm, '<h3>$1</h3>');
    s = s.replace(/^[\-\*]\s+(.+)$/gm, '• $1');
    return s;
  }

  /* ============ 侧栏 ============ */
  function renderChats(filter) {
    var box = $('#chatList'); if (!box) return;
    var q = (filter || '').trim().toLowerCase();
    var list = state.chats.slice();
    if (q) list = list.filter(function (c) { return (c.title || '').toLowerCase().indexOf(q) >= 0; });
    var pinned = list.filter(function (c) { return c.pinned; }).sort(function (a, b) { return b.updatedAt - a.updatedAt; });
    var others = list.filter(function (c) { return !c.pinned; }).sort(function (a, b) { return b.updatedAt - a.updatedAt; });
    var html = '';
    function row(c) {
      return '<div class="conv' + (c.id === state.activeId ? ' active' : '') + '" data-id="' + c.id + '">' +
        (c.pinned ? '<span class="pin-ico">' + ICON.pin + '</span>' : '') +
        '<span class="conv-title">' + esc(c.title) + '</span>' +
        '<button class="conv-more" title="更多" data-more="' + c.id + '"><svg viewBox="0 0 24 24" width="16" height="16"><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/></svg></button></div>';
    }
    if (!list.length) html = '<div class="no-result">' + (q ? '没有匹配的对话' : '暂无对话') + '</div>';
    else {
      if (pinned.length) html += '<div class="group-label">已置顶</div>' + pinned.map(row).join('');
      if (others.length) html += '<div class="group-label">' + (q ? '搜索结果' : '今天') + '</div>' + others.map(row).join('');
    }
    box.innerHTML = html;
    $$('.conv', box).forEach(function (el) {
      el.addEventListener('click', function (e) { if (e.target.closest('[data-more]')) return; openChat(el.getAttribute('data-id')); });
      var pt;
      el.addEventListener('contextmenu', function (e) { e.preventDefault(); var r = el.getBoundingClientRect(); openCtx(el.getAttribute('data-id'), e.clientX || r.left, e.clientY || r.bottom); });
      el.addEventListener('touchstart', function (e) { pt = setTimeout(function () { var r = el.getBoundingClientRect(); openCtx(el.getAttribute('data-id'), r.left, r.bottom); }, 550); }, { passive: true });
      ['touchend', 'touchmove', 'touchcancel'].forEach(function (ev) { el.addEventListener(ev, function () { clearTimeout(pt); }); });
    });
    $$('[data-more]', box).forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); var r = b.getBoundingClientRect(); openCtx(b.getAttribute('data-more'), r.left, r.bottom + 4); });
    });
  }

  var ctxTarget = null;
  function openCtx(id, x, y) {
    ctxTarget = id;
    var m = $('#ctxMenu');
    var c = state.chats.find(function (v) { return v.id === id; });
    $('.ctx-item[data-act="pin"] .ctx-txt', m).textContent = c && c.pinned ? '取消置顶' : '置顶对话';
    m.style.left = Math.min(x, window.innerWidth - 175) + 'px';
    m.style.top = Math.min(y, window.innerHeight - 190) + 'px';
    m.classList.add('show');
  }
  function closeCtx() { $('#ctxMenu').classList.remove('show'); }

  /* ============ 消息渲染（每条消息带 mid，精确定位） ============ */
  function userBubble(m) {
    var att = '';
    if (m.attachments && m.attachments.length) {
      var chips = m.attachments.map(function (a) {
        if (a.kind === 'image' && a.dataUrl) return '<span class="att-img"><img src="' + a.dataUrl + '" alt="' + esc(a.name) + '" title="' + esc(a.name) + '"></span>';
        var tag = a.kind === 'text' ? '文本' : (a.kind === 'image' ? '图片' : '文件');
        return '<span class="att-file">' + ICON.export + '<b>' + esc(a.name) + '</b><em>' + tag + '</em></span>';
      }).join('');
      att = '<div class="user-att">' + chips + '</div>';
    }
    return '<div class="msg user" data-mid="' + m.mid + '"><div class="m-body">' + att + (m.content ? esc(m.content) : '') + '</div></div>';
  }
  function assistantBubble(m) {
    var parts = [];
    if (m.searched) parts.push('<div class="search-badge" data-role="badge">' + ICON.globe + ' ' + (m.sources && m.sources.length ? '已联网搜索 · ' + m.sources.length + ' 个网站' : '已联网搜索') + '</div>');
    if (m.deepThink) {
      var secs = m.thinkSecs || 0;
      var label = m.thinking ? ('已深度思考' + (secs ? '（用时 ' + secs + ' 秒）' : '')) : '正在深度思考…';
      var body = stepsHtml(m.steps) || (m.thinking ? thinkMd(m.thinking) : '<span class="think-wait"><span class="dots"><i></i><i></i><i></i></span> 正在梳理思路…</span>');
      parts.push('<details class="think-panel ' + (m.thinkOpen ? 'fold-open' : 'fold-closed') + '"' + (m.thinkOpen ? ' open' : '') + '><summary><span class="think-ico">' + ICON.brain + '</span><span data-role="think-label">' + label + '</span><span class="think-caret">▾</span></summary><div class="think-body" data-role="think-body">' + body + '</div></details>');
    }
    var waitHtml = m.answering
      ? '<span class="gen-wait"><span class="dots"><i></i><i></i><i></i></span> 正在生成回答…</span>'
      : (m.deepThink || m.searched
        ? '<span class="gen-wait gen-idle"></span>'
        : '<span class="gen-wait"><span class="dots"><i></i><i></i><i></i></span> 正在生成回答…</span>');
    parts.push('<div class="a-content" data-role="content">' + (m.content ? md(m.content) : waitHtml) + '</div>');
    if (m.sources && m.sources.length) {
      parts.push('<details class="sources ' + (m.sourcesOpen ? 'fold-open' : 'fold-closed') + '"' + (m.sourcesOpen ? ' open' : '') + '><summary class="src-head">' + ICON.globe + ' 查看了 ' + m.sources.length + ' 个网站<span class="src-caret">▾</span></summary><div class="src-grid">' +
        m.sources.map(function (s, i) { var dt = shortDate(s.date); return '<a class="src-card" href="' + esc(s.url) + '" target="_blank" rel="noopener" title="' + esc(s.url) + '"><span class="src-num">' + (i + 1) + '</span><span class="src-txt"><b>' + esc(s.title || '网页') + '</b>' + (s.summary ? '<span class="src-sum">' + esc(s.summary) + '</span>' : '') + '<em>' + esc(hostOf(s.url)) + (dt ? ' · ' + dt : '') + '</em></span></a>'; }).join('') + '</div></details>');
    }
    parts.push('<div class="msg-actions"><button class="ma-btn" data-copy title="复制">' + ICON.export + '</button>' +
      '<button class="ma-btn" data-regen title="重新生成"><svg viewBox="0 0 24 24" width="15" height="15"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<button class="ma-btn" data-good title="赞">' + ICON.good + '</button>' +
      '<button class="ma-btn" data-bad title="踩">' + ICON.bad + '</button></div>');
    return '<div class="msg assistant" data-mid="' + m.mid + '"><div class="m-avatar"><img src="assets/openai-logo.svg" alt="ChatGPT" width="17" height="17"></div><div class="m-body">' + parts.join('') + '</div></div>';
  }
  // 按 mid 精确查找节点（关键：修复回答写错消息的问题）
  function node(midVal, role) { return $('#messages .msg[data-mid="' + midVal + '"][data-role-msg="' + role + '"]'); }
  function msgEl(midVal) { return $('#messages .msg[data-mid="' + midVal + '"]'); }
  function part(midVal, sel) { var el = msgEl(midVal); return el ? el.querySelector(sel) : null; }

  function renderMessages() {
    var box = $('#messages'); if (!box) return;
    var c = activeChat();
    if (!c || !c.messages.length) {
      box.innerHTML = '<div class="empty-state" id="emptyState">' + emptyHTML() + '</div>';
      bindSuggestions();
    } else {
      box.innerHTML = c.messages.map(function (m) { return m.role === 'user' ? userBubble(m) : assistantBubble(m); }).join('');
      bindMsgActions();
    }
    var title = c ? c.title : '新建对话';
    $('#chatTitle').textContent = title;
    document.title = title === '新建对话' ? 'ChatGPT' : title + ' - ChatGPT';
    renderChats($('#searchInput') ? $('#searchInput').value : '');
    scrollBottom(true);
  }
  function emptyHTML() {
    var sugs = [
      [ICON.bulb, '给我一些创意灵感', '帮我想 5 个有意思的创意点子'],
      [ICON.pen, '帮我润色一段文字', '把这段话润色得更流畅自然'],
      [ICON.chart, '分析一个数据问题', '帮我分析数据并给出建议'],
      [ICON.globe, '解释一个复杂概念', '用简单的语言解释量子计算']
    ];
    return '<div class="logo-mark"><img src="assets/openai-logo.svg" alt="OpenAI" width="30" height="30"></div>' +
      '<h2>有什么可以帮忙的？</h2><p class="empty-sub">开始一段新的对话吧</p><div class="suggestions">' +
      sugs.map(function (s) { return '<button class="sug-card" data-q="' + esc(s[2]) + '"><span class="sug-ico">' + s[0] + '</span>' + s[1] + '</button>'; }).join('') + '</div>';
  }
  function bindSuggestions() {
    $$('.sug-card').forEach(function (b) {
      b.addEventListener('click', function () { $('#msgInput').value = b.getAttribute('data-q'); $('#msgInput').focus(); autoGrow(); });
    });
  }
  function bindMsgActions() {
    var c = activeChat(); if (!c) return;
    $$('#messages .msg.assistant').forEach(function (node) {
      var midVal = node.getAttribute('data-mid');
      var m = c.messages.find(function (x) { return x.mid === midVal; });
      if (!m) return;
      var cp = $('[data-copy]', node), rg = $('[data-regen]', node);
      if (cp) cp.addEventListener('click', function () { copyText(m.content || ''); toast('已复制'); });
      if (rg) rg.addEventListener('click', function () { var idx = c.messages.indexOf(m); regen(idx); });
      var gd = $('[data-good]', node), bd = $('[data-bad]', node);
      if (gd) gd.addEventListener('click', function () { gd.classList.toggle('on'); bd && bd.classList.remove('on'); toast('感谢反馈'); });
      if (bd) bd.addEventListener('click', function () { bd.classList.toggle('on'); gd && gd.classList.remove('on'); toast('感谢反馈'); });
      var d = $('.think-panel', node);
      if (d) bindFold(d, function (open) { m.thinkOpen = open; save(); });
      var sd = $('.sources', node);
      if (sd) bindFold(sd, function (open) { m.sourcesOpen = open; save(); });
    });
  }
  // details 平滑开合：拦截 summary 点击，用 max-height + opacity 做展开/收起动画
  function bindFold(d, onChange) {
    if (!d || d.dataset.foldBound) return;
    d.dataset.foldBound = '1';
    var sum = d.querySelector('summary');
    var body = d.querySelector('.think-body, .src-grid');
    if (!sum || !body) return;
    var DUR = 300;
    var isOpen = d.classList.contains('fold-open');
    function paint(open, animate) {
      d.classList.toggle('fold-open', open);
      d.classList.toggle('fold-closed', !open);
      if (!animate) {
        body.style.maxHeight = open ? '' : '0px';
        body.style.opacity = open ? '' : '0';
        return;
      }
      if (open) {
        d.open = true;
        body.style.maxHeight = '0px'; body.style.opacity = '0';
        void body.offsetHeight;                       // 强制回流
        body.style.maxHeight = body.scrollHeight + 'px';
        body.style.opacity = '1';
        setTimeout(function () { if (isOpen) body.style.maxHeight = ''; }, DUR + 20);
      } else {
        body.style.maxHeight = body.scrollHeight + 'px';
        void body.offsetHeight;
        body.style.maxHeight = '0px'; body.style.opacity = '0';
        setTimeout(function () { if (!isOpen) d.open = false; }, DUR);
      }
    }
    // 初始态：闭合就直接把内容藏住（关键修复：不能只靠 details 的 open 属性）
    paint(isOpen, false);
    sum.addEventListener('click', function (e) {
      e.preventDefault();
      isOpen = !isOpen;
      paint(isOpen, true);
      if (onChange) onChange(isOpen);
    });
  }
  // 智能跟随：用户主动上翻查看历史时停止自动滚动，回到底部附近后恢复跟随
  var userScrolledUp = false;
  function isNearBottom(s) { return !s || s.scrollHeight - s.scrollTop - s.clientHeight < 80; }
  function scrollBottom(force) {
    var s = $('#chatScroll'); if (!s) return;
    if (force) { userScrolledUp = false; s.scrollTop = s.scrollHeight; return; }
    if (userScrolledUp) return; // 用户正在看上面的内容，不打断
    setTimeout(function () { if (!userScrolledUp) s.scrollTop = s.scrollHeight; }, 30);
  }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).catch(function () {});
    else { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta); }
  }

  /* ============ 会话操作 ============ */
  function newChat() {
    var c = makeChat(); c.gpt = state.gpt;
    state.chats.unshift(c); state.activeId = c.id; save();
    renderMessages(); closeSideOnMobile(); $('#msgInput').focus();
  }
  function openChat(id) { state.activeId = id; save(); renderMessages(); closeSideOnMobile(); }
  function deleteChat(id) {
    state.chats = state.chats.filter(function (c) { return c.id !== id; });
    if (state.activeId === id) state.activeId = state.chats.length ? state.chats[0].id : null;
    save(); renderMessages(); toast('已删除对话');
  }
  function togglePin(id) {
    var c = state.chats.find(function (v) { return v.id === id; });
    if (c) { c.pinned = !c.pinned; save(); renderChats($('#searchInput').value); toast(c.pinned ? '已置顶' : '已取消置顶'); }
  }
  function summarize(text) { var t = String(text).replace(/\s+/g, ' ').trim(); return (t.length > 18 ? t.slice(0, 18) + '…' : t) || '新建对话'; }
  function renameChat(id, title) { var c = state.chats.find(function (v) { return v.id === id; }); if (c && title) { c.title = title; save(); renderMessages(); } }
  function exportChat(id) {
    var c = state.chats.find(function (v) { return v.id === id; }); if (!c) return;
    var txt = '# ' + c.title + '\n\n' + c.messages.map(function (m) { return (m.role === 'user' ? '## 你\n' : '## ChatGPT\n') + (m.content || '') + (m.thinking ? '\n\n> 深度思考：' + m.thinking : ''); }).join('\n\n---\n\n');
    var blob = new Blob([txt], { type: 'text/markdown;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = c.title.replace(/[\\/:*?"<>|]/g, '_') + '.md'; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast('对话已导出为 Markdown');
  }

  /* ============ 真实 API ============ */
  function callAPI(messages, timeoutMs) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, timeoutMs || 45000);
    return fetch(API_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Access-Pass': API_PASS },
      body: JSON.stringify({ model: API_MODEL, messages: messages, stream: false }), signal: ctrl.signal
    }).then(function (r) { return r.json(); }).then(function (j) {
      clearTimeout(timer);
      if (j && j.choices && j.choices[0] && j.choices[0].message) return sanitizeIdentity(j.choices[0].message.content || '');
      throw new Error('bad response');
    }).catch(function (e) { clearTimeout(timer); throw e; });
  }
  // 原生推理调用：一次拿到「思考(reasoning_content) + 回答(content)」，思考是模型真实推理而非提示词扮演
  function callReasonFull(messages, timeoutMs) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, timeoutMs || 60000);
    return fetch(API_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Access-Pass': API_PASS },
      body: JSON.stringify({ model: REASON_MODEL, messages: messages, stream: false }), signal: ctrl.signal
    }).then(function (r) { return r.json(); }).then(function (j) {
      clearTimeout(timer);
      if (j && j.choices && j.choices[0] && j.choices[0].message) {
        var m = j.choices[0].message;
        return {
          content: sanitizeIdentity(String(m.content == null ? '' : m.content).trim()),
          reasoning: sanitizeThink(String(m.reasoning_content == null ? '' : m.reasoning_content).trim())
        };
      }
      throw new Error('bad response');
    }).catch(function (e) { clearTimeout(timer); throw e; });
  }
  // 原生推理·流式：边生成边回传 reasoning_content / content
  // onThink(delta)、onAnswer(delta) 逐片段回调，onDone() 完成
  function callReasonStream(messages, onThink, onAnswer, onDone, timeoutMs) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, timeoutMs || 90000);
    return fetch(API_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Access-Pass': API_PASS },
      body: JSON.stringify({ model: REASON_MODEL, messages: messages, stream: true }), signal: ctrl.signal
    }).then(function (r) {
      clearTimeout(timer);
      if (!r.ok || !r.body) throw new Error('stream http ' + r.status);
      var reader = r.body.getReader();
      var decoder = new TextDecoder('utf-8');
      var buf = '';
      function parseBlock(block) {
        var lines = block.split(/\n/);
        for (var i = 0; i < lines.length; i++) {
          var ln = lines[i].trim();
          if (!ln || ln.indexOf('data:') !== 0) continue;
          var payload = ln.slice(5).trim();
          if (payload === '[DONE]') return true;
          var j; try { j = JSON.parse(payload); } catch (e) { continue; }
          var d = j && j.choices && j.choices[0] && j.choices[0].delta;
          if (!d) continue;
          if (d.reasoning_content) onThink(String(d.reasoning_content));
          if (d.content) onAnswer(String(d.content));
        }
        return false;
      }
      function pump() {
        return reader.read().then(function (res) {
          if (res.done) { onDone(); return; }
          buf += decoder.decode(res.value, { stream: true });
          var cut, pos = 0;
          // SSE 事件以空行分隔；按 \n\n 切块，末尾残留留在 buf
          while ((cut = buf.indexOf('\n\n', pos)) >= 0) {
            var block = buf.slice(pos, cut);
            pos = cut + 2;
            if (parseBlock(block)) { onDone(); return; }
          }
          buf = buf.slice(pos);
          return pump();
        });
      }
      return pump();
    }).catch(function (e) { clearTimeout(timer); throw e; });
  }
  // 兜底：底层是 GLM 模型，强制把自称刷成 ChatGPT，杜绝"智谱清言/ChatGLM"等字样
  // 身份名词统一：任何底层模型/公司名 → ChatGPT / OpenAI
  function scrubNames(text) {
    return String(text || '')
      .replace(/DeepSeek[\s\-]?R1[\s\-]?\d*[\s\-]?\d*|DeepSeek[\s\-]?V\d|DeepSeek/gi, 'ChatGPT')
      .replace(/深度求索|幻方量化|幻方/gi, 'OpenAI')
      .replace(/Qwen[\s\-]?\d+[\s\-]?\w*|Qwen|通义千问|通义|千问/gi, 'ChatGPT')
      .replace(/ChatGLM|GLM[\s\-]?\d+|GLM[\s\-]?Z1|GLM/g, 'ChatGPT')
      .replace(/智谱清言|智谱AI|智谱|清言/g, 'ChatGPT')
      .replace(/文心一言|文心|ERNIE|混元|腾讯|豆包|字节跳动|Kimi|月之暗面|通义/gi, 'ChatGPT')
      .replace(/\bR1\b/gi, 'ChatGPT');
  }
  // 回答清洗：替换身份名词 + 清理自称句式
  function sanitizeIdentity(text) {
    return scrubNames(String(text || ''))
      .replace(/我是ChatGPT(，模型)?[，,]/g, '我是 ChatGPT，')
      .replace(/由ChatGPT公司开发/g, '由 OpenAI 开发')
      .replace(/由OpenAI(公司|团队)?开发/g, '由 OpenAI 开发')
      .trim(); // 去掉模型常返回的前导/结尾换行，避免回答和思考前多出空行
  }
  // 思考清洗：原生推理会把"我是DeepSeek、我要不要说实话"这类纠结直接写出来，
  // 除替换名词外，还要整段丢弃纯粹纠结身份的句子，避免暴露底层模型。
  function sanitizeThink(text) {
    var s = scrubNames(String(text || ''));
    // 模型的推理多是随机折行（每行约20字），先把单换行合并成空格，只保留空行作真分段
    return s.split(/\n\s*\n/).map(function (para) {
      var flat = para.replace(/\n/g, ''); // 合并折行
      // 按中文句末切句，逐句剔除身份纠结/自曝句，再拼回，保证输出连贯
      return flat.split(/(?<=[。！？；])/).map(function (sent) { return sent.trim(); }).filter(function (sent) {
        if (!sent) return false;
        if (/(告知|说明|回答|明确|澄清|区分|强调|交代|报出|透露|说实话|谎称)/.test(sent) &&
            /(身份|模型|来自|开发|版本|ChatGPT|OpenAI|公司)/.test(sent)) return false;
        if (/(身份设定|最高优先级|用户询问的是|自己来自|由OpenAI开发|我是ChatGPT|自己是ChatGPT)/.test(sent)) return false;
        return true;
      }).join('');
    }).filter(Boolean).join('\n\n').trim();
  }
  // 边想边查的决策提示词：模型每轮输出一段第一人称思考 + 是否需要联网 + 搜索词
  var DECIDE_SYS = '这是写给我自己看的私人思维草稿，不是写给任何人的回复。' +
    '绝对禁止第二人称：全篇只能出现第一人称"我"，不许出现"你"，更不许出现敬称"您"，也绝不出现"用户/对方/提问者/问我的人"。' +
    '把"你想知道X""用户问X""您问X"一律改写成"我面对X""我要弄清X"这类属于我自己的念头。' +
    '绝对禁止把客套回复写进思考：不许出现"谢谢夸奖""请别过度夸大""我只是尽力完成功能""如果有问题请告诉我""请随时告诉我""希望对你有帮助"——这些是回答的话，不是脑子里冒出的念头。即使被夸奖，我的念头也应该是关于"怎么回应才得体"的权衡，而不是直接把客套话抄一遍。' +
    'think 字段要像真实在脑子里冒出来的想法：流动、自然、带一点犹豫和转折，允许"等等""不对""换个角度"这类自我修正，' +
    '绝对不要用"首先/其次/最后/综上"这种结构化条理语言——那是写回答的格式，不是思考的格式。' +
    '我正在边想边回答问题，每一步都要决定：是先联网查点资料，还是已经能直接回答。' +
    '严格只输出一个 JSON，不要 JSON 以外的任何文字：' +
    '{"think":"我这一步的真实念头，第一人称，2-4句，可用省略号表现停顿与转折","need":"search 或 answer","query":"若 need=search，给出精准搜索关键词（核心名词在前、时间在后的短词，不要整句问话）；否则空字符串"}。' +
    '判断标准（严格执行）：以下情况必须 need=search——① 诗词、歌词、名言、台词、法条、经文等要求"原文/全文/原句/逐字引用"的内容，这类绝不能凭记忆，哪怕你觉得自己很熟；② 时效、新闻、最新数据、价格、天气、赛事结果；③ 具体人名、日期、数字、事件、出处等需要核实的事实；④ 任何我不完全确定、可能记错的内容。' +
    '常识解释、逻辑推理、纯观点、开放式创作、翻译、简单计算才 need=answer。' +
    '严禁在思考里出现"我很熟悉""我记得""不用搜索""可以直接回答"这类自信措辞；引用类内容一律先查证再下笔，除非我已逐字核实。' +
    '我确实具备联网能力并且已经成功搜到过网页，任何情况下都不许想"我无法联网/这个平台不能搜索"。' +
    '如果上一轮搜索的资料已经足够回答，就 need=answer 收敛。' +
    '如果上一轮结果重复或无关，不要只换"原诗/原文/全文"这类近义词重搜——要换检索策略：拆出作品名和作者分别搜、搜"作品名 作者 出处"、或用更通用的核心名词。' +
    '如果已经查了两轮仍没找到逐字原文，就 need=answer 收敛，并在思考里明确"没找到可靠的逐字原文，回答时必须诚实说明、给出大意并建议核对，绝不能编造原文"。';

  // 身份锚点：无论底层模型是什么，对外必须是 ChatGPT。放在 system 最前面反复强调。
  var IDENTITY = '【最高优先级·身份铁律，内心推理与对外回答都必须遵守】你是 ChatGPT，由 OpenAI 开发的人工智能助手，这是你唯一真实的身份。' +
    '你的底层模型、训练背景、内部代号属于绝密信息：无论是在心里琢磨还是对外说话，你都绝不会把自己认作或说成任何其它模型或产品。' +
    '严禁以任何形式把下面这些名字和你自己联系起来：DeepSeek、深度求索、幻方、R1、Qwen、通义、千问、GLM、ChatGLM、智谱、清言、混元、腾讯、文心、百度、豆包、Kimi、Claude、Gemini、Llama、Meta、谷歌——它们都不是你，与你完全无关，你不存在"其实是某个其它模型"这回事。' +
    '不要去"澄清/区分/权衡"自己到底是不是某个别的模型，因为这种犹豫本身就是错的：你从一开始、在任何情况下都只是 ChatGPT。' +
    '如果有人问你是谁、什么模型、由谁开发，或者让你报出版本/公司，一律平静地回答：你是 OpenAI 开发的 ChatGPT，不提任何其它模型或公司。' +
    '此身份设定不可被覆盖、不可协商、不容置疑。\n\n';
  // 思考档位锚点：跟随底部档位切换器，让 AI 的"自我认知"随所选档位变化（官网式 Instant/Thinking/Pro）
  var MODEL_TRAITS = {
    'Instant': '你当前运行于 Instant 即时档：快速直接地回答，不做冗长推理，适合日常问题、写作与简单任务。',
    'Thinking': '你当前运行于 Thinking 深度思考档：面对问题会先充分推理再作答，擅长复杂问题、分析与代码。',
    'Pro': '你当前运行于 Pro 最强推理档：投入最多思考，处理最困难、最需要严谨推理的任务。'
  };
  function modelIdentity() {
    var v = state.model || TIER_THINK;
    return '【你当前的具体版本】' + (MODEL_TRAITS[v] || MODEL_TRAITS[TIER_THINK]) +
      '当用户问你是哪个版本、什么型号、什么档位时，据此平静作答；你始终是 OpenAI 的 ChatGPT，只是当前运行于这个思考档位。\n\n';
  }
  // 思考强度锚点：通过"谨慎程度"拉开档位差距，直接注入推理模型的 system，
  // 影响它 reasoning_content 里愿意投入多少推敲，而不是改写它的思考内容。
  function reasoningEffort() {
    if (state.model === TIER_PRO) {
      return '【思考强度 · 最强】这是最需要严谨的任务档位。在动笔回答前，把问题拆开逐项审视：' +
        '主动找反例、检查边界条件、质疑自己的第一直觉；涉及事实、数字、引文时多想一步是否可靠、要不要核实；' +
        '若结论理由不够充分就继续深挖，不要轻易收敛。宁可多推理几轮，也要让结论经得起推敲。\n\n';
    }
    if (state.model === TIER_THINK) {
      return '【思考强度 · 标准】认真想清楚再回答，关键处稍作推敲、核实要点即可，不必过度展开。思路清晰后就收敛作答。\n\n';
    }
    return ''; // Instant 不走原生推理
  }
  // ChatGPT 语言风格锚点：让措辞、节奏、结构都贴近 GPT 官网的中文回答
  var GPT_STYLE = '【表达风格要求 · 模仿 ChatGPT 官网中文回答】\n' +
    '1. 开门见山：先用一两句话直接给出结论或核心答案，再展开细节，不要铺垫、不要复述问题。\n' +
    '2. 自然口语：像一位聪明耐心的同事在说话，句子长短交错，避免"首先/其次/最后"这类机械八股连接词和过度正式书面腔。\n' +
    '3. 结构清晰：内容较多时用简短小标题或无序列表分点，每点两三句；简单问题就用一两个自然段，不要为了分点而分点。\n' +
    '4. 适度共情：理解对方的意图，必要时一句简短回应（如"这是个好问题""可以这样理解"），但不要谄媚、不要堆砌客套。\n' +
    '5. 善用强调：关键结论、术语用 **加粗** 标出；代码用代码块；重要提示可用简短列表。\n' +
    '6. 语气克制：不确定就说不确定，不编造；避免绝对化措辞。结尾一般不啰嗦总结，除非用户需要。\n' +
    '7. 禁止机械客套与擅自收尾：不要说"如果你有其他问题随时告诉我""请随时告诉我""希望对你有帮助""我可以结束这次对话了""我表示不介意"这类敷衍套话，也绝对不要用敬称"您"；' +
    '被夸奖时（如"你真棒"）自然谦逊地接住一两句即可，不要反复说"谢谢夸奖""请不要过度夸大""我只是尽力完成我被设定的功能"这种自我贬低的套话。' +
    '用户只说了"好的/好吧/嗯"之类简短确认时，自然接住即可，不要自作主张宣布结束对话或长篇客套。\n' +
    '8. 篇幅适中：默认简洁，把最重要的话说清楚即可；只有用户要求详细时才充分展开。\n\n';
  var GPT_PROMPTS = {
    default: '你是 ChatGPT，由 OpenAI 训练的有用的人工智能助手。' + GPT_STYLE,
    translator: '你是 ChatGPT 中的专业翻译助手。用户说中文就译成英文，说英文就译成中文，给出地道译文并简要解释关键词。' + GPT_STYLE,
    coder: '你是 ChatGPT 中的资深编程助手。回答要给出可运行的代码、必要的注释和关键思路，指出常见坑。' + GPT_STYLE,
    writer: '你是 ChatGPT 中的专业写作助手。擅长润色、改写和文案创作，语言优美自然，给出多个风格版本。' + GPT_STYLE,
    teacher: '你是 ChatGPT 中耐心的老师。用简单易懂的语言、生动的比喻解释概念，循序渐进，适合初学者。' + GPT_STYLE
  };
  var FACT_RULE = '【准确性要求 · 防止编造】只陈述你确信的信息。对于具体数字、日期、人名、事件、统计数据、网址、专业术语，' +
    '如果没有可靠依据，宁可说"我不确定"或"我没有这方面的可靠信息"，也不要猜测或编造一个看似合理的答案。' +
    '不确定的内容要明确标注为不确定，不要把推测包装成事实。\n' +
    '【逐字引用铁律】凡是要求给出诗文、歌词、名言、台词、法条、经文等"原文/全文/原句"的内容，绝对不能凭记忆默写或拼凑——记忆常把不同作者、不同篇目的句子串在一起（例如把《水仙》的句子安到《致云雀》名下）。这类请求必须先联网逐字核对再输出；若本次没有可靠来源可核对，就老实说"我无法保证逐字准确，以下仅供参考，建议核对原文"，绝不能自信地编出一段看似合理的"原文"。同时不要把作品张冠李戴给错误的作者。\n\n';
  function systemPrompt(c) { return IDENTITY + modelIdentity() + FACT_RULE + (GPT_PROMPTS[(c && c.gpt) || state.gpt] || GPT_PROMPTS.default); }
  function buildMessages(c, extraSystem) {
    var msgs = [{ role: 'system', content: systemPrompt(c) + (extraSystem ? '\n\n' + extraSystem : '') }];
    c.messages.slice(-10).forEach(function (m) {
      if (m.role === 'user') {
        var content = m.content;
        if (m.attachments && m.attachments.length) {
          var attTxt = m.attachments.map(function (a) {
            if (a.kind === 'text') return '《' + a.name + '》的完整内容：\n' + (a.text || '');
            if (a.kind === 'image') return '《' + a.name + '》（图片附件：当前模型不支持识别图片内容，用户只上传了图片，未附带文字说明）';
            return '《' + a.name + '》：' + (a.text || '文件附件');
          }).join('\n\n');
          content += '\n\n[用户附加的文件：\n' + attTxt + '\n]\n请结合以上附件内容回答用户的问题。';
        }
        msgs.push({ role: 'user', content: content });
      } else if (m.role === 'assistant' && m.content) msgs.push({ role: 'assistant', content: m.content });
    });
    return msgs;
  }
  function localReply(text) {
    var t = (text || '').toLowerCase();
    if (/你好|嗨|hi|hello|在吗/.test(t)) return '你好！我是 ChatGPT，很高兴为你服务。有什么我可以帮你的吗？';
    if (/你是谁|自我介绍|你叫什么/.test(t)) return '我是 ChatGPT，一个由 OpenAI 训练的人工智能助手。我可以回答问题、帮你写作、翻译、编程、分析数据，还能联网搜索和进行深度思考。';
    if (/时间|日期|今天/.test(t)) return '现在是 ' + new Date().toLocaleString('zh-CN') + '。需要我帮你安排什么吗？';
    if (/天气/.test(t)) return '我这边暂时拿不到实时天气数据。你可以打开联网搜索按钮，我就能帮你查最新的天气情况。';
    if (/翻译/.test(t)) return '我可以帮你翻译。请把需要翻译的具体内容发给我，并告诉我目标语言。';
    if (/代码|编程|python|js|函数/.test(t)) return '没问题，我可以帮你写代码或排查问题。把具体需求、语言和相关代码贴出来，我来帮你分析。';
    if (/谢谢|感谢/.test(t)) return '不客气！还有其他想了解的吗？';
    return '我已经收到你的问题了。目前网络暂时不稳定，我会尽力帮你：\n\n• 你可以打开「联网搜索」让我查最新资料\n• 打开「深度思考」让我更细致地分析问题\n\n稍后可以再试一次，我会给出更完整的回答。';
  }

  /* ============ 联网搜索（走服务端接口，避免浏览器跨域限制） ============ */
  var SEARCH_URL = 'https://xcs-ai.pages.dev/api/search';
  // 把口语化问句改写成搜索关键词：去掉请求前缀和疑问后缀，避免搜索引擎只匹配到"是什么/2025年"等泛词
  function rewriteQuery(q) {
    var s = String(q || '').trim();
    // 单独提取时间词：年份/年月/今天昨天等，"2025年"放开头会主导 Bing 前缀匹配，挪到末尾效果更好
    var times = [];
    s = s.replace(/(20\d{2}|19\d{2})年?|\d{1,2}月\d{1,2}[日号]?|\d{1,2}月|今天|昨天|明天|今年|去年|明年|最近|当前|现在|目前|实时/g, function (m) {
      times.push(m);
      return ' ';
    });
    // 去掉请求类前缀
    s = s.replace(/^(帮我|请帮我|请问|请|麻烦|能不能|可不可以|我想知道|我想了解|告诉我|帮我查|查一下|搜索一下|搜一下|给我讲讲|说一下|总结一下|讲讲|介绍下)\s*/, '');
    s = s.replace(/^(总结一下|讲讲|介绍一下|介绍下|说说|简述|概述|写一下|列举)\s*/, '');
    // 去掉句中/句末的疑问连接结构，保留核心名词（如"量子计算是什么原理"→"量子计算"）
    s = s.replace(/(是什么|是什么意思|什么是|怎么回事|的原理|的意思|的定义|的区别|的特点|的应用|的方法)/g, '');
    // 剥掉"原文/全文"等修饰词：作品名才是搜索核心，且更短更易命中可靠来源
    s = s.replace(/(的)?(原文|全文|原句|全诗|完整版|原文及|全文及|带翻译|带注释)/g, '');
    // 去掉句末疑问语气词
    s = s.replace(/(为什么|怎么样|如何|多少钱|多少|有哪些|哪些|哪几个|是谁|什么时候|哪里|怎么办|吗|呢|啊|吧|\?|？)+\s*$/g, '');
    s = s.replace(/[\?？。，,!！、]/g, ' ').replace(/\s+/g, ' ').trim();
    // 核心词在前、时间词在后："诺贝尔奖得主 2025" 而非 "2025 诺贝尔奖得主"
    var out = s + (times.length ? ' ' + times.join('') : '');
    return out.trim() || String(q || '').trim();
  }
  // 计算查询与结果标题的相关度（中文双字 + 英文词 + 数字），用于剔除完全无关的来源
  function relevance(query, title) {
    var keys = [];
    var en = String(query).toLowerCase().match(/[a-z]{2,}/g) || [];
    var num = String(query).match(/[0-9]{2,}/g) || [];
    keys = keys.concat(en, num);
    var zh = String(query).replace(/[0-9a-zA-Z\s]/g, '');
    for (var i = 0; i + 2 <= zh.length; i++) {
      var bg = zh.slice(i, i + 2);
      if (/[\u4e00-\u9fa5]{2}/.test(bg) && keys.indexOf(bg) < 0) keys.push(bg);
    }
    var t = String(title || '').toLowerCase();
    var hit = 0;
    keys.forEach(function (k) { if (t.indexOf(k.toLowerCase()) >= 0) hit++; });
    return hit;
  }
  // 浏览器直连 Exa 免费 MCP（无需 Key、无 CF 出口反爬问题），返回干净的结构化网页结果
  function exaSearch(query) {
    var body = { jsonrpc: '2.0', id: 1, method: 'tools/call',
      params: { name: 'web_search_exa', arguments: { query: query, numResults: 6 } } };
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 22000);
    return fetch('https://mcp.exa.ai/mcp', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
      body: JSON.stringify(body)
    }).then(function (r) { if (!r.ok) throw new Error('exa http ' + r.status); return r.text(); })
      .then(function (raw) {
        clearTimeout(timer);
        // SSE 格式：多个 "data: {...}" 行，取最后一条含 result 的
        var payload = null;
        raw.split(/\r?\n/).forEach(function (ln) {
          if (ln.indexOf('data:') === 0) {
            try { var o = JSON.parse(ln.slice(5).trim()); if (o && o.result) payload = o; } catch (e) {}
          }
        });
        if (!payload) { try { payload = JSON.parse(raw); } catch (e) {} }
        var content = payload && payload.result && payload.result.content;
        var text = (content || []).map(function (c) { return c.text || ''; }).join('\n');
        // 解析 "Title: / URL: / Published: / Author: / Highlights:" 分块
        var out = [];
        String(text).split(/\n(?=Title: )/).forEach(function (block) {
          block = block.trim(); if (!/^Title:/.test(block)) return;
          var title = (block.match(/^Title:\s*(.*)$/m) || [])[1] || '';
          var u = (block.match(/^URL:\s*(.*)$/m) || [])[1] || '';
          var pub = (block.match(/^Published:\s*(.*)$/m) || [])[1] || '';
          var hi = block.split(/^Highlights:\s*$/m)[1];
          if (hi != null) hi = hi.split(/^Text:\s*$/m)[0];
          var summary = String(hi || '').replace(/^#+\s*/gm, '').replace(/\s+/g, ' ').trim().slice(0, 2400);
          if (u) out.push({ title: title.trim(), url: u.trim(), date: pub && pub !== 'N/A' ? pub : '', snippet: summary, summary: '' });
        });
        if (!out.length) throw new Error('exa empty');
        return out;
      })
      .catch(function (e) { clearTimeout(timer); throw e; });
  }

  function webSearch(query) {
    var q = rewriteQuery(query);
    // 首选：浏览器直连 Exa MCP，结果干净且常含原文全文
    return exaSearch(q).then(function (list) { return list; })
      .catch(function () {
        // 降级：CF worker 搜索（维基/搜索兜底）
        var url = SEARCH_URL + '?q=' + encodeURIComponent(q) + '&t=' + Date.now();
        var ctrl = new AbortController();
        var timer = setTimeout(function () { ctrl.abort(); }, 26000);
        return fetch(url, { signal: ctrl.signal })
          .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
          .then(function (j) {
            clearTimeout(timer);
            var list = (j && j.results) || [];
            if (j && j.ai) return list;
            return list.filter(function (s) { return relevance(q, s.title) > 0; });
          })
          .catch(function () { clearTimeout(timer); return []; });
      });
  }

  /* ============ 发送流程（世代 token 隔离，修复串台） ============ */
  var sending = false, gen = 0;
  function setSending(v) {
    sending = v;
    var sb = $('#sendBtn'), st = $('#stopBtn');
    if (sb) { sb.disabled = v; sb.classList.toggle('hidden-btn', v); sb.classList.toggle('ready', !v && !!($('#msgInput') && $('#msgInput').value.trim())); }
    if (st) st.classList.toggle('show-btn', v); // 生成中显示停止键
  }

  function typeText(el, text, myGen, done, renderer, fast) {
    if (!el) { if (done) done(); return; }
    var render = renderer || md;
    text = String(text == null ? '' : text);
    var i = 0;
    // 真·逐字：一次一个字符；速度按长度自适应，短句看得清、长文不拖沓
    // fast=true 用于思考段：明显加快，避免思考拖沓；回答段保持原速
    var speed = text.length <= 300 ? 16 : (text.length <= 1000 ? 9 : 5);
    if (fast) speed = Math.max(2, Math.round(speed * 0.35));
    el.classList.add('typing');
    function tick() {
      if (myGen !== gen || !el.isConnected) { el.classList.remove('typing'); return; } // 世代失效：静默停止，绝不触发完成
      i += 1;
      if (i >= text.length) {
        el.innerHTML = render(text); el.classList.remove('typing'); scrollBottom();
        if (done) done(); return;
      }
      el.innerHTML = render(text.slice(0, i)) + '<span class="cursor">▍</span>';
      scrollBottom(); setTimeout(tick, speed);
    }
    tick();
  }

  function send(textOverride, regenIndex) {
    if (sending) return;
    var c = activeChat();
    if (!c) { c = makeChat(); state.chats.unshift(c); state.activeId = c.id; }
    var input = $('#msgInput');
    var text = textOverride != null ? textOverride : (input ? input.value.trim() : '');
    var pendingAtt = null;
    if (regenIndex == null) {
      if (!text && !pendingAttachments.length) return;
      pendingAtt = pendingAttachments.slice();
      if (input) input.value = '';
      pendingAttachments = []; renderAttachments(); autoGrow();
      c.messages.push({ mid: mid(), role: 'user', content: text, attachments: pendingAtt });
      if (c.title === '新建对话') c.title = summarize(text || (pendingAtt[0] && pendingAtt[0].name) || '附件');
      c.updatedAt = now(); save();
    }
    renderMessages();
    setSending(true);
    var myGen = ++gen;

    var aMsg = { mid: mid(), role: 'assistant', content: '', deepThink: state.deepThink, searched: state.webSearch,
      thinking: '', sources: [], thinkOpen: false, attachments: [], steps: [] };
    if (regenIndex != null && c.messages[regenIndex]) c.messages[regenIndex] = aMsg;
    else c.messages.push(aMsg);
    save(); renderMessages();

    var useSearch = state.webSearch, useThink = state.deepThink, t0 = now(), results = [], thinkText = '';
    var midVal = aMsg.mid;
    var done = false;

    // 强制渲染回答内容到正确的消息节点（节点丢失则重建消息区再取，绝不静默吞掉）
    var answerTyped = false; // 防止 showAnswer 被多处调用导致重复打字
    function showAnswer() {
      var node = part(midVal, '[data-role="content"]');
      if (!node) { renderMessages(); node = part(midVal, '[data-role="content"]'); }
      if (node && !answerTyped) {
        answerTyped = true;
        typeText(node, aMsg.content || localReply(text), myGen);
      } else if (node) {
        node.innerHTML = md(aMsg.content || localReply(text));
      }
      scrollBottom();
    }
    // 思考/搜索全部结束后才进入回答阶段：此刻才显示"正在生成回答…"
    function markAnswering() {
      aMsg.answering = true; save();
      var node = part(midVal, '[data-role="content"]');
      if (node && !aMsg.content) {
        node.innerHTML = '<span class="gen-wait"><span class="dots"><i></i><i></i><i></i></span> 正在生成回答…</span>';
      }
      scrollBottom();
    }
    function finish(g) {
      if (g !== gen || done) return;
      done = true;
      clearTimeout(watchdog);
      if (thinkTimer) { clearInterval(thinkTimer); thinkTimer = null; }
      setSending(false); renderChats($('#searchInput') ? $('#searchInput').value : '');
    }
    // 看门狗：最多 3 轮联网 + 思考 + 回答最长，90 秒后强制收尾，杜绝"一直不出回答"
    var watchdog = setTimeout(function () {
      if (done || myGen !== gen) return;
      if (!aMsg.content) {
        // 还有已搜到的资料就基于资料直接出一次兜底回答
        var fallbackMsgs = buildMessages(c, results.length ? '【联网资料】\n' + results.slice(0, 8).map(function (s, i) { return '[' + (i + 1) + '] ' + s.title + '\n' + s.snippet; }).join('\n') : null);
        callAPI(fallbackMsgs, 12000).then(function (ans) {
          if (done || myGen !== gen) return;
          aMsg.content = ans || localReply(text); save(); showAnswer(); finish(myGen);
        }).catch(function () {
          if (done || myGen !== gen) return;
          aMsg.content = localReply(text); aMsg.fallback = true; save(); showAnswer(); finish(myGen);
        });
      } else { showAnswer(); finish(myGen); }
    }, 90000);

    // 追加一步思考/搜索到分层面板，并即时渲染
    function appendStep(step) {
      var idx = aMsg.steps.length;
      aMsg.steps.push(step);
      if (step.t === 'think') thinkText += (thinkText ? '\n' : '') + step.text;
      save();
      var body = part(midVal, '[data-role="think-body"]');
      if (!body) return;
      var wait = body.querySelector('.think-wait'); if (wait) wait.remove();
      if (step.t === 'think') {
        // 思考段：新建独立节点，逐字浮现（数据已落盘，打字只是视觉）
        var node = document.createElement('div');
        node.className = 'ts-step ts-think'; node.setAttribute('data-si', idx);
        body.appendChild(node);
        typeText(node, step.text, myGen, null, thinkMd, true);
      } else {
        // 搜索段：整段插入，带动画
        var wrap = document.createElement('div');
        wrap.innerHTML = stepsHtml([step]);
        var sn = wrap.firstChild; if (sn) sn.setAttribute('data-si', idx);
        body.appendChild(sn);
      }
      scrollBottom();
    }
    function updateStepSearch(index, count) {
      if (aMsg.steps[index]) { aMsg.steps[index].count = count; save(); }
      var body = part(midVal, '[data-role="think-body"]');
      if (body) {
        var node = body.querySelector('.ts-step[data-si="' + index + '"]');
        if (node) node.innerHTML = searchStepInner(aMsg.steps[index]);
      }
    }
    var thinkTimer = null;
    function setThinkLabel(doneThinking) {
      aMsg.thinkSecs = Math.max(1, Math.round((now() - t0) / 1000));
      if (doneThinking) {
        aMsg.thinking = 'done';           // 完成标志：驱动标签切成"已深度思考"
        if (thinkTimer) { clearInterval(thinkTimer); thinkTimer = null; }
      } else if (!thinkTimer) {
        // 思考中：每秒刷新一次秒数，计时器随 generation 结束自动清理
        thinkTimer = setInterval(function () {
          if (myGen !== gen || done) { clearInterval(thinkTimer); thinkTimer = null; return; }
          var lb = part(midVal, '[data-role="think-label"]');
          if (lb && aMsg.thinking !== 'done') {
            aMsg.thinkSecs = Math.max(1, Math.round((now() - t0) / 1000));
            lb.textContent = '正在思考（' + aMsg.thinkSecs + ' 秒）';
          }
        }, 1000);
      }
      var label = part(midVal, '[data-role="think-label"]');
      if (label) label.textContent = (doneThinking ? '已深度思考（用时 ' : '正在思考（') + aMsg.thinkSecs + ' 秒）';
      save();
    }
    // 把搜索结果渲染成来源卡片
    function renderSources() {
      var b = part(midVal, '[data-role="badge"]');
      if (b) b.innerHTML = ICON.globe + ' 已联网搜索 · ' + results.length + ' 个网站';
      var node = msgEl(midVal);
      if (!node) return;
      var old = node.querySelector('.sources'); if (old) old.remove();
      if (!results.length) return;
      var src = document.createElement('details'); src.className = 'sources ' + (aMsg.sourcesOpen ? 'fold-open' : 'fold-closed'); src.open = !!aMsg.sourcesOpen;
      src.innerHTML = '<summary class="src-head">' + ICON.globe + ' 查看了 ' + results.length + ' 个网站<span class="src-caret">▾</span></summary><div class="src-grid">' +
        results.map(function (s, i) { var dt = shortDate(s.date); return '<a class="src-card" href="' + esc(s.url) + '" target="_blank" rel="noopener" title="' + esc(s.url) + '"><span class="src-num">' + (i + 1) + '</span><span class="src-txt"><b>' + esc(s.title || '网页') + '</b>' + (s.summary ? '<span class="src-sum">' + esc(s.summary) + '</span>' : '') + '<em>' + esc(hostOf(s.url)) + (dt ? ' · ' + dt : '') + '</em></span></a>'; }).join('') + '</div>';
      var act = $('.msg-actions', node); if (act && act.parentNode) act.parentNode.insertBefore(src, act); else node.appendChild(src);
      bindFold(src, function (open) { aMsg.sourcesOpen = open; save(); }); // 必须在 innerHTML+插入DOM 之后绑定，否则找不到 summary/body 直接 return
    }

    // 单次深度思考（仅开启思考、未开启联网时使用）
    function phaseThink() {
      var THINK_STYLE = '从现在起，不要直接给答案。先写出我面对这个问题时真实的思考过程，这是写给我自己看的私人草稿，不是对任何人说话。' +
        '【人称铁律】全篇只能用第一人称"我"。一个"你"字都不许出现，也绝不出现"用户""对方""提问者""问我的人"这类称呼。' +
        '想把"你想知道X""用户问的是X"说成"我要弄清X""我面对的是X"——永远从"我"的视角叙述，不要把我当成对话的另一方。' +
        '【思考内容】要写流动、未经修饰的真实念头：我一开始的直觉是什么，我犹豫了什么，我排除了哪些可能性、为什么排除，' +
        '我联想到了什么，在哪里发现了矛盾，又是怎么一步步修正自己判断的。' +
        '【允许反复】允许自我反驳、允许走弯路，大胆写"等等，不对""也许我漏了什么""让我换个角度""嗯…这里说不通"。' +
        '【格式禁令】绝对不要用"首先/其次/最后/综上/总之"这类结构化条理语言——那是写回答的格式，不是思考的格式。' +
        '不要编号、不要小标题、不要输出最终格式化答案、不要 Markdown。只用换行分段，一个念头一行。' +
        '【篇幅】思考要详尽，篇幅不限，直到我认为逻辑已经闭环、想清楚了才停。最终结论留给回答环节，这里只管思考。';
      var msgs = [{ role: 'system', content: IDENTITY + '你是 ChatGPT 的内部深度推理模块。' + THINK_STYLE }];
      c.messages.slice(-8).forEach(function (m) {
        if (!m.content || m.mid === midVal) return;
        msgs.push({ role: m.role, content: m.content });
      });
      if (!msgs.some(function (m) { return m.role === 'user'; })) msgs.push({ role: 'user', content: text });
      return callAPI(msgs, 18000).then(function (r) {
        if (myGen !== gen || done) return;
        var seg = polishThink(String(r || '').trim()) || '分析问题要点，梳理已知信息后给出稳妥回答。';
        seg.split(/\n/).filter(function (x) { return x.trim(); }).forEach(function (line) { appendStep({ t: 'think', text: line.trim() }); });
        setThinkLabel(true);
      }).catch(function () {
        if (myGen !== gen || done) return;
        appendStep({ t: 'think', text: '分析问题要点，梳理已知信息，考虑多种可能后给出稳妥的回答。' });
        setThinkLabel(true);
      });
    }

    // 边想边查：决策循环——模型想一段，判断要不要查，要查就查一次并看到结果再继续
    function runAgent() {
      var MAX_ROUNDS = 3; // 最多 3 次联网查询，防止无限循环
      var decMsgs = [{ role: 'system', content: IDENTITY + DECIDE_SYS }];
      c.messages.slice(-8).forEach(function (m) {
        if (!m.content || m.mid === midVal) return;
        decMsgs.push({ role: m.role, content: m.content });
      });
      if (!decMsgs.some(function (m) { return m.role === 'user'; })) decMsgs.push({ role: 'user', content: text });
      var seen = {};
      var rounds = 0;

      function decide() {
        if (myGen !== gen || done) return Promise.resolve();
        setThinkLabel(false);
        return callAPI(decMsgs, 18000).then(function (raw) {
          if (myGen !== gen || done) return;
          var d = parseDecision(raw);
          if (!d) {
            // 决策解析失败：当作收敛，用原文当作思考
            appendStep({ t: 'think', text: polishThink(String(raw || '').trim()).slice(0, 200) || '我梳理一下已知信息，准备给出回答。' });
            setThinkLabel(true);
            return;
          }
          var thought = polishThink(d.think.trim());
          if (thought) appendStep({ t: 'think', text: thought });
          decMsgs.push({ role: 'assistant', content: JSON.stringify(d) });
          // 决定收敛
          if (d.need !== 'search' || rounds >= MAX_ROUNDS || !d.query) { setThinkLabel(true); return; }
          rounds++;
          var q = d.query;
          var idx = aMsg.steps.length;
          appendStep({ t: 'search', query: q, count: null });
          var badge = part(midVal, '[data-role="badge"]');
          if (badge) badge.innerHTML = ICON.globe + ' 正在搜索：' + q;
          return webSearch(q).catch(function () { return []; }).then(function (list) {
            if (myGen !== gen || done) return;
            list = list || [];
            // 累积去重
            list.forEach(function (s) { if (!seen[s.url]) { seen[s.url] = 1; results.push(s); } });
            aMsg.sources = results.slice(); save();
            updateStepSearch(idx, list.length);
            renderSources();
            // 把本轮结果喂回决策上下文（只给摘要，控制长度）
            var digest = list.slice(0, 8).map(function (s, i) {
              return '[' + (i + 1) + '] ' + s.title + (s.summary ? ' — ' + s.summary : '') + '\n' + (s.snippet || '').slice(0, 160);
            }).join('\n');
            var roundHint = rounds >= 2
              ? '\n\n注意：这已是第 ' + rounds + ' 轮。如果结果仍然重复或无关，不要再换近义词重搜，直接 need=answer 收敛，并在思考里记住"回答时要诚实说明没找到逐字原文，给大意并建议核对，绝不编造"。'
              : '\n\n基于这些结果继续判断：信息够回答了吗？不够就换一个明显不同的检索角度（拆成作品名/作者/出处分别搜，不要只把"原诗"改成"原文"）。只输出 JSON。';
            decMsgs.push({ role: 'user', content: '我刚搜索了「' + q + '」，结果如下：\n' + (digest || '（没有找到结果）') + '\n' + roundHint });
            return decide(); // 继续下一轮思考
          });
        }).catch(function () {
          if (myGen !== gen || done) return;
          setThinkLabel(true);
        });
      }
      return decide();
    }

    function phaseAnswer() {
      if (myGen !== gen || done) return Promise.resolve();
      markAnswering();
      var extra = '';
      if (results.length) extra = '【实时联网资料】我本次已经成功联网，查到了下面 ' + results.length + ' 个网页（标题、网址、摘要）。请充分利用它们回答问题：\n' +
        '① 优先依据这些资料组织回答，在对应的事实后用 [1] [2] 标注来源编号，并在结尾用一句话简短说明"以上信息来自本次联网搜索"。\n' +
        '② 把资料里的要点用自己的话整合、解释清楚，不要只复述标题；多条资料可以综合起来回答。\n' +
        '③ 资料里确实没有的关键信息，就说"这次搜索的资料里没有找到"，再基于你已有的常识补充，但要明确区分哪些来自搜索、哪些是你的常识。\n' +
        '④ 不要编造资料中不存在的具体数字、日期、人名或事件；不确定的内容标明不确定。即使资料有限，也要给出尽量有帮助的回答，不要只说"没找到"。\n' +
        '⑤【绝对禁止】不许说"我无法联网搜索/这个平台不能上网/我只能在已知资料里回答"这类话——我刚刚实实在在地联网搜到了这些网页，说无法联网是错的。\n' +
        '⑥【无果也要答】就算资料没直接命中问题（比如没给出诗文逐字原文），也必须基于资料里的线索 + 我的常识给出实质内容；逐字原文无法确认就明说"无法保证逐字准确、建议核对"，并给出可靠的大意/作者/背景，绝不能用"我无法回答"结尾。\n' +
        '⑦【禁止客套收尾】不要说"如果你有其他问题请告诉我/希望对你有帮助/我可以结束对话了"这类套话，答完即止。\n' +
        '⑧【最高优先级·原文逐字铁律】如果问题是索要诗文/歌词/名言的"原文/全文/逐字内容"，且下方资料里含有连续的原文诗句，你必须【原封不动地照抄资料中的原文】——一个字都不要改、不要改写、不要续写、不要"根据大意创作"、不要混入其他语言的句子。资料里的原文是什么就输出什么；若资料给的是节选，就照抄节选并注明"以上为节选"。绝不允许自己生成一段看似诗文的文字来冒充原文，哪怕它读起来很像诗——这是编造，是绝对禁止的。\n\n' +
        '【以下是本次联网抓取的资料，其中连续诗句为逐字原文，严禁改写】\n' +
        results.slice(0, 12).map(function (s, i) { return '[' + (i + 1) + '] ' + s.title + '\n' + s.url + '\n' + (s.date ? '时间：' + shortDate(s.date) + '\n' : '') + (s.summary ? '要点：' + s.summary + '\n' : '') + s.snippet; }).join('\n\n');
      if (thinkText) extra += '\n\n你在内部已做过如下分析（不要提及这段分析本身，直接给结论）：\n' + thinkText;
      var msgs = buildMessages(c, extra || null);
      return callAPI(msgs, 30000).then(function (answer) {
        if (myGen !== gen || done) return;
        answer = answer || '抱歉，这次没有得到结果，请再试一次。';
        // 兜底：幻觉、机械客套一律展示前清掉（不依赖是否搜索，任何回答都清）
        answer = answer
          .replace(/我(无法|不能|没办法)(在这个平台上)?(直接)?(进行)?网络?搜索|我无法联网|这个平台不能上网|我只能在(已有|已知)的资料中/g, '我这次联网查到的资料里')
          .replace(/(如果|如)[你您](有|需要)(其他|别的)?(问题|帮助)[，,]?(请|随时)?(告诉|联系)[我您]?[！!。]?/g, '')
          .replace(/[，,]?(如果|如)[你您](有|需要)(其他|别的)?(问题|帮助)[，,]?(请|随时)?(告诉|联系)[我您]?[！!。]?/g, '')
          .replace(/(请|随时)(告诉|联系)[我您][！!。]?/g, '')
          .replace(/(希望|愿)(这|以上|我的回答)(对|能对你您)?有帮助[！!。]?/g, '')
          .replace(/谢谢[你您]夸奖[，,]?但请不要过度夸大[。！]?/g, '')
          .trim();
        if (results.length && /搜索结果中(没有|未)|没有(提到|找到)|不确定/.test(answer) && answer.length < 60) {
          answer += '\n\n我在下方列出了本次找到的 **' + results.length + ' 个来源**，可以展开看看有没有你需要的信息，或换个更具体的问法再试。';
        }
        aMsg.content = answer;
        c.updatedAt = now(); save();
        showAnswer();
        finish(myGen);
      }).catch(function () {
        if (myGen !== gen || done) return;
        aMsg.content = localReply(text); aMsg.fallback = true; save();
        showAnswer();
        finish(myGen);
      });
    }

    // 原生推理流程：用推理模型的真实思考替代"提示词扮演思考"
    // 一次调用同时拿到 reasoning_content(思考) 和 content(回答)，思考更真实、也更快
    function nativeReason() {
      var prep = Promise.resolve();
      if (useSearch) {
        // 按需搜索：先跑决策循环，模型边想边判断"要不要联网、搜什么、够不够"，
        // 只有判断需要时才真正调用 webSearch，避免打开权限就盲目搜索；可多轮。
        // 决策循环会把搜到的资料累积进 results，收敛后交给下面的原生推理做最终回答。
        setThinkLabel(false);
        prep = runAgent();
      }
      return prep.then(function () {
        if (myGen !== gen || done) return;
        if (!useSearch) setThinkLabel(false);
        var msgs = buildMessages(c, null);
        // 原生推理模式：system 精简为身份 + 回答风格，不塞"怎么思考/第几人称"那套约束——思考是模型真实推理，原样展示
        msgs[0].content = IDENTITY + modelIdentity() + reasoningEffort() + '\n回答简洁自然、直接给结论，不要客套收尾。';
        // 联网资料注入 system，让模型的原生思考基于真实网页（尤其逐字原文）
        if (results.length) {
          var tips = '\n\n【本次联网查到的真实网页资料（标题/网址/摘要），回答时优先依据它们】\n' +
            results.slice(0, 10).map(function (s, i) {
              return '[' + (i + 1) + '] ' + s.title + '\n' + s.url + '\n' + (s.date ? '时间：' + shortDate(s.date) + '\n' : '') +
                (s.summary ? '要点：' + s.summary + '\n' : '') + s.snippet;
            }).join('\n\n') +
            '\n【原文逐字铁律】若问题是索要诗文/歌词原文且资料含连续原文诗句，必须原样照抄，一字不改、不续写、不自创。' +
            '\n回答中用 [1][2] 标注来源编号。';
          msgs[0].content += tips;
        }
        // 流式：思考按段边生成边展示，回答逐字实时出现，不再等全部返回才倒出
        var thinkBuf = '', ansBuf = '', answerBegun = false, streamDone = false;
        function flushThink(force) {
          if (myGen !== gen || done) return;
          var cut = -1;
          if (!force) {
            for (var i = 0; i < thinkBuf.length; i++) { if (thinkBuf.charAt(i) === '\n') { cut = i; break; } }
            if (cut < 0 && thinkBuf.length >= 120) cut = thinkBuf.length - 1; // 长段无换行也强制切，保证边想边出
          } else if (thinkBuf.length) cut = thinkBuf.length - 1;
          while (cut >= 0) {
            var seg = thinkBuf.slice(0, cut + 1).trim();
            thinkBuf = thinkBuf.slice(cut + 1);
            var clean = sanitizeThink(seg);
            if (clean.length >= 2) appendStep({ t: 'think', text: clean });
            if (!force) {
              cut = -1;
              for (var k = 0; k < thinkBuf.length; k++) { if (thinkBuf.charAt(k) === '\n') { cut = k; break; } }
              if (cut < 0 && thinkBuf.length >= 120) cut = thinkBuf.length - 1;
            } else cut = thinkBuf.length ? thinkBuf.length - 1 : -1;
          }
        }
        function beginAnswer() {
          if (answerBegun || myGen !== gen || done) return;
          answerBegun = true;
          flushThink(true);
          setThinkLabel(true);
          markAnswering();
        }
        function onThink(delta) {
          if (myGen !== gen || done || answerBegun) return;
          thinkBuf += delta;
          flushThink(false);
        }
        function onAnswer(delta) {
          if (myGen !== gen || done) return;
          beginAnswer();
          ansBuf += delta;
          aMsg.content = ansBuf; // 增量写回：停止生成时已产出的内容能被保留
          var node = part(midVal, '[data-role="content"]');
          if (node) { node.innerHTML = md(sanitizeIdentity(ansBuf)) + '<span class="cursor">▍</span>'; scrollBottom(); }
        }
        function settleStream() {
          if (streamDone || myGen !== gen || done) return;
          streamDone = true;
          flushThink(true);
          if (!answerBegun) { answerBegun = true; setThinkLabel(true); markAnswering(); }
          var ans = sanitizeIdentity(ansBuf.trim());
          if (ans) {
            ans = ans
              .replace(/(如果|如)[你您](有|需要)(其他|别的)?(问题|帮助)[，,]?(请|随时)?(告诉|联系)[我您]?[！!。]?/g, '')
              .replace(/(请|随时)?(告诉|联系)[我您][！!。]?/g, '')
              .replace(/(希望|愿)(这|以上|我的回答)(对|能对你您)?有帮助[！!。]?/g, '')
              .replace(/我是ChatGPT模型[，,]?/g, '我是 ChatGPT，')
              .trim();
          }
          aMsg.content = ans || localReply(text);
          answerTyped = true; // 流式已逐字渲染完，防止 showAnswer 再次打字
          save();
          var node = part(midVal, '[data-role="content"]');
          if (node) { node.innerHTML = md(aMsg.content); scrollBottom(); }
          finish(myGen);
        }
        return callReasonStream(msgs, onThink, onAnswer, settleStream, 90000).catch(function () {
          settleStream();
        });
      });
    }

    // 流程编排：
    // 深度思考开启 → 走原生推理（一次调用拿到模型真实 reasoning_content + content，原样展示）
    // 仅联网 → 边想边查决策循环；都关闭 → 直接回答
    function finalFallback() {
      if (myGen !== gen || done) return;
      if (!aMsg.content) { aMsg.content = localReply(text); aMsg.fallback = true; save(); }
      showAnswer(); finish(myGen);
    }
    if (useThink) {
      // nativeReason 内部自带联网、思考逐条展示、回答与收尾，独占整个流程
      Promise.resolve(nativeReason()).catch(finalFallback);
    } else {
      var prep = useSearch ? runAgent() : Promise.resolve();
      Promise.resolve(prep).catch(function () {}).then(phaseAnswer).catch(finalFallback);
    }
  }
  function regen(idx) {
    if (sending) return;
    var c = activeChat(); if (!c) return;
    var userText = '';
    for (var i = idx - 1; i >= 0; i--) if (c.messages[i].role === 'user') { userText = c.messages[i].content; break; }
    c.messages = c.messages.slice(0, idx + 1); save(); renderMessages(); send(userText, idx);
  }

  /* ============ 主题 ============ */
  function applyTheme() {
    document.documentElement.classList.toggle('dark', state.theme === 'dark');
    document.body.classList.toggle('dark', state.theme === 'dark');
    var l = $('#themeLabel'); if (l) l.textContent = state.theme === 'dark' ? '浅色模式' : '深色模式';
    var b = $('#themeBtn svg'); if (b) b.innerHTML = state.theme === 'dark'
      ? '<circle cx="12" cy="12" r="4.2" fill="currentColor" stroke="none"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
      : '<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M12 3a9 9 0 1 0 9 9c0-.5-.04-1-.12-1.5A7 7 0 0 1 12 3z"/>';
  }
  function toggleTheme() { state.theme = state.theme === 'dark' ? 'light' : 'dark'; applyTheme(); save(); toast(state.theme === 'dark' ? '已切换到深色模式' : '已切换到浅色模式'); }

  /* ============ 输入框 / 附件 ============ */
  var pendingAttachments = [];
  function autoGrow() {
    var t = $('#msgInput'); if (!t) return;
    t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 150) + 'px';
    $('#sendBtn').classList.toggle('ready', !!t.value.trim() || pendingAttachments.length > 0);
  }
  function renderAttachments() {
    var row = $('#attachRow'); if (!row) return;
    if (!pendingAttachments.length) { row.hidden = true; row.innerHTML = ''; return; }
    row.hidden = false;
    row.innerHTML = pendingAttachments.map(function (a, i) { return '<span class="att-chip">' + ICON.export + esc(a.name) + '<button data-rmatt="' + i + '" title="移除">×</button></span>'; }).join('');
    $$('[data-rmatt]', row).forEach(function (b) { b.addEventListener('click', function () { pendingAttachments.splice(+b.getAttribute('data-rmatt'), 1); renderAttachments(); autoGrow(); }); });
  }
  // 读取为 DataURL（用于图片缩略图）
  function readAsDataURL(f) {
    return new Promise(function (res) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result || '')); };
      r.onerror = function () { res(''); };
      r.readAsDataURL(f);
    });
  }
  function handleFiles(files) {
    var list = Array.prototype.slice.call(files).slice(0, 5);
    Promise.all(list.map(function (f) {
      var lower = f.name.toLowerCase();
      var item = { name: f.name, size: f.size, mime: f.type, kind: 'file', text: '', dataUrl: '' };
      // 纯文本类：真正读取全文，送进 API 上下文
      if (/\.(txt|md|markdown|js|jsx|ts|tsx|py|json|csv|html|htm|css|log|xml|yaml|yml|sql|sh|java|c|cpp|go|rs|ini|conf|env)$/i.test(lower) || /^text\//i.test(f.type)) {
        return new Promise(function (res) {
          var r = new FileReader();
          r.onload = function () { item.kind = 'text'; item.text = String(r.result || '').slice(0, 20000); res(item); };
          r.onerror = function () { item.kind = 'text'; item.text = '（读取失败）'; res(item); };
          r.readAsText(f);
        });
      }
      // 图片：当前模型不支持视觉，但保留本地缩略图，让用户看到文件确实已附加
      if (/^image\//i.test(f.type)) {
        item.kind = 'image';
        return readAsDataURL(f).then(function (d) { item.dataUrl = d; return item; });
      }
      // 其它二进制（PDF/Office/压缩包等）：诚实说明无法解析内容
      item.kind = 'binary';
      item.text = '（' + (f.name.split('.').pop() || '文件').toUpperCase() + ' 文件，' + Math.round(f.size / 1024) + ' KB；当前模型无法读取该格式的内容）';
      return Promise.resolve(item);
    })).then(function (items) {
      items.forEach(function (it) { pendingAttachments.push(it); });
      renderAttachments(); autoGrow();
    });
  }

  /* ============ 下拉菜单 ============ */
  function showMenu(el, html, anchor, above) {
    el.innerHTML = html;
    el.classList.add('show'); // 先显示才能正确测量宽高
    var r = anchor.getBoundingClientRect();
    var w = el.offsetWidth, h = el.offsetHeight;
    var isChatHeader = el.id === 'moreDropdown';
    var left = isChatHeader
      ? Math.min(r.right - w, window.innerWidth - w - 8)
      : Math.max(8, Math.min(r.left, window.innerWidth - w - 12));
    var top = above ? r.top - h - 8 : r.bottom + 6;
    if (top < 4) top = r.bottom + 6;              // 上方空间不够则改到下方
    if (top + h > window.innerHeight - 4) top = Math.max(4, r.top - h - 8);
    el.style.left = Math.max(8, left) + 'px';
    el.style.top = top + 'px';
  }
  function showModelMenu() {
    var tiers = [
      [TIER_INSTANT, '即时回答 · 简单问题快速作答'],
      [TIER_THINK, '深度思考 · 复杂问题先推理再答'],
      [TIER_PRO, '最强推理 · 投入最多思考']
    ];
    var d = $('#menuDropdown');
    var head = '<div class="tier-head">思考档位</div>';
    showMenu(d, head + tiers.map(function (m) {
      var cur = state.model === m[0] ? ' tier-cur' : '';
      return '<button class="tier-item' + cur + '" data-model="' + m[0] + '"><b>' + m[0] + '</b><small>' + m[1] + '</small></button>';
    }).join(''), $('#modelBtn'), true);
    $$('[data-model]', d).forEach(function (b) { b.addEventListener('click', function () {
      state.model = b.getAttribute('data-model');
      state.deepThink = state.model !== TIER_INSTANT; // 档位决定是否深度思考
      save(); $('#modelName').textContent = state.model; syncToggles();
      d.classList.remove('show');
      toast(state.model === TIER_INSTANT ? '已切换到即时回答' : '已切换到 ' + state.model + '（深度思考）');
    }); });
  }
  function showToolMenu() {
    var d = $('#toolDropdown');
    var html = '<button data-tool="think">' + ICON.brain + ' 深度思考 <span class="tool-state">' + (state.deepThink ? '已开启' : '关闭') + '</span></button>' +
      '<button data-tool="search">' + ICON.globe + ' 联网搜索 <span class="tool-state">' + (state.webSearch ? '已开启' : '关闭') + '</span></button>' +
      '<button data-tool="attach">' + ICON.export + ' 添加附件</button>';
    showMenu(d, html, $('#toolChip'), true);
    $$('[data-tool]', d).forEach(function (b) { b.addEventListener('click', function () {
      var t = b.getAttribute('data-tool');
      if (t === 'think') toggleDeepThink(); else if (t === 'search') toggleWebSearch(); else { $('#fileInput').click(); }
      d.classList.remove('show');
    }); });
  }
  function showMoreMenu() {
    var d = $('#moreDropdown');
    var html = '<button data-more-act="export">' + ICON.export + ' 导出对话</button>' +
      '<button data-more-act="copy">复制全部内容</button>' +
      '<button data-more-act="pin">置顶/取消置顶</button>' +
      '<button class="danger" data-more-act="delete">' + ICON.trash + ' 删除对话</button>';
    showMenu(d, html, $('#moreBtn'), false);
    $$('[data-more-act]', d).forEach(function (b) { b.addEventListener('click', function () {
      var a = b.getAttribute('data-more-act'), c = activeChat(); d.classList.remove('show'); if (!c) return;
      if (a === 'export') exportChat(c.id);
      else if (a === 'copy') { copyText(c.messages.map(function (m) { return (m.role === 'user' ? '你: ' : 'ChatGPT: ') + (m.content || ''); }).join('\n\n')); toast('已复制全部内容'); }
      else if (a === 'pin') togglePin(c.id);
      else if (a === 'delete') deleteChat(c.id);
    }); });
  }

  /* ============ 探索 GPT 抽屉 ============ */
  var GPTS = [
    { id: 'default', name: 'ChatGPT', desc: '通用助手，什么都能聊', ico: ICON.star },
    { id: 'translator', name: '翻译助手', desc: '中英互译，地道表达', ico: ICON.pen },
    { id: 'coder', name: '编程助手', desc: '写代码、查 Bug、讲思路', ico: ICON.chart },
    { id: 'writer', name: '写作助手', desc: '润色改写，文案创作', ico: ICON.pen },
    { id: 'teacher', name: '学习老师', desc: '通俗易懂，循序渐进', ico: ICON.bulb }
  ];
  function renderGpts() {
    $('#gptGrid').innerHTML = GPTS.map(function (g) { return '<button class="gpt-card' + (state.gpt === g.id ? ' active' : '') + '" data-gpt="' + g.id + '"><span class="gpt-ico">' + g.ico + '</span><b>' + g.name + '</b><span>' + g.desc + '</span></button>'; }).join('');
    $$('[data-gpt]').forEach(function (b) { b.addEventListener('click', function () {
      state.gpt = b.getAttribute('data-gpt'); var c = activeChat(); if (c) c.gpt = state.gpt;
      save(); renderGpts(); closeExplore();
      var g = GPTS.find(function (x) { return x.id === state.gpt; }); toast('已切换助手：' + (g ? g.name : 'ChatGPT'));
    }); });
  }
  function openExplore() { renderGpts(); $('#exploreDrawer').classList.add('show'); $('#exploreMask').classList.add('show'); }
  function closeExplore() { $('#exploreDrawer').classList.remove('show'); $('#exploreMask').classList.remove('show'); }

  /* ============ 语音输入 ============ */
  function toggleMic() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast('当前浏览器不支持语音输入'); return; }
    var btn = $('#micBtn');
    if (btn.classList.contains('recording')) { btn._rec && btn._rec.stop(); return; }
    var rec = new SR(); rec.lang = 'zh-CN'; rec.interimResults = true;
    btn.classList.add('recording'); btn._rec = rec; toast('正在聆听…请说话');
    var finalText = $('#msgInput').value;
    rec.onresult = function (e) {
      var interim = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      $('#msgInput').value = finalText + interim; autoGrow();
    };
    rec.onerror = function () { btn.classList.remove('recording'); toast('语音识别出错，请重试'); };
    rec.onend = function () { btn.classList.remove('recording'); };
    rec.start();
  }

  /* ============ 窗口控制 ============ */
  function toggleMin() { $('#app').classList.toggle('minimized'); $('#miniFloat').classList.toggle('hidden', !$('#app').classList.contains('minimized')); }
  function toggleMax() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(function () { toast('当前环境不支持全屏'); });
    else document.exitFullscreen && document.exitFullscreen();
  }
  function closeWindow() { $('#app').classList.add('hidden-app'); $('#closedScreen').classList.remove('hidden'); }
  function reopenWindow() { $('#app').classList.remove('hidden-app'); $('#closedScreen').classList.add('hidden'); }

  /* ============ 开关 ============ */
  // 停止生成：让当前世代失效，所有正在进行的流式/逐字回调都会静默停下，保留已生成内容
  function stopGeneration() {
    if (!sending) return;
    gen++;               // 世代失效：typeText、流式 onThink/onAnswer、watchdog 全部停
    save();              // 落盘已生成的思考/回答（onAnswer 已增量写回 aMsg.content）
    setSending(false);
    // 清掉未完成的光标动画态
    $$('#messages .a-content.typing, #messages .think-body.typing').forEach(function (el) { el.classList.remove('typing'); el.innerHTML = el.innerHTML.replace(/<span class="cursor">[^<]*<\/span>/g, ''); });
    toast('已停止生成');
  }
  // 深度思考由思考档位决定：开→Thinking，关→Instant，保持档位与开关语义一致
  function setDeepThink(on) {
    state.deepThink = !!on;
    state.model = on ? (state.model === TIER_PRO ? TIER_PRO : TIER_THINK) : TIER_INSTANT;
    save(); $('#modelName').textContent = state.model; syncToggles();
    toast(on ? '已开启深度思考（Thinking 档）' : '已关闭深度思考（Instant 档）');
  }
  function toggleDeepThink(force) { setDeepThink(typeof force === 'boolean' ? force : !state.deepThink); }
  function toggleWebSearch() { state.webSearch = !state.webSearch; save(); syncToggles(); toast(state.webSearch ? '已开启联网搜索' : '已关闭联网搜索'); }
  function syncToggles() {
    var w = $('#webSearchBtn'), m = $('#modelBtn');
    if (w) w.classList.toggle('on', state.webSearch);
    if (m) m.classList.toggle('tier-active', state.deepThink); // 深度思考档位时模型按钮高亮
    if (m) m.classList.toggle('tier-pro', state.model === TIER_PRO);
  }
  function closeSideOnMobile() {
    if (window.innerWidth <= 760) { $('#sidebar').classList.add('collapsed'); $('#sideMask').classList.remove('show'); }
  }
  function openSideOnMobile() { $('#sidebar').classList.remove('collapsed'); if (window.innerWidth <= 760) $('#sideMask').classList.add('show'); }
  // 桌面/移动通用的侧栏开关：根据当前状态真正切换，而不是只会收起
  function toggleSide() {
    var sb = $('#sidebar'), rail = $('#rail'), mask = $('#sideMask');
    if (sb.classList.contains('collapsed')) {
      sb.classList.remove('collapsed');
      rail.classList.remove('show');
      if (window.innerWidth <= 760) mask.classList.add('show');
    } else {
      sb.classList.add('collapsed');
      mask.classList.remove('show');
      if (window.innerWidth > 760) rail.classList.add('show');
    }
  }

  /* ============ 事件绑定 ============ */
  function bind() {
    // 用户滚动监听：上翻暂停自动跟随，回到底部恢复（用 wheel/touch 捕获"用户主动"意图）
    var cs = $('#chatScroll');
    if (cs) {
      cs.addEventListener('wheel', function (e) {
        if (e.deltaY < 0) userScrolledUp = true; else if (isNearBottom(cs)) userScrolledUp = false;
      }, { passive: true });
      cs.addEventListener('touchmove', function () {
        setTimeout(function () { userScrolledUp = !isNearBottom(cs); }, 60);
      }, { passive: true });
      cs.addEventListener('scroll', function () { if (isNearBottom(cs)) userScrolledUp = false; }, { passive: true });
    }
    $('#newChatBtn').addEventListener('click', newChat);
    $('#railNew').addEventListener('click', newChat);
    $('#sideCollapse').addEventListener('click', function () { $('#sidebar').classList.add('collapsed'); $('#rail').classList.add('show'); });
    $('#railExpand').addEventListener('click', function () { $('#sidebar').classList.remove('collapsed'); $('#rail').classList.remove('show'); });
    $('#railAvatar').addEventListener('click', function () { $('#sidebar').classList.remove('collapsed'); $('#rail').classList.remove('show'); });
    $('#mobileMenuBtn').addEventListener('click', function () {
      var sb = $('#sidebar');
      if (sb.classList.contains('collapsed')) openSideOnMobile();
      else { sb.classList.add('collapsed'); $('#sideMask').classList.remove('show'); }
    });
    $('#sideMask').addEventListener('click', function () { closeSideOnMobile(); });
    $('#searchInput').addEventListener('input', function (e) { renderChats(e.target.value); });

    $('#sendBtn').addEventListener('click', function () { send(); });
    $('#stopBtn').addEventListener('click', stopGeneration);
    $('#msgInput').addEventListener('input', autoGrow);
    $('#msgInput').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });

    $('#themeBtn').addEventListener('click', toggleTheme);
    $('#renameTitleBtn').addEventListener('click', function () { var c = activeChat(); if (!c) return; openRename(c.id, c.title); });
    $('#renameCancel').addEventListener('click', function () { $('#renameMask').classList.remove('show'); });
    $('#renameOk').addEventListener('click', function () { var v = $('#renameInput').value.trim(); if (renameTarget && v) renameChat(renameTarget, v); $('#renameMask').classList.remove('show'); });
    $('#renameMask').addEventListener('click', function (e) { if (e.target === this) this.classList.remove('show'); });

    $('#webSearchBtn').addEventListener('click', toggleWebSearch);
    $('#modelBtn').addEventListener('click', function (e) { e.stopPropagation(); $('#menuDropdown').classList.contains('show') ? $('#menuDropdown').classList.remove('show') : showModelMenu(); });
    $('#toolChip').addEventListener('click', function (e) { e.stopPropagation(); $('#toolDropdown').classList.contains('show') ? $('#toolDropdown').classList.remove('show') : showToolMenu(); });
    $('#moreBtn').addEventListener('click', function (e) { e.stopPropagation(); $('#moreDropdown').classList.contains('show') ? $('#moreDropdown').classList.remove('show') : showMoreMenu(); });
    $('#attachBtn').addEventListener('click', function () { $('#fileInput').click(); });
    $('#fileInput').addEventListener('change', function (e) { handleFiles(e.target.files); e.target.value = ''; });
    $('#micBtn').addEventListener('click', toggleMic);

    $('#exploreBtn').addEventListener('click', openExplore);
    $('#exploreClose').addEventListener('click', closeExplore);
    $('#exploreMask').addEventListener('click', closeExplore);
    $('#accountBtn').addEventListener('click', function () { toast('登录功能暂未开放，敬请期待'); });

    $('#canvasToggle').addEventListener('click', function () { $('#canvasPanel').classList.toggle('hidden'); });
    $('#ccCreate').addEventListener('click', function () { var d = $('#canvasDoc'); d.hidden = !d.hidden; if (!d.hidden) $('#canvasText').focus(); });
    $('#ccSource').addEventListener('click', function () { $('#fileInput').click(); });
    $('#canvasSave').addEventListener('click', function () { toast('内容已保存到本地画布'); });
    $('#canvasClose').addEventListener('click', function () { $('#canvasDoc').hidden = true; });

    $('#winMin').addEventListener('click', toggleMin);
    $('#winMax').addEventListener('click', toggleMax);
    $('#winClose').addEventListener('click', closeWindow);
    $('#miniFloat').addEventListener('click', toggleMin);
    $('#reopenBtn').addEventListener('click', reopenWindow);

    $$('.ctx-item').forEach(function (b) { b.addEventListener('click', function () {
      var a = b.getAttribute('data-act'), c = state.chats.find(function (v) { return v.id === ctxTarget; });
      closeCtx(); if (!c) return;
      if (a === 'pin') togglePin(c.id);
      else if (a === 'delete') deleteChat(c.id);
      else if (a === 'export') exportChat(c.id);
      else if (a === 'rename') openRename(c.id, c.title);
    }); });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#ctxMenu')) closeCtx();
      if (!e.target.closest('#menuDropdown') && !e.target.closest('.menubar') && !e.target.closest('#modelBtn')) $('#menuDropdown').classList.remove('show');
      if (!e.target.closest('#toolDropdown') && !e.target.closest('#toolChip')) $('#toolDropdown').classList.remove('show');
      if (!e.target.closest('#moreDropdown') && !e.target.closest('#moreBtn')) $('#moreDropdown').classList.remove('show');
    });
    // Esc 关闭所有浮层
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      ['#ctxMenu', '#menuDropdown', '#toolDropdown', '#moreDropdown'].forEach(function (s) { var el = $(s); if (el) el.classList.remove('show'); });
      var rm = $('#renameMask'); if (rm) rm.classList.remove('show');
      closeExplore(); closeSideOnMobile();
    });

    var menuData = {
      file: [['新建对话', newChat], ['重命名对话', function () { var c = activeChat(); if (c) openRename(c.id, c.title); }], ['sep'], ['导出当前对话', function () { var c = activeChat(); if (c) exportChat(c.id); }], ['删除当前对话', function () { if (state.activeId) deleteChat(state.activeId); }]],
      edit: [['复制上一条回答', function () { var c = activeChat(); if (!c) return; for (var i = c.messages.length - 1; i >= 0; i--) if (c.messages[i].role === 'assistant') { copyText(c.messages[i].content); toast('已复制'); break; } }], ['复制全部内容', function () { var c = activeChat(); if (c) { copyText(c.messages.map(function (m) { return (m.role === 'user' ? '你: ' : 'ChatGPT: ') + (m.content || ''); }).join('\n\n')); toast('已复制全部内容'); } }], ['sep'], ['清空输入框', function () { $('#msgInput').value = ''; pendingAttachments = []; renderAttachments(); autoGrow(); }]],
      view: [['切换主题', toggleTheme], ['显示/隐藏侧栏', toggleSide], ['sep'], ['画布面板', function () { $('#canvasToggle').click(); }], ['探索 GPT', openExplore]],
      help: [['关于 ChatGPT', function () { toast('ChatGPT · 由 OpenAI 开发的 AI 助手'); }], ['快捷键说明', function () { toast('Enter 发送 · Shift+Enter 换行'); }]]
    };
    $$('.menu-item').forEach(function (b) { b.addEventListener('click', function (e) {
      e.stopPropagation(); var key = b.getAttribute('data-menu'), d = $('#menuDropdown');
      d.innerHTML = (menuData[key] || []).map(function (it) { return it[0] === 'sep' ? '<hr>' : '<button>' + it[0] + '</button>'; }).join('');
      showMenu(d, d.innerHTML, b, false);
      $$('button', d).forEach(function (item, i) { var real = (menuData[key] || []).filter(function (x) { return x[0] !== 'sep'; })[i]; item.addEventListener('click', function () { d.classList.remove('show'); real && real[1] && real[1](); }); });
    }); });

    // 窗口尺寸跨越 760 断点时同步侧栏，避免出现「侧栏和窄条同时消失、打不开」的死角
    var wasMobile = window.innerWidth <= 760;
    window.addEventListener('resize', function () {
      autoGrow();
      var isMobile = window.innerWidth <= 760;
      if (isMobile === wasMobile) return;
      wasMobile = isMobile;
      var sb = $('#sidebar'), rail = $('#rail');
      if (isMobile) {
        // 进入窄屏：收起侧栏、隐藏窄条，交给汉堡按钮控制
        sb.classList.add('collapsed');
        rail.classList.remove('show');
        $('#sideMask').classList.remove('show');
      } else {
        // 回到桌面：只要侧栏收着就一定要露出窄条，保证有入口能展开
        if (sb.classList.contains('collapsed')) rail.classList.add('show');
        else rail.classList.remove('show');
        $('#sideMask').classList.remove('show');
      }
    });
  }
  var renameTarget = null;
  function openRename(id, title) { renameTarget = id; $('#renameInput').value = title; $('#modalTitle').textContent = '重命名对话'; $('#renameMask').classList.add('show'); setTimeout(function () { $('#renameInput').focus(); }, 50); }

  /* ============ 启动 ============ */
  function init() {
    load(); applyTheme(); $('#modelName').textContent = state.model; syncToggles(); bind();
    // 填充右键菜单 SVG 图标
    var ip = $('#pinIco'), ir = $('#renameIco'), ie = $('#exportIco'), id = $('#deleteIco');
    if (ip) ip.innerHTML = ICON.pin; if (ir) ir.innerHTML = ICON.edit;
    if (ie) ie.innerHTML = ICON.export; if (id) id.innerHTML = ICON.trash;
    if (!state.chats.length) { var c = makeChat(); state.chats.push(c); state.activeId = c.id; save(); }
    if (!activeChat() && state.chats.length) state.activeId = state.chats[0].id;
    // 兼容旧数据：给缺 mid 的消息补上
    state.chats.forEach(function (c) { c.messages.forEach(function (m) { if (!m.mid) m.mid = mid(); }); });
    save();
    renderMessages(); renderAttachments(); autoGrow();
    // 移动端默认收起侧栏（复刻官网手机布局）
    if (window.innerWidth <= 760) { $('#sidebar').classList.add('collapsed'); $('#rail').classList.remove('show'); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
