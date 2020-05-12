static void render_logo(void) {
    static const char PROGMEM qmk_logo[] = {
        149,150,10,
        181,182,0
    };

    oled_write_P(qmk_logo, false);
}
