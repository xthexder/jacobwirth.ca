precision mediump float;

uniform int u_width;
uniform int u_height;
uniform sampler2D u_renderedtext;

int perimeter = (u_width + u_height) * 2;
const float angles = 360.0;
const float c_pi = 3.141592653589793;

vec2 rayTrace(vec2 org, vec2 dirfrac) {
  int stepX = dirfrac.x > 0.0 ? 1 : -1;
  int stepY = dirfrac.y > 0.0 ? 1 : -1;
  vec2 delta = abs(dirfrac.yx * 1000.0);

  float maxX = stepX > 0 ? delta.x : 0.0;
  float maxY = stepY > 0 ? delta.y : 0.0;
  ivec2 test = ivec2(org);

  float mind = 100000.0;
  float maxd = 0.0;

  for (int i = 0; i < 10000; i++) {
    if (test.x < 0 || test.x >= u_width || test.y < 0 || test.y >= u_height) break;
    vec4 tmp = texture2D(u_renderedtext, (vec2(test) + vec2(0.5)) / vec2(u_width, u_height));
    if (tmp.w > 0.5) {
      float dist = length(vec2(test) - org);
      mind = min(mind, dist);
      maxd = max(maxd, dist);
    }

    if (maxX < maxY) {
      maxX += delta.x;
      test.x += stepX;
    } else {
      maxY += delta.y;
      test.y += stepY;
    }
  }

  return vec2(mind, maxd);
}

vec4 packVec2(vec2 vec) {
  vec4 color = vec4(0.0, floor(vec.x / 256.0), 0.0, floor(vec.y / 256.0));
  color.x = vec.x - color.y * 256.0;
  color.z = vec.y - color.w * 256.0;
  return color / 256.0;
}

void main(void) {
  float angle = (gl_FragCoord.y + 0.5) * c_pi * 2.0 / angles;
  int index = int(gl_FragCoord.x);
  vec2 dirfrac = vec2(cos(angle), sin(angle));
  if (index < u_width) { // Bottom
    if (dirfrac.y >= 0.0) {
      vec2 tmp = rayTrace(vec2(index, 0.0), dirfrac);
      gl_FragColor = packVec2(tmp);
    } else {
      gl_FragColor = vec4(0.0);
    }
  } else if (index < u_width + u_height) { // Right
    if (dirfrac.x <= 0.0) {
      vec2 tmp = rayTrace(vec2(u_width - 1, index - u_width), dirfrac);
      gl_FragColor = packVec2(tmp);
    } else {
      gl_FragColor = vec4(0.0);
    }
  } else if (index < u_width * 2 + u_height) { // Top
    if (dirfrac.y <= 0.0) {
      vec2 tmp = rayTrace(vec2(u_width * 2 + u_height - index - 1, u_height - 1), dirfrac);
      gl_FragColor = packVec2(tmp);
    } else {
      gl_FragColor = vec4(0.0);
    }
  } else { // Left
    if (dirfrac.x >= 0.0) {
      vec2 tmp = rayTrace(vec2(0.0, (u_width + u_height) * 2 - index - 1), dirfrac);
      gl_FragColor = packVec2(tmp);
    } else {
      gl_FragColor = vec4(0.0);
    }
  }
}
