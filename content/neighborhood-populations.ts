// Neighborhood populations for the engine's population prior. Used as a
// multiplicative score nudge so reachability doesn't over-favor low-population
// suburbs and middling-Brooklyn neighborhoods that happen to sit near the
// centroid of the dimension space.
//
// Sources:
// - NYC neighborhoods: NYC Population FactFinder NTA 2020 (aggregate when our
//   neighborhood spans multiple NTAs; manual estimate for sub-NTA splits like
//   BPC, Hudson Yards, SoHo).
// - NJ / Westchester / LI / CT: U.S. Census 2020 Decennial place/village/town
//   totals. Smallest residential-jurisdictional unit preferred when the polygon
//   matches.
//
// Where the polygon is a hand-drawn approximation (BPC, Hudson Yards,
// Boerum Hill, Carroll Gardens, Gowanus), populations are manual estimates
// scaled to the polygon area.
//
// All values rounded; precise to ~5-10%. The prior is small (default w=0.10)
// so order-of-magnitude accuracy is sufficient.

import type { NeighborhoodId } from './types';

export const neighborhoodPopulations: Record<NeighborhoodId, number> = {
  // Manhattan
  'upper-west-side': 210000,
  'upper-east-side': 220000,
  'west-village': 28000,
  'east-village': 40000,
  'tribeca': 25000,
  'fidi': 60000,
  'chelsea': 50000,
  'gramercy': 30000,
  'hells-kitchen': 50000,
  'central-harlem': 110000,
  'lower-east-side': 75000,
  'east-harlem': 120000,
  'hamilton-heights': 50000,
  'washington-heights': 175000,
  'inwood': 45000,
  'morningside-heights': 30000,
  'lincoln-square': 60000,
  'manhattan-valley': 25000,
  'yorkville': 70000,
  'carnegie-hill': 25000,
  'manhattanville': 20000,
  'midtown-east': 40000,
  'stuyvesant-town': 30000,
  'murray-hill': 65000,
  'greenwich-village': 40000,
  'soho': 12000,
  'chinatown': 50000,
  'battery-park-city': 12000,
  'hudson-yards': 6000,
  'roosevelt-island': 12000,
  'nolita-little-italy': 15000,
  'flatiron-nomad': 18000,

  // Brooklyn
  'williamsburg': 120000,
  'park-slope': 70000,
  'brooklyn-heights': 23000,
  'bed-stuy': 150000,
  'dumbo': 6000,
  'cobble-hill': 12000,
  'bushwick': 130000,
  'brighton-beach': 35000,
  'sheepshead-bay': 100000,
  'greenpoint': 35000,
  'bay-ridge': 80000,
  'crown-heights': 145000,
  'prospect-heights': 22000,
  'fort-greene': 28000,
  'clinton-hill': 35000,
  'east-williamsburg': 25000,
  'ditmas-park': 30000,
  'prospect-lefferts-gardens': 35000,
  'windsor-terrace': 18000,
  'boerum-hill': 8000,
  'carroll-gardens': 12000,
  'gowanus': 10000,
  'red-hook': 11000,

  // Queens
  'long-island-city': 70000,
  'astoria': 150000,
  'flushing': 225000,
  'forest-hills': 80000,
  'sunnyside': 50000,
  'woodside': 45000,
  'ridgewood': 65000,
  'rego-park': 55000,
  'kew-gardens': 35000,
  'bayside': 50000,
  'jackson-heights': 110000,
  'elmhurst': 90000,

  // Bronx
  'riverdale': 50000,
  'mott-haven': 60000,
  'belmont': 30000,
  'pelham-bay': 35000,
  'fordham': 65000,
  'norwood': 40000,

  // Staten Island
  'st-george': 12000,
  'stapleton': 25000,
  'tompkinsville': 15000,
  'great-kills': 40000,

  // NJ
  'hoboken': 60419,
  'jersey-city': 292449,
  'fort-lee': 40000,
  'edgewater': 12000,
  'palisades-park': 20000,
  'weehawken-port-imperial': 17000,
  'tenafly': 15000,
  'englewood': 30000,
  'englewood-cliffs': 5500,
  'cresskill': 8500,
  'ridgewood-nj': 25000,
  'paramus': 26000,
  'maplewood': 25000,
  'millburn-short-hills': 20000,
  'montclair': 40000,
  'south-orange': 17000,
  'summit': 22000,
  'westfield': 30000,
  'chatham-nj': 9000,

  // Westchester
  'scarsdale': 18253,
  'bronxville': 6300,
  'larchmont': 6630,
  'rye': 16000,
  'mamaroneck': 32000,
  'pelham': 12000,
  'hastings-on-hudson': 8590,
  'dobbs-ferry': 11500,
  'irvington-ny': 6500,
  'tarrytown': 11900,
  'white-plains': 60000,
  'yonkers-ny': 211000,
  'chappaqua': 1500,

  // Long Island
  'great-neck': 50000,
  'manhasset': 8500,
  'port-washington': 16000,
  'roslyn': 15000,
  'garden-city': 22000,
  'rockville-centre': 25000,
  'long-beach-ny': 35000,

  // CT
  'greenwich': 63518,
  'stamford': 135470,
  'darien': 22000,
  'new-canaan': 20000,
  'westport': 27000,
};
