const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const {
  createGame,
  dealInitialCards,
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

const PORT = process.env.PORT || 3000;

app.use(express.static("client"));

const rooms = {};

function createRoom(roomCode) {
  rooms[roomCode] = {
    players: [],
    game: null,
    started: false
  };

  return rooms[roomCode];
}

function getRoom(roomCode) {
  if (!rooms[roomCode]) {
    createRoom(roomCode);
  }

  return rooms[roomCode];
}

function getPublicPlayers(room) {
  return room.players.map((player, index) => ({
    seat: index,
    name: player.name,
    bot: player.bot
  }));
}

function sendLobby(roomCode) {
  const room = rooms[roomCode];

  if (!room) {
    return;
  }

  io.to(roomCode).emit("lobbyState", {
    room: roomCode,
    players: getPublicPlayers(room)
  });
}

function sendGameState(roomCode) {
  const room = rooms[roomCode];

  if (!room || !room.game) {
    return;
  }

  for (const player of room.players) {
    if (player.bot) {
      continue;
    }

    io.to(player.id).emit(
      "gameState",
      getGameState(room.game, player.seat)
    );
  }
}

function startGame(roomCode) {
  const room = rooms[roomCode];

  if (!room || room.started) {
    return;
  }

  room.started = true;

  // Uzupełniamy wolne miejsca botami.
  fillBots(room.players);

  // Pierwszy pytający = pierwszy gracz przy stole.
  const firstChooser = 0;

  room.game = createGame(
    room.players,
    firstChooser
  );

  dealInitialCards(room.game);

  sendGameState(roomCode);

  processBots(roomCode);
}

function chooseTrumpForBot(roomCode) {
  const room = rooms[roomCode];

  if (!room || !room.game) {
    return;
  }

  const game = room.game;

  if (game.phase !== "trump") {
    return;
  }

  const player = room.players[game.currentPlayer];

  if (!player || !player.bot) {
    return;
  }

  const suit = chooseBotTrump(
    game,
    game.currentPlayer
  );

  chooseTrump(
    game,
    game.currentPlayer,
    suit
  );

  sendGameState(roomCode);

  processBots(roomCode);
}

function playBotCard(roomCode) {
  const room = rooms[roomCode];

  if (!room || !room.game) {
    return;
  }

  const game = room.game;

  if (game.phase !== "playing") {
    return;
  }

  const player = room.players[game.currentPlayer];

  if (!player || !player.bot) {
    return;
  }

  const cardId = chooseBotCard(
    game,
    game.currentPlayer
  );

  if (!cardId) {
    return;
  }

  const result = playCard(
    game,
    game.currentPlayer,
    cardId
  );

  if (!result.ok) {
    console.log(
      "Bot nie mógł zagrać:",
      result.error
    );

    return;
  }

  sendGameState(roomCode);

  processBots(roomCode);
}

function processBots(roomCode) {
  const room = rooms[roomCode];

  if (!room || !room.game) {
    return;
  }

  const game = room.game;

  if (game.phase === "finished") {
    sendGameState(roomCode);
    return;
  }

  const currentPlayer =
    room.players[game.currentPlayer];

  if (!currentPlayer || !currentPlayer.bot) {
    return;
  }

  setTimeout(() => {
    const latestRoom = rooms[roomCode];

    if (!latestRoom || !latestRoom.game) {
      return;
    }

    const latestGame = latestRoom.game;

    const latestPlayer =
      latestRoom.players[
        latestGame.currentPlayer
      ];

    if (!latestPlayer || !latestPlayer.bot) {
      return;
    }

    if (latestGame.phase === "trump") {
      chooseTrumpForBot(roomCode);
      return;
    }

    if (latestGame.phase === "playing") {
      playBotCard(roomCode);
    }
  }, 700);
}

io.on("connection", socket => {
  console.log(
    "Nowe połączenie:",
    socket.id
  );

  socket.on("joinRoom", data => {
    const nickname =
      String(data?.nickname || "Gracz")
        .trim()
        .slice(0, 20);

    const roomCode =
      String(data?.room || "TEST")
        .trim()
        .toUpperCase()
        .slice(0, 20);

    const room = getRoom(roomCode);

    if (room.started) {
      socket.emit("joinError", {
        message: "Ta gra już się rozpoczęła."
      });

      return;
    }

    if (room.players.length >= 4) {
      socket.emit("joinError", {
        message: "Pokój jest pełny."
      });

      return;
    }

    const seat = room.players.length;

    room.players.push({
      id: socket.id,
      name: nickname,
      seat,
      bot: false
    });

    socket.join(roomCode);

    socket.data.roomCode = roomCode;
    socket.data.seat = seat;

    socket.emit("joinedRoom", {
      room: roomCode,
      seat
    });

    sendLobby(roomCode);

    /*
     * Na razie po dołączeniu pierwszego gracza
     * uruchamiamy grę po krótkiej chwili,
     * uzupełniając resztę botami.
     *
     * Później możemy zrobić normalną poczekalnię
     * dla 4 prawdziwych graczy.
     */
    if (room.players.length === 1) {
      setTimeout(() => {
        if (
          rooms[roomCode] &&
          !rooms[roomCode].started
        ) {
          startGame(roomCode);
        }
      }, 1500);
    }
  });

  socket.on("chooseTrump", data => {
    const roomCode =
      socket.data.roomCode;

    const seat =
      socket.data.seat;

    const room = rooms[roomCode];

    if (!room || !room.game) {
      return;
    }

    const result = chooseTrump(
      room.game,
      seat,
      data?.suit
    );

    if (!result.ok) {
      socket.emit("gameError", {
        message: result.error
      });

      return;
    }

    sendGameState(roomCode);

    processBots(roomCode);
  });

  socket.on("playCard", data => {
    const roomCode =
      socket.data.roomCode;

    const seat =
      socket.data.seat;

    const room = rooms[roomCode];

    if (!room || !room.game) {
      return;
    }

    const result = playCard(
      room.game,
      seat,
      data?.cardId
    );

    if (!result.ok) {
      socket.emit("gameError", {
        message: result.error
      });

      return;
    }

    sendGameState(roomCode);

    processBots(roomCode);
  });

  socket.on("leaveRoom", () => {
    const roomCode =
      socket.data.roomCode;

    if (!roomCode) {
      return;
    }

    const room = rooms[roomCode];

    if (!room) {
      return;
    }

    room.players =
      room.players.filter(
        player =>
          player.id !== socket.id
      );

    socket.leave(roomCode);

    if (room.players.length === 0) {
      delete rooms[roomCode];
      return;
    }

    if (!room.started) {
      sendLobby(roomCode);
    }
  });

  socket.on("disconnect", () => {
    const roomCode =
      socket.data.roomCode;

    if (!roomCode) {
      return;
    }

    const room = rooms[roomCode];

    if (!room) {
      return;
    }

    room.players =
      room.players.filter(
        player =>
          player.id !== socket.id
      );

    if (room.players.length === 0) {
      delete rooms[roomCode];
      return;
    }

    if (!room.started) {
      sendLobby(roomCode);
    }
  });
});

server.listen(PORT, () => {
  console.log(
    `Sznaps działa na porcie ${PORT}`
  );
});
