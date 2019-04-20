'use strict';

document.addEventListener('contextmenu', event => event.preventDefault());
window.addEventListener("focus", event => {
	// get all data again.
	// prevent spam
});

let socket;
let player;
const players = [];
const bullets = [];
const CAMERA = { x: 0, y: 0 };
const game = {
	fps: 60,
	deltaTime: 0
};

const ASCII_NUMBER = 48
const KEYS = {
	left: 65,
	right: 68,
	up: 87,
	down: 83,
	x : 88
}
const FIXED_DELTATIME = 60;
const GROUND_COLOR = [128, 175, 73];
const GRID_GAP = 320;



function getPlayerById(id) {
	if (player.id === id) {
		return player;
	}
	for (let i = 0; i < players.length; i++) {
		if (players[i].id === id) {
			return players[i];
		}
	}
}

function getElementById(id) {
	let item = Object.keys(assets)[id];
	return graphics[item] ? graphics[item] : assets[item];
}


function idListToObjects(idList) {
	let objectList = [];
	idList.forEach((id) => {
		let object = getElementById(id);
		if (object) {
			objectList.push(new object());
		}
	});
	return objectList;
}


function stringifyInventory(inventory = {}) {
	inventory = Object.assign(Inventory.FORMAT, inventory);
	inventory.storage = idListToObjects(inventory.storage);
	inventory.bar = idListToObjects(inventory.bar);
	return inventory;
}


function stringifyPlayer(data) {
	let p = new graphics.Player(data.position, data.radius, data.health, data.speed, data.color, stringifyInventory(data.inventory));
	p.id = data.id;
	p.angle = data.angle;
	p.setAxis(data.axis);
	p.changeSlot(data.index);

	return p;
}



function setup() {
	frameRate(144);
	socket = io.connect(`${window.location.hostname}`);
	createCanvas(window.innerWidth, window.innerHeight, P2D);
	graphics.context = canvas.getContext("2d");

	socket.on("join", data => {

		if (data.name !== undefined) {
			history.pushState(null, '', `/?game=${data.name}`);
		}

		player = stringifyPlayer(data);


		socket.on("new", data => {
			players.push(stringifyPlayer(data));
		});

		socket.on("a", data => {
			let p = getPlayerById(data.id);
			if (p) {
				p.setAngle(data.angle);
			}
		});

		socket.on("pos", data => {
			let p = getPlayerById(data.id);
			if (p) {
				p.setPosition(data.position);
			}
		});

		socket.on("hp:d", data => {
			let p = getPlayerById(data.id);
			if (p) {
				if (data.hasOwnProperty("health")) {
					p.setHealth(data.health);
				}
				p.setDamaged();
			}
		});

		socket.on("axis", data => {
			let p = getPlayerById(data.id);
			if (p) {
				p.setAxis(data.axis);
			}
		});

		socket.on("punch", data => {
			let p = getPlayerById(data.id);
			if (p.currentSlot) {
				p.changeSlot(-1);
			}
			
			if (p.fist.ready) {
				p.punch(data.side);
			}
		});

		socket.on("action", data => {
			let p = getPlayerById(data.id);
			if (data.index !== player.inventory.barIndex) {	
				p.changeSlot(data.index);
			}
			let object = p.currentSlot;
			if (object) {
				if (object.accessible) {
					if (object.isReady()) {
						object.use(p.getPosition(), p.angle, p.radius);
					}
				}
			}
		});

		socket.on("changeSlot", data => {
			let p = getPlayerById(data.id);
			p.changeSlot(data.slot);
		});

		socket.on("bullet", bullet => {
			let ammo = getElementById(bullet.id);
			let b = new graphics.Bullet(bullet.position, ammo.RADIUS, bullet.velocity, bullet.range, bullet.damage, bullet.drag, ammo.COLOR);
			b.id = bullet.id;
			bullets.push(b);
		});

		socket.on("closed", id => {
			let p = getPlayerById(id);
			let i = players.indexOf(p);
			players.splice(i, 1);
		});

		socket.on("disconnect", () => {
			player = null;
		});
	});
}

let lastLoop = Date.now();
function draw() {
	if (!player) {
		background(25, 25, 25);
		translate(width / 2, height / 2);
		textAlign(CENTER);
		textSize(width / 50);
		fill(255, 255, 255);
		text("You are dead...", 0, 0);
		return null;
	}
	let thisLoop = Date.now();
	drawBackground();


	let axis = player.getAxis();
	if (keyIsDown(KEYS.left)) {
		axis.x = -1;
	} else {
		axis.x = 0;
		if (keyIsDown(KEYS.right)) {
			axis.x = 1;
		}
	}
	if (keyIsDown(KEYS.up)) {
		axis.y = -1;
	} else {
		axis.y = 0;
		if (keyIsDown(KEYS.down)) {
			axis.y = 1;
		}
	}

	if (JSON.stringify(axis) !== JSON.stringify(player.getAxis())) {
		socket.emit("axis", axis);
	}
	
	player.update(game.deltaTime);
	CAMERA.x = player.position.x;
	CAMERA.y = player.position.y;

	for (let i = 0; i < bullets.length; i++) {
		if (bullets[i].outOfRange()) {
			bullets.splice(i, 1);
		} else {
			let allPlayers = [player, ...players];
			let hit = false;
			for (let p = 0; p < allPlayers.length && !hit; p++) {
				if (allPlayers[p].collide(bullets[i])) {
					hit = true;
					//allPlayers[p].setDamaged();
					bullets.splice(i, 1);
				}
			}
			if (!hit) {
				bullets[i].update(game.deltaTime);
				bullets[i].draw();
			}
		};
	}


	players.forEach((p) => {
		p.update(game.deltaTime);
		p.draw(true);
	});
	player.draw(false);
	let angle = toAngle({ x: mouseX, y: mouseY }, { x: width / 2, y: height / 2 });
	if (player.getAngle() !== angle) {
		socket.emit("a", angle);
	}
	drawStats();
	push();
	translate(width - 20, 30);
	textAlign(RIGHT);
	textSize(20);
	fill(255);
	text(`X: ${player.position.x.toFixed(0)} Y: ${player.position.y.toFixed(0)}`, 0, 0);
	fill(255);
	translate(-width + 30, 0);
	textAlign(LEFT);
	text(`Fps : ${floor(game.fps)}`, 0, 0);
	pop();

	if (player.currentSlot) {
		textAlign(CENTER);
		text(player.currentSlot.currentMag, width / 2, height - 100);
	}


	game.fps = 1000 / (thisLoop - lastLoop);
	game.deltaTime = FIXED_DELTATIME / game.fps;
	lastLoop = thisLoop;
}

function windowResized() {
	resizeCanvas(window.innerWidth, window.innerHeight);
}


function mousePressed(event) {
	if (event.button == 0) {
		socket.emit("action+");
	}
}

function mouseReleased(event) {
	if (event.button == 0) {
		socket.emit("action-");
	}
}


function keyPressed(event) {
	if (event.keyCode === 9) {
		event.preventDefault(); // If tab is pressed
	}
	if (event.keyCode > ASCII_NUMBER && event.keyCode <= ASCII_NUMBER + player.inventory.maxBar) {
		socket.emit("changeSlot", event.keyCode - ASCII_NUMBER - 1);
	} else if (event.keyCode === KEYS.x) {
		socket.emit("changeSlot", -1);
	}
}