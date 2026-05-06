'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import maplibregl, { Map as MaplibreMap, Popup } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Neighborhood } from '@content/types';
import polygonData from '@content/neighborhood-polygons.json';

type Props = {
  ranked: { neighborhood: Neighborhood; score: number }[];
};

type GeoFeature = {
  type: 'Feature';
  properties: { id: string; name?: string; borough?: string };
  geometry: GeoJSON.MultiPolygon | GeoJSON.Polygon;
};

const features = (polygonData as { features: GeoFeature[] }).features;

// Carto Positron — minimal, light, intentionally pale so overlay data pops.
// Free for non-commercial use; no API key required.
// https://github.com/CartoDB/basemap-styles
const CARTO_STYLE = {
  version: 8 as const,
  sources: {
    'carto-positron': {
      type: 'raster' as const,
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: 'carto-positron',
      type: 'raster' as const,
      source: 'carto-positron',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

function scoreColor(score: number): string {
  // Green-red HSL gradient. 0 → red (hue 0), 1 → green (hue 110).
  const hue = Math.round(score * 110);
  return `hsl(${hue}, 60%, 50%)`;
}

export function NeighborhoodMap({ ranked }: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: CARTO_STYLE as maplibregl.StyleSpecification,
      center: [-73.96, 40.74],
      zoom: 10.4,
      interactive: true,
      attributionControl: { compact: true },
      maxBounds: [
        [-74.35, 40.45],
        [-73.65, 41.0],
      ],
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => setReady(true));
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Build/update overlay layer when ranks change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const scoreById = new Map(ranked.map((r) => [r.neighborhood.id, r.score]));
    const neighborById = new Map(ranked.map((r) => [r.neighborhood.id, r.neighborhood]));

    // Build per-feature properties for paint expressions
    const enriched = {
      type: 'FeatureCollection' as const,
      features: features.map((f) => {
        const id = f.properties.id;
        const isCovered = id !== '_bg_';
        const score = scoreById.get(id);
        const name = neighborById.get(id)?.name ?? f.properties.name ?? '';
        return {
          ...f,
          properties: {
            id,
            isCovered,
            covered: isCovered && score !== undefined,
            score: score ?? -1,
            color: score !== undefined ? scoreColor(score) : '#e8e4d9',
            name,
            slug: neighborById.get(id)?.slug ?? '',
            scoreLabel: score !== undefined ? `${Math.round(score * 100)}%` : '',
          },
        };
      }),
    };

    const sourceId = 'sh-neighborhoods';
    const fillLayerId = 'sh-fill';
    const lineLayerId = 'sh-line';
    const labelLayerId = 'sh-label';

    if (map.getLayer(labelLayerId)) map.removeLayer(labelLayerId);
    if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
    if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    map.addSource(sourceId, {
      type: 'geojson',
      data: enriched as GeoJSON.FeatureCollection,
    });

    // Fill: covered = score color at higher opacity, uncovered = grey
    map.addLayer({
      id: fillLayerId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': [
          'case',
          ['boolean', ['get', 'covered'], false], 0.62,
          0.18,
        ],
      },
    });

    // Outline: stronger for covered
    map.addLayer({
      id: lineLayerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': [
          'case',
          ['boolean', ['get', 'covered'], false], '#ffffff',
          '#a8a298',
        ],
        'line-width': [
          'case',
          ['boolean', ['get', 'covered'], false], 1.4,
          0.5,
        ],
      },
    });

    // Top-5 labels
    const top5Ids = new Set(ranked.slice(0, 5).map((r) => r.neighborhood.id));
    const labelData = {
      type: 'FeatureCollection' as const,
      features: enriched.features
        .filter((f) => top5Ids.has(f.properties.id))
        .map((f) => {
          // Use turf-style centroid: average all coords
          let sumX = 0, sumY = 0, n = 0;
          const rings: number[][][] =
            f.geometry.type === 'Polygon'
              ? f.geometry.coordinates
              : f.geometry.coordinates.flat();
          for (const ring of rings) {
            for (const [lng, lat] of ring) {
              sumX += lng; sumY += lat; n += 1;
            }
          }
          const cx = n ? sumX / n : 0;
          const cy = n ? sumY / n : 0;
          return {
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [cx, cy] },
            properties: f.properties,
          };
        }),
    };

    const labelSourceId = 'sh-labels';
    if (map.getSource(labelSourceId)) {
      (map.getSource(labelSourceId) as maplibregl.GeoJSONSource).setData(labelData);
    } else {
      map.addSource(labelSourceId, { type: 'geojson', data: labelData });
    }
    if (map.getLayer(labelLayerId)) map.removeLayer(labelLayerId);
    map.addLayer({
      id: labelLayerId,
      type: 'symbol',
      source: labelSourceId,
      layout: {
        'text-field': ['format',
          ['get', 'name'], { 'font-scale': 1 },
          '\n', {},
          ['get', 'scoreLabel'], { 'font-scale': 0.85 },
        ],
        'text-size': 12,
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-anchor': 'center',
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#1a1410',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
      },
    });

    // Hover popup
    const popup = new Popup({ closeButton: false, closeOnClick: false, offset: 6 });
    map.on('mousemove', fillLayerId, (e) => {
      if (!e.features?.length) return;
      const f = e.features[0];
      const props = f.properties as { covered: boolean; name: string; scoreLabel: string };
      if (!props.covered) {
        popup.remove();
        return;
      }
      map.getCanvas().style.cursor = 'pointer';
      popup
        .setLngLat(e.lngLat)
        .setHTML(`<div style="font-family:var(--font-inter);font-size:12px"><b>${props.name}</b> · ${props.scoreLabel} match</div>`)
        .addTo(map);
    });
    map.on('mouseleave', fillLayerId, () => {
      map.getCanvas().style.cursor = '';
      popup.remove();
    });

    map.on('click', fillLayerId, (e) => {
      if (!e.features?.length) return;
      const props = e.features[0].properties as { covered: boolean; slug: string };
      if (props.covered && props.slug) {
        router.push(`/n/${props.slug}`);
      }
    });
  }, [ready, ranked, router]);

  // Count NJ neighborhoods (now visible on map)
  return (
    <section className="mx-auto max-w-5xl px-6 py-16 border-t border-[var(--color-line)]">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
        Geographic lens
      </p>
      <h2 className="mt-3 font-serif text-3xl sm:text-4xl leading-[1.05]">
        Your matches, mapped
      </h2>
      <p className="mt-4 text-sm text-[var(--color-muted)] max-w-xl leading-relaxed">
        Real NYC and immediate-NJ geography from OpenStreetMap (via CARTO Positron).
        Colored polygons are neighborhoods we cover, shaded by your match score. Hover
        any neighborhood for the score; click to read its full profile.
      </p>

      <div
        ref={containerRef}
        className="mt-10 rounded-sm border border-[var(--color-line)] overflow-hidden"
        style={{ width: '100%', height: 600 }}
        aria-label="Map of NYC neighborhoods colored by match score"
      />

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-[var(--color-muted)]">
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-3 rounded overflow-hidden border border-[var(--color-line)]"
            style={{ width: 140 }}
          >
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} style={{ background: scoreColor(i / 13), width: 10, height: '100%' }} />
            ))}
          </span>
          <span>weak → strong match</span>
        </div>
        <span aria-hidden>·</span>
        <span className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ background: '#e8e4d9', border: '1px solid #d4cfc0' }}
          />
          <span>NYC neighborhood we don&rsquo;t cover yet</span>
        </span>
      </div>
    </section>
  );
}
