$base='http://localhost:4000'
try {
  Invoke-RestMethod -Method Post -Uri "$base/api/auth/register" -ContentType 'application/json' -Body (ConvertTo-Json @{name='Tester';email='tester@example.com';password='password'}) -ErrorAction Stop
} catch {}

$login = Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" -ContentType 'application/json' -Body (ConvertTo-Json @{email='tester@example.com';password='password'})
$t = $login.token
Write-Output "TOKEN:$t"

# create a small test file
Set-Location "$PSScriptRoot\.."
"hello" | Out-File -FilePath .\test_upload.txt -Encoding utf8

# upload the file
$response = Invoke-WebRequest -Uri "$base/api/files/upload" -Method Post -Headers @{ Authorization = "Bearer $t" } -Form @{ file = Get-Item .\test_upload.txt } -UseBasicParsing
Write-Output $response.Content
