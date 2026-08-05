# Hangman Game - COMP 2132 Project

A simple responsive Hangman game built with HTML, CSS, and vanilla JavaScript.

## Run the project

The game loads `data/words.json` with `fetch()`, so it must be opened through
an HTTP server rather than by double-clicking `index.html`.

### Visual Studio Code

1. Open the `hangman-game` folder in Visual Studio Code.
2. Install the **Live Server** extension if it is not already installed.
3. Right-click `index.html`.
4. Choose **Open with Live Server**.

### Python

From inside the `hangman-game` folder, run:

```bash
python -m http.server 5500
```

Then visit <http://localhost:5500>.

## Project requirements included

- Random word and hint loaded from a JSON file using `fetch()`
- One-letter input, duplicate-guess prevention, and an accessible letter bank
- Six incorrect guesses with seven progressive SVG image states
- Win/loss result dialog and full **Play again** reset
- Simple responsive layout with one mobile breakpoint
- Flat colors and reusable CSS custom properties
- Relative project paths

## Sass

`styles/main.scss` mirrors the plain CSS source, so it stays easy to read and
can still be compiled with:

```bash
npx sass styles/main.scss styles/main.css --style=expanded --no-source-map
```
