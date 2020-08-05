'use strict';


/**
	This is a collection of values that can be serialized as JSON objects that are "global" game state flags.
	When saving the game this will be dumped.
	When loading the game this will be restored.
	Importantly, since values are not directly exposed and have to accessed through getters and setters, this allows for a pub/sub protocol.
	Honestly, I am not 100% sure this is useful, but the idea is simple enough, so it's here for now.
*/
function GameData() {
	const values = {};
	const watchers = {};
	this.contains = function(key) { return (key in values); };
	this.keys = function() { return Object.keys(values); };
	this.get = function (key) { return JSON.parse(JSON.stringify(values[key])); };
	this.set = function (key, value, sender) {
		values[key] = JSON.parse(JSON.stringify(value));
		if (!(key in watchers)) {
			watchers[key] = [];
		}
		watchers[key].forEach(actor => {
			if(sender == actor) { return; }
			actor.notify(key, JSON.parse(JSON.stringify(values[key])), sender);
		});
	};
	this.watch = function(key, actor) {
		if (!(key in watchers)) { watchers[key] = []; }
		if(watchers[key].lastIndexOf(actor) == -1) { watchers[key].push(actor); }
		return this.get(key);
	};
	this.unwatch = function(key, actor) {
		if (!(key in watchers)) { return; }
		const idx = watchers[key].lastIndexOf(actor);
		if(idx > -1) {
			watchers[key].splice(idx, 1);
		}
	};
	this.values = function() { return JSON.stringify(values); };
};



function UIChrome(Verbs) {
	const verbList = [];

	this.icons = new PIXI.Container();
	this.animations = {};
	this.attributes = {};
	this.width = 0;
	this.height = 0;

	let currentVerb = '';
	let currentGraphics = {};

	this.addVerb = function (verb) {
		verbList.push(verb);
	};

	this.screenHit = function(screen) {
		return event => {
			console.log('click');
			console.log(event);
			const p = event.data.getLocalPosition(screen);
			console.log(p);
			const hitX = Math.floor(p.x);
			const hitY = Math.floor(p.y);
			if (currentVerb != '') {
				if(!Verbs[currentVerb].target(hitX, hitY)) {
					currentVerb = '';
					this.icons.removeChild(currentGraphics);
				}
			} else {
				Verbs[''].target(hitX, hitY);
			}
		};
	};

	const iconHighlight = function(anim) {
		const graphics = new PIXI.Graphics();
		graphics.beginFill(0xfbf236, 0.5);
		graphics.lineStyle(1, 0xfbf236, 0.8);
		graphics.drawRect(0, 0, anim.width, anim.height);
		graphics.x = anim.x;
		return graphics;
	};

	this.verbHit = function (verb, anim) {
		return evt => {
			console.log(evt);
			if(verb != currentVerb) {
				if(currentVerb != '') {
					this.icons.removeChild(currentGraphics);
					Verbs[currentVerb].deactivate();
				}
				if(Verbs[verb].activate()) {
					const graphics = iconHighlight(anim);
					console.log(graphics);
					console.log(anim);
					this.icons.addChild(graphics);
					currentVerb = verb;
					currentGraphics = graphics;
				} else {
					currentVerb = '';
				}
			} else {
				if(currentVerb != '') {
					this.icons.removeChild(currentGraphics);
					currentVerb = '';
					Verbs[verb].deactivate();
				}
			}
			console.log(verb);
		};
	};

	this.verbDisplay = function (verb) {
		if(!(verb in Verbs) || !Verbs[verb].available) { return; }
		const anim = this.animations[verb];
		anim.interactive = true;
		this.icons.addChild(anim);
		anim.play();
		anim.x = this.width + 1;
		this.width = anim.x + anim.width;
		this.height = Math.max(this.height, anim.height);
		console.log(verb + ', anim extents: ' + anim.width + ', ' + anim.height);
		anim.on('pointertap', this.verbHit(verb, anim));
	};

	this.display = function (screen) {

		screen.interactive = true;
		screen
			.on('pointertap', this.screenHit(screen));

		this.icons.interactive = true;
		verbList.forEach(verb => this.verbDisplay(verb));

		document.querySelector('body').addEventListener('keydown', function (evt) {
			// escape
			//if(evt.keyCode == 27) { eventHandler.mode(); }
			// left
			if(evt.keyCode == 37) {
				if('keyboard-left' in Verbs) { Verbs['keyboard-left'].activate(); }
			}
			// up
			if(evt.keyCode == 38) {
				if('keyboard-up' in Verbs) { Verbs['keyboard-up'].activate(); }
			}
			// right
			if(evt.keyCode == 39) {
				if('keyboard-right' in Verbs) { Verbs['keyboard-right'].activate(); }
			}
			// down
			if(evt.keyCode == 40) {
				if('keyboard-down' in Verbs) { Verbs['keyboard-down'].activate(); }
			}
		});

	};
}


/* Movement related code */

function collide(objMap, ox, oy, colorToMessage, roomMap) {
	const colors = {};
	const roomAnchorX = Math.floor(roomMap.width * roomMap.x);
	const roomAnchorY = Math.floor(roomMap.height * roomMap.y);
	for(let x = 0; x < objMap.width; x++) {
		const roomX = (ox + x) - Math.floor(objMap.width * objMap.x) + roomAnchorX;
		if((roomX < 0) || (roomX >= roomMap.width)) { continue; }
		for(let y = 0; y < objMap.height; y++) {
			const roomY = (oy + y) - Math.floor(objMap.height * objMap.y) + roomAnchorY;
			if((roomY < 0) || (roomY >= roomMap.height)) { continue; }
			const objOffset = (x + (y * objMap.width)) * 4;
			const roomOffset = (roomX + (roomY * roomMap.width)) * 4;

			// out of bounds on room
			if((roomOffset < 0) || (roomOffset > (roomMap.pixels.length - 4))) { continue; }
			// player map is transparent
			if(objMap.pixels[objOffset + 3] == 0) { continue; }
			// room map is transparent
			if(roomMap.pixels[roomOffset + 3] == 0) { continue; }

			const rgb = ((roomMap.pixels[roomOffset] < 16) ? '0' : '') + roomMap.pixels[roomOffset].toString(16)
				+ ((roomMap.pixels[roomOffset + 1] < 16) ? '0' : '') + roomMap.pixels[roomOffset + 1].toString(16)
				+ ((roomMap.pixels[roomOffset + 2] < 16) ? '0' : '') + roomMap.pixels[roomOffset + 2].toString(16);
			if(rgb in colors) { continue; }
			if(rgb in colorToMessage) {
				colors[rgb] = { roomX: roomX, roomY: roomY, objX: x, objY: y };
			}
		}
	}
	return colors;
//	if((obj.dx != 0) || (obj.dy != 0)) { console.log('px,y ' + ox + ', ' + oy); }
}



/* Graphical helper functions */

//https://medium.com/@michelfariarj/scale-a-pixi-js-game-to-fit-the-screen-1a32f8730e9c
// Consider that WIDTH and HEIGHT are defined as the width and height of your unresized game in pixels.
function resize (app, screen) {
	return function () {
		const WIDTH = screen.width + screen.x;
		const HEIGHT = screen.height + screen.y;

		const vpw = window.innerWidth - 16;  // Width of the viewport
		const vph = window.innerHeight - 16; // Height of the viewport
		let nvw; // New game width
		let nvh; // New game height

		// The aspect ratio is the ratio of the screen's sizes in different dimensions.
		// The height-to-width aspect ratio of the game is HEIGHT / WIDTH.
		
		if (vph / vpw < HEIGHT / WIDTH) {
			// If height-to-width ratio of the viewport is less than the height-to-width ratio
			// of the game, then the height will be equal to the height of the viewport, and
			// the width will be scaled.
			nvh = vph;
			nvw = (nvh * WIDTH) / HEIGHT;
		} else {
			// In the else case, the opposite is happening.
			nvw = vpw;
			nvh = (nvw * HEIGHT) / WIDTH;
		}
	
		// Set the game screen size to the new values.
		// This command only makes the screen bigger --- it does not scale the contents of the game.
		// There will be a lot of extra room --- or missing room --- if we don't scale the stage.
		app.renderer.resize(nvw, nvh);
	
		// This command scales the stage to fit the new size of the game.
		app.stage.scale.set(nvw / WIDTH, nvh / HEIGHT);
	};
}



function parseFrameName(name) {
	const info = {};
	name.substring(name.indexOf('(') + 1, name.lastIndexOf(')'))
		.split(',')
		.forEach(kv => {
			const pair = kv.split(':');
			if(pair[0] in info) {
				let v = info[pair[0]];
				if (Array.isArray(v)) {
					v.push(pair[1]);
				} else {
					v = [v, pair[1]];
				}
				info[pair[0]] = v;
			} else {
				info[pair[0]] = pair[1];
			}
		});
	return info;
}

function getPixels(sprite) {
	const canvas = document.createElement('canvas');
	console.log('Char Map: width - ' + sprite.width + ' height - ' + sprite.height);
	canvas.width = sprite.width;
	canvas.height = sprite.height;
	console.log('txt ' + sprite.texture.orig.x + ' ' + sprite.texture.orig.y);

	const ctx = canvas.getContext('2d');
	ctx.drawImage(sprite.texture.baseTexture.resource.source,
		sprite.texture.orig.x, sprite.texture.orig.y,
		sprite.texture.orig.width, sprite.texture.orig.height,
		0,0,
		sprite.width, sprite.height);

	return ctx.getImageData(0, 0, sprite.width, sprite.height).data;
}

function collectAnimations(animations, obj) {
	console.log(animations);
	Object.keys(animations)
		.forEach(name => {
			console.log(animations[name]);
			obj.animations[name] = new PIXI.AnimatedSprite(animations[name]);
			obj.animations[name].animationSpeed = 0.167; 
		});
	console.log(obj.animations);
}



function loadFromSheet(obj, objName, spritesheet) {
	const animations = {};
	Object.keys(spritesheet.textures)
		.forEach(name => {
			if(name.indexOf(objName + ' (') != 0) { return; }
			const info = parseFrameName(name);
			console.log(info);
			if(!('tag' in info)) { info.tag = 'default'; }
			if(!(info.tag in obj.states)) {
				obj.states[info.tag] = {
					layers: {},
					map: {},
					maps: {}
				};
			}
			const tag = obj.states[info.tag];

			// https://www.html5gamedevs.com/topic/18018-how-to-read-pixel-color/
			// https://pixijs.io/examples/?v=v5.0.0-rc.2#/textures/gradient-resource.js
			if('map' in info) {
				const map = new PIXI.Sprite(spritesheet.textures[name]);
				const mObj = {
					sprite: map,
					pixels: getPixels(map),
					x: map.anchor.x, y: map.anchor.y,
					width: map.width, height: map.height
				};
				if(info.map == 'default') {
					tag.map = mObj;
				} else {
					tag.maps[info.map] = mObj;
				}
			} else if('z' in info) {
				if (!(info.tag in animations)) { animations[info.tag] = {}; }
				const animTag = animations[info.tag];
				if(!(info.z in animTag)) { animTag[info.z] = []; }
				animTag[info.z].push(spritesheet.textures[name]);
			}
		});
	console.log(animations);
	Object.keys(animations)
		.forEach(tag => {
			console.log(tag);
			Object.keys(animations[tag])
				.forEach(z => {
					obj.states[tag].layers[z] = new PIXI.AnimatedSprite(animations[tag][z]);
					obj.states[tag].layers[z].zIndex = Number.parseInt(z);
					obj.states[tag].layers[z].animationSpeed = 0.167; 
				});
		});
}



function loadIconsFromSheet(obj, iconsName, spritesheet) {
	const animations = {};
	const attributes = {};
	Object.keys(spritesheet.textures)
		.forEach(name => {
			if(name.indexOf(iconsName + ' (') != 0) { return; }
			const info = parseFrameName(name);
			if('tag' in info) {
				obj.addVerb(info.tag);
				if (!(info.tag in animations)) {
					animations[info.tag] = [];
				}
				animations[info.tag].push(spritesheet.textures[name]);
				attributes[info.tag] = info;
			}
		});
	collectAnimations(animations, obj);
	obj.iconAttributes = attributes;
}
