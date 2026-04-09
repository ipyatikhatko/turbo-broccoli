module.exports = {
  build: {
    content: ["src/mail/source/**/*.html"],
    output: {
      path: "src/mail/compiled",
      from: ["src/mail/source"],
    },
  },
  expressions: {
    localsAttr: "vars",
  },
  components: {
    root: "src/mail/source",
    folders: ["components", "layouts", "emails"],
  },
  server: {
    port: 3001,
    watch: ["./src/mail/source/**/*"],
  },
  useTransformers: true,
  css: {
    inline: {
      removeInlinedSelectors: true,
    },
  },
  tailwind: {
    config: "tailwind.config.cjs",
  },
};
