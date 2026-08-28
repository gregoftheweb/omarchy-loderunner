# Lode Runner

A recreation of the classic 1983 platformer as an [Omarchy](https://omarchy.org)
shell overlay plugin.

**Status:** v0.3 — run, climb ladders, cross ropes, dig holes to trap the
guards, collect all the gold to reveal the exit, climb out the top. Five
lives; a death resets the level. All 150 classic levels.

A guard that falls into a hole coughs up any coin it was carrying onto the
lip — dash across the top of the trapped guard and you can pinch it back.
Guards always climb out, never drop into the same hole twice, and can grab
the coin again on the way past. **Not yet:** score, sound, an authentic
guard-AI algorithm, a level-select menu.

## Controls

| Key | Action |
|-----|--------|
| `←` `→` / `A` `D` | run |
| `↑` `↓` / `W` `S` | climb ladders / drop off ropes |
| `Z` `X` | dig left / right |
| `Space` | start (title) · next level (after LEVEL CLEAR) · title (after GAME OVER) |
| `R` | restart the level |
| `Esc` | back to the title · `Esc`/`Q` on the title closes the overlay |

## Layout

| Path                | Purpose                                                  |
|---------------------|---------------------------------------------------------|
| `manifest.json`     | Omarchy plugin manifest (`kind: overlay`)                |
| `LodeRunner.qml`    | Overlay window + cabinet chrome + key routing + screen SM |
| `TitleScreen.qml`   | Title screen (visual only)                               |
| `Playfield.qml`     | Renders a level, runs the loop, feeds input to the engine |
| `PixelSprite.qml`   | ASCII-bitmap sprite (name avoids `QtQuick.Sprite`)       |
| `game/tiles.js`     | Tile codes + the level charset                           |
| `game/level.js`     | `parse(text)` → structured level                         |
| `game/engine.js`    | Pure rules: `createState(level)`, `tick(state, input)`   |
| `game/levels.js`    | Ordered list of level files                              |
| `game/sprites.js`   | Runner / guard pixel-bitmap poses                        |
| `levels/*.txt`      | ASCII levels — `#` brick `@` concrete `H` ladder `-` rope `X` false brick `$` gold `&` player `0` guard `S` hidden exit ladder |

The engine (`game/*.js`) is plain JS with no QML dependency, so it runs
headless. Tests:

```bash
node test/mechanics.mjs   # dig / hole / guard unit checks
node test/solve.mjs       # load + run all 150 levels, assert no crash
node test/lint.mjs        # per-level structure + reachability lint
```

`test/lint.mjs` currently reports no structural failures and 8 levels with a
piece of gold its (deliberately generous) movement flood can't trace a route
to — `023 025 030 049 059 080 115 139`. These are the unmodified classic
levels; the gold there needs a dig route the flood doesn't model. A real
brute-force solver is a separate, much larger job (Lode Runner solving is
PSPACE-hard).

## Install

Plugin id: **`com.columbiafoundry.loderunner`**. Clone (or symlink) this repo
into the Omarchy plugin dir and enable it:

```bash
ln -s /path/to/loderunner ~/.config/omarchy/plugins/com.columbiafoundry.loderunner
omarchy plugin enable com.columbiafoundry.loderunner
```

This repo is developed at `~/Devplex/LodeRunner/loderunner` and symlinked into
`~/.config/omarchy/plugins/`. Hot-reload of the QML across a symlinked plugin
dir is unreliable — after editing, `omarchy restart shell` picks the change up
cleanly (~3s).

## Run

```bash
omarchy-shell shell toggle com.columbiafoundry.loderunner
```

Or the bound key: **SUPER + ALT + L** (defined in `~/.config/hypr/bindings.lua`).

## The C64 way

On a Commodore 64 you'd have typed, at the `READY.` prompt:

```
LOAD"*",8,1
RUN
```

`8` = disk drive, `1` = load to the address baked into the file. On cassette it
was just `LOAD` then `RUN`, or **SHIFT + RUN/STOP** to do both at once.

## License

MIT — see [LICENSE](LICENSE). An unofficial fan recreation; not affiliated with
the rights holders of the original *Lode Runner*.
