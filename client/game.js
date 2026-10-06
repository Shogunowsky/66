const socket = io();

let mySocketId = null;
let latestState = null;
let selectedTeam = null;


/* =========================
   DOM
========================= */

const startScreen = document.getElementById("startScreen");
const lobbyScreen = document.getElementById("lobbyScreen");
const gameScreen = document.getElementById("gameScreen");

const nicknameInput = document.getElementById("nickname");
const roomInput = document.getElementById("room");

const joinButton = document.getElementById("joinButton");
const leaveButton = document.getElementById("leaveButton");

const team1Button = document.getElementById("team1Button");
const team2Button = document.getElementById("team2Button");
const botsButton = document.getElementById("botsButton");

const startMessage = document.getElementById("startMessage");

const lobbyRoom = document.getElementById("lobbyRoom");
const lobbyStatus = document.getElementById("lobbyStatus");
const lobbyPlayers = document.getElementById("lobbyPlayers");
const selectedTeamDisplay = document.getElementById("selectedTeam");

const trumpDisplay = document.getElementById("trumpDisplay");

const scoreTeam1 = document.getElementById("scoreTeam1");
const scoreTeam2 = document.getElementById("scoreTeam2");

const overallTeam1 = document.getElementById("overallTeam1");
const overallTeam2 = document.getElementById("overallTeam2");

const gamesTeam1 = document.getElementById("gamesTeam1");
const gamesTeam2 = document.getElementById("gamesTeam2");

const team1Name = document.getElementById("team1Name");
const team2Name = document.getElementById("team2Name");

const topPlayer = document.getElementById("topPlayer");
const leftPlayer = document.getElementById("leftPlayer");
const rightPlayer = document.getElementById("rightPlayer");

const currentPlayerName = document.getElementById("currentPlayerName");

const myCards = document.getElementById("myCards");
const playedCards = document.getElementById("playedCards");

const gameMessage = document.getElementById("gameMessage");

const currentPlayerInfo = document.getElementById("currentPlayer");


/* =========================
   HELPERS
========================= */

function showScreen(screen) {
    startScreen.classList.add("hidden");
    lobbyScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");

    screen.classList.remove("hidden");
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function cardSymbol(card) {
    if (!card) return "";

    return `${card.rank}${card.suit}`;
}

function cardClass(card) {
    if (!card) return "";

    if (card.suit === "♥" || card.suit === "♦") {
        return "red";
    }

    return "black";
}

function cardValue(card) {
    if (!card) return 0;

    const values = {
        A: 11,
        "10": 10,
        K: 4,
        Q: 3,
        J: 2,
        "9": 0
    };

    return values[card.rank] ?? 0;
}

function cardRankPower(rank) {
    const order = {
        A: 6,
        "10": 5,
        K: 4,
        Q: 3,
        J: 2,
        "9": 1
    };

    return order[rank] ?? 0;
}


/* =========================
   CLIENT-SIDE LEGALITY
========================= */

function getLeadSuit(state) {
    if (!state || !Array.isArray(state.trick)) {
        return null;
    }

    if (!state.trick.length) {
        return null;
    }

    const first = state.trick[0];

    return first.card?.suit || null;
}

function getCurrentWinningCard(state) {
    if (!state || !Array.isArray(state.trick)) {
        return null;
    }

    if (!state.trick.length) {
        return null;
    }

    const trump = state.trump || null;
    const leadSuit = getLeadSuit(state);

    let winner = state.trick[0].card;

    for (let i = 1; i < state.trick.length; i++) {
        const candidate = state.trick[i].card;

        if (cardBeats(candidate, winner, leadSuit, trump)) {
            winner = candidate;
        }
    }

    return winner;
}

function cardBeats(candidate, current, leadSuit, trump) {
    if (!candidate || !current) {
        return false;
    }

    if (trump) {
        if (candidate.suit === trump && current.suit !== trump) {
            return true;
        }

        if (candidate.suit !== trump && current.suit === trump) {
            return false;
        }

        if (
            candidate.suit === trump &&
            current.suit === trump
        ) {
            return cardRankPower(candidate.rank) >
                cardRankPower(current.rank);
        }
    }

    if (candidate.suit === leadSuit && current.suit !== leadSuit) {
        return true;
    }

    if (candidate.suit !== leadSuit && current.suit === leadSuit) {
        return false;
    }

    if (
        candidate.suit === current.suit
    ) {
        return cardRankPower(candidate.rank) >
            cardRankPower(current.rank);
    }

    return false;
}

function isLegalClientPlay(state, card) {
    if (!state || !card) {
        return false;
    }

    const hand = Array.isArray(state.hand)
        ? state.hand
        : [];

    const leadSuit = getLeadSuit(state);
    const trump = state.trump || null;

    if (!leadSuit) {
        return true;
    }

    const hasLeadSuit = hand.some(
        c => c.suit === leadSuit
    );

    if (hasLeadSuit) {
        return card.suit === leadSuit;
    }

    if (trump) {
        const hasTrump = hand.some(
            c => c.suit === trump
        );

        if (hasTrump) {
            return card.suit === trump;
        }
    }

    return true;
}


/* =========================
   LOBBY
========================= */

function renderLobby(state) {
    if (!state) return;

    showScreen(lobbyScreen);

    lobbyRoom.textContent =
        `Pokój: ${state.roomName || state.room || "—"}`;

    lobbyStatus.textContent =
        state.statusMessage ||
        "Wybierz drużynę.";

    lobbyPlayers.innerHTML = "";

    const players = Array.isArray(state.players)
        ? state.players
        : [];

    players.forEach((player, index) => {
        const element = document.createElement("div");

        element.className = "lobbyPlayer";

        const teamText =
            player.team === 0
                ? "Drużyna 1"
                : player.team === 1
                    ? "Drużyna 2"
                    : "bez drużyny";

        element.innerHTML =
            `<strong>${escapeHtml(player.name || `Gracz ${index + 1}`)}</strong>
             <span> — ${teamText}</span>`;

        lobbyPlayers.appendChild(element);
    });

    if (selectedTeam === 0) {
        selectedTeamDisplay.textContent =
            "Wybrano: Drużyna 1";
    } else if (selectedTeam === 1) {
        selectedTeamDisplay.textContent =
            "Wybrano: Drużyna 2";
    } else {
        selectedTeamDisplay.textContent =
            "Nie wybrano drużyny";
    }
}


/* =========================
   GAME STATE
========================= */

function renderGame(state) {
    if (!state) return;

    latestState = state;

    showScreen(gameScreen);

    renderScores(state);
    renderPlayers(state);
    renderTrump(state);
    renderPlayedCards(state);
    renderHand(state);
    renderGameInfo(state);
}

function renderScores(state) {
    const scores = state.scores || {};
    const overall = state.overallScores || {};
    const wins = state.gameWins || {};

    scoreTeam1.textContent =
        Number(scores[0] ?? 0);

    scoreTeam2.textContent =
        Number(scores[1] ?? 0);

    overallTeam1.textContent =
        Number(overall[0] ?? 0);

    overallTeam2.textContent =
        Number(overall[1] ?? 0);

    gamesTeam1.textContent =
        Number(wins[0] ?? 0);

    gamesTeam2.textContent =
        Number(wins[1] ?? 0);

    const names = state.teamNames || {};

    team1Name.textContent =
        names[0] || "Drużyna 1";

    team2Name.textContent =
        names[1] || "Drużyna 2";
}

function renderPlayers(state) {
    const players = Array.isArray(state.playerNames)
        ? state.playerNames
        : [];

    const meIndex = Number.isInteger(state.myPlayerIndex)
        ? state.myPlayerIndex
        : findMyPlayerIndex(state);

    if (meIndex < 0 || players.length === 0) {
        topPlayer.textContent = "—";
        leftPlayer.textContent = "—";
        rightPlayer.textContent = "—";
        currentPlayerName.textContent = "Ty";
        return;
    }

    const topIndex = (meIndex + 2) % 4;
    const leftIndex = (meIndex + 3) % 4;
    const rightIndex = (meIndex + 1) % 4;

    topPlayer.textContent =
        players[topIndex] || "—";

    leftPlayer.textContent =
        players[leftIndex] || "—";

    rightPlayer.textContent =
        players[rightIndex] || "—";

    currentPlayerName.textContent =
        players[meIndex] || "Ty";
}

function findMyPlayerIndex(state) {
    if (!state || !Array.isArray(state.players)) {
        return -1;
    }

    const index = state.players.findIndex(
        player => player.socketId === mySocketId
    );

    return index;
}

function renderTrump(state) {
    if (!state.trump) {
        trumpDisplay.textContent = "—";
        return;
    }

    trumpDisplay.textContent = state.trump;
    trumpDisplay.className =
        (state.trump === "♥" || state.trump === "♦")
            ? "red"
            : "black";
}


/* =========================
   PLAYED CARDS
========================= */

function renderPlayedCards(state) {
    playedCards.innerHTML = "";

    const trick = Array.isArray(state.trick)
        ? state.trick
        : [];

    trick.forEach(play => {
        if (!play || !play.card) {
            return;
        }

        const card = play.card;

        const element = document.createElement("div");

        element.className =
            `playedCard ${cardClass(card)}`;

        const playerName =
            play.playerName ||
            play.name ||
            (
                Array.isArray(state.playerNames)
                    ? state.playerNames[play.playerIndex]
                    : null
            ) ||
            "Gracz";

        element.innerHTML =
            `<span class="playedBy">
                ${escapeHtml(playerName)}
             </span>
             <span class="cardSymbol">
                ${escapeHtml(cardSymbol(card))}
             </span>`;

        playedCards.appendChild(element);
    });
}


/* =========================
   HAND
========================= */

function renderHand(state) {
    myCards.innerHTML = "";

    const hand = Array.isArray(state.hand)
        ? state.hand
        : [];

    if (!hand.length) {
        return;
    }

    hand.forEach(card => {
        const button = document.createElement("button");

        button.type = "button";

        button.className =
            `card ${cardClass(card)}`;

        const legal = isLegalClientPlay(state, card);

        if (legal) {
            button.classList.add("playable");
        } else {
            button.classList.add("disabled");
        }

        button.innerHTML =
            `<span class="cardSymbol">
                ${escapeHtml(cardSymbol(card))}
             </span>`;

        button.title =
            legal
                ? `Zagraj ${cardSymbol(card)}`
                : "Tej karty nie możesz teraz zagrać";

        button.addEventListener("click", () => {
            if (!legal) {
                return;
            }

            playCard(card);
        });

        myCards.appendChild(button);
    });
}


/* =========================
   GAME INFO
========================= */

function renderGameInfo(state) {
    let text = "";

    if (state.currentPlayerName) {
        text =
            `Ruch: ${state.currentPlayerName}`;
    } else if (
        Number.isInteger(state.currentPlayer)
        && Array.isArray(state.playerNames)
    ) {
        text =
            `Ruch: ${
                state.playerNames[state.currentPlayer] || "—"
            }`;
    }

    if (state.message) {
        text = state.message;
    }

    if (state.gameMessage) {
        text = state.gameMessage;
    }

    currentPlayerInfo.textContent = text;

    if (state.gameMessage) {
        gameMessage.textContent =
            state.gameMessage;
    } else if (state.message) {
        gameMessage.textContent =
            state.message;
    } else {
        gameMessage.textContent = "";
    }
}


/* =========================
   ACTIONS
========================= */

function playCard(card) {
    if (!latestState || !card) {
        return;
    }

    if (!isLegalClientPlay(latestState, card)) {
        return;
    }

    socket.emit("playCard", {
        card
    });
}


/* =========================
   TEAM SELECTION
========================= */

function chooseTeam(team) {
    selectedTeam = team;

    socket.emit("chooseTeam", {
        team
    });

    if (team === 0) {
        selectedTeamDisplay.textContent =
            "Wybrano: Drużyna 1";
    } else {
        selectedTeamDisplay.textContent =
            "Wybrano: Drużyna 2";
    }
}

team1Button.addEventListener("click", () => {
    chooseTeam(0);
});

team2Button.addEventListener("click", () => {
    chooseTeam(1);
});


/* =========================
   JOIN / LEAVE
========================= */

joinButton.addEventListener("click", () => {
    const nickname =
        nicknameInput.value.trim();

    const room =
        roomInput.value.trim();

    if (!nickname) {
        startMessage.textContent =
            "Podaj nick.";
        return;
    }

    if (!room) {
        startMessage.textContent =
            "Podaj nazwę pokoju.";
        return;
    }

    startMessage.textContent = "";

    socket.emit("joinRoom", {
        nickname,
        room
    });
});

nicknameInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        joinButton.click();
    }
});

roomInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        joinButton.click();
    }
});

leaveButton.addEventListener("click", () => {
    socket.emit("leaveRoom");

    selectedTeam = null;
    latestState = null;

    showScreen(startScreen);
});


/* =========================
   START GAME / BOTS
========================= */

botsButton.addEventListener("click", () => {
    socket.emit("startGameWithBots");
});


/* =========================
   SOCKET
========================= */

socket.on("connect", () => {
    mySocketId = socket.id;
});

socket.on("connect_error", () => {
    startMessage.textContent =
        "Nie udało się połączyć z serwerem.";
});

socket.on("errorMessage", message => {
    const text =
        typeof message === "string"
            ? message
            : message?.message || "Wystąpił błąd.";

    startMessage.textContent = text;
});

socket.on("message", message => {
    const text =
        typeof message === "string"
            ? message
            : message?.message || "";

    if (gameScreen.classList.contains("hidden")) {
        lobbyStatus.textContent = text;
    } else {
        gameMessage.textContent = text;
    }
});

socket.on("lobbyState", state => {
    renderLobby(state);
});

socket.on("gameState", state => {
    renderGame(state);
});

socket.on("state", state => {
    if (!state) return;

    latestState = state;

    if (
        state.phase === "lobby" ||
        state.status === "lobby"
    ) {
        renderLobby(state);
    } else {
        renderGame(state);
    }
});

socket.on("gameStarted", state => {
    if (state) {
        renderGame(state);
    }
});


/* =========================
   INITIAL
========================= */

showScreen(startScreen);
