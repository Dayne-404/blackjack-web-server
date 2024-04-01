class Hand {
    constructor(cards = []) {
        this.cards = cards;
        this.total = this.calculateHandTotal(this.cards);
        this.state = 0; //0 for 
    }

    recieveCard(card, hidden = 0) {
        if(hidden) {
            card.hidden = hidden;
        }

        this.cards.push(card);
        this.total += this.getBlackjackCardValue(card);
        this.state = this.getHandState();
    }

    splitHand() {
        return [new Hand([this.cards[0]]), new Hand([this.cards[1]])];
    }

    canDoubleDown() {
        return this.cards.length === 2;
    }

    canSplit() {
        return this.cards.length === 2 && this.cards[0].value === this.cards[1].value;
    }

    getBlackjackCardValue(card) {
        if(card.value > 10) {
            return 10;
        } else if (card.value === 1 && (this.total + 11) < 22) {
            return 11;
        }

        return card.value;
    }

    format() {
        let formattedCard = '[ ';
        this.cards.forEach(card => {
            formattedCard += card.toString() + ' ';
        })
        formattedCard += ']'
        return formattedCard;
    }

    getHandState() {
        if(this.total > 21) {
            return 1;
        } else if (this.total === 21) {
            return 2;
        }

        return 0;
    }

    calculateHandTotal(hand) {
        if(hand != null || hand.length > 0) {
            return hand.reduce((total, card) => total + card.value, 0);
        } 
        
        return 0;
    }
}

module.exports = Hand;