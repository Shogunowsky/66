const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const {
    createGame,
    dealInitialCards,
    dealRemainingCards,
    chooseTrump,
    playCard,
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

const PORT = process.env.PORT || 3000;

app.use(express.static("client"));

const rooms = new Map();


/* =========================
   POMOCNICZE
========================= */

function getRoomPlayers(room) {
    return room.players || [];
}

function getHumanPlayers(room) {
    return getRoomPlayers(room).filter(
        player => !player.bot
    );
}

function getTeamPlayers(room, team) {
    return getRoomPlayers(room).filter(
        player => player.team === team
    );
}

function getTeamName(room, team) {

    const names = getTeamPlayers(room, team)
        .filter(player => !player.bot)
        .map(player => player.name);

    if (names.length > 0) {
        return names.join(" + ");
    }

    const botNames = getTeamPlayers(room, team)
        .map(player => player.name);

    if (botNames.length > 0) {
        return botNames.join(" + ");
    }

    return `Drużyna ${team + 1}`;
}


/* =========================
   POCZEKALNIA
========================= */

function sendLobby(room) {

    if (!room || !room.players) {
        return;
    }

    const teamNames = [
        getTeamName(room, 0),
        getTeamName(room, 1)
    ];

    room.players.forEach(player => {

        if (!player.socketId) {
            return;
        }

        io.to(player.socketId).emit(
            "lobbyState",
            {
                room: room.name,

                players: room.players.map(p => ({
                    name: p.name,
                    bot: !!p.bot,
                    team:
                        typeof p.team === "number"
                            ? p.team
                            : null
                })),

                myTeam:
                    typeof player.team === "number"
                        ? player.team
                        : null,

                teamNames
            }
        );
    });
}


/* =========================
   STAN GRY
========================= */

function sendGameState(room) {

    if (!room || !room.game) {
        return;
    }

    const baseState =
        getGameState(room.game);

    const teamNames = [
        getTeamName(room, 0),
        getTeamName(room, 1)
    ];

    room.players.forEach(
        (player, index) => {

            if (!player.socketId) {
                return;
            }

            const state = {
                ...baseState,

                playerIndex: index,

                playerNames:
                    room.players.map(
                        p => p.name
                    ),

                teamNames,

                myTeam:
                    typeof player.team === "number"
                        ? player.team
                        : null
            };

            io.to(player.socketId).emit(
                "gameState",
                state
            );
        }
    );
}


/* =========================
   DOBIERANIE BOTÓW
========================= */

function assignBotTeams(room) {

    let team0 =
        getTeamPlayers(room, 0).length;

    let team1 =
        getTeamPlayers(room, 1).length;

    room.players
        .filter(player => player.bot)
        .forEach(bot => {

            if (team0 < 2) {

                bot.team = 0;
                team0++;

            } else if (team1 < 2) {

                bot.team = 1;
                team1++;
            }
        });
}


/* =========================
   START GRY
========================= */

function startGame(room) {

    if (!room || room.game) {
        return false;
    }

    const humans =
        getHumanPlayers(room);

    /*
       Każdy człowiek musi mieć drużynę.
    */

    const missingTeam =
        humans.some(
            player =>
                typeof player.team !== "number"
        );

    if (missingTeam) {
        return false;
    }

    /*
       Żadna drużyna nie może mieć
       więcej niż dwóch graczy.
    */

    if (
        getTeamPlayers(room, 0).filter(
            p => !p.bot
        ).length > 2
        ||
        getTeamPlayers(room, 1).filter(
            p => !p.bot
        ).length > 2
    ) {
        return false;
    }

    /*
       Jeżeli brakuje graczy,
       uzupełniamy botami.
    */

    fillBots(room.players);

    /*
       Boty dostają brakujące miejsca
       w drużynach.
    */

    assignBotTeams(room);

    /*
       Musimy mieć dokładnie 2 + 2.
    */

    const team0 =
        getTeamPlayers(room, 0);

    const team1 =
        getTeamPlayers(room, 1);

    if (
        team0.length !== 2 ||
        team1.length !== 2
    ) {
        return false;
    }

    /*
       Tworzymy właściwą grę.
    */

    room.game =
        createGame(room.players);

    /*
       Pierwsze 3 karty.
    */

    dealInitialCards(room.game);

    /*
       Powiadamiamy klientów.
    */

    room.players.forEach(player => {

        if (player.socketId) {

            io.to(player.socketId).emit(
                "gameStarted"
            );
        }
    });

    sendGameState(room);

    /*
       Jeżeli zaczyna bot,
       obsługujemy jego ruch.
    */

    processBotTurn(room);

    return true;
}


/* =========================
   BOT — KOLEJKA
========================= */

function processBotTurn(room) {

    if (!room || !room.game) {
        return;
    }

    const game = room.game;

    const currentIndex =
        game.currentPlayer;

    const player =
        room.players[currentIndex];

    if (!player || !player.bot) {
        return;
    }

    setTimeout(() => {

        if (!room.game) {
            return;
        }

        const currentPlayer =
            room.players[
                room.game.currentPlayer
            ];

        if (
            !currentPlayer ||
            !currentPlayer.bot
        ) {
            return;
        }

        /*
           Bot wybiera atu.
        */

        if (
            room.game.phase ===
            "trump"
        ) {

            const suit =
                chooseBotTrump(
                    room.game,
                    room.game.currentPlayer
                );

            chooseTrump(
                room.game,
                suit
            );

            dealRemainingCards(
                room.game
            );

            sendGameState(room);

            processBotTurn(room);

            return;
        }

        /*
           Bot wybiera kartę.
        */

        const card =
            chooseBotCard(
                room.game,
                room.game.currentPlayer
            );

        if (!card) {
            return;
        }

        removeCardFromBot(
            room.game,
            room.game.currentPlayer,
            card
        );

        playCard(
            room.game,
            room.game.currentPlayer,
            card
        );

        sendGameState(room);

        /*
           Jeżeli po zagraniu
           nadal gra bot — kolejny ruch.
        */

        processBotTurn(room);

    }, 700);
}


/* =========================
   SOCKET.IO
========================= */

io.on("connection", socket => {

    console.log(
        "Połączono:",
        socket.id
    );


    /* =========================
       DOŁĄCZENIE DO POKOJU
    ========================= */

    socket.on(
        "joinRoom",
        ({ nickname, room: roomName }) => {

            if (
                typeof nickname !== "string" ||
                typeof roomName !== "string"
            ) {
                return;
            }

            nickname =
                nickname.trim();

            roomName =
                roomName.trim();

            if (!nickname || !roomName) {
                return;
            }

            if (!rooms.has(roomName)) {

                rooms.set(
                    roomName,
                    {
                        name: roomName,
                        players: [],
                        game: null
                    }
                );
            }

            const room =
                rooms.get(roomName);

            /*
               Nie pozwalamy dołączyć do
               rozpoczętej gry.
            */

            if (room.game) {

                socket.emit(
                    "errorMessage",
                    "Gra w tym pokoju już się rozpoczęła."
                );

                return;
            }

            /*
               Maksymalnie 4 ludzi.
            */

            const humans =
                getHumanPlayers(room);

            if (humans.length >= 4) {

                socket.emit(
                    "errorMessage",
                    "Ten pokój jest już pełny."
                );

                return;
            }

            /*
               Sprawdzamy duplikat nicku.
            */

            const duplicate =
                room.players.some(
                    player =>
                        !player.bot &&
                        player.name.toLowerCase() ===
                        nickname.toLowerCase()
                );

            if (duplicate) {

                socket.emit(
                    "errorMessage",
                    "Taki pseudonim jest już zajęty w tym pokoju."
                );

                return;
            }

            const player = {
                id: socket.id,
                socketId: socket.id,
                name: nickname,
                bot: false,
                team: null
            };

            room.players.push(player);

            socket.join(roomName);

            socket.data.room =
                roomName;

            socket.data.playerId =
                socket.id;

            socket.emit(
                "joinedRoom",
                {
                    room: roomName
                }
            );

            sendLobby(room);
        }
    );


    /* =========================
       WYBÓR DRUŻYNY
    ========================= */

    socket.on(
        "chooseTeam",
        ({ team }) => {

            const roomName =
                socket.data.room;

            if (!roomName) {
                return;
            }

            const room =
                rooms.get(roomName);

            if (!room || room.game) {
                return;
            }

            if (
                team !== 0 &&
                team !== 1
            ) {
                return;
            }

            const player =
                room.players.find(
                    p =>
                        p.socketId ===
                        socket.id
                );

            if (!player) {
                return;
            }

            const teamCount =
                getTeamPlayers(
                    room,
                    team
                ).filter(
                    p => !p.bot
                ).length;

            /*
               Maksymalnie 2 ludzi
               w jednej drużynie.
            */

            if (
                player.team !== team &&
                teamCount >= 2
            ) {

                socket.emit(
                    "errorMessage",
                    "Ta drużyna ma już dwóch graczy."
                );

                return;
            }

            player.team = team;

            sendLobby(room);

            /*
               Jeżeli mamy 4 ludzi
               i każdy wybrał drużynę,
               startujemy bez botów.
            */

            const humans =
                getHumanPlayers(room);

            const allHaveTeams =
                humans.length === 4 &&
                humans.every(
                    p =>
                        typeof p.team ===
                        "number"
                );

            if (allHaveTeams) {

                const team0 =
                    getTeamPlayers(
                        room,
                        0
                    ).length;

                const team1 =
                    getTeamPlayers(
                        room,
                        1
                    ).length;

                if (
                    team0 === 2 &&
                    team1 === 2
                ) {
                    startGame(room);
                }
            }
        }
    );


    /* =========================
       GRAJ Z BOTAMI
    ========================= */

    socket.on(
        "startWithBots",
        () => {

            const roomName =
                socket.data.room;

            if (!roomName) {
                return;
            }

            const room =
                rooms.get(roomName);

            if (!room || room.game) {
                return;
            }

            const player =
                room.players.find(
                    p =>
                        p.socketId ===
                        socket.id
                );

            if (!player) {
                return;
            }

            /*
               Gracz musi najpierw wybrać
               swoją drużynę.
            */

            if (
                typeof player.team !==
                "number"
            ) {

                socket.emit(
                    "errorMessage",
                    "Najpierw wybierz drużynę."
                );

                return;
            }

            const started =
                startGame(room);

            if (!started) {

                socket.emit(
                    "errorMessage",
                    "Nie można rozpocząć gry. Sprawdź wybór drużyn."
                );

                sendLobby(room);
            }
        }
    );


    /* =========================
       WYBÓR ATU
    ========================= */

    socket.on(
        "chooseTrump",
        ({ suit }) => {

            const roomName =
                socket.data.room;

            const room =
                rooms.get(roomName);

            if (!room || !room.game) {
                return;
            }

            const game =
                room.game;

            if (
                game.currentPlayer !==
                room.players.findIndex(
                    p =>
                        p.socketId ===
                        socket.id
                )
            ) {
                return;
            }

            chooseTrump(
                game,
                suit
            );

            dealRemainingCards(
                game
            );

            sendGameState(room);

            processBotTurn(room);
        }
    );


    /* =========================
       ZAGRANIE KARTY
    ========================= */

    socket.on(
        "playCard",
        ({ card }) => {

            const roomName =
                socket.data.room;

            const room =
                rooms.get(roomName);

            if (!room || !room.game) {
                return;
            }

            const game =
                room.game;

            const playerIndex =
                room.players.findIndex(
                    p =>
                        p.socketId ===
                        socket.id
                );

            if (
                playerIndex < 0 ||
                game.currentPlayer !==
                playerIndex
            ) {
                return;
            }

            const result =
                playCard(
                    game,
                    playerIndex,
                    card
                );

            if (
                result &&
                result.error
            ) {

                socket.emit(
                    "errorMessage",
                    result.error
                );

                return;
            }

            sendGameState(room);

            processBotTurn(room);
        }
    );


    /* =========================
       OPUSZCZENIE POKOJU
    ========================= */

    socket.on(
        "leaveRoom",
        () => {

            leaveRoom(socket);
        }
    );


    /* =========================
       ROZŁĄCZENIE
    ========================= */

    socket.on(
        "disconnect",
        () => {

            console.log(
                "Rozłączono:",
                socket.id
            );

            leaveRoom(socket);
        }
    );
});


/* =========================
   LEAVE ROOM
========================= */

function leaveRoom(socket) {

    const roomName =
        socket.data.room;

    if (!roomName) {
        return;
    }

    const room =
        rooms.get(roomName);

    if (!room) {
        return;
    }

    const index =
        room.players.findIndex(
            player =>
                player.socketId ===
                socket.id
        );

    if (index !== -1) {

        room.players.splice(
            index,
            1
        );
    }

    socket.leave(roomName);

    socket.data.room = null;

    /*
       Jeżeli pokój jest pusty,
       usuwamy go.
    */

    if (room.players.length === 0) {

        rooms.delete(roomName);

        return;
    }

    /*
       Jeżeli gra jeszcze się
       nie rozpoczęła, aktualizujemy lobby.
    */

    if (!room.game) {

        sendLobby(room);
    }
}


/* =========================
   START SERWERA
========================= */

server.listen(
    PORT,
    () => {

        console.log(
            `Sznaps działa na porcie ${PORT}`
        );
    }
);
