# Five Birthdays at Daniel's

A browser game built from scratch in plain HTML / CSS / JavaScript — a
parody recreation of the classic "survive five nights as a night guard"
gameplay loop, starring **Daniel** as the face of the game.

> All UI, art and sound in this project are **original** (CSS-drawn office,
> CSS-drawn camera/monitor, WebAudio-generated sound effects). No copyrighted
> game assets are bundled. Game *mechanics* are not copyrightable; this is a
> clean-room reimplementation. The four character images are your own.

## Play

Just open `index.html` in any modern browser. No build step, no server needed.

```
index.html        # all screens (menu, office, cameras, win, game over)
css/style.css     # original office / camera / menu styling
js/game.js        # the full game engine
assets/           # drop your 4 character images here (see assets/README.md)
```

## The monsters

| Character | Role (classic equivalent) | How to survive it |
|-----------|---------------------------|-------------------|
| **Daniel** | The mascot / dark mover, right door (Freddy) | Only moves while you're **not** watching him on the cameras. If the power dies, he comes for you. |
| **Bruno**  | Left-door stalker (Bonnie) | Flick the **left light**; if he's there, slam the **left door**. |
| **Cole**   | Right-door stalker (Chica) | Flick the **right light**; if he's there, slam the **right door**. |
| **Jett**   | Pirate Cove sprinter (Foxy)| Keep checking **CAM 1C (Pirate Cove)**. Ignore him and he sprints the west hall — close the **left door** fast. |

## How to play

Survive from **12 AM → 6 AM** on each of 5 nights (beat night 5 to unlock a 6th bonus night).

- **Cameras** — click the **CAMERAS** bar at the bottom (or press **Space**) to pull up the monitor and track monsters on the map.
- **Doors** — close a door to block a monster standing just outside it.
- **Lights** — flick a door light to peek at the blind spot beside that door.
- **Power** — each closed door, lit light and the monitor itself drains power faster (watch the usage bars). At **0%** you go dark and defenceless.

### Controls

| Action | Mouse | Keyboard |
|--------|-------|----------|
| Look left / right | move mouse to screen edge / click side | `A` / `D` (or arrows) |
| Toggle cameras | CAMERAS bar | `Space` |
| Left / right door | DOOR buttons | `Q` / `E` |
| Left / right light | LIGHT buttons | `Z` / `C` |

## Customizing

Everything about the characters — names, image files, role, and fallback
color — lives in the `CHARACTERS` object at the top of `js/game.js`. Per-night
difficulty is in `NIGHT_AI`. See `assets/README.md` for the image filenames.
