// This file is generated and should not be edited by humans
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
export function marshalSpaceShip(input: any): any {
  isRequired(input["id"]);
  isNumber(input["id"]);
  isRequired(input["name"]);
  isString(input["name"]);
  isRequired(input["class"]);
  isOneOf(input["class"], [isLiteral("freighter"), isLiteral("destroyer"), isLiteral("yacht")]);
  const expectedProps = new Set([ "id", "name", "class" ]);
  if (!Object.keys(input).every(expectedProps.has)) throw new Error("too many props to marshal 'SpaceShip'");
  return input;
}

export function marshalCrewMember(input: any): any {
  isRequired(input["id"]);
  isNumber(input["id"]);
  isRequired(input["name"]);
  isString(input["name"]);
  if (!isNullish(input["nickName"])) {
    isString(input["nickName"]);
  }
  return input;
}

export function marshalCaptain(input: any): any {
  isRequired(input["id"]);
  isNumber(input["id"]);
  isRequired(input["name"]);
  isString(input["name"]);
  if (!isNullish(input["nickName"])) {
    isString(input["nickName"]);
  }
  isRequired(input["crewIds"]);
  isArray(input["crewIds"], isNumber);
  return input;
}

