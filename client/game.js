const socket = io();

const $ = id => document.getElementById(id);

const startScreen = $("startScreen");
const lobbyScreen = $("lobbyScreen");
const gameScreen = $("gameScreen");

const nicknameInput = $("nickname");
const roomInput = $("room");
const joinButton = $("joinButton");

const lobbyRoom = $("lobbyRoom");
const lobbyStatus = $("lobbyStatus");
const lobbyPlayers = $("lobbyPlayers");

const team1Button = $("team1Button");
const team2Button = $("team2Button");
const selectedTeam = $("selectedTeam");

const botsButton = $("botsButton");
const leaveButton = $("leaveButton");

const trumpDisplay = $("trumpDisplay");

const team1Name = $("team1Name");
const team2Name = $("team2Name");

const scoreTeam1 = $("scoreTeam1");
const scoreTeam2 = $("scoreTeam2");

const overallTeam1 = $("overallTeam1");
const overallTeam2 = $("overallTeam2");

const gamesTeam1 = $("gamesTeam1");
const gamesTeam2 = $("gamesTeam2");

const topPlayer = $("topPlayer");
const leftPlayer = $("leftPlayer");
const rightPlayer = $("rightPlayer");

const playedCards = $("playedCards");
const myCards = $("myCards");
const gameMessage = $("gameMessage");

let currentState = null;
let myPlayerIndex = null;
let myTeam = null;
let currentRoom = null;

const SUIT_NAMES = {
    "♥": "Czerwo",
    "♦": "Dzwonek",
    "♣": "Krzak",
    "♠": "Wino"
};


/* =========================
   EKRANY
========================= */

function showScreen(screen) {
    if (!screen) return;

    [startScreen, lobbyScreen, gameScreen].forEach(element => {
        if (element) {
            element.classList.add("hidden");
        }
    });

    screen.classList.remove("hidden");
}


/* =========================
   START
========================= */

showScreen(startScreen);


/* =========================
   WEJŚCIE DO POKOJU
========================= */

if (joinButton) {
    joinButton.addEventListener("click", () => {
        const name = nicknameInput
            ? nicknameInput.value.trim()
            : "";

        const roomId = roomInput
            ? roomInput.value.trim().toUpperCase()
            : "";

        if (!name) {
            alert("Podaj pseudonim.");
            return;
        }

        if (!roomId) {
            alert("Podaj pokój.");
            return;
        }

        joinButton.disabled = true;
        joinButton.textContent = "ŁĄCZENIE...";

        socket.emit("joinRoom", {
            name,
            roomId
        });
    });
}


/* =========================
   DOŁĄCZONO
========================= */

socket.on("joinedRoom", data => {
    currentRoom = data.roomId;

    if (lobbyRoom) {
        lobbyRoom.textContent = data.roomId;
    }

    if (joinButton) {
        joinButton.disabled = false;
        joinButton.textContent = "WEJDŹ DO GRY";
    }

    showScreen(lobbyScreen);
});


/* =========================
   LOBBY
========================= */

socket.on("lobbyState", data => {
    if (lobbyRoom) {
        lobbyRoom.textContent =
            data.roomId || currentRoom || "—";
    }

    if (lobbyStatus) {
        lobbyStatus.textContent =
            `Oczekiwanie na graczy: ${data.playerCount}/4`;
    }

    if (lobbyPlayers) {
        lobbyPlayers.innerHTML = "";

        for (const player of data.players || []) {
            const row = document.createElement("div");

            row.className = "lobby-player";

            const name = document.createElement("span");

            name.textContent = player.name;

            if (player.isBot) {
                name.textContent += " 🤖";
            }

            const team = document.createElement("span");

            if (player.team === 0) {
                team.textContent = "Drużyna 1";
            } else if (player.team === 1) {
                team.textContent = "Drużyna 2";
            } else {
                team.textContent = "brak drużyny";
            }

            row.appendChild(name);
            row.appendChild(team);

            lobbyPlayers.appendChild(row);
        }
    }

    showScreen(lobbyScreen);
});


/* =========================
   DRUŻYNY
========================= */

function chooseTeam(team) {
    myTeam = team;

    if (selectedTeam) {
        selectedTeam.textContent =
            team === 0
                ? "Wybrano: Drużyna 1"
                : "Wybrano: Drużyna 2";
    }

    if (team1Button) {
        team1Button.classList.toggle(
            "selected",
            team === 0
        );
    }

    if (team2Button) {
        team2Button.classList.toggle(
            "selected",
            team === 1
        );
    }

    socket.emit("chooseTeam", team);
}

if (team1Button) {
    team1Button.addEventListener(
        "click",
        () => chooseTeam(0)
    );
}

if (team2Button) {
    team2Button.addEventListener(
        "click",
        () => chooseTeam(1)
    );
}


/* =========================
   BOTY
========================= */

if (botsButton) {
    botsButton.addEventListener("click", () => {
        socket.emit("startWithBots");
    });
}


/* =========================
   OPUSZCZANIE
========================= */

if (leaveButton) {
    leaveButton.addEventListener("click", () => {
        socket.emit("leaveRoom");

        currentState = null;
        myPlayerIndex = null;
        myTeam = null;

        showScreen(startScreen);
    });
}


/* =========================
   START GRY
========================= */

socket.on("gameStarted", () => {
    showScreen(gameScreen);
});


/* =========================
   STAN GRY
========================= */

socket.on("gameState", state => {
    currentState = state;

    if (
        typeof state.playerIndex === "number"
    ) {
        myPlayerIndex =
            state.playerIndex;
    }

    if (
        typeof state.myTeam === "number"
    ) {
        myTeam = state.myTeam;
    }

    renderGame(state);
});


/* =========================
   OBIERANIE
========================= */

socket.on("chooseTrump", data => {
    showTrumpChooser();
});


/* =========================
   BŁĘDY
========================= */

socket.on("errorMessage", message => {
    alert(message);

    if (joinButton) {
        joinButton.disabled = false;
        joinButton.textContent = "WEJDŹ DO GRY";
    }
});


/* =========================
   GRA
========================= */

function renderGame(state) {
    if (trumpDisplay) {
        if (state.trump) {
            trumpDisplay.textContent =
                `Obrany kolor: ${state.trump} ${SUIT_NAMES[state.trump]}`;
        } else {
            trumpDisplay.textContent =
                "Obrany kolor: —";
        }
    }

    renderScores(state);
    renderPlayers(state);
    renderTrick(state);
    renderHand(state);

    if (gameMessage) {
        gameMessage.textContent =
            state.message || "—";
    }
}


/* =========================
   PUNKTY
========================= */

function renderScores(state) {
    if (team1Name) {
        team1Name.textContent =
            state.teamNames?.[0] ||
            "Drużyna 1";
    }

    if (team2Name) {
        team2Name.textContent =
            state.teamNames?.[1] ||
            "Drużyna 2";
    }

    if (scoreTeam1) {
        scoreTeam1.textContent =
            state.scores?.[0] ?? 0;
    }

    if (scoreTeam2) {
        scoreTeam2.textContent =
            state.scores?.[1] ?? 0;
    }

    if (overallTeam1) {
        overallTeam1.textContent =
            state.overallScores?.[0] ?? 0;
    }

    if (overallTeam2) {
        overallTeam2.textContent =
            state.overallScores?.[1] ?? 0;
    }

    if (gamesTeam1) {
        gamesTeam1.textContent =
            state.gameWins?.[0] ?? 0;
    }

    if (gamesTeam2) {
        gamesTeam2.textContent =
            state.gameWins?.[1] ?? 0;
    }
}


/* =========================
   GRACZE
========================= */

function renderPlayers(state) {
    const players =
        state.players || [];

    if (
        players.length < 4 ||
        myPlayerIndex === null
    ) {
        return;
    }

    const topIndex =
        (myPlayerIndex + 2) % 4;

    const leftIndex =
        (myPlayerIndex + 1) % 4;

    const rightIndex =
        (myPlayerIndex + 3) % 4;

    if (topPlayer) {
        topPlayer.textContent =
            players[topIndex]?.name || "—";
    }

    if (leftPlayer) {
        leftPlayer.textContent =
            players[leftIndex]?.name || "—";
    }

    if (rightPlayer) {
        rightPlayer.textContent =
            players[rightIndex]?.name || "—";
    }
}


/* =========================
   STÓŁ
========================= */

function renderTrick(state) {
    if (!playedCards) return;

    playedCards.innerHTML = "";

    for (const play of state.trick || []) {
        const wrapper =
            document.createElement("div");

        wrapper.className =
            "played-card";

        const card =
            createCardElement(
                play.card,
                false
            );

        const player =
            document.createElement("div");

        player.className =
            "played-card-player";

        player.textContent =
            state.players?.[
                play.playerIndex
            ]?.name || "Gracz";

        wrapper.appendChild(card);
        wrapper.appendChild(player);

        playedCards.appendChild(wrapper);
    }
}


/* =========================
   MOJE KARTY
========================= */

function renderHand(state) {
    if (!myCards) return;

    myCards.innerHTML = "";

    for (const card of state.hand || []) {
        const playable =
            state.phase === "playing" &&
            state.currentPlayer ===
                state.playerIndex;

        myCards.appendChild(
            createCardElement(
                card,
                playable
            )
        );
    }
}


/* =========================
   KARTA
========================= */

function createCardElement(card, playable) {
    const button =
        document.createElement("button");

    button.type = "button";
    button.className = "card";

    if (
        card.suit === "♥" ||
        card.suit === "♦"
    ) {
        button.classList.add("red");
    }

    if (playable) {
        button.classList.add("playable");

        button.addEventListener(
            "click",
            () => {
                socket.emit(
                    "playCard",
                    card
                );
            }
        );
    }

    const rank =
        document.createElement("span");

    rank.className =
        "card-rank";

    rank.textContent =
        card.rank;

    const suit =
        document.createElement("span");

    suit.className =
        "card-suit";

    suit.textContent =
        card.suit;

    const name =
        document.createElement("small");

    name.className =
        "card-suit-name";

    name.textContent =
        SUIT_NAMES[card.suit];

    button.appendChild(rank);
    button.appendChild(suit);
    button.appendChild(name);

    return button;
}


/* =========================
   OBRAJ
========================= */

function showTrumpChooser() {
    const existing =
        document.getElementById(
            "trumpChooser"
        );

    if (existing) {
        existing.remove();
    }

    const overlay =
        document.createElement("div");

    overlay.id =
        "trumpChooser";

    overlay.className =
        "trump-chooser";

    const box =
        document.createElement("div");

    box.className =
        "trump-chooser-box";

    const title =
        document.createElement("h2");

    title.textContent =
        "OBIERAJ";

    const text =
        document.createElement("p");

    text.textContent =
        "Wybierz kolor atu.";

    const buttons =
        document.createElement("div");

    buttons.className =
        "trump-buttons";

    for (const suit of [
        "♥",
        "♦",
        "♣",
        "♠"
    ]) {
        const button =
            document.createElement("button");

        button.type = "button";

        button.className =
            "trump-button";

        button.innerHTML = `
            <strong>${suit}</strong>
            <span>${SUIT_NAMES[suit]}</span>
        `;

        button.addEventListener(
            "click",
            () => {
                socket.emit(
                    "chooseTrump",
                    suit
                );

                overlay.remove();
            }
        );

        buttons.appendChild(button);
    }

    box.appendChild(title);
    box.appendChild(text);
    box.appendChild(buttons);

    overlay.appendChild(box);

    document.body.appendChild(overlay);
}
