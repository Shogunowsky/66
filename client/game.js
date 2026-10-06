// ================================
// DIAGNOSTYKA POŁĄCZENIA
// ================================

const joinButton = document.getElementById("joinButton");
const nicknameInput = document.getElementById("nickname");
const roomInput = document.getElementById("room");

function showStatus(text) {
    alert(text);
}

// Sprawdzenie, czy Socket.IO w ogóle się załadowało
if (typeof io === "undefined") {
    showStatus("BŁĄD: Socket.IO się nie załadowało.\n\nSerwer albo plik Socket.IO nie odpowiada.");
} else {

    const socket = io();

    socket.on("connect", () => {
        console.log("SOCKET CONNECTED:", socket.id);

        if (joinButton) {
            joinButton.disabled = false;
            joinButton.textContent = "WEJDŹ DO GRY";
        }
    });

    socket.on("connect_error", (error) => {
        console.error("SOCKET ERROR:", error);

        if (joinButton) {
            joinButton.disabled = true;
            joinButton.textContent = "BRAK POŁĄCZENIA";
        }

        showStatus(
            "NIE MA POŁĄCZENIA Z SERWEREM.\n\n" +
            "Błąd Socket.IO:\n" +
            error.message
        );
    });

    socket.on("disconnect", () => {
        console.log("SOCKET DISCONNECTED");

        if (joinButton) {
            joinButton.disabled = true;
            joinButton.textContent = "BRAK POŁĄCZENIA";
        }
    });

    socket.on("joinedRoom", (data) => {
        console.log("JOINED ROOM:", data);

        showStatus(
            "POŁĄCZONO Z POKOJEM!\n\n" +
            "Pokój: " + (data.roomId || "brak")
        );
    });

    socket.on("errorMessage", (message) => {
        console.error("SERVER ERROR:", message);
        showStatus("SERWER ZWRÓCIŁ BŁĄD:\n\n" + message);
    });

    if (joinButton) {
        joinButton.addEventListener("click", () => {

            const nickname = nicknameInput?.value.trim();
            const room = roomInput?.value.trim();

            if (!nickname) {
                showStatus("WPISZ NICK.");
                return;
            }

            if (!room) {
                showStatus("WPISZ KOD POKOJU.");
                return;
            }

            console.log("WYSYŁAM joinRoom:", {
                nickname,
                room
            });

            socket.emit("joinRoom", {
                nickname: nickname,
                roomId: room
            });
        });
    }
}
