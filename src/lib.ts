import util from "util";
import fs from "fs";
import { transformSync } from "@swc/core";
import type {
  Expression,
  CallExpression,
  TsType,
  TsTypeAnnotation,
  TsTypeParameterInstantiation,
  VariableDeclarator,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor";

function log(msg: string, thing: any) {
  console.log(msg, util.inspect(thing, { depth: null, colors: true }));
}

function getTypeNameFromType(ty: TsType | TsTypeAnnotation | TsTypeParameterInstantiation): string | undefined {
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

    if (decl.init == null)  {
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
}

const file = fs.readFileSync("./example.ts").toString();
const res = transformSync(file, {
  plugin: (m) => new MartianPlugin().visitProgram(m),
  sourceMaps: true,
  jsc: {
    parser: {
      syntax: "typescript",
    }
  }
});

console.log(res);

