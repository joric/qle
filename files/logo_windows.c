static void render_logo(void) {
    static const char PROGMEM qmk_logo[] = {
        151,152,10,
        183,184,0
    };

    oled_write_P(qmk_logo, false);
}
