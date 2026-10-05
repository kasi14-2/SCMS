$ErrorActionPreference = 'Stop'

$jdkHome = 'C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot'
$mavenHome = 'C:\tools\apache-maven-3.9.11'
$mavenZip = 'C:\tools\apache-maven-3.9.11-bin.zip'

if (-not (Test-Path (Join-Path $jdkHome 'bin\java.exe'))) {
    throw 'Java JDK was not found at C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot.'
}

if (-not (Test-Path 'C:\Program Files\nodejs\node.exe')) {
    throw 'Node.js was not found at C:\Program Files\nodejs.'
}

if (-not (Test-Path (Join-Path $mavenHome 'bin\mvn.cmd'))) {
    New-Item -ItemType Directory -Force -Path 'C:\tools' | Out-Null
    Invoke-WebRequest -Uri 'https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.11/apache-maven-3.9.11-bin.zip' -OutFile $mavenZip
    Expand-Archive -Path $mavenZip -DestinationPath 'C:\tools' -Force
}

$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$pathsToAdd = @(
    (Join-Path $jdkHome 'bin'),
    'C:\Program Files\nodejs',
    (Join-Path $mavenHome 'bin')
)

foreach ($pathToAdd in $pathsToAdd) {
    $segments = @($userPath -split ';')
    if (-not ($segments -contains $pathToAdd)) {
        $userPath = ($userPath.TrimEnd(';') + ';' + $pathToAdd).Trim(';')
    }
}

[Environment]::SetEnvironmentVariable('JAVA_HOME', $jdkHome, 'User')
[Environment]::SetEnvironmentVariable('MAVEN_HOME', $mavenHome, 'User')
[Environment]::SetEnvironmentVariable('Path', $userPath, 'User')

Write-Host 'Java, Node.js, and Maven are installed and configured.'
& (Join-Path $jdkHome 'bin\java.exe') -version
& 'C:\Program Files\nodejs\node.exe' -v
& (Join-Path $mavenHome 'bin\mvn.cmd') -version
