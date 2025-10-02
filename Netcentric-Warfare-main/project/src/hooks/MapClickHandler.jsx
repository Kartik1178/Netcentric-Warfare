

// MapClickHandler.jsx
import { useRef, useEffect } from "react";
import { useMapEvents } from "react-leaflet";
import * as L from "leaflet";
import { findNearestBase } from "../utils/FindNearestBase";

// Enemy launch zones
const LAUNCH_ZONES = [
  { id: "pakistan-north", polygon: [[35.0, 74.5],[34.0, 74.0],[33.5, 73.5],[33.5, 74.5]] },
  { id: "pakistan-south", polygon: [[25.5, 67.5],[25.0, 67.0],[24.5, 67.0],[24.5, 67.5]] },
  { id: "arabian-sea", polygon: [[22.0, 65.5],[20.0, 65.5],[18.0, 67.0],[18.0, 69.0],[22.0, 69.0]] },
  { id: "bay-of-bengal", polygon: [[17.0, 87.0],[15.0, 87.0],[13.0, 89.0],[14.0, 91.0],[17.0, 89.0]] },
  { id: "indian-ocean", polygon: [[10.0, 72.0],[7.0, 72.0],[6.0, 74.0],[7.0, 76.0],[10.0, 75.0]] },
];

function isInsideLaunchZone(latlng) {
  return LAUNCH_ZONES.some(zone =>
    L.polygon(zone.polygon).getBounds().contains(L.latLng(latlng))
  );
}

export default function MapClickHandler({
  step,
  selectedSpawnType,
  onSpawn,
  placingNewBase,
  setPlacingNewBase, // 🔹 pass the setter
  newBaseType,
  setCustomBases,
  onLogsUpdate
}) {
  const jammerCooldown = useRef(false);
  const basePlaced = useRef(false);
  const placingBaseRef = useRef(placingNewBase);

  // Keep ref in sync with prop
  useEffect(() => {
    placingBaseRef.current = placingNewBase;
    if (placingNewBase) basePlaced.current = false;
  }, [placingNewBase]);

  useMapEvents({
    click(e) {
      // Handle new base placement
      if (placingBaseRef.current && newBaseType) {
        if (basePlaced.current) return;

        const newBase = {
          id: `custom-${Date.now()}`,
          type: newBaseType,
          coords: [e.latlng.lat, e.latlng.lng],
        };
        setCustomBases(prev => [...prev, newBase]);
        basePlaced.current = true;

        onLogsUpdate?.({
          timestamp: new Date().toLocaleTimeString(),
          source: "MapClickHandler",
          type: "base-add",
          message: `${newBase.type} Base added at [${newBase.coords[0].toFixed(2)}, ${newBase.coords[1].toFixed(2)}]`,
          payload: newBase,
        });

        // Reset flags
        placingBaseRef.current = false;
        setPlacingNewBase(false);
        return;
      }

      // Normal launch mode
      if (step !== "launch") return;

      if (!isInsideLaunchZone(e.latlng)) {
        alert("❌ Launch outside allowed zones!");
        return;
      }

      const NEW_DELHI = { id: "new-delhi", coords: [28.6139, 77.2090] };
      const nearestBase = findNearestBase(e.latlng.lat, e.latlng.lng);

      let spawnData;
      const type = (selectedSpawnType || "missile").toLowerCase();

      switch (type) {
        case "drone": {
          const target = nearestBase ? nearestBase.coords : NEW_DELHI.coords;
          spawnData = {
            id: `drone-${Date.now()}`,
            type: "drone",
            baseId: nearestBase ? nearestBase.id : "base-unknown",
            startLat: e.latlng.lat,
            startLng: e.latlng.lng,
            targetLat: target[0],
            targetLng: target[1],
            patrolPath: [
              [e.latlng.lat, e.latlng.lng],
              [e.latlng.lat + 0.01, e.latlng.lng + 0.01],
              [e.latlng.lat, e.latlng.lng + 0.02],
            ],
          };
          break;
        }

        case "artillery": {
          const target = nearestBase ? nearestBase.coords : NEW_DELHI.coords;
          spawnData = {
            id: `artillery-${Date.now()}`,
            type: "artillery",
            baseId: nearestBase ? nearestBase.id : "base-unknown",
            startLat: e.latlng.lat,
            startLng: e.latlng.lng,
            targetLat: target[0],
            targetLng: target[1],
          };
          break;
        }

        case "jammer": {
          if (jammerCooldown.current) {
            alert("⚠️ Jammer cooling down!");
            return;
          }
          spawnData = {
            id: `jammer-${Date.now()}`,
            type: "jammer",
            baseId: nearestBase ? nearestBase.id : "base-unknown",
            startLat: e.latlng.lat,
            startLng: e.latlng.lng,
            radius: 0.02,
          };
          jammerCooldown.current = true;
          setTimeout(() => (jammerCooldown.current = false), 5000);
          break;
        }

        default: {
          spawnData = {
            id: `missile-${Date.now()}`,
            type: "missile",
            baseId: "enemy-launch",
            startLat: e.latlng.lat,
            startLng: e.latlng.lng,
            targetLat: NEW_DELHI.coords[0],
            targetLng: NEW_DELHI.coords[1],
          };
        }
      }

      // Safety checks
      if (spawnData.startLat == null || spawnData.startLng == null) {
        console.error("Invalid spawn coordinates", spawnData);
        return;
      }
      if (spawnData.targetLat == null || spawnData.targetLng == null) {
        console.error("Invalid target coordinates", spawnData);
        return;
      }

      onSpawn(spawnData);
      console.log("Spawned:", spawnData.type, spawnData);
    },
  });

  return null;
}
