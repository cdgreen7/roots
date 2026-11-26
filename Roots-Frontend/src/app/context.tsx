import { createContext, useContext, useState, useCallback } from 'react';
import { apiRequest } from '../api/client';

export type Plant = {
    id: string;
    owner_id: string;
    name: string;
    device_id: string | null;
    online: boolean;
    has_actuators: boolean;
    last_seen_at: string | null;
    created_at: string;
    health: 'healthy' | 'unhealthy';
};

type PlantContextType = {
    plants: Plant[];
    setPlants: React.Dispatch<React.SetStateAction<Plant[]>>;
    loading: boolean;
    error: string | null;
    loadPlants: (quiet?: boolean) => Promise<void>;
};

const PlantContext = createContext<PlantContextType | undefined>(undefined);

export function PlantProvider({ children }: { children: React.ReactNode }) {

    const [plants, setPlants] = useState<Plant[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // loadPlants fetches the user's plants (quiet just ensures backround refresh, so no loading spinner)
    // failed refresh keeps showing the last plants instead of an error screen.
    const loadPlants = useCallback(async (quiet = false) => {
        if (!quiet) {
            setLoading(true);
            setError(null);
        }
        try {
            setPlants(await apiRequest<Plant[]>('/plants'));
        } catch (err) {
            if (!quiet) setError(err instanceof Error ? err.message : 'Failed to retrieve plants');
        } finally {
            if (!quiet) setLoading(false);
        }
    }, []);

    return (
        <PlantContext.Provider
            value={{
                plants,
                setPlants,
                loading,
                error,
                loadPlants
            }}
        >
            {children}
        </PlantContext.Provider>
    );
}

export function usePlants() {
    const context = useContext(PlantContext);

    if (!context) {
        throw new Error('usePlants must be used inside PlantProvider');
    }

    return context;
}