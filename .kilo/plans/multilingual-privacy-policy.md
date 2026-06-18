# Plan: Multilingual Privacy Policy (croc/privacy-policy.html)

## Goal
Add a language selector row of checkboxes at the top of the page, persist only the **checkbox states** in localStorage (not translations), and render each paragraph in every selected language. Default selection: only `zh-CN`. Add an author section.

## Languages & behavior
- Checkboxes (in order): `en-US`, `tr-TR`, `ja-JP`, `zh-CN`, `ru-RU`.
- All five languages are always present in the DOM; checkboxes control visibility (show/hide), not existence.
- States persisted under a single localStorage key, e.g. `crocson.privacy.langs` = JSON object `{ "en-US": false, "tr-TR": false, "ja-JP": false, "zh-CN": true, "ru-RU": false }`. Only checkbox states are stored — no translations.
- Default (when nothing stored): only `zh-CN` checked.
- English is the source content; the existing English copy is reused verbatim for the `en-US` block.

## Implementation approach
Rewrite `croc/privacy-policy.html` as a single self-contained file. **Render-once strategy** (per user request): all languages are emitted into the DOM exactly once; unselected languages are hidden via CSS (`display:none`), toggled by the checkboxes. No re-rendering/translation of text on checkbox change — only show/hide. Only checkbox states are persisted.

1. **Keep the existing CSS**; add styles for the language bar, per-language badge, and the show/hide rule.
2. **Language bar** at the top of `<article class="policy">` (above `<h1>`), a single flex row of `<label><input type="checkbox" value="xx-XX"> <code>xx-XX</code></label>` items.
3. **Content emitted in DOM** (not data-driven): for each section, output one paragraph block per language. Each block is e.g.
   `<div class="lang-block" data-lang="zh-CN"><span class="badge">zh-CN</span><p>…</p></div>`
   English text copied from the current file; zh-CN, ru-RU, ja-JP, tr-TR are pre-translated inline.
4. **Show/hide logic** (CSS-first):
   - Default CSS: `.lang-block { display: none; }`
   - A `<style id="lang-style">` element holds a rule like
     `.lang-block[data-lang="zh-CN"] { display: block; }` for each selected language.
   - On checkbox `change`: rebuild that single `<style>` element's content from the checked set. No translation/templating needed — purely CSS toggle. Cheap and robust. If the checked set is empty, fall back to `zh-CN` (visible set = `checked || ['zh-CN']`).
5. **Persistence** (checkbox states only — per user clarification):
   - Key: `crocson.privacy.langs` = JSON object `{ "en-US": false, "tr-TR": false, "ja-JP": false, "zh-CN": true, "ru-RU": false }`.
   - On `DOMContentLoaded`: read states; if missing, use default (only `zh-CN`); set checkbox `.checked`; rebuild the `<style>` rule.
   - On checkbox `change`: write states to localStorage; rebuild the `<style>` rule.
6. **Author section** (per user decision — per-language): new `<h2>Author</h2>` section near the end, with one `.lang-block` per language. Content = author name **Konstantin Abakumov** plus a short per-language sentence. Hidden/shown like all other blocks.

## Decisions (confirmed with user)
- Author section: **per-language** (translated prose around the name, rendered for each selected language).
- Language label: **muted badge** above each translation block.
- Title `<h1>` and meta lines: **English-only**, not multilingual.

## Sections to translate (keys)
intro, data_collection, data_storage, data_transmission_1, data_transmission_2, data_transmission_3, third_party, data_subject_rights, children, changes, contact (+ headings + author).

## Empty-selection fallback
If the user unchecks **all** languages, fall back to showing only `zh-CN` (the default). The checkboxes stay unchecked, but the `zh-CN` block is shown via the style rule. I.e. the visible set is `selected || { zh-CN }`.

## Open question
None — all resolved.
