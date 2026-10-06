const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const {
    createGame,
    dealInitialCards,
    chooseTrump,
    chooseSpecialMode,
    callLufa,
    callBackLufa,
    finishLufaWindow,
    playCard,
    startNextHand,
    getGameState
} = require("./game");

const {
    fillBots,
    chooseBotTrump,
    chooseBotCard,
    removeCardFromBot
} = require("./bot");


const app = express();

const server = http.createServer(app);

const io = new Server(server);


const PORT =
    process.env.PORT || 3000;


/* =========================
   STATIC
========================= */

app.use(
    express.static(
        path.join(__dirname, "..", "client")
    )
);


/* =========================
   ROOMS
========================= */

const rooms = new Map();


function getRoom(roomName) {
    return rooms.get(roomName);
}


function createRoom(roomName) {

    const room = {
        name: roomName,

        players: [],

        game: null,

        started: false,

        botTimer: null,

        lufaTimer: null
    };

    rooms.set(
        roomName,
        room
    );

    return room;
}


/* =========================
   ROOM STATE
========================= */

function getLobbyState(room) {

    return {
        roomName: room.name,

        players:
            room.players.map(
                player => ({
                    socketId: player.socketId,
                    name: player.name,
                    team: player.team,
                    isBot: !!player.isBot
                })
            ),

        statusMessage:
            room.started
                ? "Gra trwa."
                : "Wybierz drużynę."
    };
}


function sendLobby(room) {

    io.to(room.name).emit(
        "lobbyState",
        getLobbyState(room)
    );
}


function sendGameState(room) {

    if (!room.game) {
        return;
    }

    room.players.forEach(
        player => {

            if (
                player.isBot ||
                !player.socketId
            ) {
                return;
            }

            const state =
                getGameState(
                    room.game
                );

            const playerIndex =
                room.game.players.findIndex(
                    p =>
                        p.socketId ===
                        player.socketId
                );

            state.myPlayerIndex =
                playerIndex;

            state.hand =
                room.game.hands[
                    playerIndex
                ] || [];

            io.to(
                player.socketId
            ).emit(
                "gameState",
                state
            );
        }
    );
}


/* =========================
   MESSAGE
========================= */

function sendError(socket, message) {

    socket.emit(
        "errorMessage",
        message
    );
}


/* =========================
   TEAM
========================= */

function chooseTeam(
    room,
    socketId,
    team
) {

    if (
        team !== 0 &&
        team !== 1
    ) {
        return {
            ok: false,
            error: "Nieprawidłowa drużyna."
        };
    }

    const player =
        room.players.find(
            p =>
                p.socketId ===
                socketId
        );

    if (!player) {
        return {
            ok: false,
            error: "Nie znaleziono gracza."
        };
    }

    const teamCount =
        room.players.filter(
            p =>
                p.team === team &&
                p.socketId !== socketId
        ).length;

    if (teamCount >= 2) {
        return {
            ok: false,
            error: "Ta drużyna jest już pełna."
        };
    }

    player.team = team;

    return {
        ok: true
    };
}


/* =========================
   BOT TEAMS
========================= */

function assignBotTeams(room) {

    const teamCounts = [
        room.players.filter(
            p => p.team === 0
        ).length,

        room.players.filter(
            p => p.team === 1
        ).length
    ];


    const bots =
        room.players.filter(
            p => p.isBot
        );


    for (const bot of bots) {

        if (
            teamCounts[0] <=
            teamCounts[1]
        ) {
            bot.team = 0;
            teamCounts[0]++;
        } else {
            bot.team = 1;
            teamCounts[1]++;
        }
    }


    /*
     * Jeżeli po wyborach ludzi
     * nadal jest nierówno,
     * poprawiamy boty.
     */
    let safety = 10;

    while (
        teamCounts[0] !== 2 ||
        teamCounts[1] !== 2
    ) {

        if (--safety <= 0) {
            break;
        }

        const from =
            teamCounts[0] > 2
                ? 0
                : teamCounts[1] > 2
                    ? 1
                    : null;

        const to =
            from === 0
                ? 1
                : from === 1
                    ? 0
                    : null;

        if (
            from === null ||
            to === null
        ) {
            break;
        }

        const bot =
            bots.find(
                p =>
                    p.team === from
            );

        if (!bot) {
            break;
        }

        bot.team = to;

        teamCounts[from]--;
        teamCounts[to]++;
    }
}


/* =========================
   START GAME
========================= */

function startGame(room) {

    if (room.started) {
        return {
            ok: false,
            error: "Gra już się rozpoczęła."
        };
    }


    if (room.players.length !== 4) {

        return {
            ok: false,
            error: "Do rozpoczęcia potrzebnych jest 4 graczy."
        };
    }


    const team0 =
        room.players.filter(
            p => p.team === 0
        );

    const team1 =
        room.players.filter(
            p => p.team === 1
        );


    if (
        team0.length !== 2 ||
        team1.length !== 2
    ) {

        return {
            ok: false,
            error:
                "Każda drużyna musi mieć po 2 graczy."
        };
    }


    /*
     * Ustawiamy miejsca przy stole:
     *
     * drużyna 0
     * drużyna 1
     * drużyna 0
     * drużyna 1
     */
    room.players = [
        team0[0],
        team1[0],
        team0[1],
        team1[1]
    ];


    room.started = true;


    room.game =
        createGame(
            room.players
        );


    dealInitialCards(
        room.game
    );


    sendGameState(
        room
    );


    scheduleBotTurn(
        room
    );


    return {
        ok: true
    };
}


/* =========================
   BOT TURN
========================= */

function scheduleBotTurn(room) {

    clearTimeout(
        room.botTimer
    );


    if (
        !room.game ||
        room.game.handFinished
    ) {
        return;
    }


    const game =
        room.game;


    const player =
        game.players[
            game.currentPlayer
        ];


    if (!player) {
        return;
    }


    if (!player.isBot) {
        return;
    }


    /*
     * Nie ruszamy bota podczas
     * okna Lufy.
     */
    if (
        game.phase === "lufa"
    ) {

        scheduleLufaWindow(
            room
        );

        return;
    }


    room.botTimer =
        setTimeout(
            () => {

                processBotTurn(
                    room
                );

            },
            700
        );
}


/* =========================
   BOT ACTION
========================= */

function processBotTurn(room) {

    const game =
        room.game;


    if (
        !game ||
        game.handFinished
    ) {
        return;
    }


    const playerIndex =
        game.currentPlayer;


    const player =
        game.players[
            playerIndex
        ];


    if (
        !player ||
        !player.isBot
    ) {
        return;
    }


    /*
     * BOT OBIERA
     */
    if (
        game.phase === "trump"
    ) {

        const trump =
            chooseBotTrump(
                game,
                playerIndex
            );


        const result =
            chooseTrump(
                game,
                playerIndex,
                trump
            );


        if (!result.ok) {
            return;
        }


        sendGameState(
            room
        );


        scheduleLufaWindow(
            room
        );


        return;
    }


    /*
     * BOT GRA
     */
    if (
        game.phase === "playing"
    ) {

        const card =
            chooseBotCard(
                game,
                playerIndex
            );


        if (!card) {
            return;
        }


        const result =
            playCard(
                game,
                playerIndex,
                card
            );


        if (!result.ok) {
            return;
        }


        sendGameState(
            room
        );


        /*
         * Po skończeniu rozdania
         * czekamy chwilę i zaczynamy nowe.
         */
        if (
            game.handFinished
        ) {

            scheduleNextHand(
                room
            );

            return;
        }


        scheduleBotTurn(
            room
        );
    }
}


/* =========================
   LUFA TIMER
========================= */

function scheduleLufaWindow(room) {

    clearTimeout(
        room.lufaTimer
    );


    const game =
        room.game;


    if (
        !game ||
        game.phase !== "lufa"
    ) {
        return;
    }


    /*
     * Bot może zdecydować,
     * czy rzucić Lufę.
     *
     * Na razie zachowujemy bota
     * konserwatywnie: nie rzuca Lufy
     * automatycznie.
     */


    const remaining =
        Math.max(
            0,
            (game.lufaUntil || 0) -
            Date.now()
        );


    room.lufaTimer =
        setTimeout(
            () => {

                finishLufa(
                    room
                );

            },
            remaining
        );
}


/* =========================
   FINISH LUFA
========================= */

function finishLufa(room) {

    const game =
        room.game;


    if (
        !game ||
        game.phase !== "lufa"
    ) {
        return;
    }


    const result =
        finishLufaWindow(
            game
        );


    if (!result.ok) {
        return;
    }


    sendGameState(
        room
    );


    /*
     * Jeżeli rozpoczęła się
     * druga faza Lufy,
     * znowu czekamy 5 sekund.
     */
    if (
        result.secondWindow
    ) {

        scheduleLufaWindow(
            room
        );

        return;
    }


    /*
     * Rozpoczęła się normalna gra.
     */
    scheduleBotTurn(
        room
    );
}


/* =========================
   NEXT HAND
========================= */

function scheduleNextHand(room) {

    clearTimeout(
        room.botTimer
    );


    room.botTimer =
        setTimeout(
            () => {

                if (
                    !room.game ||
                    !room.game.handFinished
                ) {
                    return;
                }


                startNextHand(
                    room.game
                );


                sendGameState(
                    room
                );


                scheduleBotTurn(
                    room
                );

            },
            2500
        );
}


/* =========================
   SOCKET CONNECTION
========================= */

io.on(
    "connection",
    socket => {

        /*
         * JOIN
         */
        socket.on(
            "joinRoom",
            data => {

                const nickname =
                    String(
                        data?.nickname || ""
                    ).trim();

                const roomName =
                    String(
                        data?.room || ""
                    ).trim();


                if (!nickname) {
                    sendError(
                        socket,
                        "Podaj nick."
                    );
                    return;
                }


                if (!roomName) {
                    sendError(
                        socket,
                        "Podaj nazwę pokoju."
                    );
                    return;
                }


                if (nickname.length > 20) {
                    sendError(
                        socket,
                        "Nick jest za długi."
                    );
                    return;
                }


                if (roomName.length > 20) {
                    sendError(
                        socket,
                        "Nazwa pokoju jest za długa."
                    );
                    return;
                }


                let room =
                    getRoom(
                        roomName
                    );


                if (!room) {
                    room =
                        createRoom(
                            roomName
                        );
                }


                if (
                    room.started
                ) {
                    sendError(
                        socket,
                        "Ta gra już się rozpoczęła."
                    );
                    return;
                }


                if (
                    room.players.length >= 4
                ) {
                    sendError(
                        socket,
                        "Pokój jest pełny."
                    );
                    return;
                }


                const duplicate =
                    room.players.some(
                        p =>
                            p.name
                                .toLowerCase() ===
                            nickname.toLowerCase()
                    );


                if (duplicate) {
                    sendError(
                        socket,
                        "Ten nick jest już zajęty."
                    );
                    return;
                }


                const player = {
                    socketId:
                        socket.id,

                    name:
                        nickname,

                    team:
                        null,

                    isBot:
                        false
                };


                room.players.push(
                    player
                );


                socket.join(
                    room.name
                );


                socket.data.roomName =
                    room.name;


                socket.data.playerId =
                    socket.id;


                sendLobby(
                    room
                );
            }
        );


        /*
         * TEAM
         */
        socket.on(
            "chooseTeam",
            data => {

                const room =
                    getRoom(
                        socket.data.roomName
                    );


                if (!room) {
                    return;
                }


                const team =
                    Number(
                        data?.team
                    );


                const result =
                    chooseTeam(
                        room,
                        socket.id,
                        team
                    );


                if (!result.ok) {

                    sendError(
                        socket,
                        result.error
                    );

                    return;
                }


                sendLobby(
                    room
                );
            }
        );


        /*
         * START WITH BOTS
         */
        socket.on(
            "startGameWithBots",
            () => {

                const room =
                    getRoom(
                        socket.data.roomName
                    );


                if (!room) {
                    return;
                }


                if (room.started) {
                    return;
                }


                /*
                 * Uzupełniamy brakujące miejsca botami.
                 */
                fillBots(
                    room.players
                );


                assignBotTeams(
                    room
                );


                const result =
                    startGame(
                        room
                    );


                if (!result.ok) {

                    /*
                     * Jeżeli przez brak poprawnego
                     * składu nie można rozpocząć,
                     * usuwamy boty.
                     */
                    room.players =
                        room.players.filter(
                            p =>
                                !p.isBot
                        );


                    sendError(
                        socket,
                        result.error
                    );


                    sendLobby(
                        room
                    );

                    return;
                }


                sendGameState(
                    room
                );
            }
        );


        /*
         * WYBÓR ATUTU
         */
        socket.on(
            "chooseTrump",
            data => {

                const room =
                    getRoom(
                        socket.data.roomName
                    );


                if (
                    !room ||
                    !room.game
                ) {
                    return;
                }


                const playerIndex =
                    room.game.players.findIndex(
                        p =>
                            p.socketId ===
                            socket.id
                    );


                if (
                    playerIndex === -1
                ) {
                    return;
                }


                const result =
                    chooseTrump(
                        room.game,
                        playerIndex,
                        data?.trump
                    );


                if (!result.ok) {

                    sendError(
                        socket,
                        result.error
                    );

                    return;
                }


                sendGameState(
                    room
                );


                scheduleLufaWindow(
                    room
                );
            }
        );


        /*
         * LEPSZA / GORSZA
         */
        socket.on(
            "chooseSpecialMode",
            data => {

                const room =
                    getRoom(
                        socket.data.roomName
                    );


                if (
                    !room ||
                    !room.game
                ) {
                    return;
                }


                const playerIndex =
                    room.game.players.findIndex(
                        p =>
                            p.socketId ===
                            socket.id
                    );


                if (
                    playerIndex === -1
                ) {
                    return;
                }


                const mode =
                    String(
                        data?.mode || ""
                    ).toLowerCase();


                const result =
                    chooseSpecialMode(
                        room.game,
                        playerIndex,
                        mode
                    );


                if (!result.ok) {

                    sendError(
                        socket,
                        result.error
                    );

                    return;
                }


                sendGameState(
                    room
                );


                scheduleLufaWindow(
                    room
                );
            }
        );


        /*
         * LUFA
         */
        socket.on(
            "callLufa",
            () => {

                const room =
                    getRoom(
                        socket.data.roomName
                    );


                if (
                    !room ||
                    !room.game
                ) {
                    return;
                }


                const playerIndex =
                    room.game.players.findIndex(
                        p =>
                            p.socketId ===
                            socket.id
                    );


                if (
                    playerIndex === -1
                ) {
                    return;
                }


                const result =
                    callLufa(
                        room.game,
                        playerIndex
                    );


                if (!result.ok) {

                    sendError(
                        socket,
                        result.error
                    );

                    return;
                }


                sendGameState(
                    room
                );


                scheduleLufaWindow(
                    room
                );
            }
        );


        /*
         * Z POWROTEM
         */
        socket.on(
            "callBackLufa",
            () => {

                const room =
                    getRoom(
                        socket.data.roomName
                    );


                if (
                    !room ||
                    !room.game
                ) {
                    return;
                }


                const playerIndex =
                    room.game.players.findIndex(
                        p =>
                            p.socketId ===
                            socket.id
                    );


                if (
                    playerIndex === -1
                ) {
                    return;
                }


                const result =
                    callBackLufa(
                        room.game,
                        playerIndex
                    );


                if (!result.ok) {

                    sendError(
                        socket,
                        result.error
                    );

                    return;
                }


                sendGameState(
                    room
                );


                scheduleLufaWindow(
                    room
                );
            }
        );


        /*
         * PLAY CARD
         */
        socket.on(
            "playCard",
            data => {

                const room =
                    getRoom(
                        socket.data.roomName
                    );


                if (
                    !room ||
                    !room.game
                ) {
                    return;
                }


                const playerIndex =
                    room.game.players.findIndex(
                        p =>
                            p.socketId ===
                            socket.id
                    );


                if (
                    playerIndex === -1
                ) {
                    return;
                }


                const card =
                    data?.card;


                if (!card) {
                    return;
                }


                const result =
                    playCard(
                        room.game,
                        playerIndex,
                        card
                    );


                if (!result.ok) {

                    sendError(
                        socket,
                        result.error
                    );

                    return;
                }


                sendGameState(
                    room
                );


                if (
                    room.game.handFinished
                ) {

                    scheduleNextHand(
                        room
                    );

                    return;
                }


                scheduleBotTurn(
                    room
                );
            }
        );


        /*
         * LEAVE
         */
        socket.on(
            "leaveRoom",
            () => {

                leaveRoom(
                    socket
                );
            }
        );


        /*
         * DISCONNECT
         */
        socket.on(
            "disconnect",
            () => {

                leaveRoom(
                    socket
                );
            }
        );
    }
);


/* =========================
   LEAVE ROOM
========================= */

function leaveRoom(socket) {

    const roomName =
        socket.data.roomName;


    if (!roomName) {
        return;
    }


    const room =
        rooms.get(
            roomName
        );


    if (!room) {
        return;
    }


    room.players =
        room.players.filter(
            player =>
                player.socketId !==
                socket.id
        );


    socket.leave(
        room.name
    );


    /*
     * Gra jeszcze się nie rozpoczęła.
     */
    if (!room.started) {

        if (
            room.players.length === 0
        ) {

            rooms.delete(
                room.name
            );

        } else {

            sendLobby(
                room
            );
        }


        return;
    }


    /*
     * Jeżeli człowiek wyszedł
     * podczas gry, na razie kończymy
     * pokój.
     */
    clearTimeout(
        room.botTimer
    );

    clearTimeout(
        room.lufaTimer
    );


    io.to(
        room.name
    ).emit(
        "message",
        "Gracz opuścił grę."
    );


    /*
     * Prosta ochrona przed
     * pozostawieniem uszkodzonego pokoju.
     */
    if (
        room.players.filter(
            p => !p.isBot
        ).length === 0
    ) {

        rooms.delete(
            room.name
        );
    }
}


/* =========================
   START SERVER
========================= */

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `66 server działa na porcie ${PORT}`
        );
    }
);
