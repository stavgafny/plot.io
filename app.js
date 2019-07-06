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

function getRandomRoom() {
	let r = Math.floor(Math.random() * rooms.length);
	for (let i = r; i < rooms.length + r; i++) {
		if (validRoom(rooms[i % rooms.length])) {
			return rooms[i % rooms.length];
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
		room = getRandomRoom();
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
		config : {
			showHealth : false,
			startInventory : [
				new assets.Wood(3),
				new assets.Wood(10),
				new assets.Wood(3),
			]
		},
		settings : {
			checkPhysicsCutOff : 5
		}
	})
);

rooms[0].run();
/*

rooms.push(
	new gameEngine.BATTLE_ROYALE("1", {

		status : {
			health : 100
		},

		startInventory : [
			new assets.AK47(0),
			new assets.M9(0),
			new assets.A762(18),
			new assets.A9MM(32)
		]
	})
);

rooms[0].run();
rooms[1].run();

*/