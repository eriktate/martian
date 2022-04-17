"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initFileWriter = void 0;
const fs_1 = __importDefault(require("fs"));
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
`;
const GEN_FILE_PATH = "./src/marshal.ts";
function initFileWriter() {
    fs_1.default.writeFileSync(GEN_FILE_PATH, BASE_FILE);
    return {
        writeFn: (src) => {
            fs_1.default.appendFileSync(GEN_FILE_PATH, `export ${src}\n`);
        }
    };
}
exports.initFileWriter = initFileWriter;
