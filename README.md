# Maze Escape

A local browser maze game built with plain HTML, CSS, and JavaScript. One to three players start inside a randomly generated maze and must reach the exit while black holes chase the nearest active player.

## Run

Open `index.html` in a browser.

No build step or local server is required.

## Game Setup

Before starting a run, choose:

- Total players: 1 to 3
- Player type for each active slot: human or AI
- AI difficulty: easy, normal, or hard

The browser remembers the last player count, player type choices, and AI difficulty with `localStorage`.

## Controls

- Player 1: `WASD`
- Player 2: arrow keys
- Player 3: `IJKL`
- Touch direction buttons control Player 1 on smaller screens
- Space starts a new run when the game is not active
- Restart button resets the maze

Inactive player slots are hidden from the HUD and do not count toward win or loss conditions.

## AI Players

AI players can replace any human player slot. They will:

- Move toward the exit
- Avoid nearby black holes
- Rescue fallen teammates when reachable
- Pick up useful items such as spinach, carrots, and ice cubes

Difficulty changes AI reaction speed, movement speed, danger awareness, and how far ahead it evaluates the maze.

## Items

- Spinach: grow temporarily and resist black holes without losing the effect on contact
- Carrot: move faster temporarily
- Poop: move slower temporarily
- Wine glass: reverse controls temporarily
- Ice cube: freeze the nearest black hole temporarily

## Win And Loss

Reach the highlighted exit before the black holes catch every active player.

If a player is caught without spinach active, that player falls in and becomes revivable. An active player can touch a fallen player to revive them with brief spinach protection.

The run ends when every remaining active player has escaped, or when all players have fallen.

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
