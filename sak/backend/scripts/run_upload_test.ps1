$base = 'http://localhost:4000'
$testFile = Join-Path $PSScriptRoot '..\test_upload.txt'
"hello" | Out-File -FilePath $testFile -Encoding utf8

try {
    Invoke-RestMethod -Method Post -Uri "$base/api/auth/register" -ContentType 'application/json' -Body (ConvertTo-Json @{name='Tester'; email='tester@example.com'; password='password'}) -ErrorAction Stop | Out-Null
} catch {
    # ignore if already registered
}

$login = Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" -ContentType 'application/json' -Body (ConvertTo-Json @{email='tester@example.com'; password='password'})
$token = $login.token
Write-Output "TOKEN: $token"

$response = curl.exe -s -X POST -H "Authorization: Bearer $token" -F "file=@$testFile" "$base/api/files/upload"
Write-Output $response
