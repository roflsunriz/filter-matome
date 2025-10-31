import os
import subprocess
import sys
from pathlib import Path
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from tkinter.scrolledtext import ScrolledText
import threading
import queue
import shlex
from typing import List

def install_tkdnd():
    try:
        # pipをインポート（通常はPython 3.4以降で標準搭載）
        import pip
    except ImportError:
        messagebox.showerror("エラー", "pipが見つかりません！Pythonを再インストールしてください！")
        sys.exit(1)
    
    try:
        messagebox.showinfo("インストール", "TkinterDnD2をインストールします！\nしばらく待ってください...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "tkinterdnd2"])
        messagebox.showinfo("成功", "インストールが完了しました！\nプログラムを再起動してください！")
        sys.exit(0)
    except subprocess.CalledProcessError as e:
        messagebox.showerror("エラー", f"インストールに失敗しました！\nエラー: {e}")
        sys.exit(1)

# TkinterDnD2のインポートを試みる
try:
    from tkinterdnd2 import DND_FILES, TkinterDnD
except ImportError:
    response = messagebox.askyesno(
        "確認",
        "TkinterDnD2がインストールされていません！\n"
        "自動でインストールしますか？\n\n"
        "※インストール後は自動的に再起動します！"
    )
    if response:
        install_tkdnd()
    else:
        messagebox.showinfo(
            "情報",
            "ドラッグ・アンド・ドロップ機能なしで起動します！\n"
            "手動でインストールする場合は以下のコマンドを実行してください：\n"
            "pip install tkinterdnd2"
        )
        DND_FILES = None
        TkinterDnD = None

class VideoConverterGUI:
    def __init__(self, root):
        self.root = root
        self.input_paths: List[str] = []
        self.process_queue = queue.Queue()
        self.output_paths = []  # 出力ファイルのパスを保存するリスト
        self.setup_gui()
        if TkinterDnD:  # DnDが利用可能な場合のみ設定
            self.setup_drop_target()
        
    def setup_gui(self):
        self.root.title("動画変換ツール")
        self.root.geometry("800x600")
        
        # メインフレーム
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # ファイル選択部分
        file_frame = ttk.LabelFrame(main_frame, text="変換するファイル", padding="10")
        file_frame.pack(fill=tk.X, padx=5, pady=5)
        
        self.file_list = tk.Listbox(file_frame, height=5)
        self.file_list.pack(fill=tk.X, expand=True, side=tk.LEFT)
        
        # スクロールバー
        scrollbar = ttk.Scrollbar(file_frame, orient=tk.VERTICAL, command=self.file_list.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.file_list.config(yscrollcommand=scrollbar.set)
        
        # ファイル操作ボタン
        file_button_frame = ttk.Frame(main_frame)
        file_button_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Button(file_button_frame, text="動画ファイルを追加", command=self.add_files).pack(side=tk.LEFT, padx=5)
        ttk.Button(file_button_frame, text="HLSフォルダを追加", command=self.add_folder).pack(side=tk.LEFT, padx=5)
        ttk.Button(file_button_frame, text="選択を削除", command=self.remove_selected).pack(side=tk.LEFT, padx=5)
        ttk.Button(file_button_frame, text="リストをクリア", command=self.clear_list).pack(side=tk.LEFT, padx=5)
        ttk.Button(file_button_frame, text="出力フォルダを開く", command=self.open_output_folder).pack(side=tk.LEFT, padx=5)
        
        # コーデック選択部分
        codec_frame = ttk.LabelFrame(main_frame, text="コーデックを選択してください！", padding="10")
        codec_frame.pack(fill=tk.X, padx=5, pady=5)
        
        self.selected_codec = tk.StringVar(value="1")
        codecs = [
            ("AVC (H.264) - 互換性重視", "1"),
            ("HEVC (H.265) - 圧縮効率が良い", "2"),
            ("AV1 - 最新の圧縮技術", "3"),
            ("アダプティブコピー (H.264の場合)", "4")
        ]
        
        for text, value in codecs:
            rb = ttk.Radiobutton(codec_frame, text=text, value=value, variable=self.selected_codec)
            rb.pack(anchor="w", pady=2)
        
        # 実行ボタン
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=tk.X, padx=5, pady=10)
        
        self.start_button = ttk.Button(button_frame, text="変換開始", command=self.start_conversion)
        self.start_button.pack(side=tk.LEFT, padx=5)
        
        self.cancel_button = ttk.Button(button_frame, text="終了", command=self.root.quit)
        self.cancel_button.pack(side=tk.LEFT, padx=5)
        
        # プログレスバー
        self.progress_var = tk.DoubleVar()
        self.progress = ttk.Progressbar(main_frame, variable=self.progress_var, maximum=100)
        self.progress.pack(fill=tk.X, padx=5, pady=5)
        
        # ログ表示部分
        log_frame = ttk.LabelFrame(main_frame, text="変換ログ", padding="5")
        log_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        self.log_text = ScrolledText(log_frame, height=10)
        self.log_text.pack(fill=tk.BOTH, expand=True)
        
        # 状態表示ラベル
        self.status_label = ttk.Label(main_frame, text="ファイルをドロップするか追加してください！")
        self.status_label.pack(pady=5)

    def setup_drop_target(self):
        if not TkinterDnD:  # DnDが利用できない場合はスキップ
            return
            
        # ファイルリストをドロップターゲットにする
        self.file_list.drop_target_register(DND_FILES)
        self.file_list.dnd_bind('<<Drop>>', self.handle_drop)
        
        # メインウィンドウもドロップターゲットにする
        self.root.drop_target_register(DND_FILES)
        self.root.dnd_bind('<<Drop>>', self.handle_drop)

    def handle_drop(self, event):
        files = event.data.split(' ')
        for file in files:
            # Windowsのパスをデコード
            file = file.strip('{}')  # TCLの括弧を削除
            self.add_path(file)

    def add_path(self, path):
        if is_system_file(path):
            self.log(f"システムファイルなのでスキップします: {path}")
            return
        
        if path not in self.input_paths:
            self.input_paths.append(path)
            self.file_list.insert(tk.END, os.path.basename(path))
            self.update_progress_max()

    def add_files(self):
        files = filedialog.askopenfilenames(
            title="変換するファイルを選択",
            filetypes=[("動画ファイル", "*.mp4 *.mkv *.avi *.mov *.wmv *.flv"),
                      ("全てのファイル", "*.*")]
        )
        for file in files:
            self.add_path(file)

    def add_folder(self):
        folder = filedialog.askdirectory(title="変換するフォルダを選択")
        if folder:
            self.add_path(folder)

    def remove_selected(self):
        selection = self.file_list.curselection()
        for index in reversed(selection):
            self.input_paths.pop(index)
            self.file_list.delete(index)
        self.update_progress_max()

    def clear_list(self):
        self.input_paths.clear()
        self.file_list.delete(0, tk.END)
        self.update_progress_max()

    def update_progress_max(self):
        self.progress.configure(maximum=len(self.input_paths))
        self.progress_var.set(0)

    def log(self, message):
        self.log_text.insert(tk.END, message + "\n")
        self.log_text.see(tk.END)
        self.root.update_idletasks()

    def start_conversion(self):
        # UI要素を無効化
        self.start_button.state(['disabled'])
        for child in self.root.winfo_children():
            if isinstance(child, ttk.Radiobutton):
                child.state(['disabled'])
        
        # コーデック設定
        codecs_config = {
            "1": {
                "vcodec": "-c:v libx264 -preset slower -crf 23 -profile:v high -tune animation -movflags +faststart",
                "name": "h264"
            },
            "2": {
                "vcodec": "-c:v libx265 -preset medium -crf 28 -profile:v main -tune animation -movflags +faststart",
                "name": "hevc"
            },
            "3": {
                "vcodec": "-c:v libsvtav1 -preset 4 -crf 30 -movflags +faststart",
                "name": "av1"
            },
            "4": {
                "vcodec": "", # このモードでは使用しない
                "name": "copy"
            }
        }
        
        codec_info = codecs_config[self.selected_codec.get()]
        self.log(f"{codec_info['name'].upper()}で変換を開始します！")
        
        # 変換処理を別スレッドで実行
        thread = threading.Thread(target=self.convert_all, args=(codec_info,))
        thread.daemon = True
        thread.start()
        
        # 定期的に結果をチェック
        self.root.after(100, self.check_queue)

    def convert_all(self, codec_info):
        success_count = 0
        for i, input_path in enumerate(self.input_paths):
            self.status_label.config(text=f"処理中... ({i+1}/{len(self.input_paths)})")
            if self.convert_media(input_path, codec_info):
                success_count += 1
            self.progress_var.set(i + 1)
        
        self.process_queue.put(("完了", success_count))

    def check_queue(self):
        try:
            msg_type, value = self.process_queue.get_nowait()
            if msg_type == "完了":
                self.status_label.config(text=f"完了！ {value}/{len(self.input_paths)} 個の変換に成功しました！")
                self.start_button.state(['!disabled'])
                for child in self.root.winfo_children():
                    if isinstance(child, ttk.Radiobutton):
                        child.state(['!disabled'])
            return
        except queue.Empty:
            pass
        self.root.after(100, self.check_queue)

    def convert_media(self, input_path, codec_info):
        input_path = Path(input_path)
        if not input_path.exists():
            self.log(f"エラー: パスが見つかりません: {input_path}")
            return False

        output_name = f"convert_{input_path.stem}.mp4"
        output_path = str(Path.cwd() / output_name)
        
        # HLSフォルダの処理
        if (input_path / "master.m3u8").exists():
            success = self.convert_hls(input_path, output_path, codec_info["vcodec"])
        else:
            # 通常ファイルの処理
            success = self.convert_normal_file(input_path, output_path, codec_info)
        
        if success:
            self.output_paths.append(output_path)
            self.log(f"変換成功！保存場所: {output_path}")
            # 変換完了後にフォルダを開く
            os.startfile(os.path.dirname(output_path))
        return success

    def convert_normal_file(self, input_path, output_path, codec_info):
        vcodec_in, acodec = self.get_codec_info(str(input_path))
        if vcodec_in == codec_info["name"] and acodec == "aac":
            self.log("コーデックが既に適切なのでストリームコピーします...")
            cmd = ["ffmpeg", "-i", str(input_path), "-c", "copy", output_path]
        elif codec_info["name"] == "copy":
            if vcodec_in == "h264":
                if acodec == "aac":
                    self.log("H.264/AACなのでストリームコピーします...")
                    cmd = ["ffmpeg", "-i", str(input_path), "-c", "copy", output_path]
                else:
                    self.log(f"映像はH.264なのでコピーし、音声({acodec})をAACに変換します...")
                    # -map 0 を使う場合、全てのストリーム（映像、音声、字幕）のコーデックを指定する必要がある
                    cmd = ["ffmpeg", "-i", str(input_path), "-map", "0", # 全ストリームを対象に
                           "-c:v", "copy",
                           "-c:a", "aac",
                           "-profile:a", "aac_low",
                           "-b:a", "192k",
                           "-ar", "48000",
                           "-ac", "2",
                           "-c:s", "mov_text", # 字幕をMP4互換形式(mov_text)に変換
                           "-strict", "experimental",
                           output_path]
            else:
                self.log(f"エラー: アダプティブコピーモードですが、映像コーデックがH.264ではありません (V: {vcodec_in})。スキップします。")
                return False
        else:
            cmd = ["ffmpeg", "-i", str(input_path)]
            cmd.extend(shlex.split(codec_info["vcodec"]))
            # 字幕も保持するために -map 0 と -c:s mov_text を追加
            cmd.extend(["-map", "0", "-c:s", "mov_text"])
            cmd.extend([
                "-vf", "format=pix_fmts=yuv420p",
                "-c:a", "aac",
                "-profile:a", "aac_low",
                "-b:a", "192k",
                "-ar", "48000",
                "-ac", "2",
                "-strict", "experimental",
                "-fps_mode", "cfr",
                "-async", "1",
                output_path
            ])

        return self.run_ffmpeg(cmd)

    def run_ffmpeg(self, cmd):
        try:
            # shlex.join を使って安全にコマンド文字列を生成 (Python 3.8+)
            try:
                import shlex
                self.log(f"実行するコマンド:\n{shlex.join(cmd)}\n")
            except (ImportError, AttributeError): # Python 3.8未満の場合
                self.log(f"実行するコマンド:\n{' '.join(map(str, cmd))}\n")

            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                encoding='utf-8'
            )
            
            # リアルタイムでログを表示
            while True:
                output = process.stdout.readline()
                if output == '' and process.poll() is not None:
                    break
                if output:
                    self.log(output.strip())
            
            return_code = process.poll()
            if return_code == 0:
                return True
            else:
                self.log(f"エラー: FFmpegがコード {return_code} で終了しました")
                return False
                
        except subprocess.CalledProcessError as e:
            self.log(f"エラー: {e}")
            return False

    def convert_hls(self, hls_path, output_path, vcodec):
        if (hls_path / "audio.m3u8").exists():
            # 新形式HLS
            video_path = str(hls_path / "video.m3u8")
            audio_path = str(hls_path / "audio.m3u8")
            
            cmd = [
                "ffmpeg",
                "-protocol_whitelist", "file,http,https,tcp,tls,crypto,data",
                "-allowed_extensions", "ALL",
                "-i", video_path,
                "-protocol_whitelist", "file,http,https,tcp,tls,crypto,data",
                "-allowed_extensions", "ALL",
                "-i", audio_path
            ]
            
            # vcodecを安全に分割して追加
            cmd.extend(shlex.split(vcodec))
            
            # 残りのオプションを追加 (重複していた -movflags +faststart を削除)
            cmd.extend([
                "-vf", "format=pix_fmts=yuv420p",
                "-c:a", "aac",
                "-profile:a", "aac_low",
                "-b:a", "192k",
                "-ar", "48000",
                "-ac", "2",
                "-strict", "experimental",
                "-fps_mode", "cfr",
                "-async", "1",
                output_path
            ])
            
            return self.run_ffmpeg(cmd)
        else:
            # 旧形式HLSの処理を追加
            playlist_path = None
            for path in hls_path.rglob("playlist.m3u8"):
                playlist_path = path
                break
            
            if playlist_path:
                self.log(f"playlist.m3u8を見つけました: {playlist_path}")
                self.log("旧形式HLSを変換中です...")
                
                cmd = [
                    "ffmpeg",
                    "-protocol_whitelist", "file,http,https,tcp,tls,crypto,data",
                    "-allowed_extensions", "ALL",
                    "-i", str(playlist_path)
                ]
                
                # vcodecを安全に分割して追加
                cmd.extend(shlex.split(vcodec))
                
                # 残りのオプションを追加 (重複していた -movflags +faststart を削除)
                cmd.extend([
                    "-vf", "format=pix_fmts=yuv420p",
                    "-c:a", "aac",
                    "-profile:a", "aac_low",
                    "-b:a", "192k",
                    "-ar", "48000",
                    "-ac", "2",
                    "-strict", "experimental",
                    "-fps_mode", "cfr",
                    "-async", "1",
                    output_path
                ])
                
                return self.run_ffmpeg(cmd)
            else:
                self.log("エラー: playlist.m3u8が見つかりません！")
                self.log("フォルダ構造を確認してください！")
                return False

    def get_codec_info(self, file_path):
        cmd_video = ["ffprobe", "-v", "error", "-select_streams", "v:0",
                     "-show_entries", "stream=codec_name", "-of",
                     "default=noprint_wrappers=1:nokey=1", file_path]
        cmd_audio = ["ffprobe", "-v", "error", "-select_streams", "a:0",
                     "-show_entries", "stream=codec_name", "-of",
                     "default=noprint_wrappers=1:nokey=1", file_path]
        
        try:
            vcodec = subprocess.check_output(cmd_video).decode().strip()
            acodec = subprocess.check_output(cmd_audio).decode().strip()
            return vcodec, acodec
        except subprocess.CalledProcessError:
            return None, None

    def open_output_folder(self):
        if self.output_paths:
            # 最後に変換したファイルのフォルダを開く
            folder = os.path.dirname(self.output_paths[-1])
            os.startfile(folder)
        else:
            messagebox.showinfo("情報", "まだファイルを変換していません！")

def is_system_file(file_path):
    # システムファイルや隠しファイルをチェックします
    path = Path(file_path)
    system_files = ['desktop.ini', 'thumbs.db', '.ds_store']
    return (
        path.name.lower() in system_files or
        bool(os.stat(file_path).st_file_attributes & 0x4) if os.name == 'nt' else False
    )

def main():
    if TkinterDnD:
        root = TkinterDnD.Tk()  # DnD対応版
    else:
        root = tk.Tk()  # 通常版
    app = VideoConverterGUI(root)
    root.mainloop()

if __name__ == "__main__":
    main() 