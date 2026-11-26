(function () {
  'use strict';
  const m = globalThis.Motores;
  m.buildWorkbook = (records, ExcelJS = globalThis.ExcelJS) => {
    if (!ExcelJS || !records.length)
      throw new Error('Cadastre um motor e confira a biblioteca ExcelJS.');
    if (
      records.some(
        (record) =>
          !record.values.marcaMotor.trim() ||
          !record.values.modeloMotor.trim() ||
          m.issues(record, false).length,
      )
    )
      throw new Error('Preencha marca e modelo e corrija os formatos antes de exportar.');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FIRST S.A. — Levantamento Técnico de Motores';
    const identity = (record) => [
      record.uid,
      record.values.idReferencia || '',
      record.values.marcaMotor,
      record.values.modeloMotor,
    ];
    const identityHeaders = ['Identificador do motor', 'ID / referência', 'Marca', 'Modelo'];
    const addSheet = (name, headers, rows) => {
      const sheet = workbook.addWorksheet(name, {
        views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }],
      });
      sheet.columns = headers.map((label) => ({
        header: label,
        width: label.length > 40 ? 42 : 26,
        style: {
          font: { name: 'Calibri', size: 11 },
          alignment: { wrapText: true, vertical: 'top' },
          numFmt: '@',
        },
      }));
      for (const values of rows) {
        const row = sheet.addRow(values);
        row.height = 48;
        row.eachCell({ includeEmpty: true }, (cell) => {
          if (typeof cell.value === 'number') cell.numFmt = '0.####';
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: row.number % 2 ? 'FFFFFFFF' : 'FFF1F6FA' },
          };
        });
      }
      const head = sheet.getRow(1);
      head.height = 90;
      head.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D2D45' } };
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      });
      sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
      return sheet;
    };
    for (const record of records) m.calculate(record);
    for (const [tab, name] of [
      ['cadastro', 'Motores'],
      ['emissao', 'Pré-emissão'],
    ]) {
      const fields = m.fields.filter(
        (f) =>
          m.sectionByKey[f.section].tab === tab &&
          !['idReferencia', 'marcaMotor', 'modeloMotor'].includes(f.key),
      );
      addSheet(
        name,
        [...identityHeaders, ...fields.map((f) => `${f.label}${f.unit ? ` (${f.unit})` : ''}`)],
        records.map((record) => [
          ...identity(record),
          ...fields.map((f) => {
            if (!m.applicable(f, record)) return null;
            if (f.type === 'pdf')
              return record.anexos[f.key] ? m.filePath(record, f, record.anexos[f.key]) : null;
            const value = String(record.values[f.key] ?? '').trim();
            if (!value) return null;
            if (['number', 'calculated'].includes(f.type) && !m.fieldError(f, record, false))
              return m.numeric(value);
            if (f.type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value))
              return value.split('-').reverse().join('/');
            return value;
          }),
        ]),
      );
    }
    for (const [key, collection] of Object.entries(m.collections))
      addSheet(
        collection.title,
        [...identityHeaders, ...collection.fields.map(([, label]) => label)],
        records.flatMap((record) =>
          record[key].map((row) => [
            ...identity(record),
            ...collection.fields.map(([name, , type]) =>
              type === 'integer' && /^\d{1,2}$/.test(row[name]) ? Number(row[name]) : row[name],
            ),
          ]),
        ),
      );
    addSheet(
      'Anexos',
      [
        ...identityHeaders,
        'Seção',
        'Documento',
        'Nome do PDF',
        'Tamanho (bytes)',
        'Caminho no ZIP',
      ],
      records.flatMap((record) =>
        m.fields
          .filter((f) => f.type === 'pdf' && m.applicable(f, record) && record.anexos[f.key])
          .map((f) => {
            const file = record.anexos[f.key];
            return [
              ...identity(record),
              m.sectionByKey[f.section].title,
              f.label,
              file.name,
              file.size,
              m.filePath(record, f, file),
            ];
          }),
      ),
    );
    addSheet(
      'Pendências',
      [...identityHeaders, 'Seção', 'Campo', 'Pendência'],
      records.flatMap((record) =>
        m
          .issues(record)
          .map((issue) => [
            ...identity(record),
            m.sectionByKey[issue.section].title,
            issue.label,
            issue.message,
          ]),
      ),
    );
    return workbook;
  };
  m.exportExcel = async (records) => {
    const workbook = m.buildWorkbook(records);
    const buffer = await workbook.xlsx.writeBuffer();
    globalThis.Veiculos.downloadBlob(
      new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      `levantamento_tecnico_motores_${new Date().toLocaleDateString('sv-SE')}.xlsx`,
    );
  };
  m.exportAttachments = async (records) => {
    const entries = [];
    for (const record of records)
      for (const field of m.fields.filter((f) => f.type === 'pdf' && m.applicable(f, record))) {
        const metadata = record.anexos[field.key];
        if (!metadata) continue;
        const blob = await m.files.get(metadata.id);
        if (!blob)
          throw new Error(
            `O PDF ${metadata.name} não foi encontrado. Anexe novamente antes de baixar o ZIP.`,
          );
        entries.push({ name: m.filePath(record, field, metadata), blob });
      }
    if (!entries.length) throw new Error('Ainda não há PDFs aplicáveis para baixar.');
    globalThis.Veiculos.downloadBlob(await m.zip(entries), 'anexos_motores.zip');
  };
})();
