const socket = io();

const $ = id => document.getElementById(id);

// ================================
// EKRANY
// ================================

const startScreen = $("startScreen");
const lobbyScreen = $("lobbyScreen");
const gameScreen = $("gameScreen");

// ================================
// START
// ================================

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

// ================================
// GRA
// ================================

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

// ================================
// STAN
// ================================

let myPlayerIndex = null;
let myTeam = null;
let currentRoom = null;
let currentHand = [];

// ================================
// POMOCNICZE
// ================================

function showScreen(screen) {
    if (startScreen) startScreen.classList.add("hidden");
    if (lobbyScreen) lobbyScreen.classList.add("hidden");
    if (gameScreen) gameScreen.classList.add("hidden");

    if (screen) {
        screen.classList.remove("hidden");
    }
}

function errorMessage(message) {
    alert(message);
}

// ================================
// POŁĄCZENIE
// ================================

socket.on("connect", () => {
    console.log("Połączono z serwerem:", socket.id);

    if (joinButton) {
        joinButton.disabled = false;
        joinButton.textContent = "WEJDŹ DO GRY";
    }
});

socket.on("connect_error", error => {
    console.error("Błąd połączenia:", error);

    if (joinButton) {
        joinButton.disabled = true;
        joinButton.textContent = "BRAK POŁĄCZENIA";
    }

    errorMessage(
        "Nie udało się połączyć z serwerem.\n\n" +
        error.message
    );
});

socket.on("disconnect", () => {
    console.log("Rozłączono z serwerem.");

    if (joinButton) {
        joinButton.disabled = true;
        joinButton.textContent = "BRAK POŁĄCZENIA";
    }
});

// ================================
// WEJŚCIE DO POKOJU
// ================================

if (joinButton) {
    joinButton.addEventListener("click", () => {

        const name = nicknameInput
            ? nicknameInput.value.trim()
            : "";

        const roomId = roomInput
            ? roomInput.value.trim().toUpperCase()
            : "";

        if (!name) {
            errorMessage("Wpisz nick.");
            return;
        }

        if (!roomId) {
            errorMessage("Wpisz kod pokoju.");
            return;
        }

        if (!socket.connected) {
            errorMessage("Brak połączenia z serwerem.");
            return;
        }

        joinButton.disabled = true;
        joinButton.textContent = "ŁĄCZENIE...";

        socket.emit("joinRoom", {
            roomId: roomId,
            name: name
        });
    });
}

// ================================
// DOŁĄCZONO
// ================================

socket.on("joinedRoom", data => {
    console.log("Dołączono do pokoju:", data);

    currentRoom = data.roomId;

    if (lobbyRoom) {
        lobbyRoom.textContent = data.roomId;
    }

    /*
     * NAJWAŻNIEJSZE:
     * po poprawnym dołączeniu przechodzimy
     * z ekranu startowego do lobby.
     */
    showScreen(lobbyScreen);

    if (joinButton) {
        joinButton.disabled = false;
        joinButton.textContent = "WEJDŹ DO GRY";
    }
});

// ================================
// LOBBY
// ================================

socket.on("lobbyState", data => {
    console.log("Lobby:", data);

    currentRoom = data.roomId;

    if (lobbyRoom) {
        lobbyRoom.textContent = data.roomId;
    }

    if (lobbyPlayers) {
        lobbyPlayers.innerHTML = "";

        data.players.forEach(player => {
            const row = document.createElement("div");

            row.className = "lobby-player";

            let teamText = "Brak drużyny";

            if (player.team === 0) {
                teamText = "Drużyna 1";
            }

            if (player.team === 1) {
                teamText = "Drużyna 2";
            }

            row.textContent =
                player.name +
                (player.isBot ? " 🤖" : "") +
                " — " +
                teamText;

            lobbyPlayers.appendChild(row);
        });
    }

    if (lobbyStatus) {
        if (data.playerCount >= 4) {
            lobbyStatus.textContent =
                "Wszyscy gracze są przy stole.";
        } else {
            lobbyStatus.textContent =
                `Gracze: ${data.playerCount}/4`;
        }
    }

    showScreen(lobbyScreen);
});

// ================================
// WYBÓR DRUŻYNY
// ================================

if (team1Button) {
    team1Button.addEventListener("click", () => {

        myTeam = 0;

        if (selectedTeam) {
            selectedTeam.textContent =
                "Wybrano: Drużyna 1";
        }

        socket.emit("chooseTeam", 0);
    });
}

if (team2Button) {
    team2Button.addEventListener("click", () => {

        myTeam = 1;

        if (selectedTeam) {
            selectedTeam.textContent =
                "Wybrano: Drużyna 2";
        }

        socket.emit("chooseTeam", 1);
    });
}

// ================================
// GRA Z BOTAMI
// ================================

if (botsButton) {
    botsButton.addEventListener("click", () => {
        socket.emit("startWithBots");
    });
}

// ================================
// OPUSZCZENIE POKOJU
// ================================

if (leaveButton) {
    leaveButton.addEventListener("click", () => {
        socket.emit("leaveRoom");

        currentRoom = null;
        myPlayerIndex = null;
        myTeam = null;

        showScreen(startScreen);
    });
}

// ================================
// START GRY
// ================================

socket.on("gameStarted", () => {
    console.log("Gra rozpoczęta.");

    showScreen(gameScreen);
});

// ================================
// STAN GRY
// ================================

socket.on("gameState", state => {
    console.log("Stan gry:", state);

    myPlayerIndex = state.playerIndex;
    myTeam = state.myTeam;

    currentHand = state.hand || [];

    // ----------------------------
    // KOLOR ATU
    // ----------------------------

    if (trumpDisplay) {

        if (state.trump) {
            const suitName =
                state.suitNames?.[state.trump] ||
                state.trump;

            trumpDisplay.textContent =
                "Obrany kolor: " + suitName;
        } else {
            trumpDisplay.textContent =
                "Kolor nie został jeszcze obrany";
        }
    }

    // ----------------------------
    // NAZWY DRUŻYN
    // ----------------------------

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

    // ----------------------------
    // PUNKTY GRY
    // ----------------------------

    if (scoreTeam1) {
        scoreTeam1.textContent =
            state.scores?.[0] ?? 0;
    }

    if (scoreTeam2) {
        scoreTeam2.textContent =
            state.scores?.[1] ?? 0;
    }

    // ----------------------------
    // PUNKTY OGÓLNE
    // ----------------------------

    if (overallTeam1) {
        overallTeam1.textContent =
            state.overallScores?.[0] ?? 0;
    }

    if (overallTeam2) {
        overallTeam2.textContent =
            state.overallScores?.[1] ?? 0;
    }

    // ----------------------------
    // CAŁE PUNKTY
    // ----------------------------

    if (gamesTeam1) {
        gamesTeam1.textContent =
            state.gameWins?.[0] ?? 0;
    }

    if (gamesTeam2) {
        gamesTeam2.textContent =
            state.gameWins?.[1] ?? 0;
    }

    // ----------------------------
    // GRACZE
    // ----------------------------

    const names = state.playerNames || [];

    if (topPlayer) {
        topPlayer.textContent =
            names[2] || "Czekam...";
    }

    if (leftPlayer) {
        leftPlayer.textContent =
            names[1] || "Czekam...";
    }

    if (rightPlayer) {
        rightPlayer.textContent =
            names[3] || "Czekam...";
    }

    // ----------------------------
    // RĘKA
    // ----------------------------

    renderHand(currentHand);

    // ----------------------------
    // SZTYCH
    // ----------------------------

    renderTrick(state.trick || []);

    // ----------------------------
    // KOMUNIKAT
    // ----------------------------

    if (gameMessage) {
        gameMessage.textContent =
            state.message || "";
    }

    showScreen(gameScreen);
});

// ================================
// KARTY W RĘCE
// ================================

function renderHand(hand) {

    if (!myCards) {
        return;
    }

    myCards.innerHTML = "";

    hand.forEach((card, index) => {

        const button =
            document.createElement("button");

        button.type = "button";

        button.className = "card";

        const suitName =
            card.suitName ||
            card.suit ||
            "";

        const rank =
            card.rank ||
            card.value ||
            "";

        button.innerHTML =
            `<strong>${rank}</strong><br>${suitName}`;

        button.addEventListener(
            "click",
            () => {
                socket.emit("playCard", card);
            }
        );

        myCards.appendChild(button);
    });
}

// ================================
// SZTYCH
// ================================

function renderTrick(trick) {

    if (!playedCards) {
        return;
    }

    playedCards.innerHTML = "";

    trick.forEach(play => {

        const div =
            document.createElement("div");

        div.className = "played-card";

        const playerName =
            play.playerName ||
            `Gracz ${play.playerIndex + 1}`;

        const card =
            play.card || {};

        const rank =
            card.rank ||
            card.value ||
            "";

        const suitName =
            card.suitName ||
            card.suit ||
            "";

        div.innerHTML =
            `<div>${playerName}</div>
             <strong>${rank}</strong>
             <div>${suitName}</div>`;

        playedCards.appendChild(div);
    });
}

// ================================
// OBIERANIE KOLORU
// ================================

socket.on("chooseTrump", data => {

    console.log("Możesz obrać kolor:", data);

    showTrumpChooser();
});

function showTrumpChooser() {

    /*
     * Nie zakładamy żadnego konkretnego HTML-a.
     * Tworzymy prosty panel bezpośrednio tutaj.
     */

    let chooser =
        document.getElementById("trumpChooser");

    if (chooser) {
        chooser.remove();
    }

    chooser =
        document.createElement("div");

    chooser.id = "trumpChooser";

    chooser.style.position = "fixed";
    chooser.style.left = "50%";
    chooser.style.top = "50%";
    chooser.style.transform = "translate(-50%, -50%)";
    chooser.style.zIndex = "9999";
    chooser.style.background = "#171717";
    chooser.style.padding = "25px";
    chooser.style.borderRadius = "15px";
    chooser.style.border = "2px solid #555";
    chooser.style.textAlign = "center";
    chooser.style.color = "white";
    chooser.style.minWidth = "260px";

    const title =
        document.createElement("h2");

    title.textContent = "OBIERZ KOLOR";

    chooser.appendChild(title);

    const suits = [
        {
            id: "♥",
            name: "Czerwo"
        },
        {
            id: "♦",
            name: "Dzwonek"
        },
        {
            id: "♣",
            name: "Krzak"
        },
        {
            id: "♠",
            name: "Wino"
        }
    ];

    suits.forEach(suit => {

        const button =
            document.createElement("button");

        button.type = "button";

        button.textContent =
            `${suit.id} ${suit.name}`;

        button.style.display = "block";
        button.style.width = "100%";
        button.style.margin = "8px 0";
        button.style.padding = "12px";
        button.style.fontSize = "18px";
        button.style.cursor = "pointer";

        button.addEventListener(
            "click",
            () => {

                socket.emit(
                    "chooseTrump",
                    suit.id
                );

                chooser.remove();
            }
        );

        chooser.appendChild(button);
    });

    document.body.appendChild(chooser);
}

// ================================
// BŁĘDY Z SERWERA
// ================================

socket.on("errorMessage", message => {

    console.error(
        "Błąd serwera:",
        message
    );

    errorMessage(message);

    if (joinButton) {
        joinButton.disabled = false;
        joinButton.textContent =
            "WEJDŹ DO GRY";
    }
});

// ================================
// STARTOWY EKRAN
// ================================

showScreen(startScreen);

console.log("Sznaps client załadowany.");
