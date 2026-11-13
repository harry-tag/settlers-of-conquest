// ---------- constants & tunable configuration ----------
const RES = ['wood', 'brick', 'wheat', 'sheep', 'ore'];
const RINFO = { wood: 'Wood', brick: 'Brick', wheat: 'Wheat', sheep: 'Wool', ore: 'Ore' };
const TERR = {
  forest: { res: 'wood', name: 'Forest' }, hills: { res: 'brick', name: 'Hills' }, fields: { res: 'wheat', name: 'Fields' },
  pasture: { res: 'sheep', name: 'Pasture' }, mountain: { res: 'ore', name: 'Mountains' }, desert: { res: null, name: 'Desert' }
};

const DEFAULTS = {
  vpTarget: 12, hexesPerVP: 4,
  townYieldPerPop: 3, campBaseYield: 2, campSoldiersPerExtra: 2, campMaxYield: 5,
  musterBase: 1, musterPopPer: 3, maxPop: 4, granaryPopBonus: 1, growCostScale: 1, captureLosesPop: 1, settlerCost: 1,
  troopMove: 3, convoyRange: 2, roadMult: 2, forestMoveCost: 2, pastureMoveBonus: 1, pastureConvoyBonus: 1, convoysPerHolding: 1,
  atkDiceMax: 3, defDiceMax: 2, mountainDefBonus: 1, hillsDefDice: 1, forestAtkDicePenalty: 1, fieldsAtkBonus: 1,
  wallMilitia: 2, wallDefDice: 1, palisadeMilitia: 1, keepBonus: 1, desertAttrition: 1,
  scorchMin: 40, scorchMax: 90, raidThreshold: 10, raidLossPct: 50,
  bankRate: 4, harborRate: 3, brickworksDiscount: 1,
  wildYieldPct: 50, fallowYieldPct: 75, cacheCap: 8,
  hungerStep: 33, starveBelow: 50, starveMaxChance: 50, foodPerSoldier: 0.5, foodPerTownsperson: 0.25, rationTurns: 2,
  ridgeMin: 1, ridgeMax: 5, barbarianCamps: 4, barbMin: 2, barbMax: 4, barbLootMax: 6, startSoldiers: 2, startStockEach: 2,
  aiAttackRatio: 1.5, aiScorchChance: 60,
  cost: {
    recruit: { wheat: 2, sheep: 2, ore: 1 },
    grow: { wheat: 3, sheep: 2, wood: 1, brick: 1 },
    walls: { brick: 5, ore: 3, wood: 2 },
    road: { wood: 2, brick: 2 },
    town: { wood: 5, brick: 5, wheat: 3, sheep: 3 }
  }
};
const COST_NAMES = { recruit: 'Recruit soldier', grow: 'Grow town (× current size)', walls: 'Town walls', road: 'Road', town: 'Found town' };

const META = [
  ['Victory', [['vpTarget', 'Victory points to win'], ['hexesPerVP', 'Hexes held per 1 VP']]],
  ['Harvest', [['townYieldPerPop', 'Town yield per townsperson'], ['campBaseYield', 'Camp base yield'], ['campSoldiersPerExtra', 'Soldiers per +1 camp yield'], ['campMaxYield', 'Camp yield cap']]],
  ['Towns and muster', [['musterBase', 'Free soldiers per turn (base)'], ['musterPopPer', 'Townspeople per extra free soldier'], ['maxPop', 'Max town size'], ['granaryPopBonus', 'Granary bonus to max size (fields)'], ['growCostScale', 'Grow cost multiplier per size'], ['captureLosesPop', 'Townspeople lost on capture'], ['settlerCost', 'Soldiers consumed founding a town']]],
  ['Movement and supply', [['troopMove', 'Troop movement points'], ['convoyRange', 'Convoy range'], ['roadMult', 'Road speed multiplier'], ['forestMoveCost', 'Cost to enter forest'], ['pastureMoveBonus', 'Extra troop move from pasture'], ['pastureConvoyBonus', 'Extra convoy range from pasture'], ['convoysPerHolding', 'Convoys per holding per turn']]],
  ['Combat', [['atkDiceMax', 'Attacker max dice'], ['defDiceMax', 'Defender max dice'], ['mountainDefBonus', 'Mountain defender bonus (best die)'], ['hillsDefDice', 'Hills extra defender dice'], ['forestAtkDicePenalty', 'Forest attacker dice penalty'], ['fieldsAtkBonus', 'Fields attacker bonus (best die)'], ['wallMilitia', 'Walls extra militia'], ['wallDefDice', 'Walls extra defender dice'], ['palisadeMilitia', 'Palisade extra militia (forest towns)'], ['keepBonus', 'Stone keep bonus (mountain towns)'], ['desertAttrition', 'Desert attrition per turn']]],
  ['Scorched earth and raiders', [['scorchMin', 'Scorch destroys at least %'], ['scorchMax', 'Scorch destroys at most %'], ['raidThreshold', 'Raiders hit stocks above'], ['raidLossPct', 'Raiders take %']]],
  ['Trade and discounts', [['bankRate', 'Bank trade rate'], ['harborRate', 'Harbor trade rate'], ['brickworksDiscount', 'Brickworks brick discount (hill towns)']]],
  ['Wild land', [['wildYieldPct', 'Unclaimed hex stockpiles at % of a camp'], ['fallowYieldPct', 'Once-claimed empty hex stockpiles at %'], ['cacheCap', 'Largest stockpile on an empty hex']]],
  ['Food', [['foodPerSoldier', 'Food per soldier per turn'], ['foodPerTownsperson', 'Food per townsperson per turn'], ['hungerStep', 'Hunger bar lost per unfed turn (%)'], ['starveBelow', 'Starvation starts below (%)'], ['starveMaxChance', 'Death chance per unit at zero (%)'], ['rationTurns', 'Turns of rations packed by default']]],
  ['Map and start (next game)', [['ridgeMin', 'Min ridges per mountain'], ['ridgeMax', 'Max ridges per mountain'], ['barbarianCamps', 'Barbarian camps'], ['barbMin', 'Barbarian camp min size'], ['barbMax', 'Barbarian camp max size'], ['barbLootMax', 'Barbarian loot max'], ['startSoldiers', 'Starting soldiers per town'], ['startStockEach', 'Starting stock of each resource']]],
  ['Computer players', [['aiAttackRatio', 'Attack when odds at least'], ['aiScorchChance', 'Scorch chance %']]]
];

const clone = o => JSON.parse(JSON.stringify(o));
let CFG = clone(DEFAULTS);
let TEST = false;
function loadCfg() {
  CFG = clone(DEFAULTS);
  if (!TEST) return;
  try {
    const s = JSON.parse(localStorage.getItem('soc_cfg') || 'null');
    if (s) { for (const k in s) if (k !== 'cost' && k in CFG) CFG[k] = s[k]; if (s.cost) for (const b in s.cost) if (CFG.cost[b]) Object.assign(CFG.cost[b], s.cost[b]); }
  } catch (e) { }
}
function saveCfg() { if (!TEST) return; try { localStorage.setItem('soc_cfg', JSON.stringify(CFG)) } catch (e) { } }

const PCOL = [
  { c: '#d8343f', d: '#7d1620', n: 'You' }, { c: '#2f7fe6', d: '#143f7c', n: 'Admiral Azure' },
  { c: '#f0a11e', d: '#8a5606', n: 'Duchess Ember' }, { c: '#9a4fd0', d: '#4f2076', n: 'Lord Violet' }
];
const THEME = {
  mountain: { wall: '#c3c6ce', roof: '#55607a', roof2: '#6d7892', ground: '#9d9da6', names: ['Ironhold', 'Stonegate', 'Greypeak', 'Highcrag', 'Frostmere', 'Greywatch', 'Eagle Rock', 'Coldforge'] },
  forest: { wall: '#96693c', roof: '#3f5a34', roof2: '#5a4630', ground: '#7d8f58', names: ['Oakhollow', 'Elmshade', 'Thornwick', 'Greenholt', 'Pinewatch', 'Mossford', 'Briarholt', 'Wolfden'] },
  fields: { wall: '#f1e6c6', roof: '#d6a938', roof2: '#c08f2e', ground: '#d2ba6c', names: ['Goldmeadow', 'Millbrook', 'Barleyton', 'Haywick', 'Sunfield', 'Ryecross', 'Strawford', 'Amberlea'] },
  hills: { wall: '#cf7a52', roof: '#8e3b26', roof2: '#a34a30', ground: '#c09468', names: ['Redkiln', 'Claybourne', 'Brickhaven', 'Emberton', 'Rusthill', 'Tilecross', 'Potterton', 'Ochreford'] },
  pasture: { wall: '#f7f2e6', roof: '#b5412f', roof2: '#9b3a2c', ground: '#a5cc7c', names: ['Woolcombe', 'Shepton', 'Lambton', 'Fleecefold', 'Greendale', 'Ewebridge', 'Meadowick', 'Cloverlea'] },
  desert: { wall: '#e6c891', roof: '#c9a468', roof2: '#b98f55', ground: '#dcc288', names: ['Sunspire', 'Dustwell', 'Sandmere', 'Mirage', 'Saltgate', 'Dunewatch', 'Scorpia', 'Last Oasis'] }
};
