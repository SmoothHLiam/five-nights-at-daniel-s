# Character art

Drop your four images here with these exact filenames. The game loads them
automatically. **Until a file is present, the game shows a generated colored
name-card in its place — so everything is fully playable right now without art.**

| File              | Character | Role in the game (original equivalent) | Image you attached            |
|-------------------|-----------|----------------------------------------|-------------------------------|
| `daniel.png`      | **Daniel**| The face / dark mover, right door (Freddy) | The green-glowing character (image 1) |
| `bruno.png`       | **Bruno** | Left-door stalker (Bonnie)             | The man with glasses (image 2) |
| `cole.png`        | **Cole**  | Right-door stalker (Chica)             | The smiling man (image 3)      |
| `jett.png`        | **Jett**  | Pirate Cove sprinter (Foxy)            | The hat character (image 4)    |

## Tips for best results
- Transparent-background PNGs look best (the office/cameras show through),
  but solid JPGs work fine too — just save them as e.g. `daniel.png`.
- Tall portrait crops (head + shoulders) fill the doorway and jumpscare frame best.
- Want different names/roles/colors? Edit the `CHARACTERS` object at the top of
  `js/game.js` — names, image paths, roles (`left`/`right`/`dark`/`cove`) and the
  fallback tint color are all configurable there.
