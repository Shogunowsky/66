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

function getHumanPlayers(room) {
    return room.players.filter(
        player => !player.isBot
    );
}

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

function arrangePlayersForTeams(room) {
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
     * Układ przy stole:
     *
     *       [2] partner
     *
     * [1]               [3]
     *
     *       [0] ja
     *
     * Partnerzy są naprzeciwko.
     */

    room.players = [
        team0[0],
        team1[0],
        team0[1],
        team1[1]
    ];

    return true;
}

function sendLobby(room) {

    const lobbyData = {
        roomId: room.id,

        players: room.players.map(
            player => ({
                name: player.name,
                isBot: !!player.isBot,
                team: player.team
            })
        ),

        playerCount:
            room.players.length,

        maxPlayers: 4
    };

    for (const player of room.players) {
        io.to(player.socketId).emit(
            "lobbyState",
            lobbyData
        );
    }
}

function sendGameState(room) {

    if (!room.game) {
        return;
    }

    const state =
        getGameState(room.game);

    for (
        let index = 0;
        index < room.players.length;
        index++
    ) {

        const player =
            room.players[index];

        const personalState = {
            ...state,

            hand:
                room.game.hands[index] || [],

            playerIndex:
                index,

            myTeam:
                player.team,

            teamNames: [
                getTeamName(room, 0),
                getTeamName(room, 1)
            ]
        };

        io.to(player.socketId).emit(
            "gameState",
            personalState
        );
    }

    /*
     * Jeżeli trwa obieranie,
     * wysyłamy możliwość wyboru
     * tylko odpowiedniemu graczowi.
     */

    if (
        room.game.phase === "trump" &&
        room.game.currentPlayer !== null
    ) {

        const player =
            room.players[
                room.game.currentPlayer
            ];

        if (player) {

            io.to(player.socketId).emit(
                "chooseTrump",
                {
                    hand:
                        room.game.hands[
                            room.game.currentPlayer
                        ] || [],

                    playerIndex:
                        room.game.currentPlayer
                }
            );
        }
    }
}

function assignBotTeams(room) {

    const counts = [
        0,
        0
    ];

    for (const player of room.players) {

        if (
            player.team === 0 ||
            player.team === 1
        ) {
            counts[player.team]++;
        }
    }

    for (const player of room.players) {

        if (
            !player.isBot ||
            player.team !== null
        ) {
            continue;
        }

        if (
            counts[0] < 2 &&
            counts[0] <= counts[1]
        ) {
            player.team = 0;
            counts[0]++;
        } else {
            player.team = 1;
            counts[1]++;
        }
    }
}

function startGame(room) {

    const humans =
        getHumanPlayers(room);

    /*
     * Każdy człowiek musi wybrać drużynę.
     */

    for (const player of humans) {

        if (
            player.team !== 0 &&
            player.team !== 1
        ) {
            return {
                ok: false,
                error:
                    "Każdy gracz musi wybrać drużynę."
            };
        }
    }

    /*
     * Uzupełniamy brakujące miejsca botami.
     */

    if (room.players.length < 4) {
        fillBots(room.players);
    }

    /*
     * Przydzielamy boty do drużyn.
     */

    assignBotTeams(room);

    const team0 =
        getTeamPlayers(room, 0);

    const team1 =
        getTeamPlayers(room, 1);

    if (
        team0.length !== 2 ||
        team1.length !== 2
    ) {
        return {
            ok: false,
            error:
                "Każda drużyna musi mieć dokładnie 2 graczy."
        };
    }

    /*
     * Ustawiamy miejsca przy stole.
     */

    if (!arrangePlayersForTeams(room)) {
        return {
            ok: false,
            error:
                "Nie udało się ustawić drużyn."
        };
    }

    /*
     * Tworzymy nową grę.
     */

    room.game =
        createGame(room.players);

    dealInitialCards(room.game);

    room.started = true;

    /*
     * Informujemy wszystkich,
     * że gra wystartowała.
     */

    for (const player of room.players) {

        io.to(player.socketId).emit(
            "gameStarted"
        );
    }

    sendGameState(room);

    /*
     * Jeżeli obiera bot,
     * od razu wykonujemy jego ruch.
     */

    processBotTurn(room);

    return {
        ok: true
    };
}

function processBotTurn(room) {

    if (
        !room.game ||
        room.game.handFinished
    ) {
        return;
    }

    const game =
        room.game;

    const currentIndex =
        game.currentPlayer;

    const player =
        room.players[currentIndex];

    if (
        !player ||
        !player.isBot
    ) {
        return;
    }

    /*
     * BOT OBIERA KOLOR
     */

    if (game.phase === "trump") {

        const trump =
            chooseBotTrump(
                game,
                currentIndex
            );

        const result =
            chooseTrump(
                game,
                currentIndex,
                trump
            );

        if (
            !result ||
            result.ok === false
        ) {
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

    /*
     * BOT GRA KARTĘ
     */

    if (game.phase === "playing") {

        const card =
            chooseBotCard(
                game,
                currentIndex
            );

        if (!card) {
            console.error(
                "Bot nie znalazł legalnej karty."
            );

            return;
        }

        const result =
            playCard(
                game,
                currentIndex,
                card
            );

        if (
            !result ||
            result.ok === false
        ) {
            console.error(
                "Bot nie mógł zagrać:",
                result
            );

            return;
        }

        sendGameState(room);

        setTimeout(() => {
            processBotTurn(room);
        }, 700);
    }
}

io.on("connection", socket => {

    console.log(
        "Połączono:",
        socket.id
    );

    /*
     * ============================
     * DOŁĄCZENIE DO POKOJU
     * ============================
     */

    socket.on("joinRoom", data => {

        data = data || {};

        const roomId =
            String(
                data.roomId || ""
            )
            .trim()
            .toUpperCase();

        const name =
            String(
                data.name ||
                data.nickname ||
                ""
            )
            .trim();

        if (!roomId || !name) {

            socket.emit(
                "errorMessage",
                "Podaj kod pokoju i nick."
            );

            return;
        }

        let room =
            rooms.get(roomId);

        /*
         * Jeżeli pokój nie istnieje,
         * tworzymy go.
         */

        if (!room) {

            room = {
                id: roomId,

                players: [],

                started: false,

                game: null
            };

            rooms.set(
                roomId,
                room
            );
        }

        /*
         * Usuwamy nieaktywne połączenia
         * z lobby.
         */

        if (!room.started) {

            room.players =
                room.players.filter(
                    player => {

                        if (player.isBot) {
                            return true;
                        }

                        return io.sockets.sockets.has(
                            player.socketId
                        );
                    }
                );
        }

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
         * Nick musi być unikalny
         * w obrębie pokoju.
         */

        const nickTaken =
            room.players.some(
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

            socketId:
                socket.id,

            name,

            isBot: false,

            team: null
        };

        room.players.push(
            player
        );

        socket.join(
            roomId
        );

        socket.roomId =
            roomId;

        /*
         * Potwierdzamy wejście.
         */

        socket.emit(
            "joinedRoom",
            {
                roomId,
                name
            }
        );

        /*
         * Wysyłamy lobby.
         */

        sendLobby(room);

        console.log(
            `Gracz ${name} dołączył do pokoju ${roomId}.`
        );
    });

    /*
     * ============================
     * WYBÓR DRUŻYNY
     * ============================
     */

    socket.on(
        "chooseTeam",
        team => {

            const room =
                rooms.get(
                    socket.roomId
                );

            if (
                !room ||
                room.started
            ) {
                return;
            }

            team =
                Number(team);

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

            const teamPlayers =
                room.players.filter(
                    p =>
                        !p.isBot &&
                        p.team === team
                );

            if (
                player.team !== team &&
                teamPlayers.length >= 2
            ) {

                socket.emit(
                    "errorMessage",
                    "Ta drużyna ma już dwóch graczy."
                );

                return;
            }

            player.team =
                team;

            sendLobby(room);

            /*
             * Przy czterech ludziach
             * i kompletnych drużynach
             * startujemy automatycznie.
             */

            const humans =
                getHumanPlayers(room);

            if (
                humans.length === 4 &&
                humans.every(
                    p =>
                        p.team === 0 ||
                        p.team === 1
                )
            ) {

                const team0 =
                    humans.filter(
                        p =>
                            p.team === 0
                    );

                const team1 =
                    humans.filter(
                        p =>
                            p.team === 1
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
        }
    );

    /*
     * ============================
     * GRA Z BOTAMI
     * ============================
     */

    socket.on(
        "startWithBots",
        () => {

            const room =
                rooms.get(
                    socket.roomId
                );

            if (
                !room ||
                room.started
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

            const result =
                startGame(room);

            if (!result.ok) {

                socket.emit(
                    "errorMessage",
                    result.error
                );
            }
        }
    );

    /*
     * ============================
     * OBIERANIE KOLORU
     * ============================
     */

    socket.on(
        "chooseTrump",
        trump => {

            const room =
                rooms.get(
                    socket.roomId
                );

            if (
                !room ||
                !room.game
            ) {
                return;
            }

            const playerIndex =
                room.players.findIndex(
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
                    trump
                );

            if (
                !result ||
                result.ok === false
            ) {

                socket.emit(
                    "errorMessage",
                    result?.error ||
                        "Nie można obrać tego koloru."
                );

                return;
            }

            dealRemainingCards(
                room.game
            );

            sendGameState(room);

            processBotTurn(room);
        }
    );

    /*
     * ============================
     * ZAGRANIE KARTY
     * ============================
     */

    socket.on(
        "playCard",
        card => {

            const room =
                rooms.get(
                    socket.roomId
                );

            if (
                !room ||
                !room.game
            ) {
                return;
            }

            const playerIndex =
                room.players.findIndex(
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
                playCard(
                    room.game,
                    playerIndex,
                    card
                );

            if (
                !result ||
                result.ok === false
            ) {

                socket.emit(
                    "errorMessage",
                    result?.error ||
                        "Nie można zagrać tej karty."
                );

                return;
            }

            sendGameState(room);

            processBotTurn(room);
        }
    );

    /*
     * ============================
     * WYJŚCIE Z POKOJU
     * ============================
     */

    socket.on(
        "leaveRoom",
        () => {

            leaveRoom(socket);
        }
    );

    /*
     * ============================
     * ROZŁĄCZENIE
     * ============================
     */

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

function leaveRoom(socket) {

    const roomId =
        socket.roomId;

    if (!roomId) {
        return;
    }

    const room =
        rooms.get(roomId);

    if (!room) {
        return;
    }

    const index =
        room.players.findIndex(
            player =>
                player.socketId ===
                socket.id
        );

    if (index === -1) {
        return;
    }

    const player =
        room.players[index];

    /*
     * Jeżeli jesteśmy w lobby,
     * usuwamy gracza.
     */

    if (!room.started) {

        room.players.splice(
            index,
            1
        );

        if (room.players.length > 0) {
            sendLobby(room);
        } else {
            rooms.delete(roomId);
        }

        return;
    }

    /*
     * W trakcie gry na razie
     * nie przebudowujemy stołu.
     */

    console.log(
        `Gracz ${player.name} opuścił grę ${roomId}.`
    );
}

const PORT =
    process.env.PORT || 3000;

server.listen(
    PORT,
    () => {
        console.log(
            `Serwer działa na porcie ${PORT}`
        );
    }
);
