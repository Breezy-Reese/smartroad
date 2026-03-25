import { useState, useCallback, useEffect } from "react";
import { useSocket } from "./useSocket";
import { useLocation } from "./useLocation";
import { useAuth } from "./useAuth";
import { emergencyService } from "../services/api/emergency.service";
import { notificationService } from "../services/api/notification.service";
import {
  Incident,
  CreateIncidentDto,
  EmergencyAlert,
  IncidentType,
} from "../types/emergency.types";
import { Coordinates } from "../types/location.types";
import { toast } from "react-hot-toast";

interface UseEmergencyReturn {
  isEmergencyActive: boolean;
  currentIncident: Incident | null;
  incidents: Incident[];
  triggerEmergency: (type?: string) => Promise<void>;
  cancelEmergency: () => Promise<void>;
  checkAccident: (data: AccidentDetectionData) => Promise<boolean>;
  loading: boolean;
  error: string | null;
  nearbyHospitals: any[];
  estimatedResponseTime: number | null;
}

interface AccidentDetectionData {
  speed: number;
  acceleration: { x: number; y: number; z: number };
  impactForce?: number;
  airbagDeployed?: boolean;
  location: Coordinates;
}

export const useEmergency = (): UseEmergencyReturn => {
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [currentIncident, setCurrentIncident] = useState<Incident | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nearbyHospitals, setNearbyHospitals] = useState<any[]>([]);
  const [estimatedResponseTime, setEstimatedResponseTime] = useState<number | null>(null);

  const { socket, connected, emit, on, off } = useSocket();
  const { location, getCurrentLocation } = useLocation();
  const { user } = useAuth();

  const convertCoordinates = (coords: Coordinates) => ({
    latitude: coords.lat,
    longitude: coords.lng,
  });

  const playEmergencySound = () => {
    const audio = new Audio("/sounds/emergency-alarm.mp3");
    audio.loop = true;
    audio.play().catch(() => {});
    (window as any).emergencyAudio = audio;
  };

  const stopEmergencySound = () => {
    const audio = (window as any).emergencyAudio;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  };

  /* ── Try to get location — never throws, never blocks ── */
  const tryGetLocation = async (): Promise<Coordinates | null> => {
    try {
      if (location) return location;
      return await Promise.race<Coordinates | null>([
        getCurrentLocation(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000)),
      ]);
    } catch {
      return null;
    }
  };

  /* ── Helper to safely trigger escalation ── */
  const safelyTriggerEscalation = useCallback(
    async (incident: Incident | null, context: string): Promise<boolean> => {
      if (!incident || !incident._id) {
        console.error(`❌ Cannot trigger escalation (${context}): incident or incident._id is missing`, {
          incident,
          hasIncident: !!incident,
          hasId: !!incident?._id,
        });
        return false;
      }

      try {
        console.log(`✅ Triggering escalation (${context}) for incident:`, incident._id);
        await notificationService.triggerEscalation(incident._id);
        return true;
      } catch (error) {
        console.error(`Escalation trigger failed (${context}):`, error);
        return false;
      }
    },
    []
  );

  /* ── Socket events ── */
  useEffect(() => {
    if (!socket || !connected) return;

    const handleNewIncident = (incident: Incident) => {
      if (incident.driverId === user?._id) {
        setCurrentIncident(incident);
        setIsEmergencyActive(true);
        playEmergencySound();
        toast.error("🚨 Accident Detected! Emergency services notified.", { duration: 10000 });
      }
    };

    const handleIncidentUpdate = (incident: Incident) => {
      if (incident.driverId === user?._id) {
        setCurrentIncident(incident);
        if (incident.status === "resolved" || incident.status === "closed") {
          setIsEmergencyActive(false);
          stopEmergencySound();
          if (incident.status === "resolved") toast.success("Emergency resolved. Stay safe!");
        }
      }
    };

    const handleResponderAccepted = (data: { incidentId: string; responder: any }) => {
      if (data.incidentId === currentIncident?._id) {
        toast.success(`🚑 ${data.responder.name} is en route. ETA ${data.responder.eta} min`);
        setEstimatedResponseTime(data.responder.eta);
      }
    };

    const handleEmergencyAlert = (alert: EmergencyAlert) => {
      if (user?.role === "hospital") {
        toast.error(`🚨 New emergency from ${alert.driverName ?? "driver"}`);
      }
    };

    on("new-incident", handleNewIncident);
    on("incident-update", handleIncidentUpdate);
    on("responder-accepted", handleResponderAccepted);
    on("emergency-alert", handleEmergencyAlert);

    return () => {
      off("new-incident", handleNewIncident);
      off("incident-update", handleIncidentUpdate);
      off("responder-accepted", handleResponderAccepted);
      off("emergency-alert", handleEmergencyAlert);
    };
  }, [socket, connected, user, currentIncident]);

  /* ── Fetch user incidents on mount ── */
  useEffect(() => {
    const fetchIncidents = async () => {
      if (!user) return;
      try {
        const data = await emergencyService.getUserIncidents(user._id);
        setIncidents(data);
      } catch (err) {
        console.error("Failed to fetch incidents:", err);
      }
    };
    fetchIncidents();
  }, [user]);

  /* ── Accident auto-detection ── */
  const checkAccident = useCallback(
    async (data: AccidentDetectionData): Promise<boolean> => {
      const { acceleration, impactForce, airbagDeployed, location } = data;

      let isAccident = false;
      let severity: "low" | "medium" | "high" | "critical" = "low";
      let confidence = 0;

      const totalAcceleration = Math.sqrt(
        acceleration.x ** 2 + acceleration.y ** 2 + acceleration.z ** 2
      );

      if (impactForce && impactForce > 4) {
        isAccident = true;
        severity = "high";
        confidence += 0.4;
      }
      if (airbagDeployed) {
        isAccident = true;
        severity = "critical";
        confidence += 0.5;
      }
      if (totalAcceleration > 12) {
        isAccident = true;
        severity = "high";
        confidence += 0.3;
      }

      if (isAccident && confidence > 0.5 && user) {
        const incidentData: CreateIncidentDto = {
          title: "Accident detected",
          description: "Automatic crash detection triggered",
          type: "accident" as IncidentType,
          severity,
          location: convertCoordinates(location),
        };

        try {
          const incident = await emergencyService.createEmergency(incidentData);
          setCurrentIncident(incident);
          setIsEmergencyActive(true);

          // ✅ Safely trigger escalation with validation
          await safelyTriggerEscalation(incident, "accident-detection");

          if (connected) {
            emit("panic-button", {
              driverId: user._id,
              location,
              timestamp: new Date(),
            });
          }

          const hospitals = await emergencyService.getNearbyHospitals(location);
          setNearbyHospitals(hospitals);

          toast.error("🚨 Accident detected! Emergency services notified.");
        } catch (err) {
          console.error("Accident detection error:", err);
          toast.error("Failed to process accident detection");
        }
      }

      return isAccident;
    },
    [user, connected, emit, safelyTriggerEscalation]
  );

  /* ── Panic button — fire immediately, location attached async ── */
  const triggerEmergency = useCallback(
    async (type: string = "panic"): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        // Create incident immediately — location is optional
        const incidentData: CreateIncidentDto = {
          title: "Emergency panic alert",
          description: "Driver triggered emergency panic button",
          type: (type === "panic" ? "other" : "accident") as IncidentType,
          severity: "critical",
        };

        const incident = await emergencyService.createEmergency(incidentData);

        setCurrentIncident(incident);
        setIsEmergencyActive(true);
        playEmergencySound();

        // ✅ Safely trigger escalation with validation
        await safelyTriggerEscalation(incident, "panic-button");

        // Emit socket event with best available location (may be null)
        if (connected) {
          emit("panic-button", {
            driverId: user!._id,
            location: location ?? null,
            timestamp: new Date(),
          });
        }

        // Confirm success to the driver immediately
        toast.success("🚨 Emergency services notified!");

        // Get location in the background — never blocks the trigger above
        tryGetLocation().then(async (coords) => {
          if (!coords) {
            toast("📍 Location unavailable — incident logged without coordinates.", {
              icon: "⚠️",
              duration: 5000,
            });
            return;
          }

          // Patch the incident with location once we have it
          try {
            await emergencyService.updateIncidentLocation(
              incident._id,
              convertCoordinates(coords)
            );
          } catch (e) {
            console.error("Failed to patch incident location:", e);
          }

          // Update socket with confirmed location
          if (connected) {
            emit("location-update", { incidentId: incident._id, location: coords });
          }

          // Now fetch nearby hospitals
          try {
            const hospitals = await emergencyService.getNearbyHospitals(coords);
            setNearbyHospitals(hospitals);
          } catch (e) {
            console.error("Failed to fetch nearby hospitals:", e);
          }
        });
      } catch (err: any) {
        console.error("Emergency trigger error:", err);
        setError(err.message);
        toast.error("Failed to trigger emergency — please call emergency services directly.");
      } finally {
        setLoading(false);
      }
    },
    [user, location, getCurrentLocation, connected, emit, safelyTriggerEscalation]
  );

  /* ── Cancel emergency ── */
  const cancelEmergency = useCallback(async (): Promise<void> => {
    if (!currentIncident) {
      console.warn("Cannot cancel emergency: no active incident");
      return;
    }

    setLoading(true);

    try {
      await emergencyService.cancelEmergency(currentIncident._id);

      // Safely resolve escalation
      try {
        console.log(`✅ Resolving escalation for incident:`, currentIncident._id);
        await notificationService.resolveEscalation(currentIncident._id);
      } catch (e) {
        console.error("Escalation resolve failed:", e);
      }

      setIsEmergencyActive(false);
      setCurrentIncident(null);
      stopEmergencySound();
      toast.success("Emergency cancelled");
    } catch (err: any) {
      console.error("Cancel emergency error:", err);
      setError(err.message);
      toast.error("Failed to cancel emergency");
    } finally {
      setLoading(false);
    }
  }, [currentIncident]);

  return {
    isEmergencyActive,
    currentIncident,
    incidents,
    triggerEmergency,
    cancelEmergency,
    checkAccident,
    loading,
    error,
    nearbyHospitals,
    estimatedResponseTime,
  };
};