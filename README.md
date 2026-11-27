# Five Birthdays at Daniel's

You are the night guard at Daniel's Birthday Emporium. Watch the cameras, mind
the power, shut the doors, and make it from 12 AM to 6 AM.

A fan-made parody of the classic "five nights" night-guard formula, written
from scratch in plain HTML, CSS and JavaScript. Every room, texture and sound
is generated in code. The only image files are your four character pictures.

## Play

Open `index.html` in a browser. No build step and no server.

## Controls

| Action | Mouse / touch | Keyboard |
|---|---|---|
| Look around | Move to the left or right side of the screen | A / D or arrow keys |
| Camera monitor | Swipe up to raise, swipe down to drop, or touch the bar at the bottom | Space |
| Left door / light | DOOR and LIGHT buttons on the left | Q / Z |
| Right door / light | DOOR and LIGHT buttons on the right | E / C |
| Pause | The II button at the top | Esc |
| Mute | Speaker button on the menus | M |
| Skip to 6 AM (debug) | | C + D + Numpad + |

## The cast

| Character | How it hunts | How to stop it |
|---|---|---|
| **Daniel** | Only moves while nobody is watching him on the cameras. Comes for you when the power dies. | Keep finding him on the cameras. Shut the right door when he is close. |
| **gut genug** | Walks to the left door. | Flick the left light. If he is there, shut the left door. |
| **excuse me sir** | Walks to the right door. | Flick the right light. If he is there, shut the right door. |
| **get in the car** | Creeps out of Pirate Cove when it is not watched, then sprints the west hall. | Check CAM 1C. If the curtain is open and empty, shut the left door. |

## Nights

- Nights 1 to 5, then a Bonus Night.
- Beating the Bonus Night unlocks **Custom Night**, where you set each
  character's A.I. level from 0 to 20. All four at 20 is "4/20 mode".
- Stars on the menu mark the week, the Bonus Night and 4/20 mode.

## Files

```
index.html       all screens
css/style.css    every visual, drawn in CSS
js/config.js     tuning numbers, characters, rooms, phone calls
js/audio.js      Web Audio sound engine
js/fx.js         static, dust, confetti, screen shake
js/game.js       game loop, cameras, A.I., screens
assets/          the four character images (see assets/README.md)
DESIGN.md        art and sound direction
```

To rename a character or retune the game, edit `js/config.js`.
