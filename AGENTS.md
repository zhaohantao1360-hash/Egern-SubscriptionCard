# AGENTS.md — Egern SubscriptionCard

This repo is the Egern SubscriptionCard widget — a Scriptable widget for Egern iOS that displays subscription traffic info with GitHub Contribution–style data cards.

## Project Structure

- `SubscriptionCard.js` — main entry: `buildMediumWidget`, `buildSmallWidget`, `buildLargeWidget`
- Data layer: `fetchInfo()` → `parseInfo()` → cached with `Keychain`
- UI: Scriptable widget API, no external dependencies
- Config: env variables (`CARD_TYPE`, `PROXY_TYPE`, etc.)

## Agent Rules

### Before editing

1. Read the full file to understand the current architecture
2. Check this file and `PROJECT_RULES.md` for conventions
3. Understand all three widget sizes before modifying shared logic

### Editing

1. **NEVER modify data layer** (`fetchInfo`, `parseInfo`, `Keychain` cache) unless explicitly asked
2. Keep all three widget sizes in sync — `buildMediumWidget`, `buildSmallWidget`, `buildLargeWidget`
3. Use existing color tokens, spacing constants, and layout helpers — don't introduce new ones without reason
4. Always run Node syntax check (`node -c file.js`) after edits
5. Commit messages: `type: description` — e.g. `refactor: v6.0.0 Apple iOS 26 design language`

### Testing

- No test framework; rely on `node -c` syntax check and user feedback from Egern live preview
- Test all three widget sizes if shared code changed

### Memory

- The workspace clone is at `/Users/z/.qclaw/workspace/Egern-SubscriptionCard/`
- Raw URL: `https://raw.githubusercontent.com/zhaohantao1360-hash/Egern-SubscriptionCard/main/SubscriptionCard.js`

## Related

- [PROJECT_RULES.md](./PROJECT_RULES.md)
