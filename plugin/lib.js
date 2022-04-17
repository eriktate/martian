"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MartianPlugin = void 0;
const util_1 = __importDefault(require("util"));
const Visitor_1 = require("@swc/core/Visitor");
const fileWriter_1 = require("./fileWriter");
const assertions_1 = require("./assertions");
function log(msg, thing) {
    console.log(msg, util_1.default.inspect(thing, { depth: null, colors: true }));
}
const fileWriter = (0, fileWriter_1.initFileWriter)();
function getTypeNameFromType(ty) {
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
function getPropName(expr) {
    switch (expr.type) {
        case "Identifier":
            return expr.value;
    }
    // TODO (etate): throw here?
    return "unknown";
}
function getTypeAssertion(ty) {
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
function keywordToAssertion(keyword) {
    switch (keyword) {
        case "string":
            return { fnName: "isString" };
        case "number":
            return { fnName: "isNumber" };
    }
    throw new Error(`keyword type '${keyword}' does not have a mappable assertion`);
}
function literalToAssertion(lit) {
    const { literal } = lit;
    if ("value" in literal) {
        const assertion = {
            fnName: "isLiteral",
            value: literal.value,
            litType: "string", // TODO: need this default to make type system happy, but should revisit
        };
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
function unionToAssertion(types) {
    const assertions = [];
    types.forEach(ty => {
        switch (ty.type) {
            case "TsLiteralType":
                if ("literal" in ty) {
                    assertions.push(literalToAssertion(ty));
                }
        }
    });
    return {
        fnName: "isOneOf",
        assertions: assertions,
    };
}
function generatePropertyAssertions(prop) {
    if (prop.type !== "TsPropertySignature") {
        // TODO (etate): throw?
        return {
            name: "",
            assertions: [],
        };
    }
    const { key, optional, typeAnnotation } = prop;
    const assertions = [];
    const name = getPropName(key);
    if (optional) {
        // we unshift isNullish assertions so we can short circuit later
        assertions.unshift({ fnName: "isNullish" });
    }
    else {
        assertions.push({ fnName: "isRequired" });
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
function generateValidationFunction(type, typeName, propAssertions) {
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
            func += `${indention}${(0, assertions_1.generateAssertion)(assertion, name)};\n`;
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
class ReplaceCallsite extends Visitor_1.Visitor {
    constructor(typeName) {
        super();
        this.typeName = typeName;
    }
    visitCallExpression(expr) {
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
    visitTsType(ty) {
        return ty;
    }
}
// TODO (etate): In order to deal with cases where the type information isn't included in the same statement
// as the $marshal() CallExpressions, we need to build up a list of identifiers available within the scope.
// This means that at every point that a new scope is introduced, we need to visit using a new MartianPlugin with a
// copy of the identifiers mapping. This will allow us to build up scopes as we descend without accidentally
// exposing identifiers from non-visible scopes
class MartianPlugin extends Visitor_1.Visitor {
    constructor() {
        super();
        this.identifiers = {};
    }
    visitImportDeclaration(decl) {
        log("Import:", decl);
        if (decl.source.value.includes("marshal")) {
            return {
                ...decl,
                specifiers: [{ ...decl.specifiers[0], type: "ImportNamespaceSpecifier" }],
            };
        }
        return decl;
    }
    visitVariableDeclarator(decl) {
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
    visitTsType(ty) {
        return ty;
    }
    visitTsInterfaceDeclaration(decl) {
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
    visitTsTypeAliasDeclaration(decl) {
        if (decl.id.type !== "Identifier") {
            // TODO: throw?
            return decl;
        }
        const { typeAnnotation } = decl;
        if (typeAnnotation == null) {
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
    visitAssignmentExpression(expr) {
        const { left, right } = expr;
        if (left.type === "Identifier") {
            const typeName = this.identifiers[left.value];
            return {
                ...expr,
                right: new ReplaceCallsite(typeName).visitExpression(right),
            };
        }
        return expr;
    }
}
exports.MartianPlugin = MartianPlugin;
// const file = fs.readFileSync("./example.ts").toString();
// const res = transformSync(file, {
//   plugin: (m) => {log("module: ", m); return new MartianPlugin().visitProgram(m)},
//   sourceMaps: true,
//   jsc: {
//     target: "es2016",
//     parser: {
//       syntax: "typescript",
//     },
//   },
// });
// console.log(res);
