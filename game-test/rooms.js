'use strict';

const Rooms = {
};

const ColorMessages = {
	'000000': function(p) {
		console.log('STOP');
		return p.stop(this);
	},
	'5fcde4': function(p) {
		return p.wade(this);
	},
	'5b6ee1': function(p) {
		return p.swim(this);
	},
	'76428a': function (p) {
		return p.fall(this);
	},
	'ff0001': function(p) {
		console.log('GO WEST');
		return p.goWest(this);
	},
	'ff0011': function(p) {
		return p.goNorth(this);
	},
	'ff0021': function(p) {
		console.log('GO EAST');
		return p.goEast(this);
	},
	'ff0031': function(p) {
		return p.goSouth(this);
	}
}



function Room(name) {
	this.name = name;
	this.spritesheet = name;
	Rooms[name] = this;
	this.currentState = '';
	this.states = {};
	this.colorToMessage = ColorMessages;
	this.connections = {};
	this.contains = [];
	this.removeList = [];

	this.loadAssets = function() { return true; }

	this.setAnimation = function(container) {
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
		//console.log('updating room');
		this.removeList.forEach(obj => obj.removeDisplay(container));
		this.contains.forEach(obj => obj.display(container, true));
	};

	this.removeObject = function(obj) {
		this.removeList.push(obj);
		const idx = this.contains.lastIndexOf(obj);
		if(idx >= 0) {
			this.contains.splice(idx, 1);
		}
	}

	/**
		@param obj Object to move.
		@param currentRoom The room (object) the object is in.
		@param travelling The string name of the "direction" the object is travelling in.
		@param roomName The string name of the destination room the object is being moved into.
	*/
	this.moveTo = function (obj, currentRoom, travelling, roomName) {
		console.log(currentRoom);
		currentRoom.removeObject(obj);
		const objMap = obj.states[obj.currentState].map;
		const roomMap = this.states[this.currentState].map;
		console.log(objMap);
		console.log(roomMap);
		const xCenter = Math.floor(objMap.width * objMap.x);
		const yCenter = Math.floor(objMap.height * objMap.y);
		switch (travelling) {
			case 'east':
				obj.x = (objMap.width - xCenter) + 2;
				obj.y = (roomMap.height  - 6) - (objMap.height - yCenter);
				break;
			case 'west':
				obj.x = (roomMap.width - 2) - (objMap.width - xCenter);
				obj.y = (roomMap.height  - 6) - (objMap.height - yCenter);
				break;
			case 'north':
				break;
			case 'south':
				break;
			default:
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
		if('west' in travel) {
			this.connections.west = travel.west;
		} else if('east' in travel) {
			this.connections.east = travel.east;
		} else if('north' in travel) {
			this.connections.north = travel.north;
		} else if('south' in travel) {
			this.connections.south = travel.south;
		}
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

	this.priorRoom = [];

	this.moveTo = function (obj, currentRoom, travelling, roomName) {
		currentRoom.removeObject(obj);
		this.priorRoom.push({ obj: obj, x: obj.x, y: obj.y, room: currentRoom });

	}
}



function InventoryRoom(name) {
	Room.call(this, name);

	this.loadAssets = function() { return false; }
	this.moveTo = function (obj, currentRoom, travelling, roomName) {
		console.log(currentRoom);
		currentRoom.removeObject(obj);
		this.contains.push(obj);
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
