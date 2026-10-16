const CHROMATIC_SCALE_SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHROMATIC_SCALE_FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const EQUIVALENTS: Record<string, string> = {
  'Db': 'C#',
  'Eb': 'D#',
  'Gb': 'F#',
  'Ab': 'G#',
  'Bb': 'A#',
  'B#': 'C',
  'E#': 'F',
  'Cb': 'B',
  'Fb': 'E'
};

export function transposeNote(note: string, semitones: number): string {
  const normalized = EQUIVALENTS[note] || note;
  let index = CHROMATIC_SCALE_SHARPS.indexOf(normalized);
  if (index === -1) return note;

  let newIndex = (index + semitones) % 12;
  if (newIndex < 0) newIndex += 12;

  return CHROMATIC_SCALE_SHARPS[newIndex];
}

/**
 * Transpose a single chord string (e.g. "G/B", "C#m7", "F#7(9)", "Bb9")
 */
export function transposeChord(chord: string, semitones: number): string {
  if (semitones === 0) return chord;

  // Handle slash chords, e.g. D/F#
  if (chord.includes('/')) {
    const [root, bass] = chord.split('/');
    return `${transposeChord(root, semitones)}/${transposeChord(bass, semitones)}`;
  }

  // Regex to extract root note (A-G with optional # or b) and suffix
  const match = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return chord;

  const root = match[1];
  const suffix = match[2];
  const newRoot = transposeNote(root, semitones);

  return `${newRoot}${suffix}`;
}

/**
 * Identify if a line looks like chords
 */
export function isChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Tokens separated by spaces
  const tokens = trimmed.split(/\s+/);
  if (tokens.length === 0) return false;

  // Chord regex
  const chordRegex = /^[A-G][#b]?(m|maj|min|dim|aug|sus[24]?|[0-9]+|add[0-9]+|\+|M|\/[A-G][#b]?)*$/;

  let chordCount = 0;
  for (const token of tokens) {
    // Strip common punctuation like parenthesis or brackets
    const clean = token.replace(/[\(\)\[\]\{\}]/g, '');
    if (chordRegex.test(clean)) {
      chordCount++;
    }
  }

  // If more than 50% of tokens are valid chords, consider it a chord line
  return chordCount / tokens.length >= 0.5;
}

/**
 * Transpose full chord sheet text
 */
export function transposeChordSheet(text: string, semitones: number): string {
  if (semitones === 0) return text;

  const lines = text.split('\n');
  const chordRegex = /\b([A-G][#b]?(?:m|maj|min|dim|aug|sus[24]?|[0-9]+|add[0-9]+|\+|M)?(?:\/[A-G][#b]?)?)\b/g;

  const transposedLines = lines.map(line => {
    if (isChordLine(line)) {
      return line.replace(chordRegex, (match) => transposeChord(match, semitones));
    }
    return line;
  });

  return transposedLines.join('\n');
}

/**
 * Export song to Holyrics format (.txt / text block)
 */
export function formatForHolyrics(
  title: string,
  artist: string,
  key: string,
  bpm?: number,
  lyricsText: string = ''
): string {
  let output = `[title]\n${title}\n\n`;
  output += `[artist]\n${artist}\n\n`;
  output += `[key]\n${key}\n\n`;
  if (bpm) output += `[bpm]\n${bpm}\n\n`;

  // Clean lines to remove chords if present, or format blocks
  const lines = lyricsText.split('\n');
  const cleanLyricsLines: string[] = [];

  for (const line of lines) {
    if (!isChordLine(line)) {
      cleanLyricsLines.push(line);
    }
  }

  output += `[lyrics]\n${cleanLyricsLines.join('\n').trim()}\n`;

  return output;
}
