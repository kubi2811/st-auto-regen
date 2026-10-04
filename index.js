// Auto-Regenerate on API Hang — SillyTavern UI extension
// Stops and regenerates a reply when the API hangs (no text for N seconds,
// or the stream stalls mid-reply). Settings panel in Extensions, VI/EN UI.

import { isGenerating } from '../../../../script.js';

export default 'AutoRegenOnHang';

const ctx = SillyTavern.getContext();
const KEY = 'autoRegenOnHang';

const DEFAULTS = Object.freeze({
    enabled: true,
    firstTextTimeout: 200,
    stallTimeout: 90,
    maxRetries: 2,
    language: 'auto', // 'auto' | 'en' | 'vi'
});

const STRINGS = {
    en: {
        title: 'Auto-Regenerate on API Hang',
        enabled: 'Enabled',
        firstText: 'Regenerate if no text after (seconds)',
        firstTextHint: 'Covers replies stuck in "thinking". Set above your longest normal thinking time.',
        stall: 'Regenerate if the stream stalls for (seconds)',
        stallHint: 'Only counts while text is already streaming, so long replies are not cut.',
        retries: 'Max automatic retries per turn',
        language: 'Language',
        langAuto: 'Auto (follow SillyTavern)',
        note: 'Watches only main turns (send / Regenerate / Swipe). Requires streaming.',
        status: 'Status',
        idle: 'Idle',
        watching: 'Watching: {s}s elapsed',
        toastTitle: 'Auto-Regenerate',
        noText: 'No text after {n}s',
        stalled: 'Stream stalled for {n}s',
        retrying: '{reason} → stopping and regenerating (attempt {i}/{max})',
        giveUp: 'API still hanging after {max} retries. Stopped — please regenerate manually.',
        noStream: 'Streaming is off — Auto-Regenerate cannot detect hangs.',
    },
    vi: {
        title: 'Tự động Regenerate khi API treo',
        enabled: 'Bật',
        firstText: 'Tạo lại nếu chưa ra chữ sau (giây)',
        firstTextHint: 'Dành cho lúc kẹt ở thinking. Đặt lớn hơn thời gian thinking bình thường dài nhất.',
        stall: 'Tạo lại nếu đang viết mà đứng im (giây)',
        stallHint: 'Chỉ tính khi đã bắt đầu ra chữ, nên lượt dài đang chạy đều sẽ không bị cắt.',
        retries: 'Số lần tạo lại tối đa mỗi lượt',
        language: 'Ngôn ngữ',
        langAuto: 'Tự động (theo SillyTavern)',
        note: 'Chỉ theo dõi lượt chính (gửi / Regenerate / Swipe). Cần bật streaming.',
        status: 'Trạng thái',
        idle: 'Đang chờ',
        watching: 'Đang theo dõi: {s}s',
        toastTitle: 'Tự động Regenerate',
        noText: 'Quá {n}s chưa ra chữ',
        stalled: 'Đứng im quá {n}s giữa chừng',
        retrying: '{reason} → dừng và tạo lại (lần {i}/{max})',
        giveUp: 'API vẫn treo sau {max} lần tạo lại. Đã dừng, hãy tự bấm Regenerate.',
        noStream: 'Streaming đang tắt — không phát hiện được API treo.',
    },
};

const WATCHED_TYPES = ['normal', 'regenerate', 'swipe', undefined, null, ''];

const st = {
    active: false,
    type: null,
    startedAt: 0,
    lastChunkAt: 0,
    gotText: false,
    retries: 0,
    selfTriggered: false,
    timer: null,
};

function settings() {
    if (!ctx.extensionSettings[KEY]) ctx.extensionSettings[KEY] = {};
    const s = ctx.extensionSettings[KEY];
    for (const [k, v] of Object.entries(DEFAULTS)) {
        if (s[k] === undefined) s[k] = v;
    }
    return s;
}

function lang() {
    const l = settings().language;
    if (l === 'en' || l === 'vi') return l;
    const loc = String(ctx.getCurrentLocale?.() || navigator.language || 'en').toLowerCase();
    return loc.startsWith('vi') ? 'vi' : 'en';
}

function T(key, vars = {}) {
    let s = (STRINGS[lang()] || STRINGS.en)[key] ?? STRINGS.en[key] ?? key;
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
}

function log(msg) {
    console.log('[AutoRegen]', msg);
}

function stopWatch() {
    st.active = false;
    if (st.timer) {
        clearInterval(st.timer);
        st.timer = null;
    }
    updateStatus();
}

async function waitIdle(ms = 15000) {
    const t0 = Date.now();
    while (isGenerating() && Date.now() - t0 < ms) {
        await new Promise(r => setTimeout(r, 300));
    }
}

async function fire(reason) {
    const s = settings();
    const type = st.type;
    stopWatch();
    if (st.retries >= s.maxRetries) {
        toastr.error(T('giveUp', { max: s.maxRetries }), T('toastTitle'));
        log(`giving up (${reason})`);
        st.retries = 0;
        try { ctx.stopGeneration(); } catch { /* ignore */ }
        return;
    }
    st.retries++;
    toastr.warning(T('retrying', { reason, i: st.retries, max: s.maxRetries }), T('toastTitle'));
    log(`${reason}, retry ${st.retries}`);
    try { ctx.stopGeneration(); } catch (e) { log('stopGeneration failed: ' + e); }
    await waitIdle();
    await new Promise(r => setTimeout(r, 800));
    st.selfTriggered = true;
    // Hung swipe -> new swipe (keeps older swipes); otherwise /regenerate
    // (/regenerate on a user message generates a new reply and deletes nothing)
    await ctx.executeSlashCommandsWithOptions(type === 'swipe' ? '/swipe direction=right' : '/regenerate');
}

function tick() {
    if (!st.active) return;
    const s = settings();
    const now = Date.now();
    if (!st.gotText && now - st.startedAt > s.firstTextTimeout * 1000) {
        fire(T('noText', { n: s.firstTextTimeout }));
    } else if (st.gotText && now - st.lastChunkAt > s.stallTimeout * 1000) {
        fire(T('stalled', { n: s.stallTimeout }));
    }
    updateStatus();
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

let warnedNoStream = false;

function onGenerationStarted(type, _opts, dryRun) {
    if (!settings().enabled) return;
    if (dryRun || !WATCHED_TYPES.includes(type)) return;
    if (!streamingOn()) {
        if (!warnedNoStream) toastr.info(T('noStream'), T('toastTitle'));
        warnedNoStream = true;
        return;
    }
    if (!st.selfTriggered) st.retries = 0;
    st.selfTriggered = false;
    stopWatch();
    st.active = true;
    st.type = type;
    st.startedAt = Date.now();
    st.lastChunkAt = Date.now();
    st.gotText = false;
    st.timer = setInterval(tick, 1000);
    log(`watching "${type || 'normal'}" turn`);
}

function onToken(text) {
    if (!st.active) return;
    st.lastChunkAt = Date.now();
    if (typeof text === 'string' && text.trim().length > 0) st.gotText = true;
}

function onEnded() {
    if (!st.active) return;
    stopWatch();
    st.retries = 0;
}

// ---------------- UI ----------------

function updateStatus() {
    const el = document.getElementById('autoregen_status');
    if (!el) return;
    el.textContent = st.active
        ? T('watching', { s: Math.floor((Date.now() - st.startedAt) / 1000) })
        : T('idle');
}

function renderPanel() {
    const s = settings();
    const host = document.getElementById('extensions_settings2') ?? document.getElementById('extensions_settings');
    if (!host) return;
    document.getElementById('autoregen_panel')?.remove();

    const wrap = document.createElement('div');
    wrap.id = 'autoregen_panel';
    wrap.innerHTML = `
    <div class="inline-drawer">
      <div class="inline-drawer-toggle inline-drawer-header">
        <b>${T('title')}</b>
        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
      </div>
      <div class="inline-drawer-content autoregen-content">
        <label class="checkbox_label" for="autoregen_enabled">
          <input id="autoregen_enabled" type="checkbox" ${s.enabled ? 'checked' : ''}>
          <span>${T('enabled')}</span>
        </label>

        <label for="autoregen_first">${T('firstText')}: <b id="autoregen_first_val">${s.firstTextTimeout}</b></label>
        <input id="autoregen_first" type="range" min="30" max="600" step="10" value="${s.firstTextTimeout}">
        <small class="autoregen-hint">${T('firstTextHint')}</small>

        <label for="autoregen_stall">${T('stall')}: <b id="autoregen_stall_val">${s.stallTimeout}</b></label>
        <input id="autoregen_stall" type="range" min="15" max="300" step="5" value="${s.stallTimeout}">
        <small class="autoregen-hint">${T('stallHint')}</small>

        <label for="autoregen_retries">${T('retries')}</label>
        <input id="autoregen_retries" class="text_pole" type="number" min="0" max="10" step="1" value="${s.maxRetries}">

        <label for="autoregen_lang">${T('language')}</label>
        <select id="autoregen_lang" class="text_pole">
          <option value="auto" ${s.language === 'auto' ? 'selected' : ''}>${T('langAuto')}</option>
          <option value="en" ${s.language === 'en' ? 'selected' : ''}>English</option>
          <option value="vi" ${s.language === 'vi' ? 'selected' : ''}>Tiếng Việt</option>
        </select>

        <div class="autoregen-status">${T('status')}: <span id="autoregen_status"></span></div>
        <small class="autoregen-hint">${T('note')}</small>
      </div>
    </div>`;
    host.append(wrap);

    const save = () => ctx.saveSettingsDebounced();
    wrap.querySelector('#autoregen_enabled').addEventListener('change', e => {
        s.enabled = e.target.checked;
        if (!s.enabled) stopWatch();
        save();
    });
    const bindRange = (id, key) => {
        const input = wrap.querySelector(`#${id}`);
        const val = wrap.querySelector(`#${id}_val`);
        input.addEventListener('input', () => {
            s[key] = Number(input.value);
            val.textContent = input.value;
            save();
        });
    };
    bindRange('autoregen_first', 'firstTextTimeout');
    bindRange('autoregen_stall', 'stallTimeout');
    wrap.querySelector('#autoregen_retries').addEventListener('change', e => {
        const n = Math.max(0, Math.min(10, Math.round(Number(e.target.value) || 0)));
        s.maxRetries = n;
        e.target.value = String(n);
        save();
    });
    wrap.querySelector('#autoregen_lang').addEventListener('change', e => {
        s.language = e.target.value;
        save();
        const wasOpen = wrap.querySelector('.inline-drawer-content')?.style.display === 'block';
        renderPanel();
        if (wasOpen) {
            const panel = document.getElementById('autoregen_panel');
            panel.querySelector('.inline-drawer-content').style.display = 'block';
            panel.querySelector('.inline-drawer-icon')?.classList.replace('down', 'up');
            panel.querySelector('.inline-drawer-icon')?.classList.replace('fa-circle-chevron-down', 'fa-circle-chevron-up');
        }
    });
    updateStatus();
}

// ---------------- init ----------------

(function init() {
    settings();
    renderPanel();
    const { eventSource, eventTypes } = ctx;
    eventSource.on(eventTypes.GENERATION_STARTED, onGenerationStarted);
    eventSource.on(eventTypes.STREAM_TOKEN_RECEIVED, onToken);
    eventSource.on(eventTypes.GENERATION_ENDED, onEnded);
    eventSource.on(eventTypes.GENERATION_STOPPED, () => stopWatch());
    eventSource.on(eventTypes.CHAT_CHANGED, () => { stopWatch(); st.retries = 0; });
    log('loaded');
})();
