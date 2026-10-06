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
    "10": 10,
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
   TALIA
========================= */

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

    for (
        let i = result.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() * (i + 1)
            );

        [
            result[i],
            result[j]
        ] = [
            result[j],
            result[i]
        ];
    }

    return result;
}


/* =========================
   DRUŻYNY
========================= */

function getPlayerTeam(game, playerIndex) {

    const player =
        game.players[playerIndex];

    if (
        player &&
        typeof player.team === "number"
    ) {
        return player.team;
    }

    /*
       Awaryjnie zachowujemy stary układ,
       gdyby gra została utworzona bez
       informacji o drużynie.
    */

    return playerIndex % 2;
}


/* =========================
   GRA
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

        currentPlayer: 0,

        leader: 0,

        phase: "initial",

        trick: [],

        tricksWon: [
            0,
            0
        ],

        /*
           Punkty zdobyte w aktualnym rozdaniu.
        */

        scores: [
            0,
            0
        ],

        /*
           Suma punktów z zakończonych rozdań.
        */

        overallScores: [
            0,
            0
        ],

        /*
           Liczba wygranych całych rozdań
           do 66.
        */

        gameWins: [
            0,
            0
        ],

        /*
           Zabezpieczenie przed wielokrotnym
           zakończeniem tego samego rozdania.
        */

        handFinished: false,

        winner: null,

        lastTrickWinner: null,

        message: "",

        playerNames:
            players.map(
                player => player.name
            )
    };
}


/* =========================
   PIERWSZE 3 KARTY
========================= */

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

    /*
       Każdy dostaje 3 karty.
    */

    for (let i = 0; i < 3; i++) {

        for (let player = 0; player < 4; player++) {

            const card =
                game.deck.pop();

            if (card) {
                game.hands[player].push(card);
            }
        }
    }

    game.message =
        `Gracz ${game.players[game.currentPlayer].name} obiera kolor.`;
}


/* =========================
   KOLEJNE 3 KARTY
========================= */

function dealRemainingCards(game) {

    for (let i = 0; i < 3; i++) {

        for (let player = 0; player < 4; player++) {

            const card =
                game.deck.pop();

            if (card) {
                game.hands[player].push(card);
            }
        }
    }

    game.phase = "playing";

    game.leader =
        game.currentPlayer;

    game.trick = [];

    game.message =
        `Zaczyna ${game.players[game.currentPlayer].name}.`;
}


/* =========================
   OBIERANIE KOLORU
========================= */

function chooseTrump(game, suit) {

    if (game.phase !== "trump") {
        return {
            error: "Nie można teraz obierać koloru."
        };
    }

    if (!SUITS.includes(suit)) {
        return {
            error: "Nieprawidłowy kolor."
        };
    }

    game.trump = suit;

    return {
        success: true
    };
}


/* =========================
   PORÓWNYWANIE KART
========================= */

function beatsCard(
    game,
    candidate,
    current,
    leadSuit
) {

    if (!current) {
        return true;
    }

    const candidateTrump =
        candidate.suit === game.trump;

    const currentTrump =
        current.suit === game.trump;


    /*
       Trump bije nietrump.
    */

    if (
        candidateTrump &&
        !currentTrump
    ) {
        return true;
    }

    if (
        !candidateTrump &&
        currentTrump
    ) {
        return false;
    }


    /*
       Jeżeli obie karty są różnego
       koloru i żadna nie jest atutem,
       nie mogą się wzajemnie bić.
    */

    if (
        candidate.suit !==
        current.suit
    ) {
        return false;
    }


    /*
       Ten sam kolor:
       wyższa karta wygrywa.
    */

    return (
        RANK_POWER[candidate.rank] >
        RANK_POWER[current.rank]
    );
}


/* =========================
   ZWYCIĘSKA KARTA
========================= */

function getWinningCard(game) {

    if (!game.trick.length) {
        return null;
    }

    const leadSuit =
        game.trick[0].card.suit;

    let winner =
        game.trick[0];

    for (
        let i = 1;
        i < game.trick.length;
        i++
    ) {

        const play =
            game.trick[i];

        if (
            beatsCard(
                game,
                play.card,
                winner.card,
                leadSuit
            )
        ) {
            winner = play;
        }
    }

    return winner;
}


/* =========================
   LEGALNE KARTY
========================= */

function getLegalCards(
    game,
    playerIndex
) {

    const hand =
        game.hands[playerIndex];

    if (!hand || !hand.length) {
        return [];
    }

    /*
       Jeżeli nie ma jeszcze
       rozpoczętego sztycha,
       można zagrać wszystko.
    */

    if (!game.trick.length) {
        return [...hand];
    }

    const leadSuit =
        game.trick[0].card.suit;

    const cardsOfLeadSuit =
        hand.filter(
            card =>
                card.suit === leadSuit
        );

    /*
       Jeżeli mamy kolor wyjścia,
       musimy nim zagrać.
    */

    if (cardsOfLeadSuit.length > 0) {

        const winner =
            getWinningCard(game);

        const cardsThatBeat =
            cardsOfLeadSuit.filter(
                card =>
                    beatsCard(
                        game,
                        card,
                        winner.card,
                        leadSuit
                    )
            );

        /*
           Jeżeli możemy pobić,
           MUSIMY pobić.
        */

        if (cardsThatBeat.length > 0) {
            return cardsThatBeat;
        }

        /*
           Nie możemy pobić,
           więc możemy zagrać dowolną
           kartę tego koloru.
        */

        return cardsOfLeadSuit;
    }

    /*
       Nie mamy koloru wyjścia.
       Możemy zagrać dowolną kartę.
    */

    return [...hand];
}


/* =========================
   SPRAWDZENIE LEGALNOŚCI
========================= */

function isLegalCard(
    game,
    playerIndex,
    card
) {

    const legal =
        getLegalCards(
            game,
            playerIndex
        );

    return legal.some(
        legalCard =>
            legalCard.suit === card.suit &&
            legalCard.rank === card.rank
    );
}


/* =========================
   ZAGRANIE KARTY
========================= */

function playCard(
    game,
    playerIndex,
    card
) {

    if (game.handFinished) {

        return {
            error: "Rozdanie już się zakończyło."
        };
    }

    if (game.phase !== "playing") {

        return {
            error: "Nie można teraz zagrać karty."
        };
    }

    if (
        playerIndex !==
        game.currentPlayer
    ) {

        return {
            error: "To nie jest Twoja kolej."
        };
    }

    if (
        !card ||
        !card.suit ||
        !card.rank
    ) {

        return {
            error: "Nieprawidłowa karta."
        };
    }

    if (
        !isLegalCard(
            game,
            playerIndex,
            card
        )
    ) {

        return {
            error: "Nie możesz zagrać tej karty."
        };
    }


    /*
       Znajdujemy kartę w ręce.
    */

    const hand =
        game.hands[playerIndex];

    const cardIndex =
        hand.findIndex(
            handCard =>
                handCard.suit === card.suit &&
                handCard.rank === card.rank
        );

    if (cardIndex === -1) {

        return {
            error: "Nie masz tej karty."
        };
    }


    const playedCard =
        hand.splice(
            cardIndex,
            1
        )[0];


    game.trick.push({
        playerIndex,

        playerName:
            game.players[playerIndex].name,

        team:
            getPlayerTeam(
                game,
                playerIndex
            ),

        card: playedCard
    });


    /*
       Meld:
       obecna wersja nalicza go od razu.
       W punkcie 7 zmienimy to na punkty
       oczekujące do czasu wygrania sztycha.
    */

    if (
        game.trick.length === 1 &&
        playedCard.rank === "Q"
    ) {

        const hasKing =
            hand.some(
                handCard =>
                    handCard.suit ===
                        playedCard.suit &&
                    handCard.rank === "K"
            );

        if (hasKing) {

            const team =
                getPlayerTeam(
                    game,
                    playerIndex
                );

            const meldPoints =
                playedCard.suit === game.trump
                    ? 40
                    : 20;

            game.scores[team] +=
                meldPoints;

            game.message =
                `${game.players[playerIndex].name} melduje ${playedCard.suit} — +${meldPoints}`;
        }
    }


    /*
       Jeżeli mamy 4 karty,
       kończymy sztych.
    */

    if (game.trick.length === 4) {

        finishTrick(game);

        return {
            success: true
        };
    }


    /*
       Następny gracz zgodnie
       z ruchem zgodnym z ruchem
       wskazówek zegara.
    */

    game.currentPlayer =
        (playerIndex + 1) % 4;


    game.message =
        `Kolej ${game.players[game.currentPlayer].name}.`;

    return {
        success: true
    };
}


/* =========================
   KONIEC SZTYCHA
========================= */

function finishTrick(game) {

    const winner =
        getWinningCard(game);

    if (!winner) {
        return;
    }

    const winnerIndex =
        winner.playerIndex;

    const winnerTeam =
        getPlayerTeam(
            game,
            winnerIndex
        );


    /*
       Liczymy punkty kart.
    */

    const trickPoints =
        calculateTrickPoints(
            game.trick
        );

    game.scores[winnerTeam] +=
        trickPoints;


    /*
       Liczymy liczbę wygranych
       sztychów przez drużynę.
    */

    game.tricksWon[winnerTeam]++;


    game.lastTrickWinner =
        winnerIndex;


    /*
       Czy drużyna osiągnęła 66?
    */

    if (
        check66(
            game,
            winnerTeam
        )
    ) {
        return;
    }


    /*
       Kolejny sztych zaczyna
       zwycięzca poprzedniego.
    */

    game.currentPlayer =
        winnerIndex;

    game.leader =
        winnerIndex;

    game.trick = [];

    game.message =
        `${game.players[winnerIndex].name} bierze sztycha (+${trickPoints}).`;
}


/* =========================
   PUNKTY SZTYCHA
========================= */

function calculateTrickPoints(trick) {

    return trick.reduce(
        (sum, play) =>
            sum + (
                CARD_VALUES[
                    play.card.rank
                ] || 0
            ),
        0
    );
}


/* =========================
   66
========================= */

function check66(
    game,
    team
) {

    if (
        game.scores[team] < 66
    ) {
        return false;
    }


    /*
       Rozdanie zakończone.
    */

    game.handFinished = true;

    game.winner = team;


    /*
       Punkty z tego rozdania
       przechodzą do punktów ogólnych.
    */

    game.overallScores[team] +=
        game.scores[team];


    /*
       Drużyna dostaje jedną
       "całą punktację" za wygrane
       rozdanie.
    */

    game.gameWins[team]++;


    const winningTeamName =
        getTeamName(
            game,
            team
        );


    game.message =
        `${winningTeamName} wygrywa rozdanie — ${game.scores[team]} punktów.`;


    return true;
}


/* =========================
   NAZWA DRUŻYNY
========================= */

function getTeamName(
    game,
    team
) {

    const players =
        game.players.filter(
            (player, index) =>
                getPlayerTeam(
                    game,
                    index
                ) === team
        );


    const names =
        players
            .filter(
                player => !player.bot
            )
            .map(
                player => player.name
            );


    if (names.length > 0) {
        return names.join(" + ");
    }


    const allNames =
        players.map(
            player => player.name
        );


    if (allNames.length > 0) {
        return allNames.join(" + ");
    }


    return `Drużyna ${team + 1}`;
}


/* =========================
   STAN GRY
========================= */

function getGameState(game) {

    const playerNames =
        game.players.map(
            player => player.name
        );


    return {

        players:
            game.players.map(
                (player, index) => ({
                    name: player.name,
                    bot: !!player.bot,
                    team:
                        getPlayerTeam(
                            game,
                            index
                        )
                })
            ),

        playerNames,

        hands:
            game.hands,

        trump:
            game.trump,

        suitNames:
            SUIT_NAMES,

        currentPlayer:
            game.currentPlayer,

        leader:
            game.leader,

        phase:
            game.phase,

        trick:
            game.trick,

        /*
           Punkty gry.
        */

        scores:
            game.scores,

        /*
           Punkty ogólne.
        */

        overallScores:
            game.overallScores,

        /*
           Całe punkty.
        */

        gameWins:
            game.gameWins,

        tricksWon:
            game.tricksWon,

        handFinished:
            game.handFinished,

        winner:
            game.winner,

        lastTrickWinner:
            game.lastTrickWinner,

        message:
            game.message,

        teamNames: [
            getTeamName(game, 0),
            getTeamName(game, 1)
        ]
    };
}


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

    beatsCard,
    getWinningCard,

    getLegalCards,
    isLegalCard,

    playCard,
    finishTrick,

    calculateTrickPoints,
    check66,

    getGameState
};
