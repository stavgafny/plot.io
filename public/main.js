'use strict';
document.addEventListener('contextmenu', event => event.preventDefault());


let socket;
let player;
const players = [];
const CAMERA = {x : 0, y : 0};
const game = {
	fps : 60,
	deltaTime : 0
};

const KEYS = {
	left : 65,
	right : 68,
	up : 87,
	down : 83
}
const FIXED_DELTATIME = 60;
const GROUND_COLOR = [128, 175, 73];
let GRID_GAP = 320;


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


function setup() {
	frameRate(144);
	socket = io.connect(`${window.location.hostname}`);
	createCanvas(window.innerWidth, window.innerHeight);

	socket.on("join", (data) => {
		if (data.name !== undefined) {
			history.pushState(null, '', `/?game=${data.name}`);
		}

		player = new GraphicPlayer(data.position, data.radius, data.health, data.speed, data.color, [new GraphicM4()]);
		player.id = data.id;
		players.length = 0;

		socket.on("players", (roomPlayers) => {
			players.length = 0;
			players.push(...roomPlayers);
		});


		socket.on("new", (data) => {
			let p = new GraphicPlayer(data.position, data.radius, data.health, data.speed, data.color, []);
			p.id = data.id;
			players.push(p);
		});

		socket.on("a", (data) => {
			let p = getPlayerById(data.id);
			if (p) {
				p.setAngle(data.angle);
			}
		});

		socket.on("pos", (data) => {
			let p = getPlayerById(data.id);
			if (p) {
				p.setPosition(data.position);
			}
		});

		socket.on("hp:d", (data) => {
			let p = getPlayerById(data.id);
			if (p) {
				if (data.hasOwnProperty("health")) {
					p.setHealth(data.health);
				}
				p.setDamaged();
			}
		});

		socket.on("axis", (data) => {
			let p = getPlayerById(data.id);
			if (p) {
				p.setAxis(data.axis);
			}
		});

		socket.on("punch", (id) => {
			let p = getPlayerById(id);
			if (p.fist.ready) {
				p.punch();
			}
		});


		socket.on("closed", (id) => {
			let p = getPlayerById(id);
			let i = players.indexOf(p);
			players.splice(i, 1);
		});
	});
}

let lastLoop = new Date();
function draw() {

	if (!player) {
		background(55);
		return null;
	}
	let thisLoop = new Date();
	drawBackground();


	let axis = player.getAxis();
	if (keyIsDown(KEYS.left)) {
		player.setAxis({x : -1});
	} else {
		player.setAxis({x : 0});
		if (keyIsDown(KEYS.right)) {
			player.setAxis({x : 1});
		}
	}
	if (keyIsDown(KEYS.up)) {
		player.setAxis({y : -1});
	} else {
		player.setAxis({y : 0});
		if (keyIsDown(KEYS.down)) {
			player.setAxis({y : 1});
		}
	}

	if (JSON.stringify(axis) !== JSON.stringify(player.getAxis())) {
		socket.emit("axis", player.getAxis());
	}

	player.update(game.deltaTime);
	CAMERA.x = player.position.x;
	CAMERA.y = player.position.y;
	players.forEach((p) => {
		p.update(game.deltaTime);
		p.draw(true);
	});
	player.draw(false);
	let angle = toAngle({x : mouseX, y : mouseY}, {x : width / 2, y : height / 2});
	if (player.getAngle() !== angle) {
		socket.emit("a", angle);
	}
	drawStats();
	push();
	translate(width-20, 30);
	textAlign(RIGHT);
	textSize(20);
	fill(255);
	text(`X: ${player.position.x.toFixed(0)} Y: ${player.position.y.toFixed(0)}`, 0, 0);
	fill(255);
	translate(-width+30, 0);
	textAlign(LEFT);
	text(`Fps : ${floor(game.fps)}`, 0, 0);
	pop();



	game.fps = 1000 / (thisLoop - lastLoop);
	game.deltaTime = FIXED_DELTATIME / game.fps;
	lastLoop = thisLoop;
}

function windowResized() {
	resizeCanvas(window.innerWidth, window.innerHeight);
}


function mousePressed(event) {
	if (event.button === 0) {
		socket.emit("punch");
	}
}


function keyPressed(event) {
	if (event.keyCode > 48 && event.keyCode <= 48 + assets.Player.numberOfSlots) {
		player.changeSlot(event.keyCode-49);
	}
}