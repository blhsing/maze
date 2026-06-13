# Maze Escape

A browser maze game built with plain HTML, CSS, and JavaScript. The player starts inside a randomly generated maze and must reach the exit while being chased by black holes.

## Play

Open `index.html` in a browser.

No build step or local server is required.

## Controls

- Arrow keys or `WASD` to move
- Touch direction buttons on smaller screens
- Space starts a new run when the game is not active
- Restart button resets the maze

## Items

- Spinach: grow temporarily and resist black holes
- Carrot: move faster temporarily
- Poop: move slower temporarily
- Wine glass: reverse controls temporarily
- Ice cube: freeze the nearest black hole temporarily

## Goal

Reach the highlighted exit before a black hole catches you. If a black hole catches you without spinach active, you fall in and lose.

## Files

- `index.html`: game layout and HUD
- `style.css`: responsive page and control styling
- `game.js`: maze generation, game loop, movement, items, black hole AI, and rendering
