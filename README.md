# martian

Extra-terrestrial, statically generated type marshaling for TypeScript

## TL;DR

Validate runtime data into TypeScript types with a single function call

```typescript
import $marshal from "martian";

type SpaceShip = {
  id: number;
  name: string;
  class: "freighter" | "destroyer" | "yacht";
};

interface CrewMember {
  id: number;
  name: string;
  nickName?: string;
}

interface Captain {
  id: number;
  name: string;
  nickName?: string;
  crewIds: number[];
}


const rawSpaceShip = `{
  "id": 1,
  "name": "Millenium Falcon",
  "class": "freighter"
}`;

// types can be detected from the variable declartion
const spaceShip: SpaceShip = $marshal(JSON.parse(rawSpaceShip));


const rawCrewMember = `{
  "id": 2,
  "name": "Chewbacca",
  "nickName": "Chewy"
}`;

// types can be detected using generic type annotations
const crewMember = $marshal<CrewMember>(JSON.parse(rawSpaceShip));


const rawCaptain = `{
  "id": 3,
  "name": "Han Solo",
  "crew": [2]
}`;

// types can be detected on assignment to identfiers with known types
let captain: Captain;
captain = $marshal(JSON.parse(rawCaptain));
```

## What is this for?
The intention behind martian is to convert common cases of runtime data into validated TypeScript types without any custom validation code or special DSLs. For now this focuses on plain javascript objects and is limited to simple types you could easily represent as JSON.

## How does it work?

_TODO: make better words_
Martian exposes a single function called `$marshal()`, which you can use throughout your code to transform runtime data (e.g. JSON, raw objects, etc) into validated TypeScript types. This works by statically analyzing your types and lazily generating bespoke validator functions for each of them. Your calls to `$marshal()` are replaced with the generated validator functions and included in your final bundle.

## Why the `$`?

The `$` symbol is the only non-letter symbol, other than `_`, that can start an identifier in ECMAScript. It's also not that common to use in normal code. Prefixing the `$marshal()` function this way helps address a couple of things:

- _Naming conflicts:_ You might have an existing `marshal` identifier somehwere in your code, but you probably don't have a `$marshal`.
- _Recognition:_ In fact you probably don't have _any_ identifiers that start with `$`, so when it does come up there's a decent chance you'll recognize `$marshal()` is a sort of special case.

