(function () {
  'use strict';
  const m = globalThis.Motores;
  m.createFileStore = (databaseName) => {
    const memory = new Map();
    let database;
    const open = () => {
      if (!database)
        database = new Promise((resolve, reject) => {
          const request = indexedDB.open(databaseName, 1);
          request.onupgradeneeded = () => request.result.createObjectStore('anexos');
          request.onsuccess = () => {
            request.result.onversionchange = () => request.result.close();
            resolve(request.result);
          };
          request.onerror = () => reject(request.error);
          request.onblocked = () =>
            reject(new Error('Feche outras abas para liberar o armazenamento de anexos.'));
        });
      return database;
    };
    const transaction = async (mode, action) => {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('anexos', mode);
        const request = action(tx.objectStore('anexos'));
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = tx.onabort = () => reject(tx.error || new Error('Falha ao guardar o PDF.'));
      });
    };
    m.checkPdf = async (file) => {
      if (!/\.pdf$/i.test(file.name) || !file.size || file.size > 10 * 1024 * 1024)
        throw new Error('Selecione um PDF de até 10 MB.');
      const bytes = new Uint8Array(await file.slice(0, 5).arrayBuffer());
      if (new TextDecoder().decode(bytes) !== '%PDF-')
        throw new Error('O arquivo não contém um cabeçalho PDF válido.');
    };
    return {
      async put(file) {
        await m.checkPdf(file);
        const metadata = { id: crypto.randomUUID(), name: file.name, size: file.size };
        memory.set(metadata.id, file);
        try {
          await transaction('readwrite', (store) => store.put(file, metadata.id));
          return { metadata, persistent: true };
        } catch (error) {
          console.error('PDF mantido apenas em memória:', error);
          return { metadata, persistent: false };
        }
      },
      async get(id) {
        if (memory.has(id)) return memory.get(id);
        return transaction('readonly', (store) => store.get(id));
      },
      async remove(id) {
        memory.delete(id);
        await transaction('readwrite', (store) => store.delete(id));
      },
    };
  };
  m.files = m.createFileStore('levantamento-tecnico-motores');
  // ZIP sem compressão: preserva os PDFs byte a byte, sem dependência ou serviço externo.
  m.zip = async (entries) => {
    const crcTable = Array.from({ length: 256 }, (_, n) => {
      for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
      return n >>> 0;
    });
    const header = (length) => {
      const bytes = new Uint8Array(length);
      const view = new DataView(bytes.buffer);
      return {
        bytes,
        u16: (at, n) => view.setUint16(at, n, true),
        u32: (at, n) => view.setUint32(at, n, true),
      };
    };
    const local = [],
      central = [];
    let offset = 0,
      directorySize = 0;
    if (entries.length > 65535) throw new Error('Há anexos demais para um único ZIP.');
    for (const entry of entries) {
      const name = new TextEncoder().encode(entry.name);
      const data = new Uint8Array(await entry.blob.arrayBuffer());
      let crc = 0xffffffff;
      for (const byte of data) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
      crc = (crc ^ 0xffffffff) >>> 0;
      if (offset + data.length + name.length + 30 > 0xffffffff)
        throw new Error('O ZIP ultrapassa 4 GB. Baixe os anexos individualmente.');
      const head = header(30);
      head.u32(0, 0x04034b50);
      head.u16(4, 20);
      head.u16(6, 0x800);
      head.u16(12, 33);
      head.u32(14, crc);
      head.u32(18, data.length);
      head.u32(22, data.length);
      head.u16(26, name.length);
      local.push(head.bytes, name, data);
      const item = header(46);
      item.u32(0, 0x02014b50);
      item.u16(4, 20);
      item.u16(6, 20);
      item.u16(8, 0x800);
      item.u16(14, 33);
      item.u32(16, crc);
      item.u32(20, data.length);
      item.u32(24, data.length);
      item.u16(28, name.length);
      item.u32(42, offset);
      central.push(item.bytes, name);
      directorySize += 46 + name.length;
      offset += 30 + name.length + data.length;
    }
    const end = header(22);
    end.u32(0, 0x06054b50);
    end.u16(8, entries.length);
    end.u16(10, entries.length);
    end.u32(12, directorySize);
    end.u32(16, offset);
    return new Blob([...local, ...central, end.bytes], { type: 'application/zip' });
  };
  m.filePath = (record, field, file) =>
    `${record.uid}/${field.key}/${file.name.replace(/[^\p{L}\p{N}._-]/gu, '_')}`;
})();
