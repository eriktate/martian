import $marshal from "./src/marshal";

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
console.log(spaceShip);

const rawCrewMember = `{
  "id": 2,
  "name": "Chewbacca",
  "nickName": "Chewy"
}`;


// types can be detected using generic type annotations
const crewMember = $marshal<CrewMember>(JSON.parse(rawCrewMember));
console.log(crewMember);

const rawCaptain = `{
  "id": 3,
  "name": "Han Solo",
  "crewIds": [2]
}`;

// types can be detected on assignment to identfiers with known types
let captain: Captain;
captain = $marshal(JSON.parse(rawCaptain));
