$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    $localConfig = 'src/main/resources/application-local.yml'
    if (!(Test-Path $localConfig)) {
        [IO.File]::WriteAllText((Join-Path $PSScriptRoot $localConfig), "# Private local overrides; or set DASHSCOPE_API_KEY in .env`n", [Text.UTF8Encoding]::new($false))
    }
    foreach ($file in @('model_quantized.onnx', 'tokenizer.json')) {
        if (!(Test-Path "src/main/resources/model/bge-reranker-model/$file")) {
            throw "Missing BGE model file: $file"
        }
    }
    docker compose --profile app up -d --build --wait --wait-timeout 300
    if ($LASTEXITCODE -ne 0) { throw 'Startup failed. Run docker compose --profile app logs --tail 100' }
    Write-Host 'KnowEngine: http://127.0.0.1:18080'
} finally { Pop-Location }
