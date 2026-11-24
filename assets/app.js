/* 高仿 ChatGPT 桌面客户端 · 核心逻辑
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
  function md(text) {
    var s = esc(text);
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
    var att = (m.attachments && m.attachments.length)
      ? '<div class="user-att">' + m.attachments.map(function (a) { return '<span>' + ICON.export + esc(a.name) + '</span>'; }).join('') + '</div>' : '';
    return '<div class="msg user" data-mid="' + m.mid + '"><div class="m-body">' + att + esc(m.content) + '</div></div>';
  }
  function assistantBubble(m) {
    var parts = [];
    if (m.searched) parts.push('<div class="search-badge" data-role="badge">' + ICON.globe + ' ' + (m.sources && m.sources.length ? '已联网搜索 · ' + m.sources.length + ' 个网站' : '已联网搜索') + '</div>');
    if (m.deepThink) {
      var secs = m.thinkSecs || 0;
      var label = m.thinking ? ('已深度思考' + (secs ? '（用时 ' + secs + ' 秒）' : '')) : '正在深度思考…';
      var body = m.thinking ? md(m.thinking) : '<span class="think-wait"><span class="dots"><i></i><i></i><i></i></span> 正在梳理思路…</span>';
      parts.push('<details class="think-panel"' + (m.thinkOpen ? ' open' : '') + '><summary><span class="think-ico">' + ICON.brain + '</span><span data-role="think-label">' + label + '</span><span class="think-caret">▾</span></summary><div class="think-body" data-role="think-body">' + body + '</div></details>');
    }
    parts.push('<div class="a-content" data-role="content">' + (m.content ? md(m.content) : '<span class="gen-wait"><span class="dots"><i></i><i></i><i></i></span> 正在生成回答…</span>') + '</div>');
    if (m.sources && m.sources.length) {
      parts.push('<div class="sources"><div class="src-head">查看了 ' + m.sources.length + ' 个网站</div><div class="src-grid">' +
        m.sources.map(function (s, i) { return '<a class="src-card" href="' + esc(s.url) + '" target="_blank" rel="noopener"><span class="src-num">' + (i + 1) + '</span><span class="src-txt"><b>' + esc(s.title || '网页') + '</b><em>' + esc(hostOf(s.url)) + '</em></span></a>'; }).join('') + '</div></div>');
    }
    parts.push('<div class="msg-actions"><button class="ma-btn" data-copy title="复制">' + ICON.export + '</button>' +
      '<button class="ma-btn" data-regen title="重新生成"><svg viewBox="0 0 24 24" width="15" height="15"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<button class="ma-btn" data-good title="赞">' + ICON.good + '</button>' +
      '<button class="ma-btn" data-bad title="踩">' + ICON.bad + '</button></div>');
    return '<div class="msg assistant" data-mid="' + m.mid + '"><div class="m-avatar"><svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/></svg></div><div class="m-body">' + parts.join('') + '</div></div>';
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
    return '<div class="logo-mark"><svg viewBox="0 0 24 24" width="30" height="30"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z"/></svg></div>' +
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
      if (j && j.choices && j.choices[0] && j.choices[0].message) return j.choices[0].message.content || '';
      throw new Error('bad response');
    }).catch(function (e) { clearTimeout(timer); throw e; });
  }
  var GPT_PROMPTS = {
    default: '你是 ChatGPT，由 OpenAI 训练的有用的人工智能助手。请用中文回答，语气自然、简洁、准确，善用分段和要点。',
    translator: '你是专业翻译助手。用户说中文就译成英文，说英文就译成中文，给出地道译文并简要解释关键词。',
    coder: '你是资深编程助手。回答要给出可运行的代码、必要的注释和关键思路，指出常见坑。',
    writer: '你是专业写作助手。擅长润色、改写和文案创作，语言优美自然，给出多个风格版本。',
    teacher: '你是耐心的老师。用简单易懂的语言、生动的比喻解释概念，循序渐进，适合初学者。'
  };
  function systemPrompt(c) { return (GPT_PROMPTS[(c && c.gpt) || state.gpt] || GPT_PROMPTS.default); }
  function buildMessages(c, extraSystem) {
    var msgs = [{ role: 'system', content: systemPrompt(c) + (extraSystem ? '\n\n' + extraSystem : '') }];
    c.messages.slice(-10).forEach(function (m) {
      if (m.role === 'user') {
        var content = m.content;
        if (m.attachments && m.attachments.length) content += '\n\n[用户附加的文件内容：\n' + m.attachments.map(function (a) { return '《' + a.name + '》\n' + (a.text || ''); }).join('\n\n') + '\n]';
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

  /* ============ 联网搜索 ============ */
  function parseBing(xml) {
    var out = [];
    (xml.match(/<item>[\s\S]*?<\/item>/g) || []).slice(0, 6).forEach(function (it) {
      var title = (it.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || it.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
      var link = (it.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '';
      var desc = (it.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || it.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '';
      desc = desc.replace(/<[^>]+>/g, '').trim();
      if (link && title) out.push({ title: title.trim(), url: link.trim(), snippet: desc.slice(0, 200) });
    });
    return out;
  }
  function parseJina(t) {
    var out = [], seen = {}, re = /\[([^\]]{4,120})\]\((https?:\/\/[^)\s]+)\)/g, m;
    while ((m = re.exec(t)) && out.length < 6) {
      var url = m[2]; if (seen[url] || /bing\.com/i.test(url)) continue; seen[url] = 1;
      var after = t.slice(m.index + m[0].length, m.index + m[0].length + 240).replace(/\[[^\]]+\]\([^)]+\)/g, '').replace(/[#*]/g, '').trim();
      out.push({ title: m[1], url: url, snippet: after.slice(0, 180) });
    }
    return out;
  }
  function fetchText(url, ms) {
    var ctrl = new AbortController(), timer = setTimeout(function () { ctrl.abort(); }, ms || 12000);
    return fetch(url, { signal: ctrl.signal }).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.text(); }).finally(function () { clearTimeout(timer); });
  }
  function webSearch(query) {
    var q = encodeURIComponent(query);
    var attempts = [
      function () { return fetchText('https://r.jina.ai/https://www.bing.com/search?q=' + q, 14000).then(parseJina); },
      function () { return fetchText('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://www.bing.com/search?q=' + q + '&format=rss'), 14000).then(parseBing); },
      function () { return fetchText('https://www.bing.com/search?q=' + q + '&format=rss', 12000).then(parseBing); }
    ];
    var i = 0;
    function next() { if (i >= attempts.length) return Promise.resolve([]); return attempts[i++]().then(function (r) { return r && r.length ? r : next(); }).catch(next); }
    return Promise.race([next(), new Promise(function (res) { setTimeout(function () { res([]); }, 9000); })]).catch(function () { return []; });
  }

  /* ============ 发送流程（世代 token 隔离，修复串台） ============ */
  var sending = false, gen = 0;
  function setSending(v) { sending = v; var sb = $('#sendBtn'); if (sb) sb.disabled = v; sb && sb.classList.toggle('ready', !v && !!$('#msgInput').value.trim()); }

  function typeText(el, text, myGen, done) {
    if (!el) { if (done) done(); return; }
    var i = 0, step = Math.max(2, Math.ceil(text.length / 70)), speed = 12;
    el.classList.add('typing');
    function tick() {
      if (myGen !== gen || !el.isConnected) { el.classList.remove('typing'); return; } // 世代失效：静默停止，绝不触发完成
      i += step;
      if (i >= text.length) {
        el.innerHTML = md(text); el.classList.remove('typing'); scrollBottom();
        if (done) done(); return;
      }
      el.innerHTML = md(text.slice(0, i)) + '<span class="cursor">▍</span>';
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
      thinking: '', sources: [], thinkOpen: true, attachments: [] };
    if (regenIndex != null && c.messages[regenIndex]) c.messages[regenIndex] = aMsg;
    else c.messages.push(aMsg);
    save(); renderMessages();

    var useSearch = state.webSearch, useThink = state.deepThink, t0 = now(), results = [], thinkText = '';
    var midVal = aMsg.mid;

    function phaseSearch() {
      if (!useSearch) return Promise.resolve();
      var badge = part(midVal, '[data-role="badge"]');
      if (badge) badge.innerHTML = ICON.globe + ' 正在搜索网页…';
      return webSearch(text).then(function (r) {
        if (myGen !== gen) return;
        results = r || []; aMsg.sources = results; save();
        var b = part(midVal, '[data-role="badge"]');
        if (b) b.innerHTML = ICON.globe + ' 已联网搜索 · ' + results.length + ' 个网站';
        // 来源卡片插入
        var node = msgEl(midVal);
        if (node && results.length) {
          var src = document.createElement('div'); src.className = 'sources';
          src.innerHTML = '<div class="src-head">查看了 ' + results.length + ' 个网站</div><div class="src-grid">' + results.map(function (s, i) { return '<a class="src-card" href="' + esc(s.url) + '" target="_blank" rel="noopener"><span class="src-num">' + (i + 1) + '</span><span class="src-txt"><b>' + esc(s.title || '网页') + '</b><em>' + esc(hostOf(s.url)) + '</em></span></a>'; }).join('') + '</div>';
          var act = $('.msg-actions', node); node.insertBefore(src, act);
        }
      });
    }
    function phaseThink() {
      if (!useThink) return Promise.resolve();
      var msgs = [{ role: 'system', content: '你是深度推理引擎。针对用户问题写出一步一步的分析过程：拆解问题、回忆相关知识、考虑多种角度、排除错误方向、得出推理结论。用中文，120-260 字，只输出推理分析本身，不要写标题，也不要给出最终格式化答案。' }];
      c.messages.slice(-8).forEach(function (m) {
        if (!m.content || m.mid === midVal) return;
        msgs.push({ role: m.role, content: m.content });
      });
      if (!msgs.some(function (m) { return m.role === 'user'; })) msgs.push({ role: 'user', content: text });
      if (results.length) msgs[0].content += '\n\n参考联网资料：\n' + results.map(function (s, i) { return '[' + (i + 1) + '] ' + s.title + ' ' + s.snippet; }).join('\n');
      return callAPI(msgs, 45000).then(function (r) {
        if (myGen !== gen) return;
        thinkText = r || '分析问题要点，梳理已知信息后给出稳妥回答。';
        aMsg.thinking = thinkText; aMsg.thinkSecs = Math.max(1, Math.round((now() - t0) / 1000)); save();
        var label = part(midVal, '[data-role="think-label"]');
        if (label) label.textContent = '已深度思考（用时 ' + aMsg.thinkSecs + ' 秒）';
        typeText(part(midVal, '[data-role="think-body"]'), thinkText, myGen);
      }).catch(function () {
        if (myGen !== gen) return;
        thinkText = '分析问题要点，梳理已知信息，考虑多种可能后给出稳妥的回答。';
        aMsg.thinking = thinkText; aMsg.thinkSecs = 1; save();
        var label = part(midVal, '[data-role="think-label"]'); if (label) label.textContent = '已深度思考（用时 1 秒）';
        var b = part(midVal, '[data-role="think-body"]'); if (b) b.textContent = thinkText;
      });
    }
    function phaseAnswer() {
      if (myGen !== gen) return Promise.resolve();
      var extra = '';
      if (results.length) extra = '以下是刚刚联网搜索到的资料，请优先参考并据此回答，必要时用 [1] [2] 标注来源：\n' + results.map(function (s, i) { return '[' + (i + 1) + '] ' + s.title + '\n' + s.url + '\n' + s.snippet; }).join('\n');
      if (useThink && thinkText) extra += '\n\n你在内部已做过如下分析（不要提及这段分析本身，直接给结论）：\n' + thinkText;
      var msgs = buildMessages(c, extra || null);
      return callAPI(msgs, 60000).then(function (answer) {
        if (myGen !== gen) return; // 用户已切走/重发，丢弃过期结果
        aMsg.content = answer || '抱歉，这次没有得到结果，请再试一次。';
        c.updatedAt = now(); save();
        var node = part(midVal, '[data-role="content"]');
        if (!node) { finish(myGen); return; }
        typeText(node, aMsg.content, myGen, function () { finish(myGen); });
      }).catch(function () {
        if (myGen !== gen) return;
        aMsg.content = localReply(text); aMsg.fallback = true; save();
        var node = part(midVal, '[data-role="content"]');
        if (!node) { finish(myGen); return; }
        typeText(node, aMsg.content, myGen, function () { finish(myGen); });
      });
    }
    function finish(g) {
      if (g !== gen) return;
      setSending(false); renderChats($('#searchInput') ? $('#searchInput').value : '');
    }
    phaseSearch().then(phaseThink).then(phaseAnswer);
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
  function handleFiles(files) {
    Array.prototype.slice.call(files).slice(0, 5).forEach(function (f) {
      var item = { name: f.name, text: '' };
      pendingAttachments.push(item);
      if (f.size < 200000 && /\.(txt|md|js|py|json|csv|html|css|log)$/i.test(f.name)) {
        var reader = new FileReader();
        reader.onload = function () { item.text = String(reader.result).slice(0, 4000); };
        reader.readAsText(f);
      } else item.text = '（二进制文件：' + f.name + '，' + Math.round(f.size / 1024) + ' KB）';
    });
    renderAttachments(); autoGrow();
  }

  /* ============ 下拉菜单 ============ */
  function showMenu(el, html, anchor, above) {
    el.innerHTML = html;
    var r = anchor.getBoundingClientRect();
    el.style.left = Math.max(8, Math.min(r.left, window.innerWidth - el.offsetWidth - 20)) + 'px';
    el.style.top = (above ? r.top - el.offsetHeight - 8 : r.bottom + 6) + 'px';
    el.classList.add('show');
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
  function closeSideOnMobile() { if (window.innerWidth <= 760) $('#sidebar').classList.add('collapsed'); }

  /* ============ 事件绑定 ============ */
  function bind() {
    $('#newChatBtn').addEventListener('click', newChat);
    $('#railNew').addEventListener('click', newChat);
    $('#sideCollapse').addEventListener('click', function () { $('#sidebar').classList.add('collapsed'); $('#rail').classList.add('show'); });
    $('#railExpand').addEventListener('click', function () { $('#sidebar').classList.remove('collapsed'); $('#rail').classList.remove('show'); });
    $('#railAvatar').addEventListener('click', function () { $('#sidebar').classList.remove('collapsed'); $('#rail').classList.remove('show'); });
    $('#mobileMenuBtn').addEventListener('click', function () { $('#sidebar').classList.toggle('collapsed'); });
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

    var menuData = {
      file: [['新建对话', newChat], ['重命名对话', function () { var c = activeChat(); if (c) openRename(c.id, c.title); }], ['sep'], ['导出当前对话', function () { var c = activeChat(); if (c) exportChat(c.id); }], ['删除当前对话', function () { if (state.activeId) deleteChat(state.activeId); }]],
      edit: [['复制上一条回答', function () { var c = activeChat(); if (!c) return; for (var i = c.messages.length - 1; i >= 0; i--) if (c.messages[i].role === 'assistant') { copyText(c.messages[i].content); toast('已复制'); break; } }], ['复制全部内容', function () { var c = activeChat(); if (c) { copyText(c.messages.map(function (m) { return (m.role === 'user' ? '你: ' : 'ChatGPT: ') + (m.content || ''); }).join('\n\n')); toast('已复制全部内容'); } }], ['sep'], ['清空输入框', function () { $('#msgInput').value = ''; pendingAttachments = []; renderAttachments(); autoGrow(); }]],
      view: [['切换主题', toggleTheme], ['显示/隐藏侧栏', function () { $('#sideCollapse').click(); }], ['sep'], ['画布面板', function () { $('#canvasToggle').click(); }], ['探索 GPT', openExplore]],
      help: [['关于本演示', function () { toast('高仿 ChatGPT 客户端 · 本地演示'); }], ['快捷键说明', function () { toast('Enter 发送 · Shift+Enter 换行'); }]]
    };
    $$('.menu-item').forEach(function (b) { b.addEventListener('click', function (e) {
      e.stopPropagation(); var key = b.getAttribute('data-menu'), d = $('#menuDropdown');
      d.innerHTML = (menuData[key] || []).map(function (it) { return it[0] === 'sep' ? '<hr>' : '<button>' + it[0] + '</button>'; }).join('');
      var r = b.getBoundingClientRect(); d.style.left = r.left + 'px'; d.style.top = (r.bottom + 2) + 'px'; d.classList.add('show');
      $$('button', d).forEach(function (item, i) { var real = (menuData[key] || []).filter(function (x) { return x[0] !== 'sep'; })[i]; item.addEventListener('click', function () { d.classList.remove('show'); real && real[1] && real[1](); }); });
    }); });

    window.addEventListener('resize', autoGrow);
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
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
