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
  properties: { id: string };
  geometry: GeoJSON.MultiPolygon | GeoJSON.Polygon;
};

const features = (polygonData as { features: GeoFeature[] }).features;

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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const scoreById = new Map(ranked.map((r) => [r.neighborhood.id, r.score]));
    const neighborById = new Map(ranked.map((r) => [r.neighborhood.id, r.neighborhood]));

    const enriched = {
      type: 'FeatureCollection' as const,
      features: features
        .map((f) => {
          const id = f.properties.id;
          const score = scoreById.get(id);
          const n = neighborById.get(id);
          if (!n || score === undefined) return null;
          return {
            ...f,
            properties: {
              id,
              score,
              color: scoreColor(score),
              name: n.name,
              slug: n.slug,
              scoreLabel: `${Math.round(score * 100)}%`,
            },
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    };

    const sourceId = 'sh-neighborhoods';
    const fillLayerId = 'sh-fill';
    const lineLayerId = 'sh-line';
    const labelLayerId = 'sh-label';
    const labelSourceId = 'sh-labels';

    if (map.getLayer(labelLayerId)) map.removeLayer(labelLayerId);
    if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
    if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
    if (map.getSource(labelSourceId)) map.removeSource(labelSourceId);

    map.addSource(sourceId, {
      type: 'geojson',
      data: enriched as GeoJSON.FeatureCollection,
    });

    map.addLayer({
      id: fillLayerId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': 0.65,
      },
    });

    map.addLayer({
      id: lineLayerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#ffffff',
        'line-width': 1.4,
      },
    });

    // Top-5 labels at centroid
    const top5Ids = new Set(ranked.slice(0, 5).map((r) => r.neighborhood.id));
    const labelData = {
      type: 'FeatureCollection' as const,
      features: enriched.features
        .filter((f) => top5Ids.has(f.properties.id))
        .map((f) => {
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
          return {
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [sumX/n, sumY/n] },
            properties: f.properties,
          };
        }),
    };
    map.addSource(labelSourceId, { type: 'geojson', data: labelData });
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

    const popup = new Popup({ closeButton: false, closeOnClick: false, offset: 6 });
    const onMove = (e: maplibregl.MapLayerMouseEvent) => {
      if (!e.features?.length) return;
      const props = e.features[0].properties as { name: string; scoreLabel: string };
      map.getCanvas().style.cursor = 'pointer';
      popup
        .setLngLat(e.lngLat)
        .setHTML(`<div style="font-family:var(--font-inter);font-size:12px"><b>${props.name}</b> · ${props.scoreLabel} match</div>`)
        .addTo(map);
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = '';
      popup.remove();
    };
    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      if (!e.features?.length) return;
      const props = e.features[0].properties as { slug: string };
      if (props.slug) router.push(`/n/${props.slug}`);
    };
    map.on('mousemove', fillLayerId, onMove);
    map.on('mouseleave', fillLayerId, onLeave);
    map.on('click', fillLayerId, onClick);
  }, [ready, ranked, router]);

  return (
    <section className="mx-auto max-w-5xl px-6 py-16 border-t border-[var(--color-line)]">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
        Geographic lens
      </p>
      <h2 className="mt-3 font-serif text-3xl sm:text-4xl leading-[1.05]">
        Your matches, mapped
      </h2>
      <p className="mt-4 text-sm text-[var(--color-muted)] max-w-xl leading-relaxed">
        Real geography from OpenStreetMap. The 30 neighborhoods we cover are colored
        by your match score. Hover for the score; click to read the full profile.
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
        <span>top 5 are labeled</span>
      </div>
    </section>
  );
}
