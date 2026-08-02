import os
import re
import argparse
import xml.etree.ElementTree as ET
from pathlib import Path
import subprocess
import sys
import json
import concurrent.futures
import pickle
import time
import secrets
import string
from multiprocessing import Pool, cpu_count
from functools import partial

def install_requests():
    print("requestsモジュールが見つかりません...")
    confirm = input("requestsモジュールをインストールしますか？ (y/n): ")
    if confirm.lower() == 'y':
        print("requestsモジュールをインストール中...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
        print("インストール完了しました！")
        return True
    return False

def import_requests():
    try:
        import requests
        return requests
    except ImportError:
        if install_requests():
            import requests
            return requests
        else:
            print("requestsモジュールが必要です。プログラムを終了します。")
            sys.exit(1)

def get_video_info(video_id, requests):
    action_track_id = "".join(
        secrets.choice(string.ascii_letters + string.digits) for _ in range(10)
    ) + f"_{int(time.time() * 1000)}"
    watch_url = (
        f"https://www.nicovideo.jp/api/watch/v3_guest/{video_id}"
        f"?actionTrackId={action_track_id}"
    )
    try:
        watch_response = requests.get(
            watch_url,
            headers={"X-Frontend-Id": "6", "X-Frontend-Version": "0"},
            timeout=15,
        )
        if watch_response.status_code == 200:
            watch_data = watch_response.json()
            video = watch_data.get("data", {}).get("video", {})
            if video.get("isDeleted") or video.get("isPrivate"):
                return None
            title = video.get("title")
            if title:
                return title
    except Exception:
        pass

    # 現行Watch APIに対応していない環境向けの旧XMLフォールバック。
    url = f"https://ext.nicovideo.jp/api/getthumbinfo/{video_id}"
    try:
        response = requests.get(url, timeout=15)
        if response.status_code != 200:
            return None

        root = ET.fromstring(response.content)
        if root.get('status') != 'ok':
            return None

        thumb = root.find('.//thumb')
        title = thumb.findtext('title') if thumb is not None else None
        return title
    except Exception:
        return None

def get_video_info_ffprobe(file_path):
    try:
        # ffprobeコマンドを実行して動画情報を取得する
        cmd = [
            'ffprobe',
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_streams',
            str(file_path)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"ffprobeの実行に失敗しました: {result.stderr}")
            return None, None
            
        data = json.loads(result.stdout)
        
        # ビデオストリームから解像度を取得する
        resolution = None
        # オーディオストリームからビットレートを取得する
        audio_bitrate = None
        
        for stream in data['streams']:
            if stream['codec_type'] == 'video':
                height = stream.get('height', 0)
                resolution = f"{height}p"
            elif stream['codec_type'] == 'audio':
                # ビットレートをkbpsで取得する
                bitrate = stream.get('bit_rate', None)
                if bitrate:
                    audio_bitrate = str(int(int(bitrate) / 1000))
        
        return resolution, audio_bitrate
    except Exception as e:
        print(f"ffprobeでの情報取得に失敗しました: {e}")
        return None, None

def sanitize_filename(filename):
    # Windowsで使用できない文字を置換する
    # \ / : * ? " < > | は使えません
    invalid_chars = ['\\', '/', ':', '*', '?', '"', '<', '>', '|']
    for char in invalid_chars:
        filename = filename.replace(char, '／')
    return filename

class DistributedMP4Scanner:
    def __init__(self, root_dir):
        self.root_dir = Path(root_dir)
        self.num_processes = cpu_count()  # CPU数に基づいてプロセス数を決定
    
    def scan_chunk(self, subdirs):
        """各プロセスで実行される検索処理"""
        mp4_files = []
        for subdir in subdirs:
            try:
                # 各サブディレクトリ内のMP4ファイルを検索
                for path in subdir.rglob('*.mp4'):
                    if not path.name.startswith('.'):
                        mp4_files.append(path)
            except Exception as e:
                print(f"エラー in {subdir}: {e}")
        return mp4_files

    def distribute_scan(self):
        """検索処理を分散実行する"""
        try:
            # サブディレクトリのリストを取得
            all_subdirs = [d for d in self.root_dir.iterdir() if d.is_dir()]
            
            # サブディレクトリを各プロセスに均等に分配
            chunk_size = max(1, len(all_subdirs) // self.num_processes)
            dir_chunks = [
                all_subdirs[i:i + chunk_size]
                for i in range(0, len(all_subdirs), chunk_size)
            ]
            
            # プロセスプールを作成して分散実行
            with Pool(processes=self.num_processes) as pool:
                results = pool.map(self.scan_chunk, dir_chunks)
            
            # 結果を統合
            all_mp4_files = []
            for chunk_result in results:
                all_mp4_files.extend(chunk_result)
            
            # ルートディレクトリ直下のMP4ファイルも追加
            root_mp4s = [
                p for p in self.root_dir.glob('*.mp4')
                if not p.name.startswith('.')
            ]
            all_mp4_files.extend(root_mp4s)
            
            return all_mp4_files
            
        except Exception as e:
            print(f"分散処理エラー: {e}")
            return []

# 使用例
def find_mp4_files_distributed(directory, cache_file='.mp4_cache'):
    cache_path = Path(cache_file)
    cache_ttl = 1800  # 30分 = 1800秒
    
    # キャッシュチェック
    if cache_path.exists():
        try:
            with open(cache_file, 'rb') as f:
                cached_data = pickle.load(f)
                if isinstance(cached_data, dict) and 'timestamp' in cached_data:
                    # キャッシュの有効期限をチェック（30分）
                    if time.time() - cached_data['timestamp'] < cache_ttl:
                        return cached_data['files']
                    else:
                        print("キャッシュの有効期限が切れています...")
        except Exception as e:
            print(f"キャッシュの読み込みに失敗しました: {e}")
    
    # 分散処理で検索実行
    scanner = DistributedMP4Scanner(directory)
    mp4_files = scanner.distribute_scan()
    
    # キャッシュ更新
    cache_data = {
        'timestamp': time.time(),
        'files': mp4_files
    }
    try:
        with open(cache_file, 'wb') as f:
            pickle.dump(cache_data, f)
    except Exception as e:
        print(f"キャッシュの保存に失敗しました: {e}")
    
    return mp4_files

def check_pattern(data):
    """正規表現チェックを行う関数（グローバルスコープで定義）"""
    filepath, pattern = data
    match = re.search(r'((?:sm|so)\d+)', Path(filepath).name)
    is_valid = bool(re.match(pattern, Path(filepath).name))
    print(f"チェック結果: {Path(filepath).name} -> match: {match.group(1) if match else None}, is_valid: {is_valid}")
    return (Path(filepath), match.group(1) if match else None, is_valid)

def fetch_single_video(data, requests):
    """動画情報を取得する関数（グローバルスコープで定義）"""
    mp4_file, video_id = data
    mp4_file, video_id = data
    title = get_video_info(video_id, requests)
    resolution, audio_bitrate = get_video_info_ffprobe(mp4_file)
    return (mp4_file, video_id, title, resolution or "720p", audio_bitrate or "192")

def get_video_info_batch(video_files, requests):
    # 並列処理用のデータを準備する
    video_data = []
    pattern = r'(?:sm|so)\d+\[\d+p,\d+\]_.*\.mp4$'
    
    print(f"\n処理対象ファイル数: {len(video_files)}")
    
    # マルチプロセスで正規表現チェックを実行
    with Pool(processes=cpu_count()) as pool:
        # ファイルパスとパターンのタプルを作成
        check_data = [(str(mp4_file), pattern) for mp4_file in video_files]
        
        # 結果を取得
        check_results = pool.map(check_pattern, check_data)
        
        # 有効なファイルのみを処理対象に
        for mp4_file, video_id, is_valid in check_results:
            if video_id and not is_valid:  # 既に正しい形式のファイルはスキップ
                video_data.append((mp4_file, video_id))
                print(f"処理対象に追加しました: {mp4_file.name}")
            else:
                print(f"スキップ: {mp4_file.name} (video_id: {video_id}, is_valid: {is_valid})")

    print(f"\n処理対象となったファイル数: {len(video_data)}")
    
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        fetch_with_requests = partial(fetch_single_video, requests=requests)
        futures = [executor.submit(fetch_with_requests, data) for data in video_data]
        
        for future in concurrent.futures.as_completed(futures):
            try:
                result = future.result()
                if result[2]:  # titleが取得できた場合のみ追加
                    results.append(result)
                    print(f"情報取得成功しました: {result[0].name}")
                else:
                    print(f"情報取得失敗: {result[0].name}")
            except Exception as e:
                print(f"エラーが発生しました: {e}")

    return results

def process_video_files(target_paths, recursive, skip_confirmation, dry_run, requests):
    pattern = r'((?:sm|so)\d+)'
    
    mp4_files = []
    if not target_paths:
        # 引数が指定されない場合は、カレントディレクトリの 'cache' を対象とする
        print("検索対象が指定されていません。カレントディレクトリの 'cache' フォルダを検索します。")
        cache_dir = Path("cache")
        if cache_dir.is_dir():
            mp4_files.extend(find_mp4_files_distributed(cache_dir))
    else:
        print(f"指定されたパスを検索中: {', '.join(map(str, target_paths))}")
        for path_str in target_paths:
            path = Path(path_str)
            if path.is_file() and path.suffix == '.mp4':
                mp4_files.append(path)
            elif path.is_dir():
                if recursive:
                    mp4_files.extend(path.rglob('*.mp4'))
                else:
                    mp4_files.extend(path.glob('*.mp4'))

    if not mp4_files:
        print("mp4ファイルが見つかりません...")
        return

    print(f"見つかったmp4ファイル数: {len(mp4_files)}")
    
    # 一括で動画情報を取得する
    video_info_results = get_video_info_batch(mp4_files, requests)
    
    rename_plans = []
    skipped_files = []
    
    for mp4_file, video_id, title, resolution, audio_bitrate in video_info_results:
        if re.match(r'(?:sm|so)\d+\[\d+p,\d+\]_.*\.mp4$', mp4_file.name):
            skipped_files.append(mp4_file.name)
            continue
            
        safe_title = sanitize_filename(title)
        new_name = f"{video_id}[{resolution},{audio_bitrate}]_{safe_title}.mp4"
        new_path = mp4_file.parent / new_name
        
        if mp4_file.name == new_name:
            skipped_files.append(mp4_file.name)
            continue
            
        rename_plans.append((mp4_file, new_path, mp4_file.name, new_name))

    # リネーム予定がない場合は終了する
    if not rename_plans:
        print("\nリネーム可能なファイルが見つかりません...")
        if skipped_files:
            print("\nスキップしたファイル:")
            for file in skipped_files:
                print(f"- {file}")
        return
    
    # リネーム予定を表示する
    print("\n以下のファイルをリネームする予定です：")
    for i, (_, _, old_name, new_name) in enumerate(rename_plans, 1):
        print(f"{i}. {old_name} -> {new_name}")
    
    if skipped_files:
        print("\nスキップしたファイル:")
        for file in skipped_files:
            print(f"- {file}")
    
    # 一括確認を取る
    confirm = 'y' if skip_confirmation or dry_run else input("\nこれらすべてのファイルをリネームしますか？ (y/n): ")
    if confirm.lower() != 'y':
        print("リネームを中止しました。")
        return
    
    # 一括でリネームを実行する
    print("\nリネームを実行中...")
    success_count = 0
    error_count = 0
    
    if dry_run:
        print("\n[ドライラン] 以下のリネームが実行される予定です。")
    else:
        print("\nリネームを実行中...")

    for mp4_file, new_path, old_name, new_name in rename_plans:
        try:
            if dry_run:
                print(f"(Dry Run) {old_name} -> {new_name}")
            else:
                mp4_file.rename(new_path)
                print(f"成功しました: {old_name} -> {new_name}")
            success_count += 1
        except Exception as e:
            print(f"エラーが発生しました: {old_name}: {e}")
            error_count += 1
    
    # 結果を表示する
    result_action = "ドライラン" if dry_run else "リネーム"
    print(f"\n{result_action}完了しました！")
    print(f"成功予定: {success_count}件" if dry_run else f"成功しました: {success_count}件")
    print(f"失敗予定: {error_count}件" if dry_run else f"失敗しました: {error_count}件")
    print(f"スキップしました: {len(skipped_files)}件")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="ニコニコ動画のキャッシュファイル(mp4)を動画情報に基づきリネームします。",
        epilog="パスが指定されない場合、カレントディレクトリの 'cache' フォルダを対象とします。"
    )
    parser.add_argument(
        'paths',
        nargs='*',
        help='処理対象のファイルまたはディレクトリのパス。複数指定可能。 (既定: ./cache/)'
    )
    parser.add_argument(
        '-r', '--recursive',
        action='store_true',
        help='指定されたディレクトリを再帰的に検索します。'
    )
    parser.add_argument(
        '-y', '--yes',
        action='store_true',
        help='リネーム実行前の確認プロンプトをスキップします。'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='実際にはリネームを実行せず、実行される予定の操作を表示します。'
    )
    args = parser.parse_args()
    requests = import_requests()
    process_video_files(args.paths, args.recursive, args.yes, args.dry_run, requests)
