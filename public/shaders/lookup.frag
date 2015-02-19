precision mediump float;

uniform float u_width;
uniform float u_height;
uniform sampler2D u_renderedtext;

float perimeter = (u_width + u_height) * 2.0;
const float angles = 360.0;

vec2 rayTrace(vec2 org, vec2 dirfrac) {
  float stepX = dirfrac.x > 0.0 ? 1.0 : -1.0;
  float stepY = dirfrac.y > 0.0 ? 1.0 : -1.0;
  vec2 delta = vec2(abs(dirfrac.y * 100.0), abs(dirfrac.x) * 100.0);

  float maxX = stepX > 0.0 ? delta.x : 0.0;
  float maxY = stepY > 0.0 ? delta.y : 0.0;
  vec2 test = org;

  float mind = 1000000.0;
  float maxd = 0.0;

  for (int i = 0; i < 1000; i++) {
    if (test.x < 0.0 || test.x >= u_width || test.y < 0.0 || test.y >= u_height) break;
    vec4 tmp = texture2D(u_renderedtext, test / vec2(u_width, u_height));
    if (tmp.w > 0.0) {
      float dist = dot(test - org, test - org);
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

  mind = sqrt(mind);
  maxd = sqrt(maxd);
  return vec2(mind, maxd - mind);
}

vec4 packVec2(vec2 vec) {
  vec4 color = vec4(0.0, floor(vec.x / 256.0), vec.y, 256.0);
  color.x = floor(vec.x - color.y * 256.0);
  return color / 256.0;
}

void main(void) {
  float angle = gl_FragCoord.y * 6.28318 / angles;
  float index = gl_FragCoord.x;
  vec2 dirfrac = vec2(cos(angle), sin(angle));
  if (index < u_width) { // Bottom
    vec2 tmp = rayTrace(vec2(index, 0.0), dirfrac);
    gl_FragColor = packVec2(tmp);
  } else if (index < u_width + u_height) { // Right
    vec2 tmp = rayTrace(vec2(u_width - 1.0, index - u_width), dirfrac);
    gl_FragColor = packVec2(tmp);
  } else if (index < u_width * 2.0 + u_height) { // Top
    vec2 tmp = rayTrace(vec2(u_width * 2.0 + u_height - index, u_height - 1.0), dirfrac);
    gl_FragColor = packVec2(tmp);
  } else { // Left
    vec2 tmp = rayTrace(vec2(0.0, (u_width + u_height) * 2.0 - index), dirfrac);
    gl_FragColor = packVec2(tmp);
  }
}
