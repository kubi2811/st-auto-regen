# Auto-Regenerate on API Hang

*[Tiếng Việt bên dưới](#tiếng-việt)*

A SillyTavern extension that automatically stops and regenerates a reply when the API gets stuck. Comes with a settings panel and an English / Vietnamese interface.

## What it does

- **No text after N seconds** (default 200 s, stuck in "thinking") → stops the generation and regenerates.
- **Stream stalls for N seconds** mid-reply (default 90 s) → stops and regenerates. Only counts once text is already streaming, so long replies that keep flowing are never cut.
- **Max retries per turn** (default 2), then it gives up and shows a notice — no infinite loops, no burned quota.
- A hung **swipe** gets a new swipe (older swipes are kept). A hang right after you send a message regenerates the reply without deleting your message.
- Only watches main chat turns (send / Regenerate / Swipe). Continue, Impersonate and background calls (MVU, memory/summary scripts, etc.) are ignored.

**Requires streaming to be enabled.**

## Install (extension, recommended)

1. SillyTavern → **Extensions** (stacked-blocks icon) → **Install extension**.
2. Paste `https://github.com/kubi2811/st-auto-regen` and install.
3. Open the **Auto-Regenerate on API Hang** panel in the Extensions list to adjust timeouts, retries and language.

Updates arrive through SillyTavern's normal extension updater.

## Alternative: Tavern Helper script (no settings panel)

Tavern Helper → Script → **+ Script**, paste this line into Script Content and enable it:

```js
import 'https://cdn.jsdelivr.net/gh/kubi2811/st-auto-regen@main/auto-regen-on-hang.js'
```

Timeouts are fixed (200 s / 90 s / 2 retries) unless you paste the whole file and edit the constants at the top. **Don't use the script and the extension at the same time.**

## Troubleshooting

Open the browser console (F12) and look for lines starting with `[AutoRegen]`.

---

## Tiếng Việt

Extension cho SillyTavern: tự động dừng và tạo lại câu trả lời khi API bị treo. Có bảng cài đặt và giao diện tiếng Việt / tiếng Anh.

### Chức năng

- **Quá N giây chưa ra chữ** (mặc định 200 giây, kẹt ở thinking) → dừng và tạo lại.
- **Đang viết mà đứng im N giây** (mặc định 90 giây) → dừng và tạo lại. Chỉ tính khi đã bắt đầu ra chữ, nên lượt dài đang chạy đều không bị cắt.
- **Số lần tạo lại tối đa mỗi lượt** (mặc định 2), quá số đó thì dừng và báo — không lặp vô hạn, không đốt quota.
- Swipe bị treo → tạo swipe mới, giữ swipe cũ. Treo ngay sau khi gửi tin → tạo lại câu trả lời, không xoá tin của bạn.
- Chỉ theo dõi lượt chính (gửi / Regenerate / Swipe). Bỏ qua Continue, Impersonate và các lệnh chạy ngầm (MVU, script tóm tắt/bộ nhớ…).

**Cần bật streaming.**

### Cài đặt (extension, khuyên dùng)

1. SillyTavern → **Extensions** (biểu tượng khối xếp chồng) → **Install extension**.
2. Dán `https://github.com/kubi2811/st-auto-regen` rồi cài.
3. Mở mục **Auto-Regenerate on API Hang** trong danh sách Extensions để chỉnh thời gian chờ, số lần thử lại và ngôn ngữ (chọn *Tiếng Việt*).

### Cách khác: script Tavern Helper (không có bảng cài đặt)

Tavern Helper → Script → **+ Script**, dán dòng `import` ở phần tiếng Anh phía trên vào Script Content rồi bật. **Không dùng cùng lúc script và extension.**

### Gỡ lỗi

Mở console trình duyệt (F12), tìm các dòng bắt đầu bằng `[AutoRegen]`.
