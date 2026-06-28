# Maze Escape

A local browser maze game built with plain HTML, CSS, and JavaScript. One to three players start inside a randomly generated maze and must reach the exit while black holes chase the nearest active player.

## Run

Open `index.html` in a browser.

No build step or local server is required.

## Game Setup

Before starting a run, choose:

- Total players: 1 to 3
- AI players: 0 up to the total player count
- AI difficulty: easy, normal, or hard

AI players are assigned to the later player slots automatically. For example, with 3 total players and 1 AI player, P1 and P2 are human-controlled and P3 is AI-controlled.

The browser remembers the last player count, AI count, and AI difficulty with `localStorage`.

## Controls

- Player 1, if human: `WASD`
- Player 2, if human: arrow keys
- Player 3, if human: `IJKL`
- Touch direction buttons control Player 1 on smaller screens
- Space starts a new run when the game is not active
- Restart button resets the maze

Inactive player slots are hidden from the HUD and do not count toward win or loss conditions.

## AI Players

AI players can replace the later player slots based on the selected AI count. They will:

- Move toward the exit
- Keep pushing toward their current target when black holes close in
- Follow maze waypoints with extra cost around black holes so they route around threats instead of jittering in place
- Prioritize rescuing fallen teammates anywhere in the maze
- Pick up useful items such as spinach, carrots, ice cubes, and swords

Difficulty changes AI reaction speed, movement speed, pickup range, and movement noise.

## Items

- Spinach: grow temporarily and resist black holes without losing the effect on contact
- Carrot: move faster temporarily
- Poop: move slower temporarily
- Wine glass: reverse controls temporarily
- Ice cube: freeze the nearest black hole temporarily
- Sword: cut black holes temporarily. A large black hole splits into two small black holes. Newly split small black holes cannot be cut again for a short cooldown, then cutting a small black hole removes it permanently.

## Win And Loss

All joined players must reach the highlighted exit to win.

If a player is caught without spinach active, that player falls in and becomes revivable. An active player can touch a fallen player to revive them with brief spinach protection.

The run ends in victory only when every joined player has escaped. If no active player remains and at least one joined player has not escaped, the run is lost.

## Files

- `index.html`: game layout and HUD
- `style.css`: responsive page and control styling
- `game.js`: maze generation, game loop, movement, items, black hole AI, and rendering

## Development Checks

Run the JavaScript syntax check:

```sh
node --check game.js
```

Check staged or unstaged diff whitespace before committing:

```sh
git diff --check
```
