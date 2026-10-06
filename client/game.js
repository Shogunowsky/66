const socket = io();

const startScreen = document.getElementById("startScreen");
const lobbyScreen = document.getElementById("lobbyScreen");
const gameScreen = document.getElementById("gameScreen");

const nicknameInput = document.getElementById("nickname");
const roomInput = document.getElementById("room");
const joinButton = document.getElementById("joinButton");

const lobbyRoom = document.getElementById("lobbyRoom");
const lobbyPlayers = document.getElementById("lobbyPlayers");
const leaveButton = document.getElementById("leaveButton");

const trumpDisplay = document.getElementById("trumpDisplay");
const scoreTeam1 = document.getElementById("scoreTeam1");
const scoreTeam2 = document.getElementById("scoreTeam2");

const topPlayer = document.getElementById("topPlayer");
const leftPlayer = document.getElementById("leftPlayer");
const rightPlayer = document.getElementById("rightPlayer");

const gameMessage = document.getElementById("gameMessage");
const playedCards = document.getElementById("playedCards");
const myCards = document.getElementById("myCards");

let currentState = null;
let mySeat = null;

function showScreen(screen) {
    startScreen.style.display = "none";
    lobbyScreen.style.display = "none";
    gameScreen.style.display = "none";

    screen.style.display = "block";
}

function joinGame() {
    const nickname = nicknameInput.value.trim();
    const room = roomInput.value.trim();

    if (!nickname) {
        alert("Podaj pseudonim.");
        return;
    }

    if (!room) {
        alert("Podaj nazwę pokoju.");
        return;
    }

    socket.emit("joinRoom", {
        nickname,
        room
    });
}

joinButton.addEventListener("click", joinGame);

roomInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        joinGame();
    }
});

nicknameInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        joinGame();
    }
});

leaveButton.addEventListener("click", () => {
    socket.emit("leaveRoom");
    showScreen(startScreen);
});

socket.on("connect", () => {
    console.log("Połączono z serwerem.");
});

socket.on("connect_error", error => {
    console.error("Błąd połączenia:", error);
});

socket.on("joinedRoom", data => {
    mySeat = data.seat;

    lobbyRoom.textContent = data.room;

    showScreen(lobbyScreen);
});

socket.on("joinError", message => {
    alert(message);
});

socket.on("lobbyState", state => {
    lobbyRoom.textContent = state.room;

    lobbyPlayers.innerHTML = "";

    state.players.forEach(player => {
        const row = document.createElement("div");

        row.className = "lobby-player";

        row.textContent =
            `${player.name}${player.bot ? " 🤖" : ""}`;

        lobbyPlayers.appendChild(row);
    });

    showScreen(lobbyScreen);
});

socket.on("gameError", message => {
    alert(message);
});

socket.on("gameState", state => {
    currentState = state;
    mySeat = state.you;

    showScreen(gameScreen);

    renderGame(state);
});

function renderGame(state) {
    renderPlayers(state);
    renderScores(state);
    renderTrump(state);
    renderTrick(state);
    renderHand(state);
    renderMessage(state);
}

function renderPlayers(state) {
    const names = state.playerNames || [];

    const getName = seat => {
        return names[seat] || "Gracz";
    };

    const topSeat = (mySeat + 2) % 4;
    const leftSeat = (mySeat + 1) % 4;
    const rightSeat = (mySeat + 3) % 4;

    topPlayer.textContent = getName(topSeat);
    leftPlayer.textContent = getName(leftSeat);
    rightPlayer.textContent = getName(rightSeat);
}

function renderScores(state) {
    scoreTeam1.textContent = state.scores?.[0] ?? 0;
    scoreTeam2.textContent = state.scores?.[1] ?? 0;
}

function renderTrump(state) {
    if (state.trump) {
        trumpDisplay.textContent =
            `Obrany kolor: ${state.trump}`;
    } else {
        trumpDisplay.textContent = "Obrany kolor: —";
    }
}

function renderMessage(state) {
    if (state.message) {
        gameMessage.textContent = state.message;
        return;
    }

    if (state.finished) {
        gameMessage.textContent = "Koniec rozdania.";
        return;
    }

    if (state.currentPlayer === mySeat) {
        gameMessage.textContent = "Twój ruch.";
    } else {
        const name =
            state.playerNames?.[state.currentPlayer] || "Gracz";

        gameMessage.textContent =
            `Ruch gracza: ${name}`;
    }
}

function renderTrick(state) {
    playedCards.innerHTML = "";

    if (!state.trick || state.trick.length === 0) {
        return;
    }

    state.trick.forEach(play => {
        const wrapper = document.createElement("div");
        wrapper.className = "played-card";

        /*
         * Najważniejsza zmiana:
         * nad każdą kartą pokazujemy nick gracza,
         * który ją rzucił.
         */

        const playerName = document.createElement("div");
        playerName.className = "played-card-player";

        const name =
            play.playerName ||
            state.playerNames?.[play.player] ||
            `Gracz ${Number(play.player) + 1}`;

        playerName.textContent = name;

        const card = document.createElement("div");
        card.className = "card";

        if (play.card?.suit === "♥" || play.card?.suit === "♦") {
            card.classList.add("red");
        } else {
            card.classList.add("black");
        }

        if (play.card) {
            card.innerHTML = `
                <div class="card-rank">${play.card.rank}</div>
                <div class="card-suit">${play.card.suit}</div>
            `;
        }

        wrapper.appendChild(playerName);
        wrapper.appendChild(card);

        playedCards.appendChild(wrapper);
    });
}

function renderHand(state) {
    myCards.innerHTML = "";

    if (!state.hand) {
        return;
    }

    state.hand.forEach(card => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "card hand-card";

        if (card.suit === "♥" || card.suit === "♦") {
            button.classList.add("red");
        } else {
            button.classList.add("black");
        }

        const isMyTurn =
            state.currentPlayer === mySeat &&
            !state.finished;

        if (!isMyTurn) {
            button.disabled = true;
        }

        button.innerHTML = `
            <div class="card-rank">${card.rank}</div>
            <div class="card-suit">${card.suit}</div>
        `;

        button.addEventListener("click", () => {
            if (!isMyTurn) {
                return;
            }

            socket.emit("playCard", {
                cardId: card.id
            });
        });

        myCards.appendChild(button);
    });

    if (
        state.trump === null &&
        state.trumpChooser === mySeat &&
        !state.finished
    ) {
        renderTrumpButtons();
    }
}

function renderTrumpButtons() {
    const oldButtons =
        document.querySelector(".trump-buttons");

    if (oldButtons) {
        oldButtons.remove();
    }

    const container = document.createElement("div");
    container.className = "trump-buttons";

    const title = document.createElement("div");
    title.className = "trump-title";
    title.textContent = "Obieraj";

    container.appendChild(title);

    const suits = [
        { suit: "♥", name: "Czerwo" },
        { suit: "♦", name: "Dzwonek" },
        { suit: "♣", name: "Krzak" },
        { suit: "♠", name: "Wino" }
    ];

    suits.forEach(item => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "trump-button";

        if (item.suit === "♥" || item.suit === "♦") {
            button.classList.add("red");
        } else {
            button.classList.add("black");
        }

        button.textContent =
            `${item.suit} ${item.name}`;

        button.addEventListener("click", () => {
            socket.emit("chooseTrump", {
                suit: item.suit
            });

            container.remove();
        });

        container.appendChild(button);
    });

    document.body.appendChild(container);
}

socket.on("disconnect", () => {
    console.log("Rozłączono z serwerem.");
});
