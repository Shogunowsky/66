const socket = io();

const startScreen = document.getElementById("startScreen");
const lobbyScreen = document.getElementById("lobbyScreen");
const gameScreen = document.getElementById("gameScreen");

const nicknameInput = document.getElementById("nickname");
const roomInput = document.getElementById("room");
const joinButton = document.getElementById("joinButton");

const lobbyRoom = document.getElementById("lobbyRoom");
const lobbyStatus = document.getElementById("lobbyStatus");
const lobbyPlayers = document.getElementById("lobbyPlayers");

const team1Button = document.getElementById("team1Button");
const team2Button = document.getElementById("team2Button");
const selectedTeam = document.getElementById("selectedTeam");

const botsButton = document.getElementById("botsButton");
const leaveButton = document.getElementById("leaveButton");

const trumpDisplay = document.getElementById("trumpDisplay");

const team1Name = document.getElementById("team1Name");
const team2Name = document.getElementById("team2Name");

const scoreTeam1 = document.getElementById("scoreTeam1");
const scoreTeam2 = document.getElementById("scoreTeam2");

const overallTeam1 = document.getElementById("overallTeam1");
const overallTeam2 = document.getElementById("overallTeam2");

const gamesTeam1 = document.getElementById("gamesTeam1");
const gamesTeam2 = document.getElementById("gamesTeam2");

const topPlayer = document.getElementById("topPlayer");
const leftPlayer = document.getElementById("leftPlayer");
const rightPlayer = document.getElementById("rightPlayer");

const playedCards = document.getElementById("playedCards");
const myCards = document.getElementById("myCards");

const gameMessage = document.getElementById("gameMessage");

let currentState = null;
let myPlayerIndex = null;
let myTeam = null;
let currentRoom = null;


/* =========================
   EKRANY
========================= */

function showScreen(screen) {
    startScreen.classList.add("hidden");
    lobbyScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");

    screen.classList.remove("hidden");
}


/* =========================
   BŁĘDY
========================= */

function showError(message) {
    alert(message);
}


/* =========================
   KARTY
========================= */

const SUIT_NAMES = {
    "♥": "Czerwo",
    "♦": "Dzwonek",
    "♣": "Krzak",
    "♠": "Wino"
};

function getSuitClass(suit) {
    if (suit === "♥" || suit === "♦") {
        return "red";
    }

    return "black";
}

function createCardElement(card, playable = false) {
    const element = document.createElement("button");

    element.type = "button";
    element.className = "card";

    if (getSuitClass(card.suit) === "red") {
        element.classList.add("red");
    }

    if (playable) {
        element.classList.add("playable");
    }

    const rank = document.createElement("span");

    rank.className = "card-rank";
    rank.textContent = card.rank;

    const suit = document.createElement("span");

    suit.className = "card-suit";
    suit.textContent = card.suit;

    const suitName = document.createElement("small");

    suitName.className = "card-suit-name";
    suitName.textContent =
        SUIT_NAMES[card.suit] || "";

    element.appendChild(rank);
    element.appendChild(suit);
    element.appendChild(suitName);

    if (playable) {
        element.addEventListener("click", () => {
            socket.emit("playCard", card);
        });
    }

    return element;
}


/* =========================
   DOŁĄCZANIE DO POKOJU
========================= */

joinButton.addEventListener("click", () => {
    const name =
        nicknameInput.value.trim();

    const roomId =
        roomInput.value.trim().toUpperCase();

    if (!name) {
        showError("Podaj pseudonim.");
        return;
    }

    if (!roomId) {
        showError("Podaj pokój.");
        return;
    }

    socket.emit("joinRoom", {
        name,
        roomId
    });
});


/* =========================
   WYBÓR DRUŻYNY
========================= */

function setTeam(team) {
    if (team !== 0 && team !== 1) {
        return;
    }

    myTeam = team;

    if (team === 0) {
        selectedTeam.textContent =
            "Wybrano: Drużyna 1";

        team1Button.classList.add("selected");
        team2Button.classList.remove("selected");
    } else {
        selectedTeam.textContent =
            "Wybrano: Drużyna 2";

        team1Button.classList.remove("selected");
        team2Button.classList.add("selected");
    }

    socket.emit("chooseTeam", team);
}

team1Button.addEventListener(
    "click",
    () => setTeam(0)
);

team2Button.addEventListener(
    "click",
    () => setTeam(1)
);


/* =========================
   BOTY
========================= */

botsButton.addEventListener("click", () => {
    socket.emit("startWithBots");
});


/* =========================
   OPUSZCZANIE
========================= */

leaveButton.addEventListener("click", () => {
    socket.emit("leaveRoom");

    currentState = null;
    myPlayerIndex = null;
    myTeam = null;

    showScreen(startScreen);
});


/* =========================
   SOCKET — DOŁĄCZONO
========================= */

socket.on("joinedRoom", data => {
    currentRoom = data.roomId;

    lobbyRoom.textContent =
        data.roomId;

    showScreen(lobbyScreen);
});


/* =========================
   LOBBY
========================= */

socket.on("lobbyState", data => {
    renderLobby(data);
});

function renderLobby(data) {
    lobbyRoom.textContent =
        data.roomId || currentRoom || "—";

    lobbyStatus.textContent =
        `Oczekiwanie na graczy: ${data.playerCount}/4`;

    lobbyPlayers.innerHTML = "";

    for (const player of data.players || []) {
        const row =
            document.createElement("div");

        row.className =
            "lobby-player";

        const name =
            document.createElement("span");

        name.textContent =
            player.name;

        if (player.isBot) {
            name.textContent += " 🤖";
        }

        const team =
            document.createElement("span");

        if (player.team === 0) {
            team.textContent =
                "Drużyna 1";
        } else if (player.team === 1) {
            team.textContent =
                "Drużyna 2";
        } else {
            team.textContent =
                "brak drużyny";
        }

        row.appendChild(name);
        row.appendChild(team);

        lobbyPlayers.appendChild(row);
    }

    showScreen(lobbyScreen);
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
        myTeam =
            state.myTeam;
    }

    renderGame(state);
});


/* =========================
   OBIERANIE KOLORU
========================= */

socket.on("chooseTrump", data => {
    showTrumpChooser(
        data.hand || []
    );
});


/* =========================
   BŁĄD Z SERWERA
========================= */

socket.on("errorMessage", message => {
    showError(message);
});


/* =========================
   RENDER GRY
========================= */

function renderGame(state) {
    renderTrump(state);
    renderScores(state);
    renderPlayers(state);
    renderTrick(state);
    renderHand(state);

    gameMessage.textContent =
        state.message || "—";
}


/* =========================
   ATUT
========================= */

function renderTrump(state) {
    if (!state.trump) {
        trumpDisplay.textContent =
            "Obrany kolor: —";

        return;
    }

    trumpDisplay.textContent =
        `Obrany kolor: ${state.trump} ${SUIT_NAMES[state.trump]}`;
}


/* =========================
   PUNKTY
========================= */

function renderScores(state) {
    team1Name.textContent =
        state.teamNames?.[0] ||
        "Drużyna 1";

    team2Name.textContent =
        state.teamNames?.[1] ||
        "Drużyna 2";

    scoreTeam1.textContent =
        state.scores?.[0] ?? 0;

    scoreTeam2.textContent =
        state.scores?.[1] ?? 0;

    overallTeam1.textContent =
        state.overallScores?.[0] ?? 0;

    overallTeam2.textContent =
        state.overallScores?.[1] ?? 0;

    gamesTeam1.textContent =
        state.gameWins?.[0] ?? 0;

    gamesTeam2.textContent =
        state.gameWins?.[1] ?? 0;
}


/* =========================
   GRACZE PRZY STOLE
========================= */

function renderPlayers(state) {
    const players =
        state.players || [];

    if (players.length < 4) {
        return;
    }

    if (
        myPlayerIndex === null ||
        myPlayerIndex === undefined
    ) {
        return;
    }

    /*
     * Układ serwera:
     *
     * 0 = drużyna 1
     * 1 = drużyna 2
     * 2 = drużyna 1
     * 3 = drużyna 2
     *
     * Partner jest więc naprzeciwko.
     */

    const topIndex =
        (myPlayerIndex + 2) % 4;

    const leftIndex =
        (myPlayerIndex + 1) % 4;

    const rightIndex =
        (myPlayerIndex + 3) % 4;

    topPlayer.textContent =
        players[topIndex]?.name || "—";

    leftPlayer.textContent =
        players[leftIndex]?.name || "—";

    rightPlayer.textContent =
        players[rightIndex]?.name || "—";
}


/* =========================
   ZAGRANE KARTY
========================= */

function renderTrick(state) {
    playedCards.innerHTML = "";

    const trick =
        state.trick || [];

    for (const play of trick) {
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
            ]?.name ||
            `Gracz ${play.playerIndex + 1}`;

        wrapper.appendChild(card);
        wrapper.appendChild(player);

        playedCards.appendChild(wrapper);
    }
}


/* =========================
   MOJE KARTY
========================= */

function renderHand(state) {
    myCards.innerHTML = "";

    const cards =
        state.hand || [];

    for (const card of cards) {
        const playable =
            state.phase === "playing" &&
            state.currentPlayer ===
                state.playerIndex;

        const element =
            createCardElement(
                card,
                playable
            );

        myCards.appendChild(element);
    }
}


/* =========================
   OKNO OBIERANIA
========================= */

function showTrumpChooser(cards) {
    const old =
        document.getElementById(
            "trumpChooser"
        );

    if (old) {
        old.remove();
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

    box.appendChild(title);

    const info =
        document.createElement("p");

    info.textContent =
        "Wybierz kolor atu.";

    box.appendChild(info);

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

        button.type =
            "button";

        button.className =
            "trump-button";

        if (
            suit === "♥" ||
            suit === "♦"
        ) {
            button.classList.add("red");
        }

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

    box.appendChild(buttons);
    overlay.appendChild(box);

    document.body.appendChild(overlay);
}


/* =========================
   START
========================= */

showScreen(startScreen);
