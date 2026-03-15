const data = require('./Tournament Games.json');

const rounds = {};
data.forEach(game => {
  const round = game.competitionRound;
  rounds[round] = (rounds[round] || 0) + 1;
});

console.log('Games per Competition Round:');
Object.keys(rounds).sort((a,b) => a-b).forEach(round => {
  console.log(`Round ${round}: ${rounds[round]} games`);
});

console.log(`\nTotal: ${data.length} games`);
