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

const team1Button = document.getElementById("team1Button");
const team2Button = document.getElementById("team2Button");
const selectedTeam = document.getElementById("selectedTeam");

const trumpDisplay = document.getElementById("trumpDisplay");
const scoreTeam1 = document.getElementById("scoreTeam1");
const scoreTeam2 = document.getElementById("scoreTeam2");

const team1Name = document.getElementById("team1Name");
const team2Name = document.getElementById("team2Name");

const topPlayer = document.getElementById("topPlayer");
const leftPlayer = document.getElementById("leftPlayer");
const rightPlayer = document.getElementById("rightPlayer");

const gameMessage = document.getElementById("gameMessage");
const playedCards = document.getElementById("playedCards");
const myCards = document.getElementById("myCards");

let currentState = null;
let mySeat = null;
let myTeam = null;


/* =========================
   EKRANY
========================= */

function showScreen(screen) {
    startScreen.style.display = "none";
    lobbyScreen.style.display = "none";
    gameScreen.style.display = "none";

    screen.style.display = "block";
}


/* =========================
   DOŁĄCZANIE
========================= */

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


/* =========================
   WYBÓR DRUŻYNY
========================= */

team1Button.addEventListener("click", () => {
    chooseTeam(0);
});

team2Button.addEventListener("click", () => {
    chooseTeam(1);
});

function chooseTeam(team) {
    myTeam = team;

    team1Button.classList.toggle(
        "selected",
        team === 0
    );

    team2Button.classList.toggle(
        "selected",
        team === 1
    );

    selectedTeam.textContent =
        `Wybrana drużyna: ${team === 0 ? "1" : "2"}`;

    socket.emit("chooseTeam", {
        team
    });
}


/* =========================
   WYJŚCIE
========================= */

leaveButton.addEventListener("click", () => {
    socket.emit("leaveRoom");

    myTeam = null;

    showScreen(startScreen);
});


/* =========================
   POŁĄCZENIE
========================= */

socket.on("connect", () => {
    console.log("Połączono z serwerem.");
});

socket.on("connect_error", error => {
    console.error("Błąd połączenia:", error);
});


/* =========================
   DOŁĄCZONO
========================= */

socket.on("joinedRoom", data => {
    mySeat = data.seat;

    lobbyRoom.textContent = data.room;

    if (typeof data.team === "number") {
        myTeam = data.team;

        updateTeamButtons();
    }

    showScreen(lobbyScreen);
});


/* =========================
   BŁĄD DOŁĄCZANIA
========================= */

socket.on("joinError", message => {
    alert(message);
});


/* =========================
   STAN POCZEKALNI
========================= */

socket.on("lobbyState", state => {
    lobbyRoom.textContent = state.room;

    lobbyPlayers.innerHTML = "";

    state.players.forEach(player => {
        const row = document.createElement("div");

        row.className = "lobby-player";

        const name = document.createElement("span");

        name.textContent = player.name;

        row.appendChild(name);

        if (player.bot) {
            const bot = document.createElement("span");

            bot.textContent = " 🤖";

            row.appendChild(bot);
        }

        if (typeof player.team === "number") {
            const team = document.createElement("span");

            team.textContent =
                ` — Drużyna ${player.team + 1}`;

            team.style.opacity = "0.7";

            row.appendChild(team);
        }

        lobbyPlayers.appendChild(row);
    });

    if (typeof state.myTeam === "number") {
        myTeam = state.myTeam;

        updateTeamButtons();
    }

    showScreen(lobbyScreen);
});


/* =========================
   AKTUALIZACJA PRZYCISKÓW
========================= */

function updateTeamButtons() {
    team1Button.classList.toggle(
        "selected",
        myTeam === 0
    );

    team2Button.classList.toggle(
        "selected",
        myTeam === 1
    );

    if (myTeam === 0) {
        selectedTeam.textContent =
            "Wybrana drużyna: 1";
    } else if (myTeam === 1) {
        selectedTeam.textContent =
            "Wybrana drużyna: 2";
    } else {
        selectedTeam.textContent =
            "Nie wybrano drużyny";
    }
}


/* =========================
   BŁĘDY GRY
========================= */

socket.on("gameError", message => {
    alert(message);
});


/* =========================
   STAN GRY
========================= */

socket.on("gameState", state => {
    currentState = state;

    mySeat = state.you;

    if (typeof state.myTeam === "number") {
        myTeam = state.myTeam;
    }

    showScreen(gameScreen);

    renderGame(state);
});


/* =========================
   RENDER GRY
========================= */

function renderGame(state) {
    renderPlayers(state);
    renderScores(state);
    renderTrump(state);
    renderTrick(state);
    renderHand(state);
    renderMessage(state);
}


/* =========================
   GRACZE
========================= */

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


/* =========================
   WYNIKI
========================= */

function renderScores(state) {
    scoreTeam1.textContent =
        state.scores?.[0] ?? 0;

    scoreTeam2.textContent =
        state.scores?.[1] ?? 0;

    if (state.teamNames) {
        team1Name.textContent =
            state.teamNames[0] || "Drużyna 1";

        team2Name.textContent =
            state.teamNames[1] || "Drużyna 2";
    }
}


/* =========================
   ATU
========================= */

function renderTrump(state) {
    if (state.trump) {
        trumpDisplay.textContent =
            `Obrany kolor: ${state.trump}`;
    } else {
        trumpDisplay.textContent =
            "Obrany kolor: —";
    }
}


/* =========================
   KOMUNIKAT
========================= */

function renderMessage(state) {
    if (state.message) {
        gameMessage.textContent =
            state.message;

        return;
    }

    if (state.finished) {
        gameMessage.textContent =
            "Koniec rozdania.";

        return;
    }

    if (state.currentPlayer === mySeat) {
        gameMessage.textContent =
            "Twój ruch.";
    } else {
        const name =
            state.playerNames?.[state.currentPlayer]
            || "Gracz";

        gameMessage.textContent =
            `Ruch gracza: ${name}`;
    }
}


/* =========================
   KARTY NA STOLE
========================= */

function renderTrick(state) {
    playedCards.innerHTML = "";

    if (
        !state.trick ||
        state.trick.length === 0
    ) {
        return;
    }

    state.trick.forEach(play => {
        const wrapper =
            document.createElement("div");

        wrapper.className =
            "played-card";

        const playerName =
            document.createElement("div");

        playerName.className =
            "played-card-player";

        const name =
            play.playerName ||
            state.playerNames?.[play.player] ||
            `Gracz ${Number(play.player) + 1}`;

        playerName.textContent = name;

        const card =
            document.createElement("div");

        card.className = "card";

        if (
            play.card?.suit === "♥" ||
            play.card?.suit === "♦"
        ) {
            card.classList.add("red");
        } else {
            card.classList.add("black");
        }

        if (play.card) {
            card.innerHTML = `
                <div class="card-rank">
                    ${play.card.rank}
                </div>

                <div class="card-suit">
                    ${play.card.suit}
                </div>
            `;
        }

        wrapper.appendChild(playerName);
        wrapper.appendChild(card);

        playedCards.appendChild(wrapper);
    });
}


/* =========================
   MOJE KARTY
========================= */

function renderHand(state) {
    myCards.innerHTML = "";

    if (!state.hand) {
        return;
    }

    state.hand.forEach(card => {
        const button =
            document.createElement("button");

        button.type = "button";

        button.className =
            "card hand-card";

        if (
            card.suit === "♥" ||
            card.suit === "♦"
        ) {
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
            <div class="card-rank">
                ${card.rank}
            </div>

            <div class="card-suit">
                ${card.suit}
            </div>
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


/* =========================
   WYBÓR KOLORU
========================= */

function renderTrumpButtons() {
    const oldButtons =
        document.querySelector(".trump-buttons");

    if (oldButtons) {
        oldButtons.remove();
    }

    const container =
        document.createElement("div");

    container.className =
        "trump-buttons";

    const title =
        document.createElement("div");

    title.className =
        "trump-title";

    title.textContent =
        "Obieraj";

    container.appendChild(title);

    const suits = [
        {
            suit: "♥",
            name: "Czerwo"
        },
        {
            suit: "♦",
            name: "Dzwonek"
        },
        {
            suit: "♣",
            name: "Krzak"
        },
        {
            suit: "♠",
            name: "Wino"
        }
    ];

    suits.forEach(item => {
        const button =
            document.createElement("button");

        button.type = "button";

        button.className =
            "trump-button";

        if (
            item.suit === "♥" ||
            item.suit === "♦"
        ) {
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


/* =========================
   ROZŁĄCZENIE
========================= */

socket.on("disconnect", () => {
    console.log("Rozłączono z serwerem.");
});
