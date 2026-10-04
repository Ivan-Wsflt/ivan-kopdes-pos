# Ivan Kopdes POS - Simple Local Web Server
$port = 8080
$folder = $PSScriptRoot
if (-not $folder) { $folder = Get-Location }

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Prefixes.Add("http://127.0.0.1:$port/")

try {
    $listener.Start()
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host " Ivan Kopdes POS Server Berjalan!" -ForegroundColor Green
    Write-Host " Buka browser di: http://localhost:$port/" -ForegroundColor Yellow
    Write-Host "==========================================================" -ForegroundColor Cyan

    try { Start-Process "http://localhost:$port/" } catch {}

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        try {
            $path = $request.Url.LocalPath.TrimStart('/')
            if ([string]::IsNullOrEmpty($path)) { $path = "index.html" }
            $filePath = Join-Path $folder $path

            if (Test-Path $filePath -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()

                switch ($ext) {
                    ".html" { $response.ContentType = "text/html; charset=utf-8" }
                    ".css"  { $response.ContentType = "text/css; charset=utf-8" }
                    ".js"   { $response.ContentType = "application/javascript; charset=utf-8" }
                    ".json" { $response.ContentType = "application/json" }
                    ".png"  { $response.ContentType = "image/png" }
                    ".jpg"  { $response.ContentType = "image/jpeg" }
                    ".svg"  { $response.ContentType = "image/svg+xml" }
                    ".ico"  { $response.ContentType = "image/x-icon" }
                    Default { $response.ContentType = "application/octet-stream" }
                }

                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 404
                $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                $response.OutputStream.Write($msg, 0, $msg.Length)
            }
        } catch {
            Write-Host "Request error: $_" -ForegroundColor Red
        } finally {
            try { $response.Close() } catch {}
        }
    }
} finally {
    $listener.Stop()
}
