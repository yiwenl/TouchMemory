// SceneApp.js

var GL = bongiovi.GL, gl;

var ViewTest = require("./ViewTest");

function SceneApp() {
	gl = GL.gl;
	bongiovi.Scene.call(this);
}


var p = SceneApp.prototype = new bongiovi.Scene();

p._initTextures = function() {
	// console.log("init textures");
};

p._initViews = function() {
	// console.log('init views');
	this._vTest = new ViewTest();
};

p.render = function() {
	GL.clear(0, 0, 0, 0);

	GL.setMatrices(this.cameraOtho);
	GL.rotate(this.rotationFront);

	this._vTest.render();
};

module.exports = SceneApp;