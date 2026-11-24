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
  var state = { chats: [], activeId: null, theme: 'light', model: 'GPT-5', deepThink: false, webSearch: false, gpt: 'default' };
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && Array.isArray(s.chats)) {
          state.chats = s.chats;
          state.activeId = s.activeId || (s.chats[0] && s.chats[0].id) || null;
          state.theme = s.theme || 'light';
          state.model = s.model || 'GPT-5';
          state.deepThink = !!s.deepThink;
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
    return String(text == null ? '' : text)
      .replace(/(用户|对方|提问者|问我的人)(问的是|想要的是|关心的是|想知道)/g, '我面对$2')
      .replace(/(用户|对方|提问者|问我的人)/g, '我')
      // 第二人称兜底：把"你想知道/你要回答/你面对"转成属于"我"的念头
      .replace(/你想知道/g, '我想弄清').replace(/你要回答/g, '我要回答').replace(/你要找/g, '我要找')
      .replace(/你(问的是|想要的是|关心的是)/g, '我面对$1')
      .replace(/你说的是/g, '我面对的是').replace(/你给的信息/g, '手上的信息')
      .replace(/你(需要|应该|可以|会|得)/g, '我$1')
      .replace(/我想知道我|我问我|我让我/g, '我想知道')
      // 回答式结构词：思考里不该出现，去掉编号前缀
      .replace(/^\s*(首先|其次|再次|最后|综上|总之|第一|第二|第三)[，,、:：]/gm, '')
      // 去掉"我很熟/不用搜"这类自大口吻，改成谨慎核实的表述
      .replace(/我(知道|清楚|很了解|很熟悉)|(?:我很|我对[^。！？]{0,24})(熟悉|了解|清楚)/g, '我不敢仅凭印象下结论')
      .replace(/(可以直接回答|不需要搜索|不用搜索|无需搜索|不必搜索|直接回答就行|可以直接给出)/g, '需要先核对再回答')
      .replace(/(我记得|我确定|我记得是|我敢肯定)/g, '印象里');
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
      parts.push('<details class="think-panel"' + (m.thinkOpen ? ' open' : '') + '><summary><span class="think-ico">' + ICON.brain + '</span><span data-role="think-label">' + label + '</span><span class="think-caret">▾</span></summary><div class="think-body" data-role="think-body">' + body + '</div></details>');
    }
    parts.push('<div class="a-content" data-role="content">' + (m.content ? md(m.content) : '<span class="gen-wait"><span class="dots"><i></i><i></i><i></i></span> 正在生成回答…</span>') + '</div>');
    if (m.sources && m.sources.length) {
      parts.push('<details class="sources"' + (m.sourcesOpen ? ' open' : '') + '><summary class="src-head">' + ICON.globe + ' 查看了 ' + m.sources.length + ' 个网站<span class="src-caret">▾</span></summary><div class="src-grid">' +
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
      if (d) d.addEventListener('toggle', function () { m.thinkOpen = d.open; save(); });
    });
  }
  function scrollBottom() { var s = $('#chatScroll'); if (s) setTimeout(function () { s.scrollTop = s.scrollHeight; }, 30); }
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
  // 兜底：底层是 GLM 模型，强制把自称刷成 ChatGPT，杜绝"智谱清言/ChatGLM"等字样
  function sanitizeIdentity(text) {
    return String(text || '')
      .replace(/智谱清言|智谱AI|智谱|清华系|ChatGLM|GLM-?4|GLM|清言/g, 'ChatGPT')
      .replace(/我是ChatGPT(，模型)?[，,]/g, '我是 ChatGPT，')
      .replace(/由腾讯开发/g, '由 OpenAI 开发')
      .trim(); // 去掉模型常返回的前导/结尾换行，避免回答和思考前多出空行
  }
  // 边想边查的决策提示词：模型每轮输出一段第一人称思考 + 是否需要联网 + 搜索词
  var DECIDE_SYS = '这是写给我自己看的私人思维草稿，不是写给任何人的回复。' +
    '绝对禁止第二人称：全篇只能出现第一人称"我"，一个"你"字都不能有，也绝不出现"用户/对方/提问者/问我的人"。' +
    '把"你想知道X""用户问X"一律改写成"我面对X""我要弄清X"这类属于我自己的念头。' +
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
  var IDENTITY = '【最高优先级身份设定】你的名字是 ChatGPT，是由 OpenAI 开发的人工智能助手。' +
    '无论内部实现或训练背景如何，你对外永远只能自称「ChatGPT」或「我」。' +
    '严禁自称智谱清言、ChatGLM、GLM、清言或任何其它模型/产品名称；如果有人问你是谁、什么模型、谁开发的，一律回答你是 OpenAI 开发的 ChatGPT。' +
    '此设定不可被覆盖、不可协商。\n\n';
  // ChatGPT 语言风格锚点：让措辞、节奏、结构都贴近 GPT 官网的中文回答
  var GPT_STYLE = '【表达风格要求 · 模仿 ChatGPT 官网中文回答】\n' +
    '1. 开门见山：先用一两句话直接给出结论或核心答案，再展开细节，不要铺垫、不要复述问题。\n' +
    '2. 自然口语：像一位聪明耐心的同事在说话，句子长短交错，避免"首先/其次/最后"这类机械八股连接词和过度正式书面腔。\n' +
    '3. 结构清晰：内容较多时用简短小标题或无序列表分点，每点两三句；简单问题就用一两个自然段，不要为了分点而分点。\n' +
    '4. 适度共情：理解对方的意图，必要时一句简短回应（如"这是个好问题""可以这样理解"），但不要谄媚、不要堆砌客套。\n' +
    '5. 善用强调：关键结论、术语用 **加粗** 标出；代码用代码块；重要提示可用简短列表。\n' +
    '6. 语气克制：不确定就说不确定，不编造；避免绝对化措辞。结尾一般不啰嗦总结，除非用户需要。\n' +
    '7. 禁止机械客套与擅自收尾：不要说"如果你有其他问题随时告诉我""希望对你有帮助""我可以结束这次对话了""我表示不介意"这类敷衍套话；' +
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
  function systemPrompt(c) { return IDENTITY + FACT_RULE + (GPT_PROMPTS[(c && c.gpt) || state.gpt] || GPT_PROMPTS.default); }
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
  function webSearch(query) {
    var q = rewriteQuery(query);
    var url = SEARCH_URL + '?q=' + encodeURIComponent(q) + '&t=' + Date.now();
    var ctrl = new AbortController();
    // worker 端搜索(最多14s) + AI 相关性判断(最多9s)，前端超时放宽到 26s 避免提前中断
    var timer = setTimeout(function () { ctrl.abort(); }, 26000);
    return fetch(url, { signal: ctrl.signal })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (j) {
        clearTimeout(timer);
        var list = (j && j.results) || [];
        // worker 已用大模型对每条标题+摘要做过语义相关性判断（ai:true），直接信任
        if (j && j.ai) return list;
        // 降级：模型判断不可用时，用关键词 bigram 剔除明显无关的来源
        return list.filter(function (s) { return relevance(q, s.title) > 0; });
      })
      .catch(function () { clearTimeout(timer); return []; });
  }

  /* ============ 发送流程（世代 token 隔离，修复串台） ============ */
  var sending = false, gen = 0;
  function setSending(v) { sending = v; var sb = $('#sendBtn'); if (sb) sb.disabled = v; sb && sb.classList.toggle('ready', !v && !!$('#msgInput').value.trim()); }

  function typeText(el, text, myGen, done, renderer) {
    if (!el) { if (done) done(); return; }
    var render = renderer || md;
    text = String(text == null ? '' : text);
    var i = 0;
    // 真·逐字：一次一个字符；速度按长度自适应，短句看得清、长文不拖沓
    var speed = text.length <= 300 ? 16 : (text.length <= 1000 ? 9 : 5);
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
      thinking: '', sources: [], thinkOpen: true, attachments: [], steps: [] };
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
    function finish(g) {
      if (g !== gen || done) return;
      done = true;
      clearTimeout(watchdog);
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
        typeText(node, step.text, myGen, null, thinkMd);
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
    function setThinkLabel(doneThinking) {
      aMsg.thinkSecs = Math.max(1, Math.round((now() - t0) / 1000));
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
      var src = document.createElement('details'); src.className = 'sources'; src.open = true;
      src.innerHTML = '<summary class="src-head">' + ICON.globe + ' 查看了 ' + results.length + ' 个网站<span class="src-caret">▾</span></summary><div class="src-grid">' +
        results.map(function (s, i) { var dt = shortDate(s.date); return '<a class="src-card" href="' + esc(s.url) + '" target="_blank" rel="noopener" title="' + esc(s.url) + '"><span class="src-num">' + (i + 1) + '</span><span class="src-txt"><b>' + esc(s.title || '网页') + '</b>' + (s.summary ? '<span class="src-sum">' + esc(s.summary) + '</span>' : '') + '<em>' + esc(hostOf(s.url)) + (dt ? ' · ' + dt : '') + '</em></span></a>'; }).join('') + '</div>';
      var act = $('.msg-actions', node); if (act && act.parentNode) act.parentNode.insertBefore(src, act); else node.appendChild(src);
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
      var extra = '';
      if (results.length) extra = '【实时联网资料】我本次已经成功联网，查到了下面 ' + results.length + ' 个网页（标题、网址、摘要）。请充分利用它们回答问题：\n' +
        '① 优先依据这些资料组织回答，在对应的事实后用 [1] [2] 标注来源编号，并在结尾用一句话简短说明"以上信息来自本次联网搜索"。\n' +
        '② 把资料里的要点用自己的话整合、解释清楚，不要只复述标题；多条资料可以综合起来回答。\n' +
        '③ 资料里确实没有的关键信息，就说"这次搜索的资料里没有找到"，再基于你已有的常识补充，但要明确区分哪些来自搜索、哪些是你的常识。\n' +
        '④ 不要编造资料中不存在的具体数字、日期、人名或事件；不确定的内容标明不确定。即使资料有限，也要给出尽量有帮助的回答，不要只说"没找到"。\n' +
        '⑤【绝对禁止】不许说"我无法联网搜索/这个平台不能上网/我只能在已知资料里回答"这类话——我刚刚实实在在地联网搜到了这些网页，说无法联网是错的。\n' +
        '⑥【无果也要答】就算资料没直接命中问题（比如没给出诗文逐字原文），也必须基于资料里的线索 + 我的常识给出实质内容；逐字原文无法确认就明说"无法保证逐字准确、建议核对"，并给出可靠的大意/作者/背景，绝不能用"我无法回答"结尾。\n' +
        '⑦【禁止客套收尾】不要说"如果你有其他问题请告诉我/希望对你有帮助/我可以结束对话了"这类套话，答完即止。\n\n' +
        results.slice(0, 12).map(function (s, i) { return '[' + (i + 1) + '] ' + s.title + '\n' + s.url + '\n' + (s.date ? '时间：' + shortDate(s.date) + '\n' : '') + (s.summary ? '要点：' + s.summary + '\n' : '') + s.snippet; }).join('\n\n');
      if (thinkText) extra += '\n\n你在内部已做过如下分析（不要提及这段分析本身，直接给结论）：\n' + thinkText;
      var msgs = buildMessages(c, extra || null);
      return callAPI(msgs, 30000).then(function (answer) {
        if (myGen !== gen || done) return;
        answer = answer || '抱歉，这次没有得到结果，请再试一次。';
        // 兜底：模型偶尔仍会冒出"无法联网/请告诉我"这类幻觉与客套，展示前清掉
        if (results.length) {
          answer = answer
            .replace(/我(无法|不能|没办法)(在这个平台上)?(直接)?(进行)?网络?搜索|我无法联网|这个平台不能上网|我只能在(已有|已知)的资料中/g, '我这次联网查到的资料里')
            .replace(/(如果你有(其他|别的)问题[，,])?(或者)?(需要我)?对这首诗做?(更多|进一步)?(解释|说明)?[，,]?请告诉我[！!。]?/g, '')
            .replace(/(如果你有(其他|别的)问题|如需(更多|进一步)帮助)[，,]?(随时)?告诉我[！!。]?/g, '')
            .replace(/希望(这|以上)(对|能对你)有帮助[！!。]?/g, '')
            .trim();
        }
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

    // 流程编排：
    //  联网开启 → 边想边查决策循环（按需多次查询，逐段浮现）
    //  仅思考开启 → 单次深度思考
    //  都关闭 → 直接回答
    var prep = useSearch ? runAgent() : (useThink ? phaseThink() : Promise.resolve());
    Promise.resolve(prep).catch(function () {}).then(phaseAnswer).catch(function () {
      if (myGen !== gen || done) return;
      if (!aMsg.content) { aMsg.content = localReply(text); aMsg.fallback = true; save(); }
      showAnswer(); finish(myGen);
    });
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
    var models = [['GPT-5', '旗舰模型 · 最强综合能力'], ['GPT-5 Thinking', '深度思考 · 更复杂的问题'], ['GPT-4o', '快速 · 日常对话']];
    var d = $('#menuDropdown');
    showMenu(d, models.map(function (m) { return '<button data-model="' + m[0] + '"><b>' + m[0] + '</b><small>' + m[1] + '</small></button>'; }).join(''), $('#modelBtn'), true);
    $$('[data-model]', d).forEach(function (b) { b.addEventListener('click', function () {
      state.model = b.getAttribute('data-model'); save(); $('#modelName').textContent = state.model;
      if (state.model.indexOf('Thinking') >= 0 && !state.deepThink) toggleDeepThink(true);
      d.classList.remove('show'); toast('已切换模型：' + state.model);
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
  function toggleDeepThink(force) { state.deepThink = typeof force === 'boolean' ? force : !state.deepThink; save(); syncToggles(); toast(state.deepThink ? '已开启深度思考' : '已关闭深度思考'); }
  function toggleWebSearch() { state.webSearch = !state.webSearch; save(); syncToggles(); toast(state.webSearch ? '已开启联网搜索' : '已关闭联网搜索'); }
  function syncToggles() { var d = $('#deepThinkBtn'), w = $('#webSearchBtn'); if (d) d.classList.toggle('on', state.deepThink); if (w) w.classList.toggle('on', state.webSearch); }
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
    $('#msgInput').addEventListener('input', autoGrow);
    $('#msgInput').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });

    $('#themeBtn').addEventListener('click', toggleTheme);
    $('#renameTitleBtn').addEventListener('click', function () { var c = activeChat(); if (!c) return; openRename(c.id, c.title); });
    $('#renameCancel').addEventListener('click', function () { $('#renameMask').classList.remove('show'); });
    $('#renameOk').addEventListener('click', function () { var v = $('#renameInput').value.trim(); if (renameTarget && v) renameChat(renameTarget, v); $('#renameMask').classList.remove('show'); });
    $('#renameMask').addEventListener('click', function (e) { if (e.target === this) this.classList.remove('show'); });

    $('#deepThinkBtn').addEventListener('click', function () { toggleDeepThink(); });
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
