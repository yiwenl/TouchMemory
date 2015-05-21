// ViewTest.js

var GL = bongiovi.GL;
var gl;

var glslify = require("glslify");

function ViewTest() {
	var frag = glslify('../shaders/post.frag')
	bongiovi.View.call(this, null, frag);
}

var p = ViewTest.prototype = new bongiovi.View();
p.constructor = ViewTest;


p._init = function() {
	this.mesh = bongiovi.MeshUtils.createPlane(2, 2, 1);
};

p.render = function() {
	if(!this.shader.isReady() ) return;
	this.shader.bind();
	GL.draw(this.mesh);
};

module.exports = ViewTest;