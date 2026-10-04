// ==========================================================================
// Auto-Regenerate on API Hang (Tavern Helper script)
// - No text received after FIRST_TEXT_TIMEOUT seconds (stuck "thinking") -> stop & regenerate
// - Text stopped streaming for STALL_TIMEOUT seconds mid-reply            -> stop & regenerate
// - At most MAX_RETRIES automatic retries per turn
// Only watches main chat turns (send / Regenerate / Swipe).
// Continue, Impersonate and quiet/background calls (MVU, memory scripts, etc.) are ignored.
// Requires streaming to be enabled.
// ==========================================================================

const FIRST_TEXT_TIMEOUT = 200; // seconds
const STALL_TIMEOUT = 90;       // seconds
const MAX_RETRIES = 2;
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

function tag(msg) {
  console.log('[AutoRegen]', msg);
}

function stopWatch() {
  st.active = false;
  if (st.timer) {
    clearInterval(st.timer);
    st.timer = null;
  }
}

function isGenerating() {
  try {
    return builtin.duringGenerating();
  } catch {
    return false;
  }
}

async function waitIdle(ms = 15000) {
  const t0 = Date.now();
  while (isGenerating() && Date.now() - t0 < ms) {
    await new Promise(r => setTimeout(r, 300));
  }
}

async function fire(reason) {
  const type = st.type;
  stopWatch();
  if (st.retries >= MAX_RETRIES) {
    toastr.error(`API still hanging after ${MAX_RETRIES} retries. Stopped — please regenerate manually.`, 'Auto-Regenerate');
    tag(`giving up (${reason})`);
    st.retries = 0;
    try { SillyTavern.stopGeneration(); } catch {}
    return;
  }
  st.retries++;
  toastr.warning(`${reason} → stopping and regenerating (attempt ${st.retries}/${MAX_RETRIES})`, 'Auto-Regenerate');
  tag(`${reason}, retry ${st.retries}`);
  try { SillyTavern.stopGeneration(); } catch (e) { tag('stopGeneration failed: ' + e); }
  await waitIdle();
  await new Promise(r => setTimeout(r, 800));
  st.selfTriggered = true;
  // Hung swipe -> make a new swipe (keeps older swipes); otherwise -> Regenerate
  // (/regenerate on a user message generates a new reply and deletes nothing)
  await triggerSlash(type === 'swipe' ? '/swipe direction=right' : '/regenerate');
}

function tick() {
  if (!st.active) return;
  const now = Date.now();
  if (!st.gotText && now - st.startedAt > FIRST_TEXT_TIMEOUT * 1000) {
    fire(`No text after ${FIRST_TEXT_TIMEOUT}s`);
  } else if (st.gotText && now - st.lastChunkAt > STALL_TIMEOUT * 1000) {
    fire(`Stream stalled for ${STALL_TIMEOUT}s`);
  }
}

eventOn(tavern_events.GENERATION_STARTED, (type, _opts, dryRun) => {
  if (dryRun || !WATCHED_TYPES.includes(type)) return;
  if (!st.selfTriggered) st.retries = 0; // a fresh turn started by the user
  st.selfTriggered = false;
  stopWatch();
  st.active = true;
  st.type = type;
  st.startedAt = Date.now();
  st.lastChunkAt = Date.now();
  st.gotText = false;
  st.timer = setInterval(tick, 5000);
  tag(`watching "${type || 'normal'}" turn`);
});

eventOn(tavern_events.STREAM_TOKEN_RECEIVED, text => {
  if (!st.active) return;
  st.lastChunkAt = Date.now();
  if (typeof text === 'string' && text.trim().length > 0) st.gotText = true;
});

eventOn(tavern_events.GENERATION_ENDED, () => {
  if (!st.active) return;
  stopWatch();
  st.retries = 0;
});

eventOn(tavern_events.GENERATION_STOPPED, () => {
  // User pressed Stop -> stop watching (fire() already stops watching before it stops)
  stopWatch();
});

eventOn(tavern_events.CHAT_CHANGED, () => {
  stopWatch();
  st.retries = 0;
});
