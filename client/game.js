const socket = io();

/* =========================
   EKRANY
========================= */

const startScreen = document.getElementById("startScreen");
const lobbyScreen = document.getElementById("lobbyScreen");
const gameScreen = document.getElementById("gameScreen");

function showScreen(screen) {
    startScreen.classList.add("hidden");
    lobbyScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");

    screen.classList.remove("hidden");
}


/* =========================
   START
========================= */

const nicknameInput =
    document.getElementById("nickname");

const roomInput =
    document.getElementById("room");

const joinButton =
    document.getElementById("joinButton");

const startMessage =
    document.getElementById("startMessage");


joinButton.addEventListener("click", joinRoom);

nicknameInput.addEventListener(
    "keydown",
    event => {
        if (event.key === "Enter") {
            joinRoom();
        }
    }
);

roomInput.addEventListener(
    "keydown",
    event => {
        if (event.key === "Enter") {
            joinRoom();
        }
    }
);


function joinRoom() {

    const name =
        nicknameInput.value.trim();

    const roomId =
        roomInput.value
            .trim()
            .toUpperCase();

    if (!name) {

        startMessage.textContent =
            "Podaj nick.";

        return;
    }

    if (!roomId) {

        startMessage.textContent =
            "Podaj kod pokoju.";

        return;
    }

    startMessage.textContent =
        "Łączenie...";

    joinButton.disabled = true;

    socket.emit(
        "joinRoom",
        {
            name,
            roomId
        }
    );
}


/* =========================
   LOBBY
========================= */

const lobbyRoom =
    document.getElementById("lobbyRoom");

const lobbyStatus =
    document.getElementById("lobbyStatus");

const lobbyPlayers =
    document.getElementById("lobbyPlayers");

const team1Button =
    document.getElementById("team1Button");

const team2Button =
    document.getElementById("team2Button");

const selectedTeam =
    document.getElementById("selectedTeam");

const botsButton =
    document.getElementById("botsButton");

const leaveButton =
    document.getElementById("leaveButton");


let myName = "";
let myTeam = null;


/* =========================
   DOŁĄCZENIE
========================= */

socket.on(
    "joinedRoom",
    data => {

        myName =
            data.name || "";

        lobbyRoom.textContent =
            data.roomId || "";

        startMessage.textContent =
            "";

        joinButton.disabled =
            false;

        showScreen(
            lobbyScreen
        );
    }
);


/* =========================
   STAN LOBBY
========================= */

socket.on(
    "lobbyState",
    data => {

        lobbyRoom.textContent =
            data.roomId || "";

        renderLobbyPlayers(
            data.players || []
        );

        const count =
            data.playerCount || 0;

        const max =
            data.maxPlayers || 4;

        lobbyStatus.textContent =
            `Gracze: ${count}/${max}`;

        /*
         * Odświeżamy własną drużynę.
         */

        const me =
            (data.players || []).find(
                player =>
                    !player.isBot &&
                    player.name === myName
            );

        if (me) {

            myTeam =
                me.team;

            updateTeamButtons();
        }
    }
);


function renderLobbyPlayers(players) {

    lobbyPlayers.innerHTML = "";

    if (!players.length) {

        const empty =
            document.createElement("div");

        empty.className =
            "empty-player";

        empty.textContent =
            "Oczekiwanie na graczy...";

        lobbyPlayers.appendChild(
            empty
        );

        return;
    }

    players.forEach(
        player => {

            const row =
                document.createElement("div");

            row.className =
                "lobby-player";

            const left =
                document.createElement("div");

            left.className =
                "lobby-player-name";

            left.textContent =
                player.name;

            if (player.name === myName) {
                left.textContent +=
                    " (Ty)";
            }

            const right =
                document.createElement("div");

            right.className =
                "lobby-player-team";

            if (player.team === 0) {

                right.textContent =
                    "Drużyna 1";

            } else if (player.team === 1) {

                right.textContent =
                    "Drużyna 2";

            } else {

                right.textContent =
                    "Bez drużyny";
            }

            if (player.isBot) {

                const bot =
                    document.createElement("span");

                bot.className =
                    "lobby-player-bot";

                bot.textContent =
                    " • BOT";

                right.appendChild(
                    bot
                );
            }

            row.appendChild(left);
            row.appendChild(right);

            lobbyPlayers.appendChild(
                row
            );
        }
    );
}


/* =========================
   WYBÓR DRUŻYNY
========================= */

team1Button.addEventListener(
    "click",
    () => chooseTeam(0)
);

team2Button.addEventListener(
    "click",
    () => chooseTeam(1)
);


function chooseTeam(team) {

    socket.emit(
        "chooseTeam",
        team
    );
}


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
            "Drużyna 1";

    } else if (myTeam === 1) {

        selectedTeam.textContent =
            "Drużyna 2";

    } else {

        selectedTeam.textContent =
            "brak";
    }
}


/* =========================
   START Z BOTAMI
========================= */

botsButton.addEventListener(
    "click",
    () => {

        if (
            myTeam !== 0 &&
            myTeam !== 1
        ) {

            lobbyStatus.textContent =
                "Najpierw wybierz drużynę.";

            return;
        }

        botsButton.disabled =
            true;

        socket.emit(
            "startWithBots"
        );
    }
);


/* =========================
   WYJŚCIE
========================= */

leaveButton.addEventListener(
    "click",
    () => {

        socket.emit(
            "leaveRoom"
        );

        myTeam = null;
        myName = "";

        lobbyPlayers.innerHTML = "";

        startMessage.textContent =
            "";

        joinButton.disabled =
            false;

        showScreen(
            startScreen
        );
    }
);


/* =========================
   START GRY
========================= */

socket.on(
    "gameStarted",
    () => {

        botsButton.disabled =
            false;

        showScreen(
            gameScreen
        );
    }
);


/* =========================
   ELEMENTY GRY
========================= */

const trumpDisplay =
    document.getElementById("trumpDisplay");

const team1Name =
    document.getElementById("team1Name");

const team2Name =
    document.getElementById("team2Name");

const scoreTeam1 =
    document.getElementById("scoreTeam1");

const scoreTeam2 =
    document.getElementById("scoreTeam2");

const overallTeam1 =
    document.getElementById("overallTeam1");

const overallTeam2 =
    document.getElementById("overallTeam2");

const gamesTeam1 =
    document.getElementById("gamesTeam1");

const gamesTeam2 =
    document.getElementById("gamesTeam2");

const topPlayer =
    document.getElementById("topPlayer");

const leftPlayer =
    document.getElementById("leftPlayer");

const rightPlayer =
    document.getElementById("rightPlayer");

const playedCards =
    document.getElementById("playedCards");

const myCards =
    document.getElementById("myCards");

const gameMessage =
    document.getElementById("gameMessage");


let currentGameState = null;


/* =========================
   NAZWY KOLORÓW
========================= */

const suitSymbols = {
    "♥": "♥",
    "♦": "♦",
    "♣": "♣",
    "♠": "♠"
};

const suitNames = {
    "♥": "Czerwo",
    "♦": "Dzwonek",
    "♣": "Krzak",
    "♠": "Wino"
};


/* =========================
   OBIERANIE ATUTU
========================= */

socket.on(
    "chooseTrump",
    data => {

        showTrumpChoice(
            data.hand || []
        );
    }
);


function showTrumpChoice(hand) {

    removeTrumpChoice();

    const box =
        document.createElement("div");

    box.className =
        "trump-choice";

    const title =
        document.createElement("div");

    title.style.width =
        "100%";

    title.style.textAlign =
        "center";

    title.style.marginBottom =
        "4px";

    title.textContent =
        "Wybierz atu";

    box.appendChild(
        title
    );

    const suits = [
        "♥",
        "♦",
        "♣",
        "♠"
    ];

    suits.forEach(
        suit => {

            const button =
                document.createElement("button");

            button.type =
                "button";

            button.textContent =
                `${suit} ${suitNames[suit]}`;

            button.addEventListener(
                "click",
                () => {

                    socket.emit(
                        "chooseTrump",
                        suit
                    );

                    removeTrumpChoice();
                }
            );

            box.appendChild(
                button
            );
        }
    );

    document
        .querySelector(".game-table")
        .appendChild(box);
}


function removeTrumpChoice() {

    const old =
        document.querySelector(
            ".trump-choice"
        );

    if (old) {
        old.remove();
    }
}


/* =========================
   STAN GRY
========================= */

socket.on(
    "gameState",
    state => {

        currentGameState =
            state;

        showScreen(
            gameScreen
        );

        renderGame(
            state
        );
    }
);


function renderGame(state) {

    renderScores(state);

    renderPlayers(state);

    renderTrump(state);

    renderPlayedCards(state);

    renderMyCards(state);

    renderMessage(state);
}


/* =========================
   WYNIKI
========================= */

function renderScores(state) {

    const scores =
        state.scores || [0, 0];

    const overall =
        state.overallScores ||
        [0, 0];

    const wins =
        state.gameWins ||
        [0, 0];

    scoreTeam1.textContent =
        scores[0] ?? 0;

    scoreTeam2.textContent =
        scores[1] ?? 0;

    overallTeam1.textContent =
        overall[0] ?? 0;

    overallTeam2.textContent =
        overall[1] ?? 0;

    gamesTeam1.textContent =
        wins[0] ?? 0;

    gamesTeam2.textContent =
        wins[1] ?? 0;

    const names =
        state.teamNames ||
        [
            "Drużyna 1",
            "Drużyna 2"
        ];

    team1Name.textContent =
        names[0];

    team2Name.textContent =
        names[1];
}


/* =========================
   GRACZE PRZY STOLE
========================= */

function renderPlayers(state) {

    const names =
        state.playerNames ||
        [];

    const myIndex =
        Number.isInteger(
            state.playerIndex
        )
            ? state.playerIndex
            : 0;

    if (names.length < 4) {

        topPlayer.textContent =
            "Partner";

        leftPlayer.textContent =
            "Lewy";

        rightPlayer.textContent =
            "Prawy";

        return;
    }

    /*
     * Układ względem mnie:
     *
     * partner = +2
     * lewy    = +1
     * prawy   = +3
     */

    const topIndex =
        (myIndex + 2) % 4;

    const leftIndex =
        (myIndex + 1) % 4;

    const rightIndex =
        (myIndex + 3) % 4;

    topPlayer.textContent =
        names[topIndex] || "Partner";

    leftPlayer.textContent =
        names[leftIndex] || "Lewy";

    rightPlayer.textContent =
        names[rightIndex] || "Prawy";
}


/* =========================
   ATUT
========================= */

function renderTrump(state) {

    if (!state.trump) {

        trumpDisplay.textContent =
            "-";

        return;
    }

    const suit =
        state.trump;

    trumpDisplay.textContent =
        `${suitSymbols[suit] || suit} ${
            state.suitNames?.[suit] ||
            suitNames[suit] ||
            ""
        }`;
}


/* =========================
   KARTY NA STOLE
========================= */

function renderPlayedCards(state) {

    playedCards.innerHTML = "";

    const trick =
        state.trick || [];

    trick.forEach(
        (entry, index) => {

            const card =
                entry.card ||
                entry;

            const element =
                createCardElement(
                    card
                );

            element.classList.add(
                `played-card`,
                `card-${index}`
            );

            playedCards.appendChild(
                element
            );
        }
    );
}


/* =========================
   MOJE KARTY
========================= */

function renderMyCards(state) {

    myCards.innerHTML = "";

    const hand =
        state.hand || [];

    hand.forEach(
        card => {

            const element =
                createCardElement(
                    card
                );

            const legal =
                isCardLegalFromState(
                    state,
                    card
                );

            if (!legal) {

                element.classList.add(
                    "disabled"
                );
            }

            element.addEventListener(
                "click",
                () => {

                    if (!legal) {

                        showTemporaryMessage(
                            "Tej karty nie możesz teraz zagrać."
                        );

                        return;
                    }

                    socket.emit(
                        "playCard",
                        {
                            suit: card.suit,
                            rank: card.rank
                        }
                    );
                }
            );

            myCards.appendChild(
                element
            );
        }
    );
}


/* =========================
   KARTA
========================= */

function createCardElement(card) {

    const element =
        document.createElement("div");

    element.className =
        "card";

    const suit =
        card.suit || "";

    const rank =
        card.rank || "";

    if (
        suit === "♥" ||
        suit === "♦"
    ) {
        element.classList.add(
            "red"
        );
    } else {
        element.classList.add(
            "card-black"
        );
    }

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
        suitSymbols[suit] || suit;

    const valueElement =
        document.createElement("div");

    valueElement.className =
        "card-value";

    valueElement.textContent =
        card.value ?? "";

    element.appendChild(
        rankElement
    );

    element.appendChild(
        suitElement
    );

    element.appendChild(
        valueElement
    );

    return element;
}


/* =========================
   LEGALNOŚĆ KARTY
========================= */

function isCardLegalFromState(
    state,
    card
) {

    /*
     * Jeżeli to nie moja kolej,
     * niczego nie mogę zagrać.
     */

    if (
        state.currentPlayer !==
        state.playerIndex
    ) {
        return false;
    }

    if (
        state.phase &&
        state.phase !== "playing"
    ) {
        return false;
    }

    const trick =
        state.trick || [];

    if (!trick.length) {
        return true;
    }

    const leadCard =
        trick[0]?.card ||
        trick[0];

    if (!leadCard) {
        return true;
    }

    const leadSuit =
        leadCard.suit;

    const hand =
        state.hand || [];

    const sameSuit =
        hand.filter(
            c =>
                c.suit ===
                leadSuit
        );

    /*
     * Muszę dołożyć do koloru.
     */

    if (sameSuit.length) {

        /*
         * Sprawdzamy, czy mam kartę,
         * która może pobić aktualnego zwycięzcę.
         */

        const winningEntry =
            getCurrentWinningEntry(
                state
            );

        if (!winningEntry) {

            return card.suit ===
                leadSuit;
        }

        const winningCard =
            winningEntry.card ||
            winningEntry;

        const canBeat =
            sameSuit.some(
                c =>
                    cardBeatsClient(
                        c,
                        winningCard,
                        leadSuit,
                        state.trump
                    )
            );

        if (canBeat) {

            return (
                card.suit === leadSuit &&
                cardBeatsClient(
                    card,
                    winningCard,
                    leadSuit,
                    state.trump
                )
            );
        }

        /*
         * Nie mogę pobić —
         * mogę zagrać dowolną kartę
         * w kolorze wyjścia.
         */

        return card.suit ===
            leadSuit;
    }

    /*
     * Nie mam koloru wyjścia.
     * Mogę zagrać dowolną kartę.
     */

    return true;
}


function getCurrentWinningEntry(state) {

    const trick =
        state.trick || [];

    if (!trick.length) {
        return null;
    }

    const leadCard =
        trick[0]?.card ||
        trick[0];

    let winner =
        trick[0];

    for (let i = 1; i < trick.length; i++) {

        const current =
            trick[i];

        const winnerCard =
            winner.card ||
            winner;

        const currentCard =
            current.card ||
            current;

        if (
            cardBeatsClient(
                currentCard,
                winnerCard,
                leadCard.suit,
                state.trump
            )
        ) {
            winner =
                current;
        }
    }

    return winner;
}


function cardBeatsClient(
    candidate,
    current,
    leadSuit,
    trump
) {

    if (!candidate || !current) {
        return false;
    }

    /*
     * Atut.
     */

    if (
        candidate.suit === trump &&
        current.suit !== trump
    ) {
        return true;
    }

    if (
        candidate.suit !== trump &&
        current.suit === trump
    ) {
        return false;
    }

    /*
     * Różne kolory i żaden nie jest atutem.
     */

    if (
        candidate.suit !== current.suit
    ) {

        return (
            candidate.suit ===
            leadSuit
        );
    }

    /*
     * Ten sam kolor.
     */

    const power = {
        "A": 6,
        "10": 5,
        "K": 4,
        "Q": 3,
        "J": 2,
        "9": 1
    };

    return (
        (power[candidate.rank] || 0) >
        (power[current.rank] || 0)
    );
}


/* =========================
   KOMUNIKAT
========================= */

function renderMessage(state) {

    if (
        state.currentPlayer ===
        state.playerIndex
    ) {

        if (state.phase === "playing") {

            gameMessage.textContent =
                "Twoja kolej — zagraj kartę.";

        } else if (
            state.phase === "trump"
        ) {

            gameMessage.textContent =
                "Wybierz atu.";
        }

    } else {

        const names =
            state.playerNames || [];

        const current =
            names[state.currentPlayer];

        if (current) {

            gameMessage.textContent =
                `Kolej gracza: ${current}`;

        } else {

            gameMessage.textContent =
                "";
        }
    }
}


function showTemporaryMessage(
    message
) {

    gameMessage.textContent =
        message;

    clearTimeout(
        showTemporaryMessage.timer
    );

    showTemporaryMessage.timer =
        setTimeout(
            () => {

                if (currentGameState) {
                    renderMessage(
                        currentGameState
                    );
                }

            },
            1800
        );
}


/* =========================
   BŁĘDY Z SERWERA
========================= */

socket.on(
    "errorMessage",
    message => {

        const text =
            String(message || "Wystąpił błąd.");

        /*
         * Jeżeli jesteśmy na ekranie startowym.
         */

        if (
            !startScreen.classList.contains(
                "hidden"
            )
        ) {

            startMessage.textContent =
                text;

            joinButton.disabled =
                false;

            return;
        }

        /*
         * Lobby.
         */

        if (
            !lobbyScreen.classList.contains(
                "hidden"
            )
        ) {

            lobbyStatus.textContent =
                text;

            botsButton.disabled =
                false;

            return;
        }

        /*
         * Gra.
         */

        showTemporaryMessage(
            text
        );
    }
);


/* =========================
   POŁĄCZENIE
========================= */

socket.on(
    "connect",
    () => {

        console.log(
            "Połączono z serwerem:",
            socket.id
        );
    }
);

socket.on(
    "disconnect",
    () => {

        console.log(
            "Rozłączono z serwerem."
        );

        /*
         * Jeżeli byliśmy w grze,
         * informujemy użytkownika.
         */

        if (
            !gameScreen.classList.contains(
                "hidden"
            )
        ) {

            gameMessage.textContent =
                "Połączenie z serwerem zostało przerwane.";
        }
    }
);


/* =========================
   STARTOWY EKRAN
========================= */

showScreen(
    startScreen
);
