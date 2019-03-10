'use strict';

const express = require('express');
const socketEngine = require('socket.io');
const assets = require('./public/libraries/assets.js');
const gameEngine = require('./gameEngine.js');
gameEngine.assets = assets;


const PORT = 80;
const GET = "/?game=";
const app = express();
app.use(express.static('public'));


const server = app.listen(PORT, () => {
	console.log(`server is running at port: ${PORT}`);
});

const io = socketEngine(server);
gameEngine.io = io;

const rooms = [];
rooms.push(
	new gameEngine.Room("1", "FFA", {startInventory : [assets.M4, assets.Semi]}),
	new gameEngine.Room("2", "FFA", { showHealth: true }),
	new gameEngine.Room("3", "FFA", { radius: 50, defaultPlayerColor: { stroke: [255, 255, 0], body: [100, 200, 200] }, startHp: 10, speed: 8 })
);

function validRoom(room) {
	if (room)
		return room.players.length < room.config.maxPlayers && room.isRunning();
	return false;
}

function getRoomByName(name) {
	for (let i = 0; i < rooms.length; i++) {
		if (name === rooms[i].get())
			return rooms[i];
	}
	return undefined;
}

function getRandomRoom() {
	let r = Math.floor(Math.random() * rooms.length);
	for (let i = r; i < rooms.length + r; i++) {
		if (validRoom(rooms[i % rooms.length])) {
			return rooms[i % rooms.length];
		}
	}
}


rooms[0].run();
//rooms[1].run();
//rooms[2].run();

io.sockets.on('connection', (socket) => {
	console.log(`New user has joined: ${socket.id}`);
	const get = socket.handshake.headers.referer;
	const reqRoom = get.lastIndexOf(GET) + 1 ? get.substring(get.lastIndexOf(GET) + GET.length) : "";
	let room = getRoomByName(reqRoom);
	let redirect = false;
	if (!validRoom(room)) {
		room = getRandomRoom();
		redirect = true;
	}


	const player = room.createPlayer(socket);
	const playerData = room.strip(player);
	io.sockets.in(room.get()).emit('new', playerData);
	Object.assign(playerData, { health: player.health });
	socket.emit("join", redirect ? Object.assign({ name: room.get() }, playerData) : playerData);
	room.players.forEach((p) => {
		socket.emit("new", room.strip(p));
	});

	socket.join(room.get());
	room.addPlayer(player);


	socket.on("a", (angle) => {
		player.setAngle(angle);
		io.sockets.in(room.get()).emit('a', { id: player.id, angle: angle });
	});

	socket.on("axis", (axis) => {
		room.setPlayerAxis(player, axis);
	});

	socket.on("changeSlot", (slotNumber) => {
		room.changePlayerSlot(player, slotNumber);
	});

	socket.on("action+", () => {
		player.hold = true;
		room.playerAction(player);
	});

	socket.on("action-", () => {
		player.hold = false;
	});

	socket.on('disconnect', () => {
		io.sockets.in(room.get()).emit('closed', player.id);
		room.removePlayer(player);
		return null;
	});
});
