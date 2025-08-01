# ビルド選択プロンプトスクリプト
Write-Host "ビルドオプションを選択してください:" -ForegroundColor Yellow
Write-Host "1. 通常のビルド (vite build --config config/vite.global.config.js)" -ForegroundColor Cyan
Write-Host "2. 全てのコンポーネントをビルド (build:ALL)" -ForegroundColor Cyan
Write-Host "3. キャンセル" -ForegroundColor Red

do {
    $choice = Read-Host "選択してください (1/2/3)"
    
    switch ($choice) {
        "1" {
            Write-Host "通常のビルドを実行します..." -ForegroundColor Green
            npm run build:default
            break
        }
        "2" {
            Write-Host "全てのコンポーネントをビルドします..." -ForegroundColor Green
            npm run build:ALL
            break
        }
        "3" {
            Write-Host "ビルドをキャンセルしました。" -ForegroundColor Yellow
            exit 0
        }
        default {
            Write-Host "無効な選択です。1、2、または3を入力してください。" -ForegroundColor Red
        }
    }
} while ($choice -notin @("1", "2", "3")) 