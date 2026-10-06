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
    chooseBotCard
} = require("./bot");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("client"));

const rooms = new Map();

function createRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getRoomPlayers(room) {
    return room.players || [];
}

function getHumanPlayers(room) {
    return getRoomPlayers(room).filter(player => !player.isBot);
}

function getTeamPlayers(room, team) {
    return getRoomPlayers(room).filter(player => player.team === team);
}

function getTeamName(room, team) {
    const players = getTeamPlayers(room, team);

    if (players.length === 0) {
        return `Drużyna ${team + 1}`;
    }

    return players
        .map(player => player.name)
        .join(" + ");
}

function arrangePlayersForTeams(room) {
    const team0 = getTeamPlayers(room, 0);
    const team1 = getTeamPlayers(room, 1);

    if (team0.length !== 2 || team1.length !== 2) {
        return false;
    }

    room.players = [
        team0[0],
        team1[0],
        team0[1],
        team1[1]
    ];

    return true;
}

function sendLobby(room) {
    const players = getRoomPlayers(room);

    for (const player of players) {
        io.to(player.socketId).emit("lobbyState", {
            roomId: room.id,
            players: players.map(p => ({
                name: p.name,
                isBot: !!p.isBot,
                team: p.team
            })),
            playerCount: players.length,
            maxPlayers: 4
        });
    }
}

function sendGameState(room) {
    if (!room.game) return;

    const state = getGameState(room.game);

    for (let index = 0; index < room.players.length; index++) {
        const player = room.players[index];

        const personalState = {
            ...state,
            hand: room.game.hands[index] || [],
            playerIndex: index,
            myTeam: player.team,

            teamNames: [
                getTeamName(room, 0),
                getTeamName(room, 1)
            ],

            hands: undefined
        };

        io.to(player.socketId).emit(
            "gameState",
            personalState
        );
    }

    if (
        room.game.phase === "trump" &&
        room.game.currentPlayer !== null &&
        room.players[room.game.currentPlayer]
    ) {
        const player = room.players[room.game.currentPlayer];

        io.to(player.socketId).emit("chooseTrump", {
            hand: room.game.hands[room.game.currentPlayer] || [],
            playerIndex: room.game.currentPlayer
        });
    }
}

function assignBotTeams(room) {
    const teamCounts = [0, 0];

    for (const player of room.players) {
        if (player.team === 0 || player.team === 1) {
            teamCounts[player.team]++;
        }
    }

    for (const player of room.players) {
        if (!player.isBot || player.team !== null) {
            continue;
        }

        if (
            teamCounts[0] < 2 &&
            teamCounts[0] <= teamCounts[1]
        ) {
            player.team = 0;
            teamCounts[0]++;
        } else {
            player.team = 1;
            teamCounts[1]++;
        }
    }
}

function startGame(room) {
    const humans = getHumanPlayers(room);

    for (const player of humans) {
        if (player.team !== 0 && player.team !== 1) {
            return {
                ok: false,
                error: "Każdy gracz musi wybrać drużynę."
            };
        }
    }

    if (room.players.length < 4) {
        fillBots(room.players);
    }

    assignBotTeams(room);

    const team0 = getTeamPlayers(room, 0);
    const team1 = getTeamPlayers(room, 1);

    if (team0.length !== 2 || team1.length !== 2) {
        return {
            ok: false,
            error: "Każda drużyna musi mieć dokładnie 2 graczy."
        };
    }

    if (!arrangePlayersForTeams(room)) {
        return {
            ok: false,
            error: "Nie udało się ustawić drużyn."
        };
    }

    room.game = createGame(room.players);

    dealInitialCards(room.game);

    room.started = true;

    for (const player of room.players) {
        io.to(player.socketId).emit("gameStarted");
    }

    sendGameState(room);

    processBotTurn(room);

    return { ok: true };
}

function processBotTurn(room) {
    if (!room.game || room.game.handFinished) {
        return;
    }

    const game = room.game;
    const currentIndex = game.currentPlayer;
    const currentPlayer = room.players[currentIndex];

    if (!currentPlayer || !currentPlayer.isBot) {
        return;
    }

    if (game.phase === "trump") {
        const trump = chooseBotTrump(
            game,
            currentIndex
        );

        const result = chooseTrump(
            game,
            currentIndex,
            trump
        );

        if (!result || result.ok === false) {
            console.error(
                "Bot nie mógł obrać koloru:",
                result
            );
            return;
        }

        dealRemainingCards(game);

        sendGameState(room);

        setTimeout(() => {
            processBotTurn(room);
        }, 500);

        return;
    }

    if (game.phase === "playing") {
        const card = chooseBotCard(
            game,
            currentIndex
        );

        if (!card) {
            console.error(
                "Bot nie znalazł legalnej karty."
            );
            return;
        }

        const result = playCard(
            game,
            currentIndex,
            card
        );

        if (!result || result.ok === false) {
            console.error(
                "Bot nie mógł zagrać:",
                result
            );
            return;
        }

        sendGameState(room);

        setTimeout(() => {
            processBotTurn(room);
        }, 500);
    }
}

io.on("connection", socket => {
    console.log("Połączono:", socket.id);

    socket.on("joinRoom", data => {

        /*
         * Obsługujemy zarówno:
         * name
         * jak i nickname
         *
         * Dzięki temu różne wersje klienta
         * nie będą się ze sobą gryzły.
         */
        data = data || {};

        let roomId = String(
            data.roomId || ""
        ).trim().toUpperCase();

        let name = String(
            data.name ||
            data.nickname ||
            ""
        ).trim();

        if (!roomId || !name) {
            socket.emit(
                "errorMessage",
                "Podaj kod pokoju i nick."
            );
            return;
        }

        let room = rooms.get(roomId);

        if (!room) {
            room = {
                id: roomId,
                players: [],
                started: false,
                game: null
            };

            rooms.set(roomId, room);
        }

        /*
         * Czyścimy graczy, których socket już nie istnieje.
         * Zapobiega to sytuacji, w której po odświeżeniu
         * nick pozostaje sztucznie zajęty.
         */
        room.players = room.players.filter(player => {
            if (player.isBot) {
                return true;
            }

            const connectedSocket =
                io.sockets.sockets.get(
                    player.socketId
                );

            return !!connectedSocket;
        });

        if (room.started) {
            socket.emit(
                "errorMessage",
                "Ta gra już się rozpoczęła."
            );
            return;
        }

        if (room.players.length >= 4) {
            socket.emit(
                "errorMessage",
                "Pokój jest pełny."
            );
            return;
        }

        /*
         * Sprawdzamy nick dopiero po usunięciu
         * nieaktywnych połączeń.
         */
        const nickTaken = room.players.some(
            player =>
                !player.isBot &&
                player.name.toLowerCase() ===
                    name.toLowerCase()
        );

        if (nickTaken) {
            socket.emit(
                "errorMessage",
                "Taki nick jest już zajęty."
            );
            return;
        }

        const player = {
            socketId: socket.id,
            name,
            isBot: false,
            team: null
        };

        room.players.push(player);

        socket.join(roomId);

        socket.roomId = roomId;

        socket.emit("joinedRoom", {
            roomId,
            name
        });

        sendLobby(room);

        console.log(
            `Gracz ${name} dołączył do pokoju ${roomId}.`
        );
    });

    socket.on("chooseTeam", team => {
        const room = rooms.get(socket.roomId);

        if (!room || room.started) {
            return;
        }

        team = Number(team);

        if (team !== 0 && team !== 1) {
            return;
        }

        const player = room.players.find(
            p => p.socketId === socket.id
        );

        if (!player) {
            return;
        }

        const currentTeamPlayers =
            room.players.filter(
                p =>
                    !p.isBot &&
                    p.team === team
            );

        if (
            player.team !== team &&
            currentTeamPlayers.length >= 2
        ) {
            socket.emit(
                "errorMessage",
                "Ta drużyna ma już dwóch graczy."
            );
            return;
        }

        player.team = team;

        sendLobby(room);

        const humans = getHumanPlayers(room);

        if (
            humans.length === 4 &&
            humans.every(
                p =>
                    p.team === 0 ||
                    p.team === 1
            )
        ) {
            const team0 = humans.filter(
                p => p.team === 0
            );

            const team1 = humans.filter(
                p => p.team === 1
            );

            if (
                team0.length === 2 &&
                team1.length === 2
            ) {
                const result =
                    startGame(room);

                if (!result.ok) {
                    socket.emit(
                        "errorMessage",
                        result.error
                    );
                }
            }
        }
    });

    socket.on("startWithBots", () => {
        const room = rooms.get(socket.roomId);

        if (!room || room.started) {
            return;
        }

        const player = room.players.find(
            p => p.socketId === socket.id
        );

        if (!player) {
            return;
        }

        if (
            player.team !== 0 &&
            player.team !== 1
        ) {
            socket.emit(
                "errorMessage",
                "Najpierw wybierz swoją drużynę."
            );
            return;
        }

        const result = startGame(room);

        if (!result.ok) {
            socket.emit(
                "errorMessage",
                result.error
            );
        }
    });

    socket.on("chooseTrump", trump => {
        const room = rooms.get(socket.roomId);

        if (!room || !room.game) {
            return;
        }

        const playerIndex =
            room.players.findIndex(
                p => p.socketId === socket.id
            );

        if (playerIndex === -1) {
            return;
        }

        if (
            room.game.phase !== "trump" ||
            room.game.currentPlayer !==
                playerIndex
        ) {
            return;
        }

        const result = chooseTrump(
            room.game,
            playerIndex,
            trump
        );

        if (!result || result.ok === false) {
            socket.emit(
                "errorMessage",
                result?.error ||
                    "Nie można obrać tego koloru."
            );
            return;
        }

        dealRemainingCards(room.game);

        sendGameState(room);

        processBotTurn(room);
    });

    socket.on("playCard", card => {
        const room = rooms.get(socket.roomId);

        if (!room || !room.game) {
            return;
        }

        const playerIndex =
            room.players.findIndex(
                p => p.socketId === socket.id
            );

        if (playerIndex === -1) {
            return;
        }

        const result = playCard(
            room.game,
            playerIndex,
            card
        );

        if (!result || result.ok === false) {
            socket.emit(
                "errorMessage",
                result?.error ||
                    "Nie można zagrać tej karty."
            );
            return;
        }

        sendGameState(room);

        processBotTurn(room);
    });

    socket.on("leaveRoom", () => {
        leaveRoom(socket);
    });

    socket.on("disconnect", () => {
        console.log(
            "Rozłączono:",
            socket.id
        );

        leaveRoom(socket);
    });
});

function leaveRoom(socket) {
    const roomId = socket.roomId;

    if (!roomId) {
        return;
    }

    const room = rooms.get(roomId);

    if (!room) {
        return;
    }

    const index =
        room.players.findIndex(
            player =>
                player.socketId === socket.id
        );

    if (index === -1) {
        return;
    }

    const player = room.players[index];

    if (!room.started) {
        room.players.splice(index, 1);

        sendLobby(room);

        if (room.players.length === 0) {
            rooms.delete(roomId);
        }

        return;
    }

    console.log(
        `Gracz ${player.name} opuścił grę ${roomId}.`
    );
}

const PORT =
    process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(
        `Serwer działa na porcie ${PORT}`
    );
});
