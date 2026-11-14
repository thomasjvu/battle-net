const formations = [
  {enemies: ['hex', 'spark'], reward: 44, drop: 'gust'},
  {enemies: ['spark', 'spark'], reward: 46, drop: 'shotgun'},
  {enemies: ['frost', 'hex'], reward: 55, drop: 'slow'},
  {enemies: ['flare', 'spark'], reward: 57, drop: 'firewall'},
  {enemies: ['guard', 'frost'], reward: 69, drop: 'stonewall'},
  {enemies: ['flare', 'guard'], reward: 72, drop: 'meteor'}
];

export class EncounterSteps {
  constructor(random = Math.random) {
    this.random = random;
    this.remaining = 560 + random() * 620;
  }

  walk(distance, height, region) {
    if (distance <= 0) return null;
    this.remaining -= distance;
    if (this.remaining > 0) return null;
    this.remaining = 560 + this.random() * 620;
    const tier = region==='archive'?2:region==='aqueduct'?1:region==='garden'?0:height>=5?2:height>=2?1:0;
    const index = tier * 2 + Math.floor(this.random() * 2);
    return {
      ...formations[index],
      id: 'random-virus-' + index,
      name: ({garden:'Verdant Seedlings',aqueduct:'Tideglass Swarm',archive:'Archive Wisps'})[region] ?? 'Virus Encounter',
      region,
      xp: 36 + tier * 10
    };
  }
}
