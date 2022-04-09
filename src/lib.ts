import util from "util";
import { parseFileSync } from "@swc/core";
import type { Statement, Expression, VariableDeclarator, Pattern, TsType, TsTypeAnnotation, Span, Super, Import } from "@swc/core";

type Callsite = {
  typeName: string;
  span: Span;
};

const mod = parseFileSync("./example.ts", {
  syntax: "typescript",
  comments: false,
  script: true,
  target: "es3",
  isModule: false,
});

console.log(util.inspect(mod, { depth: null, colors: true }));

function log(msg: string, thing: any) {
  console.log(msg, util.inspect(thing, { depth: null, colors: true }));
}

function getTypeNameFromType(ty: TsType | TsTypeAnnotation): string | undefined {
  switch (ty.type) {
    case "TsTypeAnnotation":
      if ("typeAnnotation" in ty) {
        return getTypeNameFromType(ty.typeAnnotation);
      }
    case "TsTypeReference":
      if ("typeName" in ty && ty.typeName.type === "Identifier") {
        return ty.typeName.value;
      }
  }

  return;
}

function getTypeAnnotation(pat: Pattern): string | undefined {
  if (pat.type !== "Identifier") {
    return;
  }

  const { typeAnnotation } = pat;
  if (typeAnnotation == null) {
    return;
  }

  return getTypeNameFromType(typeAnnotation);
}

function findCallsites(node: Statement | Expression | VariableDeclarator, typeName?: string) {
  switch (node.type) {
    case "VariableDeclaration":
      node.declarations.forEach(decl => findCallsites(decl, typeName));
      break;
    case "VariableDeclarator":
      node.init && findCallsites(node.init, getTypeAnnotation(node.id));
      break;
    case "CallExpression":
      // TODO (etate) if we don't have a typeName at this point, check for typeArguments at the callsite
      console.log("Found call expression");
      if (node.callee.type === "Identifier" && node.callee.value === "$marshal") {
        const callsite = {
          typeName,
          span: node.span,
        };
        log("Found callsite: ", callsite);
      }
  }
}

function buildTypeMap(node: Statement) {
  // TODO: find interface
}

mod.body.forEach(stmt => findCallsites(stmt));
