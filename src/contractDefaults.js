export const getContractOptionDefaults = (quoteData = {}) => {
  const hasAudio = Number(quoteData.numImpianti || 0) > 0;

  return {
    includAudio: hasAudio,
    escludiAudio: !hasAudio,
    includLuci: false,
    escludiLuci: false,
    includViaggio: Number(quoteData.distanzaKm || 0) > 0,
    escludiViaggio: false,
    includAlloggio: Boolean(quoteData.usaPernottamento),
    escludiAlloggio: false,
    includVitto: false,
    escludiVitto: true,
  };
};
