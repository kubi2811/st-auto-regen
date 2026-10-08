# Auto-Regenerate on API Hang

*[Tiếng Việt bên dưới](#tiếng-việt)*

A SillyTavern extension that automatically stops and regenerates a reply when the API gets stuck. Comes with a settings panel; the interface is Vietnamese by default with a one-click switch to English.

## What it does

- **No text after N seconds** (default 200 s, stuck in "thinking") → stops the generation and regenerates.
- **Stream stalls for N seconds** mid-reply (default 90 s) → stops and regenerates. Only counts once text is already streaming, so long replies that keep flowing are never cut.
- **Max retries per turn** (default 50, no upper limit), then it gives up and shows a notice instead of looping forever.
- **Empty / too-short / truncated reply** after generation ends (shorter than N characters, or missing a required text such as `</content>`) → regenerates, up to N times (default 50, no upper limit). Replies containing `<UpdateVariable>` (MVU) are always skipped.
- **API errors** — 429 (rate limit), 408, 5xx (server overloaded) or a network failure → waits, then regenerates, doubling the wait each time (default 5 s → 10 s → 20 s…, max 60 s per wait, up to 20 retries). Other errors (bad key, 400…) are not retried. Sending another message, switching chats or pressing *Stop everything now* cancels the wait.
- **One-click Stop:** pressing Stop also cancels background generations that start right after it (e.g. the MVU extra-model variable update), so you no longer need to press Stop twice. There is also a *Stop everything now* button.
- A hung **swipe** gets a new swipe (older swipes are kept). A hang right after you send a message regenerates the reply without deleting your message.
- Only watches main chat turns (send / Regenerate / Swipe). Continue, Impersonate and background calls (MVU, memory/summary scripts, etc.) are ignored.

**Hang detection requires streaming to be enabled** (API-error and empty-reply retries work either way).

## Install (extension, recommended)

1. SillyTavern → **Extensions** (stacked-blocks icon) → **Install extension**.
2. Paste `https://github.com/kubi2811/st-auto-regen` and install.
3. Open the **Auto-Regenerate on API Hang** panel in the Extensions list to adjust the settings. Press the **English** button in the panel to switch the interface language.

Updates arrive through SillyTavern's normal extension updater.

## Alternative: Tavern Helper script (no settings panel)

Tavern Helper → Script → **+ Script**, paste this line into Script Content and enable it:

```js
import 'https://cdn.jsdelivr.net/gh/kubi2811/st-auto-regen@main/auto-regen-on-hang.js'
```

The script only includes the hang watchdog. Timeouts are fixed (200 s / 90 s / 2 retries) unless you paste the whole file and edit the constants at the top. **Don't use the script and the extension at the same time.**

## Troubleshooting

Open the browser console (F12) and look for lines starting with `[AutoRegen]`.

---

## Tiếng Việt

Extension cho SillyTavern: tự động dừng và tạo lại câu trả lời khi API bị treo. Có bảng cài đặt, giao diện mặc định tiếng Việt, có nút chuyển sang tiếng Anh.

### Chức năng

- **Quá N giây chưa ra chữ** (mặc định 200 giây, kẹt ở thinking) → dừng và tạo lại.
- **Đang viết mà đứng im N giây** (mặc định 90 giây) → dừng và tạo lại. Chỉ tính khi đã bắt đầu ra chữ, nên lượt dài đang chạy đều không bị cắt.
- **Số lần tạo lại tối đa mỗi lượt** (mặc định 50, không giới hạn), quá số đó thì dừng và báo, không lặp vô hạn.
- **Câu trả lời rỗng / quá ngắn / bị cụt** sau khi tạo xong (ngắn hơn N ký tự, hoặc thiếu chuỗi bắt buộc như `</content>`) → tạo lại, tối đa N lần (mặc định 50, không giới hạn). Tin có `<UpdateVariable>` (MVU) luôn được bỏ qua.
- **API báo lỗi** — 429 (rate limit), 408, 5xx (server quá tải) hoặc mất mạng → chờ rồi tạo lại, mỗi lần chờ gấp đôi (mặc định 5 giây → 10 → 20…, tối đa 60 giây mỗi lần, tối đa 20 lần). Lỗi khác (sai key, 400…) không tự thử lại. Đang chờ mà gửi tin khác, đổi chat hoặc bấm *Dừng tất cả ngay* thì huỷ.
- **Bấm Dừng một lần là đủ:** bấm Dừng thì các lệnh chạy ngầm bắt đầu ngay sau đó (vd MVU cập nhật biến bằng model ngoài) cũng bị huỷ, không phải bấm Dừng lần hai. Có thêm nút *Dừng tất cả ngay*.
- Swipe bị treo → tạo swipe mới, giữ swipe cũ. Treo ngay sau khi gửi tin → tạo lại câu trả lời, không xoá tin của bạn.
- Chỉ theo dõi lượt chính (gửi / Regenerate / Swipe). Bỏ qua Continue, Impersonate và các lệnh chạy ngầm (MVU, script tóm tắt/bộ nhớ…).

**Phát hiện API treo cần bật streaming** (thử lại khi API lỗi / câu trả lời rỗng thì không cần).

### Cài đặt (extension, khuyên dùng)

1. SillyTavern → **Extensions** (biểu tượng khối xếp chồng) → **Install extension**.
2. Dán `https://github.com/kubi2811/st-auto-regen` rồi cài.
3. Mở mục **Auto-Regenerate on API Hang** trong danh sách Extensions để chỉnh các cài đặt. Nút **English** trong bảng dùng để đổi sang tiếng Anh.

### Cách khác: script Tavern Helper (không có bảng cài đặt)

Tavern Helper → Script → **+ Script**, dán dòng `import` ở phần tiếng Anh phía trên vào Script Content rồi bật. **Không dùng cùng lúc script và extension.**

### Gỡ lỗi

Mở console trình duyệt (F12), tìm các dòng bắt đầu bằng `[AutoRegen]`.

---

## Credits

The empty/short-reply retry is inspired by the Tavern Helper script **"请求失败重试 PVP"** (author unknown). This extension is an independent implementation, not a copy of that code. If you use the extension, disable that script to avoid double retries.
