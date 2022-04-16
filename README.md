# martian

Extra-terrestrial, statically generated type marshaling for TypeScript

## TL;DR

Validate runtime data into TypeScript types with a single function call

```typescript
interface Spaceship {
  name: string;
  type: "cruiser" | "destroyer" | "freighter";
}

const shipJSON = `{
  "name": "Millenium Falcon",
  "type": "freighter"
}`;

const ship: Spaceship = $marshal(shipJSON);
console.log(`The ${ship.name} is a ${ship.type}`);
```

## How does it work?

_TODO: make better words_
Martian exposes a single function called `$marshal()`, which you can use throughout your code to transform runtime data (e.g. JSON, raw objects, etc) into validated TypeScript types. This works by statically analyzing your types (courtesy of [SWC](https://swc.rs/)) and lazily generating bespoke validator functions for each of them. Your calls to `$marshal()` are replaced with the generated validator functions and included in your final bundle.

## Why the `$`?

The `$` symbol is the only non-letter symbol, other than `_`, that can start an identifier in ECMAScript. It's also incredibly unusual to use in normal code, outside of jQuery. Prefixing the `$marshal()` function this way helps address a couple of things:

- _Naming conflicts:_ You might have a `marshal` identifier somehwere in your code, but you probably don't have a `$marshal`.
- _Recognition:_ In fact you probably don't have _any_ identifiers that start with `$`, so when it does come up there's a decent chance you'll recognize something unusual is happening.
