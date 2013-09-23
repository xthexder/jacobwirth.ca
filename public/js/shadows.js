var gl = false;
var canvas, glinfo;
var rects = [];
var texts = [];

var shaders = {};

var mouseLight = false;
var mousex = 0;
var mousey = 0;
var iterations = 10;
var targetfps = 30;

var lastframe1 = new Date().getTime() - 1;
var lastframe2 = new Date().getTime();
var fpscounter = 0;

var enabled = true;

setTimeout(function() {
  if (fpscounter < 30) {
    //enabled = false;
    console.log("Rendering disabled");
  }
}, 2000);

window.requestAnimFrame = (function() {
  return  window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function(callback) {
      window.setTimeout(callback, 1000 / targetfps);
    };
})();

function render() {
  gl.useProgram(shaders["raytrace"]);
  gl.clear(gl.COLOR_BUFFER_BIT);

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
  uniformArray = new Float32Array(50 * 4);
  for (var i = 0; i < texts.length && i < 50; i++) {
    var tmp = texts[i].getBoundingClientRect();
    uniformArray[i * 4] = tmp.left - tmpcanvas.left;
    uniformArray[i * 4 + 1] = gl.viewportHeight - tmp.bottom + tmpcanvas.top;
    uniformArray[i * 4 + 2] = tmp.right - tmpcanvas.left;
    uniformArray[i * 4 + 3] = gl.viewportHeight - tmp.top + tmpcanvas.top;
  }
  gl.uniform4fv(shaders["raytrace"].uTextUniform, uniformArray);
  gl.uniform1i(shaders["raytrace"].uRectsUniform, rects.length);
  gl.uniform1i(shaders["raytrace"].uTextsUniform, texts.length);
  gl.uniform1f(shaders["raytrace"].uSeedUniform, Math.random() * gl.viewportWidth * 10);
  gl.uniform1f(shaders["raytrace"].uIterationsUniform, iterations);

  if (mouseLight) gl.uniform2f(shaders["raytrace"].uLightUniform, mousex, gl.viewportHeight - mousey);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  var now = new Date().getTime();
  var fps1 = 1000 / (now - lastframe2);
  var fps2 = 1000 / (lastframe2 - lastframe1);
  var fps = (fps1 + fps2) / 2.0;
  lastframe1 = lastframe2;
  lastframe2 = now;
  if (fpscounter % 60 == 0) renderText();
  fpscounter++;

  glinfo.innerHTML = "FPS: " + Math.floor(fps) + "<br/>Iterations: " + Math.floor(iterations);

  if (fps > targetfps + 2) {
    iterations++;
  } else if (fps < targetfps - 2) {
    iterations += Math.max(-5, fps - targetfps + 2);
  }
  if (iterations < 5) {
    iterations = 5;
  } else if (iterations > 100) {
    iterations = 100;
  }
}

function renderText() {
  var uniformArray = new Float32Array(50 * 4);
  for (var i = 0; i < texts.length && i < 50; i++) {
    var ctx = texts[i].getContext('2d');
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    var style = window.getComputedStyle(texts[i]);
    ctx.fillStyle = style.getPropertyValue("color");
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = style.getPropertyValue("font-size") + " " + style.getPropertyValue("font-family");
    ctx.fillText(texts[i].innerHTML, 0, 0);

    var data = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    var minx = ctx.canvas.width - 1;
    var miny = ctx.canvas.height - 1;
    var maxx = 0;
    var maxy = 0;
    for (var x = 0; x < ctx.canvas.width; x++) {
      for (var y = 0; y < ctx.canvas.height; y++) {
        if (data.data[(x + y * ctx.canvas.width) * 4 + 3] != 0) {
          minx = Math.min(minx, x);
          miny = Math.min(miny, y);
          maxx = Math.max(maxx, x);
          maxy = Math.max(maxy, y);
        }
      }
    }
    uniformArray[i * 4] = minx;
    uniformArray[i * 4 + 1] = ctx.canvas.height - maxy - 1;
    uniformArray[i * 4 + 2] = maxx - minx + 1;
    uniformArray[i * 4 + 3] = maxy - miny + 1;
    data = ctx.getImageData(minx, miny, maxx - minx + 1, maxy - miny + 1);

    var textTexture = gl.createTexture();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
  }
  gl.uniform4fv(shaders["raytrace"].uTextOffsetUniform, uniformArray);
}

function initBuffers() {
  if (!gl || !shaders["raytrace"]) return;

  var vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  vertices = [
    gl.viewportWidth,  gl.viewportHeight,
    0.0,  gl.viewportHeight,
    gl.viewportWidth, 0.0,
    0.0, 0.0
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  var pMatrix = mat4.ortho(0, gl.viewportWidth, gl.viewportHeight, 0, 0.001, 100000);
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.useProgram(shaders["raytrace"]);
  gl.uniformMatrix4fv(shaders["raytrace"].pMatrixUniform, false, pMatrix);
  gl.vertexAttribPointer(shaders["raytrace"].vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
  gl.uniform1i(shaders["raytrace"].uRenderedTextUniform, 0);
  gl.uniform1f(shaders["raytrace"].uSeedUniform, Math.random() * gl.viewportWidth * 10);
  gl.uniform1f(shaders["raytrace"].uIterationsUniform, iterations);

  if (!mouseLight) gl.uniform2f(shaders["raytrace"].uLightUniform, gl.viewportWidth / 2, gl.viewportHeight - 50);
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

  http.open("GET", url, true);
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
  glinfo = document.getElementById("glinfo");
  rects = overlay.getElementsByClassName("glshadow");
  texts = overlay.getElementsByClassName("glshadowtext");

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

  gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  gl.viewportWidth = canvas.width;
  gl.viewportHeight = canvas.height;

  overlay.addEventListener('mousemove', function(evt) {
    var tmp = canvas.getBoundingClientRect();
    mousex = evt.clientX - tmp.left;
    mousey = evt.clientY - tmp.top;
  });
  overlay.addEventListener('click', function(evt) {
    if (evt.target === overlay) {
      mouseLight = !mouseLight;
      var tmp = canvas.getBoundingClientRect();
      mousex = evt.clientX - tmp.left;
      mousey = evt.clientY - tmp.top;
      initBuffers();
    }
  });
  var scrollEvent = function(evt) {
    overlay.scrollLeft -= evt.wheelDelta || (evt.detail * -40);
  };
  overlay.addEventListener('DOMMouseScroll', scrollEvent);
  overlay.addEventListener('mousewheel', scrollEvent);

  if (!gl) {
    console.log("Could not initialize WebGL!");
  }

  var shaderList = {"vertex": {url: "shaders/vertex.vert"}, "raytrace": {url: "shaders/raytrace.frag"}};

  loadShaders(shaderList, function() {
    shaders["raytrace"] = gl.createProgram();
    gl.attachShader(shaders["raytrace"], shaderList["vertex"].shader);
    gl.attachShader(shaders["raytrace"], shaderList["raytrace"].shader);
    gl.linkProgram(shaders["raytrace"]);

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
    shaders["raytrace"].uTextUniform = gl.getUniformLocation(shaders["raytrace"], "u_text");
    shaders["raytrace"].uTextOffsetUniform = gl.getUniformLocation(shaders["raytrace"], "u_textoffset");
    shaders["raytrace"].uTextsUniform = gl.getUniformLocation(shaders["raytrace"], "u_texts");
    shaders["raytrace"].uSeedUniform = gl.getUniformLocation(shaders["raytrace"], "u_seed");
    shaders["raytrace"].uIterationsUniform = gl.getUniformLocation(shaders["raytrace"], "u_iterations");
    shaders["raytrace"].uRenderedTextUniform = gl.getUniformLocation(shaders["raytrace"], "u_renderedtext");

    gl.enableVertexAttribArray(shaders["raytrace"].vertexPositionAttribute);

    initBuffers();

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);

    (function animloop() {
      if (enabled) {
        render();
        requestAnimFrame(animloop);
      }
    })();
  });
}
