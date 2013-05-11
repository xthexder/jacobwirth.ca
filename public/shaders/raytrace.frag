precision mediump float;

uniform vec2 u_light;
uniform vec4 u_rect[50];
uniform int u_rects;

vec2 intersectAABB(vec2 org, vec2 dest, vec2 dirfrac, vec4 rect) {
  float t1 = (rect.x - org.x)*dirfrac.x;
  float t2 = (rect.z - org.x)*dirfrac.x;
  float t3 = (rect.y - org.y)*dirfrac.y;
  float t4 = (rect.w - org.y)*dirfrac.y;

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
  vec2 dir = u_light - pixel;
  float amax = length(dir);
  dir = normalize(dir);
  vec2 dirfrac = vec2(1.0 / dir.x, 1.0 / dir.y);

  vec2 result = vec2(-1.0, -1.0);
  for (int i = 0; i < 50; i++) {
    if (i < u_rects) {
      vec2 tmp = intersectAABB(pixel, u_light, dirfrac, u_rect[i]);
      if (result.y < 0.0 || tmp.x < result.x && tmp.y >= 0.0) {
        result = tmp;
      }
    } else break;
  }
  if (result.y < 0.0 || result.x >= amax + 0.1) {
    gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0);
  } else if (result.x < 0.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
  } else {
    gl_FragColor = vec4(result.x / 2000.0, 0.0, 0.0, 1.0);
  }
}