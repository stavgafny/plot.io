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
	console.log(`New user has joined: ${socket.id}`);
	
	// client full url
	const get = socket.handshake.headers.referer;

	// Gets requested room if exists.
	const requestedRoom = get.lastIndexOf(GET) + 1 ? get.substring(get.lastIndexOf(GET) + GET.length) : "";

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
		showHealth : true,
		startInventory : {
			bar : [
				[assets.M4, 10],
				[assets.A556, 22]
			]
		}
	})//,
	//new gameEngine.Room("2", "FFA", { showHealth: true }),
	//new gameEngine.Room("3", "FFA", { radius: 50, defaultPlayerColor: { stroke: [255, 255, 0], body: [100, 200, 200] }, startHp: 10, speed: 8 })
);

rooms[0].run();