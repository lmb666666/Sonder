import GithubSlugger from 'github-slugger';

const hashSlugger = new GithubSlugger();

const normalizeIdValue = (value: string): string => {
  hashSlugger.reset();
  return hashSlugger.slug(value);
};

const safeDecodeHashPart = (value: string): string => {
  let decoded = value;

  for (let index = 0; index < 2; index += 1) {
    try {
      const nextDecoded = decodeURIComponent(decoded);
      if (nextDecoded === decoded) {
        break;
      }

      decoded = nextDecoded;
    } catch {
      break;
    }
  }

  return decoded;
};

export const normalizeHash = (value: string): string => {
  if (!value) {
    return '';
  }

  const hashIndex = value.indexOf('#');
  const rawHash = hashIndex >= 0 ? value.slice(hashIndex + 1) : value;
  if (!rawHash) {
    return '';
  }

  const decodedValue = safeDecodeHashPart(rawHash.replace(/^#+/, ''));
  const normalizedId = normalizeIdValue(decodedValue);
  return normalizedId ? `#${normalizedId}` : '';
};

export const buildHashIdCandidates = (hash: string): string[] => {
  const normalizedHash = normalizeHash(hash);
  return normalizedHash ? [normalizedHash.slice(1)] : [];
};
