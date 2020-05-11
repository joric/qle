undo = {
  'canvas_font': [],
  'canvas_logo': [],
  'canvas_raw': []
};

function capture_image(id) {
  var canvas = document.getElementById(id);
  var ctx = canvas.getContext('2d');
  capturedImage = ctx.getImageData(0, 0, canvas.width, canvas.height);

  if (undo[id].length > 1000)
    undo[id].pop();

  undo[id].unshift(capturedImage);
}


function set_pixel(id, x, y, color) {
  var canvas = document.getElementById(id);
  var ctx = canvas.getContext('2d');
}

function bresenham(x0, y0, x1, y1, color) {
  dx = x1 - x0;
  dy = y1 - y0;
  y = y0;
  d = 0;
  for (x = x0; x <= x1; x++) {
    set_pixel(id, x, y, color);
    d += dy;
    if (2 * d >= dx) d -= dx, y--;
  }
}

function draw_pixel(id, x, y) {
  var canvas = document.getElementById(id);
  var ctx = canvas.getContext('2d');

  let capturedImage = undo[id][0];

  let color = !getpixel(x, y, capturedImage);

  let r = g = b = color ? 255 : 0;
  let a = 255;

  ctx.fillStyle = "rgba(" + r + "," + g + "," + b + "," + (a / 255) + ")";
  ctx.fillRect(x, y, 1, 1);
}


function update_hint(id, len, fw, fh, w, h) {
  let lb = len + ' bytes';
  let im = w + 'x' + h + ' image';
  let ff = fw + 'x' + fh + ' font';
  let ch = ~~(len / fw) + ' characters';
  let cc = ~~(w / fw) + 'x' + ~~(h / fh) + ' characters';
  let bp = fw + ' bytes per character';
  let e = $('#' + id);

  switch (id) {
    case 'hint_font':
      e.text([lb, ff, ch, bp, im, cc].join(', '));
      break;
    case 'hint_logo':
      e.text([lb, ff, im, cc].join(', '));
      break;
    case 'hint_raw':
      e.text([lb, ff, ch, im, cc].join(', '));
      break;
  }
}

function load_current_font() {
  var font = $('#dec').val().split(',').map(Number);
  var fw = parseInt($('#fw').val());
  var fh = parseInt($('#fh').val());
  return [font, fw, fh];
}

function wrap(w, prefix, str) {
  var re = new RegExp('(.{1,' + w + '})( +|$\n?)|(.{1,' + w + '})', 'g');
  return str.replace(re, prefix + '$1\n');
}

function format_data(tpl, data, hex, w, prefix) {
  if (hex) {
    data = data.map(function(x) {
      return '0x' + ('0' + x.toString(16).toUpperCase()).slice(-2);
    });
  }
  let out = wrap(w, prefix, data.join(', '));
  return tpl.replace('%s', out).replace(/\t/g, '    ');
}

function export_raw(data, fw, fh, w, h) {
  let tpl = 'static void render_logo(void) {\n\tstatic const char PROGMEM raw_logo[] = {\n%s\t};\n\toled_write_raw_P(raw_logo, false);\n}\n';
  $('#raw').val(format_data(tpl, data, false, 130, '\t\t'));
  update_hint('hint_raw', data.length, fw, fh, w, h);
}

function export_font(data, fw, fh) {
  let tpl = 'static const char PROGMEM font[] = {\n%s};\n';
  $('#font').val(format_data(tpl, data, true, fw * '0x00, '.length, '\t'));
  $('#dec').val(data.join(','));
}

function getpixel(x, y, imageData) {
  var index = (y * imageData.width + x) * 4;
  var red = imageData.data[index];
  var green = imageData.data[index + 1];
  var blue = imageData.data[index + 2];
  var alpha = imageData.data[index + 3];
  return red + green + blue >= 0.5 ? 1 : 0;
}


function parse_image(canvas_id) {
  var canvas = document.getElementById(canvas_id);
  var ctx = canvas.getContext('2d');
  var w = canvas.width;
  var h = canvas.height;
  var imageData = ctx.getImageData(0, 0, w, h);

  var data = [];
  lines = ~~(h / 8);
  for (var line = 0; line < lines; line++) {
    for (var x = 0; x < w; x++) {
      v = 0;
      for (i = 0; i < 8; i++) {
        y = line * 8 + i;
        b = getpixel(x, y, imageData);
        v |= (b << i);
      }
      data.push(v);
    }
  }

  if (canvas_id == "canvas_font") {

    let [_, fw, fh] = load_current_font();
    export_font(data, fw, fh, w, h);
    parse_logo_file($('#logo').val());

  } else
    export_raw(data, 8, 8, w, h);
}


window.addEventListener("paste", function(e) {
  var tab = $("#nav-tab a.active")[0].id;
  if (tab == "nav-logo-tab") return;
  var canvas_id = tab == "nav-font-tab" ? "canvas_font" : "canvas_raw";

  retrieveImageFromClipboardAsBlob(e, function(imageBlob) {
    if (imageBlob) {
      var canvas = document.getElementById(canvas_id);
      var ctx = canvas.getContext('2d');
      var img = new Image();
      img.onload = function() {
        canvas.width = this.width;
        canvas.height = this.height;
        ctx.drawImage(img, 0, 0);
        parse_image(canvas_id);
        undo[canvas_id] = [];
        capture_image(canvas_id);
      };
      var URLObj = window.URL || window.webkitURL;
      img.src = URLObj.createObjectURL(imageBlob);
    }
  });
}, false);

function retrieveImageFromClipboardAsBlob(pasteEvent, callback) {
  if (pasteEvent.clipboardData == false) {
    if (typeof(callback) == "function") {
      callback(undefined);
    }
  }
  var items = pasteEvent.clipboardData.items;
  if (items == undefined) {
    if (typeof(callback) == "function") {
      callback(undefined);
    }
  }
  for (var i = 0; i < items.length; i++) {
    if (items[i].type.indexOf("image") == -1) continue;
    var blob = items[i].getAsFile();
    if (typeof(callback) == "function") {
      callback(blob);
    }
  }
}




function putpixel(x, y, c, imageData) {
  var pixelData = imageData.data;
  var idx = 4 * (~~y * imageData.width + ~~x);
  pixelData[idx] = pixelData[idx + 1] = pixelData[idx + 2] = c;
  pixelData[idx + 3] = 255; //alpha
}

function putchar(i, x, y, data, fw, fh, imageData, w, h) {
  for (var j = 0; j < fw; j++) {
    var b = data[i * fw + j];
    for (var k = 0; k < 8; k++) {
      var c = b & (1 << k) ? 255 : 0;
      putpixel(x + j, y + k, c, imageData);
    }
  }
}

function render_image(ctrl, chars, font, fw, fh, w, h) {
  var canvas = document.getElementById(ctrl);
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  canvas.width = w;
  canvas.height = h;

  if (w == 0 || h == 0) return;

  var imageData = ctx.createImageData(w, h);

  var x = 0;
  var y = 0;

  cols = ~~(w / fw);

  for (i of chars) {

    if (x >= cols * fw) {
      x = 0;
      y += fh;
    }

    putchar(i, x, y, font, fw, fh, imageData, w, h);
    x += fw;
  }

  ctx.putImageData(imageData, 0, 0);

  capture_image(ctrl);
}


function render_raw(ctrl, data) {
  var font = data;
  var fw = 8;
  var fh = 8;
  var w = 128;
  var cols = ~~(w / fw);
  var h = ~~(data.length / cols);
  let total = ~~(font.length / fw);
  let chars = [...Array(total).keys()];
  render_image(ctrl, chars, font, fw, fh, w, h);
  update_hint('hint_raw', data.length, fw, fh, w, h);
}

function parse_raw_file(text) {
  render_raw("canvas_raw", parse_text(text).data);
}

function render_logo(chars, font, fw, fh) {
  chars.pop();
  let w = 128;
  let wrap = ~~(w / fw);
  let h = ~~(chars.length / wrap) * fh;
  render_image("canvas_logo", chars, font, fw, fh, w, h);
  update_hint('hint_logo', chars.length, fw, fh, w, h);
}

function parse_logo_file(text) {
  let [font, fw, fh] = load_current_font();
  let logo = parse_text(text).data;
  render_logo(logo, font, fw, fh);
}

function render_font(font, fw, fh) {
  let total = ~~(font.length / fw);
  let w = fw * 32;
  let h = fh * ~~(total / 32);
  update_hint('hint_font', font.length, fw, fh, w, h);
  let chars = [...Array(total).keys()];
  render_image("canvas_font", chars, font, fw, fh, w, h);
}

function parse_text(text, is_font) {
  let lines = text.split('\n');
  let arr = []
  let start = false;
  let fw = 0;
  let fh = 0;
  let maxcol = 0;
  let trailing_zeros = 0;

  for (s of lines) {

    if (!start) {
      let fs = s.match(/(\d+)x(\d+) font/);
      if (fs) {
        fw = parseInt(fs[1]);
        fh = parseInt(fs[2]);
      }
    }

    if (!start && s.includes('= {')) start = true;
    if (!start) continue;

    let vars = s.split(',');

    let count = 0;

    for (v of vars) {
      let x = 0;

      pos = v.indexOf('0x');
      if (pos != -1) {
        x = parseInt(v.substring(pos + 2, pos + 5), 16);
      } else {
        x = parseInt(v, 10);
      }

      if (!isNaN(x)) {
        arr.push(x);
        count += 1;
      }
    }

    maxcol = Math.max(maxcol, count);
  }

  // fh is always 8, for fw we use heuristics:
  // 1) narrow formatting tells us the font width
  // 2) otherwise consider 8x6 fonts are actually 6x8
  // 3) no header, load default values

  if (maxcol >= 3 && maxcol <= 7)
    fw = maxcol;
  else if (fw && fh) {
    if (fw == 8 && fh == 6)
      fw = 6;
  } else {
    [_, fw, fh] = load_current_font();
    //fw = Math.ceil(font.length / 256);
  }

  if (!fw)
    fw = 6;

  fh = 8;

  return {
    'data': arr,
    'fw': fw,
    'fh': fh
  };
}

function getXY(e) {
  let x = e.pageX - e.target.offsetLeft;
  let y = e.pageY - e.target.offsetTop;
  let vw = e.target.offsetWidth;
  let vh = e.target.offsetHeight;
  let w = e.target.width;
  let h = e.target.height;
  x = Math.floor(x * w / vw);
  y = Math.floor(y * h / vh);
  return [x, y];
}


(function($) {

  function parse_font_file(text) {
    let res = parse_text(text, true);
    $('#dec').text(res.data.join(','));
    $('#fw').val(res.fw);
    $('#fh').val(res.fh);
    render_font(res.data, res.fw, res.fh);
    return res;
  }


  function load_font_file(url, update_logo, load_logo) {
    $('#font').load(url, function(text) {
      $('#font').val(text);
      parse_font_file(text);
      if (load_logo)
        load_logo_file(load_logo);
      if (update_logo)
        parse_logo_file($('#logo').val());
    });
  }

  function load_logo_file(url) {
    $('#logo').load(url, function(text) {
      parse_logo_file(text);
    });
  }

  function load_raw_file(url) {
    $('#raw').load(url, function(text) {
      render_raw("canvas_raw", parse_text(text).data);
    });
  }


  function arrayRotate(arr, reverse) {
    if (reverse) arr.unshift(arr.pop());
    else arr.push(arr.shift());
    return arr;
  }

  $(document).ready(function() {

    $('#examples a').on('click', function(e) {
      let url = 'https://raw.githubusercontent.com/qmk/qmk_firmware/master/' + e.target.text + '/glcdfont.c';
      load_font_file(url, true);
    });


    load_font_file('files/glcdfont.c', true, 'files/logo.c');
    load_raw_file('files/raw.c');


    $('#small').on('click', function(e) {
      $('canvas').css('width', 'auto');
    });
    $('#medium').on('click', function(e) {
      $('canvas').css('width', '50%');
    });
    $('#large').on('click', function(e) {
      $('canvas').css('width', '100%');
    });

    //$('#nav-raw-tab').click();
    $('#large').click();

    $('#fw,#fh').on('input', function(e) {
      let [font, fw, fh] = load_current_font();
      render_font(font, fw, fh);
      export_font(font, fw, fh);
    });

    $('#font').on('input', function(e) {
      parse_font_file(e.target.value);
    });

    $('#dec').on('input', function(e) {
      var font = e.target.value.split(',').map(Number);
      let [_, fw, fh] = load_current_font();
      render_font(font, fw, fh);
    });

    $('#logo').on('input', function(e) {
      parse_logo_file(e.target.value);
    });

    $('#raw').on('input', function(e) {
      parse_raw_file(e.target.value);
    });

    var buttonPressed = 0;

    $('canvas').mousedown(function(e) {

      let id = e.target.id;

      if (id == 'canvas_logo') return;

      buttonPressed = e.button == 0;
      if (!buttonPressed) return;

      capture_image(id);

      let [x, y] = getXY(e);
      draw_pixel(id, x, y);

    });

    $('canvas').mousemove(function(e) {

      if (buttonPressed) {
        let [x, y] = getXY(e);
        draw_pixel(e.target.id, x, y);
      }

    });

    $('canvas').mouseup(function(e) {

      let id = e.target.id;

      if (e.button == 0) {

        undo[id].shift();
        capture_image(id);
        parse_image(id);
      }

      buttonPressed = 0;
    });


    $("body").keydown(function(e) {

      var tab = $("#nav-tab a.active")[0].id;
      if (tab == "nav-logo-tab") return;
      var id = tab == "nav-font-tab" ? "canvas_font" : "canvas_raw";

      if (undo[id].length == 0) return;


      if (e.ctrlKey || e.metaKey) {

        var canvas = document.getElementById(id);
        var ctx = canvas.getContext('2d');

        if (e.keyCode == 89) { //Ctrl+Y
          arrayRotate(undo[id], true);
          ctx.putImageData(undo[id][0], 0, 0);
          parse_image(id);
        }

        if (e.keyCode == 90) { //Ctrl+Z
          arrayRotate(undo[id], false);
          ctx.putImageData(undo[id][0], 0, 0);
          parse_image(id);
        }
      }

    });


  });

})($);