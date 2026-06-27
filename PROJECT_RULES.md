# PROJECT_RULES.md — Egern SubscriptionCard

## Architecture

### Data Flow

```
Egern App → fetchInfo() → parseInfo() → Keychain cache → Widget render
```

- **Data Layer**: `fetchInfo()` / `parseInfo()` — DO NOT MODIFY unless explicitly requested
- **Cache Layer**: `Keychain.set/get` — survives widget refresh cycles
- **UI Layer**: Scriptable `ListWidget` API — `buildMediumWidget`, `buildSmallWidget`, `buildLargeWidget`

### Environment

- Runtime: **Egern iOS** (Scriptable-compatible widget engine)
- API: **Scriptable ListWidget** — `addText`, `addStack`, `addImage`, gradients, `LinearGradient`
- No DOM, no React, no npm — pure JavaScript in a sandboxed context

## UI Conventions

### Design System

- **Background**: `#0A0A14` (deep dark)
- **Accent**: `#00D4FF` (cyan)
- **Font**: System font, various weights (`bold`, `semibold`, `regular`, `medium`, `thin`)
- **Spacing**: 8px base unit
- **Border radius**: `CornerRadius` 12–16px for cards, 8px for inner elements
- **Glassmorphism**: dark blur backgrounds with subtle border luminance

### Widget Sizes

| Size | Primary Element | Secondary | Info Cards |
|------|----------------|-----------|------------|
| Small | 42pt remaining traffic | 6pt progress bar | Emoji status badge |
| Medium | 38pt remaining traffic | 64pt progress ring (percent only) | 3-column cards (plan/used/expiry) |
| Large | contribution heatmap grid (4×5) | clock + traffic cards | 2-column metric grid |

### Color Tokens (script-level constants)

```js
const Colors = {
  bg: '#0A0A14',
  accent: '#00D4FF',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  gray: '#1C1C1E',
  gray2: '#2C2C2E',
  green: '#30D158',
  yellow: '#FFD60A',
  red: '#FF453A',
}
```

### Status Indicators

- 🟢 充足 (>30 days or >40% remaining)
- 🟡 偏低 (7–30 days or 20–40%)
- 🔴 告急 (<7 days or <20%)

## Coding Standards

### JavaScript

- ES6+ but no modules (no `import`/`export` — Scriptable limitation)
- `let`/`const`, no `var`
- Arrow functions preferred
- Semicolons required
- Single quotes for strings

### Widget Components

Each widget size is a standalone function returning `ListWidget`:

```js
function buildMediumWidget(info) { /* ... */ }
function buildSmallWidget(info) { /* ... */ }
function buildLargeWidget(info) { /* ... */ }
```

### Commit Convention

```
type: description

<type> = feat | refactor | fix | style | docs | chore
```

Examples:
- `refactor: v6.0.0 Apple iOS 26 design language`
- `fix: string syntax error in large widget`
- `feat: add contribution heatmap to large widget`

## Versioning

- Versions are tracked in commit messages with `v{major}.{minor}.{patch}` prefix
- Major: design language changes
- Minor: new features / component additions
- Patch: bug fixes, minor tweaks

## Publishing

- Single file: `SubscriptionCard.js` pushed to `main` branch
- Raw URL: `https://raw.githubusercontent.com/zhaohantao1360-hash/Egern-SubscriptionCard/main/SubscriptionCard.js`
- Users configure this URL in Egern widget settings
- Widget re-renders on Egern refresh cycle; no hot reload

## Anti-Patterns

- ❌ Modifying data parsing logic without explicit request
- ❌ Introducing npm dependencies or modules
- ❌ Breaking backward compatibility for existing widget URLs
- ❌ Adding configuration via widget params (use env variables only)
