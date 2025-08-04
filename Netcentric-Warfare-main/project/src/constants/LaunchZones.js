// launchZones.js
export const LAUNCH_ZONES = [
  // Example polygon for Pakistan side (Srinagar threat)
  {
    id: "pakistan-north",
    color: "rgba(255,0,0,0.3)",
    polygon: [
      [34.5, 73.5],
      [34.0, 73.2],
      [33.5, 73.0],
      [33.0, 73.5],
      [33.5, 74.0],
    ],
  },
  // Example polygon for Arabian Sea
  {
    id: "arabian-sea",
    color: "rgba(0,0,255,0.3)",
    polygon: [
      [22.0, 66.5],
      [21.0, 66.5],
      [19.0, 67.0],
      [19.0, 69.0],
      [22.0, 69.0],
    ],
  },
];
