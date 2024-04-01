let selectedRoom = null;
let socket = null; //Change this later to a better solution

export function hideAllMenuElements() {
    mainMenu.style.display = 'none';
}

export function initRoomSelect(clientSocket, menuContainer, table, modal, roomNameContainer) {
    socket = clientSocket;
    menuContainer.style.display = 'block';
    modal.style.display = 'none';
    console.log('fetch table data');
    socket.emit('fetch-table-data');
    document.getElementById('create-room-btn').addEventListener('click', event => createPressed(modal, roomNameContainer));
    document.getElementById('join-btn').addEventListener('click', event => joinPressed(table, modal, roomNameContainer));
    document.getElementById('refresh-btn').addEventListener('click', refreshPressed);

    document.addEventListener('click', event => documentClickHandler(event, table, modal));

    table.addEventListener('click', event => { setSelectedTableRow(table, event); });
    table.addEventListener('dblclick', event => {
        setSelectedTableRow(table, event);
        joinPressed(table, modal, roomNameContainer);
    });

    modal.addEventListener('submit', event => {
        event.preventDefault();
        const username = document.getElementById('username-input').value;
        const bank = document.getElementById('bank-input').value;
        
        if(roomNameContainer.style.display === 'none') {
            joinRoom(username, bank, selectedRoom);
        } else {
            const roomName = document.getElementById('room-name-input').value;
            createRoom(roomName, username, bank);
        }
            
        roomNameContainer.style.display = 'none';
        modal.style.display = 'none';
    });
    
    modal.querySelector('#cancel-btn').addEventListener('click', event => {
        modal.querySelectorAll('input').forEach((input) => {
            input.value = '';
        })
        roomNameContainer.style.display = 'none';
        modal.style.display = 'none';
    });
}

function documentClickHandler(event, table, modal) {
    const target = event.target;
    if (target.tagName.toLowerCase() === 'button' || modal.style.display === 'block') {
        return;
    }

    if (!target.closest('#room-selection-table')) {
        const selectedRow = table.querySelector('#table-row-selected');
        if (selectedRow) {
            selectedRow.removeAttribute('id');
        }
    }
}

function createPressed(modal, roomNameContainer) {
    console.log('Activating room/player creation modal');
    roomNameContainer.style.display = 'flex';
    modal.style.display = 'block';
}

function joinPressed (table, modal, roomNameContainer) {
    const selectedRow = table.querySelector('#table-row-selected');
    let roomId = null;
    
    if(!selectedRow) {
        console.log('ERR: User has not selected a room');
        return;
    }

    roomId = selectedRow.dataset.id;
    
    if(!roomId) {
        console.log('ERR: Room not found unable to join..');
        return;
    } 

    console.log('Activating player creation modal');
    selectedRoom = selectedRow.dataset.id;
    roomNameContainer.style.display = 'none';
    modal.style.display = 'block';
}

function refreshPressed() {
    console.log('requesting room data');
    socket.emit('fetch-table-data');
}

function createRoom(roomName, playerName, playerBank) {
    console.log(`Attempting to create room with name=${roomName}`);
    socket.emit('create-table', roomName, playerName, playerBank);
}

function joinRoom(playerName, playerBank, roomId) {
    console.log(`Attempting to join room with id=${roomId}`);
    socket.emit('join-table', roomId, playerName, playerBank);
}

export function renderTable(table, rooms = null) {
    const tbody = table.querySelector('tbody');
    if(!tbody) return;

    tbody.innerHTML = '';

    if(rooms === null || rooms.length === 0) {
        tbody.textContent = 'No rooms avalible';
        return;
    }

    let nameCell, playersCell, privateCell;

    Object.entries(rooms).forEach(([roomId, room]) => {
        let newRow = document.createElement('tr');
        newRow.setAttribute('data-id', roomId);
        nameCell = document.createElement('td');
        playersCell = document.createElement('td');
        privateCell = document.createElement('td');

        nameCell.textContent = room.name;
        playersCell.textContent = `${room.currentPlayers} / ${room.maxPlayers}`;
        privateCell.textContent = room.private;

        newRow.append(nameCell, playersCell, privateCell);
        
        if(room.full) {
            newRow.classList.add('unavalible');
        }
        
        tbody.appendChild(newRow);
    });
}

function setSelectedTableRow(table, event) {
    const targetRow = event.target.closest('tr');
    const tbody = table.querySelector('tbody');

    if(!targetRow || !table.contains(targetRow) || !tbody.contains(targetRow)) return;

    const selectedRow = table.querySelector('#table-row-selected');
    if(selectedRow) {
        selectedRow.removeAttribute('id');
    }
    targetRow.setAttribute('id', 'table-row-selected');
}
