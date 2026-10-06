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

const trumpButtons = document.createElement("div");

trumpButtons.className = "trump-buttons";

trumpButtons.innerHTML = `
  <button data-suit="♥">♥ Czerwo</button>
  <button data-suit="♦">♦ Dzwonek</button>
  <button data-suit="♣">♣ Krzak</button>
  <button data-suit="♠">♠ Wino</button>
`;

document.body.appendChild(trumpButtons);

trumpButtons.style.display = "none";

trumpButtons
  .querySelectorAll("button")
  .forEach(button => {
    button.addEventListener("click", () => {
      const suit = button.dataset.suit;

      if (
        !currentGameState ||
        currentGameState.phase !== "trump" ||
        currentGameState.chooser !== mySeat
      ) {
        return;
      }

      socket.emit("chooseTrump", {
        suit
      });
    });
  });

joinButton.addEventListener("click", () => {
  const nickname =
    nicknameInput.value.trim() || "Gracz";

  const room =
    roomInput.value.trim().toUpperCase() || "TEST";

  socket.emit("joinRoom", {
    nickname,
    room
  });
});

leaveButton.addEventListener("click", () => {
  socket.emit("leaveRoom");

  location.reload();
});

socket.on("joinedRoom", data => {
  mySeat = data.seat;

  startScreen.style.display = "none";
  lobbyScreen.style.display = "block";

  lobbyRoom.textContent =
    `Pokój: ${data.room}`;
});

socket.on("lobbyState", data => {
  lobbyRoom.textContent =
    `Pokój: ${data.room}`;

  lobbyPlayers.innerHTML = "";

  data.players.forEach(player => {
    const div =
      document.createElement("div");

    div.className = "lobby-player";

    div.textContent =
      `${player.seat + 1}. ${player.name}${player.bot ? " 🤖" : ""}`;

    lobbyPlayers.appendChild(div);
  });
});

socket.on("joinError", data => {
  alert(data.message);
});

socket.on("gameError", data => {
  alert(data.message);
});

socket.on("gameState", state => {
  currentGameState = state;

  lobbyScreen.style.display = "none";
  gameScreen.style.display = "block";

  renderGame(state);
});

function renderGame(state) {
  renderPlayers(state);
  renderTrump(state);
  renderScore(state);
  renderTrick(state);
  renderMyHand(state);
  renderMessage(state);
  renderTrumpButtons(state);
}

function renderPlayers(state) {
  const names = state.players || [];

  /*
   * Nazwy graczy pobieramy z danych gry,
   * jeżeli serwer je udostępnia.
   */
  if (state.playerNames) {
    const players = state.playerNames;

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
}

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

    card.dataset.player =
      item.player;

    playedCards.appendChild(card);
  });
}

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
    if (card.hidden) {
      return;
    }

    const button =
      document.createElement("button");

    button.className =
      "card";

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

function getLegalCardIds(state) {
  /*
   * Serwer jest ostatecznym sędzią.
   *
   * Tutaj robimy tylko wizualne oznaczenie
   * kart, które najprawdopodobniej można zagrać.
   *
   * Jeśli nie ma informacji o legalnych kartach,
   * wszystkie są traktowane jako nieaktywne.
   */

  if (
    state.phase !== "playing" ||
    state.currentPlayer !== mySeat
  ) {
    return [];
  }

  const hand =
    state.hands?.[mySeat] || [];

  if (!state.trick?.length) {
    return hand
      .filter(card => !card.hidden)
      .map(card => card.id);
  }

  const leadSuit =
    state.trick[0].card.suit;

  const cardsOfLeadSuit =
    hand.filter(
      card =>
        !card.hidden &&
        card.suit === leadSuit
    );

  if (cardsOfLeadSuit.length > 0) {
    /*
     * W tej chwili klient nie zna pełnej
     * logiki zwycięskiej karty.
     *
     * Zaznaczamy więc wszystkie karty
     * koloru wyjścia.
     *
     * Serwer i tak odrzuci nielegalne zagranie.
     */
    return cardsOfLeadSuit.map(
      card => card.id
    );
  }

  return hand
    .filter(card => !card.hidden)
    .map(card => card.id);
}

function renderMessage(state) {
  if (!gameMessage) {
    return;
  }

  gameMessage.textContent =
    state.lastMessage || "";

  if (
    state.phase === "trump" &&
    state.chooser === mySeat
  ) {
    gameMessage.textContent =
      "Wybierz atu.";
  }

  if (
    state.phase === "playing" &&
    state.currentPlayer === mySeat
  ) {
    gameMessage.textContent =
      "Twoja kolej.";
  }

  if (state.phase === "finished") {
    gameMessage.textContent =
      state.lastMessage || "Koniec gry.";
  }
}

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
