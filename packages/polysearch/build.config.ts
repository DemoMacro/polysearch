import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  declaration: true,
  entries: [
    "src/index",
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
    {
      input: "src/servers/",
      outDir: "dist/servers",
      format: "esm",
    },
    {
      input: "src/servers/",
      outDir: "dist/servers",
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
