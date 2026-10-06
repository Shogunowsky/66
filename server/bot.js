const BOT_NAMES = [
    "Górnik",
    "Sztygar",
    "Kret",
    "Węgielek"
];

function createBot(seat) {
    return {
        id: `bot-${seat}-${Date.now()}`,
        nickname: BOT_NAMES[seat] || `Bot ${seat + 1}`,
        seat,
        team: seat % 2 === 0 ? 0 : 1,
        isBot: true,
        hand: [],
        points: 0,
        tricks: 0,
        active: true
    };
}

function fillBots(players, maxPlayers = 4) {
    const result = [...players];

    for (let seat = 0; seat < maxPlayers; seat++) {
        const occupied = result.some(player => player.seat === seat);

        if (!occupied) {
            result.push(createBot(seat));
        }
    }

    result.sort((a, b) => a.seat - b.seat);

    return result;
}

function isBot(player) {
    return Boolean(player && player.isBot);
}

function chooseBotTrump(game, bot) {
    if (!isBot(bot)) {
        return null;
    }

    const suits = ["♥", "♦", "♣", "♠"];

    const counts = {
        "♥": 0,
        "♦": 0,
        "♣": 0,
        "♠": 0
    };

    for (const card of bot.hand) {
        counts[card.suit]++;
    }

    let bestSuit = suits[0];

    for (const suit of suits) {
        if (counts[suit] > counts[bestSuit]) {
            bestSuit = suit;
        }
    }

    return bestSuit;
}

function chooseBotCard(game, bot) {
    if (!isBot(bot) || !bot.hand.length) {
        return null;
    }

    // Na razie bot wybiera kartę o najmniejszej wartości.
    // Później dodamy tutaj pełną logikę Sznapsa.
    let selected = bot.hand[0];

    for (const card of bot.hand) {
        if (card.value < selected.value) {
            selected = card;
        }
    }

    return selected;
}

function removeCardFromBot(bot, card) {
    if (!isBot(bot)) {
        return false;
    }

    const index = bot.hand.findIndex(
        c =>
            c.suit === card.suit &&
            c.rank === card.rank
    );

    if (index === -1) {
        return false;
    }

    bot.hand.splice(index, 1);

    return true;
}

module.exports = {
    BOT_NAMES,
    createBot,
    fillBots,
    isBot,
    chooseBotTrump,
    chooseBotCard,
    removeCardFromBot
};
