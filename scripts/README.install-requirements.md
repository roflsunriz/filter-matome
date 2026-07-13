# install-requirements.ps1

## 概要

`install-requirements.ps1` は、`scripts` 配下のPythonユーティリティで使用する実行・型検査用パッケージを `pip` で順番にインストールします。

## 必要環境

- Windows
- PowerShell
- Pythonと `pip` がPATHから実行できること

## インストール対象

- `mypy`
- `pywin32` / `types-pywin32`
- `psutil` / `types-psutil`
- `tkinterdnd2`
- `requests` / `types-requests`
- `setuptools` / `types-setuptools`

## 使い方

仮想環境を利用する場合は、先に有効化してから実行します。

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
.\scripts\install-requirements.ps1
```

## 注意事項

- スクリプト自体は仮想環境を作成しません。仮想環境を有効にしていない場合、現在選択されているPython環境へインストールされます。
- `pip` コマンドを直接呼び出すため、複数のPythonを導入している環境では対象環境を事前に確認してください。
- バージョンを固定していないため、実行時点の最新版がインストールされます。
