// Copyright © 2015 Jacob Wirth
precision mediump float;

const int num_rects = 3;
const int num_texts = 1;
const int num_iterations = 16;

uniform vec2 u_light;
uniform float u_spread;
uniform vec4 u_rect[num_rects];
uniform vec4 u_text[num_texts];
uniform vec4 u_textoffset[num_texts];

uniform int u_rects;
uniform int u_texts;
uniform float u_iterations;

uniform sampler2D u_renderedtext;
uniform sampler2D u_shadowlookup[num_texts];

vec2 collideRect(vec2 org, vec2 dirfrac, vec4 rect) {
  float t1 = (rect.x - org.x) * dirfrac.x;
  float t2 = (rect.z - org.x) * dirfrac.x;
  float t3 = (rect.y - org.y) * dirfrac.y;
  float t4 = (rect.w - org.y) * dirfrac.y;

  float tmin = max(min(t1, t2), min(t3, t4));
  float tmax = min(max(t1, t2), max(t3, t4));

  float valid = step(tmin, tmax);
  return vec2(tmin, tmax) * valid - (1.0 - valid); // vec2(-1.0) if not valid
}

float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main(void) {
  vec2 pixel = gl_FragCoord.xy;
  float col = 0.0000;
  float maxcol = 0.0001;
  if (length(u_light - pixel) >= u_spread) {
    vec2 perp = normalize(vec2(pixel.y - u_light.y, u_light.x - pixel.x));
    vec2 realdir = normalize(pixel - u_light);
    for (int j = 0; j < num_iterations; j++) {
      float tmpx = rand(pixel * float(j + 1) / float(num_iterations)) * 2.0 - 1.0;
      float tmpy = sqrt(1.0 - tmpx * tmpx);
      vec2 offset = normalize(perp * tmpx + realdir * tmpy);
      vec2 tmplight = u_light + offset * u_spread;
      vec2 dir = pixel - tmplight;
      float amax = length(dir);
      dir = normalize(dir);
      vec2 dirfrac = 1.0 / dir;

      float diff = abs(dot(dir, offset)) * (u_spread + 1.0) / amax;
      maxcol += diff;
      for (int i = 0; i < num_rects; i++) {
        vec2 tmp = collideRect(tmplight, dirfrac, u_rect[i]);
        float collided = step(0.0, tmp.y) * step(tmp.x, amax); // tmp.y >= 0.0 && tmp.x < amax
        diff *= 1.0 - collided;
        maxcol -= diff * 0.9 * step(tmp.x, 0.0) * collided; // Partially ignore points inside objects
      }
      if (diff == 0.0) continue;
      for (int i = 0; i < num_texts; i++) {
        vec4 tmprect = u_text[i].xyxy + u_textoffset[i];
        vec2 tmp = collideRect(tmplight, dirfrac, tmprect);

        if (tmp.x < amax && tmp.y >= 0.0) {
          vec2 org = (dir * tmp.x) + tmplight - tmprect.xy;

          float width = tmprect.z - tmprect.x;
          float height = tmprect.w - tmprect.y;

          float index = 0.0;
          index += step(org.y, 0.0001) * org.x; // bottom (org.y < 0.0001)
          index += step(org.x, 0.0001) * (width * 2.0 + height * 2.0 - org.y); // left (org.x < 0.0001)
          index += step(width - 0.0001, org.x) * (width + org.y); // right (org.x > width - 0.0001)
          index += step(height - 0.0001, org.y) * (width * 2.0 + height - org.x); // top (org.y > height - 0.0001)

          float angle = atan(dir.y, dir.x);
          angle += 6.28318 * step(0.0, -angle); // angle < 0.0
          vec4 tmp2 = texture2D(u_shadowlookup[i], (vec2(index, angle)) / vec2((width + height) * 2.0, 6.28318)) * 256.0;
          vec2 minmax = tmp2.xz + tmp2.yw * 256.0 + vec2(tmp.x);
          if (minmax.y > minmax.x) {
            if (minmax.x < 0.0 && minmax.y >= amax) {
              // [ L P ]
              org = (dir * max(0.0, tmp.x)) + tmplight - tmprect.xy;
              vec2 dest = (dir * min(amax, tmp.y)) + tmplight - tmprect.xy;
              int stepX = (dest.x > org.x) ? 1 : -1;
              int stepY = (dest.y > org.y) ? 1 : -1;

              vec2 delta = abs(dest.yx - org.yx);

              float maxX = delta.x * ((stepX > 0) ? (1.0 - fract(org.x)) : fract(org.x));
              float maxY = delta.y * ((stepY > 0) ? (1.0 - fract(org.y)) : fract(org.y));

              ivec2 test = ivec2(org);
              ivec2 endTile = ivec2(dest);

              for (int k = 0; k < 1000; k++) {
                if (test == endTile) break;

                if (texture2D(u_renderedtext, (vec2(test) + vec2(0.5)) / vec2(width, height)).w > 0.5) {
                  diff = 0.0;
                  break;
                }

                if (maxX < maxY) {
                  maxX += delta.x;
                  test.x += stepX;
                } else {
                  maxY += delta.y;
                  test.y += stepY;
                }
              }
              if (diff == 0.0) break;
            } else if (minmax.x < 0.0) {
              diff *= step(minmax.y, 0.0); // if (minmax.y >= 0.0) then  [ L ] P
              // else [ ] L P
            } else if (minmax.y >= amax) {
              diff *= step(amax, minmax.x); // if (minmax.x < amax) then  L [ P ]
              // else L P [ ]
            } else {
              // L [ ] P
              diff = 0.0;
              break;
            }
          }
        }
      }
      col += diff;
    }
  } else col = maxcol;
  gl_FragColor = vec4(vec3(1.0), col / maxcol);
  //gl_FragColor = vec4(vec3(0.4, 0.8, 1.0), col / maxcol * pow(0.1, length(u_light - pixel) / 1000.0));
  //gl_FragColor = vec4(0.0353, 0.1451, 0.2, 1.0 - (col / maxcol * pow(0.1, length(u_light - pixel) / 1000.0)));
  /*vec4 tmprect = u_text[0].xyxy + u_textoffset[0];
  float width = tmprect.z - tmprect.x;
  float height = tmprect.w - tmprect.y;
  // gl_FragColor = texture2D(u_renderedtext, gl_FragCoord.xy / vec2(width, height));
  vec4 tmpc = texture2D(u_shadowlookup[0], gl_FragCoord.xy / vec2((width + height) * 2.0, 360));
  vec4 tmp2 = tmpc * 256.0;
  vec2 minmax = tmp2.xz + tmp2.yw * 256.0;
  gl_FragColor = vec4(minmax / 1000.0, 0.0, 1.0);*/
}
