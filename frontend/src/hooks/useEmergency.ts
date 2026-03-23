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
  acceleration: {
    x: number;
    y: number;
    z: number;
  };
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

  /* ---------------- SOCKET EVENTS ---------------- */

  useEffect(() => {
    if (!socket || !connected) return;

    const handleNewIncident = (incident: Incident) => {
      if (incident.driverId === user?._id) {
        setCurrentIncident(incident);
        setIsEmergencyActive(true);
        playEmergencySound();

        toast.error("🚨 Accident Detected! Emergency services notified.", {
          duration: 10000,
        });
      }
    };

    const handleIncidentUpdate = (incident: Incident) => {
      if (incident.driverId === user?._id) {
        setCurrentIncident(incident);

        if (incident.status === "resolved" || incident.status === "closed") {
          setIsEmergencyActive(false);
          stopEmergencySound();

          if (incident.status === "resolved") {
            toast.success("Emergency resolved. Stay safe!");
          }
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
        toast.error(
          `🚨 New emergency from ${alert.driverName ?? "driver"}`
        );
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

  /* ---------------- FETCH USER INCIDENTS ---------------- */

  useEffect(() => {
    const fetchIncidents = async () => {
      if (!user) return;

      try {
        const data = await emergencyService.getUserIncidents(user._id);
        setIncidents(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchIncidents();
  }, [user]);

  /* ---------------- ACCIDENT DETECTION ---------------- */

  const checkAccident = useCallback(
    async (data: AccidentDetectionData): Promise<boolean> => {
      const { speed, acceleration, impactForce, airbagDeployed, location } = data;

      let isAccident = false;
      let severity: "low" | "medium" | "high" | "critical" = "low";
      let confidence = 0;

      const totalAcceleration = Math.sqrt(
        acceleration.x ** 2 +
          acceleration.y ** 2 +
          acceleration.z ** 2
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

          // ── Trigger escalation to create delivery receipts ──
          try {
            await notificationService.triggerEscalation(incident._id);
          } catch (escalationErr) {
            console.error("Escalation trigger failed:", escalationErr);
          }

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
          console.error(err);
        }
      }

      return isAccident;
    },
    [user, connected, emit]
  );

  /* ---------------- TRIGGER PANIC BUTTON ---------------- */

  const triggerEmergency = useCallback(
    async (type: string = "panic"): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const currentLocation = location || (await getCurrentLocation());

        if (!currentLocation) throw new Error("Location unavailable");

        const incidentData: CreateIncidentDto = {
          title: "Emergency panic alert",
          description: "Driver triggered emergency panic button",
          type: (type === "panic" ? "other" : "accident") as IncidentType,
          severity: "critical",
          location: convertCoordinates(currentLocation),
        };

        const incident = await emergencyService.createEmergency(incidentData);

        setCurrentIncident(incident);
        setIsEmergencyActive(true);

        // ── Trigger escalation to create delivery receipts ──
        try {
          await notificationService.triggerEscalation(incident._id);
        } catch (escalationErr) {
          console.error("Escalation trigger failed:", escalationErr);
        }

        if (connected) {
          emit("panic-button", {
            driverId: user!._id,
            location: currentLocation,
            timestamp: new Date(),
          });
        }

        playEmergencySound();

        const hospitals = await emergencyService.getNearbyHospitals(currentLocation);
        setNearbyHospitals(hospitals);

        toast.success("Emergency services notified 🚨");
      } catch (err: any) {
        setError(err.message);
        toast.error("Failed to trigger emergency");
      } finally {
        setLoading(false);
      }
    },
    [user, location, getCurrentLocation, connected, emit]
  );

  /* ---------------- CANCEL EMERGENCY ---------------- */

  const cancelEmergency = useCallback(async (): Promise<void> => {
    if (!currentIncident) return;

    setLoading(true);

    try {
      await emergencyService.cancelEmergency(currentIncident._id);

      // ── Resolve escalation to stop further notifications ──
      try {
        await notificationService.resolveEscalation(currentIncident._id);
      } catch (escalationErr) {
        console.error("Escalation resolve failed:", escalationErr);
      }

      setIsEmergencyActive(false);
      setCurrentIncident(null);
      stopEmergencySound();

      toast.success("Emergency cancelled");
    } catch (err: any) {
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
