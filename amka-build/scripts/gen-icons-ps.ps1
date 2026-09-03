# Générateur d'icônes AMKA v2 (avec wording "AMKA") — Windows GDI+/System.Drawing
# Sorties : icônes Android (mipmap + splashes), icône web, icône Electron, PNG sources pour les .ico

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'

$ROOT   = Split-Path -Parent $PSScriptRoot
$RES    = Join-Path $ROOT 'android\app\src\main\res'
$INDIGO = [System.Drawing.Color]::FromArgb(255, 70, 72, 212)   # #4648D4
$TEAL   = [System.Drawing.Color]::FromArgb(255, 0, 104, 122)   # #00687A
$WHITE  = [System.Drawing.Color]::FromArgb(255, 255, 255, 255)
$PULSE  = [System.Drawing.Color]::FromArgb(255, 159, 240, 231) # #9FF0E7

function New-Canvas($w, $h) {
    $bmp = [System.Drawing.Bitmap]::new($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    return @{ Bmp = $bmp; G = $g }
}

function Get-RoundedRectPath($x, $y, $w, $h, $r) {
    $p = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $d = 2 * $r
    $p.AddArc([single]$x, [single]$y, [single]$d, [single]$d, 180, 90)
    $p.AddArc([single]($x + $w - $d), [single]$y, [single]$d, [single]$d, 270, 90)
    $p.AddArc([single]($x + $w - $d), [single]($y + $h - $d), [single]$d, [single]$d, 0, 90)
    $p.AddArc([single]$x, [single]($y + $h - $d), [single]$d, [single]$d, 90, 90)
    $p.CloseFigure()
    return $p
}

function Get-HeartPath($cx, $cy, $H) {
    $R = $H / 2.9
    $p = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $ellW = 2.0 * $R
    $lx = $cx - 1.45 * $R
    $ly = $cy - 1.55 * $R
    $rx = $cx + 0.45 * $R - $R
    $p.AddEllipse([System.Drawing.RectangleF]::new([single]$lx, [single]$ly, [single]$ellW, [single]$ellW))
    $p.AddEllipse([System.Drawing.RectangleF]::new([single]$rx, [single]$ly, [single]$ellW, [single]$ellW))
    $px = $cx - 1.45 * $R; $py = $cy - 0.20 * $R
    $qx = $cx + 1.45 * $R; $qy = $cy - 0.20 * $R
    $tx = $cx;            $ty = $cy + 1.35 * $R
    $p.AddPolygon([System.Drawing.PointF[]]@(
        [System.Drawing.PointF]::new([single]$px, [single]$py),
        [System.Drawing.PointF]::new([single]$qx, [single]$qy),
        [System.Drawing.PointF]::new([single]$tx, [single]$ty)
    ))
    $p.CloseFigure()
    return $p
}

function Draw-Ecg($g, $cx, $cy, $boxW, $boxH, $stroke) {
    $pts = @(
        @(0.00, 0.00), @(0.32, 0.00), @(0.44, -0.35), @(0.52, 0.00),
        @(0.59, 0.00), @(0.65, 0.60), @(0.71, -0.65), @(0.77, 0.00),
        @(1.00, 0.00)
    )
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $first = $true
    foreach ($pt in $pts) {
        $x = $cx + ($pt[0] - 0.5) * $boxW
        $y = $cy + $pt[1] * $boxH
        if ($first) {
            $path.StartFigure()
            $path.AddLine([single]$x, [single]$y, [single]$x, [single]$y)
            $first = $false
        } else {
            $path.AddLine($path.GetLastPoint(), [System.Drawing.PointF]::new([single]$x, [single]$y))
        }
    }
    $pen = [System.Drawing.Pen]::new($PULSE, [single]$stroke)
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap   = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawPath($pen, $path)
    $pen.Dispose(); $path.Dispose()
}

function Draw-Text($g, $w, $h, $text, $fontPx, $topFraction, $heightFraction) {
    $font  = [System.Drawing.Font]::new('Segoe UI', [single]$fontPx, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $fmt   = [System.Drawing.StringFormat]::new()
    $fmt.Alignment     = [System.Drawing.StringAlignment]::Center
    $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
    $ty  = $h * $topFraction
    $th  = [math]::Max(1, $h * $heightFraction)
    $rect = [System.Drawing.RectangleF]::new(0, [single]$ty, [single]$w, [single]$th)
    $brush = [System.Drawing.SolidBrush]::new($WHITE)
    $g.DrawString($text, $font, $brush, $rect, $fmt)
    $brush.Dispose(); $font.Dispose(); $fmt.Dispose()
}

function Fill-GradientBg($g, $w, $h, $rounded) {
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    if ($rounded) {
        $r = [math]::Max(6, [math]::Min($w, $h) * 0.22)
        $path = Get-RoundedRectPath 0 0 $w $h $r
    } else {
        $path.AddRectangle([System.Drawing.RectangleF]::new(0, 0, [single]$w, [single]$h))
    }
    $rc = [System.Drawing.RectangleF]::new(0, 0, [single]$w, [single]$h)
    $brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($rc, $INDIGO, $TEAL, [single]115.0)
    $g.FillPath($brush, $path)
    $brush.Dispose(); $path.Dispose()
}

function Draw-IconContent($g, $w, $h, $scale) {
    # coeur + ecg + "AMKA", layout relatif a la taille min (scale)
    $heartH = $scale * 0.34
    $cy     = $h * 0.40
    $heart  = Get-HeartPath ($w * 0.5) $cy $heartH
    $g.FillPath([System.Drawing.Brushes]::White, $heart)
    Draw-Ecg $g ($w * 0.5) ($cy + $heartH * 0.06) ($heartH * 1.6) ($heartH * 0.5) ([math]::Max(1, $scale * 0.028))
    $heart.Dispose()
    Draw-Text $g $w $h 'AMKA' ($scale * 0.16) 0.60 0.30
}

# ---------- Rendu ----------
function Render-Icon($size, $mode) {
    # mode: 'legacy' (fond degradé arrondi) | 'fg' (transparent, zone sûre centrée)
    $c = New-Canvas $size $size
    $g = $c.G
    if ($mode -eq 'legacy') {
        Fill-GradientBg $g $size $size $true
        Draw-IconContent $g $size $size $size
    } else {
        # foreground: contenu réduit (zone sûre ~66%), centré
        $s = $size * 0.72
        Draw-IconContent $g $size $size $s
    }
    return $c
}

function Render-Splash($w, $h) {
    $c = New-Canvas $w $h
    $g = $c.G
    Fill-GradientBg $g $w $h $false
    $m = [math]::Min($w, $h)
    $heartH = $m * 0.30
    $cy = $h * 0.34
    $heart = Get-HeartPath ($w * 0.5) $cy $heartH
    $g.FillPath([System.Drawing.Brushes]::White, $heart)
    Draw-Ecg $g ($w * 0.5) ($cy + $heartH * 0.06) ($heartH * 1.5) ($heartH * 0.5) ([math]::Max(2, $m * 0.012))
    $heart.Dispose()
    Draw-Text $g $w $h 'AMKA' ($m * 0.24) 0.52 0.16
    Draw-Text $g $w $h 'KINDU' ($m * 0.09) 0.70 0.12
    return $c
}

function Save-Png($canvas, $out) {
    try {
        $dir = Split-Path -Parent $out
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
        $canvas.Bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $canvas.G.Dispose()
        $canvas.Bmp.Dispose()
    }
}

# ---------- Génération ----------
$iconSizes = @{ mdpi = 48; hdpi = 72; xhdpi = 96; xxhdpi = 144; xxxhdpi = 192 }
$fgSizes   = @{ mdpi = 108; hdpi = 162; xhdpi = 216; xxhdpi = 324; xxxhdpi = 432 }
$splashSizes = @{ mdpi = @(320, 480); hdpi = @(480, 800); xhdpi = @(720, 1280); xxhdpi = @(960, 1600); xxxhdpi = @(1280, 1920) }

foreach ($d in $iconSizes.Keys) {
    $dir = Join-Path $RES "mipmap-$d"
    Save-Png (Render-Icon $iconSizes[$d] 'legacy') (Join-Path $dir 'ic_launcher.png')
    Save-Png (Render-Icon $iconSizes[$d] 'legacy') (Join-Path $dir 'ic_launcher_round.png')
    Save-Png (Render-Icon $fgSizes[$d] 'fg')       (Join-Path $dir 'ic_launcher_foreground.png')
    Write-Host "mipmap-$d OK"
}
foreach ($d in $splashSizes.Keys) {
    $w = $splashSizes[$d][0]; $h = $splashSizes[$d][1]
    Save-Png (Render-Splash $w $h) (Join-Path (Join-Path $RES "drawable-port-$d") 'splash.png')
    Save-Png (Render-Splash $h $w) (Join-Path (Join-Path $RES "drawable-land-$d") 'splash.png')
    Write-Host "splash $d OK"
}
Save-Png (Render-Splash 480 320) (Join-Path (Join-Path $RES 'drawable') 'splash.png')

Save-Png (Render-Icon 512 'legacy') (Join-Path $ROOT 'public\amka_logo_icon.png')
Save-Png (Render-Icon 512 'legacy') (Join-Path $ROOT 'electron\icon.png')
New-Item -ItemType Directory -Force -Path (Join-Path $ROOT 'build\ico') | Out-Null
foreach ($s in 16, 24, 32, 48, 64, 128, 256) {
    Save-Png (Render-Icon $s 'legacy') (Join-Path (Join-Path $ROOT 'build\ico') "icon-$s.png")
}
Write-Host "Tout est généré."