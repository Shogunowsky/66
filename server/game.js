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
        const j = Math.floor(Math.random() * (i + 1));

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

        /*
         * waiting
         * trump
         * lufa
         * special
         * playing
         * finished
         */
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

        /*
         * Aktualny etap rozdania:
         *
         * first3  = pierwsze 3 karty
         * last3   = drugie 3 karty
         */
        dealStage: "first3",

        /*
         * Gracz, który w tym rozdaniu obiera.
         */
        chooser: 0,

        /*
         * Obrót obierającego.
         */
        nextChooser: 0,

        /*
         * Normalna gra albo:
         * lepsza / gorsza
         */
        mode: "normal",

        /*
         * Gracz grający solo w trybie specjalnym.
         */
        soloPlayer: null,

        /*
         * Drużyna obierającego.
         */
        soloTeam: null,

        /*
         * Czy partner obierającego ma być pomijany.
         */
        skippedPlayer: null,

        /*
         * Wynik Lufy.
         *
         * multiplier:
         * 1 = brak Lufy
         * 2 = Lufa
         * 4 = Z powrotem
         * 8...
         */
        lufaMultiplier: 1,

        lufaActive: false,

        /*
         * Kto ostatnio powiedział Lufę.
         */
        lastLufaPlayer: null,

        /*
         * Czy trwa 5-sekundowe okno po obiorze.
         */
        lufaWindow: false,

        /*
         * Numer etapu Lufy:
         * afterFirst3
         * afterLast3
         */
        lufaStage: null,

        /*
         * Czas końca okna Lufy.
         */
        lufaUntil: null,

        /*
         * Wynik meldunków.
         */
        pendingMeldMessage: null,

        handFinished: false,

        winner: null,

        lastTrickWinner: null,

        lastTrickPoints: 0,

        lastTrickTeam: null,

        message: ""
    };
}


/* =========================
   DEALING
========================= */

function resetHandData(game) {
    game.trick = [];

    game.trump = null;

    game.handFinished = false;

    game.winner = null;

    game.lastTrickWinner = null;

    game.lastTrickPoints = 0;

    game.lastTrickTeam = null;

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

    game.mode = "normal";

    game.soloPlayer = null;

    game.soloTeam = null;

    game.skippedPlayer = null;

    game.lufaMultiplier = 1;

    game.lufaActive = false;

    game.lastLufaPlayer = null;

    game.lufaWindow = false;

    game.lufaStage = null;

    game.lufaUntil = null;

    game.pendingMeldMessage = null;
}

function dealInitialCards(game) {
    game.deck = shuffle(createDeck());

    game.hands = [
        [],
        [],
        [],
        []
    ];

    resetHandData(game);

    game.dealStage = "first3";

    game.phase = "trump";

    /*
     * Obierający rotuje po każdym zakończonym rozdaniu.
     */
    game.chooser =
        Number.isInteger(game.nextChooser)
            ? game.nextChooser
            : 0;

    game.currentPlayer =
        game.chooser;

    game.leader =
        game.chooser;

    /*
     * Każdy dostaje pierwsze 3 karty.
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

    game.message =
        `${getPlayerName(game, game.chooser)} obiera kolor albo wybiera Lepszą/Gorszą.`;
}


/*
 * Drugie 3 karty.
 *
 * W normalnej grze:
 * wszyscy dostają kolejne 3.
 *
 * W trybie specjalnym:
 * partner obierającego nie gra,
 * ale nadal dostaje karty.
 */
function dealRemainingCards(game) {
    if (
        game.phase !== "lufa" &&
        game.phase !== "trump" &&
        game.phase !== "special"
    ) {
        return {
            ok: false,
            error: "Nie można teraz rozdać kolejnych kart."
        };
    }

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

    game.dealStage = "last3";

    /*
     * Jeżeli to tryb specjalny,
     * partner obierającego zostaje pominięty.
     */
    if (game.mode === "lepsza" || game.mode === "gorsza") {

        game.phase = "playing";

        game.currentPlayer =
            game.soloPlayer;

        game.leader =
            game.soloPlayer;

        game.message =
            `${getPlayerName(game, game.soloPlayer)} gra sam.`;
    } else {

        game.phase = "playing";

        game.currentPlayer =
            game.leader;

        game.message =
            `Wychodzi ${getPlayerName(game, game.leader)}.`;
    }

    game.lufaWindow = false;
    game.lufaUntil = null;

    return {
        ok: true
    };
}


/* =========================
   TRUMP
========================= */

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

    /*
     * Po obiorze NIE rozdajemy od razu
     * pozostałych 3 kart.
     *
     * Najpierw jest okno na Lufę.
     */
    game.phase = "lufa";

    game.lufaStage = "afterFirst3";

    game.lufaWindow = true;

    game.lufaUntil =
        Date.now() + 5000;

    game.lufaMultiplier = 1;

    game.lufaActive = false;

    game.lastLufaPlayer = null;

    game.message =
        `${getPlayerName(game, playerIndex)} obrał ${SUIT_NAMES[trump]}. 5 sekund na Lufę.`;

    return {
        ok: true,
        lufaWindow: true,
        lufaUntil: game.lufaUntil
    };
}


/* =========================
   SPECIAL MODES
========================= */

function chooseSpecialMode(game, playerIndex, mode) {
    if (game.phase !== "trump") {
        return {
            ok: false,
            error: "Teraz nie można wybrać tego trybu."
        };
    }

    if (game.currentPlayer !== playerIndex) {
        return {
            ok: false,
            error: "Nie jest Twoja kolej na wybór."
        };
    }

    if (mode !== "lepsza" && mode !== "gorsza") {
        return {
            ok: false,
            error: "Nieprawidłowy tryb."
        };
    }

    game.mode = mode;

    game.trump = null;

    game.soloPlayer = playerIndex;

    game.soloTeam =
        game.players[playerIndex]?.team ?? null;

    /*
     * Partner obierającego.
     */
    if (
        game.soloTeam === 0 ||
        game.soloTeam === 1
    ) {
        game.skippedPlayer =
            game.players.findIndex(
                (player, index) =>
                    index !== playerIndex &&
                    player.team === game.soloTeam
            );
    } else {
        game.skippedPlayer = null;
    }

    game.phase = "lufa";

    game.lufaStage = "afterFirst3";

    game.lufaWindow = true;

    game.lufaUntil =
        Date.now() + 5000;

    game.lufaMultiplier = 1;

    game.lufaActive = false;

    game.lastLufaPlayer = null;

    const label =
        mode === "lepsza"
            ? "Lepsza"
            : "Gorsza";

    game.message =
        `${getPlayerName(game, playerIndex)} wybiera ${label}. 5 sekund na Lufę.`;

    return {
        ok: true,
        mode
    };
}


/* =========================
   LUFA
========================= */

function canCallLufa(game, playerIndex) {
    if (game.phase !== "lufa") {
        return false;
    }

    if (!game.lufaWindow) {
        return false;
    }

    /*
     * Obierający nie może sam sobie
     * rzucić Lufy.
     */
    if (playerIndex === game.chooser) {
        return false;
    }

    return true;
}

function callLufa(game, playerIndex) {
    if (!canCallLufa(game, playerIndex)) {
        return {
            ok: false,
            error: "Teraz nie możesz powiedzieć Lufa."
        };
    }

    /*
     * Kolejna Lufa podwaja stawkę.
     */
    game.lufaMultiplier *= 2;

    game.lufaActive = true;

    game.lastLufaPlayer = playerIndex;

    /*
     * Każda kolejna Lufa / kontra
     * przedłuża możliwość odpowiedzi.
     */
    game.lufaUntil =
        Date.now() + 5000;

    game.message =
        `${getPlayerName(game, playerIndex)}: LUFA ×${game.lufaMultiplier}.`;

    return {
        ok: true,
        multiplier: game.lufaMultiplier,
        lufaUntil: game.lufaUntil
    };
}

function callBackLufa(game, playerIndex) {
    if (!canCallLufa(game, playerIndex)) {
        return {
            ok: false,
            error: "Teraz nie możesz powiedzieć Z powrotem."
        };
    }

    /*
     * Z powrotem również podwaja stawkę.
     */
    game.lufaMultiplier *= 2;

    game.lufaActive = true;

    game.lastLufaPlayer = playerIndex;

    game.lufaUntil =
        Date.now() + 5000;

    game.message =
        `${getPlayerName(game, playerIndex)}: Z POWROTEM ×${game.lufaMultiplier}.`;

    return {
        ok: true,
        multiplier: game.lufaMultiplier,
        lufaUntil: game.lufaUntil
    };
}

function finishLufaWindow(game) {

    if (!game.lufaWindow) {
        return {
            ok: false,
            error: "Okno Lufy nie jest aktywne."
        };
    }

    /*
     * Okno zostało zakończone.
     */
    game.lufaWindow = false;

    game.lufaUntil = null;

    /*
     * Jeżeli Lufa była po pierwszych 3 kartach,
     * teraz dopiero rozdajemy kolejne 3.
     */
    if (game.lufaStage === "afterFirst3") {

        game.lufaStage = "afterLast3";

        dealRemainingCards(game);

        /*
         * Po rozdaniu kolejnych 3 kart
         * jest jeszcze możliwość Lufy.
         */
        game.phase = "lufa";

        game.lufaWindow = true;

        game.lufaUntil =
            Date.now() + 5000;

        game.message =
            `Rozdano kolejne 3 karty. 5 sekund na Lufę.`;

        return {
            ok: true,
            secondWindow: true
        };
    }

    /*
     * Druga faza Lufy zakończona.
     * Zaczynamy rozgrywkę.
     */
    if (game.lufaStage === "afterLast3") {

        game.lufaWindow = false;

        game.phase = "playing";

        if (
            game.mode === "lepsza" ||
            game.mode === "gorsza"
        ) {
            game.currentPlayer =
                game.soloPlayer;

            game.leader =
                game.soloPlayer;

            game.message =
                `${getPlayerName(game, game.soloPlayer)} wychodzi.`;
        } else {
            game.currentPlayer =
                game.leader;

            game.message =
                `${getPlayerName(game, game.leader)} wychodzi.`;
        }

        return {
            ok: true,
            secondWindow: false
        };
    }

    game.phase = "playing";

    return {
        ok: true
    };
}


/* =========================
   CARD COMPARISON
========================= */

function cardBeats(cardA, cardB, leadSuit, trump) {

    if (!cardA || !cardB) {
        return false;
    }

    /*
     * Ten sam kolor.
     */
    if (cardA.suit === cardB.suit) {
        return (
            RANK_POWER[cardA.rank] >
            RANK_POWER[cardB.rank]
        );
    }

    /*
     * Atut.
     */
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

    /*
     * Bez atutu / inne kolory.
     * Wygrywa kolor wyjścia.
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
   LEGAL PLAY
========================= */

function isPlayerActive(game, playerIndex) {

    if (
        game.mode !== "lepsza" &&
        game.mode !== "gorsza"
    ) {
        return true;
    }

    /*
     * Partner obierającego nie gra.
     */
    if (playerIndex === game.skippedPlayer) {
        return false;
    }

    return true;
}

function getActivePlayers(game) {

    const active = [];

    for (let i = 0; i < game.players.length; i++) {

        if (isPlayerActive(game, i)) {
            active.push(i);
        }
    }

    return active;
}

function getNextActivePlayer(game, playerIndex) {

    const active =
        getActivePlayers(game);

    if (!active.length) {
        return playerIndex;
    }

    const currentPosition =
        active.indexOf(playerIndex);

    if (currentPosition === -1) {
        return active[0];
    }

    return active[
        (currentPosition + 1) % active.length
    ];
}

function getExpectedTrickLength(game) {

    if (
        game.mode === "lepsza" ||
        game.mode === "gorsza"
    ) {
        return 3;
    }

    return 4;
}

function isLegalPlay(game, playerIndex, card) {

    if (game.phase !== "playing") {
        return false;
    }

    if (game.handFinished) {
        return false;
    }

    if (!isPlayerActive(game, playerIndex)) {
        return false;
    }

    if (game.currentPlayer !== playerIndex) {
        return false;
    }

    const hand =
        game.hands[playerIndex];

    const cardInHand =
        hand.find(
            c =>
                c.suit === card.suit &&
                c.rank === card.rank
        );

    if (!cardInHand) {
        return false;
    }

    /*
     * Pierwsza karta sztycha.
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
     * W trybie Lepsza/Gorsza nie ma atutu.
     */
    const trump =
        (
            game.mode === "lepsza" ||
            game.mode === "gorsza"
        )
            ? null
            : game.trump;

    /*
     * Masz kolor wyjścia —
     * MUSISZ nim grać.
     */
    if (hasLeadSuit) {

        if (card.suit !== leadSuit) {
            return false;
        }

        /*
         * Jeżeli można przebić,
         * trzeba przebić.
         */
        const winningPlay =
            getWinningPlay(
                game.trick,
                game
            );

        if (!winningPlay) {
            return true;
        }

        const canBeat =
            hand.some(otherCard => {

                if (otherCard.suit !== leadSuit) {
                    return false;
                }

                return cardBeats(
                    otherCard,
                    winningPlay.card,
                    leadSuit,
                    trump
                );
            });

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
     * W normalnej grze:
     * jeśli masz atut, MUSISZ nim zagrać.
     *
     * W Lepszej/Gorszej nie ma atutu,
     * więc możesz zagrać dowolną kartę.
     */
    if (trump) {

        const hasTrump =
            hand.some(
                c => c.suit === trump
            );

        if (hasTrump) {
            return card.suit === trump;
        }
    }

    return true;
}


/* =========================
   MELD
========================= */

function checkMeld(game, playerIndex, card) {

    /*
     * Meld tylko przy wyjściu Damą.
     */
    if (card.rank !== "Q") {
        return;
    }

    const hand =
        game.hands[playerIndex];

    const hasKing =
        hand.some(
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
     * W trybie Lepsza/Gorsza nie ma meldunku
     * w normalnym znaczeniu.
     */
    if (
        game.mode === "lepsza" ||
        game.mode === "gorsza"
    ) {
        return;
    }

    /*
     * Punkty oczekują.
     */
    game.pendingMelds[team] +=
        points;

    if (
        !game.pendingMeldPlayers[team]
            .includes(playerIndex)
    ) {
        game.pendingMeldPlayers[team].push(
            playerIndex
        );
    }

    game.pendingMeldMessage =
        `${getPlayerName(game, playerIndex)} melduje ${points} punktów.`;

    game.message =
        game.pendingMeldMessage;
}

function confirmPendingMeld(game, team) {

    if (game.pendingMelds[team] <= 0) {
        return;
    }

    const points =
        game.pendingMelds[team];

    game.scores[team] +=
        points;

    game.pendingMelds[team] = 0;

    game.pendingMeldPlayers[team] = [];

    game.message =
        `Meld zaliczony: +${points} punktów.`;
}


/* =========================
   SPECIAL MODES
========================= */

function getSpecialTargetPoints(game) {

    if (game.mode === "lepsza") {

        /*
         * 3 karty = 24
         * 6 kart = 12
         */
        return game.dealStage === "first3"
            ? 24
            : 12;
    }

    if (game.mode === "gorsza") {

        /*
         * 3 karty = 12
         * 6 kart = 6
         */
        return game.dealStage === "first3"
            ? 12
            : 6;
    }

    return 0;
}


/*
 * Pomocnicze rozstrzyganie Lepszej/Gorszej.
 *
 * Szczegółowa mechanika "złapania" jest
 * obsługiwana na podstawie kolejnych sztychów.
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

    /*
     * Punkty kart normalnie przypisujemy
     * zwycięzcy sztycha.
     */
    let trickPoints = 0;

    for (const play of game.trick) {
        trickPoints +=
            play.card.value;
    }

    /*
     * W trybie specjalnym wynik rozstrzyga
     * przede wszystkim to, kto wygrał sztych.
     */
    const soloWon =
        winnerIndex === solo;

    if (soloWon) {
        game.scores[game.soloTeam] +=
            trickPoints;
    } else {

        /*
         * Punkty trafiają do strony przeciwnej.
         */
        const opponentTeam =
            game.soloTeam === 0
                ? 1
                : 0;

        game.scores[opponentTeam] +=
            trickPoints;
    }

    game.lastTrickWinner =
        winnerIndex;

    game.lastTrickPoints =
        trickPoints;

    game.lastTrickTeam =
        soloWon
            ? game.soloTeam
            : (
                game.soloTeam === 0
                    ? 1
                    : 0
            );

    game.tricksWon[
        game.lastTrickTeam
    ]++;

    /*
     * W Lepszej/Gorszej gracz,
     * który bierze sztych, wychodzi następny.
     */
    game.leader =
        winnerIndex;

    game.currentPlayer =
        winnerIndex;

    game.trick = [];

    /*
     * Jeżeli ręka specjalna ma zostać
     * rozstrzygnięta przez złapanie,
     * serwer.js może użyć tego wyniku.
     */
    if (
        game.mode === "lepsza" ||
        game.mode === "gorsza"
    ) {

        const target =
            getSpecialTargetPoints(game);

        if (
            game.mode === "lepsza" &&
            !soloWon
        ) {
            finishSpecialGame(
                game,
                "opponents"
            );
            return;
        }

        if (
            game.mode === "gorsza" &&
            !soloWon
        ) {
            finishSpecialGame(
                game,
                "opponents"
            );
            return;
        }

        if (game.scores[game.soloTeam] >= target) {
            finishSpecialGame(
                game,
                "solo"
            );
            return;
        }
    }

    game.message =
        `${getPlayerName(game, winnerIndex)} bierze sztycha i wychodzi.`;
}

function finishSpecialGame(game, result) {

    game.handFinished = true;

    game.phase = "finished";

    if (result === "solo") {

        game.winner =
            game.soloTeam;

        const points =
            getSpecialTargetPoints(game);

        game.scores[game.soloTeam] =
            Math.max(
                game.scores[game.soloTeam],
                points
            );

        game.overallScores[game.soloTeam] +=
            game.scores[game.soloTeam];

        game.gameWins[game.soloTeam]++;

        game.message =
            `${getPlayerName(game, game.soloPlayer)} wygrywa ${game.mode === "lepsza" ? "Lepszą" : "Gorszą"}.`;

        return;
    }

    const opponentTeam =
        game.soloTeam === 0
            ? 1
            : 0;

    game.winner =
        opponentTeam;

    game.overallScores[opponentTeam] +=
        game.scores[opponentTeam];

    game.gameWins[opponentTeam]++;

    game.message =
        `Obierający został złapany. Wygrywa drużyna przeciwna.`;
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
        game.players[winnerIndex].team;

    let trickPoints = 0;

    for (const play of game.trick) {
        trickPoints +=
            play.card.value;
    }

    game.scores[winnerTeam] +=
        trickPoints;

    game.tricksWon[winnerTeam]++;

    /*
     * Meld zalicza się dopiero,
     * gdy drużyna wygra sztych.
     */
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

    check66(game);

    if (game.handFinished) {
        return;
    }

    game.message =
        `${getPlayerName(game, winnerIndex)} bierze sztycha. Drużyna zdobywa ${trickPoints} pkt.`;
}


/* =========================
   66
========================= */

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
                `${getTeamNameFromPlayers(
                    game.players,
                    team
                )} zdobywa ${game.scores[team]} punktów i wygrywa rozdanie!`;

            /*
             * Kolejny obierający:
             * jeden gracz w prawo.
             */
            game.nextChooser =
                (game.chooser + 1) % 4;

            return;
        }
    }
}


/* =========================
   PLAY CARD
========================= */

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

    if (!isPlayerActive(game, playerIndex)) {
        return {
            ok: false,
            error: "Ten gracz nie bierze udziału w tej rozgrywce."
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
     * Meld tylko przy wyjściu.
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
            getPlayerName(
                game,
                playerIndex
            ),
        card: playedCard
    });

    const expectedLength =
        getExpectedTrickLength(game);

    /*
     * Sztych jeszcze trwa.
     */
    if (game.trick.length < expectedLength) {

        game.currentPlayer =
            getNextActivePlayer(
                game,
                playerIndex
            );

        /*
         * Specjalny komunikat dla
         * trybu Lepsza/Gorsza.
         */
        if (
            game.mode === "lepsza" ||
            game.mode === "gorsza"
        ) {

            game.message =
                `${getPlayerName(
                    game,
                    game.currentPlayer
                )} gra.`;
        }

        return {
            ok: true
        };
    }

    /*
     * Koniec sztycha.
     */
    if (
        game.mode === "lepsza" ||
        game.mode === "gorsza"
    ) {

        finishSpecialTrick(game);

    } else {

        finishTrick(game);
    }

    return {
        ok: true
    };
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
                    playerIndex: index,
                    socketId: p.socketId || null
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

        lufaActive:
            game.lufaActive,

        lufaWindow:
            game.lufaWindow,

        lufaStage:
            game.lufaStage,

        lufaUntil:
            game.lufaUntil,

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

function getPlayerName(game, playerIndex) {

    if (
        !game.players ||
        !game.players[playerIndex]
    ) {
        return "Gracz";
    }

    return game.players[playerIndex].name ||
        `Gracz ${playerIndex + 1}`;
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
        .map(
            p => p.name
        )
        .join(" + ");
}


/* =========================
   NEXT HAND
========================= */

function startNextHand(game) {

    if (!game.handFinished) {
        return {
            ok: false,
            error: "To rozdanie jeszcze się nie skończyło."
        };
    }

    /*
     * Obierający przechodzi o jedno miejsce
     * zgodnie z ruchem wskazówek zegara.
     */
    game.chooser =
        Number.isInteger(game.nextChooser)
            ? game.nextChooser
            : (
                (game.chooser + 1) % 4
            );

    game.nextChooser =
        game.chooser;

    dealInitialCards(game);

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

    finishTrick,
    finishSpecialTrick,

    check66,

    startNextHand,

    getGameState
};
