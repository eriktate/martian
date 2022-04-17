import util from "util";
import fs from "fs";
import { transformSync } from "@swc/core";
import type {
  Expression,
  CallExpression,
  TsInterfaceDeclaration,
  TsType,
  TsTypeElement,
  TsTypeAnnotation,
  TsTypeParameterInstantiation,
  TsTypeAliasDeclaration,
  TsLiteralType,
  VariableDeclarator,
  AssignmentExpression,
  ImportDeclaration,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor";
import { initFileWriter } from "./fileWriter";
import type { Assertion } from "./assertions";
import { generateAssertion } from "./assertions";

function log(msg: string, thing: any) {
  console.log(msg, util.inspect(thing, { depth: null, colors: true }));
}

const fileWriter = initFileWriter();

function getTypeNameFromType(
  ty: TsType | TsTypeAnnotation | TsTypeParameterInstantiation
): string | undefined {
  switch (ty.type) {
    case "TsTypeAnnotation":
      if ("typeAnnotation" in ty) {
        return getTypeNameFromType(ty.typeAnnotation);
      }
    case "TsTypeReference":
      if ("typeName" in ty && ty.typeName.type === "Identifier") {
        return ty.typeName.value;
      }
    case "TsTypeParameterInstantiation":
      if ("params" in ty) {
        return getTypeNameFromType(ty.params[0]);
      }
  }

  return;
}

function getPropName(expr: Expression): string {
  switch (expr.type) {
    case "Identifier":
      return expr.value;
  }

  // TODO (etate): throw here?
  return "unknown";
}

type PropertyAssertions = {
  name: string;
  assertions: Assertion[];
};

function getTypeAssertion(ty: TsType): Assertion {
  switch (ty.type) {
    case "TsKeywordType":
      if ("kind" in ty) {
        return keywordToAssertion(ty.kind);
      }
    case "TsUnionType":
      if ("types" in ty) {
        return unionToAssertion(ty.types);
    }
    case "TsArrayType":
      if ("elemType" in ty) {
        return {
          fnName: "isArray",
          assertion: getTypeAssertion(ty.elemType),
        };
      }
  }

  throw new Error("property type could not be mapped to assertion");
}



function keywordToAssertion(keyword: string): Assertion {
  switch (keyword) {
    case "string":
      return { fnName: "isString" };
    case "number":
      return { fnName: "isNumber" };
  }

  throw new Error(
    `keyword type '${keyword}' does not have a mappable assertion`
  );
}

function literalToAssertion(lit: TsLiteralType): Assertion {
  const { literal } = lit;
  if ("value" in literal) {
    const assertion: Assertion = {
      fnName: "isLiteral",
      value: literal.value,
      litType: "string", // TODO: need this default to make type system happy, but should revisit
    }

    switch (literal.type) {
      case "StringLiteral":
        return {
          ...assertion,
          litType: "string",
        };
      case "NumericLiteral":
        return {
          ...assertion,
          litType: "number",
        };
      case "BooleanLiteral":
        return {
          ...assertion,
          litType: "boolean",
        };
    }
  }

  throw new Error(`literal type ${literal.type} does not have a mappable assertion`);
}

function unionToAssertion(types: TsType[]): Assertion {
  const assertions: Assertion[] = [];

  types.forEach(ty => {
    switch (ty.type) {
      case "TsLiteralType":
        if ("literal" in ty) {
          assertions.push(literalToAssertion(ty));
        }
    }
  })

  return {
    fnName: "isOneOf",
    assertions: assertions,
  };
}

function generatePropertyAssertions(prop: TsTypeElement): PropertyAssertions {
  if (prop.type !== "TsPropertySignature") {
    // TODO (etate): throw?
    return {
      name: "",
      assertions: [],
    };
  }

  const { key, optional, typeAnnotation } = prop;
  const assertions: Assertion[] = [];

  const name = getPropName(key);

  if (optional) {
    // we unshift isNullish assertions so we can short circuit later
    assertions.unshift({ fnName: "isNullish" });
  } else {
    assertions.push({ fnName: "isRequired"});
  }

  if (!typeAnnotation) {
    // TODO (etate): should this throw?
    return {
      name,
      assertions,
    };
  }

  assertions.push(getTypeAssertion(typeAnnotation.typeAnnotation));
  return {
    name,
    assertions,
  };
}

type ValidationType = "interface" | "type";

function generateValidationFunction(
  type: ValidationType,
  typeName: string,
  propAssertions: PropertyAssertions[]
): string {
  let indention = "  ";
  let func = `function marshal${typeName}(input: any) {\n`;
  propAssertions.forEach(({ name, assertions }) => {
    let nullish = false;
    assertions.forEach((assertion, idx) => {
      if (idx === 0 && assertion.fnName === "isNullish") {
        nullish = true;
        // an optional value should short circuit all other assertions if nullish
        func += `${indention}if (!isNullish(input["${name}"])) {\n`;
        indention = indention.concat("  ");
        return;
      }
      func += `${indention}${generateAssertion(assertion, name)};\n`;
    });

    // make sure we close the block if the prop is optional
    if (nullish) {
      indention = indention.substring(0, indention.length - 2);
      func += `${indention}}\n`;
    }
  });

  if (type === "type") {
    const expectedProps = propAssertions.map(prop => prop.name);
    func += "  const expectedProps = new Set([ \"" + expectedProps.join("\", \"") + "\" ]);\n";
    // TODO (etate): consider collecting extra prop names and adding them to error message
    func += `  if (!Object.keys(input).every(key => expectedProps.has(key))) throw new Error("too many props to marshal '${typeName}'");\n`;

  }

  return func + `  return input;\n}\n`;
}

class ReplaceCallsite extends Visitor {
  private typeName?: string;

  constructor(typeName?: string) {
    super();
    this.typeName = typeName;
  }

  visitCallExpression(expr: CallExpression): Expression {
    if (expr.callee.type !== "Identifier") {
      return expr;
    }

    if (expr.callee.value !== "$marshal") {
      return expr;
    }

    let { typeName } = this;
    if (typeName == null) {
      const { typeArguments } = expr;
      typeName = typeArguments && getTypeNameFromType(typeArguments);
    }

    // TODO (etate): generate a TsAsExpression and fit this modified CallExpression inside
    expr.callee.value = `$marshal.marshal${typeName}`;
    return expr;
  }

  visitTsType(ty: TsType): TsType {
    return ty;
  }
}

// TODO (etate): In order to deal with cases where the type information isn't included in the same statement
// as the $marshal() CallExpressions, we need to build up a list of identifiers available within the scope.
// This means that at every point that a new scope is introduced, we need to visit using a new MartianPlugin with a
// copy of the identifiers mapping. This will allow us to build up scopes as we descend without accidentally
// exposing identifiers from non-visible scopes
class MartianPlugin extends Visitor {
  private identifiers: Record<string, string | undefined>;

  constructor() {
    super();
    this.identifiers = {};
  }

  visitImportDeclaration(decl: ImportDeclaration): ImportDeclaration {
    log("Import:", decl);
    if (decl.source.value.includes("marshal")) {
      return {
        ...decl,
        specifiers: [ { ...decl.specifiers[0], type: "ImportNamespaceSpecifier" } ],
      }
    }
    return decl;
  }

  visitVariableDeclarator(decl: VariableDeclarator): VariableDeclarator {
    if (decl.id.type !== "Identifier") {
      return decl;
    }

    const { typeAnnotation } = decl.id;
    const typeName = (typeAnnotation && getTypeNameFromType(typeAnnotation)) ?? this.identifiers[decl.id.value];

    this.identifiers[decl.id.value] = typeName;

    if (decl.init == null) {
      console.log("Null init?");
      return decl;
    }

    decl.init = new ReplaceCallsite(typeName).visitExpression(decl.init);
    return decl;
  }

  visitTsType(ty: TsType): TsType {
    return ty;
  }

  visitTsInterfaceDeclaration(
    decl: TsInterfaceDeclaration
  ): TsInterfaceDeclaration {
    if (decl.body.type !== "TsInterfaceBody") {
      // TODO: throw?
      return decl;
    }

    if (decl.id.type !== "Identifier") {
      // TODO: throw?
      return decl;
    }

    const assertions = decl.body.body.map(generatePropertyAssertions);
    // log("Assertions: ", assertions);
    const validator = generateValidationFunction("interface", decl.id.value, assertions);
    fileWriter.writeFn(validator);
    return decl;
  }

  visitTsTypeAliasDeclaration(decl: TsTypeAliasDeclaration) {
    if (decl.id.type !== "Identifier") {
      // TODO: throw?
      return decl;
    }

    const { typeAnnotation } = decl;
    if (typeAnnotation == null)  {
      // TODO: throw?
      return decl;
    }

    if (typeAnnotation.type !== "TsTypeLiteral" || !("members" in typeAnnotation)) {
      // TODO: throw?
      return decl;
    }

    const assertions = typeAnnotation.members.map(generatePropertyAssertions);
    const validator = generateValidationFunction("type", decl.id.value, assertions);
    fileWriter.writeFn(validator);
    return decl;
  }

  visitAssignmentExpression(expr: AssignmentExpression): AssignmentExpression {
    const { left, right } = expr;
    if (left.type === "Identifier") {
      const typeName = this.identifiers[left.value];
      return {
        ...expr,
        right: new ReplaceCallsite(typeName).visitExpression(right),
      }
    }

    return expr;
  }
}

const file = fs.readFileSync("./example.ts").toString();
const res = transformSync(file, {
  plugin: (m) => {log("module: ", m); return new MartianPlugin().visitProgram(m)},
  sourceMaps: true,
  jsc: {
    target: "es2016",
    parser: {
      syntax: "typescript",
    },
  },
});
console.log(res);
