precision mediump float;

uniform vec2 u_light;
uniform vec4 u_rect[50];
uniform int u_rects;
uniform float u_seed;
uniform float u_iterations;

const float maxiterations = 500.0;
const float spread = 20.0;

vec2 intersectAABB(vec2 org, vec2 dest, vec2 dirfrac, vec4 rect) {
  float t1 = (rect.x - org.x) * dirfrac.x;
  float t2 = (rect.z - org.x) * dirfrac.x;
  float t3 = (rect.y - org.y) * dirfrac.y;
  float t4 = (rect.w - org.y) * dirfrac.y;

  float tmin = max(min(t1, t2), min(t3, t4));
  float tmax = min(max(t1, t2), max(t3, t4));
  
  if (tmin >= tmax || tmax < 0.0) {
    return vec2(-1.0, -1.0);
  } else {
    return vec2(tmin, tmax);
  }
}

void main(void) {
  vec2 pixel = vec2(gl_FragCoord.x, gl_FragCoord.y);
  if (length(u_light - pixel) < spread)  {
    gl_FragColor = vec4(1.0);
  } else {
    float col = u_iterations;
    vec2 perp = normalize(vec2(pixel.y - u_light.y, u_light.x - pixel.x));
    vec2 realdir = normalize(pixel - u_light);
    for (float j = 0.0; j < maxiterations; j++) {
      if (j >= u_iterations) break;
      float offx = j / u_iterations * 2.0 - 1.0;
      float offy = sqrt(1.0 - offx * offx);
      vec2 tmplight = u_light + (perp * offx + realdir * offy) * spread;
      vec2 dir = tmplight - pixel;
      float amax = length(dir);
      dir = normalize(dir);
      vec2 dirfrac = vec2(1.0 / dir.x, 1.0 / dir.y);

      for (int i = 0; i < 50; i++) {
        if (i < u_rects) {
          vec2 tmp = intersectAABB(pixel, u_light, dirfrac, u_rect[i]);
          if (tmp.x < amax && tmp.y >= 0.0) {
            col -= 1.0;
            break;
          }
        } else break;
      }
    }
    gl_FragColor = vec4(vec3(1.0), col / min(maxiterations, u_iterations) * max(0.0, 1.0 - length(u_light - gl_FragCoord.xy) / 1000.0) * 0.8);
  }
}