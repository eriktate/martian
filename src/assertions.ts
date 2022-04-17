export type ValidatorFunc = (input: any) => void;

export type AssertNullish = {
  fnName: "isNullish",
};

export type AssertRequired = {
  fnName: "isRequired";
};

export type AssertString = {
  fnName: "isString";
};

export type AssertNumber = {
  fnName: "isNumber";
};

export type AssertBoolean = {
  fnName: "isBoolean";
}

export type AssertArray = {
  fnName: "isArray";
  assertion: Assertion;
};

export type AssertLiteral = {
  fnName: "isLiteral";
  litType: "number" | "string" | "boolean";
  value: any;
}

export type AssertOneOf = {
  fnName: "isOneOf";
  assertions: Assertion[];
}

export type Assertion
  = AssertNullish
  | AssertRequired
  | AssertString
  | AssertNumber
  | AssertArray
  | AssertLiteral
  | AssertOneOf;

function generateIsOneOf(oneOf: AssertOneOf, propName: string): string {
  const validators = oneOf.assertions.map(assertion => {
    return generateAssertion(assertion, propName, true)
  }).join(", ");
  return `isOneOf(input["${propName}"], [${validators}])`;
}

function literalValueString(literal: AssertLiteral): string {
  switch (literal.litType) {
    case "string":
      return `"${literal.value}"`;
    case "number":
    case "boolean":
      return `${literal.value}`;

  }
}

function generateIsArray(isArray: AssertArray, propName: string): string {
  const assertion = isArray.assertion
  return `isArray(input["${propName}"], ${generateAssertion(assertion, propName, true)})`;
}

export function generateAssertion(assertion: Assertion, propName: string, isNested: boolean = false): string {
  switch (assertion.fnName) {
    case "isOneOf":
      return generateIsOneOf(assertion, propName);
    case "isLiteral":
      if (isNested) return `isLiteral(${literalValueString(assertion)})`;
      return `isLiteral(${literalValueString(assertion)}(input["${propName}"])`;
    case "isArray":
      return generateIsArray(assertion, propName);
    default:
      if (isNested) return `${assertion.fnName}`;
      return `${assertion.fnName}(input["${propName}"])`;
  }
}

// returns whether or not an input is nullish
export function isNullish(input: any) {
  return input == null;
}

// throws an error if the input is nullish
export function isRequired(input: any) {
  if (isNullish(input)) throw new Error("missing required property");
}

// returns true if the input is a number
export function isNumber(input: any) {
  if (typeof input !== "number") throw new Error(`expected type 'number', found '${typeof input}'`)
}

// returns true if the input is a string
export function isString(input: any) {
  if (typeof input !== "string") throw new Error(`expected type 'string', found '${typeof input}'`);
}

export function isBoolean(input: any) {
  if (typeof input !== "boolean") throw new Error(`expected type 'boolean', found '${typeof input}'`);
}

// returns true if the input is an array and every element passes the given validator function
export function isArray(input: any, validator: ValidatorFunc) {
  if (!Array.isArray(input)) {
    throw new Error(`expected type 'array', found '${typeof input}'`);
  }

  try {
    input.forEach(validator);
  } catch (e) {
    throw new Error(`at least one element failed inner-type validation with: ${e}`);
  }
}

export function isLiteral(val: any) {
  return (input: any) => {
    if (input !== val) {
      throw new Error(`expected '${val}' but found '${input}'`);
    }
  }
}

export function isOneOf(input: any, validators: ValidatorFunc[]) {
  const success = validators.some(validator => {
    try {
      validator(input);
    } catch(e) {
      return false;
    };
    return true;
  })

  if (!success) {
    throw new Error(`${input} is not one of the valid values`)
  }
}
