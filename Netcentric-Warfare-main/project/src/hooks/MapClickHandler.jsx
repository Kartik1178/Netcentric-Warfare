import { useMapEvents } from "react-leaflet";
import * as L from "leaflet";
import { findNearestBase } from "../utils/FindNearestBase";

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

export default function MapClickHandler({ step, selectedSpawnType, onSpawn, bases }) {
  useMapEvents({
    click(e) {
      if (step !== "launch") return;

      if (!isInsideLaunchZone(e.latlng)) {
        alert("❌ Launch outside allowed zones!");
        return;
      }

      const now = Date.now();
      const spawnType = (selectedSpawnType || "missile").toLowerCase();

      let spawnData;

      if (spawnType === "drone" || spawnType === "artillery") {
        // ✅ Find nearest base
const nearestBase = findNearestBase(e.latlng.lat, e.latlng.lng);
        if (!nearestBase) {
          console.warn("⚠️ No nearest base found!");
          return;
        }

        spawnData = {
          id: `${spawnType}-${now}`,
          type: spawnType,
          baseId: nearestBase.id,
          startLat: e.latlng.lat,
          startLng: e.latlng.lng,
          targetLat: nearestBase.coords[0],
          targetLng: nearestBase.coords[1],
        };

        if (spawnType === "drone") {
          spawnData.patrolPath = [
            [e.latlng.lat, e.latlng.lng],
            [e.latlng.lat + 0.01, e.latlng.lng + 0.01],
            [e.latlng.lat, e.latlng.lng + 0.02],
          ];
        }

      } else if (spawnType === "jammer") {
        spawnData = {
          id: `jammer-${now}`,
          type: "jammer",
          lat: e.latlng.lat,
          lng: e.latlng.lng,
          baseId: "none",
          startLat: e.latlng.lat,
          startLng: e.latlng.lng,
          radius: 0.02,
        };
      } else {
        // Default missile: ✅ Still fixed to New Delhi
        const fixedTarget = { id: "base-fixed", coords: [28.6139, 77.209] };
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
      console.log(
        `[MapClickHandler] 🚀 Spawned ${spawnData.type} from (${e.latlng.lat.toFixed(2)},${e.latlng.lng.toFixed(2)}) → target ${spawnData.targetLat?.toFixed(2)}, ${spawnData.targetLng?.toFixed(2)}`
      );
    },
  });

  return null;
}
