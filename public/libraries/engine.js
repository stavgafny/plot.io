function fixedCamera(pos) {
 	return {x : width/2 - CAMERA.x + pos.x, y : height/2 - CAMERA.y + pos.y};
}

function toAngle(target, position) {
	let v1 = width/position.x;
	let v2 = height/position.y;
	let a = atan2(target.y - height / v2, target.x - width / v1);
	return a;
}