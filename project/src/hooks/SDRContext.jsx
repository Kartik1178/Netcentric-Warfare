import { createContext, useContext, useState } from "react";

const SDRContext = createContext();

export function SDRProvider({ children, availableFrequencies = ["2GHz", "2.5GHz", "3GHz"] }) {
  const [jammerReports, setJammerReports] = useState({});
  const [currentFrequency, setCurrentFrequency] = useState(availableFrequencies[0]);

  return (
    <SDRContext.Provider value={{
      jammerReports,
      setJammerReports,
      currentFrequency,
      setCurrentFrequency,
      availableFrequencies
    }}>
      {children}
    </SDRContext.Provider>
  );
}

export function useSDR() {
  return useContext(SDRContext);
}
