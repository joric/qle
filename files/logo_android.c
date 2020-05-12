static void render_logo(void) {
    static const char PROGMEM qmk_logo[] = {
        155,156,10,
        187,188,0
    };

    oled_write_P(qmk_logo, false);
}
