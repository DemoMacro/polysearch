import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  declaration: true,
  entries: [
    "src/index",
    "src/server",
    {
      input: "src/drivers/",
      outDir: "dist/drivers",
      format: "esm",
    },
    {
      input: "src/drivers/",
      outDir: "dist/drivers",
      format: "cjs",
      ext: "cjs",
    },
  ],
  rollup: {
    emitCJS: true,
    esbuild: {
      minify: true,
    },
  },
});
