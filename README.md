# Lode Runner

A recreation of the classic 1983 platformer as an [Omarchy](https://omarchy.org)
shell overlay plugin.

**Status:** v0.1 — title screen only. The game engine (tilemap, runner physics,
brick digging, guard AI, the 150 classic levels) is not built yet.

## Layout

| Path              | Purpose                                              |
|-------------------|-----------------------------------------------------|
| `manifest.json`   | Omarchy plugin manifest (`kind: overlay`)            |
| `LodeRunner.qml`  | Overlay entry point — title screen                   |
| `game/`           | Reserved for engine modules (`.js`)                  |
| `levels/`         | Reserved for level data                              |
| `assets/`         | Reserved for sprite sheets / sound                   |

## Install (dev)

The plugin dir is the real checkout at
`~/.config/omarchy/plugins/gonzo.loderunner`, with a convenience symlink at
`~/Devplex/LodeRunner/loderunner` pointing to it. The real dir has to sit
directly under `~/.config/omarchy/plugins/` — the shell's file watcher
(`inotifywait -r`) does not follow a symlinked plugin dir, so a repo that only
lives in `~/Devplex` never hot-reloads.

```bash
# one-time, already done:
#   git repo at ~/.config/omarchy/plugins/gonzo.loderunner
#   ln -s ~/.config/omarchy/plugins/gonzo.loderunner ~/Devplex/LodeRunner/loderunner
omarchy plugin enable gonzo.loderunner
```

## Run

```bash
omarchy-shell shell toggle gonzo.loderunner
```

Or the bound key: **SUPER + ALT + L** (defined in `~/.config/hypr/bindings.lua`).

## Reload after editing

Saving a `.qml` here triggers the shell's plugin watcher, but the reload
unmounts the overlay — and a fast summon can still race the component cache.
The reliable loop:

```bash
omarchy restart shell          # picks up the edit cleanly (~3s)
omarchy-shell shell toggle gonzo.loderunner
```

## The C64 way

On a Commodore 64 you'd have typed, at the `READY.` prompt:

```
LOAD"*",8,1
RUN
```

`8` = disk drive, `1` = load to the address baked into the file. On cassette it
was just `LOAD` then `RUN`, or **SHIFT + RUN/STOP** to do both at once.
