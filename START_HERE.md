# Blossom: start here

A fork of yx's (lunasorcery) Blossom, a tiny C++/OpenGL framework for 4K executable-graphics demoscene entries (Windows, Visual Studio + Crinkler). The user's branch has grown a BBC Micro side project: photo stippling, as a 4 KB and a 256-byte BBC Master intro.

| | |
|---|---|
| GitHub | https://github.com/kieranhj/Blossom (public, fork) |
| Upstream | https://github.com/lunasorcery/Blossom (remote `upstream`; last commit 2025-12-21) |
| Local path | D:\misc\mine\Blossom (moved from C:\Users\khcon\OneDrive\Projects\Blossom on 2026-11-21) |
| Branch | `claude/stipple-4kb-graphics-3ddvkk` (stipple work); other branches: `main`, `wip/2026-11-tidy` |
| Last commit | 2026-06-11: build_256.sh: convert image + stipple.py passthrough + honest size report |

## What's in here
- `blossom/`: the framework: `main.cpp`, `draw.frag` / `present.frag`, `config.h`, Crinkler (`link.exe`) and Shader Minifier. `blossom.sln` at the top.
- `bbc/`: BBC Micro stipple player: `stipple.asm` (4 KB, MODE 4, zx02-packed dots), `stipple256.asm` (256-byte Master intro), `.ssd` outputs, `data/`, `build.sh` / `build_256.sh` (bash).
- `tools/`: `stipple.py` (photo to stipple data), `stipple_ui.py`, LFSR search/coverage scripts, `verify_bbc.py`; `tools/README.md`. `tools/beebasm.exe` is a local, gitignored copy.
- `docs/`: `STIPPLE.md`, `STIPPLE-256.md`, `STIPPLE-256-LFSR.md` (design notes).
- `pics/`: source images; `refs/`, `captures/`, `stipple_out/`, `out_lfsr/`: local material and outputs.

## Build and run
- `make`: assembles `bbc\stipple.ssd` and `bbc\stipple256.ssd` with `tools\beebasm.exe` from the existing data, then builds `Release\blossom.exe` with msbuild (VS 18, Crinkler). Other targets: `make bbc`, `make exe`, `make debug`, `make capture`, `make help`.
- Regenerating the BBC data from an image needs the bash scripts (Git Bash): `bbc/build_256.sh <image>` (Python + numpy/scipy/pillow); `bbc/build.sh` also needs a `zx02` binary.
- Run the `.ssd` in a BBC emulator (b2 / beebjit / jsbeeb), as a Master for `stipple256`. `Release\blossom.exe` opens a fullscreen/borderless window; ESC quits.
- A Debug build regenerates the tracked `blossom/frag_*.h`, so expect them to show as modified.

## Local changes
- Current branch is 22 commits ahead of `upstream/main`. `main` holds a different line: a "tide-pool at dusk" scene and capture presets (2026-06-07/08), not merged into the stipple branch (they split at "CAPTURE_PREVIEW toggle").
- `wip/2026-11-tidy` (pushed): snapshot of 8 untracked images in `pics/` from the 2026-11 tidy.
- Uncommitted now: the same 8 untracked `pics/*.png`.

## Status and next steps
- Last work (2026-06-10/11): squeezing `stipple256` (239/256 bytes), MODE 0 experiments then back to MODE 4, and a `build_256.sh` size report. See `docs/STIPPLE-256.md` and `docs/STIPPLE-256-LFSR.md` for the approach and open ideas.
- Decide whether `main` (tide-pool scene) and the stipple branch should be merged or kept apart.

## See also
- README.md (framework), CLAUDE.md (build and architecture notes), tools/README.md, docs/.
