const { v4: uuidv4 } = require('uuid');
const Player = require('./classes/Player');
const Table = require('./classes/Table');
const path = require('path');

const express = require('express');
const app = express();

const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const { table } = require('console');
const io = new Server(server);

const port = 3000;
const rootPath = path.join(__dirname, '..');

app.use(express.static(rootPath + "/frontend"));

let socketToTable = {};
let tables = {};

const validActions = new Set(['hit', 'stay', 'dbl-down', 'split']);
const DELAY_BETWEEN_ROUNDS = 8000;


app.get('/', (req, res) => {
  res.sendFile(rootPath + "/frontend/index.html");
});

//Everything needs to be inside connection
io.on('connection', socket => {
  console.log(`${socket.id} connected`);
  //Main menu Request
  socket.on('fetch-table-data', () => {
    console.log(`${socket.id} is requesting table data`);
    sendSimplifiedTableData(socket)
  });
  
  //Client Creates and gets added to a table
  socket.on('create-table', (tableName, playerName, playerBank) => {
    const status = createTable(socket, tableName, playerName, playerBank);
    console.log(`${socket.id} : Create table exited with code ${status}`);
  });

  //Client joins a table that has already opened
  socket.on('join-table', (tableId, playerName, playerBank) => {
    const status = addPlayerToTable(io, socket, tableId, playerName, playerBank);
    console.log(`${socket.id} : Add player to table exited with code ${status}`);
  });

  //Client readies when in a room
  //Starts the game of blackjack when all players readied
  //May exit much later than expected
  socket.on('player-ready', bet => {
    const status = playerReady(io, socket, bet);
    console.log(`${socket.id} : player readied and exited with code ${status}`);
  });
  
  //Client sends a turn request, handles which player is currently in turn
  socket.on('play-turn', action => {
    const status = playTurn(io, socket, action);
    console.log(`${socket.id} : player turn exited with code ${status}`);
  });

  //Client disconnects. Handles room disconnection logic as well
  socket.on('disconnect', (reason) => {
    const status = disconnectHandler(io, socket, reason);
    console.log(`${socket.id} : player disconnected with code ${status}`);
  });
});

server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

function doesTableExist(socketId) {
  const tableId = socketToTable[socketId];

  if(tableId && tableId in tables) 
    return true;

  return false;
}

function sendSimplifiedTableData(socket) {
  const simplifiedTables = {};
  for(const tableId in tables) {
    simplifiedTables[tableId] = tables[tableId].menuFormat();
  }
  socket.emit('send-table-data', simplifiedTables);
}

function createTable(socket, tableName, playerName, playerBank) {
  const tableId = uuidv4();
  tables[tableId] = new Table(tableName);
  tables[tableId].addPlayer(socket.id, new Player(playerName, playerBank));
  socketToTable[socket.id] = tableId;
    
  socket.join(tableId);
  socket.emit('joined-table', tables[tableId].gameFormat());
  return 0;
}

function addPlayerToTable(io, socket, tableId, playerName, playerBank) {
  if(!tables[tableId]) return 1;
  if(tables[tableId].isFull()) return 1;

  const newPlayer = new Player(playerName, playerBank);
  const table = tables[tableId];

  if(table.state === 1) {
    table.addPlayerToQueue(socket.id, newPlayer);
    socket.emit('joined-queue', table.gameFormat());
  } else {
    table.addPlayer(socket.id, newPlayer);
    socket.emit('joined-table', table.gameFormat())
  }

  socket.join(tableId);
  socketToTable[socket.id] = tableId;
  io.to(tableId).emit('render-game', table.gameFormat());

  return 0;
}

function playerReady(io, socket, bet) {
  const tableId = socketToTable[socket.id];
  const table = tables[tableId];

  if(!tableId || !table) {
    socket.emit('render-menu');
    sendSimplifiedTableData(socket);
    return 1;
  }

  const player = table.players[socket.id];

  if(!player) {
    socket.emit('render-menu');
    sendSimplifiedTableData(socket);
    return 1;
  }

  if(!player.ready) {
    betNum = Number(bet);
    if(table.playerHasValidBet(socket.id, betNum)) {
      table.playerReady(socket.id, betNum);
      socket.emit('ready-recieved');
    } else {
      socket.emit('invalid-bet');
    }
    

    if(table.canStartRound()) 
      startRound(io, table, tableId);
  }

  return 0;
}

function playTurn(io, socket, playerAction) {
  const tableId = socketToTable[socket.id];
  const table = tables[tableId];
  
  if(!table || !doesTableExist(socket.id)) {
    socket.emit('render-menu');
    sendSimplifiedTableData(socket);
    return 1;
  }

  const currentPlayer = table.getPlayerInTurn();
  
  if(socket.id !== currentPlayer || !validActions.has(playerAction)) 
    return 1;

  let nextPlayer = handlePlayerAction(socket, tableId, currentPlayer, playerAction);
  io.to(tableId).emit('render-game', table.gameFormat());

  if(!nextPlayer) {
    socket.emit('end-turn');
    endRound(io, table, tableId);
    gotoNextRound(io, tableId, DELAY_BETWEEN_ROUNDS);
  } else if (currentPlayer !== nextPlayer) {
    socket.emit('end-turn');
    updateSocketStatusInTable(io, tableId, table.players[nextPlayer].name + ' turn'); 
    io.sockets.sockets.get(nextPlayer).emit('take-turn');
    updateClientButtons(tableId, nextPlayer);
  }

  return 0;
}

function disconnectHandler(io, socket, reason) {
  console.log(`${socket.id} disconnected for reason ${reason}`);
  const tableId = socketToTable[socket.id];
  
  if(!tableId) return -1;

  console.log(`${socket.id} was part of table ${tableId}`);
  const table = tables[tableId];
  const nextPlayer = table.removePlayer(socket.id);
  delete socketToTable[socket.id];

  if(table.isEmpty() === 1) {
    console.log(`${table.name} is now empty, deleting table`);
    delete tables[tableId];
    return 1;
  } else if (table.isEmpty() === 2) {
    console.log(`${table.name} no current players in round, shifting queue`);
    endRound(io, table, tableId);
    gotoNextRound(io, tableId, DELAY_BETWEEN_ROUNDS);
    return 2;
  }

  io.to(tableId).emit('render-game', table.gameFormat());

  if(table.canStartRound()) {
    startRound(io, table, tableId);
  } else if(table.state === 1) {
    if(nextPlayer) {
      updateSocketStatusInTable(io, tableId, table.players[nextPlayer].name + ' turn');
      io.sockets.sockets.get(nextPlayer).emit('take-turn');
      updateClientButtons(tableId, nextPlayerId);
    } else {
      endRound(io, table, tableId);
      gotoNextRound(io, tableId, DELAY_BETWEEN_ROUNDS);
    }
  }

  return 0;
}

function updateSocketStatusInTable(io, tableId, message) {
  io.to(tableId).emit('update-status', message);
}

function updateSocketStatus(socket, message) {
  socket.emit('update-status', message);
}

function endRound(io, table, tableId) {
  updateSocketStatusInTable(io, tableId, 'Dealers turn');
  table.dealerPlay();
  const finalPlayerStatus = table.endRound();
  
  for(const [socketId, status] of Object.entries(finalPlayerStatus)) {
    updateSocketStatus(io.sockets.sockets.get(socketId), status);
  }

  io.to(tableId).emit('render-game', table.gameFormat());
}

function gotoNextRound(io, tableId, delay) {
  setTimeout(() => {
    const table = tables[tableId];

    if(!table) return;
    
    table.nextRound();
    table.moveFromQueueToGame();
    io.to(tableId).emit('reset-ui', table.gameFormat());
    updateSocketStatusIfPushed(io, table, table.order);
    updateSocketStatusInTable(io, tableId, 'Ready up');
  }, delay)
}

function updateSocketStatusIfPushed(io, table, order) {
  order.forEach(socketId => {
    if(table.isBetPushed(socketId) > 0) {
      table.players[socketId].resetPush();
      io.sockets.sockets.get(socketId).emit('pushed');
    }
  })
}

function handlePlayerAction(socket, tableId, currentPlayer, action) {  
  const table = tables[tableId];
  
  if(action === 'hit') {
    socket.emit('canSplitOrDouble', (false, false));
    let nextPlayer = table.playerHit(socket.id);

    if(nextPlayer && currentPlayer === nextPlayer && table.isPlayerBlackjack(socket.id)) {
      return table.playerStay(socket.id);
    }

    return nextPlayer;
  } else if (action === 'stay') {
    return table.playerStay(socket.id);
  } else if (action === 'dbl-down') {         //Add a first round check
    return table.playerDoubleDown(socket.id);
  } else if (action === 'split') {
    const nextPlayerId = table.playerSplit(socket.id);
    updateClientButtons(tableId, currentPlayer);
    return nextPlayerId;
  }

  return undefined;
}

function startRound(io, table, tableId) {
  let [firstPlayerId, firstPlayerName] = table.startRound();
  io.to(tableId).emit('render-game', table.gameFormat());
  
  if(table.isPlayerBlackjack(firstPlayerId)) {
    let nextPlayerId = table.playerStay(firstPlayerId);
    if(nextPlayerId) {
      const nextPlayerName = table.players[nextPlayerId].name;
      updateSocketStatusInTable(io, tableId, `${nextPlayerName} turn`);
      io.sockets.sockets.get(nextPlayerId).emit('take-turn');
      updateClientButtons(tableId, nextPlayerId);
    } else {
      endRound(io, table, tableId);
      gotoNextRound(io, tableId, 8000);
    }
  } else {
    updateSocketStatusInTable(io, tableId, `${firstPlayerName} turn`);
    io.sockets.sockets.get(firstPlayerId).emit('take-turn');
    updateClientButtons(tableId, firstPlayerId);
  }
}

function updateClientButtons(tableId, playerId) {
  const player = tables[tableId].players[playerId];
  io.sockets.sockets.get(playerId).emit('canSplitOrDouble', player.canSplitHand(), player.canDoubleDown());
}