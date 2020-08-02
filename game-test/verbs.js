'use strict';

const Verbs = {
};

function Verb(verb, actor) {
	this.actor = actor;
	this.name = verb
	Verbs[verb] = this;
	this.available = true;

	this.activate = function () {
		console.log('on');
		return true;
	};

	this.deactivate = function () {
		console.log('off');
		return true;
	};

	this.target = function (x, y) {
		return false;
	};
}

const verbColors = {
	'6abe30': function(p) {
		console.log('VERB');
	},
	'ff00ff': function(p) {
		// this color is a "teleport to" color.
	}
};

const pixelMap = {
	pixels: [ 0,0,0,255 ],
	x: 0, y: 0, width: 1, height: 1
};


function VerbLook(actor) {
	Verb.call(this, 'look', actor);

	this.target = function (x,y) {
		console.log('look ' + x + ', ' + y);
		let flag = false;
		const room = this.actor.currentRoom;
		console.log(room);
		room.contains.forEach(gameObj => {
			if(flag) { return; }
			console.log(gameObj);
			const state = gameObj.states[gameObj.currentState];
			if('look' in state.maps) {
				console.log('look map available');
				Object.keys(collide(pixelMap, x - gameObj.x, y - gameObj.y, verbColors, state.maps.look))
					.forEach(rgb => {
						flag = true;
						console.log(gameObj.getDescription());
					});
			} else {
				console.log('no look map');
			}
		});
		if(!flag) {
			console.log(room.getDescription());
		}
		return false;
	};
}

function VerbWalk(actor) {
	Verb.call(this, 'walk', actor);

	this.target = function (x,y) {
		console.log('walk ' + x + ', ' + y);
		const path = pathfind(this.actor.states[this.actor.currentState].map,
			{ x: this.actor.x, y: this.actor.y },
			this.actor.currentRoom.states[this.actor.currentRoom.currentState].map,
			{ x: x, y: y },
			3 * (Math.abs(this.actor.x - x) + Math.abs(this.actor.y - y)));
		console.log(path.length);
		console.log(path);
		this.actor.path = path;
		return false;
	};
}

function VerbTake(actor) {
	Verb.call(this, 'take', actor);
	this.target = function (x,y) {
		console.log('take ' + x + ', ' + y);
		const room = this.actor.currentRoom;
		let flag = false;
		room.contains.forEach(gameObj => {
			if(flag || gameObj == player) { return; }
			console.log(gameObj);
			const state = gameObj.states[gameObj.currentState];
			if('take' in state.maps) {
				console.log('take map available');
				Object.keys(collide(pixelMap, x - gameObj.x, y - gameObj.y, verbColors, state.maps.take))
					.forEach(rgb => {
						Object
							.keys(collide(this.actor.states[this.actor.currentState].map,
								this.actor.x + this.actor.dx - gameObj.x, this.actor.y + this.actor.dy - gameObj.y,
								verbColors, state.maps.take))
							.forEach(rgb => {
								flag = true;
								console.log('take overlap');
								if(gameObj.isCarryable()) {
									actor.inventory.moveTo(gameObj, player.currentRoom, 'take', player.inventory.name);
								}
							});
					});
			} else {
				console.log('no take map');
			}
		});
		return false;
	};
}

function VerbOpen(actor) {
	Verb.call(this, 'open', actor);
}

function VerbInventory(actor) {
	Verb.call(this, 'inventory', actor);
	this.activate = function () {
		console.log('on');
		actor.inventory.contains.forEach(obj => {
			console.log(obj.name);
		});
		return false;
	};
}

function VerbDefault(actor) {
	Verb.call(this, '', actor);
	this.target = function (x,y) {
		console.log('Default verb');
		let dx = x - actor.x;
		let dy = y - actor.y;
		const path = [];

		let pdx = 0;
		let pdy = 0;
		if(Math.abs(dx) > Math.abs(dy)) {
			dx = Math.floor(dx / 2) * 2;
			dy = 0;
		} else {
			dx = 0;
			dy = Math.floor(dy / 2) * 2;
		}
		while((Math.abs(dx) > 1) || (Math.abs(dy) > 1)) {
			if(Math.abs(dx) > 0) {
				pdx += 2 * Math.sign(dx);
				dx -= 2 * Math.sign(dx);
			}
			if(Math.abs(dy) > 0) {
				pdy += 2 * Math.sign(dy);
				dy -= 2 * Math.sign(dy);
			}
//			console.log({ x: actor.x + pdx, y: actor.y + pdy });
			path.push({ x: actor.x + pdx, y: actor.y + pdy });
		}
		console.log(path);
		actor.dx = 0;
		actor.dy = 0;
		actor.path = path;
		return false;
	};
}

function makeVerbs(actor) {
	new VerbLook(actor);
	new VerbWalk(actor);
	new VerbTake(actor);
	new VerbOpen(actor);
	new VerbInventory(actor);
	new VerbDefault(actor);
}
