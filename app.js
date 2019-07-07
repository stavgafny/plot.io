'use strict';

const express = require('express');
const socketEngine = require('socket.io');
const gameEngine = require('./gameEngine.js');
const assets = gameEngine.assets;


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

function validRoom(room) {
	if (room)
		return room.players.length < room.config.maxPlayers && room.running;
	return false;
}

function getRoomByName(name) {
	for (let i = 0; i < rooms.length; i++) {
		if (name === rooms[i].stringify)
			return rooms[i];
	}
	return undefined;
}

function getRandomRoom(mode) {
	// Tries first to get a random valid room based on given mode, if fails or no mode was given then picks any random valid room.
	if (mode) {
		const modeRooms = rooms.filter(room => room.mode === mode);
		const r = Math.floor(Math.random() * modeRooms.length);
		for (let i = r; i < modeRooms.length + r; i++) {
			const room = modeRooms[i % modeRooms.length];
			if (room.mode === mode && validRoom(room)) {
				return room;
			}
		}
	}
	const r = Math.floor(Math.random() * rooms.length);
	for (let i = r; i < rooms.length + r; i++) {
		const room = rooms[i % rooms.length];
		if (validRoom(room)) {
			return room;
		}
	}
}

const handleConnection = socket => {

	// client full url
	const get = socket.handshake.headers.referer;

	// Gets requested room if exists.
	const requestedRoom = get.lastIndexOf(GET) + 1 ? get.substring(get.lastIndexOf(GET) + GET.length) : null;

	if (requestedRoom === null) {

	}

	// Gets the room by its name if there is else returns undefined.
	let room = getRoomByName(requestedRoom);


	// Checks if requested room is valid(exist, has a free spot, currently running) if its not then it will pick a random room(if can).
	if (!validRoom(room)) {
		// Gets a random valid room that matches requested room mode (if has one, else, picks any random valid room).
		const mode = (requestedRoom ?? "").split(":")[0];
		room = getRandomRoom(mode);
	}

	// If there are no servers available.
	if (!room) {
		return null;
	}

	// Adds the player to the room and handles all of his future requests
	room.addPlayer(socket);
}

io.sockets.on("connection", handleConnection);


rooms.push(
	new gameEngine.Room("1", "FFA", {
		config: {
			showHealth: false,
			startInventory: [
				new assets.M4(),
				new assets.M9(15),
				new assets.Wood(4),
				new assets.Stone(2),
				new assets.A556(50),
			]
		},
		settings: {
			physicsDelayThreshold: 5
		}
	})
);

rooms.push(
	new gameEngine.BATTLE_ROYAL("1", {
		config: {
			maxPlayers: 3,
			showHealth: true,
			status: { health: 100 },
			startInventory: [
				new assets.AK47(0),
				new assets.A762(100),
			]
		},
		settings: {
			physicsDelayThreshold: 5
		}
	})
);

for (const room of rooms)
	room.run();