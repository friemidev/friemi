# Paris / Île-de-France / OpenStreetMap Free Public APIs

This document summarizes free and publicly accessible APIs for:

- Paris events
- Île-de-France open datasets
- OpenStreetMap maps
- Places / POI
- Address search
- Leaflet integrations

Most APIs below are:

- Free
- Public
- Open Data
- No API Key required
- Suitable for commercial usage (check attribution requirements)

---

# 1. Paris OpenData Events API

Official Website:

https://opendata.paris.fr/

API Console:

https://opendata.paris.fr/api-console/explore/v2.1/

---

## Paris Events API

```txt
https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records?limit=20
```

---

## Future Events

```txt
https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records?where=date_start%20%3E%20NOW()&limit=20
```

---

## Search Concert Events

```txt
https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records?q=concert&limit=20
```

---

## Common Fields

```txt
title
lead_text
description
date_start
date_end
cover_url
address_name
address_city
lat_lon
tags
price_type
audience
access_type
```

---

# 2. Île-de-France OpenData API

Official Website:

https://data.iledefrance.fr/

API Console:

https://data.iledefrance.fr/api-console/explore/v2.1/

---

## Get Dataset List

```txt
https://data.iledefrance.fr/api/explore/v2.1/catalog/datasets?limit=20
```

---

## Recently Modified Datasets

```txt
https://data.iledefrance.fr/api/explore/v2.1/catalog/datasets?limit=20&order_by=modified%20desc
```

---

## Dataset Records API

Format:

```txt
https://data.iledefrance.fr/api/explore/v2.1/catalog/datasets/{dataset_id}/records
```

Example:

```txt
https://data.iledefrance.fr/api/explore/v2.1/catalog/datasets/datavisualisations/records?limit=20
```

---

# 3. OpenStreetMap Tile API

Used for Leaflet / OpenLayers / React-Leaflet map rendering.

Tile URL:

```txt
https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

---

## Leaflet Example

```tsx
<TileLayer
  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
/>
```

---

# 4. Nominatim API (Address Search / Geocoding)

Official Website:

https://nominatim.openstreetmap.org/

---

## Search Address

```txt
https://nominatim.openstreetmap.org/search?q=Paris&format=jsonv2
```

---

## Search Eiffel Tower

```txt
https://nominatim.openstreetmap.org/search?q=Eiffel+Tower+Paris&format=jsonv2
```

---

## Reverse Geocoding

```txt
https://nominatim.openstreetmap.org/reverse?lat=48.8584&lon=2.2945&format=jsonv2
```

---

# 5. Overpass API (POI / Places / Businesses)

Official Website:

https://overpass-api.de/

Overpass Turbo:

https://overpass-turbo.eu/

---

## Paris Restaurants

```txt
https://overpass-api.de/api/interpreter?data=[out:json];area["name"="Paris"]->.a;node["amenity"="restaurant"](area.a);out;
```

---

## Paris Cafés

```txt
https://overpass-api.de/api/interpreter?data=[out:json];area["name"="Paris"]->.a;node["amenity"="cafe"](area.a);out;
```

---

## Paris Bars

```txt
https://overpass-api.de/api/interpreter?data=[out:json];area["name"="Paris"]->.a;node["amenity"="bar"](area.a);out;
```

---

## Paris Museums

```txt
https://overpass-api.de/api/interpreter?data=[out:json];area["name"="Paris"]->.a;node["tourism"="museum"](area.a);out;
```

---

## Paris Metro Stations

```txt
https://overpass-api.de/api/interpreter?data=[out:json];area["name"="Paris"]->.a;node["railway"="station"](area.a);out;
```

---

# 6. Recommended Architecture

```txt
Leaflet
↓
OSM Tile API

Paris OpenData
↓
Events

Overpass API
↓
POI / Businesses / Venues

Nominatim
↓
Address Search / Geocoding
```

---

# 7. Paris Coordinates

```txt
lat: 48.8566
lng: 2.3522
```

---

# 8. Recommended Next.js Architecture

```txt
Frontend
↓
Next.js API Route
↓
OpenData / OSM APIs
↓
Redis / Neon Cache
```

---

# 9. Recommended Caching

Recommended:

- Redis
- Neon PostgreSQL
- Next.js revalidate

Avoid:

- High-frequency direct calls to official APIs
- Frontend direct access to Overpass/Nominatim

---

# 10. Notes

## Paris OpenData

Most datasets are:

- Free
- OpenData
- No API Key required
- Commercially usable

---

## OpenStreetMap / Overpass / Nominatim

Official services are not designed for heavy production traffic.

Recommended for production:

- Proxy APIs
- Cache responses
- Add rate limiting
- Keep OpenStreetMap attribution

---

# 11. Suggested Future Routes

```txt
/events
/events/free
/events/today
/events/map
/events/chinese
```

---

# 12. Suggested Product Direction

Suitable for:

- Paris Chinese community platforms
- Local event platforms
- Nearby merchant events
- AI event recommendations
- City lifestyle super apps
