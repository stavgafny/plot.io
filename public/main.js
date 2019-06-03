'use strict';

document.addEventListener('contextmenu', event => event.preventDefault());
window.addEventListener("focus", event => {
	// get all data again.
	// prevent spam
});

let socket, player, playerUI;
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
	x : 88,
	reload : 82
}
const FIXED_DELTATIME = 60;
const GROUND_COLOR = [128, 175, 73];
const GRID_GAP = 320;


const getInstanceById = id => {
	let item = Object.keys(assets)[id];
	return graphics[item] ? graphics[item] : assets[item];
}


const getPlayerById = id => {
	if (player.id === id) {
		return player;
	}
	for (let i = 0; i < players.length; i++) {
		if (players[i].id === id) {
			return players[i];
		}
	}
	return null;
}


const objectifyItem = template => {
	if (template) {
		let object = getInstanceById(template.id);
		if (object) {
			return new object(template.value);
		}
	}
	return undefined;
}

function objectifyInventory(inventory = []) {
	let objects = [];
	inventory.forEach(template => {
		try {
			objects[template.index] = objectifyItem(template);
		}
		finally {

		}
	});
	return objects;
}


function objectifyPlayer(data) {
	let p = new graphics.Player(
		data.position,
		data.radius,
		data.health,
		data.speed,
		data.color,
		data.inventory ? objectifyInventory(data.inventory) : null
	);
	p.id = data.id;
	p.angle = data.angle;
	p.setAxis(data.axis);

	return p;
}

function handlePlayerAxis() {
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
}


function setup() {
	frameRate(144);
	socket = io.connect(`${window.location.hostname}`);
	createCanvas(window.innerWidth, window.innerHeight, P2D);
	graphics.context = canvas.getContext("2d");
	cursor(CROSS);

	socket.on("join", data => {

		if (data.room !== undefined) {
			history.pushState(null, '', `/?game=${data.room}`);
		}

		player = objectifyPlayer(data);
		playerUI = new PlayerUI(player);

		socket.on("new", data => {
			let p = objectifyPlayer(data);
			p.changeSlot(data.currentSlot);
			players.push(p);
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
			p.changeSlot(null);
			
			//if (p.fist.ready) {
			p.punch(data.side);
			//}
		});

		socket.on("action", data => {
			let p = getPlayerById(data.id);
			p.changeSlot(data.currentSlot);

			let object = p.currentSlot;
			if (object) {
				if (object.accessible) {
					//if (object.isReady()) {
					object.use(p.getPosition(), p.angle, p.radius);
					//}
				}
			}
		});

		socket.on("changeSlot", data => {
			let p = getPlayerById(data.id);
			p.changeSlot(data.currentSlot);
		});

		socket.on("bullet", bullet => {
			const ammo = getInstanceById(bullet.id);
			if (!ammo) {
				return;
			}
			const color = graphics.ammunitionColors[new ammo().name]; // ammo.PROPERTIES.name
			const b = new graphics.Bullet(
				bullet.position,
				ammo.RADIUS,
				bullet.velocity,
				bullet.range,
				bullet.damage,
				bullet.drag,
				color ? color : [0, 0, 0]
			);
			b.id = bullet.id;
			bullets.push(b);
		});

		socket.on("inventory", inventory => {
			player.inventory.storage = objectifyInventory(inventory);
		});

		socket.on("slot", slot => {
			if (slot.index >= 0) {
				player.inventory.storage[slot.index] = objectifyItem(slot);
				player.currentSlot = player.inventory.currentSlot;
			}
		});

		socket.on("slotValue", data => {
			const slot = player.inventory.getByItemIndex(data.index);
			if (slot) {
				slot.value = data.value;
			}
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
		return null;
	}
	let thisLoop = Date.now();
	drawBackground();
	handlePlayerAxis();
	
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
	if (!playerUI.focus) {
		let angle = toAngle({ x: mouseX, y: mouseY }, { x: width / 2, y: height / 2 });
		if (player.getAngle() !== angle) {
			socket.emit("a", angle);
		}
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

	
	playerUI.draw();


	game.fps = 1000 / (thisLoop - lastLoop);
	game.deltaTime = FIXED_DELTATIME / game.fps;
	lastLoop = thisLoop;
}


function windowResized() {
	resizeCanvas(window.innerWidth, window.innerHeight);
}


function mousePressed(event) {
	if (playerUI.focus) {
		playerUI.mousePressed();
	} else {
		if (event.button == 0) {
			socket.emit("action+");
		}
	}
}

function mouseReleased(event) {
	if (playerUI.focus) {
		let value = playerUI.mouseReleased();
		if (value) {
			if (value.source !== value.target) { // If not the same item[object not type]
				socket.emit("changeInventory", value);
			}
		}
	} else {
		if (event.button == 0) {
			socket.emit("action-");
		}
	}
}


function keyPressed(event) {
	if (event.keyCode === 9) {
		event.preventDefault(); // If tab is pressed
		playerUI.toggle();
		socket.emit("action-");
	}
	if (event.keyCode ===  KEYS.reload) {
		socket.emit("reload");
	}
	if (event.keyCode > ASCII_NUMBER && event.keyCode <= ASCII_NUMBER + player.inventory.maxBar) {
		socket.emit("changeSlot", event.keyCode - ASCII_NUMBER - 1);
	} else if (event.keyCode === KEYS.x) {
		socket.emit("changeSlot");
	}
}