let symbolOverlay = true;
let symbolText = true;
let maxImageWidth = 1024;
let maxImageHeight = 1024;

hist = {
  'canvas_font': [],
  'canvas_logo': [],
  'canvas_raw': []
};

function clear_image() {
  let id = get_current_canvas_id();
  var canvas = document.getElementById(id);
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  capture_image(id);
  parse_image(id);
}

function update_hint_char(ch) {
  let s = 'Symbol ' + toHex(ch) + ' (' + ch + ')';
  $('.hint_char').text(s);
  $('#'+get_current_canvas_id()).prop('title', s);
}

function spinnerValue(obj) {
  let vmin = parseInt(obj.attr('min') ?? 1);
  let vmax = parseInt(obj.attr('max') ?? Number.MAX_SAFE_INTEGER);
  let step = parseInt(obj.attr('step') ?? 1);
  let val = parseInt('0'+obj.val());
  let res = Math.min(vmax, Math.max(vmin, Math.ceil(val/step)*step));
  return res;
}

function load_image(src) {
  var id = get_current_canvas_id();
  var canvas = document.getElementById(id);
  var ctx = canvas.getContext('2d');
  var img = new Image();

  img.onload = function() {
    if (this.width > maxImageWidth || this.height > maxImageHeight) {
      alert('The image is too large ('+this.width+'x'+this.height+'), maximum '+maxImageWidth+'x'+maxImageHeight+' allowed.').
      src = '';
      return;
    }
    canvas.width = this.width;
    canvas.height = this.height;
    ctx.drawImage(img, 0, 0);
    parse_image(id);
    capture_image(id);
  };

  img.src = src;
  setTimeout(scale_all, 50);
}

function add_grid(id, g) {
  let [fw, fh] = current_font_size();
  if (id == 'canvas_raw') fw = fh = 8;
  let c = $('#' + id)[0];
  let w = g * fw;
  let h = g * fh;
  let cw = c.width * g;
  let ch = c.height * g;

  let s = '' +
    '<svg width="' + cw + '" height="' + ch + '" xmlns="http://www.w3.org/2000/svg">' +
    '  <defs>' +
    '    <pattern id="' + id + '_grid_small" width="' + g + '" height="' + g + '" patternUnits="userSpaceOnUse">' +
    '      <path d="M ' + g + ' 0 L 0 0 0 ' + g + '" fill="none" stroke="gray" stroke-width="0.5"/>' +
    '    </pattern>' +
    '    <pattern id="' + id + '_grid" width="' + w + '" height="' + h + '" patternUnits="userSpaceOnUse">' +
    (g >= 8 ? ('      <rect width="' + w + '" height="' + h + '" fill="url(#' + id + '_grid_small)"/>') : '') +
    '      <path d="M ' + w + ' 0 L 0 0 0 ' + h + '" fill="none" stroke="gray" stroke-width="1"/>' +
    '    </pattern>' +
    '  </defs>' +
    '  <style>.small { font: 13px sans-serif; fill: grey;}</style>' +
    '  <rect width="100%" height="100%" fill="url(#' + id + '_grid)" />';

  // add symbol numbers
  let size = $("input[name='scale']:checked").attr('id');
  if (symbolText && size=='large') {
    for (let y=0; y<ch; y+=h) {
      for (let x=0; x<cw; x+=w) {
        let cc = get_char_code(id, x/g, y/g);
        let a = toHex(cc) + ' (' + cc + ')';
        s +='<text text-anchor="end" x="'+(x+w-1)+'" y="'+(y+h-2)+'" class="small">'+a+'</text>\n'
      }
    }
  }

  s += '</svg>';

  grid = $('#' + id + '+.grid-container').html(g != 1 ? s : '');
}

function remove_grid(id) {
  $('#' + id + '+.grid-container').html('');
}

function get_cell_size() {
  let size = $("input[name='scale']:checked").attr('id');
  sizes = {
    'small': 1,
    'medium': 5,
    'large': 16
  };
  return sizes[size];
}

function scale_all() {
  for (c of $('canvas')) {
    let g = get_cell_size()
    let id = c.id;
    $('#' + id).css('width', c.width * g);
    add_grid(id, g);
  }
}

function get_current_hover_id() {
  return global_hover_id;
}

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

function current_font_size() {
  let fw = spinnerValue($('#fw'));
  let fh = spinnerValue($('#fh'));
  return [fw, fh];
}

function load_current_font() {
  let font = $('#dec').val().split(',').map(Number);
  let [fw, fh] = current_font_size();
  return [font, fw, fh];
}

function wrap(w, prefix, str) {
  var re = new RegExp('(.{1,' + w + '})( +|$\n?)|(.{1,' + w + '})', 'g');
  return str.replace(re, prefix + '$1\n');
}

function toHex(x) {
  return '0x' + ('0' + x.toString(16)).slice(-2).toUpperCase();
}

function format_data(tpl, data, hex, w, prefix) {
    data = data.map(function(x) {
      return hex ? toHex(x) : x.toString().padStart(3,' ')
    });

  let out = wrap(w, prefix, data.join(hex ? ', ':',')+',');
  if (!hex) out = prefix+out.trim();
  return tpl.replace('%s', out).replace(/\t/g, '    ');
}

function export_raw(data, fw, fh, w, h) {
  let tpl = 'static void render_logo(void) {\n\tstatic const unsigned char PROGMEM raw_logo[] = {\n%s\n\t};\n\toled_write_raw_P(raw_logo, sizeof(raw_logo));\n}\n';
  $('#raw').val(format_data(tpl, data, false, 16*8*'255,'.length, '\t\t'));
  update_hint('hint_raw', data.length, fw, fh, w, h);
}

function export_font(data, fw, fh) {
  let tpl = 'static const unsigned char PROGMEM font[] = {\n%s};\n';
  $('#font').val(format_data(tpl, data, true, fw * '0x00, '.length, '\t'));
  $('#dec').val(data.join(','));
}

function getpixel(x, y, imageData) {
  var index = (y * imageData.width + x) * 4;
  var red = imageData.data[index];
  var green = imageData.data[index + 1];
  var blue = imageData.data[index + 2];
  var alpha = imageData.data[index + 3];
  return red + green + blue >= 127 ? 1 : 0;
}


function parse_image(canvas_id) {
  var canvas = document.getElementById(canvas_id);
  var ctx = canvas.getContext('2d');
  var w = canvas.width;
  var h = canvas.height;
  var imageData = ctx.getImageData(0, 0, w, h);

  let data = [];
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
    let font = data;
    export_font(font, fw, fh);
    // update logo picture accordingly
    parse_logo_file($('#logo').val());

  } else if (canvas_id == "canvas_logo") {

    // replace font image data with logo image data
    // account for characters location
    let [font, fw, fh] = load_current_font();
    let chars = parse_text($('#logo').val()).data;

    oled_write_P(chars, fw, fh, function(ch, x, y) {
      let logo_ofs = x + (~~(y / 8) * w);
      let font_ofs = ~~(ch * fw);

      for (let k = 0; k < fw; k++) {
        font[font_ofs + k] = data[logo_ofs + k];
      }

    });

    render_font(font, fw, fh);
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
      var URLObj = window.URL || window.webkitURL;
      load_image(URLObj.createObjectURL(imageBlob));
      console.log("pasted from clipboard");
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

function write_chars(chars, font, fw,fh, imageData, w, h) {
  var x = 0;
  var y = 0;
  cols = ~~(w / fw);
  for (ch of chars) {
    if (x >= cols * fw) {
      x = 0;
      y += fh;
    }
    putchar(ch, x, y, font, fw, fh, imageData, w, h);
    x += fw;
  }
}

function render_image(id, chars, font, fw, fh, w, h, is_raw) {
  var canvas = document.getElementById(id);
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  canvas.width = w;
  canvas.height = h;

  remove_grid(id);

  if (w == 0 || h == 0) return;

  var imageData = ctx.createImageData(w, h);

  if (id=='canvas_logo') {
    oled_write_P(chars, fw, fh, function(ch, x, y, param) {
      [font, imageData,w,h] = param;
      putchar(ch, x, y, font, fw, fh, imageData, w, h);
    },[font,imageData,w,h]);

  } else {
    write_chars(chars, font, fw,fh,imageData,w,h);
  }


  ctx.putImageData(imageData, 0, 0);

  scale_all();

  capture_image(id);
}

function render_raw(ctrl, data) {
  var font = data;
  var fw = 8;
  var fh = 8;
  var w = spinnerValue($('#iw'));
  var cols = ~~(w / fw);
  var h = ~~(data.length / cols);
  let total = ~~(font.length / fw);
  let chars = [...Array(total).keys()];
  render_image(ctrl, chars, font, fw, fh, w, h, true);
  update_hint('hint_raw', data.length, fw, fh, w, h);
}

function parse_raw_file(text) {
  render_raw("canvas_raw", parse_text(text).data);
}

function oled_write_P(chars, fw, fh, callback, param) {
  let x = 0;
  let y = 0;
  let w = 0;
  let h = 0;
  let maxw = 128;
  for (ch of chars) {
    if (ch==0) {
      break;
    } else if (ch == 10 || ch == 13) {
      y += fh;
      x = 0;
    } else {
      if (x + fw > maxw) {
        y += fh;
        x = 0;
      }
      if (callback)
        callback(ch, x, y, param);
      x += fw;
    }
    if (x > w) w = x;
    if (y + fh > h) h = y + fh;
  }
  return [w, h];
}

function render_logo(chars, font, fw, fh) {
  let [w, h] = oled_write_P(chars, fw, fh);
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
  render_image("canvas_font", chars, font, fw, fh, w, h, true);
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
    'fh': fh,
    'maxcol': maxcol
  };
}

function getXY(e) {
  let c = e.target;
  let x = e.offsetX; //e.pageX - c.offsetLeft;
  let y = e.offsetY; //e.pageY - c.offsetTop;
  let vw = c.offsetWidth;
  let vh = c.offsetHeight;
  let w = c.width;
  let h = c.height;
  x = Math.floor(x * w / vw);
  y = Math.floor(y * h / vh);
  return [x, y];
}

function get_char_code(id, x, y) {
  // gets char code from canvas coordinates x,y
  let [fw, fh] = current_font_size();

  if (id == 'canvas_raw') fw = fh = 8;

  let col = ~~(x / fw);
  let row = ~~(y / fh);

  let canvas_width = document.getElementById(id).width;

  let cols = ~~(canvas_width / fw);

  let ch = cols * row + col;

  if (symbolOverlay) {
    let g = get_cell_size();
    let bw = g * fw;
    let bh = g * fh;
    let sx = col * g * fw;
    let sy = row * g * fh;
    let b = $('.symbol-overlay')
    b.css({left: sx+1, top: sy+1, width: bw-1, height: bh-1});
    b.show();
  }

  if (id == 'canvas_logo') {
      // need to remap symbol according to the data
      // not cached, might be a little bit on the slower side
      let [font, fw, fh] = load_current_font();
      let chars = parse_text($('#logo').val()).data;

      oled_write_P(chars, fw, fh, function(current_ch, x, y, param) {
        let [col, row] = param;
        if (col*fw==x && row*fh==y) {
            ch = current_ch;
        }
      }, [col, row]);
  }

  return ch;
}

(function($) {

  function parse_font_file(text, update_logo, logo_file) {
    let res = parse_text(text, true);
    $('#dec').val(res.data.join(','));
    $('#fw').val(res.fw);
    $('#fh').val(res.fh);
    render_font(res.data, res.fw, res.fh);

    if (logo_file)
      load_logo_file(logo_file);
    else if (update_logo)
      parse_logo_file($('#logo').val());

    return res;
  }

  function load_font_file(url, update_logo, logo_file) {
    $('#font').load(url, function(text) {
      parse_font_file(text, update_logo, logo_file);
    });
  }

  function load_logo_file(url) {
    $('#logo').load(url, function(text) {
      $('#logo').val(text);
      parse_logo_file(text);
    });
  }

  function load_raw_file(url) {
    $('#raw').load(url, function(text) {
      let p = parse_text(text);
      $('#iw').val(p.maxcol);
      render_raw("canvas_raw", p.data);
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
      load_font_file(e.target.href, true);
      e.preventDefault();
    });

    $('#examples_raw a').on('click', function(e) {
      load_raw_file(e.target.href);
      e.preventDefault();
    });

    $('#examples_logo a').on('click', function(e) {
      load_logo_file(e.target.href);
      e.preventDefault();
    });


    load_font_file('files/glcdfont.c', true, 'files/logo_reader.c');
    load_raw_file('files/jorne_raw.c');

    $('#scale').on('change', function(e) {
      scale_all();
    });

    $('#font').focus();


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

    $('#iw').on('input', function(e) {
      parse_raw_file($('#raw').val());
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

    $('canvas').mouseout(function(e) {
      $('#canvas_font_hint').text('');
      $('canvas').prop('title', '');
      $('.hint_char').text('');
      $('.symbol-overlay').hide();
      global_hover_id = null;
    });

    $('canvas').mousemove(function(e) {

      let id = e.target.id;

      global_hover_id = id;

      let [x, y] = getXY(e);

      ch = get_char_code(id, x, y);

      update_hint_char(ch);

      if (buttonPressed) {
        draw_pixel(id, x, y, x0, y0);
        x0 = x;
        y0 = y;
      }

    });

    /*
        $('canvas').bind('mousewheel',function(e){
          console.log(e);
            if(e.originalEvent.wheelDelta /120 > 0) {
                console.log('scrolling up !');
            }
            else{
                console.log('scrolling down !');
            }
          return false;
        });

    $('img').bind('contextmenu', function(e){
       // handle right click
        return false;
    }); 

    */

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

    //$('#undo').prop('disabled', true);
    //$('#redo').prop('disabled', true);

    function copy_canvas_to_clipboard() {
      let id = get_current_canvas_id();
      let canvas = document.getElementById(id);
      canvas.toBlob(function(blob) { 
          const item = new ClipboardItem({ "image/png": blob });
          navigator.clipboard.write([item]); 
      });
    }

    $("body").keydown(function(e) {
      if ($('textarea').is(':focus')) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.keyCode == 90) // Ctrl+Z
          undo();
        if (e.keyCode == 89) // Ctrl+Y
          redo();
        if (e.keyCode == 67) { // Ctrl+C
          if (String(window.getSelection())=="") {
            console.log("copied to clipboard");
            copy_canvas_to_clipboard();
          }
        }
      }
    });

    $('#download').on('click', function(e) {
      var id = get_current_canvas_id();
      document.getElementById(id).toBlob(blob=>{
        showSaveFilePicker({suggestedName: id+'.png'}).then(f=>f.createWritable()).then(f=>(t=f).write(blob)).then(f=>t.close());
      });
    });

    $('#upload').on('click', function(e) {
        $('#file').click();
    });

    $('#file').on('change', function() {
      var file = $(this).get(0).files;
      var reader = new FileReader();
      reader.readAsDataURL(file[0]);

      reader.addEventListener("load", function(e) {
        load_image(e.target.result);
      });
    });

    $('#clear').on('click', function(e) {
      if (confirm('Are you sure you want to clear image?')) {
        clear_image();
      }
    });

    $('input[type=number]').blur(function(e) {
      $(this).val(spinnerValue($(this)));
    });

  });

})($);