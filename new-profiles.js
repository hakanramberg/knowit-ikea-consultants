/* Date labels and ZIP downloads for the most recently added profiles. */
(function (root) {
  'use strict';
  function todayKey(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const value = type => parts.find(part => part.type === type).value;
    return `${value('year')}-${value('month')}-${value('day')}`;
  }
  function addedDate(person, today = todayKey()) {
    const value = person.addedOn;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value > today) return '';
    const date = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : '';
  }
  function formatDate(value) {
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Stockholm', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00Z`));
  }
  function latestGroup(people, today = todayKey()) {
    const dates = people.map(person => addedDate(person, today)).filter(Boolean).sort();
    const date = dates.at(-1);
    return date ? { date, people: people.filter(person => addedDate(person, today) === date) } : null;
  }
  function badgeLabel(person, today = todayKey()) {
    const date = addedDate(person, today);
    return date ? date === today ? 'Added today' : `Added ${formatDate(date)}` : '';
  }
  const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    return value >>> 0;
  });
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  function createZip(entries) {
    if (!entries.length || entries.length > 65535) throw new Error('Invalid CV count');
    const encoder = new TextEncoder();
    const prepared = entries.map(entry => {
      if (!entry.name || /[\\/\u0000]/.test(entry.name) || !(entry.bytes instanceof Uint8Array)) throw new Error('Invalid CV file');
      const name = encoder.encode(entry.name);
      if (name.length > 65535) throw new Error('CV filename too long');
      return { name, bytes: entry.bytes, crc: crc32(entry.bytes) };
    });
    if (new Set(entries.map(entry => entry.name)).size !== entries.length) throw new Error('Duplicate CV filenames');
    const localSize = prepared.reduce((sum, entry) => sum + 30 + entry.name.length + entry.bytes.length, 0);
    const directorySize = prepared.reduce((sum, entry) => sum + 46 + entry.name.length, 0);
    const size = localSize + directorySize + 22;
    if (size >= 0xffffffff) throw new Error('CV archive too large');
    const zip = new Uint8Array(size);
    const view = new DataView(zip.buffer);
    let offset = 0, directory = localSize;
    for (const entry of prepared) {
      view.setUint32(offset, 0x04034b50, true);
      view.setUint16(offset + 4, 20, true);
      view.setUint16(offset + 6, 0x0800, true); // UTF-8 filenames.
      view.setUint16(offset + 12, 33, true); // 1 January 1980, valid DOS date.
      view.setUint32(offset + 14, entry.crc, true);
      view.setUint32(offset + 18, entry.bytes.length, true);
      view.setUint32(offset + 22, entry.bytes.length, true);
      view.setUint16(offset + 26, entry.name.length, true);
      zip.set(entry.name, offset + 30);
      zip.set(entry.bytes, offset + 30 + entry.name.length);
      view.setUint32(directory, 0x02014b50, true);
      view.setUint16(directory + 4, 20, true);
      view.setUint16(directory + 6, 20, true);
      view.setUint16(directory + 8, 0x0800, true);
      view.setUint16(directory + 14, 33, true);
      view.setUint32(directory + 16, entry.crc, true);
      view.setUint32(directory + 20, entry.bytes.length, true);
      view.setUint32(directory + 24, entry.bytes.length, true);
      view.setUint16(directory + 28, entry.name.length, true);
      view.setUint32(directory + 42, offset, true);
      zip.set(entry.name, directory + 46);
      directory += 46 + entry.name.length;
      offset += 30 + entry.name.length + entry.bytes.length;
    }
    view.setUint32(directory, 0x06054b50, true);
    view.setUint16(directory + 8, entries.length, true);
    view.setUint16(directory + 10, entries.length, true);
    view.setUint32(directory + 12, directorySize, true);
    view.setUint32(directory + 16, localSize, true);
    return zip;
  }
  root.KNOWIT_NEW_PROFILES = { todayKey, addedDate, formatDate, latestGroup, badgeLabel, createZip };
})(window);
