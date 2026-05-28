function sanitizeFilename(filename: string) {
  const safeCharacters = new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_.-');
  const normalized = [...filename].reduce((result, character) => {
    const nextCharacter = safeCharacters.has(character) ? character : '-';
    return nextCharacter === '-' && result.endsWith('-') ? result : `${result}${nextCharacter}`;
  }, '');

  return normalized.split('').filter((character, index, characters) => (
    character !== '-' || (index > 0 && index < characters.length - 1)
  )).join('');
}

export function triggerBlobDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = sanitizeFilename(filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
