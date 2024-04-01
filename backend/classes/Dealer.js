const Hand = require('./Hand');

class Dealer {
    constructor(bank = 0) {
        this.bank = bank;
        this.hand = new Hand();
    }

    recieveCard(card) {
        if(this.hand.cards.length === 0)
            card.hidden = true;
            
        this.hand.recieveCard(card);
    }

    revealHand() {
        this.hand.cards[0].hidden = false;
    }

    reset() {
        this.hand = new Hand();
    }

    format() {
        return {
            'bank': this.bank,
            'hand': this.hand.format(),
            'state': this.hand.state,
            'total': this.hand.total
        }
    }

    toString() {
        return `
        bank: ${this.bank}
        hand: ${this.hand.toString()}
        `
    }
}

module.exports = Dealer;