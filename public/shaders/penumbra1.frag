precision mediump float;

uniform sampler2D u_buffer;
uniform vec2 u_size;
uniform vec2 u_light;
uniform float u_lightSize;

const float spread = 200.0;
const float max_spread = 200.0;

void main(void) {
  vec4 tex = texture2D(u_buffer, gl_FragCoord.xy / u_size);

  gl_FragColor = tex;
  if (tex.b == 0.0 && tex.w == 1.0 && length(u_light - gl_FragCoord.xy) / u_lightSize < 1.0) {
    float blur = tex.r * spread;
    float bright = 0.0;
    bool stopa = false;
    bool stopb = false;
    bool stopc = false;
    bool stopd = false;
    for (float i = 1.0; i <= max_spread; i += 1.0) {
      if (i <= blur && (!stopa || !stopb || !stopc || !stopd)) {
        vec4 tmp;
        if (!stopa) {
          tmp = texture2D(u_buffer, (gl_FragCoord.xy + vec2(i, 0.0)) / u_size);
          if (tmp.b != 0.0) {
            bright = 1.0 - i / blur;
            break;
          } else if (tmp.w == 0.0) {
            stopa = true;
          }
        }
        if (!stopb) {
          tmp = texture2D(u_buffer, (gl_FragCoord.xy + vec2(-i, 0.0)) / u_size);
          if (tmp.b != 0.0) {
            bright = 1.0 - i / blur;
            break;
          } else if (tmp.w == 0.0) {
            stopb = true;
          }
        }
        if (!stopc) {
          tmp = texture2D(u_buffer, (gl_FragCoord.xy + vec2(0.0, i)) / u_size);
          if (tmp.b != 0.0) {
            bright = 1.0 - i / blur;
            break;
          } else if (tmp.w == 0.0) {
            stopc = true;
          }
        }
        if (!stopd) {
          tmp = texture2D(u_buffer, (gl_FragCoord.xy + vec2(0.0, -i)) / u_size);
          if (tmp.b != 0.0) {
            bright = 1.0 - i / blur;
            break;
          } else if (tmp.w == 0.0) {
            stopd = true;
          }
        }
      } else break;
    }
    gl_FragColor.g = bright;
  }
}