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
