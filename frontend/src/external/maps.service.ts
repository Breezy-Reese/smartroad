import { Coordinates } from '../../types/location.types';

interface MapOptions {
  center: Coordinates;
  zoom: number;
  markers?: Array<{
    position: Coordinates;
    title?: string;
    icon?: string;
  }>;
}

interface DirectionsOptions {
  origin: Coordinates;
  destination: Coordinates;
  waypoints?: Coordinates[];
  travelMode?: 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT';
}

interface DistanceMatrixResult {
  distance: number;
  duration: number;
  origin: string;
  destination: string;
}

class MapsService {
  private google: typeof google | null = null;
  private map: google.maps.Map | null = null;
  private directionsService: google.maps.DirectionsService | null = null;
  private directionsRenderer: google.maps.DirectionsRenderer | null = null;
  private geocoder: google.maps.Geocoder | null = null;

  constructor(private apiKey: string) {}

  async loadGoogleMaps(): Promise<void> {
    if (this.google) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        this.google = window.google;
        this.directionsService = new google.maps.DirectionsService();
        this.directionsRenderer = new google.maps.DirectionsRenderer();
        this.geocoder = new google.maps.Geocoder();
        resolve();
      };
      
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  initMap(element: HTMLElement, options: MapOptions): google.maps.Map {
    if (!this.google) throw new Error('Google Maps not loaded');

    this.map = new this.google.maps.Map(element, {
      center: options.center,
      zoom: options.zoom,
      mapTypeId: this.google.maps.MapTypeId.ROADMAP,
      mapTypeControl: true,
      fullscreenControl: true,
      streetViewControl: true,
      zoomControl: true,
    });

    if (options.markers) {
      options.markers.forEach((marker) => {
        new this.google!.maps.Marker({
          position: marker.position,
          map: this.map,
          title: marker.title,
          icon: marker.icon,
        });
      });
    }

    return this.map;
  }

  async getDirections(options: DirectionsOptions): Promise<google.maps.DirectionsResult> {
    if (!this.directionsService) throw new Error('Directions service not initialized');

    const request: google.maps.DirectionsRequest = {
      origin: options.origin,
      destination: options.destination,
      travelMode: options.travelMode || google.maps.TravelMode.DRIVING,
      optimizeWaypoints: true,
    };

    if (options.waypoints) {
      request.waypoints = options.waypoints.map((wp) => ({
        location: wp,
        stopover: true,
      }));
    }

    return new Promise((resolve, reject) => {
      this.directionsService!.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
          resolve(result);
        } else {
          reject(new Error(`Directions request failed: ${status}`));
        }
      });
    });
  }

  displayDirections(result: google.maps.DirectionsResult): void {
    if (!this.directionsRenderer || !this.map) return;
    
    this.directionsRenderer.setMap(this.map);
    this.directionsRenderer.setDirections(result);
  }

  async geocode(address: string): Promise<Coordinates> {
    if (!this.geocoder) throw new Error('Geocoder not initialized');

    return new Promise((resolve, reject) => {
      this.geocoder!.geocode({ address }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
          const location = results[0].geometry.location;
          resolve({
            lat: location.lat(),
            lng: location.lng(),
          });
        } else {
          reject(new Error(`Geocoding failed: ${status}`));
        }
      });
    });
  }

  async reverseGeocode(location: Coordinates): Promise<string> {
    if (!this.geocoder) throw new Error('Geocoder not initialized');

    return new Promise((resolve, reject) => {
      this.geocoder!.geocode({ location }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
          resolve(results[0].formatted_address);
        } else {
          reject(new Error(`Reverse geocoding failed: ${status}`));
        }
      });
    });
  }

  async getDistanceMatrix(
    origins: Coordinates[],
    destinations: Coordinates[]
  ): Promise<DistanceMatrixResult[]> {
    if (!this.directionsService) throw new Error('Directions service not initialized');

    const service = new google.maps.DistanceMatrixService();
    
    return new Promise((resolve, reject) => {
      service.getDistanceMatrix(
        {
          origins: origins.map(o => new google.maps.LatLng(o.lat, o.lng)),
          destinations: destinations.map(d => new google.maps.LatLng(d.lat, d.lng)),
          travelMode: google.maps.TravelMode.DRIVING,
          unitSystem: google.maps.UnitSystem.METRIC,
        },
        (response, status) => {
          if (status === google.maps.DistanceMatrixStatus.OK && response) {
            const results: DistanceMatrixResult[] = [];
            
            response.rows.forEach((row, i) => {
              row.elements.forEach((element, j) => {
                if (element.status === 'OK') {
                  results.push({
                    distance: element.distance.value / 1000, // Convert to km
                    duration: element.duration.value / 60, // Convert to minutes
                    origin: response.originAddresses[i],
                    destination: response.destinationAddresses[j],
                  });
                }
              });
            });
            
            resolve(results);
          } else {
            reject(new Error(`Distance matrix request failed: ${status}`));
          }
        }
      );
    });
  }

  calculateETA(origin: Coordinates, destination: Coordinates, speed: number = 50): number {
    const distance = this.calculateDistance(origin, destination);
    return (distance / speed) * 60; // Return ETA in minutes
  }

  calculateDistance(point1: Coordinates, point2: Coordinates): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLon = this.toRad(point2.lng - point1.lng);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(point1.lat)) * Math.cos(this.toRad(point2.lat)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * Math.PI / 180;
  }

  getBoundsFromPoints(points: Coordinates[]): google.maps.LatLngBounds | null {
    if (!this.google || points.length === 0) return null;

    const bounds = new this.google.maps.LatLngBounds();
    points.forEach(point => bounds.extend(point));
    return bounds;
  }

  fitMapToBounds(bounds: google.maps.LatLngBounds): void {
    if (this.map && bounds) {
      this.map.fitBounds(bounds);
    }
  }
}

export const mapsService = new MapsService(process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '');