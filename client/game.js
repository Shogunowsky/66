const socket = io();

const startScreen = document.getElementById("startScreen");
const lobbyScreen = document.getElementById("lobbyScreen");
const gameScreen = document.getElementById("gameScreen");

const nameInput = document.getElementById("nameInput");
const roomInput = document.getElementById("roomInput");
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

const scoreTeam1 = document.getElementById("scoreTeam1");
const scoreTeam2 = document.getElementById("scoreTeam2");

const overallTeam1 = document.getElementById("overallTeam1");
const overallTeam2 = document.getElementById("overallTeam2");

const gamesTeam1 = document.getElementById("gamesTeam1");
const gamesTeam2 = document.getElementById("gamesTeam2");

const teamName1 = document.getElementById("teamName1");
const teamName2 = document.getElementById("teamName2");

const playerTop = document.getElementById("playerTop");
const playerLeft = document.getElementById("playerLeft");
const playerRight = document.getElementById("playerRight");
const playerBottom = document.getElementById("playerBottom");

const playedCards = document.getElementById("playedCards");
const hand = document.getElementById("hand");

const gameMessage = document.getElementById("gameMessage");

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

function showScreen(screen) {
    startScreen.classList.add("hidden");
    lobbyScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");

    screen.classList.remove("hidden");
}

function showError(message) {
    alert(message);
}

function cardText(card) {
    if (!card) {
        return "";
    }

    return `${card.rank}${card.suit}`;
}

function getSuitClass(suit) {
    if (suit === "♥" || suit === "♦") {
        return "red";
    }

    return "black";
}

function createCardElement(card, clickable = false) {
    const element = document.createElement("button");

    element.type = "button";
    element.className = "card";

    if (getSuitClass(card.suit) === "red") {
        element.classList.add("red");
    }

    if (clickable) {
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

    if (clickable) {
        element.addEventListener("click", () => {
            socket.emit("playCard", card);
        });
    }

    return element;
}

function renderLobby(data) {
    currentRoom = data.roomId;

    lobbyRoom.textContent =
        `Pokój: ${data.roomId}`;

    lobbyStatus.textContent =
        `Oczekiwanie na graczy: ${data.playerCount}/4`;

    lobbyPlayers.innerHTML = "";

    for (const player of data.players) {
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

function setTeam(team) {
    if (team !== 0 && team !== 1) {
        return;
    }

    myTeam = team;

    selectedTeam.textContent =
        team === 0
            ? "Wybrano: Drużyna 1"
            : "Wybrano: Drużyna 2";

    team1Button.classList.toggle(
        "selected",
        team === 0
    );

    team2Button.classList.toggle(
        "selected",
        team === 1
    );

    socket.emit("chooseTeam", team);
}

team1Button?.addEventListener(
    "click",
    () => setTeam(0)
);

team2Button?.addEventListener(
    "click",
    () => setTeam(1)
);

joinButton?.addEventListener(
    "click",
    () => {
        const name =
            nameInput.value.trim();

        const roomId =
            roomInput.value.trim().toUpperCase();

        if (!name) {
            showError("Podaj nick.");
            return;
        }

        if (!roomId) {
            showError("Podaj kod pokoju.");
            return;
        }

        socket.emit("joinRoom", {
            name,
            roomId
        });
    }
);

botsButton?.addEventListener(
    "click",
    () => {
        socket.emit("startWithBots");
    }
);

leaveButton?.addEventListener(
    "click",
    () => {
        socket.emit("leaveRoom");

        showScreen(startScreen);
    }
);

socket.on(
    "joinedRoom",
    data => {
        currentRoom = data.roomId;

        showScreen(lobbyScreen);
    }
);

socket.on(
    "lobbyState",
    data => {
        renderLobby(data);

        if (
            lobbyScreen.classList.contains("hidden") &&
            !gameScreen.classList.contains("hidden")
        ) {
            return;
        }

        showScreen(lobbyScreen);
    }
);

socket.on(
    "gameStarted",
    () => {
        showScreen(gameScreen);
    }
);

socket.on(
    "gameState",
    state => {
        currentState = state;

        if (
            typeof state.playerIndex === "number"
        ) {
            myPlayerIndex =
                state.playerIndex;
        }

        myTeam =
            state.myTeam;

        renderGame(state);
    }
);

socket.on(
    "chooseTrump",
    data => {
        /*
         * To jest moment, w którym gracz
         * musi obowiązkowo wybrać kolor.
         */
        showTrumpChooser(
            data.hand || []
        );
    }
);

socket.on(
    "errorMessage",
    message => {
        showError(message);
    }
);

function renderGame(state) {
    renderTrump(state);

    renderScores(state);

    renderPlayers(state);

    renderTrick(state);

    renderHand(state);

    if (gameMessage) {
        gameMessage.textContent =
            state.message || "";
    }
}

function renderTrump(state) {
    if (!trumpDisplay) {
        return;
    }

    if (!state.trump) {
        trumpDisplay.textContent =
            "Kolor: nieobrany";

        return;
    }

    const suitName =
        SUIT_NAMES[state.trump] ||
        state.trump;

    trumpDisplay.textContent =
        `Obrany kolor: ${state.trump} ${suitName}`;
}

function renderScores(state) {
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

    if (teamName1) {
        teamName1.textContent =
            state.teamNames?.[0] ||
            "Drużyna 1";
    }

    if (teamName2) {
        teamName2.textContent =
            state.teamNames?.[1] ||
            "Drużyna 2";
    }
}

function renderPlayers(state) {
    const players =
        state.players || [];

    if (players.length < 4) {
        return;
    }

    /*
     * Układ zgodny z server/game.js:
     *
     *        [2]
     *
     * [1]          [3]
     *
     *        [0]
     *
     * Gracz [0] jest nami.
     */

    let bottomIndex =
        myPlayerIndex;

    if (
        bottomIndex === null ||
        bottomIndex === undefined
    ) {
        bottomIndex = 0;
    }

    const topIndex =
        (bottomIndex + 2) % 4;

    const leftIndex =
        (bottomIndex + 1) % 4;

    const rightIndex =
        (bottomIndex + 3) % 4;

    if (playerBottom) {
        playerBottom.textContent =
            players[bottomIndex]?.name ||
            "";
    }

    if (playerTop) {
        playerTop.textContent =
            players[topIndex]?.name ||
            "";
    }

    if (playerLeft) {
        playerLeft.textContent =
            players[leftIndex]?.name ||
            "";
    }

    if (playerRight) {
        playerRight.textContent =
            players[rightIndex]?.name ||
            "";
    }
}

function renderTrick(state) {
    if (!playedCards) {
        return;
    }

    playedCards.innerHTML = "";

    const trick =
        state.trick || [];

    for (const play of trick) {
        const wrapper =
            document.createElement("div");

        wrapper.className =
            "played-card";

        const cardElement =
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

        wrapper.appendChild(
            cardElement
        );

        wrapper.appendChild(
            player
        );

        playedCards.appendChild(
            wrapper
        );
    }
}

function renderHand(state) {
    if (!hand) {
        return;
    }

    hand.innerHTML = "";

    const cards =
        state.hand || [];

    /*
     * Jeśli klient nie dostał kart,
     * nie próbujemy niczego zgadywać.
     */
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

        hand.appendChild(element);
    }
}

function showTrumpChooser(cards) {
    /*
     * Usuwamy poprzednie okno.
     */
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

        button.type = "button";

        button.className =
            "trump-button";

        if (
            suit === "♥" ||
            suit === "♦"
        ) {
            button.classList.add("red");
        }

        button.innerHTML =
            `<strong>${suit}</strong>
             <span>${SUIT_NAMES[suit]}</span>`;

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

showScreen(startScreen);
