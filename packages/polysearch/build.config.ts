import { defineBuildConfig } from "@funish/basis/config";

export default defineBuildConfig({
  entries: [
    {
      entry: ["src/index.ts", "src/cli.ts", "src/commands/**/*", "src/drivers/**/*", "src/servers/**/*"],
      minify: true,
    },
  ],
});
