param(
    [Parameter(Mandatory = $true)]
    [string]$WorkbookPath
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$resolvedWorkbook = (Resolve-Path -LiteralPath $WorkbookPath).Path
$specification = Get-Content -LiteralPath (Join-Path $projectRoot 'README_LEVANTAMENTO_TECNICO_VEICULOS.md') -Encoding UTF8
$expectedHeaders = @($specification | Where-Object { $_ -match '^\| \d+ \|' } | ForEach-Object { ($_.Split('|')[2]).Trim() })
$excelApp = $null
$workbook = $null
$worksheet = $null

try {
    # Instância própria, invisível, macros desabilitadas, sem atualização de links e somente leitura.
    $excelApp = New-Object -ComObject Excel.Application
    $excelApp.Visible = $false
    $excelApp.DisplayAlerts = $false
    $excelApp.AutomationSecurity = 3
    $workbook = $excelApp.Workbooks.Open($resolvedWorkbook, 0, $true)
    if ($workbook.Worksheets.Count -ne 1) { throw 'Quantidade inesperada de abas.' }
    $worksheet = $workbook.Worksheets.Item('Veículos')
    if ($worksheet.UsedRange.Columns.Count -ne 33) { throw 'O arquivo deve conter exatamente 33 colunas.' }
    for ($index = 0; $index -lt $expectedHeaders.Count; $index++) {
        $actual = [string]$worksheet.Cells.Item(1, $index + 1).Value2
        if ($actual -cne $expectedHeaders[$index]) { throw "Cabeçalho divergente na coluna $($index + 1)." }
    }
    if (-not $worksheet.AutoFilterMode) { throw 'O filtro do Excel não está habilitado.' }
    if (-not $excelApp.ActiveWindow.FreezePanes) { throw 'O congelamento de painéis não está habilitado.' }
    [PSCustomObject]@{
        Application = 'Microsoft Excel'
        Version = $excelApp.Version
        Workbook = $resolvedWorkbook
        Worksheet = $worksheet.Name
        Columns = $worksheet.UsedRange.Columns.Count
        VehicleRows = $worksheet.UsedRange.Rows.Count - 1
        ExactHeaders = $true
        AutoFilter = $worksheet.AutoFilterMode
        FrozenPanes = $excelApp.ActiveWindow.FreezePanes
        ReadOnly = $workbook.ReadOnly
    } | ConvertTo-Json
}
finally {
    if ($workbook) { $workbook.Close($false) }
    if ($excelApp) { $excelApp.Quit() }
    foreach ($comObject in @($worksheet, $workbook, $excelApp)) {
        if ($null -ne $comObject) { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($comObject) }
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
