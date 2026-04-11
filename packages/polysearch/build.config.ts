import { defineBuildConfig } from "@funish/basis/config";

export default defineBuildConfig({
  entries: [
    {
      entry: ["src/index.ts", "src/drivers/**/*", "src/servers/**/*"],
      minify: true,
    },
  ],
});
