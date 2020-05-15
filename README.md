# QMK logo editor

Font and graphics editor for the [QMK](https://github.com/qmk/qmk_firmware) keyboard firmware. Live demo:

* https://joric.github.io/qle

QMK uses "classic" fixed-space Adafruit_GFX 1.0 bitmap font.
There are two basic API calls in the latest [QMK OLED Driver](https://beta.docs.qmk.fm/using-qmk/hardware-features/displays/feature_oled_driver):

* `oled_write_P(const char *string)` Writes zero-terminated string using default font settings (treats 0x0A as a line break)

* `oled_write_raw_P(const char *data)` Writes string of characters from 0 to 255 using provided data as 8x8 bitmap font

## References

* https://www.reddit.com/r/MechanicalKeyboards/comments/gjejxi/qmk_logo_editor
* https://www.reddit.com/r/olkb/comments/gk1her/qmk_logo_editor
* https://gist.github.com/joric/96b6a1a65eedc224b7d9d3d17bd4e9e8 (crkbd_logo_converter.py)
* https://helixfonteditor.netlify.app (Helix Font Editor by [@teri_yakichan](https://twitter.com/teri_yakichan))
* https://javl.github.io/image2cpp
