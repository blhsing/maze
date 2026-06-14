# Maze Escape

A local browser maze game built with plain HTML, CSS, and JavaScript. One to three players start inside a randomly generated maze and must reach the exit while being chased by black holes.

## Play

Open `index.html` in a browser.

No build step or local server is required.

## Controls

- Player 1: `WASD`
- Player 2: arrow keys
- Player 3: `IJKL`
- Touch direction buttons control Player 1 on smaller screens
- Space starts a new run when the game is not active
- Restart button resets the maze

## Setup

- Choose 1 to 3 total players before starting
- Each player slot can be human-controlled or AI-controlled
- AI difficulty can be set to easy, normal, or hard
- The browser remembers the last player count, AI assignments, and AI difficulty

## Items

- Spinach: grow temporarily and resist black holes
- Carrot: move faster temporarily
- Poop: move slower temporarily
- Wine glass: reverse controls temporarily
- Ice cube: freeze the nearest black hole temporarily

## Goal

Reach the highlighted exit before a black hole catches each active player. Black holes chase the nearest player who is still active. If a player is caught without spinach active, that player falls in and is eliminated. An active player can touch a fallen player to revive them with brief spinach protection. The run ends when every remaining player has escaped, or when all players have fallen.

## Files

- `index.html`: game layout and HUD
- `style.css`: responsive page and control styling
- `game.js`: maze generation, game loop, movement, items, black hole AI, and rendering
