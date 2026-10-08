// Auto-Regenerate on API Hang — SillyTavern UI extension
// 1) Hang watchdog: no text for N s / stream stalls mid-reply -> stop & regenerate
// 2) Empty / too-short / truncated reply after generation ends -> regenerate
//    (idea inspired by the "请求失败重试 PVP" Tavern Helper script; independent implementation)
// 3) API error (429 rate limit / 5xx / network) -> wait with backoff, then regenerate
// 4) One-click Stop: pressing Stop also aborts background generations
//    started right after (e.g. MVU extra-model variable update)
// Vietnamese UI by default, switchable to English.

import { isGenerating } from '../../../../script.js';

export default 'AutoRegenOnHang';

const ctx = SillyTavern.getContext();
const KEY = 'autoRegenOnHang';

const DEFAULTS = Object.freeze({
    enabled: true,
    firstTextTimeout: 200,
    stallTimeout: 90,
    maxRetries: 50,
    shortEnabled: true,
    minLength: 50,
    shortMaxRetries: 50,
    requiredText: '',
    errorEnabled: true,
    errorBaseDelay: 5,
    errorMaxDelay: 60,
    errorMaxRetries: 20,
    stopAll: true,
    language: 'vi', // 'vi' | 'en'
});

const STRINGS = {
    vi: {
        title: 'Tự động Regenerate khi API treo',
        switchLang: 'English',
        enabled: 'Bật',
        secHang: 'Khi API treo',
        firstText: 'Tạo lại nếu chưa ra chữ sau (giây)',
        firstTextHint: 'Dành cho lúc kẹt ở thinking. Đặt lớn hơn thời gian thinking bình thường dài nhất.',
        stall: 'Tạo lại nếu đang viết mà đứng im (giây)',
        stallHint: 'Chỉ tính khi đã bắt đầu ra chữ, nên lượt dài đang chạy đều sẽ không bị cắt.',
        retries: 'Số lần tạo lại tối đa mỗi lượt (không giới hạn, 0 = tắt)',
        secShort: 'Khi câu trả lời rỗng / quá ngắn / bị cụt',
        shortEnabled: 'Tự tạo lại khi câu trả lời rỗng hoặc quá ngắn',
        minLength: 'Độ dài tối thiểu (ký tự, không tính thinking)',
        shortRetries: 'Số lần tạo lại tối đa (không giới hạn, 0 = tắt)',
        required: 'Chuỗi bắt buộc phải có (để trống = không kiểm tra)',
        requiredHint: 'Ví dụ </content> — thiếu chuỗi này coi như câu trả lời bị cụt. Tin có <UpdateVariable> luôn được bỏ qua.',
        secError: 'Khi API báo lỗi (429 / 5xx / mất mạng)',
        errorEnabled: 'Tự chờ rồi tạo lại khi API báo lỗi',
        errorBase: 'Chờ lần đầu (giây, mỗi lần sau gấp đôi)',
        errorMax: 'Chờ tối đa mỗi lần (giây)',
        errorRetries: 'Số lần thử lại tối đa (không giới hạn, 0 = tắt)',
        errorHint: 'Lỗi 429 (rate limit), 408, 5xx (server quá tải) hoặc mất mạng. Lỗi khác (sai key, 400…) không tự thử lại. Đang chờ mà gửi tin khác / đổi chat / bấm "Dừng tất cả ngay" thì huỷ.',
        apiError: 'API lỗi {status}',
        netError: 'mất kết nối',
        apiRetry: '{reason} → chờ {s}s rồi tạo lại (lần {i}/{max})',
        secStop: 'Nút Dừng',
        stopAll: 'Bấm Dừng một lần là dừng luôn MVU / lệnh chạy ngầm',
        stopAllHint: 'Sau khi bấm Dừng, mọi lệnh chạy ngầm bắt đầu trong 8 giây (vd MVU cập nhật biến) cũng bị huỷ.',
        btnStopAll: 'Dừng tất cả ngay',
        btnLog: 'Xem log',
        note: 'Chỉ theo dõi lượt chính (gửi / Regenerate / Swipe). Phát hiện API treo cần bật streaming.',
        status: 'Trạng thái',
        idle: 'Đang chờ',
        watching: 'Đang theo dõi: {s}s',
        toastTitle: 'Tự động Regenerate',
        noText: 'Quá {n}s chưa ra chữ',
        stalled: 'Đứng im quá {n}s giữa chừng',
        tooShort: 'Câu trả lời quá ngắn ({len} ký tự)',
        empty: 'Câu trả lời rỗng',
        missing: 'Thiếu "{text}" (có thể bị cụt)',
        retrying: '{reason} → tạo lại (lần {i}/{max})',
        giveUp: 'Vẫn lỗi sau {max} lần tạo lại. Đã dừng, hãy tự bấm Regenerate.',
        noStream: 'Streaming đang tắt — không phát hiện được API treo.',
        stoppedAll: 'Đã dừng tất cả (kể cả lệnh chạy ngầm).',
        stoppedBg: 'Đã huỷ lệnh chạy ngầm sau khi bấm Dừng.',
        logEmpty: '(chưa có log)',
    },
    en: {
        title: 'Auto-Regenerate on API Hang',
        switchLang: 'Tiếng Việt',
        enabled: 'Enabled',
        secHang: 'When the API hangs',
        firstText: 'Regenerate if no text after (seconds)',
        firstTextHint: 'Covers replies stuck in "thinking". Set above your longest normal thinking time.',
        stall: 'Regenerate if the stream stalls for (seconds)',
        stallHint: 'Only counts while text is already streaming, so long replies are not cut.',
        retries: 'Max retries per turn (no limit, 0 = off)',
        secShort: 'When the reply is empty / too short / truncated',
        shortEnabled: 'Regenerate empty or too-short replies',
        minLength: 'Minimum length (characters, excluding thinking)',
        shortRetries: 'Max retries (no limit, 0 = off)',
        required: 'Required text (leave empty to skip)',
        requiredHint: 'e.g. </content> — a reply without it is treated as truncated. Replies with <UpdateVariable> are always skipped.',
        secError: 'When the API returns an error (429 / 5xx / network)',
        errorEnabled: 'Wait and regenerate on API errors',
        errorBase: 'First wait (seconds, doubles each time)',
        errorMax: 'Max wait per attempt (seconds)',
        errorRetries: 'Max retries (no limit, 0 = off)',
        errorHint: 'Covers 429 (rate limit), 408, 5xx (server overloaded) and network failures. Other errors (bad key, 400…) are not retried. Sending another message, switching chats or pressing "Stop everything now" cancels the wait.',
        apiError: 'API error {status}',
        netError: 'network failure',
        apiRetry: '{reason} → waiting {s}s, then regenerating (attempt {i}/{max})',
        secStop: 'Stop button',
        stopAll: 'One Stop press also stops MVU / background generations',
        stopAllHint: 'After you press Stop, any background generation started within 8 seconds (e.g. MVU variable update) is cancelled too.',
        btnStopAll: 'Stop everything now',
        btnLog: 'Show log',
        note: 'Watches only main turns (send / Regenerate / Swipe). Hang detection requires streaming.',
        status: 'Status',
        idle: 'Idle',
        watching: 'Watching: {s}s elapsed',
        toastTitle: 'Auto-Regenerate',
        noText: 'No text after {n}s',
        stalled: 'Stream stalled for {n}s',
        tooShort: 'Reply too short ({len} chars)',
        empty: 'Empty reply',
        missing: 'Missing "{text}" (possibly truncated)',
        retrying: '{reason} → regenerating (attempt {i}/{max})',
        giveUp: 'Still failing after {max} retries. Stopped — please regenerate manually.',
        noStream: 'Streaming is off — hangs cannot be detected.',
        stoppedAll: 'Stopped everything (including background generations).',
        stoppedBg: 'Cancelled a background generation after Stop.',
        logEmpty: '(no log yet)',
    },
};

const WATCHED_TYPES = ['normal', 'regenerate', 'swipe', undefined, null, ''];
const STOP_WINDOW_MS = 8000;

const st = {
    active: false,
    type: null,
    lastMainType: null,
    startedAt: 0,
    lastChunkAt: 0,
    gotText: false,
    hangRetries: 0,
    shortRetries: 0,
    errRetries: 0,
    mainTurn: false,
    apiError: null,
    waitToken: 0,
    selfTriggered: false,
    userStopped: false,
    stopWindowUntil: 0,
    busy: false,
    timer: null,
};

const logLines = [];

// ---------------- helpers ----------------

function settings() {
    if (!ctx.extensionSettings[KEY]) ctx.extensionSettings[KEY] = {};
    const s = ctx.extensionSettings[KEY];
    for (const [k, v] of Object.entries(DEFAULTS)) {
        if (s[k] === undefined) s[k] = v;
    }
    if (s.language !== 'en') s.language = 'vi';
    // v1.2: retry limits default to 50 and are no longer capped
    if (!s._v12) {
        if (s.maxRetries === 2 || s.maxRetries === 10) s.maxRetries = 50;
        if (s.shortMaxRetries === 3 || s.shortMaxRetries === 10) s.shortMaxRetries = 50;
        s._v12 = true;
    }
    return s;
}

function T(key, vars = {}) {
    let s = STRINGS[settings().language]?.[key] ?? STRINGS.vi[key] ?? key;
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
}

function log(msg) {
    const line = `${new Date().toLocaleTimeString()} ${msg}`;
    logLines.push(line);
    if (logLines.length > 200) logLines.shift();
    console.log('[AutoRegen]', msg);
}

function stopWatch() {
    st.active = false;
    st.mainTurn = false;
    if (st.timer) {
        clearInterval(st.timer);
        st.timer = null;
    }
    updateStatus(true);
}

async function waitIdle(ms = 15000) {
    const t0 = Date.now();
    while (isGenerating() && Date.now() - t0 < ms) {
        await new Promise(r => setTimeout(r, 300));
    }
}

function stopBackground() {
    try {
        return globalThis.TavernHelper?.stopAllGeneration?.() ?? false;
    } catch (e) {
        log('stopAllGeneration failed: ' + e);
        return false;
    }
}

function streamingOn() {
    try {
        const c = SillyTavern.getContext();
        if (c.mainApi === 'openai') return !!c.chatCompletionSettings?.stream_openai;
        return true;
    } catch {
        return true;
    }
}

async function regenerate(type) {
    await waitIdle();
    await new Promise(r => setTimeout(r, 800));
    st.selfTriggered = true;
    // Swipe -> new swipe (keeps older swipes); otherwise /regenerate
    // (/regenerate on a user message generates a new reply and deletes nothing)
    await ctx.executeSlashCommandsWithOptions(type === 'swipe' ? '/swipe direction=right' : '/regenerate');
}

// ---------------- 1) hang watchdog ----------------

async function fireHang(reason) {
    const s = settings();
    const type = st.type;
    stopWatch();
    if (st.busy) return;
    st.busy = true;
    try {
        if (st.hangRetries >= s.maxRetries) {
            toastr.error(T('giveUp', { max: s.maxRetries }), T('toastTitle'));
            log(`hang: giving up (${reason})`);
            st.hangRetries = 0;
            try { ctx.stopGeneration(); } catch { /* ignore */ }
            return;
        }
        st.hangRetries++;
        toastr.warning(T('retrying', { reason, i: st.hangRetries, max: s.maxRetries }), T('toastTitle'));
        log(`hang: ${reason}, retry ${st.hangRetries}`);
        st.userStopped = false;
        try { ctx.stopGeneration(); } catch (e) { log('stopGeneration failed: ' + e); }
        await regenerate(type);
    } finally {
        st.busy = false;
    }
}

function tick() {
    if (!st.active) return;
    // safety net in case GENERATION_ENDED never arrives; ST raises its "generating" flag
    // only after GENERATION_STARTED handlers / slash commands run, so give it a grace period
    if (!isGenerating() && Date.now() - st.startedAt > 15000) {
        stopWatch();
        return;
    }
    const s = settings();
    const now = Date.now();
    if (!st.gotText && now - st.startedAt > s.firstTextTimeout * 1000) {
        fireHang(T('noText', { n: s.firstTextTimeout }));
    } else if (st.gotText && now - st.lastChunkAt > s.stallTimeout * 1000) {
        fireHang(T('stalled', { n: s.stallTimeout }));
    } else {
        updateStatus();
    }
}

// ---------------- 2) empty / short reply ----------------

function visibleText(mes) {
    if (!mes) return '';
    return String(mes)
        .replace(/<thinking[\s\S]*?(?:<\/thinking>|$)/gi, '')
        .replace(/<think[\s\S]*?(?:<\/think>|$)/gi, '')
        .replace(/<!--[\s\S]*?(?:-->|$)/g, '')
        .trim();
}

async function checkShortReply() {
    const s = settings();
    if (!s.enabled || !s.shortEnabled || st.userStopped || st.busy) return;
    const type = st.lastMainType;
    await new Promise(r => setTimeout(r, 500));
    if (isGenerating() || st.userStopped) return;

    const chat = SillyTavern.getContext().chat || [];
    const last = chat[chat.length - 1];
    let reason = null;
    if (!last || last.is_user) {
        reason = T('empty');
    } else {
        const raw = String(last.mes || '');
        if (/<UpdateVariable>/i.test(raw)) return; // MVU message — never retry
        const text = visibleText(raw);
        if (text.length === 0) reason = T('empty');
        else if (text.length < s.minLength) reason = T('tooShort', { len: text.length });
        else if (s.requiredText && !raw.includes(s.requiredText)) reason = T('missing', { text: s.requiredText });
    }
    if (!reason) {
        st.shortRetries = 0;
        return;
    }
    if (st.shortRetries >= s.shortMaxRetries) {
        toastr.error(T('giveUp', { max: s.shortMaxRetries }), T('toastTitle'));
        log(`short: giving up (${reason})`);
        st.shortRetries = 0;
        return;
    }
    st.shortRetries++;
    toastr.warning(T('retrying', { reason, i: st.shortRetries, max: s.shortMaxRetries }), T('toastTitle'));
    log(`short: ${reason}, retry ${st.shortRetries}`);
    await regenerate(type);
}

// ---------------- 3) API errors (429 / 5xx / network) ----------------

const RETRY_STATUSES = new Set([408, 429]);
const isRetryStatus = code => RETRY_STATUSES.has(code) || (code >= 500 && code <= 599);
const isGenerateUrl = url => /\/api\/.*generate/i.test(url);

function parseRetryAfter(value) {
    if (!value) return 0;
    const n = Number(value);
    if (Number.isFinite(n)) return Math.max(0, n);
    const t = Date.parse(value);
    return Number.isFinite(t) ? Math.max(0, Math.ceil((t - Date.now()) / 1000)) : 0;
}

// ST surfaces API failures only as a toast, so watch the generate requests' HTTP status directly
function hookFetch() {
    const origFetch = window.fetch;
    window.fetch = async function (...args) {
        const input = args[0];
        const url = typeof input === 'string' ? input : (input?.url ?? String(input ?? ''));
        const watched = st.mainTurn && isGenerateUrl(url);
        let res;
        try {
            res = await origFetch.apply(this, args);
        } catch (e) {
            if (watched && st.mainTurn && e?.name !== 'AbortError') st.apiError = { status: 0, retryable: true };
            throw e;
        }
        if (watched && st.mainTurn && !res.ok) {
            st.apiError = {
                status: res.status,
                retryable: isRetryStatus(res.status),
                retryAfter: parseRetryAfter(res.headers.get('retry-after')),
            };
        }
        return res;
    };
}

function cancelWait() {
    st.waitToken++;
}

async function sleepUnlessCancelled(ms, token) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
        if (st.waitToken !== token || st.userStopped) return false;
        await new Promise(r => setTimeout(r, 250));
    }
    return st.waitToken === token && !st.userStopped;
}

async function handleApiError(err) {
    const s = settings();
    if (!s.enabled || !s.errorEnabled || st.userStopped || st.busy) return;
    const type = st.lastMainType;
    const reason = err.status ? T('apiError', { status: err.status }) : T('netError');
    st.busy = true;
    let go = false;
    try {
        if (st.errRetries >= s.errorMaxRetries) {
            toastr.error(T('giveUp', { max: s.errorMaxRetries }), T('toastTitle'));
            log(`api error: giving up (${reason})`);
            st.errRetries = 0;
            return;
        }
        st.errRetries++;
        const backoff = Math.min(s.errorMaxDelay, s.errorBaseDelay * 2 ** (st.errRetries - 1));
        const wait = Math.max(1, Math.round(Math.max(backoff, Math.min(err.retryAfter || 0, 600))));
        toastr.warning(T('apiRetry', { reason, s: wait, i: st.errRetries, max: s.errorMaxRetries }), T('toastTitle'), { timeOut: Math.min(wait * 1000, 15000) });
        log(`api error: ${reason}, waiting ${wait}s, retry ${st.errRetries}`);
        const token = ++st.waitToken;
        go = await sleepUnlessCancelled(wait * 1000, token);
        if (!go) log('api error: retry cancelled');
    } finally {
        st.busy = false;
    }
    // outside busy: the retried turn may fail again before regenerate() returns
    if (go) await regenerate(type);
}

// ---------------- 4) one-click stop ----------------

function onUserStopClick() {
    st.userStopped = true;
    stopWatch();
    if (!settings().stopAll) return;
    st.stopWindowUntil = Date.now() + STOP_WINDOW_MS;
    setTimeout(() => {
        if (stopBackground()) log('stop: aborted background generations');
    }, 50);
}

function onAnyGenerationStart(source) {
    if (Date.now() < st.stopWindowUntil) {
        log(`stop window: cancelling ${source}`);
        setTimeout(() => {
            stopBackground();
            try { if (isGenerating()) ctx.stopGeneration(); } catch { /* ignore */ }
            toastr.info(T('stoppedBg'), T('toastTitle'));
        }, 50);
        return true;
    }
    return false;
}

function stopEverything() {
    st.userStopped = true;
    cancelWait();
    st.stopWindowUntil = Date.now() + STOP_WINDOW_MS;
    stopWatch();
    try { ctx.stopGeneration(); } catch { /* ignore */ }
    stopBackground();
    toastr.info(T('stoppedAll'), T('toastTitle'));
    log('stop everything (button)');
}

// ---------------- events ----------------

function onGenerationStarted(type, _opts, dryRun) {
    if (dryRun) return;
    if (!WATCHED_TYPES.includes(type)) {
        onAnyGenerationStart(`generation "${type}"`);
        return;
    }
    if (onAnyGenerationStart(`generation "${type || 'normal'}"`)) return;
    const s = settings();
    if (!st.selfTriggered) {
        st.hangRetries = 0;
        st.shortRetries = 0;
        st.errRetries = 0;
        cancelWait(); // the user started a turn themselves -> drop any pending error retry
    }
    st.selfTriggered = false;
    st.userStopped = false;
    st.lastMainType = type;
    if (!s.enabled) return;
    stopWatch();
    st.mainTurn = true;
    st.apiError = null;
    if (!streamingOn()) {
        if (!st.warnedNoStream) toastr.info(T('noStream'), T('toastTitle'));
        st.warnedNoStream = true;
        return;
    }
    st.active = true;
    st.mainTurn = true;
    st.type = type;
    st.startedAt = Date.now();
    st.lastChunkAt = Date.now();
    st.gotText = false;
    st.timer = setInterval(tick, 2000);
    log(`watching "${type || 'normal'}" turn`);
}

function onToken(text) {
    if (!st.active) return;
    st.lastChunkAt = Date.now();
    if (!st.gotText && typeof text === 'string' && text.trim().length > 0) {
        st.gotText = true;
    }
}

function onEnded() {
    const wasMain = st.mainTurn;
    const apiError = st.apiError;
    st.apiError = null;
    stopWatch();
    if (!wasMain) return;
    if (apiError) {
        if (apiError.retryable) handleApiError(apiError);
        else log(`api error ${apiError.status}: not retryable, skipping`);
        return;
    }
    st.hangRetries = 0;
    st.errRetries = 0;
    checkShortReply();
}

// ---------------- UI ----------------

function updateStatus(force = false) {
    const el = document.getElementById('autoregen_status');
    if (!el) return;
    if (!force && !el.offsetParent) return;
    el.textContent = st.active
        ? T('watching', { s: Math.floor((Date.now() - st.startedAt) / 1000) })
        : T('idle');
}

function renderPanel(open = false) {
    const s = settings();
    const host = document.getElementById('extensions_settings2') ?? document.getElementById('extensions_settings');
    if (!host) return;
    document.getElementById('autoregen_panel')?.remove();

    const esc = v => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const wrap = document.createElement('div');
    wrap.id = 'autoregen_panel';
    wrap.innerHTML = `
    <div class="inline-drawer">
      <div class="inline-drawer-toggle inline-drawer-header">
        <b>${T('title')}</b>
        <div class="inline-drawer-icon fa-solid ${open ? 'fa-circle-chevron-up up' : 'fa-circle-chevron-down down'}"></div>
      </div>
      <div class="inline-drawer-content autoregen-content" style="${open ? 'display:block' : ''}">
        <div class="autoregen-row">
          <label class="checkbox_label" for="autoregen_enabled">
            <input id="autoregen_enabled" type="checkbox" ${s.enabled ? 'checked' : ''}>
            <span>${T('enabled')}</span>
          </label>
          <div id="autoregen_lang" class="menu_button autoregen-lang"><i class="fa-solid fa-language"></i> ${T('switchLang')}</div>
        </div>

        <h4>${T('secHang')}</h4>
        <label for="autoregen_first">${T('firstText')}: <b id="autoregen_first_val">${s.firstTextTimeout}</b></label>
        <input id="autoregen_first" type="range" min="30" max="600" step="10" value="${s.firstTextTimeout}">
        <small class="autoregen-hint">${T('firstTextHint')}</small>
        <label for="autoregen_stall">${T('stall')}: <b id="autoregen_stall_val">${s.stallTimeout}</b></label>
        <input id="autoregen_stall" type="range" min="15" max="300" step="5" value="${s.stallTimeout}">
        <small class="autoregen-hint">${T('stallHint')}</small>
        <label for="autoregen_retries">${T('retries')}</label>
        <input id="autoregen_retries" class="text_pole" type="number" min="0" value="${s.maxRetries}">

        <h4>${T('secShort')}</h4>
        <label class="checkbox_label" for="autoregen_short">
          <input id="autoregen_short" type="checkbox" ${s.shortEnabled ? 'checked' : ''}>
          <span>${T('shortEnabled')}</span>
        </label>
        <label for="autoregen_minlen">${T('minLength')}</label>
        <input id="autoregen_minlen" class="text_pole" type="number" min="0" max="5000" value="${s.minLength}">
        <label for="autoregen_shortretries">${T('shortRetries')}</label>
        <input id="autoregen_shortretries" class="text_pole" type="number" min="0" value="${s.shortMaxRetries}">
        <label for="autoregen_required">${T('required')}</label>
        <input id="autoregen_required" class="text_pole" type="text" value="${esc(s.requiredText)}" placeholder="</content>">
        <small class="autoregen-hint">${esc(T('requiredHint'))}</small>

        <h4>${T('secError')}</h4>
        <label class="checkbox_label" for="autoregen_error">
          <input id="autoregen_error" type="checkbox" ${s.errorEnabled ? 'checked' : ''}>
          <span>${T('errorEnabled')}</span>
        </label>
        <label for="autoregen_errbase">${T('errorBase')}</label>
        <input id="autoregen_errbase" class="text_pole" type="number" min="1" max="600" value="${s.errorBaseDelay}">
        <label for="autoregen_errmax">${T('errorMax')}</label>
        <input id="autoregen_errmax" class="text_pole" type="number" min="1" max="600" value="${s.errorMaxDelay}">
        <label for="autoregen_errretries">${T('errorRetries')}</label>
        <input id="autoregen_errretries" class="text_pole" type="number" min="0" value="${s.errorMaxRetries}">
        <small class="autoregen-hint">${esc(T('errorHint'))}</small>

        <h4>${T('secStop')}</h4>
        <label class="checkbox_label" for="autoregen_stopall">
          <input id="autoregen_stopall" type="checkbox" ${s.stopAll ? 'checked' : ''}>
          <span>${T('stopAll')}</span>
        </label>
        <small class="autoregen-hint">${T('stopAllHint')}</small>
        <div class="autoregen-row">
          <div id="autoregen_stopnow" class="menu_button"><i class="fa-solid fa-circle-stop"></i> ${T('btnStopAll')}</div>
          <div id="autoregen_showlog" class="menu_button"><i class="fa-solid fa-list"></i> ${T('btnLog')}</div>
        </div>
        <pre id="autoregen_log" class="autoregen-log" style="display:none"></pre>

        <div class="autoregen-status">${T('status')}: <span id="autoregen_status"></span></div>
        <small class="autoregen-hint">${T('note')}</small>
      </div>
    </div>`;
    host.append(wrap);

    const save = () => ctx.saveSettingsDebounced();
    const q = id => wrap.querySelector(`#${id}`);
    const bindCheck = (id, key, after) => q(id).addEventListener('change', e => { s[key] = e.target.checked; after?.(); save(); });
    const bindRange = (id, key) => {
        const input = q(id);
        input.addEventListener('input', () => { s[key] = Number(input.value); q(`${id}_val`).textContent = input.value; save(); });
    };
    const bindNum = (id, key, min, max) => q(id).addEventListener('change', e => {
        const n = Math.max(min, Math.min(max, Math.round(Number(e.target.value) || 0)));
        s[key] = n; e.target.value = String(n); save();
    });
    bindCheck('autoregen_enabled', 'enabled', () => { if (!s.enabled) { stopWatch(); cancelWait(); } });
    bindRange('autoregen_first', 'firstTextTimeout');
    bindRange('autoregen_stall', 'stallTimeout');
    bindNum('autoregen_retries', 'maxRetries', 0, Number.MAX_SAFE_INTEGER);
    bindCheck('autoregen_short', 'shortEnabled');
    bindNum('autoregen_minlen', 'minLength', 0, 5000);
    bindNum('autoregen_shortretries', 'shortMaxRetries', 0, Number.MAX_SAFE_INTEGER);
    q('autoregen_required').addEventListener('input', e => { s.requiredText = e.target.value; save(); });
    bindCheck('autoregen_error', 'errorEnabled', () => { if (!s.errorEnabled) cancelWait(); });
    bindNum('autoregen_errbase', 'errorBaseDelay', 1, 600);
    bindNum('autoregen_errmax', 'errorMaxDelay', 1, 600);
    bindNum('autoregen_errretries', 'errorMaxRetries', 0, Number.MAX_SAFE_INTEGER);
    bindCheck('autoregen_stopall', 'stopAll');
    q('autoregen_stopnow').addEventListener('click', stopEverything);
    q('autoregen_showlog').addEventListener('click', () => {
        const pre = q('autoregen_log');
        const show = pre.style.display === 'none';
        pre.textContent = logLines.length ? logLines.slice(-60).join('\n') : T('logEmpty');
        pre.style.display = show ? 'block' : 'none';
    });
    q('autoregen_lang').addEventListener('click', () => {
        s.language = s.language === 'vi' ? 'en' : 'vi';
        save();
        renderPanel(true);
    });
    updateStatus();
}

// ---------------- init ----------------

(function init() {
    settings();
    hookFetch();
    renderPanel();
    const { eventSource, eventTypes } = ctx;
    eventSource.on(eventTypes.GENERATION_STARTED, onGenerationStarted);
    eventSource.on(eventTypes.STREAM_TOKEN_RECEIVED, onToken);
    eventSource.on(eventTypes.GENERATION_ENDED, onEnded);
    eventSource.on(eventTypes.GENERATION_STOPPED, () => stopWatch());
    eventSource.on(eventTypes.CHAT_CHANGED, () => { stopWatch(); cancelWait(); st.hangRetries = 0; st.shortRetries = 0; st.errRetries = 0; });
    // Tavern Helper generations (MVU extra model etc.) emit this on the same event bus
    eventSource.on('js_generation_started', () => onAnyGenerationStart('Tavern Helper generation'));
    // Catch the user's own Stop click (capture phase, before ST handles it)
    document.addEventListener('click', e => {
        if (e.target?.closest?.('#mes_stop')) onUserStopClick();
    }, true);
    log('loaded');
})();
