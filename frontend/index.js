import * as menu from "./views/menu.js";
import * as blackjack from "./views/game.js";

const socket = io();

const mainMenu = document.getElementById('main-menu');
const gameView = document.getElementById('game-view');

const table = document.getElementById('room-selection-table');
const modal = document.getElementById('modal-container');
const roomNameContainer = document.getElementById('room-name-container');

const playersContainer = document.getElementById('players-container');
const buttonsContainer = document.getElementById('button-container');
const betInputContainer = document.getElementById('bet-input-container');
const betInput = document.getElementById('bet-input');
const statusText = document.getElementById('status-text');
const readyButton = document.getElementById('ready-btn');

const hitButton = document.getElementById('hit-btn');
const stayButton = document.getElementById('stay-btn');
const dblDownButton = document.getElementById('dbl-down-btn');
const splitButton = document.getElementById('split-btn');

//Buttons
readyButton.addEventListener('click', () => {
    let bet = betInput.value;
    socket.emit('player-ready', bet);
});

hitButton.addEventListener('click', () => socket.emit('play-turn', 'hit'));
stayButton.addEventListener('click', () => socket.emit('play-turn', 'stay'));
dblDownButton.addEventListener('click', () => socket.emit('play-turn', 'dbl-down'));
splitButton.addEventListener('click', () => socket.emit('play-turn', 'split'));

//Main Menu UI Rendering
menu.initRoomSelect(socket, mainMenu, table, modal, roomNameContainer); //Will come back to make this more readable later
socket.on('send-table-data', (serverRooms) => { 
    console.log('rendering tables');
    menu.renderTable(table, serverRooms); 
});

socket.on('render-menu', () => { 
    disableGameView(); 
});

//Game UI Rendering
socket.on('update-status', message => { statusText.innerText = message; });
socket.on('render-game', roomData => { blackjack.renderGame(playersContainer, roomData); });

//Changed from disable-bet-input --> pushed
socket.on('pushed', () => betInput.disabled = true);
socket.on('invalid-bet', () => {
    console.log('bet invalid');
    statusText.innerText = "Invalid bet";
    setTimeout(() => {
        if(statusText.innerText === "Invalid bet")
            statusText.innerText = "Ready up";
    }, 2000)
})

socket.on('take-turn', () => { 
    enableGameButtons(); 
    statusText.value = 'Your turn';
});
socket.on('end-turn', () => { disableGameButtons(); });

//first-turn-over
socket.on('canSplitOrDouble', (canSplit, canDoubleDown) => {
    console.log(canSplit, canDoubleDown);
    dblDownButton.disabled = !canDoubleDown;
    splitButton.disabled = !canSplit;
});

socket.on('joined-table', (roomData) =>  {
    blackjack.renderGame(playersContainer, roomData);
    buttonsContainer.style.display = 'none';
    statusText.innerText = "Ready up";
    enableBetInputContainer();
    enableGameView();
});

socket.on('joined-queue', (roomData) => {
    blackjack.renderGame(playersContainer, roomData);
    disableBetInputContainer();
    statusText.innerText = "Joined queue";
    enableGameView();
});

socket.on('ready-recieved', () => {
    statusText.innerText = "Waiting for players"
    disableBetInput();
});

//Changed from next round to reset-UI
socket.on('reset-ui', (roomData) => {
    enableBetInputContainer();
    blackjack.renderGame(playersContainer, roomData);
});

function enableGameView() {
    mainMenu.style.display = 'none';
    gameView.style.display = 'block';
}

function disableGameView() {
    console.log('disable');
    gameView.style.display = 'none';
    mainMenu.style.display = 'block';
}

function enableBetInputContainer() {
    readyButton.disabled = false;
    readyButton.style.display = 'inline'
    betInput.disabled = false;
    betInputContainer.style.display = 'block';
    betInput.value = '';
}
    
function disableBetInputContainer() {
    readyButton.disabled = true;
    readyButton.style.display = 'none'
    betInput.disabled = true;
    betInputContainer.style.display = 'none';
}

function disableBetInput() {
    readyButton.disabled = true;
    readyButton.style.display = 'none'
    betInput.disabled = true;
}

function enableBetInput() {
    readyButton.disabled = false;
    readyButton.style.display = 'inline'
    betInput.disabled = false;
}
    
function disableGameButtons() {
    buttonsContainer.style.display = 'none';
    hitButton.disabled = true;
    stayButton.disabled = true;
    dblDownButton.disabled = true;
    splitButton.disabled = true;
}

function enableGameButtons() {
    buttonsContainer.style.display = 'block'
    hitButton.disabled = false;
    stayButton.disabled = false;
    dblDownButton.disabled = false;
    splitButton.disabled = false;
}




