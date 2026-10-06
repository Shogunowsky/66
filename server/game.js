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

const GAME_VALUES = {
    zwykly: 3,
    zwyklyLufa: 6,

    lepsza3: 24,
    lepsza6: 12,

    gorsza3: 12,
    gorsza6: 6,

    bezPytania: 6,

    woda: 0.5
};

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
    const result = [...deck];

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}

function createGame(players = []) {
    const deck = shuffle(createDeck());

    const gamePlayers = players.map((player, index) => ({
        id: player.id,
        nickname: player.nickname,
        seat: index,
        team: index % 2 === 0 ? 0 : 1,
        hand: [],
        points: 0,
        tricks: 0,
        active: true
    }));

    return {
        deck,

        players: gamePlayers,

        trump: null,
        trumpName: null,

        dealer: 0,
        currentPlayer: null,

        phase: "waiting",

        trick: [],

        gamePoints: [0, 0],
        cale: [0, 0],

        declaration: null,
        declarationValue: 0,

        lufaLevel: 1,

        bezPytania: false,

        lepsza: false,
        gorsza: false,

        started: false
    };
}

function dealCards(game, amount = 3) {
    for (const player of game.players) {
        player.hand = [];

        for (let i = 0; i < amount; i++) {
            const card = game.deck.pop();

            if (card) {
                player.hand.push(card);
            }
        }
    }
}

function chooseTrump(game, suit) {
    if (!SUITS.includes(suit)) {
        return false;
    }

    game.trump = suit;
    game.trumpName = SUIT_NAMES[suit];

    return true;
}

function getCardPower(card, leadSuit, trump) {
    if (card.suit === trump) {
        return 100 + card.value;
    }

    if (card.suit === leadSuit) {
        return 50 + card.value;
    }

    return card.value;
}

function determineWinner(trick, trump) {
    if (!trick || trick.length === 0) {
        return null;
    }

    const leadSuit = trick[0].card.suit;

    let winner = trick[0];

    for (let i = 1; i < trick.length; i++) {
        const current = trick[i];

        const currentPower = getCardPower(
            current.card,
            leadSuit,
            trump
        );

        const winnerPower = getCardPower(
            winner.card,
            leadSuit,
            trump
        );

        if (currentPower > winnerPower) {
            winner = current;
        }
    }

    return winner;
}

function getTeam(seat) {
    return seat % 2 === 0 ? 0 : 1;
}

function calculateTrickPoints(trick) {
    return trick.reduce((sum, played) => {
        return sum + played.card.value;
    }, 0);
}

function addTrickPoints(game, winnerSeat, points) {
    const team = getTeam(winnerSeat);

    game.gamePoints[team] += points;

    const winner = game.players.find(
        player => player.seat === winnerSeat
    );

    if (winner) {
        winner.points += points;
        winner.tricks += 1;
    }
}

function check66(game) {
    return game.gamePoints.some(points => points >= 66);
}

function getGameState(game) {
    return {
        trump: game.trump,
        trumpName: game.trumpName,

        players: game.players.map(player => ({
            id: player.id,
            nickname: player.nickname,
            seat: player.seat,
            team: player.team,
            hand: player.hand,
            points: player.points,
            tricks: player.tricks
        })),

        gamePoints: game.gamePoints,
        cale: game.cale,

        currentPlayer: game.currentPlayer,

        phase: game.phase,

        trick: game.trick,

        declaration: game.declaration,
        declarationValue: game.declarationValue,

        lufaLevel: game.lufaLevel,

        bezPytania: game.bezPytania,

        lepsza: game.lepsza,
        gorsza: game.gorsza
    };
}

module.exports = {
    SUITS,
    SUIT_NAMES,
    RANKS,
    CARD_VALUES,
    GAME_VALUES,

    createDeck,
    shuffle,
    createGame,
    dealCards,
    chooseTrump,
    determineWinner,
    calculateTrickPoints,
    addTrickPoints,
    check66,
    getGameState
};
