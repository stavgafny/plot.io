// ~All game core objects~

class Item {

    static get stack() { return 64; }

    constructor(name, accessible, maxAmount = 1) {
        this.name = name;
        this.accessible = accessible;
        this.maxAmount = maxAmount;
    }

    get id() {
        return Object.keys(exports).indexOf(this.name);
    }

    getName() {
        return this.name;
    }

    getWeight() {
        return this.weight;
    }

    isAccessible() {
        return this.accessible;
    }

    setAmount(value) {
        this.amount = value;
    }

    getMaxAmout() {
        return this.maxAmount;
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
    constructor(name) {
        super(name, false, Item.stack);
    }
}

class Bullet extends Body {
    constructor(position, radius, velocity, range, damage) {
        super(position, radius);
        this.velocity = velocity;
        this.range = range;
        this.damage = damage;
    }

    outOfRange() {
        return this.range <= 0;
    }

    update(deltaTime=1) {
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.range = Math.max(this.range - deltaTime, 0);
    }
}

class Weapon extends Item {
    constructor(name, fireRate, maxAmmo, velocity, damage, recoil, range, isAuto, size, bullet) {
        super(name, true, 1);
        this.fireRate = fireRate;
        this.maxAmmo = maxAmmo;
        this.velocity = velocity;
        this.damage = damage;
        this.recoil = recoil;
        this.range = range;
        this.isAuto = isAuto;
        this.size = size;
        this.bullet = bullet;
        this.ready = true;
    }

    isReady() {
        return this.ready;
    }

    use(position, angle, radius) {
        let velocity = {
            x : Math.cos(angle) * this.velocity,
            y : Math.sin(angle) * this.velocity
        };
        
        this.ready = false;
        setTimeout(() => {
            this.ready = true;
        }, this.fireRate);
        
        let delta = (radius + (this.size.width * radius)) / this.velocity;

        position.x += velocity.x * delta;
        position.y += velocity.y * delta;

        return new Bullet(position, this.bullet.radius, velocity, this.range, this.damage);
    }
};




// ~All game assets~


(function(exports) {

    exports.Player = class extends Body {

        static get numberOfSlots() { return 2; }

        constructor(position, radius, health, speed, color, inventory = []) {
            super(position, radius);
            this.health = health;
            this.speed = speed;
            this.setColor(color);
            this.inventory = inventory;
            this.slotIndex = -1;
            this.axis = {
                x: 0,
                y: 0
            };

            this.angle = 0;
            this.fist = {
                ready: true,
                range: this.radius * 1.2,
                delay: 400,
                dist: this.radius * .65,
                radius: this.radius * .28,
                hitBox: false,
                side: 0
            };
        }

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

        getSlotIndex() {
            return this.slotIndex;
        }

        changeSlot(index) {
            let object = this.getCurrentSlot();
            if (this.slotIndex !== index) {
                this.slotIndex = index;
                return object;
            }
            return null;
        }

        getCurrentSlot() {
            return this.inventory[this.slotIndex];
        }
    };


    exports.A556 = class extends Ammo {
        static get radius() { return 6; }
        constructor() {
            super("A556");
        }
    };
    

    exports.A762 = class extends Ammo {
        static get radius() { return 8; }
        constructor() {
            super("A762");
        }
    };

    exports.M4 = class extends Weapon {
        constructor() {
            let size = {
				width : 2.2,
				height : .4
			}
            super("M4", 100, 30, 13.2, 16, 0.6, 60, true, size, exports.A556);
        }
    };

    exports.Semi = class extends Weapon {
        constructor() {
            let size = {
				width : 2.4,
				height : .42
			}
            super("Semi", 160, 16, 15.2, 24, 0, 80, false, size, exports.A762);
        }
    };
    

    for(let i = 0; i < Object.keys(exports).length; i++) {
        let object = exports[Object.keys(exports)[i]];
        object.id = i;
      };

})(typeof exports === 'undefined'? this['assets']={}: exports);
