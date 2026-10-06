const SUITS = ["♥", "♦", "♣", "♠"];

const SUIT_NAMES = {
  "♥": "Czerwo",
  "♦": "Dzwonek",
  "♣": "Krzak",
  "♠": "Wino"
};

const RANKS = ["A", "10", "K", "Q", "J", "9"];

const CARD_VALUES = {
  A: 11,
  10: 10,
  K: 4,
  Q: 3,
  J: 2,
  9: 0
};

const RANK_POWER = {
  A: 6,
  10: 5,
  K: 4,
  Q: 3,
  J: 2,
  9: 1
};

function createDeck() {
  const deck = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        suit,
        rank,
        id: `${rank}${suit}`
      });
    }
  }

  return deck;
}

function shuffle(deck) {
  const copy = [...deck];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function createGame(players, firstChooser = 0) {
  return {
    players,

    deck: [],

    trump: null,

    chooser: firstChooser,

    currentPlayer: firstChooser,

    phase: "dealing",

    hands: [[], [], [], []],

    trick: [],

    trickWinner: null,

    teamPoints: [0, 0],

    melds: [0, 0],

    lastMessage: "Rozdawanie kart..."
  };
}

/**
 * Pierwsze rozdanie:
 * każdy dostaje 3 karty.
 */
function dealInitialCards(game) {
  game.deck = shuffle(createDeck());

  game.hands = [[], [], [], []];

  for (let round = 0; round < 3; round++) {
    for (let player = 0; player < 4; player++) {
      game.hands[player].push(game.deck.pop());
    }
  }

  game.phase = "trump";

  game.currentPlayer = game.chooser;

  game.lastMessage = `Gracz ${game.chooser + 1} wybiera atu.`;

  return game;
}

/**
 * Po wybraniu atu:
 * każdy dostaje kolejne 3 karty.
 */
function dealRemainingCards(game) {
  for (let round = 0; round < 3; round++) {
    for (let player = 0; player < 4; player++) {
      const card = game.deck.pop();

      if (card) {
        game.hands[player].push(card);
      }
    }
  }

  game.phase = "playing";

  game.currentPlayer = game.chooser;

  game.lastMessage = `Atu: ${SUIT_NAMES[game.trump]} (${game.trump}). ${game.chooser + 1} wychodzi.`;

  return game;
}

/**
 * Obierający musi wybrać kolor.
 */
function chooseTrump(game, playerIndex, suit) {
  if (game.phase !== "trump") {
    return {
      ok: false,
      error: "Nie trwa wybieranie atu."
    };
  }

  if (playerIndex !== game.chooser) {
    return {
      ok: false,
      error: "Nie jest Twoja kolej na wybór atu."
    };
  }

  if (!SUITS.includes(suit)) {
    return {
      ok: false,
      error: "Nieprawidłowy kolor atu."
    };
  }

  game.trump = suit;

  dealRemainingCards(game);

  return {
    ok: true
  };
}

/**
 * Zwraca aktualnie wygrywającą kartę w lewie.
 */
function getWinningCard(trick, trump) {
  if (!trick.length) {
    return null;
  }

  const leadSuit = trick[0].card.suit;

  let winning = trick[0];

  for (let i = 1; i < trick.length; i++) {
    const candidate = trick[i];

    if (beatsCard(candidate.card, winning.card, leadSuit, trump)) {
      winning = candidate;
    }
  }

  return winning;
}

/**
 * Sprawdza, czy karta A bije kartę B.
 */
function beatsCard(a, b, leadSuit, trump) {
  const aTrump = a.suit === trump;
  const bTrump = b.suit === trump;

  if (aTrump && !bTrump) {
    return true;
  }

  if (!aTrump && bTrump) {
    return false;
  }

  if (a.suit !== b.suit) {
    return false;
  }

  return RANK_POWER[a.rank] > RANK_POWER[b.rank];
}

/**
 * Czy karta może zostać legalnie zagrana?
 *
 * Zasady:
 *
 * 1. Masz kolor wyjścia:
 *    - musisz dołożyć do koloru.
 *    - jeśli możesz przebić aktualnie wygrywającą kartę,
 *      musisz to zrobić.
 *
 * 2. Nie masz koloru:
 *    - możesz zagrać dowolną kartę.
 *
 * 3. Jeśli aktualnie wygrywa atu:
 *    - jeżeli masz wyższe atu, musisz nim przebić.
 *    - jeżeli nie masz wyższego atu, możesz zagrać dowolną kartę
 *      (w tym niższe atu).
 */
function getLegalCards(game, playerIndex) {
  const hand = game.hands[playerIndex];

  if (!hand || !hand.length) {
    return [];
  }

  if (!game.trick.length) {
    return [...hand];
  }

  const leadSuit = game.trick[0].card.suit;

  const cardsOfLeadSuit = hand.filter(
    card => card.suit === leadSuit
  );

  const winning = getWinningCard(game.trick, game.trump);

  // Gracz ma kolor wyjścia.
  if (cardsOfLeadSuit.length > 0) {
    const cardsThatBeat = cardsOfLeadSuit.filter(card =>
      beatsCard(
        card,
        winning.card,
        leadSuit,
        game.trump
      )
    );

    // Jeżeli może przebić — musi przebić.
    if (cardsThatBeat.length > 0) {
      return cardsThatBeat;
    }

    // Nie może przebić — dowolna karta koloru.
    return cardsOfLeadSuit;
  }

  // Nie ma koloru — może rzucić cokolwiek.
  return [...hand];
}

function isLegalCard(game, playerIndex, cardId) {
  const legalCards = getLegalCards(game, playerIndex);

  return legalCards.some(card => card.id === cardId);
}

/**
 * Zagranie karty.
 */
function playCard(game, playerIndex, cardId) {
  if (game.phase !== "playing") {
    return {
      ok: false,
      error: "Gra nie jest obecnie w fazie rozgrywania."
    };
  }

  if (playerIndex !== game.currentPlayer) {
    return {
      ok: false,
      error: "To nie jest Twoja kolej."
    };
  }

  const hand = game.hands[playerIndex];

  const cardIndex = hand.findIndex(
    card => card.id === cardId
  );

  if (cardIndex === -1) {
    return {
      ok: false,
      error: "Nie masz tej karty."
    };
  }

  if (!isLegalCard(game, playerIndex, cardId)) {
    return {
      ok: false,
      error: "Nie możesz zagrać tej karty."
    };
  }

  const card = hand.splice(cardIndex, 1)[0];

  game.trick.push({
    player: playerIndex,
    card
  });

  // Meldunek przy wyjściu Damą.
  // Na razie tylko rejestrujemy możliwość.
  // Faktyczne naliczanie punktów zostawiamy
  // do modułu punktacji.
  if (
    game.trick.length === 1 &&
    card.rank === "Q"
  ) {
    const hasKing = hand.some(
      c => c.suit === card.suit && c.rank === "K"
    );

    if (hasKing) {
      const meldPoints =
        card.suit === game.trump ? 40 : 20;

      const team = playerIndex % 2;

      game.melds[team] += meldPoints;
      game.teamPoints[team] += meldPoints;

      game.lastMessage =
        `${playerIndex + 1} melduje ${meldPoints} pkt!`;
    }
  }

  // Kolejny gracz.
  game.currentPlayer =
    (playerIndex + 1) % 4;

  // Lewa zakończona.
  if (game.trick.length === 4) {
    finishTrick(game);
  }

  return {
    ok: true
  };
}

/**
 * Kończy lewę.
 */
function finishTrick(game) {
  const winning = getWinningCard(
    game.trick,
    game.trump
  );

  if (!winning) {
    return;
  }

  const winner = winning.player;

  const trickPoints = calculateTrickPoints(
    game.trick
  );

  const team = winner % 2;

  game.teamPoints[team] += trickPoints;

  game.trickWinner = winner;

  game.lastMessage =
    `Lewę bierze gracz ${winner + 1} (+${trickPoints} pkt).`;

  // 66+ = natychmiastowy koniec.
  if (game.teamPoints[team] >= 66) {
    game.phase = "finished";

    game.lastMessage =
      `Koniec! Drużyna ${team + 1} zdobyła ${game.teamPoints[team]} pkt.`;

    return;
  }

  game.trick = [];

  // Zwycięzca poprzedniej lewy wychodzi.
  game.currentPlayer = winner;
}

function calculateTrickPoints(trick) {
  return trick.reduce(
    (sum, played) =>
      sum + CARD_VALUES[played.card.rank],
    0
  );
}

function check66(game) {
  return (
    game.teamPoints[0] >= 66 ||
    game.teamPoints[1] >= 66
  );
}

/**
 * Stan wysyłany do klienta.
 *
 * Ukrywamy karty przeciwników.
 */
function getGameState(game, viewerIndex = null) {
  return {
    phase: game.phase,

    trump: game.trump,

    chooser: game.chooser,

    currentPlayer: game.currentPlayer,

    teamPoints: [...game.teamPoints],

    melds: [...game.melds],

    trick: game.trick.map(item => ({
      player: item.player,
      card: item.card
    })),

    hands: game.hands.map((hand, index) => {
      if (index === viewerIndex) {
        return [...hand];
      }

      return hand.map(() => ({
        hidden: true
      }));
    }),

    handCount: game.hands.map(
      hand => hand.length
    ),

    lastMessage: game.lastMessage
  };
}

module.exports = {
  SUITS,
  SUIT_NAMES,
  RANKS,
  CARD_VALUES,
  RANK_POWER,

  createDeck,
  shuffle,
  createGame,

  dealInitialCards,
  dealRemainingCards,

  chooseTrump,

  getLegalCards,
  isLegalCard,
  playCard,

  getWinningCard,
  calculateTrickPoints,
  check66,

  getGameState
};
