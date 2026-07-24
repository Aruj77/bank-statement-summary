import { useState, useCallback } from "react";
import { autoDetectBank } from "../utils/bankParser";

export const useBankDetector = () => {
  const [detectedBank, setDetectedBank] = useState(null);

  const detectFromText = useCallback((sampleText) => {
    const bank = autoDetectBank(sampleText);
    setDetectedBank(bank);
    return bank;
  }, []);

  return {
    detectedBank,
    detectFromText,
  };
};
