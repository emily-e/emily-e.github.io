'use strict';

const Rooms = {
};

const Directions = {
	WEST: 'ff0001',
	NORTH: 'ff0011',
	EAST: 'ff0021',
	SOUTH: 'ff0031',
	SPECIAL_1: 'ff0041',
	SPECIAL_2: 'ff0051',
	SPECIAL_3: 'ff0061',
	SPECIAL_4: 'ff0071',
	SPECIAL_5: 'ff0081',
	SPECIAL_6: 'ff0091',
	SPECIAL_7: 'ff00a1',
	SPECIAL_8: 'ff00b1',
	DEATH: 'ff00ff'
};
Object.freeze(Directions);

function ColorMessages() {
	this['000000'] = function(p) {
		console.log('STOP');
		return p.stop(this);
	};
	this['5fcde4'] = function(p) {
		return p.wade(this);
	};
	this['5b6ee1'] = function(p) {
		return p.swim(this);
	};
	this['76428a'] = function (p) {
		return p.fall(this);
	};
	this[Directions.DEATH] = function(p) {
		return p.kill(this, 0);
	};

	this[Directions.WEST] = function(p) {
		console.log('GO WEST');
		return p.go(this, 'west');
	};
	this[Directions.NORTH] = function(p) {
		return p.go(this, 'north');
	};
	this[Directions.EAST] = function(p) {
		console.log('GO EAST');
		return p.go(this, 'east');
	};
	this[Directions.SOUTH] = function(p) {
		return p.go(this, 'south');
	};
}



function Room(name) {
	this.name = name;
	this.spritesheet = name;
	Rooms[name] = this;
	this.currentState = '';
	this.nextState = '';
	this.states = {};
	this.colorToMessage = new ColorMessages();
	this.connections = {};
	this.landing = {};
	this.contains = [];
	let removeList = [];

	this.addTrait = function(trait) {
		return trait(this);
	};

	this.loadAssets = function() { return true; }

	this.setAnimation = function(container) {
		this.currentState = this.nextState;
		const state = this.states[this.currentState];
		console.log(this);
		Object.keys(state.layers)
			.forEach(z => {
				state.layers[z].play();
				container.addChild(state.layers[z]);
			});
		//console.log('setting up room');
		this.contains.forEach(obj => obj.display(container, true));
	};

	this.updateAnimations = function(container) {
		if(this.nextState != this.currentState) {
			container.removeChildren();
			this.setAnimation(container);
		} else {
			//console.log('updating room');
			removeList.forEach(obj => obj.removeDisplay(container));
			removeList = [];
			this.contains.forEach(obj => obj.display(container, true));
		}
	};

	this.removeObject = function(obj) {
		removeList.push(obj);
		const idx = this.contains.lastIndexOf(obj);
		if(idx >= 0) {
			this.contains.splice(idx, 1);
		}
	}

	/**
		@param obj Object to move.
		@param currentRoom The room (object) the object is in.
		@param travelling The string name of the "direction" the object is travelling in.
	*/
	this.moveTo = function (obj, currentRoom, travelling) {
		console.log(currentRoom);
		currentRoom.removeObject(obj);
		const objMap = obj.states[obj.currentState].map;
		const roomMap = this.states[this.currentState].map;
		console.log(objMap);
		console.log(roomMap);
		const xCenter = Math.floor(objMap.width * objMap.x);
		const yCenter = Math.floor(objMap.height * objMap.y);
		if(travelling in currentRoom.landing) {
			obj.x = currentRoom.landing[travelling].x;
			obj.y = currentRoom.landing[travelling].y;
		} else {
			console.log('to do');
		}
		console.log(obj);
		console.log('new x y ' + obj.x + ', ' + obj.y);
		this.contains.push(obj);
		obj.setLocation(this);
	};

	this.as = function (description) {
		this.longDescription = description;
		return this;
	};

	this.getDescription = function() {
		return ('longDescription' in this) ? this.longDescription : '';
	}

	this.with = function (travel) {
		Object
			.keys(travel)
			.forEach(direction => {
				const val = travel[direction];
				if('dest' in val) {
					this.connections[direction] = val.dest;
					this.landing[direction] = { x: val.x, y: val.y };
				} else {
					this.connections[direction] = val;
				}
			});
		return this;
	};

	this.having = function (gameObj) {
		gameObj.setLocation(this);
		this.contains.push(gameObj);
		return this;
	};
}



function ContainerRoom(name) {
	Room.call(this, name);

	this.moveTo = function (obj, currentRoom, travelling) {
		currentRoom.removeObject(obj);

	};

	this.look_away = function(actor) {
		actor.hold_end();
	};

	this.look_inside = function(actor) {
		actor.hold_position();
	};
}



function InventoryRoom(name) {
	Room.call(this, name);

	this.loadAssets = function() { return false; }
	this.moveTo = function (obj, currentRoom, travelling) {
		console.log(currentRoom);
		currentRoom.removeObject(obj);
		this.contains.push(obj);
		obj.x = 0;
		obj.y = 0;
		obj.setLocation(this);
		console.log(this.contains);
	}
}


/*
	This is a "non-interactive" room designed to play a cutscene animation.
	I don't really have an idea for how to implement this yet, so for now it's a placeholder.
*/
function CutSceneRoom(name) {
	Room.call(this, name);
}

function OutdoorRoom(gameData, timeOfDay) {
	if(arguments.length < 2) { timeOfDay = 'time-of-day'; }
	return room => {
		const watcher = {
			notify: (key, value) => { if(key == timeOfDay) { room.nextState = value; }}
		};
		const currentTime = gameData.watch(timeOfDay, watcher);
		watcher.notify(timeOfDay, currentTime);
		return room;
	};
}

