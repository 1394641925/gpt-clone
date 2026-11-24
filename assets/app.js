/* 高仿 ChatGPT 桌面客户端 · 核心逻辑
 * 功能：会话管理 / 真实 API 对话 / 深度思考 / 联网搜索 / 明暗主题
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
  function now() { return Date.now(); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return '网页'; } }

  /* ============ 状态 ============ */
  var state = {
    chats: [], activeId: null, theme: 'light',
    model: 'GPT-5', deepThink: false, webSearch: false
  };
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
        }
      }
    } catch (e) {}
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function activeChat() {
    return state.chats.find(function (c) { return c.id === state.activeId; }) || null;
  }
  function makeChat(title) {
    return { id: uid(), title: title || '新建对话', pinned: false, createdAt: now(), updatedAt: now(), messages: [] };
  }

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
    // 代码块
    s = s.replace(/```([\w-]*)\n?([\s\S]*?)```/g, function (m, lang, code) {
      return '<pre><code>' + code.replace(/^\n|\n$/g, '') + '</code></pre>';
    });
    // 行内代码
    s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    // 加粗
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    // 标题
    s = s.replace(/^###\s+(.+)$/gm, '<h4>$1</h4>').replace(/^##\s+(.+)$/gm, '<h3>$1</h3>');
    // 列表
    s = s.replace(/^[\-\*]\s+(.+)$/gm, '• $1');
    return s;
  }

  /* ============ 侧栏会话列表 ============ */
  function groupLabel(t) { return '<div class="group-label">' + t + '</div>'; }
  function renderChats(filter) {
    var box = $('#chatList'); if (!box) return;
    var q = (filter || '').trim().toLowerCase();
    var list = state.chats.slice();
    if (q) list = list.filter(function (c) { return (c.title || '').toLowerCase().indexOf(q) >= 0; });

    var pinned = list.filter(function (c) { return c.pinned; }).sort(function (a, b) { return b.updatedAt - a.updatedAt; });
    var others = list.filter(function (c) { return !c.pinned; }).sort(function (a, b) { return b.updatedAt - a.updatedAt; });

    var html = '';
    function row(c) {
      var active = c.id === state.activeId ? ' active' : '';
      return '<div class="conv' + active + '" data-id="' + c.id + '">' +
        (c.pinned ? '<span class="pin">📌</span>' : '') +
        '<span class="conv-title">' + esc(c.title) + '</span>' +
        '<button class="conv-more" title="更多" data-more="' + c.id + '">' +
        '<svg viewBox="0 0 24 24" width="16" height="16"><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/></svg>' +
        '</button></div>';
    }
    if (!list.length) {
      html = '<div class="no-result">' + (q ? '没有匹配的对话' : '暂无对话') + '</div>';
    } else {
      if (pinned.length) html += groupLabel('已置顶') + pinned.map(row).join('');
      if (others.length) html += groupLabel(q ? '搜索结果' : '今天') + others.map(row).join('');
    }
    box.innerHTML = html;

    $$('.conv', box).forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (e.target.closest('[data-more]')) return;
        openChat(el.getAttribute('data-id'));
      });
      var pressTimer;
      function showMenu(e) {
        e.preventDefault();
        var r = el.getBoundingClientRect();
        openCtx(el.getAttribute('data-id'), e.clientX || r.left, e.clientY || r.bottom);
      }
      el.addEventListener('contextmenu', showMenu);
      el.addEventListener('touchstart', function (e) {
        pressTimer = setTimeout(function () { showMenu(e); }, 550);
      }, { passive: true });
      ['touchend', 'touchmove', 'touchcancel'].forEach(function (ev) {
        el.addEventListener(ev, function () { clearTimeout(pressTimer); });
      });
    });
    $$('[data-more]', box).forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var r = b.getBoundingClientRect();
        openCtx(b.getAttribute('data-more'), r.left, r.bottom + 4);
      });
    });
  }

  /* ============ 右键菜单 ============ */
  var ctxTarget = null;
  function openCtx(id, x, y) {
    ctxTarget = id;
    var m = $('#ctxMenu');
    var c = state.chats.find(function (v) { return v.id === id; });
    var pinTxt = $('.ctx-txt', $('.ctx-item[data-act="pin"]', m));
    if (pinTxt && c) pinTxt.textContent = c.pinned ? '取消置顶' : '置顶对话';
    m.style.left = Math.min(x, window.innerWidth - 175) + 'px';
    m.style.top = Math.min(y, window.innerHeight - 160) + 'px';
    m.classList.add('show');
  }
  function closeCtx() { $('#ctxMenu').classList.remove('show'); }

  /* ============ 消息渲染 ============ */
  function bubbleHTML(m) {
    if (m.role === 'user') {
      return '<div class="msg user"><div class="m-body">' + esc(m.content) + '</div></div>';
    }
    var parts = [];
    // 联网搜索标记
    if (m.searched) {
      parts.push('<div class="search-badge">🌐 已联网搜索' + (m.sources && m.sources.length ? ' · ' + m.sources.length + ' 个网站' : '') + '</div>');
    }
    // 深度思考面板（开启即渲染，思考内容稍后流式填入）
    if (m.deepThink) {
      var secs = m.thinkSecs || 0;
      var thinkLabel = m.thinking ? ('已深度思考' + (secs ? '（用时 ' + secs + ' 秒）' : '')) : '正在深度思考…';
      parts.push('<details class="think-panel"' + (m.thinkOpen ? ' open' : '') + '>' +
        '<summary><span class="think-ico">✦</span> <span class="think-label">' + thinkLabel + '</span><span class="think-caret">▾</span></summary>' +
        '<div class="think-body">' + (m.thinking ? md(m.thinking) : '<span class="thinking-inline"><span class="dots"><i></i><i></i><i></i></span> 正在梳理思路…</span>') + '</div></details>');
    }
    parts.push('<div class="a-content">' + md(m.content) + '</div>');
    // 来源卡片
    if (m.sources && m.sources.length) {
      parts.push('<div class="sources"><div class="src-head">查看了 ' + m.sources.length + ' 个网站</div><div class="src-grid">' +
        m.sources.map(function (s, i) {
          return '<a class="src-card" href="' + esc(s.url) + '" target="_blank" rel="noopener">' +
            '<span class="src-num">' + (i + 1) + '</span>' +
            '<span class="src-txt"><b>' + esc(s.title || '网页') + '</b><em>' + esc(hostOf(s.url)) + '</em></span></a>';
        }).join('') + '</div></div>');
    }
    parts.push('<div class="msg-actions">' +
      '<button class="ma-btn" data-copy title="复制"><svg viewBox="0 0 24 24" width="15" height="15"><rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></button>' +
      '<button class="ma-btn" data-regen title="重新生成"><svg viewBox="0 0 24 24" width="15" height="15"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<button class="ma-btn" data-good title="赞">👍</button>' +
      '<button class="ma-btn" data-bad title="踩">👎</button>' +
      '</div>');
    return '<div class="msg assistant"><div class="m-avatar"><svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/></svg></div>' +
      '<div class="m-body">' + parts.join('') + '</div></div>';
  }
  function renderMessages() {
    var box = $('#messages'); if (!box) return;
    var c = activeChat();
    var empty = $('#emptyState');
    if (!c || !c.messages.length) {
      box.innerHTML = '<div class="empty-state" id="emptyState">' + emptyHTML() + '</div>';
      bindSuggestions();
    } else {
      box.innerHTML = c.messages.map(bubbleHTML).join('');
      bindMsgActions();
    }
    var title = c ? c.title : '新建对话';
    $('#chatTitle').textContent = title;
    document.title = title === '新建对话' ? 'ChatGPT' : title + ' - ChatGPT';
    renderChats($('#searchInput') ? $('#searchInput').value : '');
    scrollBottom(true);
  }
  function emptyHTML() {
    return '<div class="logo-mark"><svg viewBox="0 0 24 24" width="30" height="30"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z"/></svg></div>' +
      '<h2>有什么可以帮忙的？</h2><p class="empty-sub">开始一段新的对话吧</p>' +
      '<div class="suggestions">' +
      [['💡', '给我一些创意灵感', '帮我想 5 个有意思的创意点子'],
       ['✍️', '帮我润色一段文字', '把这段话润色得更流畅自然'],
       ['📊', '分析一个数据问题', '帮我分析数据并给出建议'],
       ['🌍', '解释一个复杂概念', '用简单的语言解释量子计算']]
        .map(function (s) { return '<button class="sug-card" data-q="' + esc(s[2]) + '"><span>' + s[0] + '</span>' + s[1] + '</button>'; }).join('') +
      '</div>';
  }
  function bindSuggestions() {
    $$('.sug-card').forEach(function (b) {
      b.addEventListener('click', function () {
        $('#msgInput').value = b.getAttribute('data-q');
        $('#msgInput').focus();
        autoGrow();
      });
    });
  }
  function bindMsgActions() {
    $$('.msg.assistant').forEach(function (node, i) {
      var c = activeChat(); if (!c) return;
      // 找到该消息在数组中的索引
      var idx = -1;
      var aNodes = $$('.msg.assistant');
      var aCount = 0;
      c.messages.forEach(function (m, mi) { if (m.role === 'assistant') { if (aCount === i) idx = mi; aCount++; } });
      if (idx < 0) return;
      var cp = $('[data-copy]', node), rg = $('[data-regen]', node);
      if (cp) cp.addEventListener('click', function () {
        copyText(c.messages[idx].content); toast('已复制');
      });
      if (rg) rg.addEventListener('click', function () { regen(idx); });
      var gd = $('[data-good]', node), bd = $('[data-bad]', node);
      if (gd) gd.addEventListener('click', function () { gd.classList.toggle('on'); toast('感谢反馈'); });
      if (bd) bd.addEventListener('click', function () { bd.classList.toggle('on'); toast('感谢反馈'); });
    });
    $$('.think-panel').forEach(function (d) {
      d.addEventListener('toggle', function () {
        var c = activeChat(); if (!c) return;
        var body = $('.a-content', d.parentNode);
        // 记录展开状态：通过索引匹配
        var node = d.closest('.msg.assistant');
        var aNodes = $$('.msg.assistant');
        var ai = aNodes.indexOf(node);
        var cnt = 0, mi2 = -1;
        c.messages.forEach(function (m, mi) { if (m.role === 'assistant') { if (cnt === ai) mi2 = mi; cnt++; } });
        if (mi2 >= 0) { c.messages[mi2].thinkOpen = d.open; save(); }
      });
    });
  }
  function scrollBottom(instant) {
    var s = $('#chatScroll'); if (!s) return;
    setTimeout(function () { s.scrollTop = instant ? s.scrollHeight : s.scrollHeight; }, 30);
  }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).catch(function () {});
    else {
      var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta);
      ta.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta);
    }
  }

  /* ============ 会话操作 ============ */
  function newChat() {
    var c = makeChat();
    state.chats.unshift(c); state.activeId = c.id; save();
    renderMessages(); closeSideOnMobile();
    $('#msgInput').focus();
  }
  function openChat(id) {
    state.activeId = id; save(); renderMessages(); closeSideOnMobile();
  }
  function deleteChat(id) {
    state.chats = state.chats.filter(function (c) { return c.id !== id; });
    if (state.activeId === id) state.activeId = state.chats.length ? state.chats[0].id : null;
    save(); renderMessages(); toast('已删除对话');
  }
  function togglePin(id) {
    var c = state.chats.find(function (v) { return v.id === id; });
    if (c) { c.pinned = !c.pinned; save(); renderChats($('#searchInput').value); toast(c.pinned ? '已置顶' : '已取消置顶'); }
  }
  function summarize(text, c) {
    var t = String(text).replace(/\s+/g, ' ').trim();
    if (t.length > 18) t = t.slice(0, 18) + '…';
    return t || '新建对话';
  }
  function renameChat(id, title) {
    var c = state.chats.find(function (v) { return v.id === id; });
    if (c && title) { c.title = title; save(); renderMessages(); }
  }

  /* ============ 真实 API ============ */
  function callAPI(messages, timeoutMs) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, timeoutMs || 45000);
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Access-Pass': API_PASS },
      body: JSON.stringify({ model: API_MODEL, messages: messages, stream: false }),
      signal: ctrl.signal
    }).then(function (r) { return r.json(); }).then(function (j) {
      clearTimeout(timer);
      if (j && j.choices && j.choices[0] && j.choices[0].message) return j.choices[0].message.content || '';
      throw new Error('bad response');
    }).catch(function (e) {
      clearTimeout(timer);
      throw e;
    });
  }
  var SYSTEM_BASE = '你是 ChatGPT，由 OpenAI 训练的有用的人工智能助手。请用中文回答，语气自然、简洁、准确。回答要有条理，善用分段和要点。';

  function buildMessages(c, extraSystem) {
    var msgs = [{ role: 'system', content: SYSTEM_BASE + (extraSystem ? '\n\n' + extraSystem : '') }];
    var hist = c.messages.slice(-10);
    hist.forEach(function (m) {
      if (m.role === 'user') msgs.push({ role: 'user', content: m.content });
      else if (m.role === 'assistant') msgs.push({ role: 'assistant', content: m.content });
    });
    return msgs;
  }

  // 本地关键词回退
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
    var items = (xml.match(/<item>[\s\S]*?<\/item>/g) || []).slice(0, 6);
    items.forEach(function (it) {
      var title = (it.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || it.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
      var link = (it.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '';
      var desc = (it.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || it.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '';
      desc = desc.replace(/<[^>]+>/g, '').trim();
      if (link && title) out.push({ title: title.trim(), url: link.trim(), snippet: desc.slice(0, 200) });
    });
    return out;
  }
  function parseJina(mdText) {
    var out = [], seen = {};
    var re = /\[([^\]]{4,120})\]\((https?:\/\/[^)\s]+)\)/g, m;
    while ((m = re.exec(mdText)) && out.length < 6) {
      var url = m[2], title = m[1];
      if (seen[url] || /bing\.com|microsoft\.com\/en-us\/bing/i.test(url)) continue;
      seen[url] = 1;
      var after = mdText.slice(m.index + m[0].length, m.index + m[0].length + 240).replace(/\[[^\]]+\]\([^)]+\)/g, '').replace(/[#*]/g, '').trim();
      out.push({ title: title, url: url, snippet: after.slice(0, 180) });
    }
    return out;
  }
  function fetchText(url, timeoutMs) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, timeoutMs || 12000);
    return fetch(url, { signal: ctrl.signal }).then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.text();
    }).finally(function () { clearTimeout(timer); });
  }
  function webSearch(query) {
    var q = encodeURIComponent(query);
    var attempts = [
      // 通过 r.jina.ai 读取 Bing（浏览器端 CORS 友好）
      function () { return fetchText('https://r.jina.ai/https://www.bing.com/search?q=' + q, 14000).then(parseJina); },
      // allorigins 代理 Bing RSS
      function () { return fetchText('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://www.bing.com/search?q=' + q + '&format=rss'), 14000).then(parseBing); },
      // 直接 Bing RSS
      function () { return fetchText('https://www.bing.com/search?q=' + q + '&format=rss', 12000).then(parseBing); }
    ];
    var i = 0;
    function next() {
      if (i >= attempts.length) return Promise.resolve([]);
      return attempts[i++]().then(function (r) { return r && r.length ? r : next(); }).catch(next);
    }
    // 总超时：网络差时最多等 9 秒就放弃搜索，避免阻塞后续回答
    return Promise.race([
      next(),
      new Promise(function (res) { setTimeout(function () { res([]); }, 9000); })
    ]).catch(function () { return []; });
  }

  /* ============ 发送流程 ============ */
  var sending = false;
  function setSending(v) {
    sending = v;
    var sb = $('#sendBtn'); if (sb) sb.disabled = v;
  }
  function typeInto(node, text, done) {
    var i = 0;
    node.innerHTML = '';
    var speed = Math.max(6, Math.min(22, Math.floor(text.length / 60)));
    function step() {
      if (!node.isConnected) { if (done) done(); return; }
      i += Math.max(2, Math.ceil(text.length / 90));
      if (i >= text.length) { node.innerHTML = md(text); scrollBottom(); if (done) done(); return; }
      node.innerHTML = md(text.slice(0, i)) + '<span class="cursor">▍</span>';
      scrollBottom();
      setTimeout(step, speed);
    }
    step();
  }

  function send(textOverride, regenIndex) {
    if (sending) return;
    var c = activeChat();
    if (!c) { c = makeChat(); state.chats.unshift(c); state.activeId = c.id; }
    var input = $('#msgInput');
    var text = textOverride != null ? textOverride : (input ? input.value.trim() : '');
    if (!text && regenIndex == null) return;
    if (regenIndex == null) {
      if (input) input.value = '';
      autoGrow();
      c.messages.push({ role: 'user', content: text });
      if (c.title === '新建对话') c.title = summarize(text, c);
      c.updatedAt = now(); save();
    }
    renderMessages();
    setSending(true);

    // 准备 assistant 消息占位
    var aMsg = { role: 'assistant', content: '', deepThink: state.deepThink, webSearch: state.webSearch,
      thinking: '', sources: [], searched: state.webSearch, thinkOpen: true };
    if (regenIndex != null && regenIndex >= 0 && regenIndex < c.messages.length) {
      // 重新生成：复用该消息位置
      c.messages[regenIndex] = aMsg;
    } else {
      c.messages.push(aMsg);
    }
    save(); renderMessages();

    var useSearch = state.webSearch;
    var useThink = state.deepThink;
    var thinkStart = now();
    var searchResults = [];
    var thinkText = '';

    // 阶段 0：联网搜索
    function phaseSearch() {
      if (!useSearch) return Promise.resolve();
      var badge = $('.search-badge', $('#messages'));
      if (badge) badge.textContent = '🌐 正在搜索网页…';
      return webSearch(text).then(function (r) {
        searchResults = r || [];
        aMsg.sources = searchResults;
        var badge2 = $('.search-badge', $('#messages'));
        if (badge2) badge2.textContent = '🌐 已联网搜索 · ' + searchResults.length + ' 个网站';
        save();
      });
    }
    // 阶段 1：深度思考
    function phaseThink() {
      if (!useThink) return Promise.resolve();
      var panel = $('.think-body', $('#messages'));
      if (panel) panel.innerHTML = '<span class="thinking-inline"><span class="dots"><i></i><i></i><i></i></span> 正在思考…</span>';
      var thinkMsgs = buildMessages(c).filter(function (m) { return !(m.role === 'assistant' && m.content === ''); });
      // 移除末尾刚插入的用户消息避免重复（buildMessages 已含），构造专用 prompt
      var sysThink = '你是深度推理引擎。针对用户的问题，写出一步一步的分析过程：拆解问题、回忆相关知识、考虑多种角度、排除错误方向、得出推理结论。用中文，120-260 字，只输出推理分析本身，不要写“思考过程”之类的标题，也不要给出最终格式化答案。';
      var tmsgs = [{ role: 'system', content: sysThink }];
      var hist = c.messages.slice(-8).filter(function (m) { return m.content && !(m.role === 'assistant' && m === aMsg); });
      hist.forEach(function (m) { tmsgs.push({ role: m.role, content: m.content }); });
      if (searchResults.length) {
        tmsgs[0].content += '\n\n参考以下联网资料：\n' + searchResults.map(function (s, i) { return '[' + (i + 1) + '] ' + s.title + ' ' + s.snippet; }).join('\n');
      }
      return callAPI(tmsgs, 45000).then(function (r) {
        thinkText = r || '（本次未能生成思考过程）';
        aMsg.thinking = thinkText;
        aMsg.thinkSecs = Math.max(1, Math.round((now() - thinkStart) / 1000));
        save();
        var label = $('.think-label', $('#messages'));
        if (label) label.textContent = '已深度思考（用时 ' + aMsg.thinkSecs + ' 秒）';
        var panel2 = $('.think-body', $('#messages'));
        if (panel2) typeInto(panel2, thinkText);
      }).catch(function () {
        thinkText = '分析问题要点，梳理已知信息，考虑多种可能后给出稳妥的回答。';
        aMsg.thinking = thinkText; aMsg.thinkSecs = 1; save();
        var label2 = $('.think-label', $('#messages'));
        if (label2) label2.textContent = '已深度思考（用时 1 秒）';
        var panel2 = $('.think-body', $('#messages'));
        if (panel2) panel2.textContent = thinkText;
      });
    }
    // 阶段 2：最终回答
    function phaseAnswer() {
      var contentNode = $('.a-content', $('#messages'));
      if (contentNode) contentNode.innerHTML = '<span class="thinking-inline"><span class="dots"><i></i><i></i><i></i></span> 正在生成回答…</span>';
      var extra = '';
      if (searchResults.length) {
        extra = '以下是刚刚联网搜索到的资料，请优先参考并据此回答，必要时在句末用 [1] [2] 标注来源：\n' +
          searchResults.map(function (s, i) { return '[' + (i + 1) + '] ' + s.title + '\n' + s.url + '\n' + s.snippet; }).join('\n');
      }
      if (useThink && thinkText) {
        extra += '\n\n你在内部已做过如下分析（不要提及这段分析本身，直接给出结论）：\n' + thinkText;
      }
      var msgs = buildMessages(c, extra || null);
      return callAPI(msgs, 60000).then(function (answer) {
        aMsg.content = answer || '抱歉，这次没有得到结果，请再试一次。';
        save();
        if (contentNode) typeInto(contentNode, aMsg.content, function () { finish(); });
        else finish();
      }).catch(function () {
        aMsg.content = localReply(text);
        aMsg.fallback = true; save();
        if (contentNode) typeInto(contentNode, aMsg.content, function () { finish(); });
        else finish();
      });
    }
    function finish() {
      c.updatedAt = now(); save();
      setSending(false); renderChats($('#searchInput') ? $('#searchInput').value : '');
    }

    phaseSearch().then(phaseThink).then(phaseAnswer);
  }
  function regen(idx) {
    if (sending) return;
    var c = activeChat(); if (!c) return;
    // 删除该 assistant 消息之后的所有内容，回退到上一条 user 的问题
    var userText = '';
    for (var i = idx - 1; i >= 0; i--) { if (c.messages[i].role === 'user') { userText = c.messages[i].content; break; } }
    c.messages = c.messages.slice(0, idx + 1);
    save(); renderMessages();
    send(userText, idx);
  }

  /* ============ 主题 ============ */
  function applyTheme() {
    document.documentElement.classList.toggle('dark', state.theme === 'dark');
    document.body.classList.toggle('dark', state.theme === 'dark');
    var l = $('#themeLabel'); if (l) l.textContent = state.theme === 'dark' ? '浅色模式' : '深色模式';
  }
  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(); save(); toast(state.theme === 'dark' ? '已切换到深色模式' : '已切换到浅色模式');
  }

  /* ============ 输入框 ============ */
  function autoGrow() {
    var t = $('#msgInput'); if (!t) return;
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight, 150) + 'px';
    var sb = $('#sendBtn'); if (sb) sb.classList.toggle('ready', !!t.value.trim());
  }

  /* ============ 模型选择 ============ */
  function showModelMenu() {
    var models = [
      { id: 'GPT-5', name: 'GPT-5', desc: '旗舰模型 · 最强综合能力' },
      { id: 'GPT-5 Thinking', name: 'GPT-5 Thinking', desc: '深度思考 · 更复杂的问题' },
      { id: 'GPT-4o', name: 'GPT-4o', desc: '快速 · 日常对话' }
    ];
    var d = $('#menuDropdown');
    d.innerHTML = models.map(function (m) {
      return '<button data-model="' + m.id + '"><b>' + m.name + '</b><small>' + m.desc + '</small></button>';
    }).join('');
    var r = $('#modelBtn').getBoundingClientRect();
    d.style.left = Math.max(8, r.left - 40) + 'px';
    d.style.top = (r.top - models.length * 52 - 12) + 'px';
    d.classList.add('show');
    $$('[data-model]', d).forEach(function (b) {
      b.addEventListener('click', function () {
        state.model = b.getAttribute('data-model'); save();
        $('#modelName').textContent = state.model;
        if (state.model.indexOf('Thinking') >= 0 && !state.deepThink) toggleDeepThink(true);
        d.classList.remove('show'); toast('已切换模型：' + state.model);
      });
    });
  }

  /* ============ 侧栏移动端 ============ */
  function closeSideOnMobile() {
    if (window.innerWidth <= 760) $('#sidebar').classList.add('collapsed');
  }

  /* ============ 事件绑定 ============ */
  function bind() {
    $('#newChatBtn').addEventListener('click', newChat);
    $('#railNew').addEventListener('click', newChat);
    $('#sideCollapse').addEventListener('click', function () {
      $('#sidebar').classList.add('collapsed'); $('#rail').classList.add('show');
    });
    $('#railExpand').addEventListener('click', function () {
      $('#sidebar').classList.remove('collapsed'); $('#rail').classList.remove('show');
    });
    $('.rail-avatar').addEventListener('click', function () {
      $('#sidebar').classList.remove('collapsed'); $('#rail').classList.remove('show');
    });
    $('#mobileMenuBtn').addEventListener('click', function () {
      $('#sidebar').classList.toggle('collapsed');
    });
    $('#searchInput').addEventListener('input', function (e) { renderChats(e.target.value); });

    $('#sendBtn').addEventListener('click', function () { send(); });
    $('#msgInput').addEventListener('input', autoGrow);
    $('#msgInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
    });

    $('#themeBtn').addEventListener('click', toggleTheme);
    $('#renameTitleBtn').addEventListener('click', function () {
      var c = activeChat(); if (!c) return;
      $('#renameInput').value = c.title; $('#renameMask').classList.add('show');
      setTimeout(function () { $('#renameInput').focus(); }, 50);
    });
    $('#renameCancel').addEventListener('click', function () { $('#renameMask').classList.remove('show'); });
    $('#renameOk').addEventListener('click', function () {
      var v = $('#renameInput').value.trim();
      var c = activeChat(); if (c && v) renameChat(c.id, v);
      $('#renameMask').classList.remove('show');
    });
    $('#renameMask').addEventListener('click', function (e) { if (e.target === this) this.classList.remove('show'); });

    // 深度思考开关
    var dtBtn = $('#deepThinkBtn');
    if (dtBtn) dtBtn.addEventListener('click', function () { toggleDeepThink(); });
    // 联网搜索开关
    var wsBtn = $('#webSearchBtn');
    if (wsBtn) wsBtn.addEventListener('click', function () {
      state.webSearch = !state.webSearch; save(); syncToggles();
      toast(state.webSearch ? '已开启联网搜索' : '已关闭联网搜索');
    });

    $('#modelBtn').addEventListener('click', function (e) { e.stopPropagation(); showModelMenu(); });
    $('#toolChip').addEventListener('click', function () { toast('更多工具即将推出'); });
    $('#attachBtn').addEventListener('click', function () { toast('附件上传暂未开放'); });
    $('#micBtn').addEventListener('click', function () {
      toast(navigator.mediaDevices && navigator.mediaDevices.getUserMedia ? '语音输入需要麦克风权限' : '当前环境不支持语音输入');
    });
    $('#exploreBtn').addEventListener('click', function () { toast('探索 GPT 即将推出'); });
    $('#canvasToggle').addEventListener('click', function () { $('#canvasPanel').classList.toggle('hidden'); });
    $('#moreBtn').addEventListener('click', function () {
      var c = activeChat(); if (c) { toast('对话选项：可在左侧列表长按管理'); }
    });

    // 右键菜单操作
    $$('.ctx-item').forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.getAttribute('data-act');
        if (act === 'pin') togglePin(ctxTarget);
        else if (act === 'delete') { deleteChat(ctxTarget); }
        else if (act === 'rename') {
          var c = state.chats.find(function (v) { return v.id === ctxTarget; });
          if (c) { $('#renameInput').value = c.title; $('#renameMask').classList.add('show'); renameTarget = c.id; }
        }
        closeCtx();
      });
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#ctxMenu')) closeCtx();
      if (!e.target.closest('#menuDropdown') && !e.target.closest('.menubar') && !e.target.closest('#modelBtn')) $('#menuDropdown').classList.remove('show');
    });
    $('#accountBtn').addEventListener('click', function () { toast('账户设置'); });

    // 顶部菜单
    var menuData = {
      file: ['新建对话', '重命名对话', '---', '删除当前对话'],
      edit: ['撤销', '重做', '---', '复制上一条回答'],
      view: ['切换主题', '显示/隐藏侧栏', '---', '画布面板'],
      help: ['关于本演示', '快捷键说明']
    };
    $$('.menu-item').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var key = b.getAttribute('data-menu');
        var d = $('#menuDropdown');
        d.innerHTML = (menuData[key] || []).map(function (t) { return t === '---' ? '<hr>' : '<button>' + t + '</button>'; }).join('');
        var r = b.getBoundingClientRect();
        d.style.left = r.left + 'px'; d.style.top = (r.bottom + 2) + 'px';
        d.classList.add('show');
        $$('button', d).forEach(function (item) {
          item.addEventListener('click', function () { handleMenu(key, item.textContent); d.classList.remove('show'); });
        });
      });
    });

    // 窗口按钮（演示）
    $('#winClose').addEventListener('click', function () { toast('演示页面：关闭按钮'); });
    $('#winMin').addEventListener('click', function () { toast('演示页面：最小化按钮'); });
    $('#winMax').addEventListener('click', function () { toast('演示页面：最大化按钮'); });

    window.addEventListener('resize', autoGrow);
  }
  var renameTarget = null;
  function handleMenu(key, label) {
    if (label === '新建对话') newChat();
    else if (label === '删除当前对话' && state.activeId) deleteChat(state.activeId);
    else if (label === '重命名对话') $('#renameTitleBtn').click();
    else if (label === '切换主题') toggleTheme();
    else if (label === '显示/隐藏侧栏') $('#sideCollapse').click();
    else if (label === '画布面板') $('#canvasToggle').click();
    else if (label === '关于本演示') toast('高仿 ChatGPT 客户端 · 本地演示');
    else if (label === '快捷键说明') toast('Enter 发送 · Shift+Enter 换行');
    else if (label === '复制上一条回答') {
      var c = activeChat(); if (!c) return;
      for (var i = c.messages.length - 1; i >= 0; i--) if (c.messages[i].role === 'assistant') { copyText(c.messages[i].content); toast('已复制'); break; }
    }
  }
  function toggleDeepThink(force) {
    state.deepThink = typeof force === 'boolean' ? force : !state.deepThink;
    save(); syncToggles();
    toast(state.deepThink ? '已开启深度思考' : '已关闭深度思考');
  }
  function syncToggles() {
    var dt = $('#deepThinkBtn'), ws = $('#webSearchBtn');
    if (dt) dt.classList.toggle('on', state.deepThink);
    if (ws) ws.classList.toggle('on', state.webSearch);
  }

  /* ============ 启动 ============ */
  function init() {
    load(); applyTheme();
    $('#modelName').textContent = state.model;
    syncToggles();
    bind();
    if (!state.chats.length) { var c = makeChat(); state.chats.push(c); state.activeId = c.id; save(); }
    if (!activeChat() && state.chats.length) state.activeId = state.chats[0].id;
    renderMessages();
    autoGrow();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
