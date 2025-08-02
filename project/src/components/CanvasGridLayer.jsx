import L from 'leaflet';

const CanvasGridLayer = L.Layer.extend({
  onAdd(map) {
    this._map = map;
    this._canvas = L.DomUtil.create('canvas', 'leaflet-canvas-grid');
    const size = this._map.getSize();
    this._canvas.width = size.x;
    this._canvas.height = size.y;

    const pane = this.getPane();
    pane.appendChild(this._canvas);

    this._ctx = this._canvas.getContext('2d');

    // Style for positioning
    this._canvas.style.position = 'absolute';
    this._canvas.style.top = '0';
    this._canvas.style.left = '0';
    this._canvas.style.pointerEvents = 'none'; // make clicks pass through

    // Redraw on movement
    map.on('moveend zoomend resize', this._reset, this);
    this._reset();
  },

  onRemove(map) {
    const pane = this.getPane();
    if (this._canvas && pane.contains(this._canvas)) {
      pane.removeChild(this._canvas);
    }
    map.off('moveend zoomend resize', this._reset, this);
  },

  getPane() {
    return this._map.getPanes().overlayPane;
  },

  _reset() {
    const size = this._map.getSize();
    const bounds = this._map.getBounds();
    const ctx = this._ctx;

    this._canvas.width = size.x;
    this._canvas.height = size.y;

    ctx.clearRect(0, 0, size.x, size.y);
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 1;

    // Grid every 1 degree
    const latStep = 1;
    const lngStep = 1;

    const startLat = Math.floor(bounds.getSouth());
    const endLat = Math.ceil(bounds.getNorth());
    const startLng = Math.floor(bounds.getWest());
    const endLng = Math.ceil(bounds.getEast());

    for (let lng = startLng; lng <= endLng; lng += lngStep) {
      const top = this._map.latLngToContainerPoint([endLat, lng]);
      const bottom = this._map.latLngToContainerPoint([startLat, lng]);
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(bottom.x, bottom.y);
      ctx.stroke();
    }

    for (let lat = startLat; lat <= endLat; lat += latStep) {
      const left = this._map.latLngToContainerPoint([lat, startLng]);
      const right = this._map.latLngToContainerPoint([lat, endLng]);
      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.lineTo(right.x, right.y);
      ctx.stroke();
    }
  }
});

export default function createCanvasGridLayer() {
  return new CanvasGridLayer();
}
