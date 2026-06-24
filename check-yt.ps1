$ids = @('ml6cT4AZdqI','g_tea8ZNtKA','lmq0bMQy2ZQ','2pLT-olgUJs','UBMk30rjy0o','uo20gzGJggw','U9ENCsGYLoE','v7AYKMP6rOE','sTANio_2E0Q','QOIDBkJRJhM','h_7oOeMHDJE','AnYnOoIG-y4','cSqiJyNLuAg','53TaQbd0ROg')
foreach ($id in $ids) {
  try {
    $r = Invoke-WebRequest -Uri "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=$id&format=json" -UseBasicParsing -TimeoutSec 20
    $j = $r.Content | ConvertFrom-Json
    Write-Host "$id -> OK | $($j.author_name) | $($j.title)"
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "$id -> INVALID ($code)"
  }
}
