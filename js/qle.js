hist = {
  'canvas_font': [],
  'canvas_logo': [],
  'canvas_raw': []
};

function get_current_canvas_id() {
  var tab = $("#nav-tab a.active")[0].id;
  return tab == 'nav-font-tab' ? "canvas_font" : (tab == 'nav-logo-tab' ? 'canvas_logo' : 'canvas_raw');
}

function capture_image(id) {
  var canvas = document.getElementById(id);
  var ctx = canvas.getContext('2d');
  capturedImage = ctx.getImageData(0, 0, canvas.width, canvas.height);


  if (hist[id].length > 1000)
    hist[id].pop();

  hist[id].unshift(capturedImage);
}


function set_pixel(id, x, y) {
  var canvas = document.getElementById(id);
  var ctx = canvas.getContext('2d');
  let color = !getpixel(x, y, hist[id][0]);
  let r = g = b = color ? 255 : 0;
  let a = 255;
  ctx.fillStyle = "rgba(" + r + "," + g + "," + b + "," + (a / 255) + ")";
  ctx.fillRect(x, y, 1, 1);
}

function bresenham(id, x0, y0, x1, y1) {
  var dx = Math.abs(x1 - x0);
  var dy = Math.abs(y1 - y0);
  var sx = (x0 < x1) ? 1 : -1;
  var sy = (y0 < y1) ? 1 : -1;
  var err = dx - dy;

  while (true) {
    set_pixel(id, x0, y0);
    if ((x0 === x1) && (y0 === y1)) break;
    var e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
}

function draw_pixel(id, x, y, x0, y0) {
  bresenham(id, x, y, x0, y0);
}


function update_hint(id, len, fw, fh, w, h) {
  let lb = len + ' bytes';
  let im = w + 'x' + h + ' image';
  let ff = fw + 'x' + fh + ' font';
  let ch = ~~(len / fw) + ' characters';
  let cc = ~~(w / fw) + ' columns, ' + ~~(h / fh) + ' rows';
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


function getchpos(i, w, h, fw, fh) {
  let x = ~~((i * fw) % w);
  let y = ~~((i * fw) / w) * fh;
  return [x, y];
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
    export_font(data, fw, fh);

    // update logo picture accordingly
    parse_logo_file($('#logo').val());

  } else if (canvas_id == "canvas_logo") {

    // replace font image data with logo image data
    // account for characters location
    let [font, fw, fh] = load_current_font();
    let chars = parse_text($('#logo').val()).data;
    chars.pop(); // remove z-termination
    for (let i = 0; i < chars.length; i++) {
      let cols = ~~(w / fw);
      let x = ~~((i % cols) * fw);
      let y = ~~((i * fw) / w);
      let logo_ofs = x + (y * w);
      let font_ofs = ~~(chars[i] * fw);
      for (let k = 0; k < fw; k++) {
        font[font_ofs + k] = data[logo_ofs + k];
      }
    }

    render_font(font, fw, fh)
    export_font(font, fw, fh);

  } else {

    export_raw(data, 8, 8, w, h);
  }
}


window.addEventListener("paste", function(e) {
  var canvas_id = get_current_canvas_id();
  if (canvas_id == 'canvas_logo') return;

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
  let h = Math.ceil(chars.length / wrap) * fh;
  if (h == 0) h = fh;
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

  function undo() {
    var id = get_current_canvas_id()
    if (hist[id].length == 0) return;
    var canvas = document.getElementById(id);
    var ctx = canvas.getContext('2d');
    arrayRotate(hist[id], false);
    ctx.putImageData(hist[id][0], 0, 0);
    parse_image(id);
  }

  function redo() {
    var id = get_current_canvas_id()
    if (hist[id].length == 0) return;
    var canvas = document.getElementById(id);
    var ctx = canvas.getContext('2d');
    arrayRotate(hist[id], true);
    ctx.putImageData(hist[id][0], 0, 0);
    parse_image(id);
  }

  $(document).ready(function() {

    $('#examples a').on('click', function(e) {
      let url = 'https://raw.githubusercontent.com/qmk/qmk_firmware/master/' + e.target.text + '/glcdfont.c';
      load_font_file(url, true);
    });

    $('#examples_raw a').on('click', function(e) {
      load_raw_file(e.target.text);
    });


    load_font_file('files/glcdfont.c', true, 'files/logo_reader.c');
    load_raw_file('files/jorne_raw.c');


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
    //$('#large').click();

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

    $('canvas').mousedown(function(e) {

      let id = e.target.id;
      buttonPressed = e.button == 0;
      if (!buttonPressed) return;

      capture_image(id);

      let [x, y] = getXY(e);
      x0 = x;
      y0 = y;
      draw_pixel(id, x, y, x0, y0);
    });

    var buttonPressed = 0;
    var x0 = null;
    var y0 = null;

    $('canvas').mousemove(function(e) {

      if (buttonPressed) {
        let [x, y] = getXY(e);
        draw_pixel(e.target.id, x, y, x0, y0);
        x0 = x;
        y0 = y;
      }

    });

    $('canvas').mouseup(function(e) {

      let id = e.target.id;

      if (e.button == 0) {
        hist[id].shift();
        capture_image(id);
        parse_image(id);
      }

      buttonPressed = 0;
    });

    $('#undo').on('click', undo);
    $('#redo').on('click', redo);

    $("body").keydown(function(e) {
      if ($('textarea').is(':focus')) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.keyCode == 90)
          undo();
        if (e.keyCode == 89)
          redo();
      }
    });

    $('#download').on('click', function(e) {
      var id = get_current_canvas_id();
      var canvas = document.getElementById(id);
      var ctx = canvas.getContext('2d');
      var dt = canvas.toDataURL('image/png');
      dt = dt.replace(/^data:image\/[^;]*/, 'data:application/octet-stream');
      dt = dt.replace(/^data:application\/octet-stream/, 'data:application/octet-stream;headers=Content-Disposition%3A%20attachment%3B%20filename=Canvas.png');
      var filename = id + '.png';
      var a = document.body.appendChild(document.createElement("a"));
      a.href = dt;
      a.download = filename;
      a.click();
      a.remove();
    });

    $('#thumbnail').on('change', function() {
      var file = $(this).get(0).files;
      var reader = new FileReader();
      reader.readAsDataURL(file[0]);

      reader.addEventListener("load", function(e) {
        var image = e.target.result;

        var id = get_current_canvas_id();

        var canvas = document.getElementById(id);
        var ctx = canvas.getContext('2d');

        var img = new Image();
        img.onload = function() {
          canvas.width = this.width;
          canvas.height = this.height;
          ctx.drawImage(img, 0, 0);
          parse_image(id);
          capture_image(id);
        };

        img.src = image;

      });

    });


  });

})($);