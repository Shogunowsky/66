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

```
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
```

}

function shuffle(deck) {
for (let i = deck.length - 1; i > 0; i--) {
const j =
Math.floor(
Math.random() * (i + 1)
);

```
    [deck[i], deck[j]] =
        [deck[j], deck[i]];
}

return deck;
```

}

/* =========================
GAME
========================= */

function createGame(players) {
return {
players,

```
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

    dealStage: "first3",

    chooser: 0,

    nextChooser: 0,

    mode: "normal",

    soloPlayer: null,

    soloTeam: null,

    skippedPlayer: null,

    lufaMultiplier: 1,

    lufaActive: false,

    lastLufaPlayer: null,

    lufaWindow: false,

    lufaStage: null,

    lufaUntil: null,

    pendingMeldMessage: null,

    handFinished: false,

    winner: null,

    lastTrickWinner: null,

    lastTrickPoints: 0,

    lastTrickTeam: null,

    specialCaught: false,

    specialSoloTricks: 0,

    specialOpponentTricks: 0,

    message: ""
};
```

}

/* =========================
DEALING
========================= */

function resetHandData(game) {
game.trick = [];

```
game.trump = null;

game.handFinished = false;

game.winner = null;

game.lastTrickWinner = null;

game.lastTrickPoints = 0;

game.lastTrickTeam = null;

game.scores = [0, 0];

game.tricksWon = [0, 0];

game.pendingMelds = [0, 0];

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

game.specialCaught = false;

game.specialSoloTricks = 0;

game.specialOpponentTricks = 0;
```

}

function dealInitialCards(game) {
game.deck =
shuffle(
createDeck()
);

```
game.hands = [
    [],
    [],
    [],
    []
];

resetHandData(game);

game.dealStage = "first3";

game.phase = "trump";

game.chooser =
    Number.isInteger(
        game.nextChooser
    )
        ? game.nextChooser
        : 0;

game.currentPlayer =
    game.chooser;

game.leader =
    game.chooser;

for (
    let round = 0;
    round < 3;
    round++
) {
    for (
        let player = 0;
        player < 4;
        player++
    ) {
        if (
            game.deck.length === 0
        ) {
            break;
        }

        game.hands[player].push(
            game.deck.pop()
        );
    }
}

game.message =
    `${getPlayerName(
        game,
        game.chooser
    )} obiera kolor albo wybiera Lepszą/Gorszą.`;
```

}

function dealRemainingCards(game) {
if (
game.phase !== "lufa" &&
game.phase !== "trump" &&
game.phase !== "special"
) {
return {
ok: false,
error:
"Nie można teraz rozdać kolejnych kart."
};
}

```
for (
    let round = 0;
    round < 3;
    round++
) {
    for (
        let player = 0;
        player < 4;
        player++
    ) {
        if (
            game.deck.length === 0
        ) {
            break;
        }

        game.hands[player].push(
            game.deck.pop()
        );
    }
}

game.dealStage = "last3";

game.phase = "playing";

game.lufaWindow = false;

game.lufaUntil = null;

if (
    game.mode === "lepsza" ||
    game.mode === "gorsza"
) {
    game.currentPlayer =
        game.soloPlayer;

    game.leader =
        game.soloPlayer;

    game.message =
        `${getPlayerName(
            game,
            game.soloPlayer
        )} wychodzi.`;
} else {
    game.currentPlayer =
        game.leader;

    game.message =
        `Wychodzi ${
            getPlayerName(
                game,
                game.leader
            )
        }.`;
}

return {
    ok: true
};
```

}

/* =========================
TRUMP
========================= */

function chooseTrump(
game,
playerIndex,
trump
) {
if (game.phase !== "trump") {
return {
ok: false,
error:
"Teraz nie można obierać koloru."
};
}

```
if (
    game.currentPlayer !==
    playerIndex
) {
    return {
        ok: false,
        error:
            "Nie jest Twoja kolej na obieranie."
    };
}

if (!SUITS.includes(trump)) {
    return {
        ok: false,
        error:
            "Nieprawidłowy kolor."
    };
}

game.trump = trump;

game.phase = "lufa";

game.lufaStage =
    "afterFirst3";

game.lufaWindow = true;

game.lufaUntil =
    Date.now() + 5000;

game.lufaMultiplier = 1;

game.lufaActive = false;

game.lastLufaPlayer = null;

game.message =
    `${getPlayerName(
        game,
        playerIndex
    )} obrał ${
        SUIT_NAMES[trump]
    }. 5 sekund na Lufę.`;

return {
    ok: true,
    lufaWindow: true,
    lufaUntil:
        game.lufaUntil
};
```

}

/* =========================
SPECIAL MODES
========================= */

function chooseSpecialMode(
game,
playerIndex,
mode
) {
if (game.phase !== "trump") {
return {
ok: false,
error:
"Teraz nie można wybrać tego trybu."
};
}

```
if (
    game.currentPlayer !==
    playerIndex
) {
    return {
        ok: false,
        error:
            "Nie jest Twoja kolej na wybór."
    };
}

if (
    mode !== "lepsza" &&
    mode !== "gorsza"
) {
    return {
        ok: false,
        error:
            "Nieprawidłowy tryb."
    };
}

game.mode = mode;

game.trump = null;

game.soloPlayer =
    playerIndex;

game.soloTeam =
    game.players[playerIndex]?.team ??
    null;

if (
    game.soloTeam === 0 ||
    game.soloTeam === 1
) {
    game.skippedPlayer =
        game.players.findIndex(
            (player, index) =>
                index !== playerIndex &&
                player.team ===
                    game.soloTeam
        );
} else {
    game.skippedPlayer = null;
}

game.specialCaught = false;

game.specialSoloTricks = 0;

game.specialOpponentTricks = 0;

game.phase = "lufa";

game.lufaStage =
    "afterFirst3";

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
    `${getPlayerName(
        game,
        playerIndex
    )} wybiera ${label}. 5 sekund na Lufę.`;

return {
    ok: true,
    mode
};
```

}

/* =========================
LUFA
========================= */

function canCallLufa(
game,
playerIndex
) {
if (game.phase !== "lufa") {
return false;
}

```
if (!game.lufaWindow) {
    return false;
}

if (
    playerIndex ===
    game.chooser
) {
    return false;
}

return true;
```

}

function callLufa(
game,
playerIndex
) {
if (
!canCallLufa(
game,
playerIndex
)
) {
return {
ok: false,
error:
"Teraz nie możesz powiedzieć Lufa."
};
}

```
game.lufaMultiplier *= 2;

game.lufaActive = true;

game.lastLufaPlayer =
    playerIndex;

game.lufaUntil =
    Date.now() + 5000;

game.message =
    `${getPlayerName(
        game,
        playerIndex
    )}: LUFA ×${
        game.lufaMultiplier
    }.`;

return {
    ok: true,
    multiplier:
        game.lufaMultiplier,
    lufaUntil:
        game.lufaUntil
};
```

}

function callBackLufa(
game,
playerIndex
) {
if (
!canCallLufa(
game,
playerIndex
)
) {
return {
ok: false,
error:
"Teraz nie możesz powiedzieć Z powrotem."
};
}

```
game.lufaMultiplier *= 2;

game.lufaActive = true;

game.lastLufaPlayer =
    playerIndex;

game.lufaUntil =
    Date.now() + 5000;

game.message =
    `${getPlayerName(
        game,
        playerIndex
    )}: Z POWROTEM ×${
        game.lufaMultiplier
    }.`;

return {
    ok: true,
    multiplier:
        game.lufaMultiplier,
    lufaUntil:
        game.lufaUntil
};
```

}

function finishLufaWindow(game) {
if (!game.lufaWindow) {
return {
ok: false,
error:
"Okno Lufy nie jest aktywne."
};
}

```
game.lufaWindow = false;

game.lufaUntil = null;

if (
    game.lufaStage ===
    "afterFirst3"
) {
    game.lufaStage =
        "afterLast3";

    const result =
        dealRemainingCards(
            game
        );

    if (!result.ok) {
        return result;
    }

    game.phase = "lufa";

    game.lufaWindow = true;

    game.lufaUntil =
        Date.now() + 5000;

    game.message =
        "Rozdano kolejne 3 karty. 5 sekund na Lufę.";

    return {
        ok: true,
        secondWindow: true
    };
}

if (
    game.lufaStage ===
    "afterLast3"
) {
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
            `${getPlayerName(
                game,
                game.soloPlayer
            )} wychodzi.`;
    } else {
        game.currentPlayer =
            game.leader;

        game.message =
            `Wychodzi ${
                getPlayerName(
                    game,
                    game.leader
                )
            }.`;
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
if (
    cardA.suit ===
    cardB.suit
) {
    return (
        RANK_POWER[cardA.rank] >
        RANK_POWER[cardB.rank]
    );
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

if (
    cardA.suit ===
    leadSuit
) {
    return true;
}

return false;
```

}

function getWinningPlay(
trick,
game
) {
if (!trick.length) {
return null;
}

```
const leadSuit =
    trick[0].card.suit;

let winner =
    trick[0];

for (
    let i = 1;
    i < trick.length;
    i++
) {
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
```

}

/* =========================
ACTIVE PLAYERS
========================= */

function isPlayerActive(
game,
playerIndex
) {
if (
game.mode !== "lepsza" &&
game.mode !== "gorsza"
) {
return true;
}

```
return (
    playerIndex !==
    game.skippedPlayer
);
```

}

function getActivePlayers(game) {
const active = [];

```
for (
    let i = 0;
    i < game.players.length;
    i++
) {
    if (
        isPlayerActive(
            game,
            i
        )
    ) {
        active.push(i);
    }
}

return active;
```

}

function getNextActivePlayer(
game,
playerIndex
) {
const active =
getActivePlayers(
game
);

```
if (!active.length) {
    return playerIndex;
}

const currentPosition =
    active.indexOf(
        playerIndex
    );

if (
    currentPosition === -1
) {
    return active[0];
}

return active[
    (
        currentPosition + 1
    ) % active.length
];
```

}

function getExpectedTrickLength(
game
) {
if (
game.mode === "lepsza" ||
game.mode === "gorsza"
) {
return 3;
}

```
return 4;
```

}

/* =========================
LEGAL PLAY
========================= */

function isLegalPlay(
game,
playerIndex,
card
) {
if (
game.phase !==
"playing"
) {
return false;
}

```
if (game.handFinished) {
    return false;
}

if (
    !isPlayerActive(
        game,
        playerIndex
    )
) {
    return false;
}

if (
    game.currentPlayer !==
    playerIndex
) {
    return false;
}

if (!card) {
    return false;
}

const hand =
    game.hands[playerIndex];

const cardInHand =
    hand.find(
        c =>
            c.suit ===
                card.suit &&
            c.rank ===
                card.rank
    );

if (!cardInHand) {
    return false;
}

if (
    game.trick.length === 0
) {
    return true;
}

const leadSuit =
    game.trick[0].card.suit;

const hasLeadSuit =
    hand.some(
        c =>
            c.suit ===
            leadSuit
    );

const trump =
    (
        game.mode === "lepsza" ||
        game.mode === "gorsza"
    )
        ? null
        : game.trump;

/*
 * Masz kolor wyjścia.
 */
if (hasLeadSuit) {
    if (
        card.suit !==
        leadSuit
    ) {
        return false;
    }

    const winningPlay =
        getWinningPlay(
            game.trick,
            game
        );

    if (!winningPlay) {
        return true;
    }

    const canBeat =
        hand.some(
            otherCard => {
                if (
                    otherCard.suit !==
                    leadSuit
                ) {
                    return false;
                }

                return cardBeats(
                    otherCard,
                    winningPlay.card,
                    leadSuit,
                    trump
                );
            }
        );

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
 * W normalnej grze atut jest obowiązkowy,
 * jeżeli gracz go posiada.
 */
if (trump) {
    const hasTrump =
        hand.some(
            c =>
                c.suit ===
                trump
        );

    if (hasTrump) {
        return (
            card.suit ===
            trump
        );
    }
}

return true;
```

}

/* =========================
MELD
========================= */

function checkMeld(
game,
playerIndex,
card
) {
if (card.rank !== "Q") {
return;
}

```
const hand =
    game.hands[playerIndex];

const hasKing =
    hand.some(
        c =>
            c.suit ===
                card.suit &&
            c.rank === "K"
    );

if (!hasKing) {
    return;
}

if (
    game.mode === "lepsza" ||
    game.mode === "gorsza"
) {
    return;
}

const team =
    game.players[
        playerIndex
    ].team;

if (
    team !== 0 &&
    team !== 1
) {
    return;
}

const points =
    card.suit ===
    game.trump
        ? 40
        : 20;

game.pendingMelds[team] +=
    points;

if (
    !game.pendingMeldPlayers[
        team
    ].includes(
        playerIndex
    )
) {
    game.pendingMeldPlayers[
        team
    ].push(
        playerIndex
    );
}

game.pendingMeldMessage =
    `${getPlayerName(
        game,
        playerIndex
    )} melduje ${points} punktów.`;

game.message =
    game.pendingMeldMessage;
```

}

function confirmPendingMeld(
game,
team
) {
if (
game.pendingMelds[team] <= 0
) {
return;
}

```
const points =
    game.pendingMelds[team];

game.scores[team] +=
    points;

game.pendingMelds[team] = 0;

game.pendingMeldPlayers[
    team
] = [];

game.message =
    `Meld zaliczony: +${points} punktów.`;
```

}

/* =========================
SPECIAL MODES
========================= */

function getSpecialTargetPoints(
game
) {
if (
game.mode === "lepsza"
) {
return (
game.dealStage ===
"first3"
? 24
: 12
);
}

```
if (
    game.mode === "gorsza"
) {
    return (
        game.dealStage ===
        "first3"
            ? 12
            : 6
    );
}

return 0;
```

}

/*

* W trybach specjalnych obierający
* gra sam przeciwko dwóm przeciwnikom.
*
* Nie ma atutu.
*
* "Gorsza":
* obierający nie może wziąć sztycha.
* Jeżeli sam wygra choć jeden sztych,
* zostaje złapany.
*
* "Lepsza":
* obierający musi utrzymać kontrolę
* nad rozgrywką według zasad trybu.
* Wynik jest rozstrzygany po zakończeniu
* wszystkich kart.
  */

function finishSpecialTrick(game) {
if (!game.trick.length) {
return;
}

```
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

let trickPoints = 0;

for (
    const play of game.trick
) {
    trickPoints +=
        play.card.value;
}

const soloWon =
    winnerIndex === solo;

const opponentTeam =
    game.soloTeam === 0
        ? 1
        : 0;

if (soloWon) {
    if (
        game.soloTeam === 0 ||
        game.soloTeam === 1
    ) {
        game.scores[
            game.soloTeam
        ] += trickPoints;
    }

    game.specialSoloTricks++;

    /*
     * W Gorszej samodzielne wzięcie
     * sztycha oznacza złapanie.
     */
    if (
        game.mode === "gorsza"
    ) {
        game.specialCaught =
            true;
    }
} else {
    game.scores[
        opponentTeam
    ] += trickPoints;

    game.specialOpponentTricks++;
}

game.lastTrickWinner =
    winnerIndex;

game.lastTrickPoints =
    trickPoints;

game.lastTrickTeam =
    soloWon
        ? game.soloTeam
        : opponentTeam;

game.tricksWon[
    game.lastTrickTeam
]++;

game.leader =
    winnerIndex;

game.currentPlayer =
    winnerIndex;

game.trick = [];

const activePlayers =
    getActivePlayers(
        game
    );

const cardsRemaining =
    activePlayers.some(
        index =>
            game.hands[index] &&
            game.hands[index]
                .length > 0
    );

/*
 * Gorsza:
 * jeżeli obierający został złapany,
 * rozdanie kończy się od razu.
 */
if (
    game.mode === "gorsza" &&
    game.specialCaught
) {
    finishSpecialGame(
        game,
        "opponents"
    );

    return;
}

if (!cardsRemaining) {
    finishSpecialGame(
        game,
        determineSpecialResult(
            game
        )
    );

    return;
}

game.message =
    `${getPlayerName(
        game,
        winnerIndex
    )} bierze sztycha i wychodzi.`;
```

}

function determineSpecialResult(
game
) {
/*
* Gorsza:
* jeżeli obierający nie został
* złapany do końca, wygrywa obierający.
*/
if (
game.mode === "gorsza"
) {
return game.specialCaught
? "opponents"
: "solo";
}

```
/*
 * Lepsza:
 * obierający musi wygrać przynajmniej
 * jeden sztych. Jeżeli nie przejął
 * żadnego, wygrywają przeciwnicy.
 */
if (
    game.mode === "lepsza"
) {
    return (
        game.specialSoloTricks > 0
            ? "solo"
            : "opponents"
    );
}

return "opponents";
```

}

function finishSpecialGame(
game,
result
) {
if (game.handFinished) {
return;
}

```
game.handFinished = true;

game.phase = "finished";

const opponentTeam =
    game.soloTeam === 0
        ? 1
        : 0;

const target =
    getSpecialTargetPoints(
        game
    );

if (
    result === "solo"
) {
    game.winner =
        game.soloTeam;

    game.scores[
        game.soloTeam
    ] =
        Math.max(
            game.scores[
                game.soloTeam
            ],
            target
        );

    game.overallScores[
        game.soloTeam
    ] += target;

    game.gameWins[
        game.soloTeam
    ]++;

    game.message =
        `${getPlayerName(
            game,
            game.soloPlayer
        )} wygrywa ${
            game.mode === "lepsza"
                ? "Lepszą"
                : "Gorszą"
        } za ${target} punktów.`;

    game.nextChooser =
        (
            game.chooser + 1
        ) % 4;

    return;
}

game.winner =
    opponentTeam;

game.scores[
    opponentTeam
] =
    Math.max(
        game.scores[
            opponentTeam
        ],
        target
    );

game.overallScores[
    opponentTeam
] += target;

game.gameWins[
    opponentTeam
]++;

game.message =
    `Obierający został złapany. Wygrywa drużyna przeciwna za ${target} punktów.`;

game.nextChooser =
    (
        game.chooser + 1
    ) % 4;
```

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

```
if (!winningPlay) {
    return;
}

const winnerIndex =
    winningPlay.playerIndex;

const winnerTeam =
    game.players[
        winnerIndex
    ].team;

let trickPoints = 0;

for (
    const play of game.trick
) {
    trickPoints +=
        play.card.value;
}

game.scores[
    winnerTeam
] += trickPoints;

game.tricksWon[
    winnerTeam
]++;

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
    `${getPlayerName(
        game,
        winnerIndex
    )} bierze sztycha. Drużyna zdobywa ${trickPoints} pkt.`;
```

}

/* =========================
66
========================= */

function check66(game) {
for (
let team = 0;
team < 2;
team++
) {
if (
game.scores[team] >= 66
) {
game.handFinished =
true;

```
        game.winner =
            team;

        game.phase =
            "finished";

        game.overallScores[
            team
        ] += game.scores[team];

        game.gameWins[
            team
        ]++;

        game.message =
            `${getTeamNameFromPlayers(
                game.players,
                team
            )} zdobywa ${
                game.scores[team]
            } punktów i wygrywa rozdanie!`;

        game.nextChooser =
            (
                game.chooser + 1
            ) % 4;

        return;
    }
}
```

}

/* =========================
PLAY CARD
========================= */

function playCard(
game,
playerIndex,
card
) {
if (
game.phase !==
"playing"
) {
return {
ok: false,
error:
"Gra nie jest w fazie rozgrywania."
};
}

```
if (game.handFinished) {
    return {
        ok: false,
        error:
            "Rozdanie już się zakończyło."
    };
}

if (
    game.currentPlayer !==
    playerIndex
) {
    return {
        ok: false,
        error:
            "Nie jest Twoja kolej."
    };
}

if (
    !isPlayerActive(
        game,
        playerIndex
    )
) {
    return {
        ok: false,
        error:
            "Ten gracz nie bierze udziału w tej rozgrywce."
    };
}

if (
    !isLegalPlay(
        game,
        playerIndex,
        card
    )
) {
    return {
        ok: false,
        error:
            "Nie możesz zagrać tej karty."
    };
}

const hand =
    game.hands[playerIndex];

const cardIndex =
    hand.findIndex(
        c =>
            c.suit ===
                card.suit &&
            c.rank ===
                card.rank
    );

if (cardIndex === -1) {
    return {
        ok: false,
        error:
            "Nie masz tej karty."
    };
}

const playedCard =
    hand.splice(
        cardIndex,
        1
    )[0];

if (
    game.trick.length === 0
) {
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
    getExpectedTrickLength(
        game
    );

if (
    game.trick.length <
    expectedLength
) {
    game.currentPlayer =
        getNextActivePlayer(
            game,
            playerIndex
        );

    game.message =
        `${getPlayerName(
            game,
            game.currentPlayer
        )} gra.`;

    return {
        ok: true
    };
}

if (
    game.mode === "lepsza" ||
    game.mode === "gorsza"
) {
    finishSpecialTrick(
        game
    );
} else {
    finishTrick(
        game
    );
}

return {
    ok: true
};
```

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
playerIndex: index
})
),

```
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

    specialCaught:
        game.specialCaught,

    specialSoloTricks:
        game.specialSoloTricks,

    specialOpponentTricks:
        game.specialOpponentTricks,

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
```

}

/* =========================
HELPERS
========================= */

function getPlayerName(
game,
playerIndex
) {
if (
!game.players ||
!game.players[playerIndex]
) {
return "Gracz";
}

```
return (
    game.players[
        playerIndex
    ].name ||
    `Gracz ${
        playerIndex + 1
    }`
);
```

}

function getTeamNameFromPlayers(
players,
team
) {
const teamPlayers =
players.filter(
p =>
p.team === team
);

```
if (!teamPlayers.length) {
    return `Drużyna ${
        team + 1
    }`;
}

return teamPlayers
    .map(
        p => p.name
    )
    .join(" + ");
```

}

/* =========================
NEXT HAND
========================= */

function startNextHand(game) {
if (!game.handFinished) {
return {
ok: false,
error:
"To rozdanie jeszcze się nie skończyło."
};
}

```
game.chooser =
    Number.isInteger(
        game.nextChooser
    )
        ? game.nextChooser
        : (
            (
                game.chooser + 1
            ) % 4
        );

game.nextChooser =
    game.chooser;

dealInitialCards(
    game
);

return {
    ok: true
};
```

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

```
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
```

};
