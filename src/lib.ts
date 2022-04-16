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
  Declaration,
  VariableDeclarator,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor";

function log(msg: string, thing: any) {
  console.log(msg, util.inspect(thing, { depth: null, colors: true }));
}

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

function getTypeAssertion(ty: TsType): Assertion {
  switch (ty.type) {
    case "TsKeywordType":
      if ("kind" in ty) {
        return keywordToAssertion(ty.kind);
      }
  }

  throw new Error("property type could not be mapped to assertion");
}

type Assertion = "isRequired" | "isString" | "isNumber";

type PropertyAssertions = {
  name: string;
  assertions: Assertion[];
};

function keywordToAssertion(keyword: string): Assertion {
  switch (keyword) {
    case "string":
      return "isString";
    case "number":
      return "isNumber";
  }

  throw new Error(
    `keyword type '${keyword}' does not have a mappable assertion`
  );
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

  if (!optional) {
    assertions.push("isRequired");
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
  let func = `function marshal${typeName}(input: any): ${typeName} {\n`;
  propAssertions.forEach(({ name, assertions }) => {
    assertions.forEach((assertion) => {
      func += `  ${assertion}(input["${name}"]);\n`;
    });
  });

  if (type === "type") {
    const expectedProps = propAssertions.map(prop => prop.name);
    func += "  const expectedProps = new Set([ \"" + expectedProps.join("\", \"") + "\" ]);\n";
    // TODO (etate): consider collecting extra prop names and adding them to error message
    func += `  if (!Object.keys(input).every(expectedProps.has) throw new Error("too many props to marshal '${typeName}'");\n`;

  }

  return func + `  return input as ${typeName};\n}\n`;
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

    // TODO (etate): figure out type name and grab appropriate function name
    expr.callee.value = `marshal${typeName}`;
    return expr;
  }

  visitTsType(ty: TsType): TsType {
    return ty;
  }
}

class MartianPlugin extends Visitor {
  visitVariableDeclarator(decl: VariableDeclarator): VariableDeclarator {
    if (decl.id.type !== "Identifier") {
      return decl;
    }

    if (decl.init == null) {
      return decl;
    }

    const { typeAnnotation } = decl.id;
    const typeName = typeAnnotation && getTypeNameFromType(typeAnnotation);

    decl.init = new ReplaceCallsite(typeName).visitExpression(decl.init);
    return decl;
  }

  visitTsType(ty: TsType): TsType {
    return ty;
  }

  visitTsInterfaceDeclaration(
    decl: TsInterfaceDeclaration
  ): TsInterfaceDeclaration {
    console.log("Found interface declaration");
    // log("Interface: ", decl);
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
    // console.log(validator);
    return decl;
  }

  visitTsTypeAliasDeclaration(decl: TsTypeAliasDeclaration) {
    log("Type Alias: ", decl);
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
    console.log(validator);
    return decl;
  }
}

const file = fs.readFileSync("./example.ts").toString();
const res = transformSync(file, {
  plugin: (m) => {console.log(m); return new MartianPlugin().visitProgram(m)},
  sourceMaps: true,
  jsc: {
    parser: {
      syntax: "typescript",
    },
  },
});

// console.log(res);
