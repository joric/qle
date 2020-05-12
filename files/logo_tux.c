static void render_logo(void) {
    static const char PROGMEM qmk_logo[] = {
        153,154,10,
        185,186,0
    };

    oled_write_P(qmk_logo, false);
}
