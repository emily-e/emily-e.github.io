'use strict';

const GameObjects = {
}


function GameObject(name) {
	this.name = name;
	this.spritesheet = name;
	GameObjects[name] = this;
	this.nextState = '';
	this.currentState = '';
	this.states = {};
	this.colorToMessage = new ColorMessages();
	this.x = 0;
	this.y = 0;
	this.dx = 0;
	this.dy = 0;
	this.carryable = true;
	this.canUse = false;
	this.displayName = name;
	this.displayState = '';

	this.addTrait = function(trait) {
		return trait(this);
	};

	this.getDescription = function() {
		return ('longDescription' in this) ? this.longDescription : this.displayName;
	};
	this.getDisplayName = function() {
		return this.displayName;
	};
	this.getIcon = function() {
		return ('icon' in this.states) ? this.states.icon : drawUnknownIcon();
	};

	this.isCarryable = function(status) {
		if(arguments.length > 0) { this.carryable = status; }
		return this.carryable;
	};
	this.isUsable = function() {
		return this.canUse;
	};

	this.usable = function(status) {
		this.canUse = status;
		return this;
	};
	this.as = function (description) {
		this.longDescription = description;
		return this;
	};
	this.aka = function (name) {
		this.displayName = name;
		return this;
	};
	this.setXY = function(x, y) {
		this.x = x;
		this.y = y;
		return this;
	};
	this.setState = function (state) {
		this.nextState = state;
		return this;
	};

	this.setLocation = function (room) {
		this.currentRoom = room;
	};

	this.calculateState = function() { return this.nextState; }

	this.removeDisplay = function(container) {
		if(this.currentState in this.states) { 
			const state = this.states[this.currentState];
			Object.keys(state.layers)
				.forEach(z => {
					container.removeChild(state.layers[z]);
				});
			// container.removeChild(oldState.map.sprite);
		}
	};

	this.display = function (container, refresh) {
		let newState = this.calculateState();
		if(refresh || (newState != this.currentState)) {
			const newStateObj = this.states[newState];
			this.removeDisplay(container);
			Object.keys(newStateObj.layers)
				.forEach(z => {
//						console.log(z);
//						console.log(newStateObj);
						newStateObj.layers[z].x = this.x;
						newStateObj.layers[z].y = this.y;
						newStateObj.layers[z].zIndex = parseInt(this.y) + parseInt(z);
						newStateObj.layers[z].play();
						container.addChild(newStateObj.layers[z]);
				});
			this.currentState = newState;
		}

		const state = this.states[this.currentState];
		Object.keys(state.layers)
			.forEach(z => {
				state.layers[z].x = this.x;
				state.layers[z].y = this.y;
				state.layers[z].zIndex = parseInt(this.y) + parseInt(z);
		});
/*
		state.map.sprite.alpha = 0.5;
		state.map.sprite.x = this.x;
		state.map.sprite.y = this.y;
		state.map.sprite.zIndex = this.y + 1;
		container.addChild(state.map.sprite);*/
	};
}

function Player(name) {
	GameObject.call(this, name);
	this.inventory = new InventoryRoom(name + '.inventory');
	this.path = [];

	this.turn = function() {
		this.x += this.dx;
		this.y += this.dy;
		if(this.path.length > 1) {
			const pt = this.path.shift();
			this.dx = pt.x - this.x;
			this.dy = pt.y - this.y;
		} else if(this.path.length == 1) {
			this.path = [];
			this.dx = 0;
			this.dy = 0;
		}
	};

	this.isCarryable = function(status) { return false; }
	this.stop = function (sender) {
		console.log(this);
		this.path = [];
		this.dx = 0;
		this.dy = 0;
		return true;
	};
	this.wade = function (sender) {
		return false;
	};
	this.swim = function (sender) {
		return false;
	};
	this.goWest = function (sender) {
		console.log('west!');
		this.path = [];
		this.dx = 0;
		this.dy = 0;
		console.log(this.currentRoom.connections);
		if('west' in this.currentRoom.connections) {
			const newRoom = Rooms[this.currentRoom.connections.west];
			newRoom.moveTo(this, this.currentRoom, 'west');
		}
		return true;
	};
	this.goNorth = function (sender) {
		console.log('north!');
		this.path = [];
		this.dx = 0;
		this.dy = 0;
		return true;
	};
	this.goEast =function (sender) {
		console.log('east!');
		this.path = [];
		this.dx = 0;
		this.dy = 0;
		console.log(this.currentRoom.connections);
		if('east' in this.currentRoom.connections) {
			const newRoom = Rooms[this.currentRoom.connections.east];
			newRoom.moveTo(this, this.currentRoom, 'east');
		}
		return true;
	};
	this.goSouth = function (sender) {
		console.log('south!');
		this.path = [];
		this.dx = 0;
		this.dy = 0;
		return true;
	};

	this.fallState = false;
	this.fallCount = 0;
	this.fall = function (sender) {
		if(this.fallState) {
			this.fallState = true;
			this.fallCount = 0;
		} else if (this.fallcount > 44) {
			console.log('player fell too far.');
		} else {
			this.fallCount += 4;
		}
		this.dx = 0;
		this.dy = 4;
		return true;
	};

	this.calculateState = function() {
		if((this.dx == 0) && (this.dy == 0)) {
			return 'stand';
		} else {
			return 'walk';
		}
	};
}



/**********
Traits
**********/

function Key(obj) {
	obj.use_activate = function() {
		console.log('key activate');
	};
	obj.use_deactivate = function() {
		console.log('key deactivate');
	};
	obj.use_target = function(x,y) {
		console.log('key target ' + x +', ' + y);
		return false;
	};
	return obj;
}

function Stackable(obj) {
	return obj;
}

function Lock(obj) {
	return obj;
}
