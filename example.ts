function $marshal<T>(src: any): T {
  throw new Error("marshal has not been replaced for this callsite");
  return undefined as T;
}


interface ThingInterface {
  id: number;
  name: string;

}

type ThingType = {
  id: number;
  name: string;
}


const rawThing = `{
  "id": 1,
  "name": "Test"
}`;

const thingInterface: ThingInterface = $marshal(rawThing);
const thingType = $marshal<ThingType>(rawThing);
