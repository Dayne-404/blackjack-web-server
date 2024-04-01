function getWinCondition(handState, handTotal, dealerState, dealerTotal) {
    let type = '';
    let winModifier = 0;
    let push = false;

    if (handState === 0 && dealerState === 1) {
        type = 'beat the dealer!';
        winModifier = 2;
    } else if (handState === 0 && handTotal > dealerTotal) {
        type = 'beat the dealer!';
        winModifier = 2;
    } else if (handState === 0 && handTotal === dealerTotal) {
        type = 'tied with the dealer! (bets pushed to the next round)';
        push = true;
        winModifier = 2;
    } else if (handState === 0 && handTotal < dealerTotal && dealerState === 0) {
        type = 'lost.. womp womp';
    } else if (handState === 2 && dealerState !== 2) {
        type = 'you have a blackjack! (1.5x the bet)';
        winModifier = 2.5;
    } else if (handState === 2 && dealerState === 2) {
        type = 'both you and the dealer have blackjack! (2x bets pushed to the next round)';
        push = true;
        winModifier = 2.5;
    } else if (handState === 1) {
        type = 'busts!';
    } else if (handState !== 2 && dealerState === 2) {
        type = 'lost to dealer\'s blackjack...';
    } else if (handState !== 2 && handTotal > dealerTotal) {
        type = 'beat the dealer';
        winModifier = 2;
    } else if (handState !== 2 && handTotal === dealerTotal) {
        type = 'tied with the dealer! (bets pushed to the next round)';
        push = true;
        winModifier = 2;
    } else if (handState !== 2 && (dealerState === 1 || handTotal < dealerTotal)) {
        type = 'lost.. womp womp';
    }

    return [type, winModifier, push];
}

module.exports = getWinCondition;