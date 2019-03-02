'use strict';

const assets = require('./public/libraries/assets.js');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

const FIXED_DELTATIME = 60;
exports.io = null;
const TICK = 60;


const DEFAULT_ROOM = {
  config : {
    startHp : 100.0,
    radius : 30,
    speed : 3.6,
    maxPlayers : 10,
    defaultPlayerColor : config.defaultPlayerColor,
    playerFistDamage : 20,
    showHealth : false
  }, 
  map : {
    size : 1000
  },

};


exports.Room = class {
  constructor(name, type, config={}, map={}) {
    this.name = name;
    this.type = type;
    this.config = Object.assign({}, DEFAULT_ROOM.config, config);
    this.map = Object.assign({}, DEFAULT_ROOM.map, map);
    this.players = [];

    this.worker = null;
    this.deltaTime = 0;
    this.counter = 0;
  }

  get() {
    return `${this.type}:${this.name}`;
  }

  strip(player) {
    let p = {
      position : player.position,
      radius : player.radius,
      health : 0,
      speed : player.speed,
      color : player.color,
      id : player.id
    };
    if (this.config.showHealth) {
      p.health = player.health;
    }
    return p;
  }


  createPlayer(socket=null) {
    let player = new assets.Player({x : 2000, y : 2000}, this.config.radius, this.config.startHp, this.config.speed, this.config.defaultPlayerColor);
    player.id = this.counter;
    player.socket = socket;
    return player;
  }

  addPlayer(player) {
    this.players.push(player);
    this.counter++;
  }

  isRunning() {
    return this.worker !== null;
  }

  run() {
    let lastLoop = 0;
    this.worker = setInterval(() => {
      let thisLoop = Date.now();
      for (let i = 0; i < this.players.length; i++) {
        let player = this.players[i];
        player.update(this.deltaTime);
        exports.io.sockets.in(this.get()).emit('pos', {id : player.id, position : player.position});

        if (player.fist.hitBox) {
          let hitBox = player.getHitBox();

          for (let p = 0; p < this.players.length && player.fist.hitBox; p++) {
            if (this.players[p] !== player) {
              if (hitBox.collide(this.players[p])) {
                this.damagePlayer(this.players[p], this.config.playerFistDamage);
                player.fist.hitBox = false;
              }
            }
          }
        }

      }
      this.deltaTime = FIXED_DELTATIME / (1000 / (thisLoop-lastLoop));
      lastLoop = thisLoop;
    }, 1000/TICK);
  }
  stop() {
      clearInterval(this.worker);
  }

  removePlayer(player) {
    let i = this.players.indexOf(player);
    this.players.splice(i, 1);
  }

  setPlayerAxis(player, axis) {
    player.setAxis(axis);
    exports.io.sockets.in(this.get()).emit('axis', {id : player.id, axis : player.axis});
    //exports.io.sockets.in(this.get()).emit('pos', {id : player.id, position : player.position});

  }

  playerPunch(player) {
    if (player.fist.ready) {
      exports.io.sockets.in(this.get()).emit("punch", {side : player.punch(), id : player.id});
  	}
  }

  damagePlayer(player, damage) {
    player.setHealth(player.getHealth() - damage);
    let data = {id : player.id, health : player.getHealth()};
    if (!this.config.showHealth) {
      player.socket.emit('hp:d', data);
      delete data.health;
    }
    exports.io.sockets.in(this.get()).emit('hp:d', data);
  }


  changePlayerSlot(player, slot) {
    player.changeSlot(slot);
    exports.io.sockets.in(this.get()).emit("changeSlot", {slot : player.slotIndex, id : player.id});

  }

}