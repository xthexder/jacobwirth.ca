precision mediump float;

uniform vec2 u_light;
uniform vec4 u_rect[50];
uniform vec4 u_text[50];
uniform vec4 u_textoffset[50];
uniform int u_rects;
uniform int u_texts;
uniform float u_seed;
uniform float u_iterations;

uniform sampler2D u_renderedtext;

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

void main(void) {
  vec2 pixel = gl_FragCoord.xy;
  float col = 0.0001;
  float maxcol = 0.0001;
  if (length(u_light - pixel) >= spread) {
    vec2 perp = normalize(vec2(pixel.y - u_light.y, u_light.x - pixel.x));
    vec2 realdir = normalize(pixel - u_light);
    for (int j = 0; j < 500; j++) {
      if (float(j) >= u_iterations) break;
      float tmpx = float(j) / u_iterations * 2.0 - 1.0 + rand(pixel + u_seed);
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
        vec2 tmp = intersectAABB(pixel, dirfrac, u_rect[i]);
        if (tmp.x < amax && tmp.y >= 0.0) {
          diff = 0.0;
          break;
        }
      }
      for (int i = 0; i < 50; i++) {
        if (i >= u_texts) break;
        vec4 tmprect = u_text[i].xyxy + vec4(u_textoffset[i].xy, u_textoffset[i].xy + u_textoffset[i].zw);
        vec2 tmp = intersectAABB(pixel, dirfrac, tmprect);
        if (tmp.x < amax && tmp.y >= 0.0) {
          vec2 org = (dir * max(0.0, tmp.x)) + pixel - tmprect.xy;
          vec2 dest = (dir * min(amax, tmp.y)) + pixel - tmprect.xy;

          int stepX = (dest.x > org.x) ? 1 : -1;
          int stepY = (dest.y > org.y) ? 1 : -1;

          vec2 delta = abs(dest.yx - org.yx);

          float maxX = delta.x * ((stepX > 0) ? (1.0 - fract(org.x)) : fract(org.x));
          float maxY = delta.y * ((stepY > 0) ? (1.0 - fract(org.y)) : fract(org.y));

          ivec2 test = ivec2(org);
          ivec2 endTile = ivec2(dest);

          for (int k = 0; k < 1000; k++) {
            if (test == endTile) break;

            if (maxX < maxY) {
              maxX += delta.x;
              test.x += stepX;

              vec2 tmp = (vec2(test) + vec2(0.5)) / u_textoffset[i].zw;
              if (texture2D(u_renderedtext, tmp).w >= 0.5) {
                diff = 0.0;
                break;
              }
            } else {
              maxY += delta.y;
              test.y += stepY;

              vec2 tmp = (vec2(test) + vec2(0.5)) / u_textoffset[i].zw;
              if (texture2D(u_renderedtext, tmp).w >= 0.5) {
                diff = 0.0;
                break;
              }
            }
          }
        }
      }
      col += diff;
    }
  }
  gl_FragColor = vec4(vec3(0.4, 0.8, 1.0), col / maxcol * pow(0.1, length(u_light - pixel) / 1000.0));
}
