# Importa mysql/schema.sql (crea yaprofebolt + tablas).
# Uso desde la raiz del proyecto: .\scripts\setup-database.ps1
# Con contrasena de root: $env:MYSQL_PWD='tu_clave'; .\scripts\setup-database.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

$schema = Join-Path $root 'mysql\schema.sql'
if (-not (Test-Path $schema)) {
  Write-Host 'No se encuentra mysql/schema.sql' -ForegroundColor Red
  exit 1
}

$candidates = @(
  'mysql',
  'C:\xampp\mysql\bin\mysql.exe',
  'C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe',
  'C:\wamp64\bin\mysql\mysql8.4.0\bin\mysql.exe',
  'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe',
  'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe'
)

$mysql = $null
foreach ($c in $candidates) {
  if ($c -eq 'mysql') {
    $cmd = Get-Command mysql -ErrorAction SilentlyContinue
    if ($cmd) { $mysql = $cmd.Source; break }
  } elseif (Test-Path $c) {
    $mysql = $c
    break
  }
}

if (-not $mysql) {
  Write-Host ''
  Write-Host 'No se encontro mysql.exe. Instala MySQL o XAMPP, o abre el archivo en Workbench/HeidiSQL:' -ForegroundColor Yellow
  Write-Host "  $schema" -ForegroundColor Gray
  Write-Host ''
  exit 2
}

Write-Host "Cliente MySQL: $mysql" -ForegroundColor Green

# Redireccion de archivo (fiable en Windows)
$mysqlEsc = $mysql -replace '"', '`"'
$schemaEsc = $schema -replace '"', '`"'

if ($env:MYSQL_PWD) {
  $cmdLine = "`"$mysqlEsc`" -h 127.0.0.1 -P 3306 -u root -p$($env:MYSQL_PWD) --default-character-set=utf8mb4 < `"$schemaEsc`""
} else {
  $cmdLine = "`"$mysqlEsc`" -h 127.0.0.1 -P 3306 -u root --default-character-set=utf8mb4 < `"$schemaEsc`""
}

cmd /c $cmdLine
if ($LASTEXITCODE -ne 0) {
  Write-Host ''
  Write-Host 'Error al importar. Prueba con contrasena:' -ForegroundColor Yellow
  Write-Host '  $env:MYSQL_PWD=''tu_clave''; .\scripts\setup-database.ps1' -ForegroundColor Gray
  exit $LASTEXITCODE
}

Write-Host 'Listo: base yaprofebolt y tablas creadas.' -ForegroundColor Green
