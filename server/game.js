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

"10": 5,

K: 4,

Q: 3,

J: 2,

9: 1

};

/* =========================

DECK

========================= */

function createDeck() {

const deck = [];

for (const suit of SUITS) {

for (const rank of RANKS) {

deck.push({

suit,

suitName: SUIT_NAMES[suit],

rank,

value: CARD_VALUES[rank]

});

}

}

return deck;

}

function shuffle(deck) {

for (let i = deck.length - 1; i > 0; i--) {

const j =

Math.floor(

Math.random() * (i + 1)

);

[deck[i], deck[j]] =

[deck[j], deck[i]];

}

return deck;

}

/* =========================

GAME

========================= */

function createGame(players) {

return {

players,

deck: [],

hands: [

[],

[],

[],

[]

],

trump: null,

phase: "waiting",

currentPlayer: 0,

leader: 0,

trick: [],

trickResolving: false,

tricksWon: [

0,

0

],

scores: [

0,

0

],

overallScores: [

0,

0

],

gameWins: [

0,

0

],

pendingMelds: [

0,

0

],

pendingMeldPlayers: [

[],

[]

],

dealStage: "first3",

chooser: 0,

nextChooser: 0,

mode: "normal",

soloPlayer: null,

soloTeam: null,

skippedPlayer: null,

lufaMultiplier: 1,

lufaCallCount: 0,

lufaReboundCount: 0,

lufaClosedAt66: false,

lufaActive: false,

earlyLufaCalled: false,

lastLufaPlayer: null,

lufaWindow: false,

lufaStage: null,

lufaUntil: null,

pendingMeldMessage: null,

handFinished: false,

winner: null,

lastTrickWinner: null,

lastTrickPoints: 0,

lastTrickTeam: null,

specialCaught: false,

specialSoloTricks: 0,

specialOpponentTricks: 0,

message: ""

};

}

/* =========================

DEALING

========================= */

function resetHandData(game) {

game.trick = [];

game.trickResolving = false;

game.trump = null;

game.handFinished = false;

game.winner = null;

game.lastTrickWinner = null;

game.lastTrickPoints = 0;

game.lastTrickTeam = null;

game.scores = [0, 0];

game.tricksWon = [0, 0];

game.pendingMelds = [0, 0];

game.pendingMeldPlayers = [

[],

[]

];

game.mode = "normal";

game.soloPlayer = null;

game.soloTeam = null;

game.skippedPlayer = null;

game.lufaMultiplier = 1;

game.lufaCallCount = 0;

game.lufaReboundCount = 0;

game.lufaClosedAt66 = false;

game.lufaActive = false;

game.earlyLufaCalled = false;

game.lastLufaPlayer = null;

game.lufaWindow = false;

game.lufaStage = null;

game.lufaUntil = null;

game.pendingMeldMessage = null;

game.announcement = null;

game.announcementUntil = null;

game.specialCaught = false;

game.specialSoloTricks = 0;

game.specialOpponentTricks = 0;

}

function dealInitialCards(game) {

game.deck =

shuffle(

createDeck()

);

game.hands = [

[],

[],

[],

[]

];

resetHandData(game);

game.dealStage = "first3";

game.phase = "trump";

game.chooser =

Number.isInteger(

game.nextChooser

)

? game.nextChooser

: 0;

game.currentPlayer =

game.chooser;

game.leader =

game.chooser;

for (

let round = 0;

round < 3;

round++

) {

for (

let player = 0;

player < 4;

player++

) {

if (

game.deck.length === 0

) {

break;

}

game.hands[player].push(

game.deck.pop()

);

}

}

game.message =

`${getPlayerName(

game,

game.chooser

)} obiera kolor albo wybiera Lepszą/Gorszą.`;

}

function dealRemainingCards(game) {

if (

game.phase !== "lufa" &&

game.phase !== "trump" &&

game.phase !== "special"

) {

return {

ok: false,

error:

"Nie można teraz rozdać kolejnych kart."

};

}

for (

let round = 0;

round < 3;

round++

) {

for (

let player = 0;

player < 4;

player++

) {

if (

game.deck.length === 0

) {

break;

}

game.hands[player].push(

game.deck.pop()

);

}

}

game.dealStage = "last3";

// Po dobraniu pełnych 6 kart najpierw jest okno deklaracji.

game.phase = "lufa";

game.lufaStage = "afterLast3";

game.lufaWindow = false;

game.lufaUntil = null;

game.currentPlayer = game.chooser;

game.leader = game.chooser;

game.message =

"Rozdano 6 kart. Obierający pyta o Lepszą, Gorszą lub Lufę na kolor.";

return {

ok: true

};

}

/* =========================

TRUMP

========================= */

function chooseTrump(

game,

playerIndex,

trump

) {

if (game.phase !== "trump") {

return {

ok: false,

error:

"Teraz nie można obierać koloru."

};

}

if (

game.currentPlayer !==

playerIndex

) {

return {

ok: false,

error:

"Nie jest Twoja kolej na obieranie."

};

}

if (!SUITS.includes(trump)) {

return {

ok: false,

error:

"Nieprawidłowy kolor."

};

}

game.trump = trump;

game.phase = "lufa";

game.lufaStage =

"afterFirst3";

game.lufaWindow = true;

game.lufaUntil =

Date.now() + 10000;

game.lufaMultiplier = 1;

game.lufaCallCount = 0;

game.lufaReboundCount = 0;

game.lufaClosedAt66 = false;

game.lufaActive = false;

game.earlyLufaCalled = false;

game.lastLufaPlayer = null;

game.message =

`${getPlayerName(

game,

playerIndex

)} obrał ${

SUIT_NAMES[trump]

}. 10 sekund na Lufę.`;

return {

ok: true,

lufaWindow: true,

lufaUntil:

game.lufaUntil

};

}

/* =========================

SPECIAL MODES

========================= */

function chooseSpecialMode(game, playerIndex, mode) {
  if (mode !== "lepsza" && mode !== "gorsza") {
    return { ok: false, error: "Nieprawidłowy tryb." };
  }
  if (!Number.isInteger(playerIndex) || !game.players[playerIndex]) {
    return { ok: false, error: "Nie znaleziono gracza." };
  }
  // Tryb specjalny wybiera się po dobraniu do 6 kart.
  // Jeśli Lufa padła na pierwszych 3 kartach, tryb specjalny jest zablokowany.
  const declaringAtSix = game.phase === "lufa" &&
    game.mode === "normal" &&
    game.dealStage === "last3" &&
    game.lufaStage === "afterLast3" &&
    game.lufaWindow &&
    !game.earlyLufaCalled &&
    !game.lufaActive;
  if (!declaringAtSix) {
    return { ok: false, error: "Lepszą lub Gorszą można wybrać dopiero po obraniu koloru i rozdaniu 6 kart, o ile wcześniej nie było Lufy." };
  }
  game.mode = mode;
  game.soloPlayer = playerIndex;
  game.soloTeam = game.players[playerIndex]?.team ?? null;
  if (game.soloTeam === 0 || game.soloTeam === 1) {
    game.skippedPlayer = game.players.findIndex((player, index) => index !== playerIndex && player.team === game.soloTeam);
  } else game.skippedPlayer = null;
  game.specialCaught = false;
  game.specialSoloTricks = 0;
  game.specialOpponentTricks = 0;
  game.lufaWindow = true;
  game.lufaStage = "afterLast3";
  game.lufaUntil = Date.now() + 10000;
  game.lufaMultiplier = 1;
  game.lufaCallCount = 0;
  game.lufaReboundCount = 0;
  game.lufaClosedAt66 = false;
  game.lufaActive = false;
  game.lastLufaPlayer = playerIndex; // osoba zgłaszająca tryb nie może sama zgłosić/odbić Lufy
  game.phase = "lufa";
  game.currentPlayer = playerIndex;
  game.leader = playerIndex;
  game.message = `${getPlayerName(game, playerIndex)} zgłasza ${mode === "lepsza" ? "Lepszą" : "Gorszą"} po rozdaniu 6 kart. Atut: ${SUIT_NAMES[game.trump] || game.trump}. 10 sekund na Lufę.`;
  return { ok: true, mode, lufaWindow: true, lufaUntil: game.lufaUntil };
}

/* =========================

LUFA

========================= */

function canCallLufa(game, playerIndex, response = false) {
  if (game.phase !== "lufa" || !game.lufaWindow || game.lufaClosedAt66) return false;
  if (playerIndex === game.lastLufaPlayer) return false; // nikt nie odbija własnej Lufy
  if (playerIndex === game.chooser && game.mode === "normal" && !(response && game.lufaActive)) return false;
  // Przy Lufie na kolor, zgłoszonej przeciwko obierającemu, tylko obierający może odbić.
  if (response && game.mode === "normal" && playerIndex !== game.chooser) return false;
  if (response && !game.lufaActive) return false;
  if (!response && game.lufaActive) return false;
  // Po Lufie zgłoszonej na pierwszych 3 kartach nie wolno ponawiać Lufy po 6 kartach.
  if (game.lufaStage === "afterLast3" && game.earlyLufaCalled) return false;
  return game.lufaStage === "afterFirst3" || game.lufaStage === "afterLast3";
}

function getBaseStake(game) {
  if (game.mode === "lepsza") return 24;
  if (game.mode === "gorsza") return 12;
  return 12; // Lufa na kolor rozpoczyna stawkę 12; kolejne odbicia ją podwajają
}

function getCurrentStake(game) {
  if (game.lufaClosedAt66) return 66;
  return Math.min(66, getBaseStake(game) * Math.max(1, game.lufaMultiplier || 1));
}

function applyLufa(game, playerIndex, actionLabel) {
  // Pierwsza Lufa ustanawia bazową stawkę (np. 12 pkt dla Lufy na kolor z 3 kart).
  // Dopiero odpowiedź na już aktywną Lufę podwaja stawkę: 12 -> 24 -> 48 -> 66 „do końca”.
  const baseStake = getBaseStake(game);
  const nextMultiplier = game.lufaActive
    ? Math.max(1, game.lufaMultiplier || 1) * 2
    : 1;
  game.lufaMultiplier = nextMultiplier;
  game.lufaCallCount = (game.lufaCallCount || 0) + 1;
  if (actionLabel === "odbija") game.lufaReboundCount = (game.lufaReboundCount || 0) + 1;
  game.lufaActive = true;
  game.lastLufaPlayer = playerIndex;
  if (game.lufaStage === "afterFirst3") game.earlyLufaCalled = true;
  if (baseStake * nextMultiplier >= 66) game.lufaClosedAt66 = true;
  // Okno pozostaje widoczne przez 10 s, ale po dojściu do 66 dalsze odbicia są zablokowane.
  game.lufaUntil = Date.now() + 10000;
  const stake = getCurrentStake(game);
  const modeText = game.mode === "normal" ? "na kolor" : (game.mode === "lepsza" ? "Lepsza" : "Gorsza");
  game.message = `${getPlayerName(game, playerIndex)} ${actionLabel} — LUFA ${modeText}. Odbicia: ${game.lufaReboundCount || 0}. Gra o ${stake} pkt${game.lufaClosedAt66 ? " — DO KOŃCA" : ""}.`;
  game.announcement = game.message;
  game.announcementUntil = Date.now() + 3000;
  return { ok: true, multiplier: game.lufaMultiplier, lufaCallCount: game.lufaCallCount, pointsAtStake: stake, lufaClosedAt66: game.lufaClosedAt66, lufaUntil: game.lufaUntil };
}

function callLufa(game, playerIndex) {
  if (!canCallLufa(game, playerIndex)) return { ok: false, error: "Teraz nie możesz powiedzieć Lufa." };
  return applyLufa(game, playerIndex, "zgłasza");
}

function callBackLufa(game, playerIndex) {
  if (!canCallLufa(game, playerIndex, true)) return { ok: false, error: "Nie możesz odbić tej Lufy (nie można odbijać własnej ani po osiągnięciu gry do końca)." };
  return applyLufa(game, playerIndex, "odbija");
}

function finishLufaWindow(game) {

if (!game.lufaWindow) {

return {

ok: false,

error: "Okno deklaracji nie jest aktywne."

};

}

game.lufaWindow = false;

game.lufaUntil = null;

if (game.lufaStage === "afterFirst3") {

game.earlyLufaCalled = !!game.lufaActive;

const result = dealRemainingCards(game);

if (!result.ok) {

return result;

}

// Po dobraniu do 6 kart, jeśli Lufa została już zgłoszona na pierwszych
// 3 kartach, blokujemy dalsze Lufy i wybór Lepszej/Gorszej.
if (game.earlyLufaCalled || game.lufaActive) {
  game.phase = "playing";
  game.lufaStage = "afterLast3";
  game.lufaWindow = false;
  game.lufaUntil = null;
  game.currentPlayer = game.chooser;
  game.leader = game.chooser;
  game.message = `Rozdano 6 kart. Lufa na kolor już zgłoszona — odbita: ${game.lufaReboundCount || 0} razy, gra o ${getCurrentStake(game)} pkt${game.lufaClosedAt66 ? " — DO KOŃCA" : ""}. Nie można zgłaszać Lepszej/Gorszej ani kolejnej Lufy.`;
  return { ok: true, secondWindow: false, earlyLufaCalled: true };
}

game.phase = "lufa";
game.lufaStage = "afterLast3";
game.lufaWindow = true;
game.lufaUntil = Date.now() + 10000;
game.message = "Rozdano 6 kart. Po obraniu koloru można zgłosić Lepszą lub Gorszą; Lufa na kolor jest już zamknięta.";
return { ok: true, secondWindow: true, earlyLufaCalled: false };
}

if (game.lufaStage === "afterLast3") {

game.lufaWindow = false;

game.lufaUntil = null;

game.phase = "playing";

if (game.mode === "lepsza" || game.mode === "gorsza") {

game.currentPlayer = game.soloPlayer;

game.leader = game.soloPlayer;

game.message = `${getPlayerName(game, game.soloPlayer)} wychodzi.`;

} else {

game.currentPlayer = game.chooser;

game.leader = game.chooser;

game.message = `Wychodzi ${getPlayerName(game, game.chooser)}.`;

}

return {

ok: true,

secondWindow: false

};

}

game.phase = "playing";

return { ok: true };

}

/* =========================

CARD COMPARISON

========================= */

function cardBeats(

cardA,

cardB,

leadSuit,

trump

) {

if (!cardA || !cardB) {

return false;

}

if (

cardA.suit ===

cardB.suit

) {

return (

RANK_POWER[cardA.rank] >

RANK_POWER[cardB.rank]

);

}

if (

trump &&

cardA.suit === trump &&

cardB.suit !== trump

) {

return true;

}

if (

trump &&

cardA.suit !== trump &&

cardB.suit === trump

) {

return false;

}

if (

cardA.suit ===

leadSuit

) {

return true;

}

return false;

}

function getWinningPlay(

trick,

game

) {

if (!trick.length) {

return null;

}

const leadSuit =

trick[0].card.suit;

let winner =

trick[0];

for (

let i = 1;

i < trick.length;

i++

) {

const candidate =

trick[i];

if (

cardBeats(

candidate.card,

winner.card,

leadSuit,

game.trump

)

) {

winner =

candidate;

}

}

return winner;

}

/* =========================

ACTIVE PLAYERS

========================= */

function isPlayerActive(

game,

playerIndex

) {

if (

game.mode !== "lepsza" &&

game.mode !== "gorsza"

) {

return true;

}

return (

playerIndex !==

game.skippedPlayer

);

}

function getActivePlayers(game) {

const active = [];

for (

let i = 0;

i < game.players.length;

i++

) {

if (

isPlayerActive(

game,

i

)

) {

active.push(i);

}

}

return active;

}

function getNextActivePlayer(

game,

playerIndex

) {

const active =

getActivePlayers(

game

);

if (!active.length) {

return playerIndex;

}

const currentPosition =

active.indexOf(

playerIndex

);

if (

currentPosition === -1

) {

return active[0];

}

return active[

(

currentPosition + 1

) % active.length

];

}

function getExpectedTrickLength(

game

) {

if (

game.mode === "lepsza" ||

game.mode === "gorsza"

) {

return 3;

}

return 4;

}

/* =========================

LEGAL PLAY

========================= */

function isLegalPlay(

game,

playerIndex,

card

) {

if (

game.phase !==

"playing"

) {

return false;

}

if (game.handFinished) {

return false;

}

if (

!isPlayerActive(

game,

playerIndex

)

) {

return false;

}

if (

game.currentPlayer !==

playerIndex

) {

return false;

}

if (!card) {

return false;

}

const hand =

game.hands[playerIndex];

const cardInHand =

hand.find(

c =>

c.suit ===

card.suit &&

c.rank ===

card.rank

);

if (!cardInHand) {

return false;

}

if (

game.trick.length === 0

) {

return true;

}

const leadSuit =

game.trick[0].card.suit;

const hasLeadSuit =

hand.some(

c =>

c.suit ===

leadSuit

);

const trump =

(

game.mode === "lepsza" ||

game.mode === "gorsza"

)

? null

: game.trump;

/*

* Masz kolor wyjścia.

*/

if (hasLeadSuit) {

if (

card.suit !==

leadSuit

) {

return false;

}

const winningPlay =

getWinningPlay(

game.trick,

game

);

if (!winningPlay) {

return true;

}

const canBeat =

hand.some(

otherCard => {

if (

otherCard.suit !==

leadSuit

) {

return false;

}

return cardBeats(

otherCard,

winningPlay.card,

leadSuit,

trump

);

}

);

if (canBeat) {

return cardBeats(

card,

winningPlay.card,

leadSuit,

trump

);

}

return true;

}

/*

* Nie masz koloru wyjścia.

*

* W normalnej grze atut jest obowiązkowy,

* jeżeli gracz go posiada.

*/

if (trump) {

const hasTrump =

hand.some(

c =>

c.suit ===

trump

);

if (hasTrump) {

return (

card.suit ===

trump

);

}

}

return true;

}

/* =========================

MELD

========================= */

function declareMeld(game, playerIndex, suit) {
  if (game.phase !== "playing" || game.mode !== "normal") {
    return { ok: false, error: "Meldunek jest dostępny tylko w zwykłej grze." };
  }
  if (game.currentPlayer !== playerIndex) return { ok: false, error: "Nie jest Twoja kolej." };
  if (game.trick.length !== 0) return { ok: false, error: "Meldunek można zgłosić tylko przy wyjściu." };
  const hand = game.hands[playerIndex] || [];
  const queen = hand.find(card => card.rank === "Q" && card.suit === suit);
  const king = hand.find(card => card.rank === "K" && card.suit === suit);
  if (!queen || !king) return { ok: false, error: "Potrzebujesz damy i króla tego samego koloru." };
  if (!isLegalPlay(game, playerIndex, queen)) return { ok: false, error: "Nie możesz teraz wyjść damą tego koloru." };
  // Zgłoszenie meldunku zawsze wychodzi damą; checkMeld naliczy 20 albo 40 punktów.
  return playCard(game, playerIndex, { rank: "Q", suit });
}

function checkMeld(

game,

playerIndex,

card

) {

if (card.rank !== "Q") {

return;

}

const hand =

game.hands[playerIndex];

const hasKing =

hand.some(

c =>

c.suit ===

card.suit &&

c.rank === "K"

);

if (!hasKing) {

return;

}

if (

game.mode === "lepsza" ||

game.mode === "gorsza"

) {

return;

}

const team =

game.players[

playerIndex

].team;

if (

team !== 0 &&

team !== 1

) {

return;

}

const points =

card.suit ===

game.trump

? 40

: 20;

game.pendingMelds[team] +=

points;

if (

!game.pendingMeldPlayers[

team

].includes(

playerIndex

)

) {

game.pendingMeldPlayers[

team

].push(

playerIndex

);

}

game.pendingMeldMessage = `${getPlayerName(game, playerIndex)} melduje ${points === 40 ? "duży meldunek (40 pkt)" : "mały meldunek (20 pkt)"}.`;
  game.announcement = game.pendingMeldMessage;
  game.announcementUntil = Date.now() + 3000;
  game.message = game.pendingMeldMessage;

}

function confirmPendingMeld(

game,

team

) {

if (

game.pendingMelds[team] <= 0

) {

return;

}

const points =

game.pendingMelds[team];

game.scores[team] +=

points;

game.pendingMelds[team] = 0;

game.pendingMeldPlayers[

team

] = [];

game.message =

`Meld zaliczony: +${points} punktów.`;

}

/* =========================

SPECIAL MODES

========================= */

function getSpecialTargetPoints(

game

) {

if (game.mode === "lepsza") return 24;

if (game.mode === "gorsza") {
  // Gorsza z 3 kart jest warta 12 pkt; nie obniżamy jej do 6
  // tylko dlatego, że tryb został zatwierdzony po dobraniu pozostałych kart.
  return 12;
}

return 0;

}

/*

* W trybach specjalnych obierający

* gra sam przeciwko dwóm przeciwnikom.

*

* Nie ma atutu.

*

* "Gorsza":

* obierający nie może wziąć sztycha.

* Jeżeli sam wygra choć jeden sztych,

* zostaje złapany.

*

* "Lepsza":

* obierający musi utrzymać kontrolę

* nad rozgrywką według zasad trybu.

* Wynik jest rozstrzygany po zakończeniu

* wszystkich kart.

*/

function finishSpecialTrick(game) {

if (!game.trick.length) {

return;

}

const winningPlay =

getWinningPlay(

game.trick,

game

);

if (!winningPlay) {

return;

}

const winnerIndex =

winningPlay.playerIndex;

const solo =

game.soloPlayer;

let trickPoints = 0;

for (

const play of game.trick

) {

trickPoints +=

play.card.value;

}

const soloWon =

winnerIndex === solo;

const opponentTeam =

game.soloTeam === 0

? 1

: 0;

if (soloWon) {

if (game.mode !== "gorsza" && (game.soloTeam === 0 || game.soloTeam === 1)) {
  game.scores[game.soloTeam] += trickPoints;
}

game.specialSoloTricks++;

/*

* W Gorszej samodzielne wzięcie

* sztycha oznacza złapanie.

*/

if (

game.mode === "gorsza"

) {

game.specialCaught =

true;

}

} else {
if (game.mode !== "gorsza") game.scores[opponentTeam] += trickPoints;
game.specialOpponentTricks++;

}

game.lastTrickWinner =

winnerIndex;

game.lastTrickPoints =

trickPoints;

game.lastTrickTeam =

soloWon

? game.soloTeam

: opponentTeam;

game.tricksWon[

game.lastTrickTeam

]++;

game.leader =

winnerIndex;

game.currentPlayer =

winnerIndex;

game.trick = [];

// W trybie specjalnym 66 punktów gry również natychmiast kończy rozdanie,
// niezależnie od tego, czy pozostały jeszcze karty.
for (let team = 0; team < 2; team++) {
  if ((game.scores[team] || 0) >= 66) {
    finishSpecialGame(game, game.mode === "gorsza" && game.specialCaught ? "opponents" : (team === game.soloTeam ? "solo" : "opponents"));
    return;
  }
}

// W Lepszej złapanie solisty przez przeciwnika kończy grę od razu.
if (game.mode === "lepsza" && !soloWon) {
  finishSpecialGame(game, "opponents");
  return;
}

const activePlayers =

getActivePlayers(

game

);

const cardsRemaining =

activePlayers.some(

index =>

game.hands[index] &&

game.hands[index]

.length > 0

);

/*

* Gorsza:

* jeżeli obierający został złapany,

* rozdanie kończy się od razu.

*/

if (

game.mode === "gorsza" &&

game.specialCaught

) {

finishSpecialGame(

game,

"opponents"

);

return;

}

if (!cardsRemaining) {

finishSpecialGame(

game,

determineSpecialResult(

game

)

);

return;

}

game.message =

`${getPlayerName(

game,

winnerIndex

)} bierze sztycha i wychodzi.`;

}

function determineSpecialResult(

game

) {

/*

* Gorsza:

* jeżeli obierający nie został

* złapany do końca, wygrywa obierający.

*/

if (

game.mode === "gorsza"

) {

return game.specialCaught

? "opponents"

: "solo";

}

/*

* Lepsza:

* obierający musi wygrać przynajmniej

* jeden sztych. Jeżeli nie przejął

* żadnego, wygrywają przeciwnicy.

*/

if (

game.mode === "lepsza"

) {

return (

game.specialSoloTricks > 0

? "solo"

: "opponents"

);

}

return "opponents";

}

function awardGeneralPoints(game, team, points) {
  if (team !== 0 && team !== 1) return;
  game.overallScores[team] = (game.overallScores[team] || 0) + Math.max(0, points || 0);
  // 66 punktów ogólnych zamienia się na jeden cały punkt i licznik ogólny startuje od zera.
  if (game.overallScores[team] >= 66) {
    game.overallScores[team] = 0;
    game.gameWins[team] = (game.gameWins[team] || 0) + 1;
  }
}

function normalGamePointsForWinner(game, winnerTeam) {
  const loserTeam = winnerTeam === 0 ? 1 : 0;
  const loserPoints = game.scores[loserTeam] || 0;
  if (loserPoints === 0 && (game.tricksWon[loserTeam] || 0) === 0) return 3;
  if (loserPoints < 33) return 2;
  return 1;
}

function finishSpecialGame(

game,

result

) {

if (game.handFinished) {

return;

}

game.handFinished = true;

game.phase = "finished";

const opponentTeam =

game.soloTeam === 0

? 1

: 0;

const target = Math.min(66, getSpecialTargetPoints(game) * Math.max(1, game.lufaMultiplier || 1));

if (

result === "solo"

) {

game.winner =

game.soloTeam;

if (game.mode !== "gorsza") {
  game.scores[game.soloTeam] = Math.max(game.scores[game.soloTeam], target);
}

awardGeneralPoints(game, game.soloTeam, target);

game.message =

`${getPlayerName(

game,

game.soloPlayer

)} wygrywa ${

game.mode === "lepsza"

? "Lepszą"

: "Gorszą"

} za ${target} punktów.`;

game.nextChooser =

(

game.chooser + 1

) % 4;

return;

}

game.winner =

opponentTeam;

if (game.mode !== "gorsza") {
  game.scores[opponentTeam] = Math.max(game.scores[opponentTeam], target);
}

awardGeneralPoints(game, opponentTeam, target);

game.message =

`Obierający został złapany. Wygrywa drużyna przeciwna za ${target} punktów.`;

game.nextChooser =

(

game.chooser + 1

) % 4;

}

/* =========================

NORMAL TRICK

========================= */

function finishTrick(game) {

const winningPlay =

getWinningPlay(

game.trick,

game

);

if (!winningPlay) {

return;

}

const winnerIndex =

winningPlay.playerIndex;

const winnerTeam =

game.players[

winnerIndex

].team;

let trickPoints = 0;

for (

const play of game.trick

) {

trickPoints +=

play.card.value;

}

game.scores[

winnerTeam

] += trickPoints;

game.tricksWon[

winnerTeam

]++;

confirmPendingMeld(

game,

winnerTeam

);

game.lastTrickWinner =

winnerIndex;

game.lastTrickPoints =

trickPoints;

game.lastTrickTeam =

winnerTeam;

game.leader =

winnerIndex;

game.currentPlayer =

winnerIndex;

game.trick = [];

const reachedGamePointThreshold = check66(game);

if (game.handFinished) {
    return;
}

// Jeśli wszystkie karty zostały zagrane, a nikt nie osiągnął 66,
// rozdanie wygrywa drużyna biorąca ostatni sztych.
const cardsRemaining = game.hands.some(
    hand => Array.isArray(hand) && hand.length > 0
);

if (!cardsRemaining) {
    const finalGeneralPoints = reachedGamePointThreshold ? 0 : normalGamePointsForWinner(game, winnerTeam);
    game.handFinished = true;
    game.phase = "finished";
    game.winner = winnerTeam;
    if (!reachedGamePointThreshold) {
      awardGeneralPoints(game, winnerTeam, finalGeneralPoints);
    }
    game.scores = [0, 0];
    game.nextChooser = (game.chooser + 1) % 4;
    game.message = reachedGamePointThreshold
      ? `${getTeamNameFromPlayers(game.players, winnerTeam)} wygrywa ostatnim sztychem. Punkty ogólne za próg 66 zostały już przyznane.`
      : `${getTeamNameFromPlayers(game.players, winnerTeam)} wygrywa ostatnim sztychem i otrzymuje ${finalGeneralPoints} punktów ogólnych.`;
    return;
}

game.message =

`${getPlayerName(

game,

winnerIndex

)} bierze sztycha. Drużyna zdobywa ${trickPoints} pkt.`;

}

/* =========================

66

========================= */

function check66(game) {
  for (let team = 0; team < 2; team++) {
    if ((game.scores[team] || 0) >= 66) {
      const basePoints = normalGamePointsForWinner(game, team);
      const pointsAwarded = Math.min(66, basePoints * Math.max(1, game.lufaMultiplier || 1));
      awardGeneralPoints(game, team, pointsAwarded);
      game.handFinished = true;
      game.phase = "finished";
      game.winner = team;
      game.scores = [0, 0];
      game.tricksWon = [0, 0];
      game.trick = [];
      game.trickResolving = false;
      game.nextChooser = (game.chooser + 1) % 4;
      game.message = `${getTeamNameFromPlayers(game.players, team)} osiąga 66 punktów gry. Rozdanie zakończone — przyznano ${pointsAwarded} punktów ogólnych${game.lufaActive ? ` (Lufa, odbicia: ${game.lufaCallCount || 1})` : ""}.`;
      return true;
    }
  }
  return false;
}

/* =========================

PLAY CARD

========================= */

function playCard(

game,

playerIndex,

card

) {

if (

game.phase !==

"playing"

) {

return {

ok: false,

error:

"Gra nie jest w fazie rozgrywania."

};

}

if (game.handFinished) {

return {

ok: false,

error:

"Rozdanie już się zakończyło."

};

}

if (game.trickResolving) {
  return { ok: false, error: "Poczekaj na rozstrzygnięcie sztycha." };
}

if (

game.currentPlayer !==

playerIndex

) {

return {

ok: false,

error:

"Nie jest Twoja kolej."

};

}

if (

!isPlayerActive(

game,

playerIndex

)

) {

return {

ok: false,

error:

"Ten gracz nie bierze udziału w tej rozgrywce."

};

}

if (

!isLegalPlay(

game,

playerIndex,

card

)

) {

return {

ok: false,

error:

"Nie możesz zagrać tej karty."

};

}

const hand =

game.hands[playerIndex];

const cardIndex =

hand.findIndex(

c =>

c.suit ===

card.suit &&

c.rank ===

card.rank

);

if (cardIndex === -1) {

return {

ok: false,

error:

"Nie masz tej karty."

};

}

const playedCard =

hand.splice(

cardIndex,

1

)[0];

if (

game.trick.length === 0

) {

checkMeld(

game,

playerIndex,

playedCard

);

}

game.trick.push({

playerIndex,

playerName:

getPlayerName(

game,

playerIndex

),

card: playedCard

});

const expectedLength =

getExpectedTrickLength(

game

);

if (

game.trick.length <

expectedLength

) {

game.currentPlayer =

getNextActivePlayer(

game,

playerIndex

);

game.message =

`${getPlayerName(

game,

game.currentPlayer

)} gra.`;

return {

ok: true

};

}

game.trickResolving = true;
game.message = "Sztych kompletny — karty zostaną pokazane za chwilę.";
return { ok: true, trickComplete: true };

}

function resolveCompletedTrick(game) {
  if (!game || !game.trickResolving) return;
  game.trickResolving = false;
  if (game.mode === "lepsza" || game.mode === "gorsza") finishSpecialTrick(game);
  else finishTrick(game);
}

/* =========================

GAME STATE

========================= */

function getGameState(game) {

return {

players:

game.players.map(

(p, index) => ({

name: p.name,

team: p.team,

isBot: !!p.isBot,

playerIndex: index

})

),

playerNames:

game.players.map(

p => p.name

),

trump:

game.trump,

suitNames:

SUIT_NAMES,

currentPlayer:

game.currentPlayer,

currentPlayerName:

getPlayerName(

game,

game.currentPlayer

),

leader:

game.leader,

chooser:

game.chooser,

mode:

game.mode,

soloPlayer:

game.soloPlayer,

skippedPlayer:

game.skippedPlayer,

dealStage:

game.dealStage,

lufaMultiplier:

game.lufaMultiplier,

lufaCallCount: game.lufaCallCount || 0,

lufaReboundCount: game.lufaReboundCount || 0,

lufaClosedAt66: !!game.lufaClosedAt66,

lastLufaPlayer: game.lastLufaPlayer,

lufaActive:

game.lufaActive,

earlyLufaCalled:

!!game.earlyLufaCalled,

lufaWindow:

game.lufaWindow,

lufaStage:

game.lufaStage,

lufaUntil:

game.lufaUntil,

trick:

game.trick,

trickResolving:

game.trickResolving,

scores:

game.scores,

pointsAtStake: game.lufaClosedAt66 ? 66 : (game.lufaActive ? getCurrentStake(game) : (game.mode === "normal" ? 66 : getSpecialTargetPoints(game))),

stakeLabel: game.lufaClosedAt66 ? "DO KOŃCA" : "",

lufaStatus: game.lufaActive ? `Lufa ${game.mode === "normal" ? "na kolor" : (game.mode === "lepsza" ? "na Lepszą" : "na Gorszą")} • odbita: ${game.lufaReboundCount || 0} razy • gra o ${getCurrentStake(game)} pkt${game.lufaClosedAt66 ? " — DO KOŃCA" : ""}` : "",

nextHandAt: game.nextHandAt || null,

announcement: game.announcement || null,

announcementUntil: game.announcementUntil || null,

overallScores:

game.overallScores,

gameWins:

game.gameWins,

pendingMelds:

game.pendingMelds,

tricksWon:

game.tricksWon,

specialCaught:

game.specialCaught,

specialSoloTricks:

game.specialSoloTricks,

specialOpponentTricks:

game.specialOpponentTricks,

handFinished:

game.handFinished,

winner:

game.winner,

lastTrickWinner:

game.lastTrickWinner,

lastTrickPoints:

game.lastTrickPoints,

lastTrickTeam:

game.lastTrickTeam,

phase:

game.phase,

message:

game.message,

teamNames: [

getTeamNameFromPlayers(

game.players,

0

),

getTeamNameFromPlayers(

game.players,

1

)

]

};

}

/* =========================

HELPERS

========================= */

function getPlayerName(

game,

playerIndex

) {

if (

!game.players ||

!game.players[playerIndex]

) {

return "Gracz";

}

return (

game.players[

playerIndex

].name ||

`Gracz ${

playerIndex + 1

}`

);

}

function getTeamNameFromPlayers(

players,

team

) {

const teamPlayers =

players.filter(

p =>

p.team === team

);

if (!teamPlayers.length) {

return `Drużyna ${

team + 1

}`;

}

return teamPlayers

.map(

p => p.name

)

.join(" + ");

}

/* =========================

NEXT HAND

========================= */

function startNextHand(game) {

game.nextHandAt = null;

if (!game.handFinished) {

return {

ok: false,

error:

"To rozdanie jeszcze się nie skończyło."

};

}

game.chooser =

Number.isInteger(

game.nextChooser

)

? game.nextChooser

: (

(

game.chooser + 1

) % 4

);

game.nextChooser =

game.chooser;

dealInitialCards(

game

);

return {

ok: true

};

}

/* =========================

EXPORT

========================= */

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

chooseSpecialMode,

canCallLufa,

callLufa,

callBackLufa,

finishLufaWindow,

isLegalPlay,

playCard,

declareMeld,

resolveCompletedTrick,

finishTrick,

finishSpecialTrick,

getSpecialTargetPoints,

getCurrentStake,

check66,

awardGeneralPoints,

startNextHand,

getGameState

};
