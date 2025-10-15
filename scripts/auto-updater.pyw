import json
import os
import queue
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import sys

try:
    import requests
    from requests import Response, Session
    from requests.exceptions import RequestException
except ImportError as exc:  # pragma: no cover - runtime guard
    print(
        'requests パッケージが見つかりません。pip でインストールしてください。\n'
        '例: python -m pip install requests',
        file=sys.stderr,
    )
    raise SystemExit(1) from exc


CONFIG_PATH = Path(__file__).with_name('config.json')
DEFAULT_CONFIG: Dict[str, Any] = {
    'target_dir': str(Path.home()),
    'interval_minutes': 1440,
    'etag': '',
    'last_release_id': '',
    'last_checked': '',
    'github_token': '',
}

RELEASE_API_URL = 'https://api.github.com/repos/roflsunriz/filter-matome/releases/latest'
API_HEADERS = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
}
ASSET_HEADERS = {
    'Accept': 'application/octet-stream',
    'X-GitHub-Api-Version': '2022-11-28',
}


class AutoUpdaterGUI:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title('Filter Matome Auto Updater')
        self.root.minsize(540, 420)

        self.config: Dict[str, Any] = self.load_config()
        self.log_queue: 'queue.Queue[str]' = queue.Queue()
        self.stop_event = threading.Event()
        self.worker_thread: Optional[threading.Thread] = None

        self.target_var = tk.StringVar(value=self.config['target_dir'])
        interval_value = self.config.get('interval_minutes', 60)
        try:
            interval_value = int(interval_value)
        except (TypeError, ValueError):
            interval_value = 60
        if interval_value < 1:
            interval_value = 1
        self.interval_var = tk.IntVar(value=interval_value)

        self._build_gui()
        self.root.protocol('WM_DELETE_WINDOW', self.on_exit)
        self.root.after(200, self._process_log_queue)

    # GUI レイアウト -------------------------------------------------------
    def _build_gui(self) -> None:
        main_frame = ttk.Frame(self.root, padding='12')
        main_frame.pack(fill=tk.BOTH, expand=True)

        # 保存先
        target_frame = ttk.LabelFrame(main_frame, text='保存先')
        target_frame.pack(fill=tk.X, expand=False, pady=(0, 12))

        target_entry = ttk.Entry(target_frame, textvariable=self.target_var)
        target_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(12, 6), pady=12)

        browse_button = ttk.Button(target_frame, text='参照', command=self._select_directory)
        browse_button.pack(side=tk.RIGHT, padx=(0, 12), pady=12)

        # 更新間隔
        interval_frame = ttk.LabelFrame(main_frame, text='更新間隔 (分)')
        interval_frame.pack(fill=tk.X, expand=False, pady=(0, 12))

        interval_spin = ttk.Spinbox(
            interval_frame,
            from_=5,
            to=1440,
            increment=5,
            textvariable=self.interval_var,
            width=10,
        )
        interval_spin.pack(side=tk.LEFT, padx=12, pady=12)

        # 操作ボタン
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=tk.X, expand=False, pady=(0, 12))

        start_button = ttk.Button(button_frame, text='開始', command=self.start_monitoring)
        start_button.pack(side=tk.LEFT, padx=(0, 6))

        stop_button = ttk.Button(button_frame, text='停止', command=self.stop_monitoring)
        stop_button.pack(side=tk.LEFT, padx=(0, 6))

        save_button = ttk.Button(button_frame, text='設定保存', command=self.save_settings)
        save_button.pack(side=tk.LEFT, padx=(0, 6))

        exit_button = ttk.Button(button_frame, text='終了', command=self.on_exit)
        exit_button.pack(side=tk.LEFT)

        # ログ表示
        log_frame = ttk.LabelFrame(main_frame, text='ログ')
        log_frame.pack(fill=tk.BOTH, expand=True)

        self.log_text = tk.Text(log_frame, height=12, state='disabled', wrap='word')
        self.log_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(12, 0), pady=(0, 12))

        scrollbar = ttk.Scrollbar(log_frame, command=self.log_text.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y, padx=(0, 12), pady=(0, 12))
        self.log_text.config(yscrollcommand=scrollbar.set)

    # 設定処理 -------------------------------------------------------------
    def load_config(self) -> Dict[str, Any]:
        if CONFIG_PATH.exists():
            try:
                with CONFIG_PATH.open('r', encoding='utf-8') as fp:
                    loaded = json.load(fp)
                merged = {**DEFAULT_CONFIG, **loaded}
                return merged
            except (OSError, json.JSONDecodeError) as exc:
                messagebox.showwarning('設定読込エラー', f'設定ファイルの読込に失敗しました: {exc}')
        return DEFAULT_CONFIG.copy()

    def save_config(self) -> None:
        self.config['target_dir'] = self.target_var.get().strip()
        self.config['interval_minutes'] = self._current_interval()
        try:
            with CONFIG_PATH.open('w', encoding='utf-8') as fp:
                json.dump(self.config, fp, indent=2, ensure_ascii=False)
        except OSError as exc:
            self.log(f'設定ファイルの保存に失敗しました: {exc}')

    def save_settings(self) -> None:
        self.save_config()
        self.log('設定を保存しました。')

    def _current_interval(self) -> int:
        try:
            value = int(self.interval_var.get())
        except (tk.TclError, ValueError, TypeError):
            value = 60
        if value < 1:
            value = 1
        return value

    # ログ処理 -------------------------------------------------------------
    def log(self, message: str) -> None:
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        self.log_queue.put(f'[{timestamp}] {message}')

    def _process_log_queue(self) -> None:
        while True:
            try:
                line = self.log_queue.get_nowait()
            except queue.Empty:
                break
            else:
                self.log_text.configure(state='normal')
                self.log_text.insert(tk.END, line + '\n')
                self.log_text.see(tk.END)
                self.log_text.configure(state='disabled')
        self.root.after(200, self._process_log_queue)

    # GUI 操作 -------------------------------------------------------------
    def _select_directory(self) -> None:
        selected = filedialog.askdirectory(initialdir=self.target_var.get() or Path.home())
        if selected:
            self.target_var.set(selected)

    def start_monitoring(self) -> None:
        if self.worker_thread and self.worker_thread.is_alive():
            messagebox.showinfo('情報', 'すでに監視中です。')
            return

        target_dir_raw = self.target_var.get().strip()
        if not target_dir_raw:
            messagebox.showerror('エラー', '保存先を指定してください。')
            return
        target_dir = Path(target_dir_raw).expanduser()

        try:
            target_dir.mkdir(parents=True, exist_ok=True)
        except OSError as exc:
            messagebox.showerror('エラー', f'保存先ディレクトリを作成できません: {exc}')
            return

        interval = self._current_interval()
        self.config['interval_minutes'] = interval
        self.config['target_dir'] = str(target_dir)
        self.save_config()

        self.stop_event.clear()
        self.worker_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.worker_thread.start()
        self.log('更新チェックを開始しました。')

    def stop_monitoring(self) -> None:
        if self.worker_thread and self.worker_thread.is_alive():
            self.stop_event.set()
            self.worker_thread.join(timeout=2)
            self.log('更新チェックを停止しました。')
        self.worker_thread = None

    def on_exit(self) -> None:
        self.stop_monitoring()
        self.root.destroy()

    # 監視処理 -------------------------------------------------------------
    def _monitor_loop(self) -> None:
        session = requests.Session()
        try:
            self._prepare_session(session)
            while not self.stop_event.is_set():
                try:
                    self._check_for_update(session)
                except Exception as exc:  # pylint: disable=broad-except
                    self.log(f'更新処理中に予期せぬエラーが発生しました: {exc}')
                if self.stop_event.wait(self.config['interval_minutes'] * 60):
                    break
        finally:
            session.close()

    def _prepare_session(self, session: Session) -> None:
        token = self._resolve_token()
        if token:
            session.headers.update({'Authorization': f'Bearer {token}'})

    def _resolve_token(self) -> str:
        env_token = os.environ.get('GITHUB_TOKEN', '').strip()
        if env_token:
            return env_token
        config_token = str(self.config.get('github_token', '')).strip()
        return config_token

    def _check_for_update(self, session: Session) -> None:
        headers = API_HEADERS.copy()
        etag = self.config.get('etag')
        if etag:
            headers['If-None-Match'] = etag

        self.log('GitHub の最新リリースを確認します...')
        response = self._request(session, 'GET', RELEASE_API_URL, headers=headers, timeout=30)
        if response is None:
            return

        if response.status_code == 304:
            self.log('最新リリースに変更はありません。')
            self.config['last_checked'] = datetime.utcnow().isoformat()
            self.save_config()
            return

        if response.status_code != 200:
            self.log(f'リリース情報の取得に失敗しました (HTTP {response.status_code})。')
            return

        etag_header = response.headers.get('ETag', '')
        if etag_header:
            self.config['etag'] = etag_header

        try:
            release_data = response.json()
        except ValueError as exc:
            self.log(f'リリース情報の解析に失敗しました: {exc}')
            return

        if release_data.get('draft') or release_data.get('prerelease'):
            self.log('最新の安定版が見つかりませんでした。')
            return

        release_name = release_data.get('name') or release_data.get('tag_name') or '不明なリリース'
        release_id = release_data.get('id')
        self.log(f'最新リリースを検出しました: {release_name}')

        assets = release_data.get('assets') or []
        if not assets:
            self.log('ダウンロード可能なアセットが見つかりませんでした。')
            return

        for asset in assets:
            self._download_asset(session, asset)

        self.config['last_release_id'] = str(release_id or '')
        self.config['last_checked'] = datetime.utcnow().isoformat()
        self.save_config()
        self.log('最新リリースのダウンロードが完了しました。')

    def _download_asset(self, session: Session, asset: Dict[str, Any]) -> None:
        download_url = asset.get('browser_download_url')
        asset_name = asset.get('name') or Path(download_url or '').name
        if not download_url or not asset_name:
            self.log('アセット情報が不完全なためスキップしました。')
            return

        target_dir = Path(self.config['target_dir'])
        target_dir.mkdir(parents=True, exist_ok=True)
        target_path = target_dir / asset_name
        temp_path = target_path.with_suffix(target_path.suffix + '.part')

        self.log(f'ダウンロード開始: {asset_name}')
        headers = ASSET_HEADERS.copy()
        response = self._request(session, 'GET', download_url, headers=headers, timeout=120, stream=True)
        if response is None:
            return

        if response.status_code != 200:
            self.log(f'アセットのダウンロードに失敗しました (HTTP {response.status_code})。')
            return

        try:
            with temp_path.open('wb') as fp:
                for chunk in response.iter_content(chunk_size=1024 * 256):
                    if self.stop_event.is_set():
                        self.log('ダウンロードが停止されました。')
                        return
                    if chunk:
                        fp.write(chunk)
            temp_path.replace(target_path)
        except OSError as exc:
            self.log(f'ファイルの保存に失敗しました: {exc}')
            return
        finally:
            if response is not None:
                response.close()
            if temp_path.exists() and self.stop_event.is_set():
                try:
                    temp_path.unlink()
                except OSError:
                    pass

        size_mb = target_path.stat().st_size / (1024 * 1024)
        self.log(f'ダウンロード完了: {asset_name} ({size_mb:.2f} MB)')

    def _request(
        self,
        session: Session,
        method: str,
        url: str,
        *,
        headers: Optional[Dict[str, str]] = None,
        timeout: int = 30,
        stream: bool = False,
    ) -> Optional[Response]:
        try:
            response = session.request(
                method=method,
                url=url,
                headers=headers,
                timeout=timeout,
                stream=stream,
            )
            return response
        except RequestException as exc:
            self.log(f'ネットワークエラーが発生しました: {exc}')
            return None


def main() -> None:
    root = tk.Tk()
    app = AutoUpdaterGUI(root)
    root.mainloop()


if __name__ == '__main__':
    main()
