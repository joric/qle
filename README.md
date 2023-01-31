# QMK logo editor

Font and graphics editor for the [QMK](https://github.com/qmk/qmk_firmware) keyboard firmware. Live demo:

* https://joric.github.io/qle

QMK uses "classic" fixed-space Adafruit_GFX 1.0 bitmap font.
There are two basic API calls in the latest [QMK OLED Driver](https://docs.qmk.fm/#/feature_oled_driver):

* `oled_write_P(const char *string, bool invert)` Writes zero-terminated string using default font (0x0A is line break)
* `oled_write_raw_P(const char *data, uint16_t size)` Writes string of characters in 0..255 range using data as 8x8 font

There are a few ways of adding a custom font to your keyboard (all they use local config files of the keymap):

* `SRC` in `rules.mk`: `SRC += ./lib/glcdfont.c` (crkbd)
* `LOCAL_GLCDFONT` in `rules.mk`: `LOCAL_GLCDFONT = yes` (gergo)
* `OLED_FONT_H` in `config.h`: `#define OLED_FONT_H "keyboards/lily58/lib/glcdfont.c"` (lily58)

The latest official way is redefining `OLED_FONT_H` in the `config.h` of your keymap (there also other settings):

* https://docs.qmk.fm/#/feature_oled_driver


## References

* https://www.reddit.com/r/MechanicalKeyboards/comments/gjejxi/qmk_logo_editor
* https://www.reddit.com/r/olkb/comments/gk1her/qmk_logo_editor
* https://gist.github.com/joric/96b6a1a65eedc224b7d9d3d17bd4e9e8 (crkbd_logo_converter.py)
* https://helixfonteditor.netlify.app (Helix Font Editor by [@teri_yakichan](https://twitter.com/teri_yakichan))
* https://docs.qmk.fm/#/feature_oled_driver?id=logo-example
* https://github.com/RustyJonez/OLED-ART-tinkering
* https://javl.github.io/image2cpp
