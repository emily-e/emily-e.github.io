'use strict';

function Verb(verb, actor, Verbs) {
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


function VerbLook(actor, Verbs, uiChrome) {
	Verb.call(this, 'look', actor, Verbs);

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
						uiChrome.dialog(gameObj.getDescription());
					});
			} else {
				console.log('no look map');
			}
		});
		if(!flag) {
			uiChrome.dialog(room.getDescription());
		}
		return false;
	};
}

function VerbWalk(actor, Verbs) {
	Verb.call(this, 'walk', actor, Verbs);

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

function VerbTake(actor, Verbs, uiChrome) {
	Verb.call(this, 'take', actor, Verbs);
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
				uiChrome.dialog('You can\'t do that.');
			}
		});
		return false;
	};
}

function VerbOpen(actor, Verbs, uiChrome) {
	Verb.call(this, 'open', actor, Verbs);
}

function VerbInventory(actor, Verbs, uiChrome) {
	Verb.call(this, 'inventory', actor, Verbs);
	this.activate = function () {
		console.log('on');
		actor.inventory.contains.forEach(obj => {
			console.log(obj.name);
		});
		return false;
	};
}

function VerbDefault(actor, Verbs) {
	Verb.call(this, '', actor, Verbs);
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

function KeyboardLeft(actor, Verbs) {
	Verb.call(this, 'keyboard-left', actor, Verbs);
	this.activate = function () {
		console.log('left');
		actor.path = [];
		actor.dx = (actor.dx < 0) ? 0 : -2;
		actor.dy = 0;
	};
}

function KeyboardRight(actor, Verbs) {
	Verb.call(this, 'keyboard-right', actor, Verbs);
	this.activate = function () {
		console.log('right');
		actor.path = [];
		actor.dx = (actor.dx > 0) ? 0 : 2;
		actor.dy = 0;
	};
}

function KeyboardUp(actor, Verbs) {
	Verb.call(this, 'keyboard-up', actor, Verbs);
	this.activate = function () {
		console.log('up');
		actor.path = [];
		actor.dx = 0;
		actor.dy = (actor.dy < 0) ? 0 : -2;
	};
}

function KeyboardDown(actor, Verbs) {
	Verb.call(this, 'keyboard-down', actor, Verbs);
	this.activate = function () {
		console.log('up');
		actor.path = [];
		actor.dx = 0;
		actor.dy = (actor.dy > 0) ? 0 : 2;
	};
}

function makeVerbs(actor, Verbs, uiChrome) {
	if (arguments.length < 2) { Verbs = {}; }
	new VerbLook(actor, Verbs, uiChrome);
	//new VerbWalk(actor, Verbs);
	new VerbTake(actor, Verbs, uiChrome);
	new VerbOpen(actor, Verbs);
	new VerbInventory(actor, Verbs, uiChrome);
	new VerbDefault(actor, Verbs);

	new KeyboardLeft(actor, Verbs);
	new KeyboardRight(actor, Verbs);
	new KeyboardUp(actor, Verbs);
	new KeyboardDown(actor, Verbs);
	return Verbs;
}
