const {
isLegalPlay
} = require("./game");

let botNumber = 1;

/* =========================
BOT FILL
========================= */

function fillBots(players) {
while (players.length < 4) {
players.push({
socketId:
`BOT_${Date.now()}_${botNumber}`,

```
        name:
            `Bot ${botNumber}`,

        isBot: true,

        team: null
    });

    botNumber++;
}
```

}

/* =========================
BOT TRUMP
========================= */

function chooseBotTrump(game, playerIndex) {
const hand =
game.hands[playerIndex] || [];

```
if (!hand.length) {
    return "♥";
}

const counts = {
    "♥": 0,
    "♦": 0,
    "♣": 0,
    "♠": 0
};

/*
 * Bot bierze pod uwagę nie tylko liczbę kart,
 * ale również ich wartość.
 */
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

    strength[card.suit] +=
        card.value;
}

let bestSuit = "♥";
let bestScore = -1;

for (const suit of Object.keys(counts)) {
    /*
     * Liczba kart jest najważniejsza.
     * Przy remisie decyduje suma punktów.
     */
    const score =
        counts[suit] * 20 +
        strength[suit];

    if (score > bestScore) {
        bestScore = score;
        bestSuit = suit;
    }
}

return bestSuit;
```

}

/* =========================
BOT SPECIAL MODE
========================= */

function chooseBotSpecialMode(game, playerIndex) {
const hand =
game.hands[playerIndex] || [];

```
if (!hand.length) {
    return null;
}

/*
 * Na razie bot wybiera tryb tylko wtedy,
 * gdy pierwsze 3 karty są wyraźnie mocne.
 *
 * Nie wymuszamy specjalnego trybu —
 * zwykły kolor pozostaje podstawowym wyborem.
 */

const points =
    hand.reduce(
        (sum, card) =>
            sum + card.value,
        0
    );

const highCards =
    hand.filter(
        card =>
            card.rank === "A" ||
            card.rank === "10"
    ).length;

/*
 * Lepsza:
 * sensowna tylko przy mocnym pierwszym układzie.
 */
if (
    points >= 25 &&
    highCards >= 2
) {
    return "lepsza";
}

/*
 * Gorszej na razie bot nie wybiera sam.
 * Dzięki temu nie będzie losowo psuł rozgrywki.
 */
return null;
```

}

/* =========================
BOT CARD
========================= */

function chooseBotCard(game, playerIndex) {
const hand =
game.hands[playerIndex] || [];

```
if (!hand.length) {
    return null;
}

const legalCards =
    hand.filter(
        card =>
            isLegalPlay(
                game,
                playerIndex,
                card
            )
    );

if (!legalCards.length) {
    return null;
}

/*
 * Pierwsze wyjście.
 *
 * Bot wybiera mocną kartę,
 * ale w specjalnym trybie trochę ostrożniej.
 */
if (game.trick.length === 0) {

    if (
        game.mode === "lepsza" ||
        game.mode === "gorsza"
    ) {
        return chooseSpecialOpeningCard(
            legalCards
        );
    }

    return [...legalCards]
        .sort(
            (a, b) => {
                /*
                 * Najpierw wartość,
                 * potem siła rangi.
                 */
                if (b.value !== a.value) {
                    return b.value - a.value;
                }

                return (
                    (b.power || 0) -
                    (a.power || 0)
                );
            }
        )[0];
}

/*
 * Jeżeli bot może wygrać sztych,
 * preferuje najtańszą kartę,
 * która rzeczywiście wygrywa.
 */
const winningCards =
    legalCards.filter(card =>
        canBotWinWithCard(
            game,
            card
        )
    );

if (winningCards.length) {
    return [...winningCards]
        .sort(
            (a, b) =>
                a.value - b.value
        )[0];
}

/*
 * Jeżeli nie może wygrać,
 * pozbywa się najtańszej legalnej karty.
 */
return [...legalCards]
    .sort(
        (a, b) =>
            a.value - b.value
    )[0];
```

}

/* =========================
BOT OPENING
========================= */

function chooseSpecialOpeningCard(cards) {
/*
* W Lepszej/Gorszej nie ma atutu.
*
* Bot zaczyna raczej niską kartą,
* żeby nie oddawać od razu mocnych punktów.
*/
return [...cards]
.sort(
(a, b) => {
if (a.value !== b.value) {
return a.value - b.value;
}

```
            return (
                getRankPower(a.rank) -
                getRankPower(b.rank)
            );
        }
    )[0];
```

}

/* =========================
BOT WIN CHECK
========================= */

function canBotWinWithCard(game, card) {
if (!game.trick.length) {
return true;
}

```
const trick =
    [
        ...game.trick,
        {
            playerIndex: game.currentPlayer,
            card
        }
    ];

const leadSuit =
    trick[0].card.suit;

let winner =
    trick[0];

for (let i = 1; i < trick.length; i++) {
    const candidate =
        trick[i];

    if (
        cardBeats(
            candidate.card,
            winner.card,
            leadSuit,
            (
                game.mode === "lepsza" ||
                game.mode === "gorsza"
            )
                ? null
                : game.trump
        )
    ) {
        winner =
            candidate;
    }
}

return winner.card === card;
```

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

```
const rankPowerA =
    getRankPower(cardA.rank);

const rankPowerB =
    getRankPower(cardB.rank);

if (cardA.suit === cardB.suit) {
    return rankPowerA > rankPowerB;
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

return cardA.suit === leadSuit;
```

}

/* =========================
RANK POWER
========================= */

function getRankPower(rank) {
switch (rank) {
case "A":
return 6;

```
    case "10":
        return 5;

    case "K":
        return 4;

    case "Q":
        return 3;

    case "J":
        return 2;

    case "9":
        return 1;

    default:
        return 0;
}
```

}

/* =========================
REMOVE CARD
========================= */

function removeCardFromBot(
game,
playerIndex,
card
) {
const hand =
game.hands[playerIndex];

```
if (!hand) {
    return false;
}

const index =
    hand.findIndex(
        c =>
            c.suit === card.suit &&
            c.rank === card.rank
    );

if (index === -1) {
    return false;
}

hand.splice(
    index,
    1
);

return true;
```

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
