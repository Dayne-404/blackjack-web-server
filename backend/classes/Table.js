const getWinCondition = require('../helper/winConditions');
const Dealer = require('./Dealer');
const Deck = require('./Deck');

class Table {
    constructor(name, maxPlayers = 4) {
        this.name = name;
        this.maxPlayers = maxPlayers;
        
        this.players = {};
        this.dealer = new Dealer();
        this.deck = new Deck();

        this.turnIndex = 0;
        this.order =[]; //Have to fix this if players are added
        this.queue = [];
        this.playersReady = 0;
        this.state = 0; //0 for waiting for players to bet and ready up
    }

    nextRound() {
        this.state = 0;
        this.turnIndex = 0;
        this.playersReady = 0;
        this.dealer.reset();
        this.order.forEach(id => {
            this.players[id].reset();
        });
        this.deck.shuffle();
    }

    canStartRound() {
        return Object.keys(this.players).length > 0 &&
            Object.keys(this.players).length === this.playersReady &&
            this.state === 0; 
    }

    playerHasValidBet(playerId, bet) {
        return this.players[playerId].isValidBet(bet) && bet >= 0;
    }

    playerReady(playerId, bet) {
        const player = this.players[playerId];
        player.setBet(bet);
        player.ready = true;
        this.playersReady++;
    }

    startRound() {
        this.state = 1; //Means the game is being played
        
        this.deck.shuffle();
        for(let i = 0; i < 2; i++) {
            this.order.forEach((id) => {
                this.players[id].recieveCard(this.deck.takeCard());
            });
            this.dealer.recieveCard(this.deck.takeCard());
        }
        
        const socketId = this.order[this.turnIndex];
        const playerName = this.players[socketId].name;
        return [socketId, playerName];
    }

    endRound() {
        let playersWinType = {};
        this.order.forEach(id => {
            for(let i = 0; i < this.players[id].hand.length; i++) {
                let [winCondition, winModifier, push] = getWinCondition (
                    this.players[id].hand[i].state,
                    this.players[id].hand[i].total,
                    this.dealer.hand.state,
                    this.dealer.hand.total
                );
                
                this.players[id].push[i] = push;

                if(!push) {
                    if(winModifier === 0) {
                        this.dealer.bank += this.players[id].bet[i];
                    } else {
                        this.players[id].bet[i] *= winModifier;
                        this.players[id].bank += this.players[id].bet[0];
                    }
                }

                playersWinType[id] = winCondition;
            }
        });

        return playersWinType;
    }

    playerHit(playerId) {
        if(playerId !== this.getPlayerInTurn())
            return this.getPlayerInTurn();

        this.players[playerId].recieveCard(this.deck.takeCard());

        if(this.players[playerId].getCurrentHand().state > 0) {
            this.moveToNextPlayerOrHand(this.players[playerId]);
        }

        return this.getPlayerInTurn();
    }

    moveToNextPlayerOrHand(player) {
        if(player.hasAnotherHand()) {
            player.gotoNextHand();
        } else {
            this.turnIndex++;
        }
    }

    playerDoubleDown(playerId) {
        const currentPlayerId = this.getPlayerInTurn();

        if (playerId !== currentPlayerId)
            return currentPlayerId;
    
        const currentPlayer = this.players[playerId];

        if (currentPlayer.canDoubleDown()) {
            currentPlayer.doubleDown(this.deck.takeCard());
            this.moveToNextPlayerOrHand(currentPlayer);
        }
         
        return this.getPlayerInTurn();
    }

    playerSplit(playerId) {
        const currentPlayerId = this.getPlayerInTurn();

        if (playerId !== currentPlayerId)
            return currentPlayerId;

        const currentPlayer = this.players[playerId];

        if (currentPlayer.canSplitHand()) {
            currentPlayer.split(this.deck.takeCard(), this.deck.takeCard());
        } 

        return this.getPlayerInTurn();
    }

    playerStay(playerId) {
        if(playerId !== this.getPlayerInTurn())
            return this.getPlayerInTurn();
        this.moveToNextPlayerOrHand(this.players[playerId]);
        return this.getPlayerInTurn();
    }

    isPlayerBlackjack(playerId) {
        if(!this.players[playerId]) 
            return false;
        return this.players[playerId].getCurrentHand().state;
    }

    dealerPlay() {
        this.dealer.revealHand();

        while(this.dealer.hand.total < 17 && this.dealer.hand.state === 0) {
            this.dealer.recieveCard(this.deck.takeCard());
        }
    }

    getPlayerInTurn() {
        return this.order[this.turnIndex];
    }

    addPlayer(socketId, player) {
        if(!this.isFull()) {
            this.players[socketId] = player;
            this.order.push(socketId);
        }
    }

    addPlayerToQueue(socketId, player) {
        if(!this.isFull()) {
            this.players[socketId] = player;
            this.queue.push(socketId);
        }
    }

    moveFromQueueToGame() {
        while (this.queue.length > 0) {
            this.order.push(this.queue.shift());
        }
    }

    removePlayer(socketId) {
        let removeIndex = this.queue.indexOf(socketId);

        if(this.queue.includes(socketId) && removeIndex > -1) {
            this.queue.splice(removeIndex, 1);
            delete this.players[socketId];
            return this.getPlayerInTurn();
        }

        removeIndex = this.order.indexOf(socketId);

        if(this.players[socketId].ready) {
            this.playersReady--;
        }
        
        this.dealer.bank += this.players[socketId].reduceBets();
        delete this.players[socketId];
        
        if(this.turnIndex && removeIndex < this.turnIndex) {
            this.turnIndex--;
        }
        
        if(removeIndex > -1) {
            this.order.splice(removeIndex, 1);
        }

        return this.getPlayerInTurn();
    }

    isBetPushed(playerId) {
        return this.players[playerId].bet[0] > 0
    }

    menuFormat() {
        return {
            'name': this.name,
            'currentPlayers': Object.keys(this.players).length,
            'maxPlayers': this.maxPlayers,
            'full': this.isFull(),
            'private': false,
        };
    }

    gameFormat() {
        let formattedPlayers = [];
        this.order.forEach(key => {
            formattedPlayers.push(this.players[key].format());
        });
        
        return {
            'name': this.name,
            'players': formattedPlayers,
            'dealer': this.dealer.format(),
        };
    }

    isFull() {
        if(Object.keys(this.players).length >= this.maxPlayers)
            return true;

        return false;
    }

    isEmpty() {
        if(this.order.length === 0 && this.queue.length === 0) return 1
        else if (this.order.length === 0 && this.queue.length > 0) return 2

        return 0;
    }
}

module.exports = Table;