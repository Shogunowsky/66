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
        const j = Math.floor(Math.random() * (i + 1));

        [deck[i], deck[j]] =
            [deck[j], deck[i]];
    }

    return deck;
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

        currentPlayer: 0,

        leader: 0,

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

    game.handFinished = false;

    game.winner = null;

    game.lastTrickWinner = null;

    game.scores = [
        0,
        0
    ];

    game.tricksWon = [
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

    /*
     * Każdy dostaje 3 karty.
     */
    for (let round = 0; round < 3; round++) {
        for (let player = 0; player < 4; player++) {
            game.hands[player].push(
                game.deck.pop()
            );
        }
    }

    /*
     * Na początku obiera gracz 0.
     */
    game.currentPlayer = 0;
    game.leader = 0;

    game.message =
        `Gracz ${game.players[0]?.name || "1"} obiera kolor.`;
}

function dealRemainingCards(game) {
    /*
     * Po obraniu koloru każdy dostaje
     * kolejne 3 karty.
     */
    for (let round = 0; round < 3; round++) {
        for (let player = 0; player < 4; player++) {

            if (game.deck.length === 0) {
                break;
            }

            game.hands[player].push(
                game.deck.pop()
            );
        }
    }

    game.phase = "playing";

    game.currentPlayer = game.leader;

    game.message =
        `Wychodzi ${game.players[game.leader]?.name || "gracz"}.`;
}

function chooseTrump(game, playerIndex, trump) {
    if (game.phase !== "trump") {
        return {
            ok: false,
            error: "Teraz nie można obierać koloru."
        };
    }

    if (game.currentPlayer !== playerIndex) {
        return {
            ok: false,
            error: "Nie jest Twoja kolej na obieranie."
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
        `Obrany kolor: ${SUIT_NAMES[trump]}.`;

    return {
        ok: true
    };
}

function cardBeats(cardA, cardB, leadSuit, trump) {

    /*
     * Zwraca true, jeżeli cardA bije cardB.
     */

    if (cardA.suit === cardB.suit) {
        return (
            RANK_POWER[cardA.rank] >
            RANK_POWER[cardB.rank]
        );
    }

    /*
     * Atut bije każdy nieatut.
     */
    if (
        cardA.suit === trump &&
        cardB.suit !== trump
    ) {
        return true;
    }

    if (
        cardA.suit !== trump &&
        cardB.suit === trump
    ) {
        return false;
    }

    /*
     * Jeżeli oba nie są atutami,
     * wygrywa kolor wyjścia.
     */
    if (cardA.suit === leadSuit) {
        return true;
    }

    return false;
}

function getWinningPlay(trick, game) {
    if (!trick.length) {
        return null;
    }

    const leadSuit = trick[0].card.suit;

    let winner = trick[0];

    for (let i = 1; i < trick.length; i++) {

        const candidate = trick[i];

        if (
            cardBeats(
                candidate.card,
                winner.card,
                leadSuit,
                game.trump
            )
        ) {
            winner = candidate;
        }
    }

    return winner;
}

function isLegalPlay(game, playerIndex, card) {
    if (game.phase !== "playing") {
        return false;
    }

    if (game.currentPlayer !== playerIndex) {
        return false;
    }

    const hand = game.hands[playerIndex];

    const cardInHand = hand.find(
        c =>
            c.suit === card.suit &&
            c.rank === card.rank
    );

    if (!cardInHand) {
        return false;
    }

    /*
     * Jeżeli jesteśmy pierwszym graczem
     * w sztychu, można zagrać dowolną kartę.
     */
    if (game.trick.length === 0) {
        return true;
    }

    const leadSuit =
        game.trick[0].card.suit;

    const hasLeadSuit =
        hand.some(
            c => c.suit === leadSuit
        );

    /*
     * Nie masz koloru wyjścia.
     * Możesz zagrać dowolną kartę.
     */
    if (!hasLeadSuit) {
        return true;
    }

    /*
     * Musisz grać kolorem wyjścia.
     */
    if (card.suit !== leadSuit) {
        return false;
    }

    /*
     * Sprawdzamy, czy aktualnie można
     * przebić zwycięską kartę.
     */
    const winningPlay =
        getWinningPlay(
            game.trick,
            game
        );

    const canBeat =
        hand.some(otherCard => {

            if (otherCard.suit !== leadSuit) {
                return false;
            }

            return cardBeats(
                otherCard,
                winningPlay.card,
                leadSuit,
                game.trump
            );
        });

    /*
     * Jeżeli można przebić,
     * gracz MUSI przebić.
     */
    if (canBeat) {
        return cardBeats(
            card,
            winningPlay.card,
            leadSuit,
            game.trump
        );
    }

    /*
     * Nie można przebić — można zagrać
     * dowolną kartę w kolorze wyjścia.
     */
    return true;
}

function checkMeld(game, playerIndex, card) {
    /*
     * Meldujemy tylko wtedy, gdy wychodzi DAMA
     * i gracz ma KRÓLA tego samego koloru.
     */

    if (card.rank !== "Q") {
        return;
    }

    const hand = game.hands[playerIndex];

    const hasKing = hand.some(
        c =>
            c.suit === card.suit &&
            c.rank === "K"
    );

    if (!hasKing) {
        return;
    }

    const team =
        game.players[playerIndex].team;

    if (team !== 0 && team !== 1) {
        return;
    }

    const points =
        card.suit === game.trump
            ? 40
            : 20;

    /*
     * Punkty są PENDING.
     * Nie doliczamy ich jeszcze do wyniku.
     */
    game.pendingMelds[team] += points;

    if (
        !game.pendingMeldPlayers[team]
            .includes(playerIndex)
    ) {
        game.pendingMeldPlayers[team].push(
            playerIndex
        );
    }

    game.message =
        `${game.players[playerIndex].name} melduje ${points} punktów.`;
}

function confirmPendingMeld(game, team) {
    if (game.pendingMelds[team] <= 0) {
        return;
    }

    const points =
        game.pendingMelds[team];

    game.scores[team] += points;

    game.pendingMelds[team] = 0;

    game.pendingMeldPlayers[team] = [];

    game.message =
        `Meld zaliczony: +${points} punktów.`;
}

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
        game.players[winnerIndex].team;

    /*
     * Punkty za karty.
     */
    let trickPoints = 0;

    for (const play of game.trick) {
        trickPoints += play.card.value;
    }

    game.scores[winnerTeam] +=
        trickPoints;

    game.tricksWon[winnerTeam]++;

    /*
     * Dopiero po wygraniu sztycha
     * potwierdzamy oczekujący meldunek.
     */
    confirmPendingMeld(
        game,
        winnerTeam
    );

    game.lastTrickWinner =
        winnerIndex;

    game.leader =
        winnerIndex;

    game.currentPlayer =
        winnerIndex;

    game.trick = [];

    check66(game);

    if (game.handFinished) {
        return;
    }

    game.message =
        `${game.players[winnerIndex].name} bierze sztycha i wychodzi.`;
}

function check66(game) {

    for (let team = 0; team < 2; team++) {

        if (game.scores[team] >= 66) {

            game.handFinished = true;

            game.winner = team;

            game.phase = "finished";

            game.overallScores[team] +=
                game.scores[team];

            game.gameWins[team]++;

            game.message =
                `${game.players.find(
                    p => p.team === team
                )?.name || "Drużyna"} zdobywa 66 punktów!`;

            return;
        }
    }
}

function playCard(game, playerIndex, card) {

    if (game.phase !== "playing") {
        return {
            ok: false,
            error: "Gra nie jest w fazie rozgrywania."
        };
    }

    if (game.handFinished) {
        return {
            ok: false,
            error: "Rozdanie już się zakończyło."
        };
    }

    if (
        game.currentPlayer !== playerIndex
    ) {
        return {
            ok: false,
            error: "Nie jest Twoja kolej."
        };
    }

    if (!isLegalPlay(
        game,
        playerIndex,
        card
    )) {
        return {
            ok: false,
            error: "Nie możesz zagrać tej karty."
        };
    }

    const hand =
        game.hands[playerIndex];

    const cardIndex =
        hand.findIndex(
            c =>
                c.suit === card.suit &&
                c.rank === card.rank
        );

    if (cardIndex === -1) {
        return {
            ok: false,
            error: "Nie masz tej karty."
        };
    }

    const playedCard =
        hand.splice(
            cardIndex,
            1
        )[0];

    /*
     * Meld sprawdzamy tylko przy wyjściu.
     */
    if (game.trick.length === 0) {
        checkMeld(
            game,
            playerIndex,
            playedCard
        );
    }

    game.trick.push({
        playerIndex,
        playerName:
            game.players[playerIndex].name,
        card: playedCard
    });

    /*
     * Jeszcze nie koniec sztycha.
     */
    if (game.trick.length < 4) {

        game.currentPlayer =
            (playerIndex + 1) % 4;

        return {
            ok: true
        };
    }

    /*
     * Czwarta karta — rozstrzygamy sztych.
     */
    finishTrick(game);

    return {
        ok: true
    };
}

function getGameState(game) {

    return {
        players: game.players.map(
            p => ({
                name: p.name,
                team: p.team,
                isBot: !!p.isBot
            })
        ),

        playerNames:
            game.players.map(
                p => p.name
            ),

        trump: game.trump,

        suitNames: SUIT_NAMES,

        currentPlayer:
            game.currentPlayer,

        leader:
            game.leader,

        trick:
            game.trick,

        scores:
            game.scores,

        overallScores:
            game.overallScores,

        gameWins:
            game.gameWins,

        pendingMelds:
            game.pendingMelds,

        tricksWon:
            game.tricksWon,

        handFinished:
            game.handFinished,

        winner:
            game.winner,

        lastTrickWinner:
            game.lastTrickWinner,

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

function getTeamNameFromPlayers(
    players,
    team
) {
    const teamPlayers =
        players.filter(
            p => p.team === team
        );

    if (!teamPlayers.length) {
        return `Drużyna ${team + 1}`;
    }

    return teamPlayers
        .map(p => p.name)
        .join(" + ");
}

module.exports = {
    SUITS,
    SUIT_NAMES,
    RANKS,
    CARD_VALUES,
    createDeck,
    shuffle,
    createGame,
    dealInitialCards,
    dealRemainingCards,
    chooseTrump,
    isLegalPlay,
    playCard,
    getGameState
};
