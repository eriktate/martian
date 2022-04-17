"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.marshalCaptain = exports.marshalCrewMember = exports.marshalSpaceShip = void 0;
// This file is generated and should not be edited by humans
const assertions_1 = require("./assertions");
// $marshal is a stub that should keep linters happy and fail loudly if the
// martian plugin isn't run as part of the build/bundling process
function $marshal(src) {
    throw new Error("marshal has not been replaced for this callsite");
    // @ts-ignore
    return undefined;
}
exports.default = $marshal;
// GENERATED MARSHALERS
function marshalSpaceShip(input) {
    (0, assertions_1.isRequired)(input["id"]);
    (0, assertions_1.isNumber)(input["id"]);
    (0, assertions_1.isRequired)(input["name"]);
    (0, assertions_1.isString)(input["name"]);
    (0, assertions_1.isRequired)(input["class"]);
    (0, assertions_1.isOneOf)(input["class"], [(0, assertions_1.isLiteral)("freighter"), (0, assertions_1.isLiteral)("destroyer"), (0, assertions_1.isLiteral)("yacht")]);
    const expectedProps = new Set(["id", "name", "class"]);
    if (!Object.keys(input).every(key => expectedProps.has(key)))
        throw new Error("too many props to marshal 'SpaceShip'");
    return input;
}
exports.marshalSpaceShip = marshalSpaceShip;
function marshalCrewMember(input) {
    (0, assertions_1.isRequired)(input["id"]);
    (0, assertions_1.isNumber)(input["id"]);
    (0, assertions_1.isRequired)(input["name"]);
    (0, assertions_1.isString)(input["name"]);
    if (!(0, assertions_1.isNullish)(input["nickName"])) {
        (0, assertions_1.isString)(input["nickName"]);
    }
    return input;
}
exports.marshalCrewMember = marshalCrewMember;
function marshalCaptain(input) {
    (0, assertions_1.isRequired)(input["id"]);
    (0, assertions_1.isNumber)(input["id"]);
    (0, assertions_1.isRequired)(input["name"]);
    (0, assertions_1.isString)(input["name"]);
    if (!(0, assertions_1.isNullish)(input["nickName"])) {
        (0, assertions_1.isString)(input["nickName"]);
    }
    (0, assertions_1.isRequired)(input["crewIds"]);
    (0, assertions_1.isArray)(input["crewIds"], assertions_1.isNumber);
    return input;
}
exports.marshalCaptain = marshalCaptain;
