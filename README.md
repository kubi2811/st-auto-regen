# Auto-Regenerate on API Hang

A [Tavern Helper](https://github.com/N0VI028/JS-Slash-Runner) script for SillyTavern that automatically stops and regenerates a reply when the API gets stuck.

## What it does

- **No text after 200 s** (stuck in "thinking") → stops the generation and regenerates.
- **Stream stalls for 90 s** in the middle of a reply → stops and regenerates.
- At most **2 automatic retries** per turn, then it gives up and shows a notice, so it never loops forever or burns your quota.
- A hung **swipe** gets a new swipe (older swipes are kept). A hang right after you send a message regenerates the reply without deleting your message.
- Only watches main chat turns (send / Regenerate / Swipe). Continue, Impersonate and background calls (MVU, memory/summary scripts, etc.) are ignored.

**Requires streaming to be enabled** — the script detects hangs from the incoming stream.

## Install

In SillyTavern open **Tavern Helper → Script → + Script**, give it a name, and paste this single line into **Script Content**:

```js
import 'https://cdn.jsdelivr.net/gh/kubi2811/st-auto-regen@main/auto-regen-on-hang.js'
```

Confirm and enable the script. It updates automatically when this repo changes (jsDelivr may cache for up to ~12 h).

Alternatively, paste the whole content of `auto-regen-on-hang.js` into Script Content.

## Settings

Want different timeouts? Paste the full file instead of the import line and edit the constants at the top:

```js
const FIRST_TEXT_TIMEOUT = 200; // seconds without any text
const STALL_TIMEOUT = 90;       // seconds without new tokens mid-reply
const MAX_RETRIES = 2;
```

## Troubleshooting

Open the browser console (F12) and look for lines starting with `[AutoRegen]`.
