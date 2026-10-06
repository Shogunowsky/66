const socket = io();

const startScreen = document.getElementById("startScreen");
const lobbyScreen = document.getElementById("lobbyScreen");
const gameScreen = document.getElementById("gameScreen");

const nicknameInput = document.getElementById("nickname");
const roomInput = document.getElementById("room");

const joinButton = document.getElementById("joinButton");
const leaveButton = document.getElementById("leaveButton");
const botsButton = document.getElementById("botsButton");

const lobbyRoom = document.getElementById("lobbyRoom");
const lobbyPlayers = document.getElementById("lobbyPlayers");
const lobbyStatus = document.getElementById("lobbyStatus");

const team1Button = document.getElementById("team1Button");
const team2Button = document.getElementById("team2Button");
const selectedTeam = document.getElementById("selectedTeam");

const trumpDisplay = document.getElementById("trumpDisplay");

const team1Name = document.getElementById("team1Name");
const team2Name = document.getElementById("team2Name");

const scoreTeam1 = document.getElementById("scoreTeam1");
const scoreTeam2 = document.getElementById("scoreTeam2");

const topPlayer = document.getElementById("topPlayer");
const leftPlayer = document.getElementById("leftPlayer");
const rightPlayer = document.getElementById("rightPlayer");

const playedCards = document.getElementById("playedCards");
const myCards = document.getElementById("myCards");
const gameMessage = document.getElementById("gameMessage");

let myTeam = null;
let myPlayerIndex = null;


/* =========================
   EKRANY
========================= */

function showScreen(screen) {
    startScreen.style.display = "none";
    lobbyScreen.style.display = "none";
    gameScreen.style.display = "none";

    screen.style.display = "flex";
}


/* =========================
   DOŁĄCZANIE DO POKOJU
========================= */

joinButton.addEventListener("click", () => {
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
});


/* =========================
   WYJŚCIE Z POKOJU
========================= */

leaveButton.addEventListener("click", () => {
    socket.emit("leaveRoom");

    myTeam = null;
    myPlayerIndex = null;

    showScreen(startScreen);
});


/* =========================
   GRAJ Z BOTAMI
========================= */

botsButton.addEventListener("click", () => {

    botsButton.disabled = true;
    botsButton.textContent = "URUCHAMIANIE...";

    socket.emit("startWithBots");

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

    team1Button.classList.toggle("selected", team === 0);
    team2Button.classList.toggle("selected", team === 1);

    selectedTeam.textContent =
        `Wybrana drużyna: ${team === 0 ? "1" : "2"}`;

    socket.emit("chooseTeam", {
        team
    });
}


/* =========================
   DOŁĄCZENIE
========================= */

socket.on("joinedRoom", data => {

    if (data && typeof data.team === "number") {
        myTeam = data.team;
    }

    showScreen(lobbyScreen);
});


/* =========================
   POCZEKALNIA
========================= */

socket.on("lobbyState", state => {

    showScreen(lobbyScreen);

    lobbyRoom.textContent = state.room || "—";

    lobbyPlayers.innerHTML = "";

    const players = Array.isArray(state.players)
        ? state.players
        : [];

    const humanPlayers = players.filter(player => !player.bot);

    lobbyStatus.textContent =
        `Oczekiwanie na graczy: ${humanPlayers.length}/4`;

    players.forEach(player => {

        const row = document.createElement("div");

        row.className = "lobby-player";

        const name = document.createElement("span");

        name.textContent = player.name || "Gracz";

        row.appendChild(name);

        if (player.bot) {

            const bot = document.createElement("span");

            bot.textContent = " 🤖 BOT";

            row.appendChild(bot);
        }

        if (typeof player.team === "number") {

            const team = document.createElement("span");

            team.textContent =
                ` — Drużyna ${player.team + 1}`;

            row.appendChild(team);
        }

        lobbyPlayers.appendChild(row);
    });


    if (typeof state.myTeam === "number") {

        myTeam = state.myTeam;

        team1Button.classList.toggle(
            "selected",
            myTeam === 0
        );

        team2Button.classList.toggle(
            "selected",
            myTeam === 1
        );

        selectedTeam.textContent =
            `Wybrana drużyna: ${myTeam === 0 ? "1" : "2"}`;
    }


    /*
       Jeśli są już 4 osoby,
       przycisk gry z botami nie jest potrzebny.
    */

    if (humanPlayers.length >= 4) {

        botsButton.disabled = true;
        botsButton.textContent = "POKÓJ PEŁNY";

    } else {

        botsButton.disabled = false;
        botsButton.textContent = "GRAJ Z BOTAMI";
    }

});


/* =========================
   START GRY
========================= */

socket.on("gameStarted", () => {

    showScreen(gameScreen);

    botsButton.disabled = false;
    botsButton.textContent = "GRAJ Z BOTAMI";
});


/* =========================
   STAN GRY
========================= */

socket.on("gameState", state => {

    showScreen(gameScreen);

    renderGame(state);

});


/* =========================
   BŁĘDY
========================= */

socket.on("errorMessage", message => {

    alert(message);

    botsButton.disabled = false;
    botsButton.textContent = "GRAJ Z BOTAMI";
});


/* =========================
   RENDER GRY
========================= */

function renderGame(state) {

    if (!state) {
        return;
    }

    renderPlayers(state);

    renderScores(state);

    renderTrump(state);

    renderTrick(state);

    renderHand(state);

    if (state.message) {
        gameMessage.textContent = state.message;
    }
}


/* =========================
   GRACZE PRZY STOLE
========================= */

function renderPlayers(state) {

    const players = Array.isArray(state.players)
        ? state.players
        : [];

    if (
        typeof state.playerIndex === "number"
    ) {
        myPlayerIndex = state.playerIndex;
    }

    if (
        typeof myPlayerIndex !== "number" ||
        players.length < 4
    ) {
        return;
    }

    const positions = [];

    for (let i = 0; i < 4; i++) {

        const index =
            (myPlayerIndex + i) % 4;

        positions.push(players[index]);
    }

    /*
        positions:

        0 = ja
        1 = lewo
        2 = góra
        3 = prawo
    */

    const me = positions[0];
    const left = positions[1];
    const top = positions[2];
    const right = positions[3];

    /*
        Nie wyświetlamy własnego nicku
        jako jednego z bocznych graczy.
    */

    if (leftPlayer) {
        leftPlayer.textContent =
            left?.name || "—";
    }

    if (topPlayer) {
        topPlayer.textContent =
            top?.name || "—";
    }

    if (rightPlayer) {
        rightPlayer.textContent =
            right?.name || "—";
    }
}


/* =========================
   WYNIK
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

    if (!state.trump) {

        trumpDisplay.textContent =
            "Obrany kolor: —";

        return;
    }

    const suitName =
        state.suitNames?.[state.trump]
        || state.trump;

    trumpDisplay.textContent =
        `Obrany kolor: ${state.trump} ${suitName}`;
}


/* =========================
   LEWA / SZTYCH
========================= */

function renderTrick(state) {

    playedCards.innerHTML = "";

    if (!Array.isArray(state.trick)) {
        return;
    }

    state.trick.forEach(play => {

        const wrapper =
            document.createElement("div");

        wrapper.className = "played-card";


        const player =
            document.createElement("div");

        player.className =
            "played-card-player";

        player.textContent =
            play.playerName || "Gracz";


        const card =
            createCardElement(play.card, false);

        wrapper.appendChild(player);
        wrapper.appendChild(card);

        playedCards.appendChild(wrapper);
    });
}


/* =========================
   MOJE KARTY
========================= */

function renderHand(state) {

    myCards.innerHTML = "";

    if (!Array.isArray(state.hand)) {
        return;
    }

    state.hand.forEach(card => {

        const element =
            createCardElement(card, true);

        myCards.appendChild(element);
    });


    /*
       Jeżeli to moja kolej,
       pokazujemy możliwość zagrania.
    */

    if (
        state.currentPlayer === myPlayerIndex
    ) {

        myCards
            .querySelectorAll(".hand-card")
            .forEach(card => {

                card.disabled = false;

            });

    } else {

        myCards
            .querySelectorAll(".hand-card")
            .forEach(card => {

                card.disabled = true;

            });
    }
}


/* =========================
   KARTA
========================= */

function createCardElement(card, clickable) {

    const button =
        document.createElement(
            clickable ? "button" : "div"
        );

    const suit =
        card.suit || "";

    const rank =
        card.rank || "";

    const isRed =
        suit === "♥" ||
        suit === "♦";

    button.className =
        `${clickable ? "hand-card" : "card"} ${isRed ? "red" : "black"}`;


    const rankElement =
        document.createElement("div");

    rankElement.className =
        "card-rank";

    rankElement.textContent =
        rank;


    const suitElement =
        document.createElement("div");

    suitElement.className =
        "card-suit";

    suitElement.textContent =
        suit;


    button.appendChild(rankElement);
    button.appendChild(suitElement);


    if (clickable) {

        button.type = "button";

        button.disabled = true;

        button.addEventListener(
            "click",
            () => {

                socket.emit("playCard", {
                    card
                });

            }
        );
    }

    return button;
}


/* =========================
   OBIERAJ KOLOR
========================= */

socket.on("chooseTrump", data => {

    const existing =
        document.querySelector(".trump-buttons");

    if (existing) {
        existing.remove();
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
        "OBIERAJ";

    container.appendChild(title);


    const suits = [
        {
            suit: "♥",
            name: "Czerwo",
            color: "red"
        },
        {
            suit: "♦",
            name: "Dzwonek",
            color: "red"
        },
        {
            suit: "♣",
            name: "Krzak",
            color: "black"
        },
        {
            suit: "♠",
            name: "Wino",
            color: "black"
        }
    ];


    suits.forEach(item => {

        const button =
            document.createElement("button");

        button.type = "button";

        button.className =
            `trump-button ${item.color}`;

        button.textContent =
            `${item.suit} ${item.name}`;


        button.addEventListener(
            "click",
            () => {

                socket.emit("chooseTrump", {
                    suit: item.suit
                });

                container.remove();
            }
        );


        container.appendChild(button);
    });


    document.body.appendChild(container);
});


/* =========================
   KONIEC WYBORU ATU
========================= */

socket.on("trumpChosen", data => {

    const existing =
        document.querySelector(".trump-buttons");

    if (existing) {
        existing.remove();
    }

});


/* =========================
   POŁĄCZENIE
========================= */

socket.on("connect", () => {

    console.log(
        "Połączono z serwerem:",
        socket.id
    );

});


/* =========================
   ROZŁĄCZENIE
========================= */

socket.on("disconnect", () => {

    gameMessage.textContent =
        "Połączenie z serwerem zostało przerwane.";

});
