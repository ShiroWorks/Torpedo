const path = require('path');
const http = require('http');
const express = require('express');
const PORT = process.env.PORT || 3000;
const socketio = require('socket.io');
const { ifError } = require('assert');
const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Start server
server.listen(PORT, () => console.log(`A szerver a ${PORT} porton fut`));

const connections = [null, null];

// Handle a socket connection request from web client
io.on('connection', (socket) => {
  // console.log("New WS Connection");

  // Find an available player number
  let playerIndex = -1;
  for (const i in connections) {
    if (connections[i] === null) {
      playerIndex = i;
      break;
    }
  }

  // Tell the connecting client what player number they are
  socket.emit('player-number', playerIndex);

  console.log(`${playerIndex} számú játékos csatlakozott`);

  // Ignore player 3
  if (playerIndex == -1) return;

  connections[playerIndex] = false;

  // Tell everyone else what player number just connected
  socket.broadcast.emit('player-connection', playerIndex);

  // Check player connections
  socket.on('check-players', () => {
    const players = [];
    for (const i in connections) {
      connections[i] === null
        ? players.push({ connected: false, ready: false })
        : players.push({ connected: true, ready: connections[i] });
    }
    socket.emit('check-players', players);
  });

  // On Ready
  socket.on('player-ready', () => {
    socket.broadcast.emit('enemy-ready', playerIndex);
    connections[playerIndex] = true;
  });

  socket.on('fire', (id) => {
    console.log(`Lövést adott le a ${playerIndex} számú játékos`);
    console.log(id);

    // Emit the move to all other clients
    socket.broadcast.emit('fire', id);
  });

  socket.on('fire-reply', (square) => {
    console.log(square);

    // Forward the reply to all other clients
    socket.broadcast.emit('fire-reply', square);
  });

  socket.on('disconnect', function () {
    console.log(`${playerIndex} számú játékos lecsatlakozott`);
    connections[playerIndex] = null;
    // Tell everyone else what player number just disconnected
    socket.broadcast.emit('player-connection', playerIndex);
    socket.broadcast.emit('enemy-ready', playerIndex);
  });

  setTimeout(() => {
    connections[playerIndex] = null;
    socket.emit('timeout');
    socket.disconnect();
  }, 600000); //  600000 10 minute limit per player
});
