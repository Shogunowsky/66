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

    return playerIndex % 2;
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


    const humanNames =
        players
            .filter(
                player => !player.bot
            )
            .map(
                player => player.name
            );


    if (humanNames.length > 0) {
        return humanNames.join(" + ");
    }


    const names =
        players.map(
            player => player.name
        );


    if (names.length > 0) {
        return names.join(" + ");
    }


    return `Drużyna ${team + 1}`;
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
           Punkty aktualnego rozdania.
        */

        scores: [
            0,
            0
        ],

        /*
           Punkty z zakończonych rozdań.
        */

        overallScores: [
            0,
            0
        ],

        /*
           Liczba wygranych całych rozdań.
        */

        gameWins: [
            0,
            0
        ],

        /*
           Meldunki oczekujące na potwierdzenie
           przez wygranie sztycha.

           Przykład:

           pendingMelds[0] = 20

           oznacza, że drużyna 1 ma
           niezatwierdzony meldunek za 20.
        */

        pendingMelds: [
            0,
            0
        ],

        /*
           Informacja, kto zgłosił meldunek.
        */

        pendingMeldPlayers: [
            [],
            []
        ],

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
       Czyścimy oczekujące meldunki
       przy rozpoczęciu nowego rozdania.
    */

    game.pendingMelds = [
        0,
        0
    ];

    game.pendingMeldPlayers = [
        [],
        []
    ];


    /*
       Rozdajemy po 3 karty.
    */

    for (let i = 0; i < 3; i++) {

        for (
            let player = 0;
            player < 4;
            player++
        ) {

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

        for (
            let player = 0;
            player < 4;
            player++
        ) {

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

function chooseTrump(
    game,
    suit
) {

    if (game.phase !== "trump") {

        return {
            error:
                "Nie można teraz obierać koloru."
        };
    }


    if (!SUITS.includes(suit)) {

        return {
            error:
                "Nieprawidłowy kolor."
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


    if (
        candidate.suit !==
        current.suit
    ) {
        return false;
    }


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


        if (cardsThatBeat.length > 0) {
            return cardsThatBeat;
        }


        return cardsOfLeadSuit;
    }


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
            legalCard.suit ===
                card.suit &&
            legalCard.rank ===
                card.rank
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
            error:
                "Rozdanie już się zakończyło."
        };
    }


    if (game.phase !== "playing") {

        return {
            error:
                "Nie można teraz zagrać karty."
        };
    }


    if (
        playerIndex !==
        game.currentPlayer
    ) {

        return {
            error:
                "To nie jest Twoja kolej."
        };
    }


    if (
        !card ||
        !card.suit ||
        !card.rank
    ) {

        return {
            error:
                "Nieprawidłowa karta."
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
            error:
                "Nie możesz zagrać tej karty."
        };
    }


    const hand =
        game.hands[playerIndex];


    const cardIndex =
        hand.findIndex(
            handCard =>
                handCard.suit ===
                    card.suit &&
                handCard.rank ===
                    card.rank
        );


    if (cardIndex === -1) {

        return {
            error:
                "Nie masz tej karty."
        };
    }


    const playedCard =
        hand.splice(
            cardIndex,
            1
        )[0];


    const team =
        getPlayerTeam(
            game,
            playerIndex
        );


    game.trick.push({

        playerIndex,

        playerName:
            game.players[playerIndex].name,

        team,

        card:
            playedCard
    });


    /*
       MELDUNEK

       Meldunek jest tylko zgłoszony.

       NIE dodajemy jeszcze punktów
       do game.scores.

       Trafiają one do pendingMelds.

       Punkty zostaną zatwierdzone
       dopiero po wygraniu sztycha.
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
                    handCard.rank ===
                        "K"
            );


        if (hasKing) {

            const meldPoints =
                playedCard.suit ===
                    game.trump
                    ? 40
                    : 20;


            /*
               Jeżeli drużyna ma już
               oczekujący meldunek,
               dokładamy kolejny.

               Normalnie może to wystąpić
               przy kilku meldunkach.
            */

            game.pendingMelds[team] +=
                meldPoints;


            game.pendingMeldPlayers[team]
                .push({
                    playerIndex,
                    playerName:
                        game.players[
                            playerIndex
                        ].name,
                    suit:
                        playedCard.suit,
                    points:
                        meldPoints
                });


            game.message =
                `${game.players[playerIndex].name} melduje ${playedCard.suit} — oczekuje na wygrany sztych.`;
        }
    }


    /*
       Cztery karty = koniec sztycha.
    */

    if (game.trick.length === 4) {

        finishTrick(game);

        return {
            success: true
        };
    }


    game.currentPlayer =
        (playerIndex + 1) % 4;


    /*
       Jeżeli nie było meldunku,
       normalny komunikat.
    */

    if (
        !(
            game.trick.length === 1 &&
            playedCard.rank === "Q" &&
            game.pendingMeldPlayers[team].some(
                meld =>
                    meld.playerIndex ===
                    playerIndex
            )
        )
    ) {

        game.message =
            `Kolej ${game.players[game.currentPlayer].name}.`;
    }


    return {
        success: true
    };
}


/* =========================
   ZATWIERDZANIE MELDUNKÓW
========================= */

function confirmPendingMelds(
    game,
    team
) {

    const pending =
        game.pendingMelds[team];


    if (
        !pending ||
        pending <= 0
    ) {
        return 0;
    }


    /*
       Dopiero teraz meldunek
       trafia do punktów gry.
    */

    game.scores[team] +=
        pending;


    game.pendingMelds[team] = 0;


    game.pendingMeldPlayers[team] = [];


    return pending;
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
       Najpierw punkty kart.
    */

    const trickPoints =
        calculateTrickPoints(
            game.trick
        );


    game.scores[winnerTeam] +=
        trickPoints;


    /*
       Zliczamy sztych.
    */

    game.tricksWon[winnerTeam]++;


    game.lastTrickWinner =
        winnerIndex;


    /*
       TERAZ sprawdzamy meldunki.

       Jeżeli zwycięska drużyna ma
       oczekujący meldunek, dopiero
       teraz go zatwierdzamy.
    */

    const confirmedMeldPoints =
        confirmPendingMelds(
            game,
            winnerTeam
        );


    /*
       Najpierw sprawdzamy 66,
       bo zarówno punkty kart,
       jak i zatwierdzony meldunek
       są już w scores.
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
       Następny sztych zaczyna zwycięzca.
    */

    game.currentPlayer =
        winnerIndex;


    game.leader =
        winnerIndex;


    game.trick = [];


    if (
        confirmedMeldPoints > 0
    ) {

        game.message =
            `${game.players[winnerIndex].name} bierze sztycha (+${trickPoints}) i zatwierdza meldunek +${confirmedMeldPoints}.`;

    } else {

        game.message =
            `${game.players[winnerIndex].name} bierze sztycha (+${trickPoints}).`;
    }
}


/* =========================
   PUNKTY SZTYCHA
========================= */

function calculateTrickPoints(
    trick
) {

    return trick.reduce(
        (sum, play) =>
            sum +
            (
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


    game.handFinished = true;

    game.winner = team;


    /*
       Punkty z rozdania przechodzą
       do punktów ogólnych.
    */

    game.overallScores[team] +=
        game.scores[team];


    /*
       Jedno wygrane rozdanie.
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
                    name:
                        player.name,

                    bot:
                        !!player.bot,

                    team:
                        getPlayerTeam(
                            game,
                            index
                        )
                })
            ),


        playerNames,


        /*
           Ręka zostanie później
           ograniczona po stronie klienta.
        */

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


        /*
           Informacja pomocnicza
           o oczekujących meldunkach.
        */

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
