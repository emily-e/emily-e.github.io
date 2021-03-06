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

	this.use = function(uiChrome, actor) { };

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
	let hold = false;

	this.turn = function() {
		if(hold) {
			this.path = [];
			this.dx = 0;
			this.dy = 0;
		} else {
			this.x += this.dx;
			this.y += this.dy;
			const map = this.currentRoom.states[this.currentRoom.currentState].map;
			if(this.x < 0) { this.x = 0; }
			if(this.x >= map.width) { this.x = map.width - 1; }
			if(this.y < 0) { this.y = 0; }
			if(this.y >= map.height) { this.y = map.height - 1; }
			if(this.path.length > 1) {
				const pt = this.path.shift();
				this.dx = pt.x - this.x;
				this.dy = pt.y - this.y;
			} else if(this.path.length == 1) {
				this.path = [];
				this.dx = 0;
				this.dy = 0;
			}
		}
	};

	this.hold_end = function() { hold = false; }
	this.hold_position = function() { hold = true; }
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
	this.go = function (sender, direction) {
		console.log(direction);
		this.path = [];
		this.dx = 0;
		this.dy = 0;
		console.log(this.currentRoom.connections);
		if(direction in this.currentRoom.connections) {
			const newRoom = Rooms[this.currentRoom.connections[direction]];
			newRoom.moveTo(this, this.currentRoom, direction);
		}
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
	obj.unlocks = [];
	obj.use_activate = function(actor, uiChrome) {
		console.log('key activate');
		return true;
	};
	obj.use_deactivate = function(actor, uiChrome) {
		console.log('key deactivate');
	};
	obj.use_target = function(actor, uiChrome, x,y) {
		console.log('key target ' + x +', ' + y);
		findObjectsWithOverlap(actor, 'use', x,y,
			gameObj => {
				let flag = false;
				console.log(gameObj);
				this.unlocks.forEach(lock => {
					if(flag) { return; }
					if(gameObj == GameObjects[lock.name]) {
						flag = true;
						const status = gameObj.lock_status();
						const newStatus = gameObj.lock_unlock(obj);
						this.use(uiChrome, actor, obj);
						if(newStatus == 'locked') {
							if(status == 'locked') {
								uiChrome.dialog(lock.nothing);
							} else {
								uiChrome.dialog(lock.lock);
							}
						} else {
							if(status == 'locked') {
								uiChrome.dialog(lock.unlock);
							} else {
								uiChrome.dialog(lock.nothing);
							}
						}
					}
				});
				return flag;
			});
		return false;
	};
	obj.key_unlocks = function(lock) {
		this.unlocks.push({ name: lock.name, unlock: lock.unlock, lock: lock.lock, nothing: lock.nothing });
		return this;
	};
	return obj;
}

function Lock(obj) {
	obj.locked = 'locked';
	obj.lock_unlock = function(key) {
		console.log(key);
		console.log('unlock');
		this.locked = (this.locked == 'locked') ? 'unlocked' : 'locked';
		console.log(this.locked);
		return this.locked;
	};
	obj.lock_status = function() { return this.locked; };
	return obj;
}

function Openable(obj) {
	obj.setState('closed');
	obj.open = function() {
		if(obj.currentState == 'closed') {
			if(('locked' in obj) && (obj.locked == 'locked')) {
				return false;
			}
			obj.setState('open');
		} else {
			obj.setState('closed');
		}
			return true;
	}
	return obj;
}

function Container(name) {
	return obj => {
		obj.container = new ContainerRoom(name);
		obj.look_inside = function (actor, uiChome) {
			console.log('look inside');
			const currentRoom = actor.currentRoom;
			
			const action = {
				asset: uiChrome.getIconAsset('return'),
				activate: () => {
					// to do
					actor.currentRoom = currentRoom;
					obj.container.look_away(actor);
					uiChrome.removeAction(action);
					return false;
				},
				deactivate: () => {},
				target: (x,y) => { return false; }
			};
			uiChrome.addAction(action);
			obj.container.look_inside(actor);
			actor.currentRoom = obj.container;
		};
		return obj;
	};
}

function Stackable(obj) {
	obj.stack_count = 0;

	obj.getDisplayName = function() {
		return this.displayName + ' (' + this.stack_count + ')';
	};

	obj.setLocation = function (room) {
		const zero = [];
		console.log('Moving to Location');
		console.log(obj);
		console.log('this');
		console.log(this);
		room.contains.forEach((gameObj, idx) => {
			console.log(gameObj);
			console.log(idx);
			if(	(gameObj != this) &&
					(gameObj.name == obj.name) &&
					(gameObj.x == this.x) &&
					(gameObj.y == this.y)) {
				
				gameObj.stack_count += this.stack_count;
				this.stack_count = 0;
			}
			if(gameObj.stack_count == 0) {
				zero.push(idx);
			}
		});
		console.log(zero);
		while(zero.length > 0) {
			room.contains.splice(zero.pop(), 1);
		}
		this.currentRoom = room;
	};

	obj.create_instance = function(count) {
		if(arguments.length < 1) { count = 1; }
		const childObject = Object.assign({}, obj);
		Object.setPrototypeOf(childObject, obj)
		childObject.stack_count = count;
		return childObject;
	}
	return obj;
}
