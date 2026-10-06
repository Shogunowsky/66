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
   POKOJE
========================= */

function createRoom(roomName) {
    const room = {
        name: roomName,
        players: [],
        game: null,
        started: false
    };

    rooms.set(roomName, room);

    return room;
}

function getRoom(roomName) {
    return rooms.get(roomName);
}


/* =========================
   DRUŻYNY
========================= */

function getTeamPlayers(room, team) {
    return room.players.filter(
        player => player.team === team
    );
}

function getTeamName(room, team) {
    const players =
        getTeamPlayers(room, team);

    if (!players.length) {
        return `Drużyna ${team + 1}`;
    }

    return players
        .map(player => player.name)
        .join(" + ");
}


/* =========================
   STAN POCZEKALNI
========================= */

function sendLobby(room) {
    const teamNames = [
        getTeamName(room, 0),
        getTeamName(room, 1)
    ];

    room.players.forEach(player => {
        io.to(player.id).emit(
            "lobbyState",
            {
                room: room.name,

                players: room.players.map(p => ({
                    name: p.name,
                    seat: p.seat,
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
    if (!room.game) {
        return;
    }

    room.players.forEach(player => {
        if (player.bot) {
            return;
        }

        const state =
            getGameState(
                room.game,
                player.seat
            );

        state.playerNames =
            room.players.map(
                p => p.name
            );

        state.myTeam =
            room.players[player.seat]?.team
                ?? null;

        state.teamNames = [
            getTeamName(room, 0),
            getTeamName(room, 1)
        ];

        io.to(player.id).emit(
            "gameState",
            state
        );
    });
}


/* =========================
   START GRY
========================= */

function startGame(room) {
    if (room.started) {
        return;
    }

    /*
     * Jeżeli ktoś nie wybrał drużyny,
     * nie pozwalamy rozpocząć gry.
     */

    const playersWithoutTeam =
        room.players.filter(
            player =>
                typeof player.team !== "number"
        );

    if (playersWithoutTeam.length > 0) {
        return;
    }

    /*
     * Maksymalnie dwóch graczy
     * w jednej drużynie.
     */

    if (
        getTeamPlayers(room, 0).length > 2 ||
        getTeamPlayers(room, 1).length > 2
    ) {
        return;
    }

    /*
     * Uzupełniamy brakujące miejsca botami.
     */

    fillBots(room.players);

    /*
     * Boty dostają drużyny tak,
     * żeby zachować układ 2 + 2.
     */

    room.players.forEach(player => {
        if (
            player.bot &&
            typeof player.team !== "number"
        ) {
            const team0 =
                getTeamPlayers(room, 0).length;

            const team1 =
                getTeamPlayers(room, 1).length;

            player.team =
                team0 <= team1 ? 0 : 1;
        }
    });

    /*
     * Sprawdzamy ponownie układ drużyn.
     */

    if (
        getTeamPlayers(room, 0).length !== 2 ||
        getTeamPlayers(room, 1).length !== 2
    ) {
        return;
    }

    room.started = true;

    room.game =
        createGame(room.players);

    dealInitialCards(room.game);

    sendGameState(room);

    processBots(room);
}


/* =========================
   BOTY
========================= */

function chooseTrumpForBot(room) {
    const game = room.game;

    if (!game) {
        return;
    }

    const player =
        room.players[game.trumpChooser];

    if (!player?.bot) {
        return;
    }

    const suit =
        chooseBotTrump(
            game,
            player.seat
        );

    chooseTrump(
        game,
        player.seat,
        suit
    );

    dealRemainingCards(game);

    sendGameState(room);
}

function playBot(room) {
    const game = room.game;

    if (!game) {
        return;
    }

    const player =
        room.players[game.currentPlayer];

    if (!player?.bot) {
        return;
    }

    const cardId =
        chooseBotCard(
            game,
            player.seat
        );

    if (!cardId) {
        return;
    }

    removeCardFromBot(
        game,
        player.seat,
        cardId
    );

    playCard(
        game,
        player.seat,
        cardId
    );

    sendGameState(room);
}

function processBots(room) {
    if (!room.game) {
        return;
    }

    const game = room.game;

    if (
        game.trump === null &&
        room.players[
            game.trumpChooser
        ]?.bot
    ) {
        setTimeout(() => {
            chooseTrumpForBot(room);
            processBots(room);
        }, 700);

        return;
    }

    if (
        game.finished ||
        game.currentPlayer === null
    ) {
        return;
    }

    const player =
        room.players[
            game.currentPlayer
        ];

    if (player?.bot) {
        setTimeout(() => {
            playBot(room);
            processBots(room);
        }, 700);
    }
}


/* =========================
   SOCKET.IO
========================= */

io.on("connection", socket => {

    console.log(
        "Połączono:",
        socket.id
    );


    /* =====================
       DOŁĄCZENIE DO POKOJU
    ====================== */

    socket.on(
        "joinRoom",
        ({ nickname, room: roomName }) => {

            nickname =
                String(nickname || "")
                    .trim()
                    .slice(0, 20);

            roomName =
                String(roomName || "")
                    .trim()
                    .slice(0, 20);

            if (!nickname || !roomName) {
                socket.emit(
                    "joinError",
                    "Podaj pseudonim i pokój."
                );

                return;
            }

            let room =
                getRoom(roomName);

            if (!room) {
                room =
                    createRoom(roomName);
            }

            if (room.started) {
                socket.emit(
                    "joinError",
                    "Gra już się rozpoczęła."
                );

                return;
            }

            if (room.players.length >= 4) {
                socket.emit(
                    "joinError",
                    "Pokój jest pełny."
                );

                return;
            }

            const alreadyExists =
                room.players.some(
                    player =>
                        player.name.toLowerCase() ===
                        nickname.toLowerCase()
                );

            if (alreadyExists) {
                socket.emit(
                    "joinError",
                    "Ten pseudonim jest już zajęty."
                );

                return;
            }

            const player = {
                id: socket.id,
                name: nickname,
                seat: room.players.length,
                team: null,
                bot: false
            };

            room.players.push(player);

            socket.join(roomName);

            socket.data.room =
                roomName;

            socket.data.seat =
                player.seat;

            socket.emit(
                "joinedRoom",
                {
                    room: roomName,
                    seat: player.seat,
                    team: null
                }
            );

            sendLobby(room);
        }
    );


    /* =====================
       WYBÓR DRUŻYNY
    ====================== */

    socket.on(
        "chooseTeam",
        ({ team }) => {

            const roomName =
                socket.data.room;

            const room =
                getRoom(roomName);

            if (!room) {
                return;
            }

            const player =
                room.players.find(
                    p => p.id === socket.id
                );

            if (!player) {
                return;
            }

            if (
                team !== 0 &&
                team !== 1
            ) {
                return;
            }

            /*
             * Maksymalnie dwóch
             * graczy w drużynie.
             */

            const alreadyInTeam =
                getTeamPlayers(
                    room,
                    team
                ).filter(
                    p => p.id !== player.id
                ).length;

            if (alreadyInTeam >= 2) {
                socket.emit(
                    "gameError",
                    "Ta drużyna jest już pełna."
                );

                return;
            }

            player.team = team;

            sendLobby(room);
        }
    );


    /* =====================
       WYBÓR ATU
    ====================== */

    socket.on(
        "chooseTrump",
        ({ suit }) => {

            const room =
                getRoom(
                    socket.data.room
                );

            if (!room?.game) {
                return;
            }

            const player =
                room.players.find(
                    p => p.id === socket.id
                );

            if (!player) {
                return;
            }

            try {

                chooseTrump(
                    room.game,
                    player.seat,
                    suit
                );

                dealRemainingCards(
                    room.game
                );

                sendGameState(room);

                processBots(room);

            } catch (error) {

                socket.emit(
                    "gameError",
                    error.message
                );
            }
        }
    );


    /* =====================
       ZAGRANIE KARTY
    ====================== */

    socket.on(
        "playCard",
        ({ cardId }) => {

            const room =
                getRoom(
                    socket.data.room
                );

            if (!room?.game) {
                return;
            }

            const player =
                room.players.find(
                    p => p.id === socket.id
                );

            if (!player) {
                return;
            }

            try {

                playCard(
                    room.game,
                    player.seat,
                    cardId
                );

                sendGameState(room);

                processBots(room);

            } catch (error) {

                socket.emit(
                    "gameError",
                    error.message
                );
            }
        }
    );


    /* =====================
       WYJŚCIE
    ====================== */

    socket.on(
        "leaveRoom",
        () => {

            leaveRoom(socket);
        }
    );


    /* =====================
       ROZŁĄCZENIE
    ====================== */

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
   OPUSZCZANIE POKOJU
========================= */

function leaveRoom(socket) {

    const roomName =
        socket.data.room;

    if (!roomName) {
        return;
    }

    const room =
        getRoom(roomName);

    if (!room) {
        return;
    }

    room.players =
        room.players.filter(
            player =>
                player.id !== socket.id
        );

    if (room.players.length === 0) {
        rooms.delete(roomName);
        return;
    }

    /*
     * Przeliczamy miejsca.
     */

    room.players.forEach(
        (player, index) => {
            player.seat = index;
        }
    );

    if (!room.started) {
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
