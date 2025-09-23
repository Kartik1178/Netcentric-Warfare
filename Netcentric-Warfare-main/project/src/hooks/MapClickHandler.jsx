import { useMapEvents } from "react-leaflet";
import * as L from "leaflet";

const LAUNCH_ZONES = [
  { id: "pakistan-north", polygon: [[35,74.5],[34,74],[33.5,73.5],[33.5,74.5]] },
  { id: "pakistan-south", polygon: [[25.5,67.5],[25,67],[24.5,67],[24.5,67.5]] },
  { id: "arabian-sea", polygon: [[22,65.5],[20,65.5],[18,67],[18,69],[22,69]] },
  { id: "bay-of-bengal", polygon: [[17,87],[15,87],[13,89],[14,91],[17,89]] },
  { id: "indian-ocean", polygon: [[10,72],[7,72],[6,74],[7,76],[10,75]] },
];

function isInsideLaunchZone(latlng) {
  return LAUNCH_ZONES.some(zone =>
    L.polygon(zone.polygon).getBounds().contains(L.latLng(latlng))
  );
}

export default function MapClickHandler({ step, selectedSpawnType, onSpawn }) {
  useMapEvents({
    click(e) {
      if (step !== "launch") return;

      if (!isInsideLaunchZone(e.latlng)) {
        alert("❌ Launch outside allowed zones!");
        return;
      }

      const now = Date.now();
      const fixedTarget = { id: "base-fixed", coords: [28.6139, 77.209] };
      let spawnData;

      switch ((selectedSpawnType || "missile").toLowerCase()) {
        case "drone":
          spawnData = {
            id: `drone-${now}`,
            type: "drone",
            baseId: fixedTarget.id,
            startLat: e.latlng.lat,
            startLng: e.latlng.lng,
            targetLat: fixedTarget.coords[0],
            targetLng: fixedTarget.coords[1],
            patrolPath: [
              [e.latlng.lat, e.latlng.lng],
              [e.latlng.lat + 0.01, e.latlng.lng + 0.01],
              [e.latlng.lat, e.latlng.lng + 0.02],
            ],
          };
          break;

        case "artillery":
          spawnData = {
            id: `artillery-${now}`,
            type: "artillery",
            baseId: fixedTarget.id,
            startLat: e.latlng.lat,
            startLng: e.latlng.lng,
            targetLat: fixedTarget.coords[0],
            targetLng: fixedTarget.coords[1],
          };
          break;

        case "jammer":
          // ✅ Spawn immediately without cooldown
          spawnData = {
            id: `jammer-${now}`,
            type: "jammer",
            lat: e.latlng.lat,        // <- Add this
  lng: e.latlng.lng, 
            baseId: fixedTarget.id,
            startLat: e.latlng.lat,
            startLng: e.latlng.lng,
            radius: 0.02,
          };
          break;

        default:
          spawnData = {
            id: `missile-${now}`,
            type: "missile",
            baseId: fixedTarget.id,
            startLat: e.latlng.lat,
            startLng: e.latlng.lng,
            targetLat: fixedTarget.coords[0],
            targetLng: fixedTarget.coords[1],
          };
      }

      onSpawn(spawnData);
      console.log("Spawned:", spawnData.type);
    },
  });

  return null;
}
