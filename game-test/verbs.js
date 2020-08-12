'use strict';

function Verb(verb, actor, Verbs) {
	this.actor = actor;
	this.name = verb
	Verbs[verb] = this;
	this.modes = ['default'];

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

	this.send = function(obj) {
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

function findObjects(room, mapType, x,y, handler) {
	let flag = false;
	room.contains.forEach(gameObj => {
		console.log(gameObj);
		const state = gameObj.states[gameObj.currentState];
		if(mapType in state.maps) {
			console.log(mapType + ' map available');
			Object.keys(collide(pixelMap, x - gameObj.x, y - gameObj.y, verbColors, state.maps[mapType]))
				.forEach(rgb => {
					flag = handler(gameObj);
				});
		} else {
			console.log('no map');
		}
	});
	return flag;
}

function findObjectsWithOverlap(actor, mapType, x,y, handler) {
	return findObjects(actor.currentRoom, mapType, x,y,
		gameObj => {
			if(gameObj == actor) { return false; }
			const state = gameObj.states[gameObj.currentState];
			let flag = false;
			Object
				.keys(collide(actor.states[actor.currentState].map,
					actor.x + actor.dx - gameObj.x, actor.y + actor.dy - gameObj.y,
					verbColors, state.maps[mapType]))
				.forEach(rgb => {
					console.log('overlap');
					if(flag) { return; }
					flag = handler(gameObj);
				});
			return flag;
		});
}

function VerbLook(actor, Verbs, uiChrome) {
	Verb.call(this, 'look', actor, Verbs);

	this.target = function (x,y) {
		console.log('look ' + x + ', ' + y);
		let flag = findObjects(this.actor.currentRoom, 'look', x,y,
			gameObj => {
				uiChrome.dialog(gameObj.getDescription());
				return true;
			});
		if(!flag) {
			uiChrome.dialog(this.actor.currentRoom.getDescription());
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
		let flag = findObjectsWithOverlap(actor, 'take', x,y,
			gameObj => {
				if(gameObj.isCarryable()) {
					actor.inventory.moveTo(gameObj, player.currentRoom, 'take');
					return true;
				}
				return false;
			});
		if(!flag) { uiChrome.dialog('You can\'t do that.'); }
		return false;
	};
}

function VerbOpen(actor, Verbs, uiChrome) {
	Verb.call(this, 'open', actor, Verbs);
	this.target = function (x,y) {
		findObjectsWithOverlap(actor, 'open', x,y,
			gameObj => {
				let flag = false;
				console.log(gameObj);
				if('open' in gameObj) {
					flag = gameObj.open();
				}
				return flag;
			});
		return false;
	};
}


function VerbInventory(actor, Verbs, uiChrome) {
	Verb.call(this, 'inventory', actor, Verbs);
	this.activate = function () {
		console.log('on');

		const inven = uiChrome.createDialog();
		console.log(inven.width + ', ' + inven.height);

		uiChrome.pushVerbs('inventory');
		const ok = new PIXI.Graphics();
		drawX(ok);
		ok.interactive = true;
		ok.on('pointertap', evt => {
			console.log('click');
			inven.destroy();
			uiChrome.popVerbs();
		});
		ok.x = inven.width-34;
		ok.y = 4;
		inven.addChild(ok);

		const rows = actor.inventory.contains.map(obj => {
			console.log(obj.name);
			const row = new PIXI.Container();

			const bkgrnd= new PIXI.Graphics();
			bkgrnd.beginFill(0xd0d0d0, 0.8);
			bkgrnd.lineStyle(1, 0xd0d0d0, 0.8);
			bkgrnd.drawRect(0, 0, inven.width - 42, 32);
			row.addChild(bkgrnd);

			const icon = obj.getIcon();
			icon.x = 2;
			icon.y = 2;
			row.addChild(icon);

			const text = new PIXI.Text(obj.getDisplayName(), {
				fontFamily: 'IBM VGA 8x16',
				stroke : '#101010',
				fill: '#101010',
				fontSize: 24 });
			text.x = 36;
			text.y = 3;
			row.addChild(text);

			row.interactive = true;
			row.on('pointertap', evt => {
				console.log('click!');
				console.log(obj);
				uiChrome.objectHit({
					obj: obj,
					destroy: () => {
						inven.destroy();
						uiChrome.popVerbs();
					}
				});
			});
			return row;
		});

		let y = 4;
		rows.forEach(row => {
			row.x = 4;
			row.y = y;
			y += row.height + 4;
			inven.addChild(row);
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

function VerbSackLook(actor, Verbs, uiChrome) {
	Verb.call(this, 'sack-look', actor, Verbs);
	this.modes = ['inventory'];

	this.send = function(obj) {
		uiChrome.dialog(obj.obj.getDescription());
		return false;
	};
}

function VerbDrop(actor, Verbs, uiChrome) {
	Verb.call(this, 'drop', actor, Verbs);
	this.modes = ['inventory'];

	this.send = function(obj) {
		// TO DO
		obj.destroy();
		return false;
	};
}

function VerbUse(actor, Verbs, uiChrome) {
	Verb.call(this, 'use', actor, Verbs);
	this.modes = ['inventory'];

	this.send = function(obj) {
		if(obj.obj.isUsable()) {
			const action = {
				asset: obj.obj.getIcon(),
				activate: () => obj.obj.use_activate(actor, uiChrome),
				deactivate: () => obj.obj.use_deactivate(actor, uiChrome),
				target: (x,y) => {
					console.log('use on x,y: ' + x + ', ' + y);
					const ret = obj.obj.use_target(actor, uiChrome, x,y);
					if(!ret) { uiChrome.removeAction(action); }
					return ret;
				}
			};
			uiChrome.addAction(action);
			obj.destroy();
		}
		return false;
	};
}


function makeVerbs(actor, Verbs, uiChrome) {
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

	new VerbSackLook(actor, Verbs, uiChrome);
	new VerbDrop(actor, Verbs, uiChrome);
	new VerbUse(actor, Verbs, uiChrome);

	return Verbs;
}
