import { createContext, useContext, useState, useCallback } from 'react';
import { apiRequest } from '../api/client';

 export type Plant = {
    id: number;
    name: string;
    moisture: number;
    temperature: number;
    health: string;
};

type PlantContextType = {
    plants: Plant[];
    setPlants: React.Dispatch<React.SetStateAction<Plant[]>>;
    loading: boolean;
    error: string | null;
    loadPlants: () => Promise<void>;
};

const PlantContext = createContext<PlantContextType | undefined>(undefined);

export function PlantProvider({ children }: { children: React.ReactNode }) {

    const [plants, setPlants] = useState<Plant[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadPlants = useCallback(async () => {
        try {
            console.log('Fetching plants...');

            setLoading(true);
            setError(null);

            const data = await apiRequest<Plant[]>('/plants');

            console.log('Plants returned:', data);

            setPlants(data);

        } catch (err) {
            console.error('Error fetching plants:', err);

            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to retrieve plants'
            );
        } finally {
            setLoading(false);
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