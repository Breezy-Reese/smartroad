import { axiosInstance } from './axiosInstance';
import { Coordinates, LocationData, DriverLocation, Route } from '../../types/location.types';

class LocationService {
  private baseUrl = '/locations';

  async updateLocation(data: DriverLocation): Promise<void> {
    await axiosInstance.post(`${this.baseUrl}/update`, data);
  }

  async getDriverLocation(driverId: string): Promise<DriverLocation> {
    const response = await axiosInstance.get<DriverLocation>(`${this.baseUrl}/driver/${driverId}`);
    return response.data;
  }

  async getDriverHistory(driverId: string, params?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<LocationData[]> {
    const response = await axiosInstance.get<LocationData[]>(`${this.baseUrl}/history/${driverId}`, {
      params,
    });
    return response.data;
  }

  async getNearbyDrivers(location: Coordinates, radius: number = 5): Promise<DriverLocation[]> {
    const response = await axiosInstance.get<DriverLocation[]>(`${this.baseUrl}/nearby`, {
      params: {
        lat: location.lat,
        lng: location.lng,
        radius,
      },
    });
    return response.data;
  }

  async createRoute(data: Partial<Route>): Promise<Route> {
    const response = await axiosInstance.post<Route>(`${this.baseUrl}/routes`, data);
    return response.data;
  }

  async getRoute(routeId: string): Promise<Route> {
    const response = await axiosInstance.get<Route>(`${this.baseUrl}/routes/${routeId}`);
    return response.data;
  }

  async updateRoute(routeId: string, data: Partial<Route>): Promise<Route> {
    const response = await axiosInstance.put<Route>(`${this.baseUrl}/routes/${routeId}`, data);
    return response.data;
  }

  async calculateDistance(origin: Coordinates, destination: Coordinates): Promise<{
    distance: number;
    duration: number;
  }> {
    const response = await axiosInstance.post(`${this.baseUrl}/distance`, {
      origin,
      destination,
    });
    return response.data;
  }

  async geocodeAddress(address: string): Promise<Coordinates> {
    const response = await axiosInstance.get<Coordinates>(`${this.baseUrl}/geocode`, {
      params: { address },
    });
    return response.data;
  }

  async reverseGeocode(location: Coordinates): Promise<string> {
    const response = await axiosInstance.get<string>(`${this.baseUrl}/reverse-geocode`, {
      params: location,
    });
    return response.data;
  }
}

export const locationService = new LocationService();