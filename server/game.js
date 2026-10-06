const SUITS = ["♥", "♦", "♣", "♠"];
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

const SUIT_NAMES = {
    "♥": "Czerwo",
    "♦": "Dzwonek",
    "♣": "Krzak",
    "♠": "Wino"
};

function createDeck() {
    const deck = [];

    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({
                suit,
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

        [result[i], result[j]] = [
            result[j],
            result[i]
        ];
    }

    return result;
}

function getPlayerTeam(game, playerIndex) {
    const player = game.players[playerIndex];

    if (
        player &&
        (player.team === 0 || player.team === 1)
    ) {
        return player.team;
    }

    return playerIndex % 2;
}

function getTeamName(game, team) {
    const players = game.players.filter(
        player => player.team === team
    );

    if (players.length === 0) {
        return `Drużyna ${team + 1}`;
    }

    return players
        .map(player => player.name)
        .join(" + ");
}

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

        /*
         * Gracz rozpoczynający.
         * Na razie zawsze pierwszy gracz.
         */
        leader: 0,

        currentPlayer: 0,

        trick: [],

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

        /*
         * Meldunki nie są od razu dodawane
         * do punktów gry.
         */
        pendingMelds: [
            0,
            0
        ],

        pendingMeldPlayers: [
            [],
            []
        ],

        handFinished: false,

        winner: null,

        lastTrickWinner: null,

        message: ""
    };
}

function dealInitialCards(game) {
    game.deck = shuffle(createDeck());

    game.hands = [
        [],
        [],
        [],
        []
    ];

    game.trick = [];

    game.trump = null;

    game.phase = "trump";

    game.leader = 0;

    game.currentPlayer = 0;

    game.tricksWon = [
        0,
        0
    ];

    game.scores = [
        0,
        0
    ];

    game.pendingMelds = [
        0,
        0
    ];

    game.pendingMeldPlayers = [
        [],
        []
    ];

    game.handFinished = false;

    game.winner = null;

    game.lastTrickWinner = null;

    /*
     * Pierwsze 3 karty dla każdego.
     */
    for (let round = 0; round < 3; round++) {
        for (let player = 0; player < 4; player++) {
            const card = game.deck.pop();

            if (card) {
                game.hands[player].push(card);
            }
        }
    }

    game.message =
        `${game.players[game.currentPlayer]?.name || "Gracz"} obiera kolor.`;
}

function dealRemainingCards(game) {
    if (game.phase !== "trump") {
        return {
            ok: false,
            error: "Pozostałe karty zostały już rozdane."
        };
    }

    /*
     * Drugie 3 karty.
     */
    for (let round = 0; round < 3; round++) {
        for (let player = 0; player < 4; player++) {
            const card = game.deck.pop();

            if (card) {
                game.hands[player].push(card);
            }
        }
    }

    game.phase = "playing";

    game.currentPlayer = game.leader;

    game.message =
        `${game.players[game.currentPlayer]?.name || "Gracz"} wychodzi.`;

    return {
        ok: true
    };
}

function chooseTrump(game, playerIndex, trump) {
    if (game.phase !== "trump") {
        return {
            ok: false,
            error: "Nie można teraz obierać koloru."
        };
    }

    if (game.currentPlayer !== playerIndex) {
        return {
            ok: false,
            error: "To nie jest twój wybór."
        };
    }

    if (!SUITS.includes(trump)) {
        return {
            ok: false,
            error: "Nieprawidłowy kolor."
        };
    }

    game.trump = trump;

    game.message =
        `${game.players[playerIndex]?.name || "Gracz"} obrał ${SUIT_NAMES[trump]}.`;

    return {
        ok: true
    };
}

function cardEquals(a, b) {
    if (!a || !b) {
        return false;
    }

    return (
        a.suit === b.suit &&
        a.rank === b.rank
    );
}

function getLeadSuit(game) {
    if (!game.trick.length) {
        return null;
    }

    return game.trick[0].card.suit;
}

function canBeat(game, card, winningCard) {
    if (!winningCard) {
        return true;
    }

    /*
     * Atut bije każdy nie-atut.
     */
    if (
        card.suit === game.trump &&
        winningCard.suit !== game.trump
    ) {
        return true;
    }

    if (
        card.suit !== game.trump &&
        winningCard.suit === game.trump
    ) {
        return false;
    }

    /*
     * Jeśli kolory są różne i żaden nie jest atutem,
     * karta nie może bić zwycięskiej.
     */
    if (card.suit !== winningCard.suit) {
        return false;
    }

    return (
        RANK_POWER[card.rank] >
        RANK_POWER[winningCard.rank]
    );
}

function getWinningPlay(game) {
    if (!game.trick.length) {
        return null;
    }

    let winning = game.trick[0];

    for (let i = 1; i < game.trick.length; i++) {
        const candidate = game.trick[i];

        if (
            canBeat(
                game,
                candidate.card,
                winning.card
            )
        ) {
            winning = candidate;
        }
    }

    return winning;
}

function isLegalPlay(game, playerIndex, card) {
    if (game.phase !== "playing") {
        return {
            ok: false,
            error: "Gra nie jest teraz w fazie zagrywania."
        };
    }

    if (game.currentPlayer !== playerIndex) {
        return {
            ok: false,
            error: "Teraz gra inny gracz."
        };
    }

    const hand = game.hands[playerIndex] || [];

    const selected = hand.find(
        handCard => cardEquals(handCard, card)
    );

    if (!selected) {
        return {
            ok: false,
            error: "Nie masz tej karty."
        };
    }

    /*
     * Pierwsza karta lewy.
     */
    if (game.trick.length === 0) {
        return {
            ok: true
        };
    }

    const leadSuit = getLeadSuit(game);

    /*
     * Jeśli mamy kolor wyjścia,
     * MUSIMY nim zagrać.
     */
    const cardsOfLeadSuit = hand.filter(
        handCard => handCard.suit === leadSuit
    );

    if (
        cardsOfLeadSuit.length > 0 &&
        selected.suit !== leadSuit
    ) {
        return {
            ok: false,
            error: `Musisz zagrać ${SUIT_NAMES[leadSuit]}.`
        };
    }

    /*
     * Jeśli możemy przebić aktualnego zwycięzcę,
     * musimy przebić.
     */
    const winningPlay = getWinningPlay(game);

    if (
        selected.suit === leadSuit &&
        winningPlay &&
        winningPlay.card.suit === leadSuit
    ) {
        const canBeatWinning = canBeat(
            game,
            selected,
            winningPlay.card
        );

        if (!canBeatWinning) {
            /*
             * Nie musi bić, jeśli nie jest w stanie.
             */
            const canAnyCardOfLeadSuitBeat =
                cardsOfLeadSuit.some(card =>
                    canBeat(
                        game,
                        card,
                        winningPlay.card
                    )
                );

            if (canAnyCardOfLeadSuitBeat) {
                return {
                    ok: false,
                    error: "Jeśli możesz przebić, musisz przebić."
                };
            }
        }
    }

    /*
     * Jeśli aktualnie wygrywa atut i mamy wyższy atut,
     * musimy go użyć.
     */
    if (
        winningPlay &&
        winningPlay.card.suit === game.trump &&
        selected.suit === game.trump
    ) {
        const higherTrumpExists = hand.some(card =>
            card.suit === game.trump &&
            canBeat(
                game,
                card,
                winningPlay.card
            )
        );

        if (
            higherTrumpExists &&
            !canBeat(
                game,
                selected,
                winningPlay.card
            )
        ) {
            return {
                ok: false,
                error: "Musisz przebić wyższym atutem."
            };
        }
    }

    return {
        ok: true
    };
}

function checkMeld(game, playerIndex, card) {
    /*
     * Meldujemy tylko przy wyjściu DAMĄ.
     */
    if (card.rank !== "Q") {
        return 0;
    }

    const hand = game.hands[playerIndex] || [];

    const hasKing = hand.some(
        handCard =>
            handCard.rank === "K" &&
            handCard.suit === card.suit
    );

    if (!hasKing) {
        return 0;
    }

    if (card.suit === game.trump) {
        return 40;
    }

    return 20;
}

function confirmPendingMelds(game, team) {
    if (!game.pendingMelds[team]) {
        return;
    }

    game.scores[team] +=
        game.pendingMelds[team];

    game.pendingMelds[team] = 0;

    game.pendingMeldPlayers[team] = [];
}

function finishTrick(game) {
    const winningPlay = getWinningPlay(game);

    if (!winningPlay) {
        return;
    }

    const winner = winningPlay.playerIndex;

    const winnerTeam =
        getPlayerTeam(game, winner);

    let trickPoints = 0;

    for (const play of game.trick) {
        trickPoints += play.card.value;
    }

    game.scores[winnerTeam] += trickPoints;

    game.tricksWon[winnerTeam]++;

    /*
     * Dopiero jeśli drużyna wygra sztycha,
     * wcześniej zgłoszony meldunek zostaje zaliczony.
     */
    confirmPendingMelds(
        game,
        winnerTeam
    );

    game.lastTrickWinner = winner;

    game.trick = [];

    game.currentPlayer = winner;

    game.message =
        `${game.players[winner]?.name || "Gracz"} bierze sztycha.`;

    check66(game);
}

function check66(game) {
    for (let team = 0; team < 2; team++) {
        if (game.scores[team] >= 66) {
            game.handFinished = true;

            game.winner = team;

            /*
             * Punkty gry przechodzą do punktów ogólnych.
             */
            game.overallScores[team] +=
                game.scores[team];

            game.gameWins[team]++;

            game.message =
                `${getTeamName(game, team)} zdobywa 66 punktów!`;

            game.phase = "finished";

            return true;
        }
    }

    return false;
}

function playCard(game, playerIndex, card) {
    if (game.handFinished) {
        return {
            ok: false,
            error: "Ta partia już się skończyła."
        };
    }

    const legal = isLegalPlay(
        game,
        playerIndex,
        card
    );

    if (!legal.ok) {
        return legal;
    }

    const hand = game.hands[playerIndex];

    const cardIndex = hand.findIndex(
        handCard => cardEquals(handCard, card)
    );

    if (cardIndex === -1) {
        return {
            ok: false,
            error: "Nie znaleziono karty."
        };
    }

    const playedCard = hand.splice(
        cardIndex,
        1
    )[0];

    /*
     * Jeśli gracz wychodzi damą,
     * sprawdzamy meldunek.
     */
    if (game.trick.length === 0) {
        const meldPoints = checkMeld(
            game,
            playerIndex,
            playedCard
        );

        if (meldPoints > 0) {
            const team =
                getPlayerTeam(
                    game,
                    playerIndex
                );

            game.pendingMelds[team] +=
                meldPoints;

            game.pendingMeldPlayers[team].push(
                playerIndex
            );

            game.message =
                `${game.players[playerIndex]?.name || "Gracz"} melduje ${meldPoints} punktów.`;
        }
    }

    game.trick.push({
        playerIndex,
        card: playedCard
    });

    /*
     * Jeśli wszyscy zagrali,
     * rozliczamy sztycha.
     */
    if (game.trick.length === 4) {
        finishTrick(game);
    } else {
        game.currentPlayer =
            (playerIndex + 1) % 4;

        if (!game.handFinished) {
            game.message =
                `${game.players[game.currentPlayer]?.name || "Gracz"} gra.`;
        }
    }

    return {
        ok: true,
        card: playedCard
    };
}

function getGameState(game) {
    return {
        players: game.players.map(player => ({
            name: player.name,
            isBot: !!player.isBot,
            team: player.team
        })),

        playerNames: game.players.map(
            player => player.name
        ),

        trump: game.trump,

        suitNames: SUIT_NAMES,

        currentPlayer: game.currentPlayer,

        leader: game.leader,

        trick: game.trick.map(play => ({
            playerIndex: play.playerIndex,
            card: play.card
        })),

        scores: [
            ...game.scores
        ],

        overallScores: [
            ...game.overallScores
        ],

        gameWins: [
            ...game.gameWins
        ],

        pendingMelds: [
            ...game.pendingMelds
        ],

        tricksWon: [
            ...game.tricksWon
        ],

        handFinished: game.handFinished,

        winner: game.winner,

        lastTrickWinner:
            game.lastTrickWinner,

        phase: game.phase,

        message: game.message,

        teamNames: [
            getTeamName(game, 0),
            getTeamName(game, 1)
        ]
    };
}

module.exports = {
    SUITS,
    RANKS,
    CARD_VALUES,
    RANK_POWER,
    SUIT_NAMES,

    createDeck,
    shuffle,

    createGame,
    dealInitialCards,
    dealRemainingCards,

    chooseTrump,

    isLegalPlay,
    playCard,

    getGameState,
    getPlayerTeam
};
