const { isLegalPlay } = require("./game");

let botNumber = 1;

/* =========================

BOT FILL

========================= */

function fillBots(players) {

while (players.length < 4) {

players.push({

socketId: `BOT_${Date.now()}_${botNumber}`,

name: `Bot ${botNumber}`,

isBot: true,

team: null

});

botNumber++;

}

}

/* =========================

BOT TRUMP

========================= */

function chooseBotTrump(game, playerIndex) {

const hand = game.hands[playerIndex] || [];

if (!hand.length) {

return "♥";

}

const counts = {

"♥": 0,

"♦": 0,

"♣": 0,

"♠": 0

};

const strength = {

"♥": 0,

"♦": 0,

"♣": 0,

"♠": 0

};

for (const card of hand) {

if (counts[card.suit] === undefined) {

continue;

}

counts[card.suit]++;

strength[card.suit] += card.value || 0;

}

let bestSuit = "♥";

let bestScore = -1;

for (const suit of Object.keys(counts)) {

const score = counts[suit] * 20 + strength[suit];

if (score > bestScore) {

bestScore = score;

bestSuit = suit;

}

}

return bestSuit;

}

/* =========================

BOT SPECIAL MODE

========================= */

function chooseBotSpecialMode(game, playerIndex) {

const hand = game.hands[playerIndex] || [];

if (!hand.length) {

return null;

}

const points = hand.reduce(

(sum, card) => sum + (card.value || 0),

0

);

const highCards = hand.filter(

card => card.rank === "A" || card.rank === "10"

).length;

if (points >= 25 && highCards >= 2) {

return "lepsza";

}

return null;

}

/* =========================

BOT CARD

========================= */

function chooseBotCard(game, playerIndex) {

const hand = game.hands[playerIndex] || [];

if (!hand.length) {

return null;

}

const legalCards = hand.filter(card =>

isLegalPlay(game, playerIndex, card)

);

if (!legalCards.length) {

return null;

}

if (!game.trick || game.trick.length === 0) {

if (game.mode === "lepsza" || game.mode === "gorsza") {

return chooseSpecialOpeningCard(legalCards, game.mode);

}

return [...legalCards].sort((a, b) => {

if (b.value !== a.value) {

return (b.value || 0) - (a.value || 0);

}

return getRankPower(b.rank) - getRankPower(a.rank);

})[0];

}

const winningCards = legalCards.filter(card =>

canBotWinWithCard(game, playerIndex, card)

);

if (winningCards.length) {

return [...winningCards].sort(

(a, b) => (a.value || 0) - (b.value || 0)

)[0];

}

return [...legalCards].sort(

(a, b) => (a.value || 0) - (b.value || 0)

)[0];

}

/* =========================

BOT OPENING

========================= */

function chooseSpecialOpeningCard(cards, mode) {
  // W Lepszej bot powinien od razu przejąć inicjatywę najwyższą kartą.
  // W Gorszej pozostaje przy niskiej karcie, by nie brać sztycha.
  const descending = mode === "lepsza";
  return [...cards].sort((a, b) => {
    if (a.value !== b.value) {
      return descending ? (b.value || 0) - (a.value || 0) : (a.value || 0) - (b.value || 0);
    }
    return descending
      ? getRankPower(b.rank) - getRankPower(a.rank)
      : getRankPower(a.rank) - getRankPower(b.rank);
  })[0];
}

/* =========================

BOT WIN CHECK

========================= */

function canBotWinWithCard(game, playerIndex, card) {

if (!game.trick || game.trick.length === 0) {

return true;

}

const trick = [

...game.trick,

{

playerIndex,

card

}

];

const leadSuit = trick[0].card.suit;

let winner = trick[0];

for (let i = 1; i < trick.length; i++) {

const candidate = trick[i];

if (

cardBeats(

candidate.card,

winner.card,

leadSuit,

game.mode === "lepsza" || game.mode === "gorsza"

? null

: game.trump

)

) {

winner = candidate;

}

}

return winner === trick[trick.length - 1];

}

/* =========================

CARD COMPARISON

========================= */

function cardBeats(cardA, cardB, leadSuit, trump) {

if (!cardA || !cardB) {

return false;

}

const rankPowerA = getRankPower(cardA.rank);

const rankPowerB = getRankPower(cardB.rank);

if (cardA.suit === cardB.suit) {

return rankPowerA > rankPowerB;

}

if (trump && cardA.suit === trump && cardB.suit !== trump) {

return true;

}

if (trump && cardA.suit !== trump && cardB.suit === trump) {

return false;

}

return cardA.suit === leadSuit;

}

/* =========================

RANK POWER

========================= */

function getRankPower(rank) {

switch (rank) {

case "A": return 6;

case "10": return 5;

case "K": return 4;

case "Q": return 3;

case "J": return 2;

case "9": return 1;

default: return 0;

}

}

/* =========================

REMOVE CARD

========================= */

function removeCardFromBot(game, playerIndex, card) {

const hand = game.hands[playerIndex];

if (!hand) {

return false;

}

const index = hand.findIndex(

c => c.suit === card.suit && c.rank === card.rank

);

if (index === -1) {

return false;

}

hand.splice(index, 1);

return true;

}

/* =========================

EXPORT

========================= */

module.exports = {

fillBots,

chooseBotTrump,

chooseBotSpecialMode,

chooseBotCard,

removeCardFromBot

};
