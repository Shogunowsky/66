const socket = io();

let mySocketId = null;
let latestState = null;
let selectedTeam = null;
let lufaInterval = null;

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
ACTIONS
========================= */

const gameActions = document.getElementById("gameActions");
const choiceActions = document.getElementById("choiceActions");
const lufaActions = document.getElementById("lufaActions");

const heartButton = document.getElementById("heartButton");
const diamondButton = document.getElementById("diamondButton");
const clubButton = document.getElementById("clubButton");
const spadeButton = document.getElementById("spadeButton");

const betterButton = document.getElementById("betterButton");
const worseButton = document.getElementById("worseButton");

const lufaButton = document.getElementById("lufaButton");
const backLufaButton = document.getElementById("backLufaButton");

const lufaTimer = document.getElementById("lufaTimer");

/* =========================
HELPERS
========================= */

function showScreen(screen) {

```
startScreen.classList.add("hidden");
lobbyScreen.classList.add("hidden");
gameScreen.classList.add("hidden");

screen.classList.remove("hidden");
```

}

function escapeHtml(value) {

```
return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
```

}

function cardSymbol(card) {

```
if (!card) {
    return "";
}

return `${card.rank}${card.suit}`;
```

}

function cardClass(card) {

```
if (!card) {
    return "";
}

if (
    card.suit === "♥" ||
    card.suit === "♦"
) {
    return "red";
}

return "black";
```

}

function cardValue(card) {

```
if (!card) {
    return 0;
}

const values = {
    "A": 11,
    "10": 10,
    "K": 4,
    "Q": 3,
    "J": 2,
    "9": 0
};

return values[card.rank] ?? 0;
```

}

function cardRankPower(rank) {

```
const powers = {
    "A": 6,
    "10": 5,
    "K": 4,
    "Q": 3,
    "J": 2,
    "9": 1
};

return powers[rank] ?? 0;
```

}

/* =========================
CURRENT PLAYER CHECK
========================= */

/*

* Backend może podawać aktualnego gracza
* jako currentPlayer albo chooser.
*
* Ta funkcja obsługuje oba warianty.
  */

function isMyTurn(state) {

```
if (!state) {
    return false;
}

const myIndex =
    Number.isInteger(state.myPlayerIndex)
        ? state.myPlayerIndex
        : null;

if (myIndex === null) {
    return false;
}


if (
    Number.isInteger(state.currentPlayer)
) {

    return (
        state.currentPlayer === myIndex
    );
}


if (
    Number.isInteger(state.chooser)
) {

    return (
        state.chooser === myIndex
    );
}


return false;
```

}

/*

* Czy ja jestem obierającym?
  */

function amIChooser(state) {

```
if (!state) {
    return false;
}

const myIndex =
    Number.isInteger(state.myPlayerIndex)
        ? state.myPlayerIndex
        : null;

if (myIndex === null) {
    return false;
}

if (
    Number.isInteger(state.chooser)
) {

    return (
        state.chooser === myIndex
    );
}

return isMyTurn(state);
```

}

/* =========================
CARD LEGALITY
========================= */

function getLeadSuit(state) {

```
if (
    !state ||
    !Array.isArray(state.playedCards) ||
    state.playedCards.length === 0
) {
    return null;
}

return (
    state.playedCards[0]?.card?.suit ||
    null
);
```

}

function getCurrentWinningCard(state) {

```
if (
    !state ||
    !Array.isArray(state.playedCards) ||
    state.playedCards.length === 0
) {
    return null;
}

let winner =
    state.playedCards[0];

for (
    let i = 1;
    i < state.playedCards.length;
    i++
) {

    const candidate =
        state.playedCards[i];

    if (
        cardBeats(
            candidate.card,
            winner.card,
            getLeadSuit(state),
            state.trump
        )
    ) {

        winner = candidate;
    }
}

return winner?.card || null;
```

}

function cardBeats(
candidate,
current,
leadSuit,
trump
) {

```
if (!candidate || !current) {
    return false;
}

const candidateSuit =
    candidate.suit;

const currentSuit =
    current.suit;


if (
    trump &&
    candidateSuit === trump &&
    currentSuit !== trump
) {
    return true;
}


if (
    trump &&
    candidateSuit !== trump &&
    currentSuit === trump
) {
    return false;
}


if (
    candidateSuit !== currentSuit
) {
    return false;
}


return (
    cardRankPower(candidate.rank) >
    cardRankPower(current.rank)
);
```

}

function isLegalClientPlay(state, card) {

```
if (!state || !card) {
    return false;
}


const trump =
    state.mode === "normal"
        ? state.trump
        : null;


const leadSuit =
    getLeadSuit(state);


/*
 * Pierwsza karta lewki.
 */
if (!leadSuit) {
    return true;
}


const hand =
    Array.isArray(state.hand)
        ? state.hand
        : [];


const hasLeadSuit =
    hand.some(
        c =>
            c.suit === leadSuit
    );


/*
 * Masz kolor wyjścia.
 * Musisz dołożyć do koloru.
 */
if (hasLeadSuit) {

    return (
        card.suit === leadSuit
    );
}


/*
 * Nie masz koloru wyjścia.
 * W normalnej grze musisz dać atut,
 * jeżeli go posiadasz.
 */
if (trump) {

    const hasTrump =
        hand.some(
            c =>
                c.suit === trump
        );


    if (hasTrump) {

        return (
            card.suit === trump
        );
    }
}


/*
 * Nie masz ani koloru,
 * ani atutu.
 */
return true;
```

}

/* =========================
LOBBY
========================= */

function renderLobby(state) {

```
if (!state) {
    return;
}


lobbyRoom.textContent =
    `Pokój: ${state.roomName || ""}`;


lobbyStatus.textContent =
    state.statusMessage || "";


lobbyPlayers.innerHTML = "";


if (
    Array.isArray(state.players)
) {

    state.players.forEach(
        player => {

            const element =
                document.createElement("div");

            element.className =
                "lobbyPlayer";


            let teamText =
                "Bez drużyny";


            if (
                player.team === 0
            ) {

                teamText =
                    "Drużyna 1";
            }


            if (
                player.team === 1
            ) {

                teamText =
                    "Drużyna 2";
            }


            const botText =
                player.isBot
                    ? " 🤖"
                    : "";


            element.innerHTML =
                `<strong>${escapeHtml(player.name)}</strong>
                 — ${teamText}${botText}`;


            lobbyPlayers.appendChild(
                element
            );
        }
    );
}


if (
    selectedTeam === null
) {

    selectedTeamDisplay.textContent =
        "Nie wybrano drużyny.";

} else {

    selectedTeamDisplay.textContent =
        `Wybrano: Drużyna ${selectedTeam + 1}`;
}
```

}

/* =========================
GAME
========================= */

function renderGame(state) {

```
if (!state) {
    return;
}

renderScores(state);
renderPlayers(state);
renderTrump(state);
renderPlayedCards(state);
renderHand(state);
renderGameInfo(state);
renderActions(state);
```

}

/* =========================
SCORES
========================= */

function renderScores(state) {

```
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


team1Name.textContent =
    state.teamNames?.[0] ||
    "Drużyna 1";


team2Name.textContent =
    state.teamNames?.[1] ||
    "Drużyna 2";
```

}

/* =========================
PLAYERS
========================= */

function renderPlayers(state) {

```
const players =
    state.players || [];


const myIndex =
    Number.isInteger(
        state.myPlayerIndex
    )
        ? state.myPlayerIndex
        : 0;


function nameAt(offset) {

    if (!players.length) {
        return "—";
    }

    const index =
        (
            myIndex +
            offset +
            players.length
        ) %
        players.length;


    return (
        players[index]?.name ||
        "—"
    );
}


topPlayer.textContent =
    nameAt(2);

leftPlayer.textContent =
    nameAt(1);

rightPlayer.textContent =
    nameAt(3);


currentPlayerName.textContent =
    players[myIndex]?.name ||
    "Ty";
```

}

/* =========================
TRUMP
========================= */

function renderTrump(state) {

```
if (
    state.mode !== "normal"
) {

    trumpDisplay.textContent =
        "Brak";

    return;
}


trumpDisplay.textContent =
    state.trump || "—";
```

}

/* =========================
PLAYED CARDS
========================= */

function renderPlayedCards(state) {

```
playedCards.innerHTML = "";


const cards =
    Array.isArray(state.playedCards)
        ? state.playedCards
        : [];


cards.forEach(
    played => {

        const card =
            played.card;


        if (!card) {
            return;
        }


        const element =
            document.createElement("div");


        element.className =
            `playedCard ${cardClass(card)}`;


        element.innerHTML =
            `<span class="playedBy">
                ${escapeHtml(
                    played.playerName ||
                    "Gracz"
                )}
            </span>

            <span class="cardSymbol">
                ${escapeHtml(
                    cardSymbol(card)
                )}
            </span>`;


        playedCards.appendChild(
            element
        );
    }
);
```

}

/* =========================
HAND
========================= */

function renderHand(state) {

```
myCards.innerHTML = "";


const hand =
    Array.isArray(state.hand)
        ? state.hand
        : [];


hand.forEach(
    card => {

        const legal =
            isLegalClientPlay(
                state,
                card
            );


        const button =
            document.createElement("button");


        button.type =
            "button";


        button.className =
            `card ${cardClass(card)} ${
                legal
                    ? "playable"
                    : "disabled"
            }`;


        button.innerHTML =
            `<span class="cardSymbol">
                ${escapeHtml(
                    cardSymbol(card)
                )}
            </span>`;


        button.disabled =
            !legal;


        if (legal) {

            button.addEventListener(
                "click",
                () => {

                    playCard(card);
                }
            );
        }


        myCards.appendChild(
            button
        );
    }
);
```

}

/* =========================
GAME INFO
========================= */

function renderGameInfo(state) {

```
if (
    state.currentPlayerName
) {

    currentPlayerInfo.textContent =
        `Ruch: ${state.currentPlayerName}`;

} else {

    currentPlayerInfo.textContent =
        "";
}


if (
    state.message
) {

    gameMessage.textContent =
        state.message;

} else {

    gameMessage.textContent =
        "";
}
```

}

/* =========================
ACTIONS
========================= */

function renderActions(state) {

```
/*
 * Czyścimy poprzedni stan.
 */
gameActions.classList.add("hidden");
choiceActions.classList.add("hidden");
lufaActions.classList.add("hidden");


/*
 * Jeżeli kończymy poprzedni timer,
 * zatrzymujemy go.
 */
if (
    state.phase !== "lufa" &&
    lufaInterval
) {

    clearInterval(lufaInterval);
    lufaInterval = null;
}


/*
 * =========================
 * WYBÓR PO 3 KARTACH
 * =========================
 *
 * Tutaj najważniejsza zmiana:
 * sprawdzamy obierającego przez
 * chooser, a nie tylko currentPlayer.
 */

const choosingPhase =
    (
        state.dealStage === 1 &&
        state.phase === "trump"
    );


if (choosingPhase) {

    if (
        amIChooser(state)
    ) {

        gameActions.classList.remove(
            "hidden"
        );

        choiceActions.classList.remove(
            "hidden"
        );

        /*
         * Wyraźnie pokazujemy wszystkie
         * sześć możliwości.
         */
        heartButton.hidden = false;
        diamondButton.hidden = false;
        clubButton.hidden = false;
        spadeButton.hidden = false;
        betterButton.hidden = false;
        worseButton.hidden = false;

        return;
    }


    return;
}


/*
 * =========================
 * LUFA
 * =========================
 */

if (
    state.phase === "lufa"
) {

    /*
     * Lufę mogą zgłaszać pozostali,
     * więc nie wymagamy tutaj
     * currentPlayer == myPlayerIndex.
     */

    renderLufaActions(state);

    return;
}


/*
 * =========================
 * NORMALNY RUCH
 * =========================
 *
 * W normalnej grze nie ma dodatkowych
 * przycisków.
 */
```

}

/* =========================
LUFA ACTIONS
========================= */

function renderLufaActions(state) {

```
gameActions.classList.remove(
    "hidden"
);

lufaActions.classList.remove(
    "hidden"
);


const until =
    Number(
        state.lufaUntil || 0
    );


const updateTimer = () => {

    const remaining =
        Math.max(
            0,
            until - Date.now()
        );


    const seconds =
        Math.ceil(
            remaining / 1000
        );


    if (seconds > 0) {

        lufaTimer.textContent =
            `Lufa — ${seconds}s`;

    } else {

        lufaTimer.textContent =
            "Lufa — koniec czasu";
    }
};


updateTimer();


if (lufaInterval) {

    clearInterval(
        lufaInterval
    );

    lufaInterval = null;
}


lufaInterval =
    setInterval(
        () => {

            if (
                !latestState ||
                latestState.phase !== "lufa"
            ) {

                clearInterval(
                    lufaInterval
                );

                lufaInterval = null;

                return;
            }


            updateTimer();

        },
        200
    );
```

}

/* =========================
PLAY CARD
========================= */

function playCard(card) {

```
if (!latestState) {
    return;
}


if (
    !isMyTurn(latestState)
) {
    return;
}


if (
    !isLegalClientPlay(
        latestState,
        card
    )
) {
    return;
}


socket.emit(
    "playCard",
    {
        card: {
            rank: card.rank,
            suit: card.suit
        }
    }
);
```

}

/* =========================
CHOOSE TEAM
========================= */

function chooseTeam(team) {

```
if (
    team !== 0 &&
    team !== 1
) {
    return;
}


selectedTeam =
    team;


socket.emit(
    "chooseTeam",
    {
        team
    }
);


selectedTeamDisplay.textContent =
    `Wybrano: Drużyna ${team + 1}`;
```

}

/* =========================
CHOOSE TRUMP
========================= */

function chooseTrump(trump) {

```
if (!latestState) {
    return;
}


if (
    !amIChooser(latestState)
) {
    return;
}


if (
    latestState.dealStage !== 1 ||
    latestState.phase !== "trump"
) {
    return;
}


socket.emit(
    "chooseTrump",
    {
        trump
    }
);
```

}

/* =========================
SPECIAL MODE
========================= */

function chooseSpecialMode(mode) {

```
if (!latestState) {
    return;
}


if (
    !amIChooser(latestState)
) {
    return;
}


if (
    latestState.dealStage !== 1 ||
    latestState.phase !== "trump"
) {
    return;
}


if (
    mode !== "lepsza" &&
    mode !== "gorsza"
) {
    return;
}


socket.emit(
    "chooseSpecialMode",
    {
        mode
    }
);
```

}

/* =========================
LUFA
========================= */

function callLufa() {

```
if (!latestState) {
    return;
}


if (
    latestState.phase !== "lufa"
) {
    return;
}


socket.emit(
    "callLufa"
);
```

}

function callBackLufa() {

```
if (!latestState) {
    return;
}


if (
    latestState.phase !== "lufa"
) {
    return;
}


socket.emit(
    "callBackLufa"
);
```

}

/* =========================
BUTTON EVENTS
========================= */

team1Button.addEventListener(
"click",
() => {

```
    chooseTeam(0);
}
```

);

team2Button.addEventListener(
"click",
() => {

```
    chooseTeam(1);
}
```

);

joinButton.addEventListener(
"click",
() => {

```
    const nickname =
        nicknameInput.value.trim();

    const room =
        roomInput.value.trim();


    if (!nickname) {

        startMessage.textContent =
            "Podaj nick.";

        nicknameInput.focus();

        return;
    }


    if (!room) {

        startMessage.textContent =
            "Podaj nazwę pokoju.";

        roomInput.focus();

        return;
    }


    startMessage.textContent =
        "";


    socket.emit(
        "joinRoom",
        {
            nickname,
            room
        }
    );
}
```

);

botsButton.addEventListener(
"click",
() => {

```
    socket.emit(
        "startGameWithBots"
    );
}
```

);

leaveButton.addEventListener(
"click",
() => {

```
    socket.emit(
        "leaveRoom"
    );


    selectedTeam =
        null;

    latestState =
        null;


    if (lufaInterval) {

        clearInterval(
            lufaInterval
        );

        lufaInterval = null;
    }


    showScreen(
        startScreen
    );
}
```

);

/* =========================
TRUMP BUTTONS
========================= */

heartButton.addEventListener(
"click",
() => {

```
    chooseTrump("♥");
}
```

);

diamondButton.addEventListener(
"click",
() => {

```
    chooseTrump("♦");
}
```

);

clubButton.addEventListener(
"click",
() => {

```
    chooseTrump("♣");
}
```

);

spadeButton.addEventListener(
"click",
() => {

```
    chooseTrump("♠");
}
```

);

/* =========================
SPECIAL BUTTONS
========================= */

betterButton.addEventListener(
"click",
() => {

```
    chooseSpecialMode(
        "lepsza"
    );
}
```

);

worseButton.addEventListener(
"click",
() => {

```
    chooseSpecialMode(
        "gorsza"
    );
}
```

);

/* =========================
LUFA BUTTONS
========================= */

lufaButton.addEventListener(
"click",
() => {

```
    callLufa();
}
```

);

backLufaButton.addEventListener(
"click",
() => {

```
    callBackLufa();
}
```

);

/* =========================
ENTER TO JOIN
========================= */

nicknameInput.addEventListener(
"keydown",
event => {

```
    if (
        event.key === "Enter"
    ) {

        roomInput.focus();
    }
}
```

);

roomInput.addEventListener(
"keydown",
event => {

```
    if (
        event.key === "Enter"
    ) {

        joinButton.click();
    }
}
```

);

/* =========================
SOCKET
========================= */

socket.on(
"connect",
() => {

```
    mySocketId =
        socket.id;
}
```

);

socket.on(
"errorMessage",
message => {

```
    startMessage.textContent =
        message ||
        "Wystąpił błąd.";


    if (
        !gameScreen.classList.contains(
            "hidden"
        )
    ) {

        gameMessage.textContent =
            message ||
            "Wystąpił błąd.";
    }
}
```

);

socket.on(
"message",
message => {

```
    if (
        latestState
    ) {

        latestState.message =
            message;

        renderGameInfo(
            latestState
        );
    }
}
```

);

socket.on(
"lobbyState",
state => {

```
    latestState =
        null;


    showScreen(
        lobbyScreen
    );


    renderLobby(
        state
    );
}
```

);

socket.on(
"gameState",
state => {

```
    latestState =
        state;


    showScreen(
        gameScreen
    );


    renderGame(
        state
    );
}
```

);

socket.on(
"gameStarted",
state => {

```
    latestState =
        state;


    showScreen(
        gameScreen
    );


    renderGame(
        state
    );
}
```

);
