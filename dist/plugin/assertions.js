"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOneOf = exports.isLiteral = exports.isArray = exports.isBoolean = exports.isString = exports.isNumber = exports.isRequired = exports.isNullish = exports.generateAssertion = void 0;
function generateIsOneOf(oneOf, propName) {
    const validators = oneOf.assertions.map(assertion => {
        return generateAssertion(assertion, propName, true);
    }).join(", ");
    return `isOneOf(input["${propName}"], [${validators}])`;
}
function literalValueString(literal) {
    switch (literal.litType) {
        case "string":
            return `"${literal.value}"`;
        case "number":
        case "boolean":
            return `${literal.value}`;
    }
}
function generateIsArray(isArray, propName) {
    const assertion = isArray.assertion;
    return `isArray(input["${propName}"], ${generateAssertion(assertion, propName, true)})`;
}
function generateAssertion(assertion, propName, isNested = false) {
    switch (assertion.fnName) {
        case "isOneOf":
            return generateIsOneOf(assertion, propName);
        case "isLiteral":
            if (isNested)
                return `isLiteral(${literalValueString(assertion)})`;
            return `isLiteral(${literalValueString(assertion)}(input["${propName}"])`;
        case "isArray":
            return generateIsArray(assertion, propName);
        default:
            if (isNested)
                return `${assertion.fnName}`;
            return `${assertion.fnName}(input["${propName}"])`;
    }
}
exports.generateAssertion = generateAssertion;
// returns whether or not an input is nullish
function isNullish(input) {
    return input == null;
}
exports.isNullish = isNullish;
// throws an error if the input is nullish
function isRequired(input) {
    if (isNullish(input))
        throw new Error("missing required property");
}
exports.isRequired = isRequired;
// returns true if the input is a number
function isNumber(input) {
    if (typeof input !== "number")
        throw new Error(`expected type 'number', found '${typeof input}'`);
}
exports.isNumber = isNumber;
// returns true if the input is a string
function isString(input) {
    if (typeof input !== "string")
        throw new Error(`expected type 'string', found '${typeof input}'`);
}
exports.isString = isString;
function isBoolean(input) {
    if (typeof input !== "boolean")
        throw new Error(`expected type 'boolean', found '${typeof input}'`);
}
exports.isBoolean = isBoolean;
// returns true if the input is an array and every element passes the given validator function
function isArray(input, validator) {
    if (!Array.isArray(input)) {
        throw new Error(`expected type 'array', found '${typeof input}'`);
    }
    try {
        input.forEach(validator);
    }
    catch (e) {
        throw new Error(`at least one element failed inner-type validation with: ${e}`);
    }
}
exports.isArray = isArray;
function isLiteral(val) {
    return (input) => {
        if (input !== val) {
            throw new Error(`expected '${val}' but found '${input}'`);
        }
    };
}
exports.isLiteral = isLiteral;
function isOneOf(input, validators) {
    const success = validators.some(validator => {
        try {
            validator(input);
        }
        catch (e) {
            return false;
        }
        ;
        return true;
    });
    if (!success) {
        throw new Error(`${input} is not one of the valid values`);
    }
}
exports.isOneOf = isOneOf;
