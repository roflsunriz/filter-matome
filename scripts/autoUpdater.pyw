import sys
import subprocess
import importlib
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import json
import threading
import queue
from pathlib import Path
import time
from datetime import datetime, timedelta
import re
import os
import urllib.parse
import shutil

# 標準ライブラリとサードパーティライブラリを分類
STANDARD_LIBS = {
    'sys', 'subprocess', 'importlib', 'tkinter', 'json', 'threading',
    'queue', 'pathlib', 'time', 'datetime', 're', 'os', 'urllib',
    'shutil', 'traceback'
}

REQUIRED_PACKAGES = {
    'requests',
    'beautifulsoup4',
    'schedule',
    'py7zr',
    'psutil',
    'bs4'  # beautifulsoup4の別名
}

def is_package_installed(package_name):
    """パッケージがインストール済みかどうかを確認するのじゃ！"""
    try:
        importlib.import_module(package_name)
        return True
    except ImportError:
        return False

def install_packages():
    """必要なパッケージを自動インストールするのじゃ！"""
    for package in REQUIRED_PACKAGES:
        if not is_package_installed(package):
            print(f"{package}をインストールするのじゃ！")
            try:
                subprocess.check_call([sys.executable, '-m', 'pip', 'install', package])
                print(f"{package}のインストールに成功したのじゃ！")
            except subprocess.CalledProcessError as e:
                print(f"{package}のインストールに失敗したのじゃ。エラー: {e}")
                sys.exit(1)

class NicoCacheGUI:
    def __init__(self, root):
        self.root = root
        self.root.title('NicoCache_nl Auto Updater')
        self.root.geometry('600x700')
        
        # プリセット設定を追加
        self.presets = [
            {
                'name': '本体更新',
                'filename': 'NicoCache_nl.7z',
                'keywords': ['【本体】', 'https://sportschan.org/librejp/res/134457.html']
            },
            {
                'name': 'フィルタまとめ',
                'filename': 'test_nlFilters.7z',
                'keywords': ['by ◆awd5z.AlOFJq フィルタまとめ']
            },
            # 追加の空のプリセット
            *[{'name': f'カスタム {i+1}', 'filename': '', 'keywords': []} for i in range(5)]
        ]
        
        # デフォルトのconfig設定を初期化
        self.config = {
            'url': 'https://nicocache.jpn.org/',
            'target_dir': 'C:/NicoCache_nl',
            'interval': 60,
            'filename': '',
            'keywords': [],
            'presets': self.presets
        }
        
        self.selected_preset = tk.StringVar(value='本体更新')
        
        self.downloader = None
        self.update_thread = None
        self.running = False
        self.stop_event = threading.Event()
        
        # GUIの作成を先に行う
        self.create_gui()
        
        # 設定の読み込みを後で行う
        self.load_config()
        
        # GUIの値を更新
        self.update_gui_from_config()
        
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)

    def on_closing(self):
        # 監視中の場合は停止
        if self.running:
            self.stop_monitoring()
        
        # スレッドが存在する場合は強制終了
        if self.update_thread and self.update_thread.is_alive():
            self.stop_event.set()
            self.update_thread.join(timeout=2)
        
        # アプリケーションを終了
        self.root.quit()
        self.root.destroy()

    def load_config(self):
        try:
            with open('config.json', 'r', encoding='utf-8') as f:
                self.config = json.load(f)
                # プリセットの保存された設定を読み込む
                if 'presets' in self.config:
                    for saved_preset in self.config['presets']:
                        for preset in self.presets:
                            if preset['name'] == saved_preset['name']:
                                preset.update(saved_preset)
        except FileNotFoundError:
            # デフォルト設定を完全な形で定義
            self.config = {
                'url': 'https://nicocache.jpn.org/',
                'target_dir': 'C:/NicoCache_nl',
                'interval': 60,
                'filename': '',
                'keywords': [],
                'presets': self.presets
            }
            try:
                self.save_config()
                self.log("新しい設定ファイルを作成したのじゃ！")
            except Exception as e:
                self.log(f"設定ファイルの作成に失敗したのじゃ: {e}")
                messagebox.showerror('エラー', 
                    '設定ファイルの作成に失敗したのじゃ！\n'
                    'アプリケーションの実行権限を確認するのじゃ。')
        except json.JSONDecodeError:
            self.log("設定ファイルの形式が不正なのじゃ！")
            # 破損した設定ファイルをバックアップ
            try:
                shutil.copy2('config.json', 'config.json.bak')
                self.log("破損した設定ファイルをバックアップしたのじゃ")
            except Exception as e:
                self.log(f"バックアップの作成に失敗したのじゃ: {e}")
            
            # 新しい設定ファイルを作成
            self.config = {
                'url': 'https://nicocache.jpn.org/',
                'target_dir': 'C:/NicoCache_nl',
                'interval': 60,
                'filename': '',
                'keywords': [],
                'presets': self.presets
            }
            self.save_config()

    def save_config(self):
        try:
            # 現在の設定を保存（GUIが初期化されている場合のみ）
            if hasattr(self, 'filename_entry'):
                current_preset = next(
                    (p for p in self.presets 
                    if p['name'] == self.selected_preset.get()),
                    None
                )
                
                if current_preset:
                    current_preset['filename'] = self.filename_entry.get()
                    current_preset['keywords'] = self.keywords_text.get('1.0', tk.END).strip().split('\n')
            
            self.config['presets'] = self.presets
            if hasattr(self, 'dir_entry'):
                self.config['target_dir'] = self.dir_entry.get()
            
            # 一時ファイルに書き込んでから置き換え
            temp_file = 'config.json.tmp'
            with open(temp_file, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=4, ensure_ascii=False)
            
            # 一時ファイルを本来のファイルに置き換え
            os.replace(temp_file, 'config.json')
            
        except Exception as e:
            if hasattr(self, 'log_text'):
                self.log(f"設定の保存に失敗したのじゃ: {e}")
            messagebox.showerror('エラー', 
                '設定の保存に失敗したのじゃ！\n'
                'ファイルの書き込み権限を確認するのじゃ。')

    def create_gui(self):
        # プリセット選択部分を追加
        preset_frame = ttk.LabelFrame(self.root, text='更新対象の選択')
        preset_frame.pack(fill='x', padx=20, pady=5)
        
        for preset in self.presets:
            ttk.Radiobutton(
                preset_frame,
                text=preset['name'],
                value=preset['name'],
                variable=self.selected_preset,
                command=self.update_form_from_preset
            ).pack(anchor='w', padx=10)

        # 保存先設定
        ttk.Label(self.root, text='保存先:').pack(pady=5)
        save_frame = ttk.Frame(self.root)
        save_frame.pack(fill='x', padx=20)
        self.dir_entry = ttk.Entry(save_frame, width=45)
        self.dir_entry.insert(0, self.config['target_dir'])
        self.dir_entry.pack(side='left', expand=True, padx=5)
        ttk.Button(save_frame, text='参照', command=self.select_directory).pack(side='left')

        # ファイル名設定
        ttk.Label(self.root, text='検索ファイル名:').pack(pady=5)
        filename_frame = ttk.Frame(self.root)
        filename_frame.pack(fill='x', padx=20)
        self.filename_entry = ttk.Entry(filename_frame, width=50)
        self.filename_entry.pack(expand=True, padx=5)

        # キーワード設定
        ttk.Label(self.root, text='検索キーワード（改行区切り）:').pack(pady=5)
        keywords_frame = ttk.Frame(self.root)
        keywords_frame.pack(fill='x', padx=20)
        self.keywords_text = tk.Text(keywords_frame, height=4, width=50)
        self.keywords_text.pack(expand=True, padx=5)

        # 更新間隔設定
        ttk.Label(self.root, text='更新間隔:').pack(pady=5)
        interval_frame = ttk.Frame(self.root)
        interval_frame.pack(fill='x', padx=20)
        
        # 更新間隔の選択方式
        self.interval_type = tk.StringVar(value='preset')
        ttk.Radiobutton(interval_frame, text='プリセット', 
                       variable=self.interval_type, value='preset',
                       command=self.toggle_interval_input).pack(side='left')
        ttk.Radiobutton(interval_frame, text='カスタム', 
                       variable=self.interval_type, value='custom',
                       command=self.toggle_interval_input).pack(side='left')
        
        # プリセット間隔の設定
        preset_frame = ttk.Frame(interval_frame)
        preset_frame.pack(side='left', padx=5)
        interval_presets = [
            ('12時間毎', 12 * 60),
            ('1日毎', 24 * 60),
            ('2日毎', 48 * 60),
            ('3日毎', 72 * 60),
            ('1週間毎', 7 * 24 * 60)
        ]
        
        self.interval_var = tk.StringVar(value='1日毎')
        self.interval_combobox = ttk.Combobox(preset_frame, 
                                           textvariable=self.interval_var,
                                           values=[preset[0] for preset in interval_presets],
                                           width=15)
        self.interval_combobox.pack(side='left')

        # プリセットと分値のマッピングを保存
        self.interval_mapping = {preset[0]: preset[1] for preset in interval_presets}
        
        # カスタム間隔入力
        custom_frame = ttk.Frame(interval_frame)
        custom_frame.pack(side='left', padx=5)
        
        # 時間入力
        self.hour_entry = ttk.Entry(custom_frame, width=3)
        self.hour_entry.pack(side='left', padx=5)
        ttk.Label(custom_frame, text='時間').pack(side='left')
        
        # 分入力
        self.minute_entry = ttk.Entry(custom_frame, width=3)
        self.minute_entry.pack(side='left', padx=5)
        ttk.Label(custom_frame, text='分').pack(side='left')
        
        # 初期値設定
        self.update_custom_interval_input()
        
        # 初期状態の設定
        self.preset_frame = preset_frame
        self.custom_frame = custom_frame
        self.toggle_interval_input()
        
        # 除外ファイル設定
        ttk.Label(self.root, text='除外ファイル名（改行区切り）:').pack(pady=5)
        exclude_frame = ttk.Frame(self.root)
        exclude_frame.pack(fill='x', padx=20)
        self.exclude_text = tk.Text(exclude_frame, height=4, width=50)
        self.exclude_text.pack(expand=True, padx=5)

        # ログ表示
        ttk.Label(self.root, text='ログ:').pack(pady=5)
        log_frame = ttk.Frame(self.root)
        log_frame.pack(fill='x', padx=20)
        self.log_text = tk.Text(log_frame, height=8, width=50)
        self.log_text.pack(expand=True, padx=5)

        # ボタン
        button_frame = ttk.Frame(self.root)
        button_frame.pack(pady=10)
        self.start_button = ttk.Button(button_frame, text='開始', command=self.start_monitoring)
        self.start_button.pack(side='left', padx=5)
        self.stop_button = ttk.Button(button_frame, text='停止', command=self.stop_monitoring, state='disabled')
        self.stop_button.pack(side='left', padx=5)
        
        # 設定保存ボタンを追加
        self.save_button = ttk.Button(button_frame, text='設定保存', command=self.update_config)
        self.save_button.pack(side='left', padx=5)
        
        # 終了ボタンを追加
        self.exit_button = ttk.Button(button_frame, text='終了', command=self.on_closing)
        self.exit_button.pack(side='left', padx=5)

        # 初期値を設定
        self.update_form_from_preset()

    def select_directory(self):
        dir_path = filedialog.askdirectory()
        if dir_path:
            self.dir_entry.delete(0, tk.END)
            self.dir_entry.insert(0, dir_path)

    def toggle_interval_input(self):
        """更新間隔の入力方式を切り替えるのじゃ！"""
        if self.interval_type.get() == 'preset':
            self.preset_frame.pack(side='left', padx=5)
            self.custom_frame.pack_forget()
        else:
            self.preset_frame.pack_forget()
            self.custom_frame.pack(side='left', padx=5)
            self.update_custom_interval_input()

    def update_custom_interval_input(self):
        """カスタム間隔の入力値を更新するのじゃ"""
        total_minutes = self.config.get('interval', 60)
        hours = total_minutes // 60
        minutes = total_minutes % 60
        self.hour_entry.delete(0, tk.END)
        self.hour_entry.insert(0, str(hours))
        self.minute_entry.delete(0, tk.END)
        self.minute_entry.insert(0, str(minutes))

    def update_config(self):
        try:
            # 選択された入力方式に応じて間隔を取得
            if self.interval_type.get() == 'preset':
                selected_preset = self.interval_var.get()
                interval = self.interval_mapping[selected_preset]  # マッピングから分値を取得
            else:
                # カスタム入力の場合
                try:
                    hours = int(self.hour_entry.get())
                    minutes = int(self.minute_entry.get())
                    if minutes < 0 or minutes > 59:
                        raise ValueError
                    interval = hours * 60 + minutes
                except ValueError:
                    messagebox.showerror('エラー', '時間は0以上の整数、分は0-59の間で入力するのじゃ！')
                    return
            self.config['interval'] = interval

            # URLは削除
            self.config['target_dir'] = self.dir_entry.get()
            self.config['filename'] = self.filename_entry.get()
            self.config['keywords'] = self.keywords_text.get('1.0', tk.END).strip().split('\n')
            self.config['exclude_files'] = self.exclude_text.get('1.0', tk.END).strip().split('\n')

            # 現在のプリセットを更新
            current_preset = next(
                (p for p in self.presets 
                 if p['name'] == self.selected_preset.get()),
                None
            )
            
            if current_preset:
                current_preset['filename'] = self.filename_entry.get()
                current_preset['keywords'] = self.keywords_text.get('1.0', tk.END).strip().split('\n')
            
            self.save_config()
            messagebox.showinfo('成功', '設定を保存したのじゃ！')
        except ValueError:
            messagebox.showerror('エラー', '正しい数値を入力するのじゃ！')
            return

    def log(self, message):
        self.log_text.insert(tk.END, f'[{datetime.now().strftime("%Y-%m-%d %H:%M:%S")}] {message}\n')
        self.log_text.see(tk.END)

    def start_monitoring(self):
        self.update_config()
        self.downloader = NicoCacheDownloader(self)
        self.running = True
        self.stop_event.clear()
        self.update_thread = threading.Thread(target=self.update_loop)
        self.update_thread.daemon = True
        self.update_thread.start()
        self.start_button.config(state='disabled')
        self.stop_button.config(state='normal')
        self.log('監視を開始したのじゃ！')

    def stop_monitoring(self):
        self.running = False
        self.stop_event.set()
        
        # スレッドが存在する場合は待機
        if self.update_thread and self.update_thread.is_alive():
            self.update_thread.join(timeout=2)
        
        self.start_button.config(state='normal')
        self.stop_button.config(state='disabled')
        self.log('監視を停止したのじゃ！')

    def update_loop(self):
        while self.running and not self.stop_event.is_set():
            try:
                self.downloader.check_for_updates()
                # 停止イベントをチェック
                if self.stop_event.wait(timeout=self.config['interval'] * 60):
                    break
            except Exception as e:
                self.log(f'更新ループでエラーが発生したのじゃ: {e}')
                # エラー発生時も停止イベントをチェック
                if self.stop_event.is_set():
                    break

    def update_form_from_preset(self):
        """選択されたプリセットに基づいてフォームを更新するのじゃ"""
        selected_name = self.selected_preset.get()
        preset = next(p for p in self.presets if p['name'] == selected_name)
        
        # フォームの値を更新
        self.filename_entry.delete(0, tk.END)
        self.filename_entry.insert(0, preset['filename'])
        
        self.keywords_text.delete('1.0', tk.END)
        self.keywords_text.insert('1.0', '\n'.join(preset['keywords']))

    def update_gui_from_config(self):
        """設定値でGUIを更新するのじゃ"""
        if hasattr(self, 'dir_entry'):
            self.dir_entry.delete(0, tk.END)
            self.dir_entry.insert(0, self.config['target_dir'])
        
        # プリセットの更新
        self.update_form_from_preset()

        if 'exclude_files' in self.config:
            self.exclude_text.delete('1.0', tk.END)
            self.exclude_text.insert('1.0', '\n'.join(self.config['exclude_files']))

class NicoCacheDownloader:
    def __init__(self, gui):
        self.gui = gui
        self.config = gui.config
        self.update_url = self.config['url']
        self.presets = gui.presets  # プリセット情報を追加
        self.selected_preset = gui.selected_preset  # 選択中のプリセット情報を追加

    def _get_download_link(self, file_id):
        try:
            key = "631f904d23f05602d2545b87e65689f8d202289c27b4cb0f5cd670e5b9a49dd6"
            download_link = f"https://nicocache.jpn.org/download.php?id={file_id}&key={key}"
            return download_link
        except Exception as e:
            self.gui.log(f"リンク生成エラー: {e}")
            return None

    def _kill_java_processes(self):
        """Javaプロセスを終了するのじゃ！"""
        try:
            for proc in psutil.process_iter(['pid', 'name']):
                if proc.info['name'] in ['java.exe', 'javaw.exe']:
                    proc.kill()
            self.gui.log("Javaプロセスを終了したのじゃ！")
        except Exception as e:
            self.gui.log(f"プロセス終了エラー: {e}")

    def _restart_nicocache(self):
        """NicoCacheを再起動するのじゃ！"""
        try:
            target_dir = Path(self.config['target_dir'])
            jar_name = 'NicoCache_nl.jar'
            jar_path = target_dir / jar_name
            
            self.gui.log(f"対象のJARファイルのパス: {jar_path}")
            
            if not jar_path.exists():
                self.gui.log(f"エラー: JARファイルが見つからないのじゃ！: {jar_path}")
                return
            
            # 現在の作業ディレクトリを保存
            original_dir = os.getcwd()
            self.gui.log(f"元の作業ディレクトリ: {original_dir}")
            
            try:
                # 作業ディレクトリをターゲットディレクトリに変更
                os.chdir(str(target_dir))
                self.gui.log(f"作業ディレクトリを変更: {target_dir}")
                
                # 起動コマンドを作成（相対パスを使用）
                command = ['javaw', '-jar', jar_name]
                self.gui.log(f"実行するコマンド: {' '.join(command)}")
                
                # プロセスを起動
                process = subprocess.Popen(command)
                self.gui.log(f"プロセスID: {process.pid}")
                
                self.gui.log("NicoCacheを再起動したのじゃ！")
                
            finally:
                # 作業ディレクトリを元に戻す
                os.chdir(original_dir)
                self.gui.log(f"作業ディレクトリを元に戻したのじゃ: {original_dir}")
                
        except Exception as e:
            self.gui.log(f"再起動エラー: {e}")
            # エラーの詳細情報も表示
            import traceback
            self.gui.log(f"詳細なエラー情報:\n{traceback.format_exc()}")

    def check_for_updates(self):
        try:
            self.gui.log('更新チェックを開始するのじゃ！')
            
            # 現在のプリセットを取得
            current_preset = next(
                p for p in self.presets 
                if p['name'] == self.selected_preset.get()
            )
            
            # メタデータから現在のバージョン情報を取得
            existing_file_time = self._get_current_version_info(current_preset['name'])
            
            if existing_file_time:
                metadata = self._load_update_metadata()
                if current_preset['name'] in metadata:
                    self.gui.log(f'メタデータから取得した現在のバージョン: {existing_file_time}')
                else:
                    self.gui.log(f'既存ファイルから推測した現在のバージョン: {existing_file_time}')
            else:
                self.gui.log('既存ファイルが見つからないため初回更新とみなすのじゃ')
            
            response = requests.get(self.config['url'])
            soup = BeautifulSoup(response.text, 'html.parser')
            rows = soup.find_all('tr')
            
            latest_file = None
            latest_date = None
            
            for row in rows[1:]:  # ヘッダー行をスキップ
                cols = row.find_all('td')
                if len(cols) >= 6:  # 必要な列数があることを確認
                    filename = cols[1].text.strip()
                    date_str = cols[4].text.strip()
                    file_id = cols[0].text.strip()
                    comment = cols[2].text.strip()
                    
                    # ファイル名とキーワードをチェック
                    if filename == self.config['filename'] and \
                       all(kw in comment for kw in self.config['keywords']):
                        try:
                            current_date = datetime.strptime(date_str, '%Y/%m/%d %H:%M:%S')
                            if latest_date is None or current_date > latest_date:
                                latest_date = current_date
                                latest_file = {
                                    'filename': filename,
                                    'date': date_str,
                                    'file_id': file_id,
                                    'comment': comment
                                }
                        except ValueError:
                            self.gui.log(f'日付のパースに失敗: {date_str}')
            
            if latest_file:
                self.gui.log(f'最新のファイルを見つけたのじゃ: {latest_file}')
                latest_file_time = datetime.strptime(latest_file['date'], '%Y/%m/%d %H:%M:%S')
                
                # カスタムプリセットの場合は更新日チェックをスキップ
                if current_preset['name'].startswith('カスタム'):
                    should_update = True
                    self.gui.log('カスタムプリセットのため日時チェックをスキップするのじゃ')
                else:
                    # 既存のファイルと日付を比較（1分の誤差を許容）
                    if not existing_file_time:
                        should_update = True
                        self.gui.log('既存ファイルが見つからないため更新するのじゃ')
                    else:
                        time_diff = (latest_file_time - existing_file_time).total_seconds()
                        should_update = time_diff > 60  # 1分以上の差がある場合のみ更新
                        self.gui.log(f'日時比較: ウェブ版={latest_file_time}, ローカル版={existing_file_time}, 差={time_diff:.0f}秒')
                
                if not should_update:
                    self.gui.log('既存のファイルが最新なのでスキップするのじゃ！')
                    return
                
                # 更新確認ダイアログを表示
                current_version_str = existing_file_time.strftime('%Y/%m/%d %H:%M:%S') if existing_file_time else '未インストール'
                if not messagebox.askyesno('更新確認', 
                    f'新しいバージョンが見つかったのじゃ！\n\n'
                    f'現在のバージョン: {current_version_str}\n'
                    f'新しいバージョン: {latest_file_time.strftime("%Y/%m/%d %H:%M:%S")}\n\n'
                    f'更新を実行するのじゃ？'):
                    self.gui.log('更新をキャンセルしたのじゃ！')
                    return
                
                # ダウンロードと更新を実行
                download_link = self._get_download_link(latest_file['file_id'])
                if download_link:
                    if current_preset['name'] == '本体更新':
                        # 本体更新時は先にプロセスを停止
                        self.gui.log('本体更新のためJavaプロセスを停止するのじゃ...')
                        self._kill_java_processes()
                        
                        # ダウンロードと展開
                        self._handle_download(download_link, latest_file)
                        
                        # 本体更新後に再起動
                        self.gui.log('本体を再起動するのじゃ！')
                        self._restart_nicocache()
                    else:
                        # 本体以外は通常の更新処理
                        self._handle_download(download_link, latest_file)
            
        except Exception as e:
            self.gui.log(f'エラーが発生したのじゃ: {e}')

    def __del__(self):
        # オブジェクト破棄時にドライバーを閉じる
        if hasattr(self, 'driver'):
            self.driver.quit()

    def _parse_date(self, date_str):
        # 様々な日付フォーマットに対応
        date_formats = [
            '%Y-%m-%d %H:%M:%S',  # 2024-01-01 12:34:56
            '%Y/%m/%d %H:%M:%S',  # 2024/01/01 12:34:56
            '%Y年%m月%d日 %H:%M:%S',  # 2024年01月01日 12:34:56
            '%Y-%m-%d',  # 2024-01-01
            '%Y/%m/%d',  # 2024/01/01
            '%d-%m-%Y',  # 01-01-2024
            '%d/%m/%Y',  # 01/01/2024
            '%Y年%m月%d日',  # 2024年01月01日
        ]
        
        # 日付文字列から余分な文字を削除
        date_str = re.sub(r'\s+', ' ', date_str.strip())
        
        # 各フォーマットで試行
        for fmt in date_formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        
        # どのフォーマットでもパースできない場合
        raise ValueError(f"日付フォーマットを解析できませんでした: {date_str}")

    def _check_keywords(self, file_info):
        if file_info['filename'] != self.config['filename']:
            return False
        return all(kw in file_info['comment'] for kw in self.config['keywords'])

    def _handle_download(self, download_link, file_info):
        # システムファイルのリストを定義
        SYSTEM_FILES = {
            'desktop.ini',
            'thumbs.db',
            '.ds_store',
            '$recycle.bin',
            'system volume information'
        }

        def is_system_file(file_path):
            """システムファイルかどうかをチェックするのじゃ"""
            return file_path.name.lower() in SYSTEM_FILES

        def is_excluded_file(file_path):
            """除外ファイルかどうかをチェックするのじゃ"""
            file_name = file_path.name.lower()
            exclude_list = [x.lower() for x in self.config.get('exclude_files', []) if x.strip()]
            return any(exclude_pattern in file_name for exclude_pattern in exclude_list)

        temp_file = Path("temp.7z")
        temp_extract_dir = Path("temp_extract")
        
        try:
            # ダウンロード処理
            response = requests.get(download_link, stream=True)
            with open(temp_file, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            # 展開先のパスを指定
            target_dir = Path(self.config['target_dir'])
            
            # 保存先ディレクトリが存在しない場合は作成
            if not target_dir.exists():
                self.gui.log(f"保存先ディレクトリが存在しないので作成するのじゃ: {target_dir}")
                target_dir.mkdir(parents=True, exist_ok=True)
            
            # まず一時ディレクトリに展開
            with py7zr.SevenZipFile(temp_file, mode='r') as z:
                z.extractall(temp_extract_dir)
            
            # プリセットに応じた展開処理
            current_preset = next(
                p for p in self.presets 
                if p['name'] == self.selected_preset.get()
            )
            
            if current_preset['name'] in ['本体更新', 'フィルタまとめ']:
                # 本体とフィルタまとめの特殊処理
                extracted_items = list(temp_extract_dir.iterdir())
                
                # アーカイブ構造をログに出力（デバッグ用）
                self.gui.log(f"展開されたアイテム数: {len(extracted_items)}")
                for item in extracted_items:
                    self.gui.log(f"  - {item.name} ({'ディレクトリ' if item.is_dir() else 'ファイル'})")
                
                # 複数のアイテムがある場合も対応
                processed = False
                
                # 単一ディレクトリの場合（従来の処理）
                if len(extracted_items) == 1 and extracted_items[0].is_dir():
                    source_dir = extracted_items[0]
                    self.gui.log(f"単一ディレクトリを処理: {source_dir.name}")
                    processed = True
                
                # 複数のアイテムがある場合、または単一ファイルの場合
                elif len(extracted_items) > 1 or (len(extracted_items) == 1 and not extracted_items[0].is_dir()):
                    source_dir = temp_extract_dir
                    self.gui.log(f"複数アイテムまたは単一ファイルを処理")
                    processed = True
                
                if processed:
                    # ディレクトリ構造の作成（システムファイルをスキップ）
                    for root, dirs, files in os.walk(str(source_dir)):
                        # システムディレクトリを除外
                        dirs[:] = [d for d in dirs if not is_system_file(Path(d))]
                        
                        for dir_name in dirs:
                            src_path = Path(root) / dir_name
                            rel_path = src_path.relative_to(source_dir)
                            target_path = target_dir / rel_path
                            
                            if not target_path.exists():
                                self.gui.log(f"ディレクトリを作成: {target_path}")
                                target_path.mkdir(parents=True, exist_ok=True)
                                os.chmod(str(target_path), 0o777)
                    
                    # ファイルのコピー（システムファイルと除外ファイルをスキップ）
                    for root, dirs, files in os.walk(str(source_dir)):
                        for file_name in files:
                            src_path = Path(root) / file_name
                            
                            # システムファイルと除外ファイルの場合はスキップ
                            if is_system_file(src_path) or is_excluded_file(src_path):
                                self.gui.log(f"スキップ: {src_path}")
                                continue
                            
                            rel_path = src_path.relative_to(source_dir)
                            target_path = target_dir / rel_path
                            
                            try:
                                # ターゲットディレクトリが存在しない場合は作成
                                target_path.parent.mkdir(parents=True, exist_ok=True)
                                
                                if target_path.exists():
                                    os.chmod(str(target_path), 0o666)
                                shutil.copy2(str(src_path), str(target_path))
                                os.chmod(str(target_path), 0o666)
                                self.gui.log(f"ファイルを上書き: {rel_path} -> {target_path}")
                            except Exception as e:
                                self.gui.log(f"ファイルコピーエラー - {rel_path}: {e}")
                                continue
                else:
                    self.gui.log("展開されたアイテムが見つからないのじゃ...")
                    raise Exception("No items found in archive")
            else:
                # カスタムプリセットの通常展開（同様の処理を適用）
                extracted_items = list(temp_extract_dir.iterdir())
                
                # アーカイブ構造をログに出力（デバッグ用）
                self.gui.log(f"カスタムプリセット - 展開されたアイテム数: {len(extracted_items)}")
                for item in extracted_items:
                    self.gui.log(f"  - {item.name} ({'ディレクトリ' if item.is_dir() else 'ファイル'})")
                
                for item in temp_extract_dir.iterdir():
                    # システムファイルと除外ファイルのチェック
                    if is_system_file(item) or is_excluded_file(item):
                        self.gui.log(f"スキップ: {item.name}")
                        continue
                    
                    if item.is_dir():
                        target_path = target_dir / item.name
                        if not target_path.exists():
                            target_path.mkdir(parents=True, exist_ok=True)
                            os.chmod(str(target_path), 0o777)
                        
                        for root, dirs, files in os.walk(str(item)):
                            # システムディレクトリを除外
                            dirs[:] = [d for d in dirs if not is_system_file(Path(root) / d)]
                            
                            for dir_name in dirs:
                                src_path = Path(root) / dir_name
                                rel_path = src_path.relative_to(item)
                                new_target = target_path / rel_path
                                if not new_target.exists():
                                    new_target.mkdir(parents=True, exist_ok=True)
                                    os.chmod(str(new_target), 0o777)
                            
                            for file_name in files:
                                src_path = Path(root) / file_name
                                
                                # システムファイルと除外ファイルをスキップ
                                if is_system_file(src_path) or is_excluded_file(src_path):
                                    self.gui.log(f"スキップ: {src_path}")
                                    continue
                                
                                rel_path = src_path.relative_to(item)
                                new_target = target_path / rel_path
                                
                                try:
                                    # ターゲットディレクトリが存在しない場合は作成
                                    new_target.parent.mkdir(parents=True, exist_ok=True)
                                    
                                    if new_target.exists():
                                        os.chmod(str(new_target), 0o666)
                                    shutil.copy2(str(src_path), str(new_target))
                                    os.chmod(str(new_target), 0o666)
                                    self.gui.log(f"ファイルを上書き: {rel_path} -> {new_target}")
                                except Exception as e:
                                    self.gui.log(f"ファイルコピーエラー - {rel_path}: {e}")
                                    continue
                    else:
                        target_path = target_dir / item.name
                        try:
                            if target_path.exists():
                                os.chmod(str(target_path), 0o666)
                            shutil.copy2(str(item), str(target_path))
                            os.chmod(str(target_path), 0o666)
                            self.gui.log(f"ファイルを上書き: {item.name} -> {target_path}")
                        except Exception as e:
                            self.gui.log(f"ファイルコピーエラー - {item.name}: {e}")
                            continue
                    
                    self.gui.log(f"更新完了: {item.name}")
            
            # 更新後にファイルの更新日時をウェブサイトの公開日時に設定するのじゃ！
            self._update_file_timestamps(file_info)
            
            self.gui.log("更新完了したのじゃ！(๑•̀ㅂ•́)و✧")
            
        except Exception as e:
            self.gui.log(f"更新中にエラーが発生したのじゃ: {e}")
            raise
        finally:
            # 一時ファイルとディレクトリの削除
            try:
                if temp_file.exists():
                    os.chmod(str(temp_file), 0o666)
                    temp_file.unlink()
                if temp_extract_dir.exists():
                    for root, dirs, files in os.walk(str(temp_extract_dir), topdown=False):
                        for name in files:
                            os.chmod(os.path.join(root, name), 0o666)
                        for name in dirs:
                            os.chmod(os.path.join(root, name), 0o777)
                    shutil.rmtree(temp_extract_dir)
            except Exception as e:
                self.gui.log(f"一時ファイルの削除中にエラー: {e}")

    def _get_metadata_file_path(self):
        """メタデータファイルのパスを取得するのじゃ！"""
        target_dir = Path(self.config['target_dir'])
        return target_dir / 'update_metadata.json'

    def _load_update_metadata(self):
        """更新メタデータを読み込むのじゃ！"""
        try:
            metadata_file = self._get_metadata_file_path()
            if metadata_file.exists():
                with open(metadata_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            self.gui.log(f"メタデータの読み込み中にエラー: {e}")
        return {}

    def _save_update_metadata(self, preset_name, file_info):
        """更新メタデータを保存するのじゃ！"""
        try:
            metadata_file = self._get_metadata_file_path()
            
            # 既存のメタデータを読み込み
            metadata = self._load_update_metadata()
            
            # 新しい情報を追加
            metadata[preset_name] = {
                'last_update': file_info['date'],
                'filename': file_info['filename'],
                'file_id': file_info['file_id'],
                'comment': file_info['comment'],
                'updated_at': datetime.now().strftime('%Y/%m/%d %H:%M:%S')
            }
            
            # メタデータファイルを保存
            metadata_file.parent.mkdir(parents=True, exist_ok=True)
            with open(metadata_file, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=4, ensure_ascii=False)
            
            self.gui.log(f'メタデータを保存したのじゃ: {preset_name}')
            
        except Exception as e:
            self.gui.log(f"メタデータの保存中にエラー: {e}")

    def _get_current_version_info(self, preset_name):
        """現在のバージョン情報を取得するのじゃ！"""
        try:
            metadata = self._load_update_metadata()
            if preset_name in metadata:
                last_update = metadata[preset_name]['last_update']
                return datetime.strptime(last_update, '%Y/%m/%d %H:%M:%S')
            else:
                # メタデータが存在しない場合、既存ファイルから推測を試みる
                return self._try_get_existing_file_time(preset_name)
        except Exception as e:
            self.gui.log(f"現在のバージョン情報取得中にエラー: {e}")
        return None

    def _try_get_existing_file_time(self, preset_name):
        """既存ファイルから更新日時を推測するのじゃ！（メタデータがない場合）"""
        try:
            target_dir = Path(self.config['target_dir'])
            
            if preset_name == '本体更新':
                # 本体更新の場合はjarファイルをチェック
                jar_path = target_dir / 'NicoCache_nl.jar'
                if jar_path.exists():
                    file_time = datetime.fromtimestamp(jar_path.stat().st_mtime)
                    self.gui.log(f'既存のjarファイルから日時を取得: {file_time}')
                    return file_time
                    
            elif preset_name == 'フィルタまとめ':
                # フィルタまとめの場合はReleaseNotesをチェック
                release_notes_path = target_dir / 'nlFilters' / '198_ReleaseNotes.md'
                if release_notes_path.exists():
                    file_time = datetime.fromtimestamp(release_notes_path.stat().st_mtime)
                    self.gui.log(f'既存のReleaseNotesから日時を取得: {file_time}')
                    return file_time
                    
        except Exception as e:
            self.gui.log(f"既存ファイル時刻の取得中にエラー: {e}")
        
        return None

    def _update_file_timestamps(self, file_info):
        """更新されたファイルの更新日時をウェブサイトの公開日時に設定するのじゃ！"""
        try:
            # ウェブサイトの公開日時を取得
            web_date = datetime.strptime(file_info['date'], '%Y/%m/%d %H:%M:%S')
            web_timestamp = web_date.timestamp()
            
            # 現在のプリセットを取得
            current_preset = next(
                p for p in self.presets 
                if p['name'] == self.selected_preset.get()
            )
            
            target_dir = Path(self.config['target_dir'])
            
            if current_preset['name'] == '本体更新':
                # 本体更新の場合はjarファイルの日時を設定
                jar_path = target_dir / 'NicoCache_nl.jar'
                if jar_path.exists():
                    os.utime(str(jar_path), (web_timestamp, web_timestamp))
                    self.gui.log(f'jarファイルの更新日時を設定したのじゃ: {web_date}')
                
            elif current_preset['name'] == 'フィルタまとめ':
                # フィルタまとめの場合はReleaseNotesの日時を設定
                release_notes_path = target_dir / 'nlFilters' / '198_release_notes.md'
                if release_notes_path.exists():
                    os.utime(str(release_notes_path), (web_timestamp, web_timestamp))
                    self.gui.log(f'ReleaseNotesの更新日時を設定したのじゃ: {web_date}')
            
            # メタデータを保存
            self._save_update_metadata(current_preset['name'], file_info)
            
        except Exception as e:
            self.gui.log(f"ファイル更新日時の設定中にエラー: {e}")

    def on_update_error(self, error_message):
        # エラーダイアログを表示
        messagebox.showerror('エラー', f'更新中にエラーが発生したのじゃ！\n{error_message}')
        # 監視を停止
        self.stop_monitoring()

def extract_download_link(row):
    # より詳細なリンク抽出ロジック
    try:
        # 例: 特定のクラスや属性を持つリンク要素を探す
        link = row.find('a', class_='download-link')
        if link and link.has_attr('href'):
            return link['href']
    except Exception as e:
        print(f"リンク抽出エラー: {e}")
    return None
def main():
    root = tk.Tk()
    app = NicoCacheGUI(root)
    root.mainloop()

if __name__ == "__main__":
    print("必要なパッケージを確認するのじゃ...")
    install_packages()
    try:
        import requests
        from bs4 import BeautifulSoup
        import schedule
        import py7zr
        import psutil
        print("全てのパッケージの準備が整ったのじゃ！")
        root = tk.Tk()
        app = NicoCacheGUI(root)
        root.mainloop()
    except ImportError as e:
        print(f"重要なパッケージのインポートに失敗したのじゃ: {e}")
        sys.exit(1)
