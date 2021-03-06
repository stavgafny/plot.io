'use strict';

document.addEventListener('contextmenu', event => event.preventDefault());

window.addEventListener('beforeunload', event => {
	return;
});
const CAMERA = { x: 0, y: 0 };

const STATUS = {
	background : [35, 35, 35, 255],
	connect : "Trying to reach room...",
	disconnected : "server disconnected.",
	dead : "You are dead\nBetter luck next time ._.",
	won : "Winner Winner Chicked Dinner!\nTo play again please enter a new room you with to join or simply refresh the page.",
	queue : "Waiting for other players",
	timer : "Time's up!"
}

const MODES = {
	ffa : "FFA",
	battleRoyal : "BATTLE_ROYAL"
}

const game = {
	fps: 60,
	deltaTime: 1,
	timer : null,
	status : null,
	mode : null
};

let socket, player, playerUI;
const players = [];
const bullets = [];
const items = [];

const ASCII_NUMBER = 48
const KEYS = {
	escape : 27,
	left: 65,
	right: 68,
	up: 87,
	down: 83,
	x : 88,
	reload : 82,
	tab : 9,
	e : 69,
	g : 71
}

const GROUND_COLOR = [80, 150, 40];
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

const getItemIndexById = id => {
	for (let i = 0; i < items.length; i++) {
		if (items[i].id === id) {
			return i;
		}
	}
	return -1;
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

const objectifyInventory = (inventory = []) => {
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


const objectifyPlayer = data => {
	const {position, radius, status, speed, color, inventory, id, angle, axis} = data;
	const p = new graphics.Player(
		position,
		radius,
		status,
		speed,
		color,
		inventory ? objectifyInventory(inventory) : null
	);
	p.id = id;
	p.angle = angle;
	p.setAxis(axis);

	return p;
}

const handlePlayerAxis = () => {
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

const killPlayerSound = p => {
	if (p.currentSlot) {
		if (p.currentSlot.accessible) {
			if (p.currentSlot.sound) {
				p.currentSlot.sound.object.stop(p.currentSlot.sound.id);
			}
		}
	}
}


function setup() {
	frameRate(144);
	game.status = STATUS.connect;
	if (!socket) {
		socket = io.connect(window.location.hostname, {
			reconnection: true,
			reconnectionDelay: 1000,
			reconnectionDelayMax : 5000,
			reconnectionAttempts: Infinity
		});
	}
	createCanvas(window.innerWidth, window.innerHeight, P2D);
	graphics.context = canvas.getContext("2d");
	cursor(CROSS);

	socket.on("connect", () => {
		game.status = STATUS.connect;
	});

	socket.on("info", data => {
		if (data.hasOwnProperty("roomName")) {
			history.pushState(null, '', `/?game=${data.roomName}`);
			game.mode = data.roomName.split(":")[0];
			delete data.roomName;
		}
		if (data.hasOwnProperty("status")) {
			game.status = STATUS[data.status];
			player = null;
			delete data.status;
		}
		if (data.timer === 0) {
			game.status = STATUS.timer;
			player = null;
		}
		Object.assign(game, data);
	});

	socket.on("join", data => {
		player = objectifyPlayer(data);
		playerUI = new PlayerUI(player);
		players.length = 0;
		bullets.length = 0;
		items.length = 0;
		game.status = null;
		socket.on("new", data => {
			data.status = {};
			data.timer = 0;
			if (data.hasOwnProperty("health")) {
				data.status.health = data.health;
			}
			const p = objectifyPlayer(data);
			p.changeSlot(data.currentSlot);
			players.push(p);
		});
	});

	socket.on("a", data => {
		const p = getPlayerById(data.id);
		if (p) {
			p.setAngle(data.angle);
		}
	});

	socket.on("pos", data => {
		const p = getPlayerById(data.id);
		if (p) {
			p.setPosition(data.position);
		}
	});

	socket.on("axis", data => {
		const p = getPlayerById(data.id);
		if (p) {
			p.setAxis(data.axis);
		}
	});

	socket.on("hp:d", data => {
		const p = getPlayerById(data.id);
		if (p) {
			delete data.id;
			Object.assign(p.status, data);
			p.setDamaged();
		}
	});

	socket.on("kill", id => {
		const p = getPlayerById(id);
		killPlayerSound(p);
		const i = players.indexOf(p);
		if (i === -1) {
			player = null;
			game.status = STATUS.dead;
		} else {
			players.splice(i, 1);
		}
	});

	socket.on("walk", id => {
		const p = getPlayerById(id);
		p.walk();
	});

	socket.on("punch", data => {
		const p = getPlayerById(data.id);
		p.changeSlot(null);
		
		//if (p.fist.ready) {
		p.punch(data.side);
		//}
	});

	socket.on("action", data => {
		const p = getPlayerById(data.id);
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
	
	socket.on("reload", data => {
		const p = getPlayerById(data.id);
		p.changeSlot(data.currentSlot);
		const item = p.currentSlot;
		if (item) {
			if (item.accessible) {
				item.reload(p.position)
			}
		}
	});

	socket.on("changeSlot", data => {
		const p = getPlayerById(data.id);
		p.changeSlot(data.currentSlot);
	});

	socket.on("bullet", bullet => {
		const ammo = getInstanceById(bullet.id);
		if (!ammo) {
			return;
		}
		const color = graphics.ammunitionColors[new ammo().name]; // ammo.PROPERTIES.name
		const {position, velocity, range, damage, drag} = bullet;
		const b = new graphics.Bullet(
			position,
			ammo.RADIUS,
			velocity,
			range,
			damage,
			drag,
			color ? color : graphics.ammunitionColors[undefined]
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

	socket.on("item", blobData => {
		let object = getInstanceById(blobData.item);
		if (!object) {
			return;
		}
		const itemBlob = new graphics.ItemBlob(
			new object(),
			blobData.position
		);

		itemBlob.id = blobData.id;
		items.push(itemBlob);

	});

	socket.on("discardItem", id => {
		const index = getItemIndexById(id);
		if (index !== -1) {
			items.splice(index, 1);
		}
	});

	socket.on("disconnect", () => {
		game.timer = null;
		killPlayerSound(player);
		player = null;
		game.status = STATUS.disconnected + '\n' + STATUS.connect;
	});

	
}

const drawGame = () => {
	drawBackground();
	handlePlayerAxis();
	
	player.update(game.deltaTime);
	player.updateStatus(game.deltaTime);
	
	// Follow player's position
	CAMERA.x = player.position.x;
	CAMERA.y = player.position.y;

	let grabbableItem = null;
	items.forEach((item) => {
		item.draw();
		if (!grabbableItem) {
			if (player.collide(item)) {
				grabbableItem = item;
			}
		}
	});

	for (let i = 0; i < bullets.length; i++) {
		if (bullets[i].outOfRange()) {
			bullets.splice(i, 1);
		} else {
			let allPlayers = [player, ...players];
			let hit = false;
			for (let p = 0; p < allPlayers.length && !hit; p++) {
				if (allPlayers[p].collide(bullets[i])) {
					hit = true;
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
		
	playerUI.draw(grabbableItem);
	playerUI.drawStatus();
	drawInfo();
}

function draw() {
	if (socket.connected && player) {
		drawGame();
		game.timer += game.mode === MODES.battleRoyal ?  -game.deltaTime : game.deltaTime;
	} else {
		drawStatus();
	}
	let thisLoop = performance.now();
	game.fps = frameRate();
	game.deltaTime = 1.0 / game.fps;
}


function windowResized() {
	resizeCanvas(window.innerWidth, window.innerHeight);
}


function mousePressed(event) {
	event.preventDefault();
	if (playerUI.focus) {
		playerUI.mousePressed(event.button);
	} else {
		if (event.button === 0) {
			player.hold = true;
			socket.emit("action+");
		}
	}
}

function mouseReleased(event) {
	event.preventDefault();
	if (playerUI.focus) {
		let value = playerUI.mouseReleased();
		if (value) {
			if (value.source !== value.target) { // If not the same item[object not type]
				value.mode = event.button;
				socket.emit("changeInventory", value);
			}
		}
	} else {
		if (event.button === 0) {
			player.hold = false;
			socket.emit("action-");
		}
	}
}


function keyPressed(event) {
	if (event.keyCode === KEYS.tab) {
		event.preventDefault(); // If tab is pressed
		playerUI.toggle();
		socket.emit("action-");
	}
	if (event.keyCode ===  KEYS.reload) {
		const item = player.currentSlot;
		if (item) {
			if (item.type === "Weapon") {
				if (item.ammo < item.capacity && player.inventory.getIndexByInstance(item.ammoType) !== -1 && !playerUI.blob && !player.hold) {
					playerUI.setDelayBlob(item.reloadTime);
					item.reload(player.position);
				}
			}
		}
		socket.emit("reload");
	}
	if (event.keyCode > ASCII_NUMBER &&
		event.keyCode <= ASCII_NUMBER + player.inventory.maxBar &&
		event.keyCode - ASCII_NUMBER - 1 !== player.inventory.barIndex
		) {
		socket.emit("changeSlot", event.keyCode - ASCII_NUMBER - 1);
		playerUI.clearDelayBlob();
	} else if (event.keyCode === KEYS.x && player.inventory.barIndex !== -1) {
		socket.emit("changeSlot");
		playerUI.clearDelayBlob();
	} else if (event.keyCode === KEYS.e) {
		socket.emit("pickUp");
	} else if (event.keyCode === KEYS.g) {
		socket.emit("drop");
	}
}