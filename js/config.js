/* ===================================================================
   Five Birthdays at Daniel's  --  config
   Every tuning number, the cast, the building and the phone calls.
   =================================================================== */
window.FBAD = window.FBAD || {};

/* ---------------------------------------------------------------
   CHARACTERS  -- rename / re-point images here freely.
   The object keys and image paths are what the engine relies on.
   role:
     'left'  -> walks to the LEFT door   (block with the left door)
     'right' -> walks to the RIGHT door  (block with the right door)
     'dark'  -> only moves while NOT watched on cams (right door)
     'cove'  -> hides in Pirate Cove, sprints the west hall (left door)
   --------------------------------------------------------------- */
FBAD.CHARACTERS = {
  daniel: { name:"Daniel",         role:"dark",  img:"assets/daniel.png", color:"#39c46a",
            tip:"He moves when you look away. And when the power dies." },
  bruno:  { name:"gut genug",      role:"left",  img:"assets/bruno.png",  color:"#9aa0a6",
            tip:"Flick the left light. If he is there, shut the left door." },
  cole:   { name:"excuse me sir",  role:"right", img:"assets/cole.png",   color:"#d98ad0",
            tip:"Flick the right light. If he is there, shut the right door." },
  jett:   { name:"get in the car", role:"cove",  img:"assets/jett.png",   color:"#e0a73c",
            tip:"Watch the Cove. If the curtain is empty, shut the left door." },
};

/* ---------------------------------------------------------------
   ROOMS  -- the 11 cameras.
   rect = room outline on the map, btn = camera button (both in a
   0..100 box).
   --------------------------------------------------------------- */
FBAD.ROOMS = {
  "1A":{ name:"Show Stage",     rect:[36,2,30,11],  btn:[45,4]  },
  "1B":{ name:"Dining Area",    rect:[26,13,50,26], btn:[40,21] },
  "1C":{ name:"Pirate Cove",    rect:[10,34,14,14], btn:[11,37] },
  "5" :{ name:"Backstage",      rect:[6,15,16,14],  btn:[8,18]  },
  "7" :{ name:"Restrooms",      rect:[80,15,16,22], btn:[82,21] },
  "6" :{ name:"Kitchen",        rect:[72,45,24,18], btn:[80,50], audio:true },
  "4A":{ name:"East Hall",      rect:[58,39,10,50], btn:[57.5,58] },
  "4B":{ name:"E. Hall Corner", rect:null,          btn:[57.5,76] },
  "2A":{ name:"West Hall",      rect:[32,39,10,50], btn:[29.5,58] },
  "2B":{ name:"W. Hall Corner", rect:null,          btn:[29.5,76] },
  "3" :{ name:"Supply Closet",  rect:[10,54,14,13], btn:[11,56] },
};
FBAD.CAM_ORDER = ["1A","1B","1C","5","7","6","4A","4B","2A","2B","3"];

/* Routes toward the office. The last node is the door blind spot. */
FBAD.PATHS = {
  left:  ["1A","1B","3","2A","2B","LEFT_DOOR"],
  right: ["1A","1B","7","4A","4B","RIGHT_DOOR"],
  dark:  ["1A","1B","7","4A","4B","RIGHT_DOOR"],
};

/* Where characters stand in each feed: x centre %, bottom %, height %. */
FBAD.SLOTS = {
  "1A":[ {x:50,b:15,h:64}, {x:31,b:15,h:58}, {x:69,b:15,h:58} ],
  "1B":[ {x:30,b:20,h:46}, {x:68,b:24,h:42}, {x:50,b:30,h:34} ],
  "5" :[ {x:54,b:0,h:84} ],
  "7" :[ {x:60,b:6,h:62},  {x:36,b:6,h:56} ],
  "4A":[ {x:50,b:33,h:34}, {x:43,b:28,h:42} ],
  "4B":[ {x:46,b:0,h:96},  {x:66,b:0,h:82} ],
  "2A":[ {x:50,b:33,h:34} ],
  "2B":[ {x:52,b:0,h:96} ],
  "3" :[ {x:50,b:0,h:90} ],
};

/* Per-night A.I. levels (1..20). Higher moves more often. */
FBAD.NIGHT_AI = {
  1:{ daniel:0,  bruno:0,  cole:0,  jett:1 },
  2:{ daniel:1,  bruno:3,  cole:1,  jett:2 },
  3:{ daniel:2,  bruno:4,  cole:5,  jett:4 },
  4:{ daniel:3,  bruno:6,  cole:6,  jett:6 },
  5:{ daniel:5,  bruno:9,  cole:8,  jett:9 },
  6:{ daniel:10, bruno:13, cole:12, jett:13 },
};

/* ---------------------------------------------------------------
   TUNING
   --------------------------------------------------------------- */
FBAD.TUNE = {
  HOUR_MS: 50000,        // real ms per in-game hour
  MOVE_MS: 4800,         // ms between movement rolls
  POWER_TICK_MS: 480,    // power drain cadence
  DRAIN_BASE: 0.05,      // per tick with nothing on
  DRAIN_PER_USE: 0.06,   // per tick for each door / light / monitor
  PAN_SPEED: 1.5,        // office pan, screens per second at full tilt
  PAN_DEAD_ZONE: 0.3,    // middle share of the screen where the view rests
  PAN_RANGE: 33.333,     // % of the office width the view can travel
  SWIPE_PX: 70,          // vertical drag needed to flip the monitor
  CAM_BLACKOUT_MS: 900,  // feed drops out when someone moves
  POWEROUT_SONG_MS: [5000, 10000],
  POWEROUT_DARK_MS: [2000, 5000],
};

/* ---------------------------------------------------------------
   PHONE CALLS  -- one per night, typed out line by line.
   --------------------------------------------------------------- */
FBAD.CALLS = {
  1:[
    "Hello? Hello, hello? Uh, welcome to Daniel's Birthday Emporium. Night shift. Congrats.",
    "Quick tour. Cameras: swipe up, or touch the bar at the bottom of your screen.",
    "Door and light buttons are on your left and right. Light first, door second.",
    "Everything eats power. Doors, lights, cameras. Run dry and, well. Don't run dry.",
    "The entertainers wander after close. If one is at your door, shut it.",
    "And Daniel only moves when nobody is looking. So, you know. Look.",
    "Six AM and you're done. You'll be fine. Probably.",
  ],
  2:[
    "Uh, hey, night two. Told you it was fine.",
    "One thing I skipped. The curtain in Pirate Cove.",
    "The fella back there gets restless if nobody checks on him.",
    "If that curtain is ever open and empty, left door. Fast. Don't look, just shut it.",
    "Okay. Have a good one.",
  ],
  3:[
    "Night three. Most people don't last this long. Quit, I mean. Most people quit.",
    "They get livelier from here, so go easy on the power.",
    "If the lights go out, play dead. Sometimes he just sings and leaves.",
    "Sometimes.",
  ],
  4:[
    "Hey. Uh. Night four. Good for you.",
    "Listen, I might not be able to call tomorrow.",
    "There's been some knocking at my door for a while now.",
    "Could you check on the party hats in the back room some time? I always wondered what was in there.",
    "Oh. Oh no.",
  ],
  5:[
    "h a p p y   b i r t h d a y",
    "it is always somebody's birthday",
    "t o n i g h t   i t   i s   y o u r s",
  ],
};

/* Newspaper ad shown on New Game. */
FBAD.AD = {
  head: "HELP WANTED",
  venue: "Daniel's Birthday Emporium",
  body: [
    "Family party venue seeks night security guard for the 12 AM to 6 AM shift.",
    "Monitor cameras. Ensure safety of equipment and entertainers.",
    "Not responsible for injury, dismemberment or missing cake.",
  ],
  pay: "$120 a week",
};
