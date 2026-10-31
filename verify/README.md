# Verification tooling

These scripts live outside `web-app/` because they validate the app against the original
source files in this directory. They are not part of the deployable project.

| Script | Purpose |
| --- | --- |
| `verify_render.py` | Fetches the running storefront, renders it, and asserts structural parity with `You-Cosmetics.html` (38 products, 56 variant chips, 8 filters, RTL, fonts, sections, no leaked price file). Exits non-zero on any failure. |
| `scan_mojibake.py` | Walks `web-app/` source and flags UTF-8 Arabic that was corrupted by a Latin-1 round-trip, plus stray BOMs. |
| `strip_bom.py` | Removes UTF-8 BOMs from `web-app/` source files. |
| `extract_logic.py` | Pulls categories, images, and feature/testimonial/story data out of the prototype HTML. |
| `inspect_ids.py` / `slice_ui.py` | One-off inspection helpers used while reverse-engineering `products_from_html.json`. |
| `dump_html.py` | Scratch script for inspecting specific parts of the rendered HTML. |

Run against a live server:

```powershell
$env:PYTHONIOENCODING="utf-8"
python verify/verify_render.py
```

> Never round-trip source files through PowerShell `Get-Content` / `Set-Content` — that
> silently mangles Arabic text. Use a proper editor or the agent's file tools.
