const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const {
    createGame,
    dealCards,
    chooseTrump,
    getGameState
} = require("./game");

const {
    fillBots,
    isBot,
    chooseBotTrump,
    chooseBotCard,
    removeCardFromBot
} = require("./bot");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "../client")));

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../client/index.html")
    );
});

const rooms = new Map();


function createRoom(roomId) {

    return {
        id: roomId,
        players: [],
        game: null,
        started: false
    };
}


function getRoom(roomId) {

    if (!rooms.has(roomId)) {
        rooms.set(roomId, createRoom(roomId));
    }

    return rooms.get(roomId);
}


/* =========================
   START GRY
========================= */

function startGame(room) {

    if (room.started) {
        return;
    }

    if (room.players.length < 1) {
        return;
    }

    const playersWithBots =
        fillBots(room.players, 4);

    room.game =
        createGame(playersWithBots);

    room.started = true;

    /*
        Na początek rozdanie 3 kart.
        Resztę zasad będziemy dodawać
        po kolei.
    */

    dealCards(room.game, 3);

    room.game.phase = "trump";

    /*
        Na start pyta pierwszy gracz.
        Później ustawimy dokładne zasady
        wyboru atu.
    */

    room.game.currentPlayer =
        room.game.players[0].id;

    sendGameState(room);

    runBotIfNeeded(room);
}


/* =========================
   STAN GRY
========================= */

function sendGameState(room) {

    if (!room.game) {
        return;
    }

    const state =
        getGameState(room.game);

    for (const player of room.players) {

        const playerState =
            JSON.parse(
                JSON.stringify(state)
            );

        /*
            Każdy człowiek widzi
            tylko własne karty.
        */

        playerState.players =
            playerState.players.map(p => {

                if (p.id === player.id) {
                    return p;
                }

                return {
                    ...p,
                    hand: p.hand.map(() => ({
                        hidden: true
                    }))
                };
            });

        io.to(player.id)
            .emit("gameState", playerState);
    }
}


/* =========================
   BOT
========================= */

function runBotIfNeeded(room) {

    if (!room.game) {
        return;
    }

    const currentId =
        room.game.currentPlayer;

    const bot =
        room.game.players.find(
            p => p.id === currentId
        );

    if (!bot || !isBot(bot)) {
        return;
    }

    setTimeout(() => {

        if (!room.game) {
            return;
        }

        if (room.game.phase === "trump") {

            const trump =
                chooseBotTrump(
                    room.game,
                    bot
                );

            chooseTrump(
                room.game,
                trump
            );

            room.game.phase = "playing";

            room.game.currentPlayer =
                getNextPlayer(
                    room.game,
                    bot.seat
                );

            sendGameState(room);

            runBotIfNeeded(room);

            return;
        }

        if (room.game.phase === "playing") {

            const card =
                chooseBotCard(
                    room.game,
                    bot
                );

            if (!card) {
                return;
            }

            removeCardFromBot(
                bot,
                card
            );

            room.game.trick.push({
                playerId: bot.id,
                seat: bot.seat,
                card
            });

            /*
                Na tym etapie tylko pokazujemy
                zagraną kartę.
                Pełne zasady lew dodamy później.
            */

            if (room.game.trick.length >= 4) {

                room.game.trick = [];

            }

            room.game.currentPlayer =
                getNextPlayer(
                    room.game,
                    bot.seat
                );

            sendGameState(room);

            runBotIfNeeded(room);
        }

    }, 800);
}


/* =========================
   NASTĘPNY GRACZ
========================= */

function getNextPlayer(game, seat) {

    const nextSeat =
        (seat + 1) % 4;

    const player =
        game.players.find(
            p => p.seat === nextSeat
        );

    return player
        ? player.id
        : null;
}


/* =========================
   SOCKET
========================= */

io.on("connection", socket => {

    console.log(
        "Połączono:",
        socket.id
    );


    socket.on(
        "joinRoom",
        ({ roomId, nickname }) => {

            if (!roomId || !nickname) {

                socket.emit(
                    "errorMessage",
                    "Brakuje nazwy pokoju lub nicku."
                );

                return;
            }

            const room =
                getRoom(roomId);


            if (room.started) {

                socket.emit(
                    "errorMessage",
                    "Ta gra już się rozpoczęła."
                );

                return;
            }


            if (room.players.length >= 4) {

                socket.emit("roomFull");

                return;
            }


            const player = {

                id: socket.id,

                nickname:
                    nickname
                        .trim()
                        .slice(0, 20),

                seat:
                    room.players.length
            };


            room.players.push(player);

            socket.join(roomId);

            socket.roomId =
                roomId;


            console.log(
                `${player.nickname} dołączył do pokoju ${roomId}`
            );


            io.to(roomId).emit(
                "roomUpdate",
                {
                    roomId: room.id,
                    players: room.players
                }
            );


            /*
                Na potrzeby pierwszego testu
                gra startuje od razu po dołączeniu
                pierwszego gracza i uzupełnia resztę botami.
            */

            if (room.players.length === 1) {

                setTimeout(() => {

                    if (
                        room.players.length > 0 &&
                        !room.started
                    ) {
                        startGame(room);
                    }

                }, 1500);
            }
        }
    );


    /* =========================
       ZAGRANIE KARTY
    ========================= */

    socket.on(
        "playCard",
        ({ roomId, cardIndex }) => {

            const room =
                rooms.get(roomId);

            if (!room || !room.game) {
                return;
            }

            const game =
                room.game;

            if (
                game.currentPlayer !==
                socket.id
            ) {
                return;
            }

            if (
                game.phase !==
                "playing"
            ) {
                return;
            }

            const player =
                game.players.find(
                    p => p.id === socket.id
                );

            if (!player) {
                return;
            }

            const card =
                player.hand[cardIndex];

            if (!card) {
                return;
            }

            player.hand.splice(
                cardIndex,
                1
            );

            game.trick.push({
                playerId: player.id,
                seat: player.seat,
                card
            });

            if (
                game.trick.length >= 4
            ) {

                game.trick = [];

            }

            game.currentPlayer =
                getNextPlayer(
                    game,
                    player.seat
                );

            sendGameState(room);

            runBotIfNeeded(room);
        }
    );


    /* =========================
       OPUSZCZENIE
    ========================= */

    socket.on(
        "leaveRoom",
        () => {

            removePlayer(socket);
        }
    );


    socket.on(
        "disconnect",
        () => {

            console.log(
                "Rozłączono:",
                socket.id
            );

            removePlayer(socket);
        }
    );
});


/* =========================
   USUWANIE GRACZA
========================= */

function removePlayer(socket) {

    const roomId =
        socket.roomId;

    if (
        !roomId ||
        !rooms.has(roomId)
    ) {
        return;
    }

    const room =
        rooms.get(roomId);

    room.players =
        room.players.filter(
            p => p.id !== socket.id
        );


    if (
        room.players.length === 0
    ) {

        rooms.delete(roomId);

        console.log(
            `Usunięto pusty pokój ${roomId}`
        );

        return;
    }


    if (!room.started) {

        room.players.forEach(
            (player, index) => {
                player.seat = index;
            }
        );

        io.to(roomId).emit(
            "roomUpdate",
            {
                roomId: room.id,
                players: room.players
            }
        );
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
