function update_hint(id, len, fw, fh, w, h) {
  let lb = len + ' bytes';
  let im = w + 'x' + h + ' image';
  let ff = fw + 'x' + fh + ' font';
  let ch = ~~(len / fw) + ' characters';
  let cc = ~~(w / fw) + 'x' + ~~(h / fh) + ' characters';
  let bp = fw + ' bytes per character';

  if (id == 'hint_font')
    $('#' + id).text([lb, ff, ch, bp, im, cc].join(', '));
  else if (id == 'hint_logo')
    $('#' + id).text([lb, ff, ch, im, cc].join(', '));
  else if (id == 'hint_raw')
    $('#' + id).text([lb, ff, ch, im, cc].join(', '));
}

function load_current_font() {
  var font = $('#dec').text().split(',').map(Number);
  var fw = parseInt($('#fw').val());
  var fh = parseInt($('#fh').val());
  return [font, fw, fh];
}


function export_raw(data, fw, fh, w, h) {
  let s = (data).map(String).join(', ');
  s = s.replace(/(.{1,130})( +|$\n?)|(.{1,130})/g, '        $1\n');

  let out = 'static void render_logo(void) {\n'
    +'    static const char PROGMEM raw_logo[] = {\n'

  out += s;
  out += '    };\n'
      +'    oled_write_raw_P(raw_logo, sizeof(raw_logo));\n'
      +'}\n';

  $('#raw').val(out);
  update_hint('hint_raw', data.length, fw, fh, w, h);
}

function export_font(data, fw, fh) {

  var out = ''; //'// '+fw+'x'+fh+' font\n';

  out += 'static const char PROGMEM font[] = {\n';

  for (var i = 0; i < data.length; i++) {

    if (i > 0)
      out += i % fw ? ', ' : ',\n';

    s = data[i].toString(16);
    if (s.length < 2)
      s = '0' + s;
    out += '0x' + s;
  }

  out += '\n};\n';

  $('#font').val(out);
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

  let [font, fw, fh] = load_current_font();

  if (canvas_id == "canvas_font")
    export_font(data, fw, fh, w, h);
  else
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
}


function render_raw(ctrl, data) {
  var font = data;
  var fw = 8;
  var fh = 8;

  var w = 128;
  var cols = ~~(w/fw);
  var h = ~~ (data.length/cols);

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
  let h = fh * (total / 32);

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


(function($) {

  function parse_font_file(text) {
    let res = parse_text(text, true);
    let raw = res.data.join(',');
    $('#dec').text(raw);
    $('#fw').val(res.fw);
    $('#fh').val(res.fh);
    render_font(res.data, res.fw, res.fh);
    return res;
  }


  function load_font_file(url, load_logo) {
    $('#font').load(url, function(text) {
      $('#font').val(text);
      res = parse_font_file(text);
      if (load_logo)
        load_logo_file('files/logo_reader.c', res.data, res.fw, res.fh);
    });
  }

  function load_logo_file(url, font, fw, fh) {
    $('#logo').load(url, function(text) {
      let logo = parse_text(text).data;
      render_logo(logo, font, fw, fh);
    });
  }

  function load_raw_file(url) {
    $('#raw').load(url, function(text) {
      render_raw("canvas_raw", parse_text(text).data);
    });
  }


  $(document).ready(function() {


    $('#examples a').on('click', function(e) {
      let url = 'https://raw.githubusercontent.com/qmk/qmk_firmware/master/' + e.target.text + '/glcdfont.c';
      load_font_file(url, true);
    });

    //load_font_file('files/glcdfont.c', true);
    load_font_file('files/glcdfont.jorne.c', true);
    //load_font_file('files/glcdfont.treadstone48.c', true);
    //load_font_file('files/avr.c', true);
    //load_font_file('files/zen.c', true);


    load_raw_file('files/kyria_logo.c');

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

  });

})($);