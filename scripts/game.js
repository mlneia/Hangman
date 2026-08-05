"use strict";

const MAX_MISTAKES = 6;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const gameState = {
    wordEntries: [],
    selectedEntry: null,
    guessedLetters: new Set(),
    incorrectLetters: new Set(),
    isGameOver: false,
    lastWord: ""
};

const elements = {
    guessForm: document.querySelector("#guess-form"),
    letterInput: document.querySelector("#letter-input"),
    guessButton: document.querySelector("#guess-button"),
    letterBank: document.querySelector("#letter-bank"),
    wordDisplay: document.querySelector("#word-display"),
    hintText: document.querySelector("#hint-text"),
    feedback: document.querySelector("#feedback"),
    hangmanImage: document.querySelector("#hangman-image"),
    mistakeCount: document.querySelector("#mistake-count"),
    attemptDots: document.querySelector("#attempt-dots"),
    resultModal: document.querySelector("#result-modal"),
    resultLabel: document.querySelector("#result-label"),
    resultTitle: document.querySelector("#result-title"),
    resultMessage: document.querySelector("#result-message"),
    resultWord: document.querySelector("#result-word"),
    resultBadge: document.querySelector("#result-badge"),
    playAgainButton: document.querySelector("#play-again-button")
};

async function loadWordEntries() {
    try {
        const response = await fetch("./data/words.json");

        if (!response.ok) {
            throw new Error(`Unable to load words (HTTP ${response.status}).`);
        }

        const data = await response.json();

        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("The word list is empty or incorrectly formatted.");
        }

        gameState.wordEntries = data.filter(isValidWordEntry);

        if (gameState.wordEntries.length === 0) {
            throw new Error("No valid words were found.");
        }
    } catch (error) {
        showLoadingError(error);
        return;
    }

    startNewGame();
}

function isValidWordEntry(entry) {
    return (
        entry &&
        typeof entry.word === "string" &&
        /^[A-Za-z]+$/.test(entry.word) &&
        typeof entry.hint === "string" &&
        entry.hint.trim().length > 0
    );
}

function selectRandomEntry() {
    const availableEntries = gameState.wordEntries.filter(
        (entry) => entry.word.toUpperCase() !== gameState.lastWord
    );
    const selectionPool = availableEntries.length > 0
        ? availableEntries
        : gameState.wordEntries;
    const randomIndex = Math.floor(Math.random() * selectionPool.length);

    return selectionPool[randomIndex];
}

function startNewGame() {
    gameState.selectedEntry = selectRandomEntry();
    gameState.lastWord = gameState.selectedEntry.word.toUpperCase();
    gameState.guessedLetters = new Set();
    gameState.incorrectLetters = new Set();
    gameState.isGameOver = false;

    elements.resultModal.hidden = true;
    elements.hintText.textContent = gameState.selectedEntry.hint;
    elements.letterInput.disabled = false;
    elements.guessButton.disabled = false;
    elements.feedback.textContent = "Enter a letter to begin.";
    elements.feedback.className = "feedback";

    buildLetterBank();
    buildAttemptDots();
    updateGameDisplay();
    clearAndFocusInput();
}

function buildLetterBank() {
    const letterButtons = ALPHABET.map((letter) => {
        const button = document.createElement("button");

        button.className = "letter-bank__button";
        button.type = "button";
        button.textContent = letter;
        button.dataset.letter = letter;
        button.setAttribute("aria-label", `Guess letter ${letter}`);
        button.addEventListener("click", () => submitGuess(letter));

        return button;
    });

    elements.letterBank.replaceChildren(...letterButtons);
}

function buildAttemptDots() {
    const dots = Array.from({ length: MAX_MISTAKES }, () => {
        const dot = document.createElement("span");
        dot.className = "attempts__dot";
        return dot;
    });

    elements.attemptDots.replaceChildren(...dots);
}

function handleGuessSubmission(event) {
    event.preventDefault();
    submitGuess(elements.letterInput.value);
}

function submitGuess(rawGuess) {
    if (gameState.isGameOver) {
        return;
    }

    const letter = rawGuess.trim().toUpperCase();

    if (!/^[A-Z]$/.test(letter)) {
        updateFeedback("Please enter one letter from A to Z.", "error");
        animateFeedback("error");
        clearAndFocusInput();
        return;
    }

    if (gameState.guessedLetters.has(letter)) {
        updateFeedback(`You already tried ${letter}. Choose another letter.`, "error");
        animateFeedback("error");
        clearAndFocusInput();
        return;
    }

    gameState.guessedLetters.add(letter);

    const selectedWord = gameState.selectedEntry.word.toUpperCase();
    const isCorrectGuess = selectedWord.includes(letter);

    if (isCorrectGuess) {
        updateFeedback(`Nice! The word contains ${letter}.`, "success");
    } else {
        gameState.incorrectLetters.add(letter);
        updateFeedback(`No ${letter} this time.`, "error");
    }

    disableUsedLetter(letter);
    updateGameDisplay();
    animateGuessResult(isCorrectGuess);

    if (hasWon()) {
        finishGame(true);
    } else if (gameState.incorrectLetters.size >= MAX_MISTAKES) {
        finishGame(false);
    } else {
        clearAndFocusInput();
    }
}

function updateGameDisplay() {
    updateWordDisplay();
    updateHangmanImage();
    updateMistakeCounter();
}

function updateWordDisplay() {
    const word = gameState.selectedEntry.word.toUpperCase();
    const letterSlots = [...word].map((letter) => {
        const slot = document.createElement("span");
        const isRevealed = gameState.guessedLetters.has(letter);

        slot.className = "word__letter";
        slot.textContent = isRevealed ? letter : "";
        slot.setAttribute("aria-hidden", "true");

        return slot;
    });

    elements.wordDisplay.replaceChildren(...letterSlots);
    elements.wordDisplay.setAttribute(
        "aria-label",
        letterSlots
            .map((slot) => slot.textContent || "blank")
            .join(", ")
    );
}

function updateHangmanImage() {
    const mistakeTotal = gameState.incorrectLetters.size;

    elements.hangmanImage.src = `images/hangman-${mistakeTotal}.svg`;
    elements.hangmanImage.alt = mistakeTotal === 0
        ? "Empty hangman gallows"
        : `Hangman drawing showing ${mistakeTotal} of ${MAX_MISTAKES} incorrect guesses`;
}

function updateMistakeCounter() {
    const mistakeTotal = gameState.incorrectLetters.size;
    const remainingGuesses = MAX_MISTAKES - mistakeTotal;
    const dots = elements.attemptDots.querySelectorAll(".attempts__dot");

    elements.mistakeCount.textContent = `${mistakeTotal} / ${MAX_MISTAKES}`;
    elements.attemptDots.setAttribute(
        "aria-label",
        `${remainingGuesses} incorrect ${remainingGuesses === 1 ? "guess" : "guesses"} remaining`
    );

    dots.forEach((dot, index) => {
        dot.classList.toggle("attempts__dot--used", index < mistakeTotal);
    });
}

function disableUsedLetter(letter) {
    const matchingButton = elements.letterBank.querySelector(
        `[data-letter="${letter}"]`
    );

    if (matchingButton) {
        matchingButton.disabled = true;
    }
}

function hasWon() {
    const uniqueWordLetters = new Set(
        gameState.selectedEntry.word.toUpperCase().split("")
    );

    return [...uniqueWordLetters].every((letter) =>
        gameState.guessedLetters.has(letter)
    );
}

function finishGame(didWin) {
    gameState.isGameOver = true;
    elements.letterInput.disabled = true;
    elements.guessButton.disabled = true;

    elements.letterBank
        .querySelectorAll("button")
        .forEach((button) => {
            button.disabled = true;
        });

    window.setTimeout(() => showResult(didWin), 450);
}

function showResult(didWin) {
    elements.resultLabel.textContent = didWin ? "WORD SOLVED" : "GAME OVER";
    elements.resultTitle.textContent = didWin ? "You won!" : "Not this time.";
    elements.resultMessage.textContent = didWin
        ? "Excellent work—you uncovered every letter."
        : "The drawing is complete, but you can try a fresh word.";
    elements.resultWord.textContent = gameState.selectedEntry.word;
    elements.resultBadge.textContent = didWin ? "★" : "↻";
    elements.resultModal.hidden = false;

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        elements.resultModal.querySelector(".result-modal__panel").animate(
            [
                { opacity: 0, transform: "translateY(28px) scale(0.94)" },
                { opacity: 1, transform: "translateY(0) scale(1)" }
            ],
            {
                duration: 480,
                easing: "cubic-bezier(.2,.8,.2,1)",
                fill: "both"
            }
        );
    }

    elements.playAgainButton.focus();
}

function animateGuessResult(isCorrectGuess) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
    }

    const target = isCorrectGuess
        ? elements.wordDisplay
        : elements.hangmanImage;
    const keyframes = isCorrectGuess
        ? [
            { transform: "translateY(0)" },
            { transform: "translateY(-8px)" },
            { transform: "translateY(0)" }
        ]
        : [
            { transform: "translateX(0)" },
            { transform: "translateX(-7px)" },
            { transform: "translateX(7px)" },
            { transform: "translateX(0)" }
        ];

    target.animate(keyframes, {
        duration: isCorrectGuess ? 360 : 300,
        easing: "ease-out"
    });
}

function animateFeedback(type) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
    }

    const keyframes = type === "error"
        ? [
            { opacity: 0.35, transform: "translateX(-5px)" },
            { opacity: 1, transform: "translateX(5px)" },
            { opacity: 1, transform: "translateX(0)" }
        ]
        : [
            { opacity: 0, transform: "translateY(5px)" },
            { opacity: 1, transform: "translateY(0)" }
        ];

    elements.feedback.animate(keyframes, {
        duration: 260,
        easing: "ease-out"
    });
}

function updateFeedback(message, type) {
    elements.feedback.textContent = message;
    elements.feedback.className = `feedback feedback--${type}`;
}

function clearAndFocusInput() {
    elements.letterInput.value = "";
    elements.letterInput.focus();
}

function showLoadingError(error) {
    elements.hintText.textContent = "The word list could not be loaded.";
    elements.feedback.textContent =
        "Run this project through a local web server, then refresh the page.";
    elements.feedback.className = "feedback feedback--error";
    elements.letterInput.disabled = true;
    elements.guessButton.disabled = true;
    console.error(error);
}

elements.guessForm.addEventListener("submit", handleGuessSubmission);
elements.letterInput.addEventListener("input", (event) => {
    event.target.value = event.target.value.replace(/[^a-z]/gi, "").toUpperCase();
});
elements.playAgainButton.addEventListener("click", startNewGame);

loadWordEntries();
