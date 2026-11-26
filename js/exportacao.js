(function () {
  'use strict';
  const app = globalThis.Veiculos;

  app.buildWorkbook = (vehicles, ExcelJS = globalThis.ExcelJS) => {
    if (!ExcelJS)
      throw new Error('A biblioteca ExcelJS não foi carregada. Verifique a pasta vendor.');
    if (!vehicles.length) throw new Error('Cadastre pelo menos um veículo antes de exportar.');
    for (const vehicle of vehicles) {
      if (Object.keys(app.validateVehicle(vehicle)).length)
        throw new Error('Revise os campos obrigatórios e os formatos antes de exportar.');
    }
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Levantamento Técnico de Veículos';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Veículos', {
      views: [{ state: 'frozen', ySplit: 1, xSplit: 1 }],
      properties: { defaultRowHeight: 42 },
      pageSetup: {
        orientation: 'landscape',
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        printTitlesRow: '1:1',
      },
    });
    sheet.columns = app.fieldDefinitions.map((field) => ({
      header: field.label,
      key: field.key,
      width: field.type === 'long' ? 42 : field.label.length > 38 ? 32 : 24,
      style: {
        font: { name: 'Calibri', size: 11, color: { argb: 'FF172F45' } },
        alignment: { vertical: 'top', wrapText: true },
      },
    }));
    const header = sheet.getRow(1);
    header.height = 84;
    header.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF17324D' } };
      cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', wrapText: true };
    });
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: app.fieldDefinitions.length },
    };

    vehicles.forEach((vehicle, index) => {
      const values = app.fieldDefinitions.map((field) => {
        if (!app.isApplicable(field, vehicle)) return null;
        const text = String(vehicle[field.key] ?? '').trim();
        if (!text) return null;
        if (field.type === 'decimal' || field.type === 'integer') return app.parseDecimal(text);
        // ExcelJS escreve strings como texto, inclusive quando começam com =, +, - ou @.
        // Nunca criar objetos { formula } com conteúdo fornecido pelo usuário.
        return text;
      });
      const row = sheet.addRow(values);
      const estimatedLines = Math.max(
        ...values.map((value, i) => {
          const text = String(value ?? '');
          return text
            .split('\n')
            .reduce(
              (lines, part) => lines + Math.max(1, Math.ceil(part.length / sheet.columns[i].width)),
              0,
            );
        }),
      );
      row.height = Math.min(409, Math.max(42, estimatedLines * 16));
      row.eachCell({ includeEmpty: true }, (cell, column) => {
        const field = app.fieldDefinitions[column - 1];
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: index % 2 === 0 ? 'FFF1F6FA' : 'FFFFFFFF' },
        };
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFDDE5ED' } } };
        cell.numFmt = field.type === 'decimal' ? '0.00' : field.type === 'integer' ? '0' : '@';
        if (field.type === 'boolean') {
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: ['"Sim,Não"'],
            showErrorMessage: true,
            errorTitle: 'Resposta inválida',
            error: 'Escolha Sim ou Não.',
          };
        }
      });
    });
    app.p8?.appendSheets?.(workbook, vehicles);
    return workbook;
  };

  app.downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  app.exportVehicles = async (vehicles) => {
    const workbook = app.buildWorkbook(vehicles);
    const buffer = await workbook.xlsx.writeBuffer();
    const date = new Date();
    const stamp = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
    const filename = `levantamento_tecnico_veiculos_${stamp}.xlsx`;
    app.downloadBlob(
      new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      filename,
    );
    return filename;
  };
})();
