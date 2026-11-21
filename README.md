# TabPulse

> **Zero-Flicker Multi-Window Tab Search, Dedupe & Auto-Grouper**

A fast, privacy-first Chrome Manifest V3 extension built by **ARIS PARTY LLC** to outperform **Tab Manager Plus** (`cnkdjjdmfiffagllbiiilooaoofcoeff`, 200K+ users, 4.5★).

## Competitive Advantages
- Replaces Tab Manager Plus (200K users, 4.6MB React bundle with v7.0.0 flashing/search bugs)
- 75x smaller pure-DOM popup with zero horizontal shift or flicker
- Auto-scrolls directly to active tab and supports instant keyboard search on popup open
- Built-in native Chrome Tab Groups auto-organizer

## Free vs TabPulse Pro
### Free
- Instant flicker-free fuzzy search across all open Chrome windows and tabs
- Automatically highlights and scrolls directly to your active tab
- 1-click Deduplicate Tabs across all windows
- Window & domain grouping view with quick switch, pin, mute, and close buttons
- Keyboard-first navigation (Arrow keys + Enter + Delete)

### Pro (Monetized via Stripe)
- 1-click Smart Auto-Group tabs by domain into native Chrome Tab Groups
- Bulk regex filter to close, pin, or move matching tabs to a new window
- Per-window tab limit alerts & stale-tab spotlight
- Export open workspace tabs as Markdown or JSON

| Plan | Price | Stripe Product / Price ID | Live Checkout Link |
|---|---|---|---|
| Monthly | $2.99/mo | `price_1UeE3LFtqvN4GZH3h4ljsBv5` | [Checkout](https://buy.stripe.com/aFaeVdcbJ1dvbqn8mKg3606) |
| Yearly | $19.99/yr | `price_1UeE4GFtqvN4GZH3N5OwC19v` | [Checkout](https://buy.stripe.com/7sY9ATb7F3lD0LJfPcg360g) |
| Lifetime | $29.99 one-time | `price_1UeE5TFtqvN4GZH3mQbBCFN8` | [Checkout](https://buy.stripe.com/5kQfZh5Nl9K11PN46ug360q) |

- **Stripe Product ID:** `prod_VfZAbATt9W00ig`

## Local Installation (Chrome)
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select this repository root

## Verification & Chrome Web Store Packaging
```bash
node tests/verify.mjs .
```
Outputs a store-ready archive at `dist/tabpulse-extension-v1.0.0.zip`.
