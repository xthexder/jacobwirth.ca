// Copyright © 2015 Jacob Wirth
precision mediump float;

const int samples = 16;

uniform vec2 u_light;
uniform float u_spread;
uniform float u_width;
uniform float u_height;

uniform sampler2D u_frame;

void main(void) {
  vec2 pixel = gl_FragCoord.xy;
  vec2 dir = normalize(pixel - u_light);
  float dist = length(u_light - pixel);

  vec2 sample = pixel - dir * float(samples);
  float sumb = 0.00001;
  float countb = 0.00001;
  float sumf = 0.00001;
  float countf = 0.00001;
  for (int i = 0; i < samples; i++) {
    if (sample.x >= 0.0 && sample.x < u_width && sample.y >= 0.0 && sample.y < u_height && dist > length(sample - pixel) + u_spread) {
      vec4 val = texture2D(u_frame, sample / vec2(u_width, u_height));
      sumb += val.w;
      countb++;
    }
    sample += dir;
  }
  for (int i = 0; i < samples; i++) {
    if (sample.x < 0.0 || sample.x >= u_width || sample.y < 0.0 || sample.y >= u_height) continue;
    vec4 val = texture2D(u_frame, sample / vec2(u_width, u_height));
    sumf += val.w;
    countf++;
    sample += dir;
  }
  float val = min(sumb / countb, texture2D(u_frame, pixel / vec2(u_width, u_height)).w);
  val = max(sumf / countf, val);
  gl_FragColor = vec4(vec3(0.4, 0.8, 1.0), val * pow(0.1, dist / 1000.0));
  // gl_FragColor = texture2D(u_frame, pixel / vec2(u_width, u_height));
}
