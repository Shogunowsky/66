const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Pliki klienta
app.use(express.static(path.join(__dirname, "../client")));

// Prosta strona główna
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/index.html"));
});

// Pokoje gry
const rooms = new Map();

function createRoom(roomId) {
    return {
        id: roomId,
        players: [],
        createdAt: Date.now()
    };
}

function getRoom(roomId) {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, createRoom(roomId));
    }

    return rooms.get(roomId);
}

io.on("connection", (socket) => {
    console.log("Połączono:", socket.id);

    // Gracz dołącza do pokoju
    socket.on("joinRoom", ({ roomId, nickname }) => {
        if (!roomId || !nickname) {
            socket.emit("errorMessage", "Brakuje nazwy pokoju lub nicku.");
            return;
        }

        const room = getRoom(roomId);

        if (room.players.length >= 4) {
            socket.emit("roomFull");
            return;
        }

        const player = {
            id: socket.id,
            nickname: nickname.trim().slice(0, 20),
            seat: room.players.length
        };

        room.players.push(player);

        socket.join(roomId);
        socket.roomId = roomId;

        console.log(
            `${player.nickname} dołączył do pokoju ${roomId}`
        );

        io.to(roomId).emit("roomUpdate", {
            roomId: room.id,
            players: room.players
        });
    });

    // Gracz opuszcza pokój
    socket.on("leaveRoom", () => {
        removePlayer(socket);
    });

    // Rozłączenie
    socket.on("disconnect", () => {
        console.log("Rozłączono:", socket.id);
        removePlayer(socket);
    });
});

function removePlayer(socket) {
    const roomId = socket.roomId;

    if (!roomId || !rooms.has(roomId)) {
        return;
    }

    const room = rooms.get(roomId);

    room.players = room.players.filter(
        (player) => player.id !== socket.id
    );

    // Przeliczamy miejsca
    room.players.forEach((player, index) => {
        player.seat = index;
    });

    if (room.players.length === 0) {
        rooms.delete(roomId);
        console.log(`Usunięto pusty pokój ${roomId}`);
        return;
    }

    io.to(roomId).emit("roomUpdate", {
        roomId: room.id,
        players: room.players
    });
}

server.listen(PORT, () => {
    console.log(`Sznaps działa na porcie ${PORT}`);
});
