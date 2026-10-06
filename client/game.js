const socket = io();

let myPlayerId = null;
let currentRoom = null;
let currentPlayers = [];

const startScreen = document.getElementById("startScreen");
const lobbyScreen = document.getElementById("lobbyScreen");
const gameScreen = document.getElementById("gameScreen");

const nicknameInput = document.getElementById("nickname");
const roomIdInput = document.getElementById("roomId");

const joinButton = document.getElementById("joinButton");
const leaveButton = document.getElementById("leaveButton");

const startError = document.getElementById("startError");

const roomName = document.getElementById("roomName");
const playersList = document.getElementById("playersList");

const myName = document.getElementById("myName");

const playerTop = document.getElementById("playerTop");
const playerLeft = document.getElementById("playerLeft");
const playerRight = document.getElementById("playerRight");

const scoreTeam1 = document.getElementById("scoreTeam1");
const scoreTeam2 = document.getElementById("scoreTeam2");

const trumpElement = document.getElementById("trump");
const gameMessage = document.getElementById("gameMessage");

const myHand = document.getElementById("myHand");
const playedCards = document.getElementById("playedCards");


/* =========================
   POMOCNICZE
========================= */

function showScreen(screen) {
    startScreen.classList.add("hidden");
    lobbyScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");

    screen.classList.remove("hidden");
}

function showError(message) {
    startError.textContent = message;
}

function clearError() {
    startError.textContent = "";
}


/* =========================
   DOŁĄCZANIE
========================= */

joinButton.addEventListener("click", joinGame);

nicknameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        joinGame();
    }
});

roomIdInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        joinGame();
    }
});

function joinGame() {
    clearError();

    const nickname = nicknameInput.value.trim();
    const roomId = roomIdInput.value.trim();

    if (!nickname) {
        showError("Wpisz swój pseudonim.");
        nicknameInput.focus();
        return;
    }

    if (!roomId) {
        showError("Wpisz nazwę pokoju.");
        roomIdInput.focus();
        return;
    }

    if (nickname.length < 2) {
        showError("Nick musi mieć przynajmniej 2 znaki.");
        return;
    }

    currentRoom = roomId;

    socket.emit("joinRoom", {
        roomId,
        nickname
    });
}


/* =========================
   ODEJŚCIE Z POKOJU
========================= */

leaveButton.addEventListener("click", () => {
    socket.emit("leaveRoom");

    currentRoom = null;
    currentPlayers = [];
    myPlayerId = null;

    showScreen(startScreen);
});


/* =========================
   SOCKET
========================= */

socket.on("connect", () => {
    myPlayerId = socket.id;

    console.log("Połączono z serwerem:", socket.id);
});

socket.on("disconnect", () => {
    gameMessage.textContent = "Połączenie z serwerem zostało utracone.";
});

socket.on("errorMessage", (message) => {
    showError(message);
});

socket.on("roomFull", () => {
    showError("Ten pokój jest już pełny.");
});


/* =========================
   AKTUALIZACJA POKOJU
========================= */

socket.on("roomUpdate", (data) => {

    currentRoom = data.roomId;
    currentPlayers = data.players || [];

    roomName.textContent = currentRoom;

    renderPlayers();

    const me = currentPlayers.find(
        player => player.id === myPlayerId
    );

    if (me) {
        myName.textContent = me.nickname;
    }

    showScreen(lobbyScreen);
});


/* =========================
   LISTA GRACZY
========================= */

function renderPlayers() {

    playersList.innerHTML = "";

    for (let seat = 0; seat < 4; seat++) {

        const player = currentPlayers.find(
            p => p.seat === seat
        );

        const slot = document.createElement("div");

        slot.className = "player-slot";

        if (player) {

            const teamName =
                player.team === 0
                    ? "Drużyna 1"
                    : "Drużyna 2";

            slot.innerHTML = `
                <span class="seat">
                    ${seat + 1}
                </span>

                <strong>
                    ${escapeHtml(player.nickname)}
                </strong>

                <small>
                    — ${teamName}
                </small>
            `;

        } else {

            slot.classList.add("empty");

            slot.innerHTML = `
                <span class="seat">
                    ${seat + 1}
                </span>

                Wolne miejsce
            `;
        }

        playersList.appendChild(slot);
    }
}


/* =========================
   EKRAN GRY
========================= */

function renderGamePlayers(players) {

    const me = players.find(
        player => player.id === myPlayerId
    );

    if (!me) {
        return;
    }

    myName.textContent = me.nickname;

    /*
        Miejsca:

        0 = dół / my
        1 = lewo
        2 = góra
        3 = prawo
    */

    const positions = {
        top: players.find(p => p.seat === 2),
        left: players.find(p => p.seat === 1),
        right: players.find(p => p.seat === 3)
    };

    playerTop.textContent =
        positions.top
            ? positions.top.nickname
            : "---";

    playerLeft.textContent =
        positions.left
            ? positions.left.nickname
            : "---";

    playerRight.textContent =
        positions.right
            ? positions.right.nickname
            : "---";
}


/* =========================
   KARTY
========================= */

function renderHand(hand) {

    myHand.innerHTML = "";

    if (!hand) {
        return;
    }

    hand.forEach((card, index) => {

        const cardElement =
            document.createElement("div");

        cardElement.className = "card";

        if (card.suit === "♥" || card.suit === "♦") {
            cardElement.classList.add("red");
        }

        cardElement.innerHTML = `
            <div class="rank">
                ${card.rank}
            </div>

            <div class="suit">
                ${card.suit}
            </div>
        `;

        cardElement.addEventListener(
            "click",
            () => {

                if (!currentRoom) {
                    return;
                }

                socket.emit("playCard", {
                    roomId: currentRoom,
                    cardIndex: index
                });
            }
        );

        myHand.appendChild(cardElement);
    });
}


/* =========================
   KARTY NA STOLE
========================= */

function renderPlayedCards(trick) {

    playedCards.innerHTML = "";

    if (!trick) {
        return;
    }

    trick.forEach((played, index) => {

        const card = played.card;

        const cardElement =
            document.createElement("div");

        cardElement.className = "card";

        if (card.suit === "♥" || card.suit === "♦") {
            cardElement.classList.add("red");
        }

        cardElement.style.position = "absolute";

        const positions = [
            {
                left: "50%",
                top: "0",
                transform: "translateX(-50%)"
            },
            {
                left: "0",
                top: "50%",
                transform: "translateY(-50%)"
            },
            {
                right: "0",
                top: "50%",
                transform: "translateY(-50%)"
            },
            {
                left: "50%",
                bottom: "0",
                transform: "translateX(-50%)"
            }
        ];

        const position =
            positions[index] || positions[0];

        Object.assign(
            cardElement.style,
            position
        );

        cardElement.innerHTML = `
            <div class="rank">
                ${card.rank}
            </div>

            <div class="suit">
                ${card.suit}
            </div>
        `;

        playedCards.appendChild(cardElement);
    });
}


/* =========================
   STAN GRY
========================= */

socket.on("gameState", (state) => {

    showScreen(gameScreen);

    if (state.players) {
        renderGamePlayers(state.players);
    }

    if (state.gamePoints) {

        scoreTeam1.textContent =
            state.gamePoints[0] ?? 0;

        scoreTeam2.textContent =
            state.gamePoints[1] ?? 0;
    }

    if (state.trump) {

        trumpElement.textContent =
            `${state.trump} ${state.trumpName || ""}`;

    } else {

        trumpElement.textContent = "—";
    }

    renderPlayedCards(state.trick);

    const me = state.players
        ? state.players.find(
            player => player.id === myPlayerId
        )
        : null;

    if (me) {
        renderHand(me.hand);
    }

    if (state.currentPlayer === myPlayerId) {
        gameMessage.textContent =
            "Twoja kolej.";
    } else {
        gameMessage.textContent =
            "Czekaj na ruch...";
    }
});


/* =========================
   BEZPIECZNY TEKST
========================= */

function escapeHtml(text) {

    const div = document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}
