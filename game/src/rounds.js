// Match flow only: buy time, combat time, round outcomes and the first-to-three result.
// main.js owns spawning; rounds.js only advances state and reports when a round resets.
const BUY_TIME = 8;
const COMBAT_TIME = 90;
const ROUND_END_TIME = 1.6;
const WIN_TARGET = 3;

export function createRounds() {
  const state = {
    round: 0,
    playerWins: 0,
    botWins: 0,
    phase: 'idle',
    phaseTime: 0,
    roundReset: false,
    matchOver: false,
    winner: '',
    lastRoundWinner: '',
  };

  function beginRound() {
    state.round += 1;
    state.phase = 'buy';
    state.phaseTime = 0;
    state.roundReset = true;
    state.lastRoundWinner = '';
  }

  function beginMatch() {
    state.playerWins = 0;
    state.botWins = 0;
    state.matchOver = false;
    state.winner = '';
    beginRound();
  }

  function finishRound(winner) {
    state.lastRoundWinner = winner;
    if (winner === 'player') state.playerWins += 1;
    else state.botWins += 1;
    state.phase = 'roundEnd';
    state.phaseTime = 0;
  }

  function step(dt, playerAlive, botsRemaining, objectiveWinner = '', objectiveActive = false) {
    if (!state.matchOver) state.phaseTime += dt;
    if (state.phase === 'buy') {
      if (state.phaseTime >= BUY_TIME) {
        state.phase = 'combat';
        state.phaseTime = 0;
      }
      return;
    }
    if (state.phase === 'combat') {
      if (objectiveWinner) finishRound(objectiveWinner);
      else if (botsRemaining === 0) finishRound('player');
      else if (!objectiveActive && !playerAlive) finishRound('bots');
      else if (!objectiveActive && state.phaseTime >= COMBAT_TIME) finishRound('bots');
      return;
    }
    if (state.phase === 'roundEnd' && state.phaseTime >= ROUND_END_TIME) {
      if (state.playerWins >= WIN_TARGET) {
        state.matchOver = true;
        state.winner = 'player';
      } else if (state.botWins >= WIN_TARGET) {
        state.matchOver = true;
        state.winner = 'bots';
      } else {
        beginRound();
      }
    }
  }

  return {
    state,
    beginMatch,
    step,
    remainingTime() {
      if (state.phase === 'buy') return Math.max(0, BUY_TIME - state.phaseTime);
      if (state.phase === 'combat') return Math.max(0, COMBAT_TIME - state.phaseTime);
      return Math.max(0, ROUND_END_TIME - state.phaseTime);
    },
  };
}
