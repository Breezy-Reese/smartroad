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
    audio.play().catch(() => console.warn("Could not play emergency sound"));
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

  /* ── Helper to safely trigger escalation with comprehensive logging ── */
  const safelyTriggerEscalation = useCallback(
    async (incident: Incident | null, context: string): Promise<boolean> => {
      console.log(`🔍 [${context}] === Starting escalation process ===`);
      
      // Get the ID from either _id or incidentId
      const incidentId = incident?._id || incident?.incidentId;
      
      console.log(`🔍 [${context}] Incident check:`, {
        hasIncident: !!incident,
        hasId: !!incidentId,
        incidentId: incidentId,
        incidentIdType: typeof incidentId,
        incidentIdLength: incidentId?.length,
        mongoId: incident?._id,
        customId: incident?.incidentId,
      });

      if (!incident || !incidentId) {
        console.error(`❌ [${context}] Cannot trigger escalation: incident or incident ID is missing`);
        return false;
      }

      // Ensure we have a clean string ID
      const cleanId = String(incidentId).trim();
      console.log(`✅ [${context}] Clean incident ID prepared:`, {
        original: incidentId,
        cleaned: cleanId,
        isValid: cleanId.length > 0
      });

      if (cleanId.length === 0) {
        console.error(`❌ [${context}] Cannot trigger escalation: cleaned ID is empty`);
        return false;
      }

      try {
        console.log(`📤 [${context}] Calling notificationService.triggerEscalation with ID:`, cleanId);
        const result = await notificationService.triggerEscalation(cleanId);
        console.log(`✅ [${context}] Escalation successful! Result:`, result);
        console.log(`✅ [${context}] Receipts should be created in the database`);
        return true;
      } catch (error) {
        console.error(`❌ [${context}] Escalation trigger failed:`, error);
        return false;
      }
    },
    []
  );

  /* ── Socket events ── */
  useEffect(() => {
    if (!socket || !connected) return;

    const handleNewIncident = (incident: Incident) => {
      console.log("📡 New incident received:", incident);
      const driverId = incident.driverId;
      if (driverId === user?._id || driverId === user?.id) {
        setCurrentIncident(incident);
        setIsEmergencyActive(true);
        playEmergencySound();
        toast.error("🚨 Accident Detected! Emergency services notified.", { duration: 10000 });
      }
    };

    const handleIncidentUpdate = (incident: Incident) => {
      console.log("📡 Incident update received:", incident);
      const driverId = incident.driverId;
      if (driverId === user?._id || driverId === user?.id) {
        setCurrentIncident(incident);
        if (incident.status === "resolved" || incident.status === "closed") {
          setIsEmergencyActive(false);
          stopEmergencySound();
          if (incident.status === "resolved") toast.success("Emergency resolved. Stay safe!");
        }
      }
    };

    const handleResponderAccepted = (data: { incidentId: string; responder: any }) => {
      console.log("📡 Responder accepted:", data);
      const currentId = currentIncident?._id || currentIncident?.incidentId;
      if (data.incidentId === currentId) {
        toast.success(`🚑 ${data.responder.name} is en route. ETA ${data.responder.eta} min`);
        setEstimatedResponseTime(data.responder.eta);
      }
    };

    const handleEmergencyAlert = (alert: EmergencyAlert) => {
      console.log("📡 Emergency alert:", alert);
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
        const userId = user._id || user.id;
        const data = await emergencyService.getUserIncidents(userId);
        setIncidents(data);
        console.log(`📋 Fetched ${data.length} incidents for user`);
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

      console.log("🔍 Accident detection analysis:", {
        isAccident,
        severity,
        confidence,
        totalAcceleration
      });

      if (isAccident && confidence > 0.5 && user) {
        const incidentData: CreateIncidentDto = {
          title: "Accident detected",
          description: "Automatic crash detection triggered",
          type: "accident" as IncidentType,
          severity,
          location: convertCoordinates(location),
        };

        try {
          console.log("🚨 Creating accident incident:", incidentData);
          const incident = await emergencyService.createEmergency(incidentData);
          console.log("✅ Accident incident created:", incident);
          
          setCurrentIncident(incident);
          setIsEmergencyActive(true);

          // ✅ Safely trigger escalation with validation
          await safelyTriggerEscalation(incident, "accident-detection");

          if (connected) {
            emit("panic-button", {
              driverId: user._id || user.id,
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
      console.log("🚨 [triggerEmergency] Starting emergency trigger with type:", type);
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

        console.log("📝 Creating incident with data:", incidentData);
        const incident = await emergencyService.createEmergency(incidentData);
        
        // Get the ID from either _id or incidentId
        const incidentId = incident._id || incident.incidentId;
        
        console.log("📦 Incident created successfully:", {
          id: incidentId,
          mongoId: incident._id,
          customId: incident.incidentId,
          idType: typeof incidentId,
          idLength: incidentId?.length,
          fullIncident: incident
        });

        if (!incident || !incidentId) {
          throw new Error("Incident was created but has no ID");
        }

        setCurrentIncident(incident);
        setIsEmergencyActive(true);
        playEmergencySound();

        // ✅ Safely trigger escalation with validation
        console.log("🚨 About to trigger escalation for incident:", incidentId);
        const escalationResult = await safelyTriggerEscalation(incident, "panic-button");
        console.log("📊 Escalation result:", escalationResult ? "✅ SUCCESS" : "❌ FAILED");

        // Emit socket event with best available location (may be null)
        if (connected) {
          console.log("📡 Emitting panic-button socket event");
          emit("panic-button", {
            driverId: user!._id || user!.id,
            location: location ?? null,
            timestamp: new Date(),
          });
        } else {
          console.warn("⚠️ Socket not connected, skipping socket emit");
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

          console.log("📍 Location obtained for incident:", coords);

          // Patch the incident with location once we have it
          try {
            await emergencyService.updateIncidentLocation(
              incidentId,
              convertCoordinates(coords)
            );
            console.log("✅ Incident location updated");
          } catch (e) {
            console.error("Failed to patch incident location:", e);
          }

          // Update socket with confirmed location
          if (connected) {
            emit("location-update", { incidentId: incidentId, location: coords });
          }

          // Now fetch nearby hospitals
          try {
            const hospitals = await emergencyService.getNearbyHospitals(coords);
            setNearbyHospitals(hospitals);
            console.log(`🏥 Found ${hospitals.length} nearby hospitals`);
          } catch (e) {
            console.error("Failed to fetch nearby hospitals:", e);
          }
        });
      } catch (err: any) {
        console.error("❌ Emergency trigger error:", err);
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

    const incidentId = currentIncident._id || currentIncident.incidentId;
    console.log("🛑 Cancelling emergency for incident:", incidentId);
    setLoading(true);

    try {
      await emergencyService.cancelEmergency(incidentId!);
      console.log("✅ Incident cancelled in backend");

      // Safely resolve escalation
      try {
        console.log(`✅ Resolving escalation for incident:`, incidentId);
        await notificationService.resolveEscalation(incidentId!);
        console.log("✅ Escalation resolved");
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