
import { config } from "@swc/core/spack";
import { MartianPlugin } from "./plugin/lib.js";

const martian = new MartianPlugin();
export default config({
  entry: {
    example: __dirname + "/example.ts",
  },
  output: {
    path: __dirname + "/dist",
    name: "example",
  },
  options: {
    plugin: (m) => martian.visitProgram(m),
  },
});
