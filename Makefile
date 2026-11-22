# Wrapper so that `make` works from PowerShell / Windows Terminal.
# GNU make runs recipes with cmd.exe here (no sh on PATH), so the bash
# scripts in bbc\ are not used: this assembles the BBC demos directly with
# the existing data (no image conversion), and builds the 4K exe via msbuild.
# See START_HERE.md.

BEEBASM = ..\tools\beebasm.exe
MSBUILD ?= C:\Program Files\Microsoft Visual Studio\18\Community\MSBuild\Current\Bin\MSBuild.exe

.PHONY: all bbc exe debug capture help
all: bbc exe

bbc:
	cd bbc && $(BEEBASM) -i stipple.asm -do stipple.ssd -boot STIPPLE
	cd bbc && $(BEEBASM) -i stipple256.asm -do stipple256.ssd -boot STIP256
	@echo Built bbc\stipple.ssd and bbc\stipple256.ssd

exe:
	"$(MSBUILD)" blossom.sln /nologo /v:minimal /p:Configuration=Release /p:Platform=x86

debug:
	"$(MSBUILD)" blossom.sln /nologo /v:minimal /p:Configuration=Debug /p:Platform=x86

capture:
	"$(MSBUILD)" blossom.sln /nologo /v:minimal /p:Configuration=Capture /p:Platform=x86

help:
	@echo make          - bbc + exe
	@echo make bbc      - assemble bbc\stipple.ssd and bbc\stipple256.ssd (tools\beebasm.exe, existing data)
	@echo make exe      - msbuild Release (Crinkler-compressed) to Release\blossom.exe
	@echo make debug    - msbuild Debug to Debug\blossom.exe
	@echo make capture  - msbuild Capture to Capture\blossom.exe
	@echo make help     - this list
	@echo To regenerate image data use bbc\build.sh / bbc\build_256.sh from Git Bash.
