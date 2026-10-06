const {
    isLegalPlay
} = require("./game");

let botNumber = 1;

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

function chooseBotTrump(game, playerIndex) {
    const hand =
        game.hands[playerIndex] || [];

    if (!hand.length) {
        return "♥";
    }

    /*
     * Bot wybiera kolor, w którym ma
     * najwięcej kart.
     */

    const counts = {
        "♥": 0,
        "♦": 0,
        "♣": 0,
        "♠": 0
    };

    for (const card of hand) {
        if (counts[card.suit] !== undefined) {
            counts[card.suit]++;
        }
    }

    let bestSuit = "♥";
    let bestCount = -1;

    for (const suit of Object.keys(counts)) {
        if (counts[suit] > bestCount) {
            bestCount = counts[suit];
            bestSuit = suit;
        }
    }

    return bestSuit;
}

function chooseBotCard(game, playerIndex) {
    const hand =
        game.hands[playerIndex] || [];

    if (!hand.length) {
        return null;
    }

    /*
     * Najpierw szukamy kart, które są legalne.
     */
    const legalCards =
        hand.filter(card =>
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
     * Bot preferuje:
     * - przy pierwszym wyjściu mocniejsze karty,
     * - w pozostałych sytuacjach najtańszą legalną kartę.
     */

    if (game.trick.length === 0) {

        return [...legalCards]
            .sort(
                (a, b) =>
                    b.value - a.value
            )[0];
    }

    return [...legalCards]
        .sort(
            (a, b) =>
                a.value - b.value
        )[0];
}

function removeCardFromBot(
    game,
    playerIndex,
    card
) {
    const hand =
        game.hands[playerIndex];

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

    hand.splice(index, 1);

    return true;
}

module.exports = {
    fillBots,
    chooseBotTrump,
    chooseBotCard,
    removeCardFromBot
};
