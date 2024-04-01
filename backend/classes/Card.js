/*
    class Card (value, suit, hidden = 0)

    This class represents one card in a deck. A card has
    a suit, value and a hidden flag. Value can range from 1-13
    representing all values of cards and then a card also has a
    suit that is either passed as 1,2,3, or 4. If the cards hidden
    flag is true than the toString method will return 'hidden'
*/ 
class Card {
    constructor(value, suit, hidden = 0) {
        this.suit = suit;   //1 for spade 2 for diamond 3 for club 4 for heart
        this.value = value; //Value that ranges from 1-13
        this.hidden = hidden;   //Hidden flag that decides whether or not to print the card
    }

    /*
        toString()

        This function will return the string version of the card. If the hidden
        flag is flipped then it will return hidden.
    */
    toString() {
        if(this.hidden === true)
            return `hidden`;
        
        const suitNames = {
            1: '♠',
            2: '♦',
            3: '♣',
            4: '♥'
        };

        let cardName = String(this.value);
        if(this.value === 11) {
            cardName = 'J';
        } else if (this.value === 12) {
            cardName = 'Q';
        } else if (this.value === 13) {
            cardName = 'K'
        } else if (this.value === 1) {
            cardName = 'A';
        }

        const suitName = suitNames[this.suit] || 'U';
        return `${cardName}${suitName}`;
    }
}

module.exports = Card;