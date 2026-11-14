import { createContext, useContext, useState } from 'react';

type Plant = {
    id: number;
    name: string;
    moisture: number;
    temperature: number;
    health: string;
};

type PlantContextType = {
    plants: Plant[];
    setPlants: React.Dispatch<React.SetStateAction<Plant[]>>;
};

const PlantContext = createContext<PlantContextType | undefined>(undefined);

export function PlantProvider({ children }: { children: React.ReactNode }) {

    const [plants, setPlants] = useState<Plant[]>([
        {
            id: 1,
            name: "Monstera",
            moisture: 20,
            temperature: 24,
            health: "unhealthy"
        },
        {
            id: 2,
            name: "Snake Plant",
            moisture: 55,
            temperature: 22,
            health: "healthy"
        },
        {
            id: 3,
            name: "Peace Lily",
            moisture: 23,
            temperature: 50,
            health: "unhealthy"
        }
    ]);

    return (
        <PlantContext.Provider value={{ plants, setPlants }}>
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