function $marshal(src) {
    throw new Error("marshal has not been replaced for this callsite");
}
const rawSpaceShip = `{
  "id": 1,
  "name": "Millenium Falcon",
  "class": "freighter"
}`;
const spaceShip = $marshal(JSON.parse(rawSpaceShip));
console.log(spaceShip);
const rawCrewMember = `{
  "id": 2,
  "name": "Chewbacca",
  "nickName": "Chewy"
}`;
const crewMember = $marshal(JSON.parse(rawCrewMember));
console.log(crewMember);
const rawCaptain = `{
  "id": 3,
  "name": "Han Solo",
  "crewIds": [2]
}`;
let captain;
captain = $marshal(JSON.parse(rawCaptain));
