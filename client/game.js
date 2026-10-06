const socket = io();

let mySeat = null;
let currentGameState = null;

const startScreen = document.getElementById("startScreen");
const lobbyScreen = document.getElementById("lobbyScreen");
const gameScreen = document.getElementById("gameScreen");

const nicknameInput = document.getElementById("nickname");
const roomInput = document.getElementById("room");

const joinButton = document.getElementById("joinButton");
const leaveButton = document.getElementById("leaveButton");

const lobbyRoom = document.getElementById("lobbyRoom");
const lobbyPlayers = document.getElementById("lobbyPlayers");

const myCards = document.getElementById("myCards");
const playedCards = document.getElementById("playedCards");

const gameMessage = document.getElementById("gameMessage");
const trumpDisplay = document.getElementById("trumpDisplay");

const scoreTeam1 = document.getElementById("scoreTeam1");
const scoreTeam2 = document.getElementById("scoreTeam2");

const topPlayer = document.getElementById("topPlayer");
const leftPlayer = document.getElementById("leftPlayer");
const rightPlayer = document.getElementById("rightPlayer");


// =========================
// WYBÓR ATU
// =========================

const trumpButtons = document.createElement("div");

trumpButtons.className = "trump-buttons";

trumpButtons.innerHTML = `
  <button type="button" data-suit="♥">♥ Czerwo</button>
  <button type="button" data-suit="♦">♦ Dzwonek</button>
  <button type="button" data-suit="♣">♣ Krzak</button>
  <button type="button" data-suit="♠">♠ Wino</button>
`;

document.body.appendChild(trumpButtons);

trumpButtons.style.display = "none";

trumpButtons
  .querySelectorAll("button")
  .forEach(button => {
    button.addEventListener("click", () => {
      if (!currentGameState) {
        return;
      }

      if (currentGameState.phase !== "trump") {
        return;
      }

      if (currentGameState.chooser !== mySeat) {
        return;
      }

      const suit = button.dataset.suit;

      socket.emit("chooseTrump", {
        suit
      });
    });
  });


// =========================
// WEJŚCIE DO POKOJU
// =========================

joinButton.addEventListener("click", joinGame);

nicknameInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    joinGame();
  }
});

roomInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    joinGame();
  }
});

function joinGame() {
  const nickname =
    nicknameInput.value.trim() || "Gracz";

  const room =
    roomInput.value.trim().toUpperCase() || "TEST";

  joinButton.disabled = true;
  joinButton.textContent = "ŁĄCZENIE...";

  socket.emit("joinRoom", {
    nickname,
    room
  });
}


// =========================
// WYJŚCIE
// =========================

leaveButton.addEventListener("click", () => {
  socket.emit("leaveRoom");

  startScreen.style.display = "flex";
  lobbyScreen.style.display = "none";
  gameScreen.style.display = "none";

  joinButton.disabled = false;
  joinButton.textContent = "WEJDŹ DO GRY";
});


// =========================
// SOCKET.IO
// =========================

socket.on("connect", () => {
  console.log("Połączono z serwerem:", socket.id);

  joinButton.disabled = false;
  joinButton.textContent = "WEJDŹ DO GRY";
});

socket.on("connect_error", error => {
  console.error(
    "Błąd połączenia z serwerem:",
    error
  );

  joinButton.disabled = false;
  joinButton.textContent = "WEJDŹ DO GRY";

  alert(
    "Nie udało się połączyć z serwerem."
  );
});

socket.on("joinedRoom", data => {
  console.log("Dołączono do pokoju:", data);

  mySeat = data.seat;

  startScreen.style.display = "none";
  lobbyScreen.style.display = "flex";
  gameScreen.style.display = "none";

  lobbyRoom.textContent =
    `Pokój: ${data.room}`;
});

socket.on("joinError", data => {
  console.error(
    "Nie udało się wejść:",
    data
  );

  joinButton.disabled = false;
  joinButton.textContent = "WEJDŹ DO GRY";

  alert(
    data?.message ||
    "Nie udało się wejść do pokoju."
  );
});

socket.on("lobbyState", data => {
  lobbyRoom.textContent =
    `Pokój: ${data.room}`;

  lobbyPlayers.innerHTML = "";

  if (!data.players) {
    return;
  }

  data.players.forEach(player => {
    const div =
      document.createElement("div");

    div.className =
      "lobby-player";

    div.textContent =
      `${player.seat + 1}. ${player.name}${player.bot ? " 🤖" : ""}`;

    lobbyPlayers.appendChild(div);
  });
});

socket.on("gameError", data => {
  alert(
    data?.message ||
    "Nie można wykonać tej akcji."
  );
});

socket.on("gameState", state => {
  console.log("Stan gry:", state);

  currentGameState = state;

  lobbyScreen.style.display = "none";
  gameScreen.style.display = "flex";

  renderGame(state);
});


// =========================
// RENDER GRY
// =========================

function renderGame(state) {
  renderPlayers(state);
  renderTrump(state);
  renderScore(state);
  renderTrick(state);
  renderMyHand(state);
  renderMessage(state);
  renderTrumpButtons(state);
}


// =========================
// GRACZE
// =========================

function renderPlayers(state) {
  if (!state.playerNames) {
    return;
  }

  const players =
    state.playerNames;

  const topSeat =
    (mySeat + 2) % 4;

  const leftSeat =
    (mySeat + 1) % 4;

  const rightSeat =
    (mySeat + 3) % 4;

  if (topPlayer) {
    topPlayer.textContent =
      players[topSeat] || "Gracz";
  }

  if (leftPlayer) {
    leftPlayer.textContent =
      players[leftSeat] || "Gracz";
  }

  if (rightPlayer) {
    rightPlayer.textContent =
      players[rightSeat] || "Gracz";
  }
}


// =========================
// ATU
// =========================

function renderTrump(state) {
  if (!trumpDisplay) {
    return;
  }

  if (!state.trump) {
    trumpDisplay.textContent =
      "Atu: —";

    return;
  }

  const names = {
    "♥": "Czerwo",
    "♦": "Dzwonek",
    "♣": "Krzak",
    "♠": "Wino"
  };

  trumpDisplay.textContent =
    `Atu: ${state.trump} ${names[state.trump]}`;
}


// =========================
// PUNKTY
// =========================

function renderScore(state) {
  if (scoreTeam1) {
    scoreTeam1.textContent =
      state.teamPoints?.[0] ?? 0;
  }

  if (scoreTeam2) {
    scoreTeam2.textContent =
      state.teamPoints?.[1] ?? 0;
  }
}


// =========================
// LEWA
// =========================

function renderTrick(state) {
  if (!playedCards) {
    return;
  }

  playedCards.innerHTML = "";

  if (!state.trick) {
    return;
  }

  state.trick.forEach(item => {
    const card =
      document.createElement("div");

    card.className =
      "played-card";

    card.textContent =
      `${item.card.rank}${item.card.suit}`;

    card.title =
      state.playerNames?.[item.player] ||
      `Gracz ${item.player + 1}`;

    playedCards.appendChild(card);
  });
}


// =========================
// MOJE KARTY
// =========================

function renderMyHand(state) {
  if (!myCards) {
    return;
  }

  myCards.innerHTML = "";

  const hand =
    state.hands?.[mySeat] || [];

  const legalCards =
    getLegalCardIds(state);

  hand.forEach(card => {
    if (!card || card.hidden) {
      return;
    }

    const button =
      document.createElement("button");

    button.type = "button";

    button.className = "card";

    button.textContent =
      `${card.rank}${card.suit}`;

    const isLegal =
      legalCards.includes(card.id);

    if (
      state.phase === "playing" &&
      state.currentPlayer === mySeat &&
      isLegal
    ) {
      button.classList.add("legal");

      button.addEventListener(
        "click",
        () => {
          socket.emit("playCard", {
            cardId: card.id
          });
        }
      );
    } else {
      button.classList.add("disabled");
    }

    myCards.appendChild(button);
  });
}


// =========================
// LEGALNE KARTY
// =========================

function getLegalCardIds(state) {
  if (
    state.phase !== "playing" ||
    state.currentPlayer !== mySeat
  ) {
    return [];
  }

  const hand =
    state.hands?.[mySeat] || [];

  const visibleHand =
    hand.filter(
      card => card && !card.hidden
    );

  if (!state.trick?.length) {
    return visibleHand.map(
      card => card.id
    );
  }

  const leadSuit =
    state.trick[0].card.suit;

  const leadCards =
    visibleHand.filter(
      card =>
        card.suit === leadSuit
    );

  /*
   * Jeśli mamy kolor wyjścia,
   * na potrzeby UI pokazujemy karty
   * tego koloru.
   *
   * Serwer i tak jest ostatecznym
   * sędzią legalności ruchu.
   */
  if (leadCards.length > 0) {
    return leadCards.map(
      card => card.id
    );
  }

  /*
   * Nie mamy koloru wyjścia.
   * Możemy zagrać dowolną kartę.
   */
  return visibleHand.map(
    card => card.id
  );
}


// =========================
// KOMUNIKAT
// =========================

function renderMessage(state) {
  if (!gameMessage) {
    return;
  }

  if (
    state.phase === "trump" &&
    state.chooser === mySeat
  ) {
    gameMessage.textContent =
      "Wybierz atu.";

    return;
  }

  if (
    state.phase === "playing" &&
    state.currentPlayer === mySeat
  ) {
    gameMessage.textContent =
      "Twoja kolej.";

    return;
  }

  if (state.phase === "finished") {
    gameMessage.textContent =
      state.lastMessage ||
      "Koniec gry.";

    return;
  }

  gameMessage.textContent =
    state.lastMessage || "";
}


// =========================
// PRZYCISKI ATU
// =========================

function renderTrumpButtons(state) {
  if (!trumpButtons) {
    return;
  }

  const shouldShow =
    state.phase === "trump" &&
    state.chooser === mySeat;

  trumpButtons.style.display =
    shouldShow ? "flex" : "none";
}
