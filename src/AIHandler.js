const HexAPI = require("./HexAPI");
const AbilityCalculator = require("./AbilityCalculator");
const AIDirectives = require("./AIDirectives");
const TurnHandler = require("./TurnHandler");

//Needs to be in the the database in the future
const AI_NATURES = {
  "Zombieish": {
		"directives": {
			"start": {
				"action": ["logSelf"],
				"onSuccess": "findEnemy",
				"onFail": "endTurn"
			},
			"findEnemy": {
				"action": ["getEnemy"],
				"onSuccess": "attack",
				"onFail": "endTurn"
			},
			"attack": {
				"action": ["attackWithFirst"],
				"onSuccess": "attack",
				"onFail": "moveToEnemy"
			},
			"moveToEnemy": {
				"action": ["moveToTarget"],
				"onSuccess": "attack",
				"onFail": "endTurn"
			},
			"endTurn": {
				"action": ["endTurn"],
				"onSuccess": "endAI"
			}
		}
	}
}

class AIHandler {
  constructor(battle,onEnd){
    this.battle = battle;//do not mutate ?
    this.unit = this.battle.units[this.battle.activeUnit];
    this.nature = this.unit.AINature || "Zombieish";
    this.onDirective = AI_NATURES[this.nature].directives.start;
    this.directiveData = {};// a mutable object to place info needed to be carried
    this.resultsData = [];
    this.onEnd = onEnd;
  };

  runAI(){
    this.doDirective();
  };

  endAI(){
    this.onEnd(this.resultsData);
  };

  doDirective(){
    this.directiveData.action = 0;
    var dir = this.onDirective.action[this.directiveData.action];

    if(dir === "endTurn"){
      this.endAI();
    } else if(AIDirectives.hasOwnProperty(dir)){
      var results = AIDirectives[dir](this.battle,this.directiveData);
      if(results.results === "success"){
        if(results.data){
          this.resultsData.push(results.data);
        }
        this.onDirective = AI_NATURES[this.nature].directives[this.onDirective.onSuccess]
      } else {
        this.onDirective = AI_NATURES[this.nature].directives[this.onDirective.onFail]
      }
      this.doDirective();
    } else {
      console.log('AI DIRECTIVE NOT FOUND');
      this.endAI();
    }

  };

  /*Directives */

}

module.exports = AIHandler;
