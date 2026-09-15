# Project cleanup — 15 September 2026

124 obsolete files (76,958,395 bytes, approximately 77 MB) were moved out of the project to:

`/Users/Mark/Documents/Code Projects/cutitout-marketing-archive-2026-09-15`

Nothing in this cleanup was permanently deleted. The archive mirrors each original relative path and contains `manifest.json` with exact paths, file sizes and SHA-256 checksums. Every moved file was checked before and after the move. To restore a file, copy it from its mirrored path in the archive back into the project; do not overwrite a newer file without reviewing it.

## Removed from the active project

- Previous test homepage and retired guide preview/subpage files, plus their no-longer-used browser redirect script.
- Superseded Blender experiments, their unused exported models and renders, proof images, incomplete video/frame outputs and `.blend1` backups.
- Unused old guideline/material/service illustrations, redundant assets, the retired design-centre stylesheet and obsolete image-slot instructions.
- Finder metadata and Python caches outside `.git`.

## Kept deliberately

- All current public pages at their standard addresses. Existing app links to those addresses continue to target the redesigned pages after marketing deployment; no old HTML pages are needed.
- Current Blender masters: `manufacturing-journey-cinematic.blend`, `visual-guidelines.blend`, `services-visual.blend`.
- Their build scripts and dependencies, including `build_cut_it_out_journey.py` and the logo image used by the cinematic builder.
- All 480 active homepage film frames and 36 stencil-animation frames, current images, the existing homepage background video and social-preview assets.
- The app integration header, useful standalone header preview, app outage page, tests and current documentation.
- `.git` and existing unrelated working-tree changes. Previously deleted files were not restored or otherwise changed.
- Optional server redirect rules in `_redirects`; these are not old page files.

Header/link scripts no longer refer to the removed test homepage. `.gitignore` now prevents new Finder files, Python caches and Blender backup files from being added accidentally; already-tracked metadata may still appear as deletions until the cleanup is committed.

Run `node --test tests/*.test.cjs` to verify references, routes, dynamic frame sets and interactions. No deployment was performed.

## Pre-commit tidy-up

Three unused workshop portrait versions, three image-generation working notes and five Finder metadata files were moved into the existing archive's `pre-commit-cleanup` folder. Portraits are in `portraits/`, notes in `notes/`, and metadata retains its original relative paths under `metadata/`. They remain recoverable; no active website assets were removed.

The current homepage portrait is `static/img/company/workshop-team.webp`; the Company page retains `static/img/company/family-workshop-final.webp`. Current Blender masters, their builders and all automated tests remain in the project.
