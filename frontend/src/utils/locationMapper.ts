import { Coordinates } from "../types/location.types";

export const toLocation = (coords: Coordinates) => ({
  latitude: coords.lat,
  longitude: coords.lng,
});