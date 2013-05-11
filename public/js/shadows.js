var gl = false;
var canvas;
var rects;

var fbo1;
var fbo2;

var shaders = {};

var mouseLight = false;
var mousex = 0;
var mousey = 0;

var fps = 0;

setInterval(function() {
  rects[0].style.width = fps * 10 + "px";
  rects[0].innerHTML = "FPS: " + fps;
  //console.log(fps);
  fps = 0;
}, 1000);

window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame || 
    window.webkitRequestAnimationFrame || 
    window.mozRequestAnimationFrame || 
    window.oRequestAnimationFrame || 
    window.msRequestAnimationFrame || 
    function( callback ){
      window.setTimeout(callback, 1000 / 60);
    };
})();

function render() {
  gl.useProgram(shaders["raytrace"]);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo1);
  gl.clear(gl.COLOR_BUFFER_BIT);
    
  if (mouseLight) gl.uniform2f(shaders["raytrace"].uLightUniform, mousex, gl.viewportHeight - mousey);
  var uniformArray = new Float32Array(50 * 4);
  var tmpcanvas = canvas.getBoundingClientRect();
  for (var i = 0; i < rects.length && i < 50; i++) {
    var tmp = rects[i].getBoundingClientRect();
    uniformArray[i * 4] = tmp.left - tmpcanvas.left;
    uniformArray[i * 4 + 1] = gl.viewportHeight - tmp.bottom + tmpcanvas.top;
    uniformArray[i * 4 + 2] = tmp.right - tmpcanvas.left;
    uniformArray[i * 4 + 3] = gl.viewportHeight - tmp.top + tmpcanvas.top;
  }
  gl.uniform4fv(shaders["raytrace"].uRectUniform, uniformArray);
  gl.uniform1i(shaders["raytrace"].uRectsUniform, rects.length);
  
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  
  gl.useProgram(shaders["penumbra1"]);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo2);
  gl.clear(gl.COLOR_BUFFER_BIT);
    
  if (mouseLight) gl.uniform2f(shaders["penumbra1"].uLightUniform, mousex, gl.viewportHeight - mousey);
  
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  
  gl.useProgram(shaders["penumbra2"]);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.clear(gl.COLOR_BUFFER_BIT);
    
  if (mouseLight) gl.uniform2f(shaders["penumbra2"].uLightUniform, mousex, gl.viewportHeight - mousey);
  
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  fps++;
}

function initBuffers() {
  if (!gl || !shaders["raytrace"] || !shaders["penumbra1"] || !shaders["penumbra2"]) return;

  var vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  vertices = [
    gl.viewportWidth,  gl.viewportHeight,
    0.0,  gl.viewportHeight,
    gl.viewportWidth, 0.0,
    0.0, 0.0
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  
  var fboTexture1 = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, fboTexture1);
  
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.viewportWidth, gl.viewportHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  var fboTexture2 = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, fboTexture2);

  
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.viewportWidth, gl.viewportHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  
  fbo1 = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo1);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTexture1, 0);

  fbo2 = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo2);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTexture2, 0);

  var pMatrix = mat4.ortho(0, gl.viewportWidth, gl.viewportHeight, 0, 0.001, 100000);
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.useProgram(shaders["raytrace"]);
  gl.uniformMatrix4fv(shaders["raytrace"].pMatrixUniform, false, pMatrix);
  gl.vertexAttribPointer(shaders["raytrace"].vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);

  if (!mouseLight) gl.uniform2f(shaders["raytrace"].uLightUniform, gl.viewportWidth / 2, 0);

  gl.useProgram(shaders["penumbra1"]);
  gl.uniformMatrix4fv(shaders["penumbra1"].pMatrixUniform, false, pMatrix);
  gl.vertexAttribPointer(shaders["penumbra1"].vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
  gl.uniform1i(shaders["penumbra1"].uBufferUniform, 0);
  gl.uniform2f(shaders["penumbra1"].uSizeUniform, gl.viewportWidth, gl.viewportHeight);
  gl.uniform1f(shaders["penumbra1"].uLightSizeUniform, Math.sqrt(gl.viewportWidth * gl.viewportWidth / 4 + gl.viewportHeight * gl.viewportHeight));

  if (!mouseLight) gl.uniform2f(shaders["penumbra1"].uLightUniform, gl.viewportWidth / 2, 0);

  gl.useProgram(shaders["penumbra2"]);
  gl.uniformMatrix4fv(shaders["penumbra2"].pMatrixUniform, false, pMatrix);
  gl.vertexAttribPointer(shaders["penumbra2"].vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
  gl.uniform1i(shaders["penumbra2"].uBufferUniform, 1);
  gl.uniform2f(shaders["penumbra2"].uSizeUniform, gl.viewportWidth, gl.viewportHeight);
  gl.uniform1f(shaders["penumbra2"].uLightSizeUniform, Math.sqrt(gl.viewportWidth * gl.viewportWidth / 4 + gl.viewportHeight * gl.viewportHeight));

  if (!mouseLight) gl.uniform2f(shaders["penumbra2"].uLightUniform, gl.viewportWidth / 2, 0);
}

function ajaxGet(url, callback) {
  var http;
  if (typeof ActiveXObject != 'undefined') {
    try {
      http = new ActiveXObject("Msxml2.XMLHTTP");
    } catch (e) {
      try {
        http = new ActiveXObject("Microsoft.XMLHTTP");
      } catch (e2) {
        return;
      }
    }
  } else if (window.XMLHttpRequest) {
    try {
      http = new XMLHttpRequest();
    } catch (e) {
      return;
    }
  } else return;

  http.open("GET", url + "?", true);
  http.onreadystatechange = function() {
    if (http.readyState == 4 && http.status == 200) callback(http.responseText);
  }
  http.send(null);
}

function loadShaders(shaderList, callback) {
  var completeCallback = function(name, source) {
    var ext = shaderList[name].url.substr(shaderList[name].url.length - 5);
    if (ext === ".frag") {
      shaderList[name].shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (ext === ".vert") {
      shaderList[name].shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
      shaderList[name].shader = false;
      return;
    }

    gl.shaderSource(shaderList[name].shader, source);
    gl.compileShader(shaderList[name].shader);

    if (!gl.getShaderParameter(shaderList[name].shader, gl.COMPILE_STATUS)) {
      console.log("Error in shader: " + name);
      console.log(gl.getShaderInfoLog(shaderList[name].shader));
      shaderList[name].shader = false;
      return;
    }

    var complete = true;
    for (var name in shaderList) {
      if (!shaderList[name].shader) {
        complete = false;
        break;
      }
    }
    if (complete) callback();
  };
  for (var name in shaderList) {
    (function (name) {
      ajaxGet(shaderList[name].url, function(data) {
        completeCallback(name, data);
      });
    })(name);
  }
}

function loadGL() {
  canvas = document.getElementById("glcanvas");
  var overlay = document.getElementById("overlay");
  rects = overlay.getElementsByClassName("glshadow");

  var resizeCanvas = function() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (gl) {
      gl.viewportWidth = canvas.width;
      gl.viewportHeight = canvas.height;

      initBuffers();
    }
  };
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  try {
    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
    
    overlay.addEventListener('mousemove', function(evt) {
      var tmp = canvas.getBoundingClientRect();
      mousex = evt.clientX - tmp.left;
      mousey = evt.clientY - tmp.top;
    });
    overlay.addEventListener('click', function(evt) {
      mouseLight = !mouseLight;
      var tmp = canvas.getBoundingClientRect();
      mousex = evt.clientX - tmp.left;
      mousey = evt.clientY - tmp.top;
      initBuffers();
    });
  } catch (e) {
    console.log(e);
  }
  if (!gl) {
    console.log("Could not initialize WebGL!");
  }

  var shaderList = {"vertex": {url: "shaders/vertex.vert"}, "raytrace": {url: "shaders/raytrace.frag"}, "penumbra1": {url: "shaders/penumbra1.frag"}, "penumbra2": {url: "shaders/penumbra2.frag"}};

  loadShaders(shaderList, function() {
    shaders["raytrace"] = gl.createProgram();
    gl.attachShader(shaders["raytrace"], shaderList["vertex"].shader);
    gl.attachShader(shaders["raytrace"], shaderList["raytrace"].shader);
    gl.linkProgram(shaders["raytrace"]);

    shaders["penumbra1"] = gl.createProgram();
    gl.attachShader(shaders["penumbra1"], shaderList["vertex"].shader);
    gl.attachShader(shaders["penumbra1"], shaderList["penumbra1"].shader);
    gl.linkProgram(shaders["penumbra1"]);

    shaders["penumbra2"] = gl.createProgram();
    gl.attachShader(shaders["penumbra2"], shaderList["vertex"].shader);
    gl.attachShader(shaders["penumbra2"], shaderList["penumbra2"].shader);
    gl.linkProgram(shaders["penumbra2"]);

    for (var name in shaders) {
      if (!gl.getProgramParameter(shaders[name], gl.LINK_STATUS)) {
        console.log("Could not initialize shader: " + name);
        return;
      }
    }

    shaders["raytrace"].vertexPositionAttribute = gl.getAttribLocation(shaders["raytrace"], "aVertexPosition");
    shaders["raytrace"].pMatrixUniform = gl.getUniformLocation(shaders["raytrace"], "uPMatrix");
    shaders["raytrace"].uLightUniform = gl.getUniformLocation(shaders["raytrace"], "u_light");
    shaders["raytrace"].uRectUniform = gl.getUniformLocation(shaders["raytrace"], "u_rect");
    shaders["raytrace"].uRectsUniform = gl.getUniformLocation(shaders["raytrace"], "u_rects");

    shaders["penumbra1"].vertexPositionAttribute = gl.getAttribLocation(shaders["penumbra1"], "aVertexPosition");
    shaders["penumbra1"].pMatrixUniform = gl.getUniformLocation(shaders["penumbra1"], "uPMatrix");
    shaders["penumbra1"].uBufferUniform = gl.getUniformLocation(shaders["penumbra1"], "u_buffer");
    shaders["penumbra1"].uSizeUniform = gl.getUniformLocation(shaders["penumbra1"], "u_size");
    shaders["penumbra1"].uLightUniform = gl.getUniformLocation(shaders["penumbra1"], "u_light");
    shaders["penumbra1"].uLightSizeUniform = gl.getUniformLocation(shaders["penumbra1"], "u_lightSize");

    shaders["penumbra2"].vertexPositionAttribute = gl.getAttribLocation(shaders["penumbra2"], "aVertexPosition");
    shaders["penumbra2"].pMatrixUniform = gl.getUniformLocation(shaders["penumbra2"], "uPMatrix");
    shaders["penumbra2"].uBufferUniform = gl.getUniformLocation(shaders["penumbra2"], "u_buffer");
    shaders["penumbra2"].uSizeUniform = gl.getUniformLocation(shaders["penumbra2"], "u_size");
    shaders["penumbra2"].uLightUniform = gl.getUniformLocation(shaders["penumbra2"], "u_light");
    shaders["penumbra2"].uLightSizeUniform = gl.getUniformLocation(shaders["penumbra2"], "u_lightSize");

    gl.enableVertexAttribArray(shaders["raytrace"].vertexPositionAttribute);
    gl.enableVertexAttribArray(shaders["penumbra1"].vertexPositionAttribute);
    gl.enableVertexAttribArray(shaders["penumbra2"].vertexPositionAttribute);

    initBuffers();

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);

    (function animloop(){
      requestAnimFrame(animloop);
      render();
    })();
  });
}