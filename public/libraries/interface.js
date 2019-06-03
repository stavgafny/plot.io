/*
class PlayerUI {

	static get PROPERTIES() {
		return {
			border : {
				size : 10,
				color : [160, 160, 160, 180]
			},

			block : {
				size : 70,
				color : [80, 80, 80, 100],
				stroke : [0, 0, 0, 80],
				strokeWeight : 1,
				highlight : {
					color : [255, 0, 0, 60],
					stroke : [255, 255, 255, 150],
					strokeWeight : 2
				},
				select : {
					color : [255, 255, 255, 100],
					stroke : [255, 255, 255],
					strokeWeight : 2
				}
			},
			spacing : 5,
			radius : 6
		};
	}

	constructor(player) {
		this.player = player;
		this.border = PlayerUI.PROPERTIES.border;
		this.block = PlayerUI.PROPERTIES.block;
		this.spacing = PlayerUI.PROPERTIES.spacing;
		this.radius = PlayerUI.PROPERTIES.radius;
		this.focus = false;
		this.select = null;
		this.hold = null;
	}

	toggle() {
		this.focus = !this.focus;
	}

	_mouseOnBlock(x, y) {
		return mouseX > x - this.block.size / 2 &&
			mouseX < x + this.block.size / 2 &&
			mouseY > y - this.block.size / 2 &&
			mouseY < y + this.block.size / 2;
	}

	_drawBorder(x, y, w, h, radius = this.radius) {
		push();
		rectMode(CENTER);
		imageMode(CENTER);
		noStroke();
		fill(this.border.color);
		rect(
			x,
			y,
			((this.block.size + this.spacing) * w) + this.border.size - this.spacing,
			((this.block.size + this.spacing) * h) + this.border.size - this.spacing,
			radius
		);
		pop();
	}

	_block(x, y, index, highlight=false) { // hightlight mode 0-NONE -1 Onselect -2 On mouse
		push();
		let slot = this.player.inventory.value[index];
		let select = false;

		if (this.focus && !this.select && (slot || this.hold)) {
			let isHoldedSelected = false;
			if (this.hold) {
				isHoldedSelected = slot === this.hold.item;
			}
			if (!isHoldedSelected) {
				if (this._mouseOnBlock(x, y)) {
					this.select = index;
					select = true;
				}
			}
		}

		if (select && slot !== this.hold) { // not selcets the holded item and not selecting empty blocks
			stroke(this.block.select.stroke);
			fill(this.block.select.color);
			strokeWeight(this.block.select.strokeWeight);
		}
		else if (highlight) {
			stroke(this.block.highlight.stroke);
			fill(this.block.highlight.color);
			strokeWeight(this.block.highlight.strokeWeight);
		} else {
			stroke(this.block.stroke);
			fill(this.block.color);
			strokeWeight(this.block.strokeWeight);
		}
		rect(x, y, this.block.size, this.block.size, this.radius);
		pop();
		if (!Item.valid(slot)) {
			return false;
		}
		if (ICONS[slot.name]) {
			image(ICONS[slot.name], x, y, this.block.size, this.block.size);
		}
		let value = "";
		if (slot.amount > 1) {
			value = "x" + slot.value.toString();
		} else {
			if (slot.type === "Weapon") {
				value = slot.value.toString();
			}
		}

		push();
		fill(255);
		noStroke();
		textAlign(CENTER);
		textSize(this.block.size / 5)
		text(value, x, y + this.block.size * .45);
		pop();
	}

	draw() {
		let length = this.player.inventory.maxBar;
		let X, Y, index;
		this.select = null;
		push();
		rectMode(CENTER);
		imageMode(CENTER);
		X = (width / 2) + (this.block.size / 2);
		Y = height - this.block.size;
		this._drawBorder(X-this.block.size / 2, Y, length, 1);

		index = 0;
		for (let x = -length / 2; x < length / 2; x++) {
			this._block(
				X + this.spacing / 2 + (this.block.size + this.spacing) * x,
				Y,
				index,
				index++ === this.player.inventory.barIndex
			);
		}
		pop();

		if (!this.focus) {
			return null;
		}

		length = Math.ceil(Math.sqrt(this.player.inventory.maxStorage));
		let value = Math.sqrt(this.player.inventory.maxStorage) % 1;
		value = value % 1 >= .5 || value % 1 === 0 ? 0 : 1;
		push();
		rectMode(CENTER);
		imageMode(CENTER);
		X = (width / 2) + (this.block.size / 2);
		Y = (this.block.size * length / 2) + this.block.size;

		this._drawBorder(X-this.block.size / 2, Y-this.block.size / 2 * value, length, length - value);
		Y += this.block.size / 2;
		for (let y = -length / 2; y < length / 2; y++) {
			for (let x = -length / 2; x < length / 2 && (index-this.player.inventory.maxBar) < this.player.inventory.maxStorage; x++) {
				this._block(
					X + this.spacing / 2 + (this.block.size + this.spacing) * x,
					Y + this.spacing / 2 + (this.block.size + this.spacing) * y,
					index++,
					false
				);
			}
		}

		if (this.hold) {
			let value = this.player.inventory.value;
			this.player.inventory.value = [this.hold.item];
			this._block(mouseX, mouseY, 0, false);
			this.player.inventory.value = value;
		}
		pop();
	}

	mousePressed() {
		if (this.select !== null) {
			this.hold = {
				item : this.player.inventory.value[this.select],
				index : this.select
			};
			this.player.inventory.value[this.select] = undefined;
		}
	}

	mouseReleased() {
		let value = null;
		if (this.hold) {
			value = { index1 : this.hold.index };
			if (this.select !== null) {
				value.index2 = this.select;
				this.player.inventory.value[this.hold.index] = this.hold.item;
				this.player.inventory.switch(this.hold.index, this.select);
			}
		}
		this.select = null;
		this.hold = null;
		return value;
	}
}

*/



class PlayerUI {
	
	static get PROPERTIES() {
		return {
			border : {
				size : 10,
				color : [160, 160, 160, 180]
			},

			block : {
				size : 70,
				color : [80, 80, 80, 120],
				stroke : [0, 0, 0, 80],
				strokeWeight : 0,
				highlight : {
					color : [30, 100, 200, 120],
					stroke : [255, 255, 255, 150],
					strokeWeight : 0
				},
				select : {
					color : [255, 255, 255, 100],
					stroke : [255, 255, 255],
					strokeWeight : 0
				}
			},
			spacing : 6,
			radius : 4
		};
	}


	constructor(player) {
		this.player = player;
		this.border = PlayerUI.PROPERTIES.border;
		this.block = PlayerUI.PROPERTIES.block;
		this.spacing = PlayerUI.PROPERTIES.spacing;
		this.radius = PlayerUI.PROPERTIES.radius;
		this.focus = false;
		this.select = null;
		this.hold = null;
	}


	toggle() {
		this.focus = !this.focus;
		this.hold = null;
	}


	_mouseOnBlock(x, y) {
		return mouseX > x - this.block.size / 2 &&
			mouseX < x + this.block.size / 2 &&
			mouseY > y - this.block.size / 2 &&
			mouseY < y + this.block.size / 2;
	}


	_drawBorder(x, y, w, h, radius = this.radius) {
		push();
		noStroke();
		fill(this.border.color);
		rect(
			x,
			y,
			((this.block.size + this.spacing) * w) + this.border.size - this.spacing,
			((this.block.size + this.spacing) * h) + this.border.size - this.spacing,
			radius
		);
		pop();
	}


	_block(x, y, index, highlight = false, hold = false) { // hightlight mode 0-NONE -1 Onselect -2 On mouse
		push();
		let slot = this.player.inventory.storage[index];
		let select = false;

		if (this.focus && this.select === null && (slot || this.hold !== null) && !hold) {
			let isHoldedSelected = false;
			if (!isHoldedSelected) {
				if (this._mouseOnBlock(x, y)) {
					this.select = index;
					select = true;
				}
			}
		}

		if (select && slot !== this.hold) { // not selcets the holded item and not selecting empty blocks
			stroke(this.block.select.stroke);
			fill(this.block.select.color);
			strokeWeight(this.block.select.strokeWeight);
		}
		else if (highlight) {
			stroke(this.block.highlight.stroke);
			fill(this.block.highlight.color);
			strokeWeight(this.block.highlight.strokeWeight);
		} else {
			stroke(this.block.stroke);
			fill(this.block.color);
			strokeWeight(this.block.strokeWeight);
		}
		rect(x, y, this.block.size, this.block.size, this.radius);
		pop();
		if (!Item.valid(slot)) {
			return false;
		}
		const icon = ICONS[slot.name] ? ICONS[slot.name] : ICONS['none'];
		image(icon, x, y, this.block.size, this.block.size);
		
		let value = "";
		if (slot.amount > 1) {
			value = "x" + slot.value.toString();
		} else {
			if (slot.type === "Weapon") {
				value = slot.value.toString();
			}
		}

		push();
		fill(255);
		noStroke();
		textAlign(RIGHT);
		textSize(this.block.size / 5)
		text(value, x + this.block.size / 2 - 4, y + this.block.size / 2 - 4);
		pop();
	}


	draw() {
		let length = this.player.inventory.maxBar;
		let X, Y, index;
		this.select = null;

		push();
		rectMode(CENTER);
		imageMode(CENTER);
		X = (width / 2) + (this.block.size / 2);
		Y = height - this.block.size;
		this._drawBorder(X - this.block.size / 2, Y, length, 1);
		index = 0;
		for (let x = -length / 2; x < length / 2; x++) {
			this._block(
				X + this.spacing / 2 + (this.block.size + this.spacing) * x,
				Y,
				index,
				index++ === this.player.inventory.barIndex
			);
		}

		if (!this.focus) {
			pop();
			return null;
		}

		length = Math.ceil(Math.sqrt(this.player.inventory.maxStorage));
		let value = Math.sqrt(this.player.inventory.maxStorage) % 1;
		value = value % 1 >= .5 || value % 1 === 0 ? 0 : 1;
		let gap = this.block.size / 2;
		X = (width / 2) + (this.block.size / 2);
		Y -= gap + this.border.size + ((this.spacing +  this.block.size) * ((length / 2.0) - 0.5 * value)) - this.spacing / 2;
		this._drawBorder(
			X - this.block.size / 2,
			Y - this.block.size / 2,
			length,
			length - value
		);
		
		Y += (this.block.size / 2) * value;
		for (let y = -length / 2; y < length / 2; y++) {
			for (let x = -length / 2; x < length / 2 && (index-this.player.inventory.maxBar) < this.player.inventory.maxStorage; x++) {
				this._block(
					X + this.spacing / 2 + (this.block.size + this.spacing) * x,
					Y + this.spacing / 2 + (this.block.size + this.spacing) * y,
					index++,
					false
				);
			}
		}
		if (this.hold !== null) {
			this._block(
				mouseX,
				mouseY,
				this.hold,
				false,
				true
			);
		}

		pop();
	}


	mousePressed() {
		if (this.select !== null) {
			this.hold = this.select
		}
	}
	
	
	mouseReleased() {
		if (this.hold === null) {
			return null;
		}
		const value = {
			source : this.hold
		};

		if (this.select !== null) {
			Object.assign(value, { target : this.select })
		}

		this.hold = null;

		return value;
	}
}




function drawBackground() {
	background(GROUND_COLOR);
	//draw grid
	let deltaX = CAMERA.x % GRID_GAP;
	let deltaY = CAMERA.y % GRID_GAP;
	let lengthX = Math.ceil(width / GRID_GAP);
	let lengthY = Math.ceil(height / GRID_GAP);

	push();
	translate(0, 0);
	strokeWeight(2);
	stroke([0, 0, 0, 120]);
	for (let x = 0; x <= lengthX; x++) {
		line(GRID_GAP*x - deltaX, 0, GRID_GAP*x - deltaX, height);
	}
	for (let y = 0; y <= lengthY; y++) {
		line(0, GRID_GAP*y  - deltaY, width, GRID_GAP*y - deltaY);
	}
	pop();
}


function drawStats() {
	return;
	const gap = width/3;
	const length = width - gap*2;
	const barHeight = 30;
	const radius = 0;
	const hp = Math.max(map(player.health, 0, 100, 0, length), 0);
	const color = map(player.health, 0, 100, 0, 255);

	push();
	noStroke();
	fill(255, color, color);
	rect(gap, height-(barHeight*1.6), hp, barHeight, radius);
	noFill();
	stroke(0);
	strokeWeight(2);
	rect(gap, height-(barHeight*1.6), length, barHeight, radius);
	pop();
}
