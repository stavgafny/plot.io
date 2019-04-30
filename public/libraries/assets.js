// ~All game core objects~

class Item {

    static get DEFAULT_STACK() { return 6; }

    static valid(object) { return object instanceof Item; }

    constructor(name, accessible, maxAmount = 1) {
        this.name = name;
        this.accessible = accessible;
        this.maxAmount = maxAmount;
        this.amount = null;
    }

    get type() { return this.constructor.name; }

    get value() { return this.amount; }
}


class Storage {
    constructor(maxStorage) {
        this.maxStorage = maxStorage;
        this.storage = [];
    }

    insert(item) {
        if (Item.valid(item) && this.storage.length < this.maxStorage) {
            this.storage.push(item);
        }
    }

    getStorage() {
        return Object.assign([], this.storage);
    }
};


class Inventory extends Storage {

    static get FORMAT() { return {storage : [], bar : []}; }

    constructor(maxStorage, maxBar) {
        super(maxStorage);
        this.maxBar = maxBar;
        this.bar = [];
        this.barIndex = -1;
    }

    get currentSlot() { return this.bar[this.barIndex]; }

    getStorage() {
        return {storage : super.getStorage(), bar : Object.assign([], this.bar)};
    }

    insertBar(item) {
        if (Item.valid(item) && this.bar.length < this.maxBar) {
            this.bar.push(item);
        }
    }

    changeSlot(index=-1) {
        if (!(typeof(index) === 'number')) {
            return null;
        }
        if (this.barIndex !== index) {
            this.barIndex = index;
        }
        return this.currentSlot;
    }

}



class Body {
    // ~rigid body~
    constructor(position, radius) {
        this.position = position;
        this.radius = radius;
    }
    collide(body) {
        return Math.pow(body.position.x - this.position.x, 2) + Math.pow(body.position.y - this.position.y, 2) <= Math.pow(this.radius + body.radius, 2);
    }
}

class Ammo extends Item {
    constructor(name, maxAmount, amount) {
        super(name, false, maxAmount);
        this.amount = amount;
    }
}

class Bullet extends Body {

    constructor(position, radius, velocity, range, damage, drag) {
        super(position, radius);
        this.velocity = velocity;
        this.range = range;
        this.damage = damage;
        this.drag = drag;
    }

    outOfRange() {
        return this.range <= 0;
    }

    update(deltaTime=1) {
        
		let ratio = 1 / (1 + (this.drag * deltaTime));
		this.velocity.x *= ratio;
        this.velocity.y *= ratio;
        
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.range = Math.max(this.range - deltaTime, 0);
    }
}

class Weapon extends Item {
    constructor(name, fireRate, maxAmmo, velocity, damage, recoil, range, pulse, isAuto, size, bullet, bulletDrag, currentAmmo) {
        super(name, true, 1);
        this.fireRate = fireRate;
        this.maxAmmo = maxAmmo;
        this.velocity = velocity;
        this.damage = damage;
        this.recoil = recoil;
        this.range = range;
        this.pulse = pulse;
        this.isAuto = isAuto;
        this.size = size;
        this.bullet = bullet;
        this.bulletDrag = bulletDrag;
        this.currentAmmo = currentAmmo < 0 ? this.maxAmmo : currentAmmo;
        this.ready = true;
        this.currentPulse = 0;
    }

    get value() {return this.currentAmmo; }

    isReady() {
        return this.ready;
    }

    use(position, angle, radius) {
        this.ready = false;
        setTimeout(() => {
            this.ready = true;
        }, this.fireRate);
        
        let velocity = {
            x : Math.cos(angle) * this.velocity,
            y : Math.sin(angle) * this.velocity
        };

        let delta = (radius + (this.size.width * radius)) / this.velocity;
        position.x += velocity.x * delta;
        position.y += velocity.y * delta;

        let pulse = this.recoil * this.currentPulse / this.pulse;
        pulse *= (Math.random() * 2) - 1;
        this.currentPulse = this.pulse;
        
        velocity = {
            x : Math.cos(angle + pulse) * this.velocity,
            y : Math.sin(angle + pulse) * this.velocity
        };

        this.currentAmmo--;
        return new Bullet(position, this.bullet.RADIUS, velocity, this.range, this.damage, this.bulletDrag);
    }


    update(deltaTime=1) {
        this.currentPulse = Math.min(Math.max(this.currentPulse - ((this.pulse / 10)*deltaTime), 0), this.pulse);
    }
};




// ~All game assets~


(function(exports) {

    exports.Player = class extends Body {

        static get DEFAULT_INVENTORY() { return new Inventory(4, 2); }

        constructor(position, radius, health, speed, color, inventory = {}) {
            super(position, radius);
            this.health = health;
            this.speed = speed;
            this.setColor(color);

            //if (has backpack)
            //else
            inventory = Object.assign(Inventory.FORMAT, inventory);

            this.inventory = exports.Player.DEFAULT_INVENTORY;
            inventory.storage.forEach((item) => {
                this.inventory.insert(item);
            });
            inventory.bar.forEach((item) => {
                this.inventory.insertBar(item);
            });

            this.currentSlot = null;

            this.axis = {
                x: 0,
                y: 0
            };

            this.angle = 0;
            this.fist = {
                ready: true,
                range: this.radius * 1.2,
                delay: 350,
                dist: this.radius * .65,
                radius: this.radius * .28,
                hitBox: false,
                side: 0
            };
        }

        get alive() { return this.health > 0; }

        getPosition() {
            return {x : this.position.x, y : this.position.y};
        }

        setPosition(position) {
            this.position = position;
        }

        getAngle() {
            return this.angle;
        }

        setAngle(angle) {
            this.angle = angle;
        }

        getHealth() {
            return this.health;
        }

        setHealth(health) {
            this.health = Math.max(health, 0);
        }

        setColor(color) {
            this.color = color;
            if (this.color.fist === undefined) {
                this.color.fist = this.color.body;
            }
        }

        getAxis() {
            return { x: this.axis.x, y: this.axis.y };
        }

        setAxis(axis) {
            Object.assign(this.axis, axis);
        }


        update(deltaTime=1) {
            this.position.x += (this.speed * this.axis.x) * deltaTime;
            this.position.y += (this.speed * this.axis.y) * deltaTime;
            if (this.currentSlot) {
                if (this.currentSlot.accessible) {
					this.currentSlot.update(deltaTime);
				}
            }
        }

        punch(side = Math.round(Math.random())) {
            this.fist.ready = false;
            this.fist.side = side;
            setTimeout(() => {
                this.fist.hitBox = true;
            }, this.fist.delay / 3);

            setTimeout(() => {
                this.fist.ready = true;
                this.fist.hitBox = false;
            }, this.fist.delay);
            return this.fist.side;
        }

        getHitBox() {
            let x = Math.cos(this.angle);
            let y = Math.sin(this.angle);

            return new Body({
                x: this.position.x + (this.fist.dist + this.fist.range) * x,
                y: this.position.y + (this.fist.dist + this.fist.range) * y
            }, this.fist.radius);
        }

        changeSlot(slot) {
            this.currentSlot = this.inventory.changeSlot(slot);
        }

    };


    exports.A556 = class extends Ammo {
        static get RADIUS() { return 5; }
        constructor(amount = 1) {
            super("5.56", Item.DEFAULT_STACK, amount);
        }
    };

    exports.M4 = class extends Weapon {
        constructor(currentAmmo = 0) {
            let size = {
				width : 2.2,
				height : .35
            };
            let bulletDrag = 0.015;
            let pulse = 0.5;
            let rocil = 0.4;
            super("M4", 70, 30, 24.8, 14, rocil, 80, pulse, true, size, exports.A556, bulletDrag, currentAmmo);
        }
    };

    exports.AK47 = class extends Weapon {
        constructor(currentAmmo = 0) {
            let size = {
				width : 2.4,
				height : .38
            };
            let bulletDrag = 0.01;
            let pulse = 0.6;
            let rocil = 0.18;
            super("AK-47", 100, 16, 22.2, 20, rocil, 120, pulse, true, size, exports.A556, bulletDrag, currentAmmo);
        }
        
    };
    
    
    for(let i = 0; i < Object.keys(exports).length; i++) {
        let object = exports[Object.keys(exports)[i]];
        object.id = i;
        object.prototype.id = i;
    };

})(typeof exports === 'undefined' ? this['assets'] = {} : exports);
