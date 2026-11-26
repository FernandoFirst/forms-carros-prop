(function () {
  'use strict';
  const app = globalThis.Veiculos;
  const p = app.p8;
  p.attachmentEntries = async (vehicles, store) => {
    const entries = [];
    for (const vehicle of vehicles)
      for (const field of p.fields.filter(
        (item) => item.type === 'pdf' && p.applicable(vehicle, item),
      )) {
        const file = vehicle.p8?.attachments[field.key];
        if (!file) continue;
        let blob;
        try {
          blob = await store.get(file.id);
        } catch {
          throw new Error(
            `Não foi possível acessar o PDF: ${vehicle.idReferencia || vehicle.uid} · ${field.label}. Reabra o navegador ou anexe novamente.`,
          );
        }
        if (!blob || blob.size !== file.size)
          throw new Error(
            `PDF não encontrado ou incompleto: ${vehicle.idReferencia || vehicle.uid} · ${field.label}. Anexe-o novamente.`,
          );
        entries.push({ name: p.filePath(vehicle, field, file), blob });
      }
    return entries;
  };
  p.appendSheets = (workbook, vehicles) => {
    const records = vehicles.filter((vehicle) => vehicle.p8);
    if (!records.length) return;
    if (records.some((vehicle) => p.issues(vehicle, false).length))
      throw new Error('Revise os formatos e os itens incompletos na ficha P8 antes de exportar.');
    const sheet = (name, headers, rows) => {
      const table = workbook.addWorksheet(name, {
        views: [{ state: 'frozen', xSplit: 2, ySplit: 1 }],
      });
      table.columns = headers.map((header, index) => ({
        header,
        width: index < 2 ? 28 : 38,
        style: { numFmt: '@', alignment: { wrapText: true, vertical: 'top' } },
      }));
      table.addRows(rows);
      table.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
      table.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D2D45' } };
      });
      table.eachRow((row, index) => {
        row.height = index === 1 ? 36 : 48;
      });
      return table;
    };
    const identity = (vehicle) => [vehicle.uid, vehicle.idReferencia];
    const headers = [
      'UID do veículo',
      'ID/Referência',
      'Etapa',
      'Pergunta',
      'Resposta',
      'Unidade',
      'Origem do valor',
    ];
    for (const [name, area] of [
      ['Dados P8', 'Veículo'],
      ['Pré-ruído', 'Pré-ruído'],
      ['Responsável técnico', 'Documentos'],
    ]) {
      const fields = p.fields.filter(
        (field) =>
          field.type !== 'pdf' && p.steps.find((item) => item.key === field.step).area === area,
      );
      sheet(
        name,
        headers,
        records.flatMap((vehicle) =>
          fields
            .filter((field) => p.applicable(vehicle, field))
            .map((field) => {
              const value = p.value(vehicle, field);
              const response =
                field.type === 'version'
                  ? p.versions(vehicle).find((item) => item.value === value)?.label || ''
                  : value && ['number', 'calculated'].includes(field.type)
                    ? p.numeric(value)
                    : value;
              return [
                ...identity(vehicle),
                p.steps.find((item) => item.key === field.step).title,
                field.label,
                response,
                field.unit || '',
                field.report
                  ? 'Transcrito do relatório técnico'
                  : field.type === 'calculated'
                    ? 'Média aritmética calculada'
                    : 'Preenchimento',
              ];
            }),
        ),
      );
    }
    const names = {
      versoes: 'Versões',
      componentes: 'Componentes',
      resultadoAceleracao: 'Resultados aceleração',
      resultadoVelocidadeConstante: 'Velocidade constante',
    };
    for (const list of p.lists)
      sheet(
        names[list.key],
        [
          'UID do veículo',
          'ID/Referência',
          'UID do item',
          ...list.columns.map((column) => column.label),
        ],
        records.flatMap((vehicle) =>
          (vehicle.p8.lists[list.key] || []).map((row) => [
            ...identity(vehicle),
            row.uid,
            ...list.columns.map((column) =>
              column.type === 'number' ? p.numeric(row[column.key]) : row[column.key],
            ),
          ]),
        ),
      );
    sheet(
      'Anexos P8',
      [
        'UID do veículo',
        'ID/Referência',
        'Documento',
        'Nome do arquivo',
        'Tamanho em bytes',
        'Caminho no ZIP',
      ],
      records.flatMap((vehicle) =>
        p.fields
          .filter(
            (field) =>
              field.type === 'pdf' &&
              p.applicable(vehicle, field) &&
              vehicle.p8.attachments[field.key],
          )
          .map((field) => {
            const file = vehicle.p8.attachments[field.key];
            return [
              ...identity(vehicle),
              field.label,
              file.name,
              file.size,
              p.filePath(vehicle, field, file),
            ];
          }),
      ),
    );
    sheet(
      'Pendências P8',
      ['UID do veículo', 'ID/Referência', 'Etapa', 'Pergunta', 'Pendência'],
      records.flatMap((vehicle) =>
        p
          .issues(vehicle)
          .map((issue) => [
            ...identity(vehicle),
            p.steps.find((item) => item.key === issue.step).title,
            issue.label,
            issue.message,
          ]),
      ),
    );
  };
})();
