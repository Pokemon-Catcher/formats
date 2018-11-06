'use strict';

const Pokemon = require('./../../sim/pokemon');
const Battle = require('./../../sim/battle');
const Side = require('./../../sim/side');
exports.BattleScripts = {
	pokemon: {
			hasAbility(ability) {
			if (this.ignoringAbility()) return false;
			let ownAbility = Object.values(this.battle.getTemplate(this.speciesid).abilities);
			if (!Array.isArray(ability)) {
				for(let i in ownAbility)
				if(toId(ownAbility[i]) === toId(ability)) return 1;
				return 0;
			}
			for(let i in ownAbility)
			if(ability.map(toId).includes(toId(ownAbility[i]))) return 1;
			return 0;
		},
 		getAbility() {
			let abilities=Object.values(this.battle.getTemplate(this.speciesid).abilities);
			let fusedAbility={};
			for(let i in abilities){
				fusedAbility=Object.assign(fusedAbility, this.battle.getAbility(abilities[i]));
			}
			return fusedAbility;
		} 
	},
getRelevantEffectsInner(thing, callbackType, foeCallbackType, foeThing, bubbleUp, bubbleDown, getAll) {
	if (!callbackType || !thing) return [];
	/**@type {AnyObject[]} */
	let statuses = [];

	if (thing instanceof Battle) {
		for (let i in this.pseudoWeather) {
			let pseudoWeather = this.getPseudoWeather(i);
			// @ts-ignore
			if (pseudoWeather[callbackType] !== undefined || (getAll && thing.pseudoWeather[i][getAll])) {
				// @ts-ignore
				statuses.push({status: pseudoWeather, callback: pseudoWeather[callbackType], statusData: this.pseudoWeather[i], end: this.removePseudoWeather, thing: thing});
				this.resolveLastPriority(statuses, callbackType);
			}
		}
		let weather = this.getWeather();
		// @ts-ignore
		if (weather[callbackType] !== undefined || (getAll && thing.weatherData[getAll])) {
			// @ts-ignore
			statuses.push({status: weather, callback: weather[callbackType], statusData: this.weatherData, end: this.clearWeather, thing: thing, priority: weather[callbackType + 'Priority'] || 0});
			this.resolveLastPriority(statuses, callbackType);
		}
		let terrain = this.getTerrain();
		// @ts-ignore
		if (terrain[callbackType] !== undefined || (getAll && thing.terrainData[getAll])) {
			// @ts-ignore
			statuses.push({status: terrain, callback: terrain[callbackType], statusData: this.terrainData, end: this.clearTerrain, thing: thing, priority: terrain[callbackType + 'Priority'] || 0});
			this.resolveLastPriority(statuses, callbackType);
		}
		let format = this.getFormat();
		// @ts-ignore
		if (format[callbackType] !== undefined || (getAll && thing.formatData[getAll])) {
			// @ts-ignore
			statuses.push({status: format, callback: format[callbackType], statusData: this.formatData, end: function () {}, thing: thing, priority: format[callbackType + 'Priority'] || 0});
			this.resolveLastPriority(statuses, callbackType);
		}
		if (this.events && this.events[callbackType] !== undefined) {
			for (const handler of this.events[callbackType]) {
				let statusData;
				switch (handler.target.effectType) {
				case 'Format':
					statusData = this.formatData;
				}
				statuses.push({status: handler.target, callback: handler.callback, statusData: statusData, end: function () {}, thing: thing, priority: handler.priority, order: handler.order, subOrder: handler.subOrder});
			}
		}
		if (bubbleDown) {
			statuses = statuses.concat(this.getRelevantEffectsInner(this.p1, callbackType, null, null, false, true, getAll));
			statuses = statuses.concat(this.getRelevantEffectsInner(this.p2, callbackType, null, null, false, true, getAll));
		}
		return statuses;
	}

	if (thing instanceof Side) {
		for (let i in thing.sideConditions) {
			let sideCondition = thing.getSideCondition(i);
			// @ts-ignore
			if (sideCondition[callbackType] !== undefined || (getAll && thing.sideConditions[i][getAll])) {
				// @ts-ignore
				statuses.push({status: sideCondition, callback: sideCondition[callbackType], statusData: thing.sideConditions[i], end: thing.removeSideCondition, thing: thing});
				this.resolveLastPriority(statuses, callbackType);
			}
		}
		if (foeCallbackType) {
			statuses = statuses.concat(this.getRelevantEffectsInner(thing.foe, foeCallbackType, null, null, false, false, getAll));
			if (foeCallbackType.substr(0, 5) === 'onFoe') {
				let eventName = foeCallbackType.substr(5);
				statuses = statuses.concat(this.getRelevantEffectsInner(thing.foe, 'onAny' + eventName, null, null, false, false, getAll));
				statuses = statuses.concat(this.getRelevantEffectsInner(thing, 'onAny' + eventName, null, null, false, false, getAll));
			}
		}
		if (bubbleUp) {
			statuses = statuses.concat(this.getRelevantEffectsInner(this, callbackType, null, null, true, false, getAll));
		}
		if (bubbleDown) {
			for (const active of thing.active) {
				statuses = statuses.concat(this.getRelevantEffectsInner(active, callbackType, null, null, false, true, getAll));
			}
		}
		return statuses;
	}

	if (!(thing instanceof Pokemon)) {
		//this.debug(JSON.stringify(thing));
		return statuses;
	}
	let status = thing.getStatus();
	// @ts-ignore
	if (status[callbackType] !== undefined || (getAll && thing.statusData[getAll])) {
		// @ts-ignore
		statuses.push({status: status, callback: status[callbackType], statusData: thing.statusData, end: thing.clearStatus, thing: thing});
		this.resolveLastPriority(statuses, callbackType);
	}
	for (let i in thing.volatiles) {
		let volatile = thing.getVolatile(i);
		// @ts-ignore
		if (volatile[callbackType] !== undefined || (getAll && thing.volatiles[i][getAll])) {
			// @ts-ignore
			statuses.push({status: volatile, callback: volatile[callbackType], statusData: thing.volatiles[i], end: thing.removeVolatile, thing: thing});
			this.resolveLastPriority(statuses, callbackType);
		}
	}
	let ability = this.getAbility(thing.ability);
	// @ts-ignore
	if (ability[callbackType] !== undefined || (getAll && thing.abilityData[getAll])) {
		// @ts-ignore
		statuses.push({status: ability, callback: ability[callbackType], statusData: thing.abilityData, end: thing.clearAbility, thing: thing});
		this.resolveLastPriority(statuses, callbackType);
	}
	let abilities= Object.values(this.getTemplate(thing.speciesid).abilities);
	for(let i in abilities){
		let ability = this.getAbility(abilities[i]);
		if(!ability.id===this.getAbility(thing.ability).id)
		// @ts-ignore
		if (ability[callbackType] !== undefined || (getAll && thing.abilityData[getAll])) {
			// @ts-ignore
			statuses.push({status: ability, callback: ability[callbackType], statusData: thing.abilityData, end: thing.clearAbility, thing: thing});
			this.resolveLastPriority(statuses, callbackType);
		}
	}
	let item = thing.getItem();
	// @ts-ignore
	if (item[callbackType] !== undefined || (getAll && thing.itemData[getAll])) {
		// @ts-ignore
		statuses.push({status: item, callback: item[callbackType], statusData: thing.itemData, end: thing.clearItem, thing: thing});
		this.resolveLastPriority(statuses, callbackType);
	}
	let species = thing.baseTemplate;
	// @ts-ignore
	if (species[callbackType] !== undefined) {
		// @ts-ignore
		statuses.push({status: species, callback: species[callbackType], statusData: thing.speciesData, end: function () {}, thing: thing});
		this.resolveLastPriority(statuses, callbackType);
	}

	if (foeThing && foeCallbackType && foeCallbackType.substr(0, 8) !== 'onSource') {
		statuses = statuses.concat(this.getRelevantEffectsInner(foeThing, foeCallbackType, null, null, false, false, getAll));
	} else if (foeCallbackType) {
		let eventName = '';
		if (foeCallbackType.substr(0, 8) === 'onSource') {
			eventName = foeCallbackType.substr(8);
			if (foeThing) {
				statuses = statuses.concat(this.getRelevantEffectsInner(foeThing, foeCallbackType, null, null, false, false, getAll));
			}
			foeCallbackType = 'onFoe' + eventName;
			foeThing = null;
		}
		if (foeCallbackType.substr(0, 5) === 'onFoe') {
			eventName = foeCallbackType.substr(5);
			for (const allyActive of thing.side.active) {
				if (!allyActive || allyActive.fainted) continue;
				statuses = statuses.concat(this.getRelevantEffectsInner(allyActive, 'onAlly' + eventName, null, null, false, false, getAll));
				statuses = statuses.concat(this.getRelevantEffectsInner(allyActive, 'onAny' + eventName, null, null, false, false, getAll));
			}
			for (const foeActive of thing.side.foe.active) {
				if (!foeActive || foeActive.fainted) continue;
				statuses = statuses.concat(this.getRelevantEffectsInner(foeActive, 'onAny' + eventName, null, null, false, false, getAll));
			}
		}
		for (const foeActive of thing.side.foe.active) {
			if (!foeActive || foeActive.fainted) continue;
			statuses = statuses.concat(this.getRelevantEffectsInner(foeActive, foeCallbackType, null, null, false, false, getAll));
		}
	}
	if (bubbleUp) {
		statuses = statuses.concat(this.getRelevantEffectsInner(thing.side, callbackType, foeCallbackType, null, true, false, getAll));
	}
	return statuses;
}
};
