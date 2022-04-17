"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assertions_1 = require("./assertions");
function $marshal(src) {
    throw new Error("marshal has not been replaced for this callsite");
    return undefined;
}
exports.default = $marshal;
// GENERATED MARSHALERS
function marshalThingInterface(input) {
    (0, assertions_1.isRequired)(input["id"]);
    (0, assertions_1.isNumber)(input["id"]);
    (0, assertions_1.isString)(input["name"]);
    return input;
}
function marshalThingType(input) {
    (0, assertions_1.isRequired)(input["id"]);
    (0, assertions_1.isNumber)(input["id"]);
    (0, assertions_1.isRequired)(input["name"]);
    (0, assertions_1.isString)(input["name"]);
    const expectedProps = new Set(["id", "name"]);
    if (!Object.keys(input).every(expectedProps.has))
        throw new Error("too many props to marshal 'ThingType'");
    return input;
}
