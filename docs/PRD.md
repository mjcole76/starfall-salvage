# PRD — Starfall Salvage: Tactical Descent

**Working title:** Starfall Salvage: Tactical Descent  
**Status:** Source of truth for product direction and MVP scope  
**Stack:** Three.js, browser-first, TypeScript preferred  

---

## 1. Product summary

Starfall Salvage: Tactical Descent is a browser-based sci-fi mission game built with Three.js. The player controls a jetpack-equipped salvage pilot from an angled top-down view, moving across a hostile desert planet to recover energy cores, avoid hazards, and reach extraction before a storm overwhelms the mission.

The game is designed to be:

- **readable**
- **stable**
- **visually atmospheric**
- **fast to start**
- **contest-finishable**

This version is intentionally built around a safer, clearer format than a complex third-person traversal sim.

---

## 2. Core pitch

A top-down sci-fi jetpack salvage mission game where you cross a hostile desert world, recover valuable energy cores, manage fuel, and extract before the storm closes in.

---

## 3. Why this version

This format is the right one because it:

- removes unstable third-person controller complexity
- keeps the jetpack planet fantasy
- makes objectives and hazards easier to read
- gives you more time for polish
- still allows strong Three.js visuals

---

## 4. Player fantasy

You are an off-world salvage pilot dropped into a dangerous mission zone on a dead frontier planet.

You are here to:

- recover high-value tech
- navigate difficult terrain
- manage limited fuel
- escape before the environment collapses around you

You are **not** a soldier in a war.  
You are a **skilled operator** working under pressure.

---

## 5. Design pillars

### A. Stable readable movement

Movement should feel **immediate** and **dependable**.

### B. Mission clarity

The player should always know:

- what to get
- what is dangerous
- where to go next

### C. Pressure creates tension

The mission should feel urgent because of:

- fuel
- hazards
- storm timer
- extraction requirement

### D. Atmosphere without waste

The world should feel like a realistic sci-fi planet using:

- lighting
- terrain
- silhouettes
- haze
- wreckage
- color discipline

---

## 6. Camera and control philosophy

### Camera

- fixed angled top-down view
- slight follow allowed
- **no** orbit camera
- **no** player-relative camera complications
- mission space always readable

### Controls

Player movement is **world-relative** and **consistent**.

#### Required controls

| Input | Action |
|--------|--------|
| **W** | move forward |
| **A** | move left |
| **S** | move backward |
| **D** | move right |
| **Space** | jet burst / short hover |
| **Shift** | optional boost if stable |
| **E** | interact / collect / extract |

**Rule:** Movement must **not** depend on camera rotation. It must be **stable** and **predictable** every time.

---

## 7. Game format

- single-player
- browser-based
- free-to-play
- one mission zone
- short replayable sessions
- Three.js required

---

## 8. MVP definition

### Must have

- angled top-down camera
- stable directional movement
- short jet burst / hover
- fuel system
- 3 recoverable energy cores
- hazard zones
- storm timer
- extraction zone
- success / fail states
- results screen
- desert sci-fi visual atmosphere

### Must not have in MVP

- multiplayer
- deep combat
- crafting
- inventory complexity
- skill trees
- multiple planets
- long story campaign
- procedural universe
- advanced enemy AI

---

## 9. Core gameplay loop

1. Start mission  
2. Spawn in landing zone  
3. Move through planet zone using directional movement and jet bursts  
4. Locate and recover 3 energy cores  
5. Avoid hazard zones and manage fuel  
6. Race to extraction before the storm timer ends  
7. View mission results  
8. Retry with slightly varied objective locations  

---

## 10. Mission structure

### Primary mission

Recover **3 energy cores** and **extract**.

### Mission flow

**Start**

- player lands in a designated start zone
- storm timer begins
- extraction is inactive
- objective markers show approximate core positions

**Mid-mission**

- player travels to each core
- uses movement and jet burst to cross terrain and hazards
- recovers each core with interaction
- mission progress updates

**Final phase**

- once all 3 cores are collected, extraction activates
- player must reach extraction zone before timer expires
- mission ends in success or failure

---

## 11. Movement system

This is the **most important** gameplay system.

### 11.1 Directional movement

Movement must always be intuitive.

**Rules**

- **W** moves up / forward in **world** space  
- **S** moves down / backward in **world** space  
- **A** moves left  
- **D** moves right  
- diagonal movement should **normalize speed** correctly  
- **no** shaking  
- **no** drift  
- **no** weird camera-relative inversion  

### 11.2 Jet burst

Jet burst is what gives the game its identity.

**Behavior**

- short upward or directional thrust burst
- useful for crossing gaps, clearing hazards, or moving faster
- fuel-consuming
- readable effect
- easy to control

**Goal:** It should feel like a **tactical mobility tool**, not a full flight sim.

### 11.3 Hover window

Optional but recommended.

**Behavior**

- brief hover or controlled air time after burst
- limited by fuel
- helps movement feel more dynamic
- should **not** allow infinite flight

### 11.4 Boost

Optional in MVP.

If included:

- temporary faster movement
- drains more fuel
- must remain stable and readable

If unstable, **cut it**.

---

## 12. Fuel system

Fuel creates route pressure and decision-making.

**Rules**

- moving on foot drains little or none
- jet burst drains fuel
- hover drains fuel
- boost drains more fuel
- fuel pickups are optional later, not required now

**Design goal:** Fuel should pressure the player without making the mission feel hopeless.

### Fail behavior

If fuel reaches zero:

- player can still move on foot
- jetpack functions become unavailable or severely limited

**Do not** hard fail instantly just because fuel is empty.

---

## 13. Suit integrity / health

A simple damage system supports hazard tension.

**Rules**

Suit integrity is damaged by:

- hazard zones
- storm exposure
- hard falls if implemented
- mission-critical danger zones

### Fail state

If integrity hits zero, mission fails.

Keep this system **simple** and **readable**.

---

## 14. Objective system

### 14.1 Energy cores

The main collectible objective.

**Rules**

- 3 cores per mission
- clearly visible and sci-fi looking
- recoverable by interaction
- once collected, they are permanently secured
- no carrying inventory complexity required unless you want that later

### 14.2 Objective placement

Core locations should vary between runs.

**Good variation**

- choose from a set of valid spawn points
- do not use fully random nonsense placements
- make each run slightly different without breaking design

---

## 15. Hazard system

Hazards create route tension and mission pressure.

### MVP hazard types

Choose **2 or 3** only.

**Best choices**

- radiation field
- heat vent zone
- unstable storm sector
- cliff drop hazard
- electrified wreck area

### Hazard design rules

- hazards must be **clearly readable**
- hazards should punish poor routes
- hazards should **not** feel unfair
- hazards should create **decisions**, not random annoyance

### Suggested MVP hazards

**A. Radiation zones**

- deal integrity damage over time
- marked with visual shimmer or color tint

**B. Heat vents**

- timed bursts or constant danger patches
- encourage quick movement

**C. Storm boundary**

- mission-wide timer pressure
- final major threat

---

## 16. Storm system

The storm is the main mission clock.

**Rules**

- mission begins with a countdown timer
- timer is visible in HUD
- when timer reaches zero, mission fails or storm consumes the zone
- optional late-phase warning effects near final 30 seconds

### Optional later version

The storm can physically roll in or darken the scene near the end.

For **MVP**, a **countdown** is enough.

---

## 17. Extraction system

Extraction is the finish line.

**Rules**

- inactive at mission start
- activates after all cores are collected
- clearly marked in the world
- player must enter and **hold position briefly**
- mission success triggers after extraction completes

**Extraction goals:** clear, dramatic, readable, easy to understand.

---

## 18. World design

### 18.1 Setting

A hostile **red desert** frontier planet.

### 18.2 World tone

- realistic sci-fi
- abandoned industrial salvage zone
- dangerous but believable
- harsh sunlight and dust haze
- broken tech scattered across ancient terrain

### 18.3 Map structure

One **compact** mission zone with readable routes.

**Suggested layout**

- landing zone near one edge
- central wreck field
- elevated ridge or canyon cut
- one dangerous hazard corridor
- 3 objective zones spread across map
- extraction on opposite side or near alternate edge

### 18.4 Route design

The map should offer:

- safe but longer routes
- risky short routes
- fuel-saving paths
- hazard-heavy shortcuts

---

## 19. Visual direction

### 19.1 Style target

Realistic sci-fi from an angled top-down perspective.

- Not cartoony.
- Not photoreal to the point of browser pain.

### 19.2 Visual priorities

**Spend time on**

- terrain silhouette
- dust haze
- sunlight and shadows
- wreckage silhouettes
- core readability
- extraction readability
- hazard readability
- player silhouette

**Spend less time on**

- tiny surface details
- close-up hero assets
- excessive animation complexity

### 19.3 Environment features

- dunes
- ridges
- rock clusters
- broken ship hull sections
- damaged towers
- cargo debris
- pipelines or relay parts
- dust fog
- distant silhouettes

### 19.4 Color palette

- sand reds
- burnt orange
- dusty tan
- dark metal
- muted off-white
- restrained cyan or teal for mission objects
- small warning orange or red for hazards

Keep the palette **disciplined**.

---

## 20. Player visual design

The player should read as a **sci-fi salvage pilot**, even from a pulled-back camera.

**Requirements**

- strong helmet shape
- readable torso armor
- visible jetpack
- grounded suit colors
- silhouette clear against terrain
- no toy-like look
- no pill shape
- no mannequin feel

---

## 21. Audio direction

### 21.1 Sound priorities

Sound should support:

- movement
- jet burst
- mission pressure
- hazards
- extraction

### 21.2 Must-have sounds

- jetpack ignition
- hover / burst sound
- core pickup
- extraction activation
- damage warning
- low fuel warning
- storm countdown warning
- ambient wind
- distant industrial rumble

### 21.3 Music

Minimal and supportive.

**Good style**

- atmospheric sci-fi tension
- subtle pulse
- slight urgency late mission
- not overwhelming
- not giant trailer music

---

## 22. HUD and UI

### 22.1 HUD requirements

Show:

- fuel
- integrity
- cores collected
- mission timer
- extraction status

### 22.2 UI style

- compact
- clean
- futuristic but restrained
- readable at a glance
- no clutter

### 22.3 Results screen

Show:

- success or failure
- cores recovered
- time remaining
- fuel remaining
- integrity remaining
- final score
- retry option

---

## 23. Scoring

Score supports replayability.

**Suggested scoring**

- each core recovered: base points
- mission completion: bonus
- time remaining: bonus
- fuel efficiency: bonus
- low damage: bonus

Keep the formula **simple**.

---

## 24. Win and fail states

### Win

- collect all 3 cores
- reach extraction
- survive extraction confirmation

### Fail

- timer reaches zero
- integrity reaches zero
- player dies in hazard
- optional abandonment or forced mission reset

---

## 25. Technical requirements

### Stack

- Three.js required
- TypeScript preferred
- simple architecture
- browser-first
- performance conscious

### Do not overbuild

Avoid:

- giant framework layers
- unnecessary abstractions
- heavy post-processing
- overcomplicated ECS unless absolutely needed

---

## 26. Development phases

| Phase | Focus |
|--------|--------|
| **1** | Stable pivot foundation: angled top-down camera, simple directional movement, jet burst, fuel, basic terrain blockout |
| **2** | Core mission loop: 3 energy cores, extraction zone, HUD, success / fail flow |
| **3** | Pressure systems: hazard zones, integrity system, storm timer, warning feedback |
| **4** | Visual atmosphere: terrain composition, wreckage landmarks, lighting, fog, dust, mission object / extraction / hazard readability |
| **5** | Polish and submission: sound, music, score tuning, minor replay variation, performance cleanup, landing page / packaging |

---

## 27. Replayability plan

Do **not** build multiple worlds first.

Use:

- different core spawn sets
- slight extraction variation
- different hazard placements
- different safe / risky route combinations
- score incentives for fast clean runs

That gives replayability without exploding scope.

---

## 28. Biggest risks

| Risk | Mitigation |
|------|------------|
| **A. Overpolish before stability** | Fix movement and mission clarity first. |
| **B. Too empty visually** | Landmarks and route composition. |
| **C. Too many mechanics** | Keep the loop sharp. |
| **D. Unclear hazards** | Hazards must read immediately. |
| **E. Jet burst feeling weak** | Movement still needs a satisfying identity even in top-down form. |

---

## 29. Best internal rule

If a feature does **not** improve **movement**, **pressure**, **clarity**, or **extraction**, **cut it**.

---

## 30. Submission-friendly description

Starfall Salvage: Tactical Descent is a browser-based sci-fi mission game built with Three.js. From an angled top-down view, you control a jetpack-equipped salvage pilot on a hostile desert planet, recover energy cores, manage fuel and suit integrity, avoid hazards, and race to extraction before the storm consumes the mission zone.

---

## 31. Direct implementation note (engineering / Cursor)

For this version, movement must be **stable** and **world-relative**:

- **W** = forward  
- **A** = left  
- **S** = backward  
- **D** = right  

**No camera-relative movement math** should alter these directions.

**That is a hard rule for the build.**

Implementation should encode these axes as **fixed world basis vectors** (e.g. forward / right on the ground plane), not from camera yaw or orbit state.

---

*End of PRD*
