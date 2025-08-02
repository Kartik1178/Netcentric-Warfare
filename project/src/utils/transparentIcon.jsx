import L from "leaflet";

const baseColors = {
  Air: "#1E90FF",       // Blue
  Land: "#3CB371",      // Green
  Sea: "#00CED1",       // Cyan
  Submarine: "#8A2BE2", // Purple
};

// 🔹 Returns a styled Leaflet divIcon similar to your Konva markers
export function getStyledBaseIcon(base, selected = false) {
  const color = baseColors[base.type] || "gray";
  const scale = selected ? 1.2 : 1;

  // Shape HTML based on type
  let shapeHTML = "";
  switch (base.type) {
    case "Air": // circle
      shapeHTML = `<div style="
        width:16px;height:16px;
        background:${color};
        border-radius:50%;
        border:1.5px solid white;
        transform:scale(${scale});
      "></div>`;
      break;
    case "Land": // square
      shapeHTML = `<div style="
        width:16px;height:16px;
        background:${color};
        border:1.5px solid white;
        transform:scale(${scale});
      "></div>`;
      break;
    case "Sea": // diamond
      shapeHTML = `<div style="
        width:16px;height:16px;
        background:${color};
        border:1.5px solid white;
        transform:rotate(45deg) scale(${scale});
      "></div>`;
      break;
    case "Submarine": // triangle
      shapeHTML = `<div style="
        width: 0;
        height: 0;
        border-left: 10px solid transparent;
        border-right: 10px solid transparent;
        border-bottom: 16px solid ${color};
        transform:scale(${scale});
      "></div>`;
      break;
    default:
      shapeHTML = `<div style="width:16px;height:16px;background:${color};"></div>`;
  }

  return L.divIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;">
      ${shapeHTML}
      <span style="
        color:white;
        font-size:10px;
        -webkit-text-stroke:0.5px black;
        margin-top:2px;
      ">${base.id.toUpperCase()}</span>
    </div>`,
    className: "custom-base-marker",
    iconAnchor: [8, 8],
  });
}
