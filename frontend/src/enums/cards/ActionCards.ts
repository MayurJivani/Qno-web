export namespace ActionCards {
    export enum Light {
        Pauli_X = "Pauli_X",
        Teleportation = "Teleportation"

    }

    export enum Dark {
        Pauli_Y = "Pauli_Y",
        Pauli_Z = "Pauli_Z"
    }

    export enum WildCard {
        Entanglement = "Entanglement", //only on light side
        Superposition = "Superposition", //only on dark side
        Colour_Superposition = "Colour_Superposition",
        Measurement = "Measurement"
    }
}