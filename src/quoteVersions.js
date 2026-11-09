export const getQuoteGroupId = (quote) => quote.formData?._quoteGroupId || quote.id;
export const getQuoteVersion = (quote) => Number(quote.formData?._quoteVersion) || 1;

export const getNextQuoteVersion = (quotes, quote) => {
  const groupId = getQuoteGroupId(quote);
  return quotes.reduce((highest, current) => (
    getQuoteGroupId(current) === groupId
      ? Math.max(highest, getQuoteVersion(current))
      : highest
  ), getQuoteVersion(quote)) + 1;
};
