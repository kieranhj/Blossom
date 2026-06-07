# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Blossom is a tiny C++/OpenGL framework for producing 4K-executable graphics demos for the demoscene. The runtime is a single `main.cpp` plus two GLSL fragment shaders; everything else exists to shrink the final `.exe` (Shader Minifier + Crinkler).

## Build

Solution: `blossom.sln`. Requires Visual Studio 2017+. Build via the IDE or:

```
msbuild blossom.sln /p:Configuration=Debug   /p:Platform=x86
msbuild blossom.sln /p:Configuration=Release /p:Platform=x86
msbuild blossom.sln /p:Configuration=Capture /p:Platform=x86
```

Note: the solution exposes platform `x86`, while the project itself is `Win32` — pass `Platform=x86` when invoking the `.sln`. Output lands in `Debug\blossom.exe` / `Release\blossom.exe` / `Capture\blossom.exe` at the repo root (not inside `blossom\`).

Three configurations, each gated by a preprocessor define set in `blossom.vcxproj`:

- **Debug** (`_DEBUG`) — windowed, GL debug callback enabled, shaders still minified, real `glCompileShader` path with error reporting. Output: `Debug/blossom.exe`.
- **Release** (`RELEASE`) — entry point switches to `WinMainCRTStartup` (no CRT), shader creation uses `glCreateShaderProgramv`, linked through **Crinkler** (`link.exe` in `blossom/` is the Crinkler stub) to produce a compressed sub-4KB binary. Output: `Release/blossom.exe`.
- **Capture** (`CAPTURE`) — non-compressed; runs the accumulator once, reads pixels back, and writes PNG/JPG/raw bin per `config.h` flags, then exits.

There are no tests, no lint, no package manager.

## Shader pipeline

`shaders.targets` (imported as a CustomBuild step) runs `shader_minifier-1.3.6.exe` on every `*.frag` in the project and emits `frag_<name>.h` (e.g. `draw.frag` → `frag_draw.h`). These generated headers define a `*_frag` C-string and a set of `VAR_*` macros for uniform names; `main.cpp` `#include`s them and `#undef`s the shared `VAR_IRESOLUTION` / `VAR_FRAGCOLOR` macros between the two includes so each shader gets its own minified names.

**Important:** the `frag_*.h` files are build artifacts but are tracked in the working tree. Edit `draw.frag` / `present.frag`, not the headers. Building Debug regenerates them.

## Runtime architecture

`main.cpp` is the entire program. Flow:

1. Create a borderless or fullscreen Win32 window, attach a WGL context. No window class is registered — it uses the built-in `0xC018` (`#32770`, dialog) atom as the class name to save bytes.
2. `fbAccumulator` = single `RGBA32F` FBO at canvas resolution.
3. `gShaderDraw` and `gShaderPresent` are compiled from the minified strings.
4. **Accumulator loop**: bind `gShaderDraw`, additive blending (`GL_ONE, GL_ONE`), and repeatedly draw a full-screen quad via `glRecti(-1,-1,1,1)`. Each iteration increments `iFrame`. Loop bound is set by `RENDER_EXACT_SAMPLES` *or* `RENDER_MAX_TIME_MS` (+ optional min/max sample clamps) from `config.h`. Without `RENDER_EXACT_SAMPLES` a `glFinish()` is issued each iteration so wall-clock timing isn't ruined by a deep command queue.
5. **Present**: bind `gShaderPresent`, sample `fbAccumulator` as `accumulatorTex` (texture unit 0), draw to either the default framebuffer (display) or a capture FBO (read back to CPU and write file). In non-capture builds, present loops on `SwapBuffers` until ESC.
6. Exit via `ExitProcess(0)` — no cleanup, deliberate.

Uniforms are bound by explicit `location = 0` / `location = 1` in the shaders, set from C via `glUniform4f` / `glUniform1i` with `kUniformResolution = 0`, `kUniformFrame = 1`, `kSamplerAccumulatorTex = 0`.

`gldefs.h` / `glext.h` provide the GL function pointers; the project links against `opengl32.lib` only and resolves extensions via `wglGetProcAddress` patterns inside those headers (size optimisation — avoids `GetProcAddress` boilerplate).

## Knobs

All user-facing tuning is in `blossom/config.h`. Resolution, sample budget, progressive preview, fullscreen, capture formats, and the `REVISION_RULESET` / `DESPERATE` flags are documented inline in that file and in `README.md`.

## Things to be careful about

- Don't add CRT-dependent code paths to Release without checking — `WinMainCRTStartup` means no global ctors, no `atexit`, no stdio.
- `DESPERATE 1` skips the initial `glClear` and the `PeekMessage` pump; it's a size hack, not a feature toggle. Don't enable it as a default.
- Shader uniform names *must* match the `VAR_*` macros after minification. If you add a uniform, reference it through the macro defined in the generated header.
- `frag_draw.h` / `frag_present.h` regenerate on build but are committed — expect them to show as modified after a Debug build.
