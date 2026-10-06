const {
  getLegalCards
} = require("./game");

const BOT_NAMES = [
  "Biały",
  "PowLeeShin",
  "Nadsztygar",
  "Zgred"
];

function fillBots(players) {
  while (players.length < 4) {
    const seat = players.length;

    players.push({
      id: `bot-${seat}`,
      name: BOT_NAMES[seat] || `Bot ${seat + 1}`,
      seat,
      bot: true
    });
  }

  return players;
}

function chooseBotTrump(game, playerIndex) {
  const hand = game.hands[playerIndex];

  if (!hand || hand.length === 0) {
    return game.trump;
  }

  const suitCounts = {};

  for (const suit of game.constructor?.SUITS || []) {
    suitCounts[suit] = 0;
  }

  for (const card of hand) {
    suitCounts[card.suit] =
      (suitCounts[card.suit] || 0) + 1;
  }

  let bestSuit = hand[0].suit;
  let bestCount = 0;

  for (const suit of Object.keys(suitCounts)) {
    if (suitCounts[suit] > bestCount) {
      bestCount = suitCounts[suit];
      bestSuit = suit;
    }
  }

  return bestSuit;
}

function chooseBotCard(game, playerIndex) {
  const legalCards =
    getLegalCards(game, playerIndex);

  if (!legalCards.length) {
    return null;
  }

  /*
   * Na razie bot gra możliwie bezpiecznie:
   *
   * - jeśli może legalnie przebić, wybiera
   *   najniższą kartę, która wystarczy;
   * - jeśli nie może przebić, oddaje
   *   najniższą kartę;
   * - przy kilku możliwościach preferuje
   *   karty o mniejszej wartości punktowej.
   */

  const cardValue = {
    A: 11,
    "10": 10,
    K: 4,
    Q: 3,
    J: 2,
    9: 0
  };

  const sorted = [...legalCards].sort(
    (a, b) =>
      cardValue[a.rank] -
      cardValue[b.rank]
  );

  /*
   * Jeżeli mamy kilka kart o tej samej
   * wartości, zachowujemy pierwszą.
   */
  return sorted[0].id;
}

function removeCardFromBot(
  game,
  playerIndex,
  cardId
) {
  const hand = game.hands[playerIndex];

  if (!hand) {
    return false;
  }

  const index = hand.findIndex(
    card => card.id === cardId
  );

  if (index === -1) {
    return false;
  }

  hand.splice(index, 1);

  return true;
}

module.exports = {
  BOT_NAMES,
  fillBots,
  chooseBotTrump,
  chooseBotCard,
  removeCardFromBot
};
