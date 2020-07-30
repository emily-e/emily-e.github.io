'use strict';





/*
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



/* Graphical helper functions */

function parseFrameName(name) {
	const info = {};
	name.substring(name.indexOf('(') + 1, name.lastIndexOf(')'))
		.split(',')
		.forEach(kv => {
			const pair = kv.split(':');
			info[pair[0]] = pair[1];
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



function loadSpriteFromSheet(obj, spriteName, spritesheet) {
	const animations = {};
	Object.keys(spritesheet.textures)
		.forEach(name => {
			if(name.indexOf(spriteName + ' (') != 0) { return; }
			const info = parseFrameName(name);
			if('tag' in info) {
				if(info.tag == 'map') {
					const map = new PIXI.Sprite(spritesheet.textures[name]);
					const mapName = ('map' in info) ? info.map : 'default';
					obj.maps[mapName] = {
						sprite: map,
						pixels: getPixels(map),
						x: map.anchor.x, y: map.anchor.y,
						width: map.width, height: map.height
					};
					console.log(obj.maps[mapName].pixels);
					console.log(map.anchor);
				} else {
					if (!(info.tag in animations)) {
						animations[info.tag] = [];
					}
					animations[info.tag].push(spritesheet.textures[name]);
				}
			}
			console.log(info);
		});
	collectAnimations(animations, obj);
}



function loadIconsFromSheet(obj, iconsName, spritesheet) {
	const animations = {};
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
			}
		});
	collectAnimations(animations, obj);
}
