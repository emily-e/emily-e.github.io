'use strict';

/*
	Roughly based on this implementation:
	https://www.redblobgames.com/pathfinding/a-star/introduction.html
*/
function PriorityQueue() {
	const list = [];
	this.push = function (val, weight) {
		const idx = list.findIndex(el => (el.weight >= weight))
		if(idx == -1) {
			list.push({val: val, weight: weight});
		} else {
			list.splice(idx, 0, {val: val, weight: weight});
		}
	}
	this.pop = function () { return list.shift().val; }
	this.length = function () { return list.length; }
}

function pathfind(objMap, start, roomMap, dest, maxCount) {
	const c = { '000000': 0 };

	function distance(a, b) {
		const d = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
		return Math.sqrt(d*d);
	}
	function stringXY(pt) { return pt.x.toString() + ',' + pt.y.toString(); }
	function eq(a,b) { return (a.x == b.x) && (a.y == b.y); }

	const visited = {};

	function oob(pt) {
		if(stringXY(pt) in visited) { return true; }
		if((pt.x < 0) || (pt.x >= roomMap.width)) { return true; }
		if((pt.y < 0) || (pt.y >= roomMap.height)) { return true; }
		const colors = collide(objMap, pt.x, pt.y, c, roomMap);
		if(Object.keys(colors).length > 0) { return true; }
		return false;
	}

	function neighbors(pt) {
		const pts = [];
		const l = { x: pt.x - 1, y: pt.y };
		const t = { x: pt.x, y: pt.y - 1};
		const r = { x: pt.x + 1, y: pt.y };
		const b = { x: pt.x, y: pt.y + 1 };
		if (!oob(l)) { pts.push(l); }
		if (!oob(t)) { pts.push(t); }
		if (!oob(r)) { pts.push(r); }
		if (!oob(b)) { pts.push(b); }
		return pts;
	}

	if(oob(dest)) { return []; }

	const frontier = new PriorityQueue();
	frontier.push({ pt: start, cost: 0 }, 0);
	visited[stringXY(start)] = 0;

	console.log('Path finding');
	let cur = 0;
	let counter = 0;
	while((frontier.length() > 0) && (counter < maxCount)) {
		counter++;
		cur = frontier.pop();
		//console.log('cur: ' + cur.pt.x + ', ' + cur.pt.y);
		//console.log('frontier size ' + frontier.length());
		if(eq(cur.pt, dest)) { break; }
		neighbors(cur.pt)
			.forEach(pt => {
				frontier.push({ pt: pt, cost: cur.cost + 1},  cur.cost + 1 + distance(pt, dest));
				visited[stringXY(pt)] = cur.pt;
			});
	}

	let pt = cur.pt;
	const path = [];
	while (!eq(pt, start)) {
		path.unshift(pt);
		pt = visited[stringXY(pt)];
		if(pt === 0) { pt = start; }
	}
	console.log('Done ' + counter);
	return path;
}
