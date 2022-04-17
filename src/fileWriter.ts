import fs from "fs";

export interface FileWriter {
  writeFn: (src: string) => void;
}

const BASE_FILE = `// This file is generated and should not be edited by humans
import {
  isRequired,
  isNumber,
  isString,
  isArray,
  isNullish,
  isOneOf,
  isLiteral,
} from './assertions';

// $marshal is a stub that should keep linters happy and fail loudly if the
// martian plugin isn't run as part of the build/bundling process
function $marshal<T>(src: any): T {
  throw new Error("marshal has not been replaced for this callsite");
  // @ts-ignore
  return undefined as T;
}

export default $marshal;

// GENERATED MARSHALERS
`
const GEN_FILE_PATH = "./src/marshal.ts";

export function initFileWriter(): FileWriter {
  fs.writeFileSync(GEN_FILE_PATH, BASE_FILE);


  return {
    writeFn: (src: string): void => {
      fs.appendFileSync(GEN_FILE_PATH, `export ${src}\n`);
    }
  }
}
