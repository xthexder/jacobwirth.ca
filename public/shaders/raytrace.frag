precision mediump float;

uniform vec2 u_light;
uniform vec4 u_rect[50];
uniform int u_rects;
uniform float u_seed;
uniform float u_iterations;

const float spread = 20.0;

vec2 intersectAABB(vec2 org, vec2 dirfrac, vec4 rect) {
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

float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

vec4 getRect(int i) {
  if (i == 0) {
    return u_rect[0];
  } else if (i == 1) {
    return u_rect[1];
  } else if (i == 2) {
    return u_rect[2];
  } else if (i == 3) {
    return u_rect[3];
  } else if (i == 4) {
    return u_rect[4];
  } else if (i == 5) {
    return u_rect[5];
  } else if (i == 6) {
    return u_rect[6];
  } else if (i == 7) {
    return u_rect[7];
  } else if (i == 8) {
    return u_rect[8];
  } else {
    return u_rect[9];
  }
}

void main(void) {
  vec2 pixel = gl_FragCoord.xy;
  float col = 0.0001;
  float maxcol = 0.0001;
  if (length(u_light - pixel) >= spread) {
    vec2 perp = normalize(vec2(pixel.y - u_light.y, u_light.x - pixel.x));
    vec2 realdir = normalize(pixel - u_light);
    for (float j = 0.0; j < 500.0; j++) {
      if (j >= u_iterations) break;
      float tmpx = j / u_iterations * 2.0 - 1.0 + rand(pixel + u_seed);
      if (tmpx > 1.0) tmpx -= 2.0;
      float tmpy = sqrt(1.0 - tmpx * tmpx);
      vec2 offset = perp * tmpx + realdir * tmpy;
      vec2 tmplight = u_light + offset * spread;
      vec2 dir = tmplight - pixel;
      float amax = length(dir);
      dir = normalize(dir);
      vec2 dirfrac = vec2(1.0 / dir.x, 1.0 / dir.y);

      float diff = max(0.0, dot(-dir, offset));
      maxcol += diff;
      for (int i = 0; i < 50; i++) {
        if (i >= u_rects) break;
        vec2 tmp = intersectAABB(pixel, dirfrac, i < 10 ? getRect(i) : u_rect[i]);
        if (tmp.x < amax && tmp.y >= 0.0) {
          diff = 0.0;
          break;
        }
      }
      col += diff;
    }
  }
  gl_FragColor = vec4(vec3(0.4, 0.8, 1.0), col / maxcol * pow(0.1, length(u_light - gl_FragCoord.xy) / 1000.0));
}
