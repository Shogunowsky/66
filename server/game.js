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

function dealInitialCards(game) {
  game.deck = shuffle(createDeck());

  game.hands = [[], [], [], []];

  for (let round = 0; round < 3; round++) {
    for (let player = 0; player < 4; player++) {
      game.hands[player].push(game.deck.pop());
    }
  }

  game.trump = null;
  game.trick = [];
  game.trickWinner = null;

  game.phase = "trump";

  game.currentPlayer = game.chooser;

  game.lastMessage =
    `Gracz ${game.chooser + 1} wybiera atu.`;

  return game;
}

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

  game.lastMessage =
    `Atu: ${SUIT_NAMES[game.trump]} (${game.trump}). Gracz ${game.chooser + 1} wychodzi.`;

  return game;
}

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

function getWinningCard(trick, trump) {
  if (!trick.length) {
    return null;
  }

  const leadSuit = trick[0].card.suit;

  let winning = trick[0];

  for (let i = 1; i < trick.length; i++) {
    const candidate = trick[i];

    if (
      beatsCard(
        candidate.card,
        winning.card,
        leadSuit,
        trump
      )
    ) {
      winning = candidate;
    }
  }

  return winning;
}

function getLegalCards(game, playerIndex) {
  const hand = game.hands[playerIndex];

  if (!hand || !hand.length) {
    return [];
  }

  // Pierwsza karta lewy — można wyjść czymkolwiek.
  if (!game.trick.length) {
    return [...hand];
  }

  const leadSuit = game.trick[0].card.suit;

  const cardsOfLeadSuit = hand.filter(
    card => card.suit === leadSuit
  );

  const winning = getWinningCard(
    game.trick,
    game.trump
  );

  /*
   * MASZ KOLOR WYJŚCIA
   *
   * Musisz:
   * - przebić, jeśli możesz;
   * - jeśli nie możesz, możesz zagrać
   *   dowolną niższą kartę tego koloru.
   */
  if (cardsOfLeadSuit.length > 0) {
    const cardsThatBeat =
      cardsOfLeadSuit.filter(card =>
        beatsCard(
          card,
          winning.card,
          leadSuit,
          game.trump
        )
      );

    if (cardsThatBeat.length > 0) {
      return cardsThatBeat;
    }

    return cardsOfLeadSuit;
  }

  /*
   * NIE MASZ KOLORU WYJŚCIA
   *
   * Normalnie możesz zagrać dowolną kartę.
   *
   * WYJĄTEK:
   * jeśli obecnie wygrywa atu i masz wyższe atu,
   * musisz nim przebić.
   */
  const winningIsTrump =
    winning.card.suit === game.trump;

  if (winningIsTrump) {
    const trumpCards = hand.filter(
      card => card.suit === game.trump
    );

    const higherTrumpCards =
      trumpCards.filter(card =>
        beatsCard(
          card,
          winning.card,
          leadSuit,
          game.trump
        )
      );

    if (higherTrumpCards.length > 0) {
      return higherTrumpCards;
    }
  }

  return [...hand];
}

function isLegalCard(game, playerIndex, cardId) {
  const legalCards =
    getLegalCards(game, playerIndex);

  return legalCards.some(
    card => card.id === cardId
  );
}

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

  /*
   * MELD:
   * Meld następuje, kiedy wychodzimy damą
   * i mamy w ręce króla tego samego koloru.
   */
  if (
    game.trick.length === 1 &&
    card.rank === "Q"
  ) {
    const hasKing = hand.some(
      c =>
        c.suit === card.suit &&
        c.rank === "K"
    );

    if (hasKing) {
      const meldPoints =
        card.suit === game.trump ? 40 : 20;

      const team = playerIndex % 2;

      game.melds[team] += meldPoints;
      game.teamPoints[team] += meldPoints;

      game.lastMessage =
        `Gracz ${playerIndex + 1} melduje ${meldPoints} pkt!`;

      /*
       * 66+ kończy grę OD RAZU.
       */
      if (game.teamPoints[team] >= 66) {
        game.phase = "finished";

        game.lastMessage =
          `Koniec! Drużyna ${team + 1} zdobyła ${game.teamPoints[team]} pkt.`;

        return {
          ok: true
        };
      }
    }
  }

  game.currentPlayer =
    (playerIndex + 1) % 4;

  if (game.trick.length === 4) {
    finishTrick(game);
  }

  return {
    ok: true
  };
}

function finishTrick(game) {
  const winning = getWinningCard(
    game.trick,
    game.trump
  );

  if (!winning) {
    return;
  }

  const winner = winning.player;

  const trickPoints =
    calculateTrickPoints(game.trick);

  const team = winner % 2;

  game.teamPoints[team] += trickPoints;

  game.trickWinner = winner;

  game.lastMessage =
    `Lewę bierze gracz ${winner + 1} (+${trickPoints} pkt).`;

  /*
   * 66 lub więcej = natychmiastowy koniec.
   */
  if (game.teamPoints[team] >= 66) {
    game.phase = "finished";

    game.lastMessage =
      `Koniec! Drużyna ${team + 1} zdobyła ${game.teamPoints[team]} pkt.`;

    return;
  }

  game.trick = [];

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

function getGameState(game, viewerIndex = null) {
  return {
    phase: game.phase,

    trump: game.trump,

    chooser: game.chooser,

    currentPlayer: game.currentPlayer,

    teamPoints: [...game.teamPoints],

    melds: [...game.melds],

    playerNames: game.players.map(
      player => player.name
    ),

    trick: game.trick.map(item => ({
      player: item.player,
      card: item.card
    })),

    hands: game.hands.map(
      (hand, index) => {
        if (index === viewerIndex) {
          return [...hand];
        }

        return hand.map(() => ({
          hidden: true
        }));
      }
    ),

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
