import { useEffect, useRef } from 'react';
import { compactRupees, PIN_COLORS } from '../lib/format';

/**
 * Leaflet map of listings. `pins` = [{ id, lat, lng, status, label, tooltip }].
 * Leaflet is loaded globally from cdnjs (index.html).
 */
export default function MapView({ pins, className = 'h-[360px]', onSelect, zoom = 15, interactive = true }) {
  const el = useRef(null);
  const map = useRef(null);
  const markers = useRef(new Map());
  const fitted = useRef(false);

  useEffect(() => {
    const L = window.L;
    if (!L || map.current) return;
    map.current = L.map(el.current, {
      zoomControl: interactive, scrollWheelZoom: false, dragging: interactive, doubleClickZoom: interactive, touchZoom: interactive, keyboard: interactive, attributionControl: true,
    }).setView([12.972, 77.712], 14);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map.current);
    return () => { map.current?.remove(); map.current = null; markers.current.clear(); fitted.current = false; };
  }, []);

  useEffect(() => {
    const L = window.L;
    if (!L || !map.current) return;
    const seen = new Set();
    for (const p of pins.filter((p) => p.lat != null)) {
      seen.add(p.id);
      // Approximate location: a soft circle for the neighbourhood, no exact pin.
      if (p.radius) {
        if (!markers.current.has(p.id)) {
          const c = L.circle([p.lat, p.lng], { radius: p.radius, color: '#004aad', weight: 1.5, opacity: 0.5, fillColor: '#00c8e0', fillOpacity: 0.18 }).addTo(map.current);
          markers.current.set(p.id, c);
        }
        continue;
      }
      const html = `<div class="pakka-pin pakka-pin--${p.status}"><span class="pakka-pin__dot" style="background:${PIN_COLORS[p.status]}"></span><span class="pakka-pin__label">${p.label}</span></div>`;
      const icon = L.divIcon({ html, className: '', iconSize: [0, 0] });
      const existing = markers.current.get(p.id);
      if (existing) {
        if (existing._html !== html) { existing.setIcon(icon); existing._html = html; }
      } else {
        const m = L.marker([p.lat, p.lng], { icon }).addTo(map.current);
        if (p.tooltip) m.bindTooltip(p.tooltip, { direction: 'top', offset: [0, -12] });
        if (onSelect) m.on('click', () => onSelect(p.id));
        m._html = html;
        markers.current.set(p.id, m);
      }
    }
    for (const [id, m] of markers.current) if (!seen.has(id)) { m.remove(); markers.current.delete(id); }
    if (!fitted.current && markers.current.size) {
      const points = [...markers.current.values()].map((m) => m.getLatLng());
      const circle = [...markers.current.values()].find((m) => m.getRadius);
      if (points.length === 1) map.current.setView(points[0], circle ? Math.min(zoom, 14) : zoom);
      else map.current.fitBounds(L.latLngBounds(points).pad(0.3));
      fitted.current = true;
    }
  }, [pins, onSelect]);

  return <div ref={el} className={`overflow-hidden rounded-lg ${className}`} />;
}

export const pinLabel = (l) => `${l.bhk} BHK · ${compactRupees(l.rent)}`;
