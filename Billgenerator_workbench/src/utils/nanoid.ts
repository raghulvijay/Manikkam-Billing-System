export const nanoid = (size = 12): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(size)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, size);
