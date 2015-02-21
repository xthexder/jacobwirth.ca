var gl = false;
var canvas, glinfo;
var rects = [];
var texts = [];
var lastHovered = false;

var shaders = {};
var reinitRequired = true;

var mouseLight = false;
var mousex = 0;
var mousey = 0;
var iterations = 1;
var spread = 20;
var angles = 360;
var maxTexts = 15;
var targetfps = 50;

var lastframe = new Date().getTime();
var fpscounter = 0;

var enabled = false;

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

var renderBuffer = false;
var frameTexture = false;

function render() {
  if (reinitRequired) initBuffers();

  gl.bindFramebuffer(gl.FRAMEBUFFER, renderBuffer);
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
  uniformArray = new Float32Array(maxTexts * 4);
  for (var i = 0; i < texts.length && i < maxTexts; i++) {
    var tmp = texts[i].getBoundingClientRect();
    uniformArray[i * 4] = tmp.left - tmpcanvas.left;
    uniformArray[i * 4 + 1] = gl.viewportHeight - tmp.bottom + tmpcanvas.top;
    uniformArray[i * 4 + 2] = tmp.right - tmpcanvas.left;
    uniformArray[i * 4 + 3] = gl.viewportHeight - tmp.top + tmpcanvas.top;
  }

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, lastHovered.renderedTexture);

  gl.uniform4fv(shaders["raytrace"].uTextUniform, uniformArray);
  gl.uniform1i(shaders["raytrace"].uRectsUniform, rects.length);
  gl.uniform1i(shaders["raytrace"].uTextsUniform, texts.length);
  gl.uniform1f(shaders["raytrace"].uSeedUniform, Math.random() * gl.viewportWidth * 10);
  gl.uniform1f(shaders["raytrace"].uSpreadUniform, spread);
  gl.uniform1f(shaders["raytrace"].uIterationsUniform, iterations);

  if (mouseLight) {
    gl.uniform2f(shaders["raytrace"].uLightUniform, mousex, gl.viewportHeight - mousey);
  } else {
    gl.uniform2f(shaders["raytrace"].uLightUniform, gl.viewportWidth / 2, gl.viewportHeight - 50);
  }

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.useProgram(shaders["final"]);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, frameTexture);

  gl.uniform1f(shaders["final"].uSpreadUniform, spread);
  if (mouseLight) {
    gl.uniform2f(shaders["final"].uLightUniform, mousex, gl.viewportHeight - mousey);
  } else {
    gl.uniform2f(shaders["final"].uLightUniform, gl.viewportWidth / 2, gl.viewportHeight - 50);
  }

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  if (fpscounter % 60 == 0) renderText();
  fpscounter++;
  if (fpscounter % 5 == 0) {
    var now = new Date().getTime();
    var fps = 5000.0 / (now - lastframe);
    lastframe = now;

    glinfo.innerHTML = "FPS: " + Math.floor(fps) + "<br/>Iterations: " + Math.floor(iterations);

    iterations *= fps / targetfps;
    if (iterations < 1) {
      iterations = 1;
    } else if (iterations > 100) {
      iterations = 100;
    }
  }
}

function renderText() {
  var uniformArray = new Float32Array(maxTexts * 4);
  var lookupTextures = new Int32Array(maxTexts);
  gl.disable(gl.BLEND);
  for (var i = 0; i < texts.length && i < maxTexts; i++) {
    var ctx = texts[i].getContext('2d');
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    var style = window.getComputedStyle(texts[i]);
    ctx.fillStyle = style.getPropertyValue("color");
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = style.getPropertyValue("font-size") + " " + style.getPropertyValue("font-family");
    ctx.fillText(texts[i].innerHTML, 1, 1);

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
    uniformArray[i * 4] = minx - 1;
    uniformArray[i * 4 + 1] = ctx.canvas.height - maxy - 2;
    uniformArray[i * 4 + 2] = maxx + 2;
    uniformArray[i * 4 + 3] = ctx.canvas.height - miny + 1;
    data = ctx.getImageData(minx - 1, miny - 1, maxx - minx + 2, maxy - miny + 2);

    texts[i].renderedTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, texts[i].renderedTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);

    var frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    frameBuffer.width = (data.width + data.height) * 2;
    frameBuffer.height = angles;
    gl.viewport(0, 0, frameBuffer.width, frameBuffer.height);

    gl.useProgram(shaders["lookup"]);
    gl.uniform1i(shaders["lookup"].uWidthUniform, data.width);
    gl.uniform1i(shaders["lookup"].uHeightUniform, data.height);

    var lookupTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + i + 1);
    lookupTextures[i] = i + 1;
    gl.bindTexture(gl.TEXTURE_2D, lookupTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, frameBuffer.width, frameBuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, lookupTexture, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  gl.enable(gl.BLEND);
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.useProgram(shaders["raytrace"]);
  gl.uniform4fv(shaders["raytrace"].uTextOffsetUniform, uniformArray);
  gl.uniform1iv(shaders["raytrace"].uShadowLookupUniform, lookupTextures);
}

function initBuffers() {
  if (!gl || !shaders["raytrace"] || !shaders["lookup"]) return;

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

  gl.useProgram(shaders["lookup"]);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.uniformMatrix4fv(shaders["lookup"].pMatrixUniform, false, pMatrix);
  gl.vertexAttribPointer(shaders["lookup"].vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
  gl.uniform1i(shaders["lookup"].uRenderedTextUniform, 0);

  gl.useProgram(shaders["raytrace"]);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.uniformMatrix4fv(shaders["raytrace"].pMatrixUniform, false, pMatrix);
  gl.vertexAttribPointer(shaders["raytrace"].vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
  gl.uniform1i(shaders["raytrace"].uRenderedTextUniform, 0);
  gl.uniform1i(shaders["raytrace"].uShadowLookupUniform, 1);
  gl.uniform1f(shaders["raytrace"].uSeedUniform, Math.random() * gl.viewportWidth * 10);
  gl.uniform1f(shaders["raytrace"].uSpreadUniform, spread);
  gl.uniform1f(shaders["raytrace"].uIterationsUniform, iterations);

  gl.useProgram(shaders["final"]);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.uniformMatrix4fv(shaders["final"].pMatrixUniform, false, pMatrix);
  gl.vertexAttribPointer(shaders["final"].vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
  gl.uniform1i(shaders["final"].uFrameUniform, 0);
  gl.uniform1f(shaders["final"].uWidthUniform, gl.viewportWidth);
  gl.uniform1f(shaders["final"].uHeightUniform, gl.viewportHeight);
  gl.uniform1f(shaders["final"].uSpreadUniform, spread);

  renderBuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, renderBuffer);
  renderBuffer.width = gl.viewportWidth;
  renderBuffer.height = gl.viewportHeight;

  frameTexture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, frameTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, renderBuffer.width, renderBuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, frameTexture, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  if (!lastHovered) lastHovered = texts[0];

  reinitRequired = false;
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

function animloop() {
  if (enabled) {
    render();
    requestAnimFrame(animloop);
  }
}

function loadGL() {
  canvas = document.getElementById("glcanvas");
  var overlay = document.getElementById("overlay");
  glinfo = document.getElementById("glinfo");
  rects = overlay.getElementsByClassName("glshadow");
  texts = overlay.getElementsByClassName("glshadowtext");

  var startLink = document.getElementById("start");

  var resizeCanvas = function() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (gl) {
      gl.viewportWidth = canvas.width;
      gl.viewportHeight = canvas.height;

      reinitRequired = true;
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
    if (evt.target.classList.contains("glshadowtext")) {
      lastHovered = evt.target;
    }
  });
  overlay.addEventListener('click', function(evt) {
    if (evt.target === overlay || evt.target.classList.contains("glshadowtext")) {
      mouseLight = !mouseLight;
      var tmp = canvas.getBoundingClientRect();
      mousex = evt.clientX - tmp.left;
      mousey = evt.clientY - tmp.top;
      reinitRequired = true;
    }
  });
  var scrollEvent = function(evt) {
    overlay.scrollLeft -= evt.wheelDelta || (evt.detail * -40);
  };
  overlay.addEventListener('DOMMouseScroll', scrollEvent);
  overlay.addEventListener('mousewheel', scrollEvent);

  if (!gl) {
    console.log("Could not initialize WebGL!");
    return;
  }

  var shaderList = {
    "vertex": {url: "shaders/vertex.vert"},
    "lookup": {url: "shaders/lookup.frag"},
    "raytrace": {url: "shaders/raytrace.frag"},
    "final": {url: "shaders/final.frag"}
  };

  setTimeout(function() {
    console.log("Loading Shaders");
    loadShaders(shaderList, function() {
      console.log("Compiling Shaders");
      shaders["lookup"] = gl.createProgram();
      gl.attachShader(shaders["lookup"], shaderList["vertex"].shader);
      gl.attachShader(shaders["lookup"], shaderList["lookup"].shader);
      gl.linkProgram(shaders["lookup"]);

      shaders["raytrace"] = gl.createProgram();
      gl.attachShader(shaders["raytrace"], shaderList["vertex"].shader);
      gl.attachShader(shaders["raytrace"], shaderList["raytrace"].shader);
      gl.linkProgram(shaders["raytrace"]);

      shaders["final"] = gl.createProgram();
      gl.attachShader(shaders["final"], shaderList["vertex"].shader);
      gl.attachShader(shaders["final"], shaderList["final"].shader);
      gl.linkProgram(shaders["final"]);

      for (var name in shaders) {
        if (!gl.getProgramParameter(shaders[name], gl.LINK_STATUS)) {
          console.log("Could not initialize shader: " + name);
          console.log(gl.getProgramInfoLog(shaders[name]));
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
      shaders["raytrace"].uSpreadUniform = gl.getUniformLocation(shaders["raytrace"], "u_spread");
      shaders["raytrace"].uIterationsUniform = gl.getUniformLocation(shaders["raytrace"], "u_iterations");
      shaders["raytrace"].uRenderedTextUniform = gl.getUniformLocation(shaders["raytrace"], "u_renderedtext");
      shaders["raytrace"].uShadowLookupUniform = gl.getUniformLocation(shaders["raytrace"], "u_shadowlookup");

      gl.enableVertexAttribArray(shaders["raytrace"].vertexPositionAttribute);

      shaders["lookup"].vertexPositionAttribute = gl.getAttribLocation(shaders["lookup"], "aVertexPosition");
      shaders["lookup"].pMatrixUniform = gl.getUniformLocation(shaders["lookup"], "uPMatrix");
      shaders["lookup"].uRenderedTextUniform = gl.getUniformLocation(shaders["lookup"], "u_renderedtext");
      shaders["lookup"].uWidthUniform = gl.getUniformLocation(shaders["lookup"], "u_width");
      shaders["lookup"].uHeightUniform = gl.getUniformLocation(shaders["lookup"], "u_height");

      gl.enableVertexAttribArray(shaders["lookup"].vertexPositionAttribute);

      shaders["final"].vertexPositionAttribute = gl.getAttribLocation(shaders["final"], "aVertexPosition");
      shaders["final"].pMatrixUniform = gl.getUniformLocation(shaders["final"], "uPMatrix");
      shaders["final"].uFrameUniform = gl.getUniformLocation(shaders["final"], "u_frame");
      shaders["final"].uWidthUniform = gl.getUniformLocation(shaders["final"], "u_width");
      shaders["final"].uHeightUniform = gl.getUniformLocation(shaders["final"], "u_height");
      shaders["final"].uLightUniform = gl.getUniformLocation(shaders["final"], "u_light");
      shaders["final"].uSpreadUniform = gl.getUniformLocation(shaders["final"], "u_spread");

      gl.enableVertexAttribArray(shaders["final"].vertexPositionAttribute);

      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.BLEND);

      console.log("Rendering Ready");
      startLink.addEventListener('click', function(evt) {
        enabled = !enabled;
        if (enabled) setTimeout(animloop, 0);
        evt.preventDefault();
      });
    });
  }, 0);
}
