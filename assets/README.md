# Character art

The game loads these four files by name. Keep the filenames exactly as they are.

| File | Shown in game as | Role |
|---|---|---|
| `daniel.png` | Daniel | The face of the game. Moves when unwatched, heads for the right door. |
| `bruno.png` | gut genug | Walks to the left door. |
| `cole.png` | excuse me sir | Walks to the right door. |
| `jett.png` | get in the car | Hides in Pirate Cove, sprints to the left door. |

Display names, roles and tint colours live in `CHARACTERS` at the top of
`js/config.js`. Changing a name there does not require renaming a file.

## How the images are treated

- Pictures with a background (the first three) are shown through a soft oval
  mask, so the face fades into the dark instead of sitting in a hard rectangle.
- `jett.png` has a white background, which is knocked out in the browser so the
  figure stands in the room. If you replace it, use a white or transparent
  background.
- If a file is missing, the game draws a coloured name card in its place and
  stays fully playable.
