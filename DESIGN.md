# Design direction: Five Birthdays at Daniel's

Read this before changing how the game looks, sounds or feels.

## Brief

- **Core verb:** watch, then block. You look through cameras, flick a light, slam a door. The twist on the formula is the setting: a cheap birthday venue after closing, so every horror beat is dressed as a party (bunting, cake, party horns, a music box playing "Happy Birthday" when the power dies).
- **Feel reference:** the first Five Nights game. Heavy steel doors, a buzzing CRT, one bad ceiling lamp. Nothing is smooth or friendly. Controls are instant, the world is slow.
- **Art direction:** everything is drawn in CSS and inline SVG, no stock art. Boxy industrial shapes, hand-taped paper, grime on every surface. One lighting mood: a single warm lamp that flickers, with everything else falling off to black.
- **Camera:** the office is wider than the screen and pans with the mouse (eased, never snapped). Camera feeds drift left and right on their own, like a motorised security camera.
- **Sound:** all generated with Web Audio. A fan hum you stop noticing, footsteps panned to the side they come from, a stinger when the light finds someone, a party horn at 6 AM.
- **First 30 seconds:** the phone rings. A tired voice walks you through cameras, doors, lights and power while you try them. No modal tutorial.

## Palette

| Token | Value | Used for |
|---|---|---|
| `--soot` | `#07080a` | The dark. Most of the screen, most of the time. |
| `--wall` | `#2b261f` | Office walls, paper, wood. Warm and dirty. |
| `--amber` | `#e8b04a` | Lamp light, door lights, the venue's branding. |
| `--blood` | `#b3261e` | Door-closed state, REC dot, danger. Nothing else. |
| `--ecto` | `#58e08a` | Daniel's glow and the active camera. Used sparingly so it reads as "him". |
| `--phosphor` | `#d6dcd4` | Security-system text. |
| `--paper` | `#d9cfb6` | Posters, drawings, the newspaper. |

## Type

- **VT323** for anything the security system says (HUD, cameras, menus). It is the guard's world.
- **Luckiest Guy** for anything the venue says (posters, bunting, the job ad). It is cheerful, which is why it is unsettling here.
- Both fall back to system fonts when offline.

## Motion rules

Motion only where it tells the player something or sells the place:

- Doors slam fast and shake the screen. They open slower.
- The monitor flips up from the bottom edge.
- Static bursts on every camera switch, and feeds cut out when someone moves.
- The lamp flickers, the fan spins, dust drifts. Those three are the only idle motion in the office.
- `prefers-reduced-motion` turns off shake, twitching and drift.

## Where things live

- `js/config.js` holds every tuning number, the characters, the rooms and the phone calls.
- `js/audio.js` is the sound engine. `js/fx.js` is static, dust and confetti.
- `js/game.js` is the game loop and screens.
- `css/style.css` reads every colour from the tokens at the top of the file.

Character art is loaded from `assets/` by filename. Do not rename those files.
