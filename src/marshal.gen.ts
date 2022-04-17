import {
  isRequired,
  isNumber,
  isString,
  isArray,
} from './assertions';

function $marshal<T>(src: any): T {
  throw new Error("marshal has not been replaced for this callsite");
  return undefined as T;
}

export default $marshal;

// GENERATED MARSHALERS
function marshalThingInterface(input: any): any {
  isRequired(input["id"]);
  isNumber(input["id"]);
  isString(input["name"]);
  return input;
}

function marshalThingType(input: any): any {
  isRequired(input["id"]);
  isNumber(input["id"]);
  isRequired(input["name"]);
  isString(input["name"]);
  const expectedProps = new Set([ "id", "name" ]);
  if (!Object.keys(input).every(expectedProps.has)) throw new Error("too many props to marshal 'ThingType'");
  return input;
}

