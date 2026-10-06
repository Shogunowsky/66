const {
    SUITS,
    isLegalPlay
} = require("./game");

function fillBots(players) {
    let botNumber = 1;

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
    const hand = game.hands[playerIndex] || [];

    if (hand.length === 0) {
        return SUITS[0];
    }

    const counts = {
        "♥": 0,
        "♦": 0,
        "♣": 0,
        "♠": 0
    };

    /*
     * Bot wybiera kolor, którego ma najwięcej.
     */
    for (const card of hand) {
        counts[card.suit]++;
    }

    let bestSuit = SUITS[0];
    let bestCount = -1;

    for (const suit of SUITS) {
        if (counts[suit] > bestCount) {
            bestCount = counts[suit];
            bestSuit = suit;
        }
    }

    return bestSuit;
}

function chooseBotCard(game, playerIndex) {
    const hand = game.hands[playerIndex] || [];

    if (hand.length === 0) {
        return null;
    }

    /*
     * Najpierw szukamy wszystkich legalnych kart.
     */
    const legalCards = [];

    for (const card of hand) {
        const result = isLegalPlay(
            game,
            playerIndex,
            card
        );

        if (result.ok) {
            legalCards.push(card);
        }
    }

    if (legalCards.length === 0) {
        return null;
    }

    /*
     * Bot gra najniższą legalną kartę.
     * Przy tej wersji gry jest to najprostsza
     * bezpieczna strategia.
     */
    legalCards.sort((a, b) => {
        if (a.value !== b.value) {
            return a.value - b.value;
        }

        return 0;
    });

    return legalCards[0];
}

function removeCardFromBot(game, playerIndex, card) {
    const hand = game.hands[playerIndex] || [];

    const index = hand.findIndex(
        handCard =>
            handCard.suit === card.suit &&
            handCard.rank === card.rank
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
