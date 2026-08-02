import os
import subprocess
import sys
import webbrowser  # 追加
import glob  # 追加
import ctypes

def _root_path(*paths: str) -> str:
    """リポジトリルートからの絶対パスを返す"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.abspath(os.path.join(script_dir, os.pardir))
    return os.path.join(root_dir, *paths)

def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def install_required_packages():
    print("外部Pythonパッケージは使用しません。")
    return True

def check_admin():
    try:
        is_admin = ctypes.windll.shell32.IsUserAnAdmin()
        if not is_admin:
            print("\n=== 警告: 管理者権限なしで実行中 ===")
            print("一部の機能が制限されます。主に以下の機能が影響を受けます：")
            print("・環境変数の設定")
            print("・証明書の操作")
            print("・プロキシ設定の変更")
            print("・タスクスケジューラーへの登録")
            print("\n管理者権限で実行する場合は、以下のいずれかの方法で起動してください：")
            print("1. このスクリプトを右クリックして「管理者として実行」を選択")
            print("2. コマンドプロンプトを管理者権限で開いてからスクリプトを実行")
            
            response = input("\n管理者権限で再起動しますか？ (y/n): ")
            if response.lower() == 'y':
                ctypes.windll.shell32.ShellExecuteW(
                    None, 
                    "runas", 
                    sys.executable, 
                    " ".join([sys.argv[0]]), 
                    None, 
                    1
                )
                sys.exit()
            else:
                print("\n制限付きで続行します...")
                return False
        return True
    except Exception as e:
        print(f"権限チェック中にエラーが発生しました: {e}")
        return False

def run_with_admin():
    if not is_admin():
        print("このスクリプトは管理者権限が必要です。")
        print("管理者権限で再起動します...")
        
        # スクリプトを管理者権限で再実行
        ctypes.windll.shell32.ShellExecuteW(
            None, 
            "runas", 
            sys.executable, 
            " ".join([sys.argv[0]]), 
            None, 
            1
        )
        sys.exit()

def run_nicocache_minimized():
    try:
        root_dir = _root_path()
        launcher = _root_path("NicoCacheLauncher.jar")
        if not os.path.exists(launcher):
            print("エラー: NicoCacheLauncher.jarが見つかりません！")
            return
        java = os.environ.get('NICOCACHE_JAVA', 'java')
        subprocess.Popen([java, '-jar', launcher, '--headless', '--start'],
                         cwd=root_dir,
                         creationflags=subprocess.CREATE_NO_WINDOW)
        print("NicoCacheLauncher.jarから本体を起動しました！")
    except Exception as e:
        print(f"エラーが発生しました: {e}")

def run_nicocache_gui_launcher():
    try:
        root_dir = _root_path()
        launcher = _root_path("NicoCacheLauncher.jar")
        if not os.path.exists(launcher):
            print("エラー: NicoCacheLauncher.jarが見つかりません！")
            return
        java = os.environ.get('NICOCACHE_JAVA', 'javaw')
        subprocess.Popen([java, '-jar', launcher], cwd=root_dir)
        print("NicoCacheLauncher.jarのGUIを起動しました！")
    except Exception as e:
        print(f"エラーが発生しました: {e}")

def force_stop_nicocache():
    try:
        launcher = _root_path("NicoCacheLauncher.jar")
        java = os.environ.get('NICOCACHE_JAVA', 'java')
        result = subprocess.run(
            [java, '-jar', launcher, '--headless', '--force-stop'],
            cwd=_root_path(), capture_output=True, text=True)
        print(result.stdout or result.stderr)
    except Exception as e:
        print(f"エラーが発生しました: {e}")

def build_java_apps():
    try:
        script = _root_path("build-javac.ps1")
        if not os.path.exists(script):
            print("エラー: build-javac.ps1が見つかりません！")
            return
        result = subprocess.run(
            ['powershell.exe', '-NoProfile', '-ExecutionPolicy', 'Bypass',
             '-File', script], cwd=_root_path(), text=True)
        print(f"\n独立Javaアプリのビルド結果: {'成功' if result.returncode == 0 else '失敗'}")
        
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        import traceback
        print(traceback.format_exc())

def compile_java_files():
    try:
        root_dir = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), os.pardir))
        extensions_dir = os.path.join(root_dir, "extensions")
        os.chdir(extensions_dir)
        print(f"作業ディレクトリを設定しました: {os.getcwd()}")

        # JAVA_HOMEの確認
        java_home = os.environ.get('JAVA_HOME')
        print(f"JAVA_HOME: {java_home}")
        
        # NicoCache_nl.jarの存在確認（ルートにある想定）
        jar_path = os.path.join(root_dir, 'NicoCache_nl.jar')
        if not os.path.exists(jar_path):
            print(f"警告: {jar_path} が見つかりません！")

        # 文字コードをUTF-8に設定
        sys.stdout.reconfigure(encoding='utf-8')

        # 成功したファイルのリストを初期化
        success_files = []

        # nlMovieFetcher.javaのコンパイルについてユーザーに確認
        compile_movie_fetcher = input("nlMovieFetcher.javaをコンパイルしますか？ (y/n): ")

        # すべてのJavaファイルを処理
        for file in os.listdir(extensions_dir):
            if file.endswith(".java") and "sample" and "Sample"not in file:
                # nlMovieFetcher.javaのスキップ処理
                if file == "nlMovieFetcher.java" and compile_movie_fetcher.lower() == "n":
                    print("Skipping nlMovieFetcher.java")
                    continue

                # Javaコンパイル実行（クラスパスの区切り文字を修正）
                classpath_separator = ';' if os.name == 'nt' else ':'
                compile_output = subprocess.run(
                    [os.path.join(os.environ['JAVA_HOME'], 'bin', 'javac'), 
                     '-Xlint', 
                     '-Xlint:-path', 
                     '-classpath', 
                     f"..{classpath_separator}{jar_path}", 
                     file],
                    capture_output=True, 
                    text=True
                )

                # コンパイル結果の処理
                if compile_output.stderr:
                    for line in compile_output.stderr.splitlines():
                        if "error" in line:
                            print(f"\033[91m{line}\033[0m")  # 赤色
                        elif "warning" in line:
                            print(f"\033[93m{line}\033[0m")  # 黄色
                        else:
                            print(line)
                else:
                    print(f"{file} のコンパイルが成功しました。")
                    success_files.append(file)

        # 成功したファイルの一覧を表示
        if success_files:
            print("\nコンパイル成功したファイル一覧:")
            print(" ".join(success_files))

        print("\n「警告」は無視して問題ありません。気になるようであれば掲示板に報告してください")
        print("「エラー」はコンパイル失敗です。解決してください")

        input("\n続行するには何かキーを押してください...")
    except Exception as e:
        print(f"エラーが発生しました: {e}")

def open_nicocache_website():
    try:
        webbrowser.open('https://nicocache.jpn.org/')
        print("NicoCacheのアップローダーを開きました！")
    except Exception as e:
        print(f"エラーが発生しました: {e}")

def open_nicocache_wiki():
    try:
        webbrowser.open('https://w.atwiki.jp/nicocachenlwiki/')
        print("NicoCacheのWikiを開きました！")
    except Exception as e:
        print(f"エラーが発生しました: {e}")

def open_nicocache_bbs():
    try:
        webbrowser.open('https://ff5ch.syoboi.jp/?q=NicoCache')
        print("NicoCacheの掲示板を開きました！")
    except Exception as e:
        print(f"エラーが発生しました: {e}")

def set_java_home():
    try:
        # Eclipse Adoptiumのディレクトリを探す
        java_path = "C:\\Program Files\\Eclipse Adoptium"
        if not os.path.exists(java_path):
            print("エラー: Eclipse Adoptiumのディレクトリが見つかりません！")
            return

        # JDKディレクトリを探す（最新のものを取得）
        jdk_dirs = glob.glob(os.path.join(java_path, "jdk*"))
        if not jdk_dirs:
            print("エラー: JDKディレクトリが見つかりません！")
            return

        # 最新のJDKディレクトリを取得
        latest_jdk = max(jdk_dirs, key=os.path.getctime)
        
        # JAVA_HOMEを設定
        subprocess.run(['setx', 'JAVA_HOME', latest_jdk], capture_output=True, text=True)
        print(f"JAVA_HOMEを設定しました: {latest_jdk}")
        print("この設定を反映させるには、コマンドプロンプトを再起動してください。")
    except Exception as e:
        print(f"エラーが発生しました: {e}")

def open_environment_variables():
    try:
        # Windowsの環境変数設定ページを開く
        subprocess.run(['rundll32.exe', 'sysdm.cpl,EditEnvironmentVariables'], capture_output=True, text=True)
        print("環境変数の設定ページを開きました！")
    except Exception as e:
        print(f"エラーが発生しました: {e}")

def set_proxy_registry():
    try:
        # レジストリキーとプロキシ設定の準備
        key_path = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"
        proxy_url = "http://127.0.0.1:8080/proxy.pac"
        
        # レジストリに設定を追加
        result = subprocess.run(
            ['reg', 'ADD', 
             f"HKEY_CURRENT_USER\\{key_path}",
             '/f',  # 確認なしで強制設定
             '/v', 'AutoConfigURL',  # 値の名前
             '/t', 'REG_SZ',  # 文字列型
             '/d', proxy_url  # 設定値
            ], 
            capture_output=True, 
            text=True
        )
        
        if result.returncode == 0:
            print("プロキシ設定をレジストリに追加しました！")
            print(f"設定したURL: {proxy_url}")
        else:
            print("エラー: レジストリの設定に失敗しました。")
            if result.stderr:
                print(result.stderr)
    except Exception as e:
        print(f"エラーが発生しました: {e}")

def remove_proxy_registry():
    try:
        # レジストリキーの準備
        key_path = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"
        
        # レジストリから設定を削除
        result = subprocess.run(
            ['reg', 'DELETE', 
             f"HKEY_CURRENT_USER\\{key_path}",
             '/v', 'AutoConfigURL'  # 削除する値の名前
            ], 
            capture_output=True, 
            text=True
        )
        
        if result.returncode == 0:
            print("プロキシ設定をレジストリから削除しました！")
        else:
            print("エラー: レジストリの設定削除に失敗しました。")
            if result.stderr:
                print(result.stderr)
    except Exception as e:
        print(f"エラーが発生しました: {e}")

def check_proxy_registry():
    try:
        # レジストリキーの準備
        key_path = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"
        
        # レジストリの値を確認
        result = subprocess.run(
            ['reg', 'QUERY', 
             f"HKEY_CURRENT_USER\\{key_path}",
             '/v', 'AutoConfigURL'  # 確認する値の名前
            ], 
            capture_output=True, 
            text=True
        )
        
        print("\n=== プロキシ設定の確認 ===")
        if result.returncode == 0:
            # 設定が存在する場合
            print("現在のプロキシ設定:")
            print(result.stdout)
        else:
            # 設定が存在しない場合
            print("プロキシ設定は現在されていません。")
            if result.stderr:
                print(result.stderr)
    except Exception as e:
        print(f"エラーが発生しました: {e}")

def set_firefox_proxy():
    try:
        # Firefoxのプロファイルディレクトリを探す
        profile_base = os.path.join(os.environ['APPDATA'], 'Mozilla', 'Firefox', 'Profiles')
        if not os.path.exists(profile_base):
            print("エラー: Firefoxのプロファイルディレクトリが見つかりません！")
            return
            
        # デフォルトプロファイルを探す
        default_profiles = glob.glob(os.path.join(profile_base, '*.default*'))
        if not default_profiles:
            print("エラー: デフォルトプロファイルが見つかりません！")
            return
            
        profile_dir = default_profiles[0]
        print(f"プロファイルディレクトリ: {profile_dir}")
        
        # プロキシ設定の内容
        proxy_settings = [
            'user_pref("network.proxy.autoconfig_url", "http://127.0.0.1:8080/proxy.pac");',
            'user_pref("security.enterprise_roots.enabled", true);'
        ]
        
        user_js_path = os.path.join(profile_dir, 'user.js')
        
        if os.path.exists(user_js_path):
            # user.jsが存在する場合は追記
            print("既存のuser.jsに設定を追記します...")
            with open(user_js_path, 'a', encoding='utf-8') as f:
                f.write('\n' + '\n'.join(proxy_settings))
            print("user.jsに設定を追記しました！")
        else:
            # user.jsが存在しない場合は新規作成
            print("新しいuser.jsを作成します...")
            with open(user_js_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(proxy_settings))
            print("user.jsを作成しました！")
            
        print("\nFirefoxのプロキシ設定が完了しました！")
        print("設定を反映させるには、Firefoxを再起動してください。")
    except Exception as e:
        print(f"エラーが発生しました: {e}")

def open_proxy_settings():
    try:
        # Windowsのプロキシ設定画面を開く
        subprocess.run(['start', 'ms-settings:network-proxy'], shell=True)
        print("Windowsのプロキシ設定画面を開きました！")
    except Exception as e:
        print(f"エラーが発生しました: {e}")

def renew_certificate():
    try:
        # ルートの certs/ca.cer を参照
        cert_path = _root_path("certs", "ca.cer")
        
        # 証明書ファイルの存在確認
        if not os.path.exists(cert_path):
            print("エラー: 証明書ファイル(ca.cer)が見つかりません！")
            return
            
        print("\n=== 証明書の更新を開始 ===")
        
        # 古い証明書を削除
        print("古い証明書を削除中...")
        delete_result = subprocess.run(
            ['certutil', '-delstore', 'ROOT', 'NicoCache_nl CA'],
            capture_output=True,
            text=True
        )
        if delete_result.stderr:
            print("警告: 古い証明書の削除中にエラーが発生しました（存在しない場合は無視可能）")
            print(delete_result.stderr)
            
        # 新しい証明書を追加
        print("\n新しい証明書を追加中...")
        add_result = subprocess.run(
            ['certutil', '-addstore', 'ROOT', cert_path],
            capture_output=True,
            text=True
        )
        
        if add_result.returncode == 0:
            print("証明書の更新が完了しました！")
        else:
            print("エラー: 証明書の追加に失敗しました。")
            if add_result.stderr:
                print(add_result.stderr)
                
    except Exception as e:
        print(f"エラーが発生しました: {e}")

def delete_certificate():
    try:
        print("\n=== 証明書の削除を開始 ===")
        
        # 証明書を削除
        result = subprocess.run(
            ['certutil', '-delstore', 'ROOT', 'NicoCache_nl CA'],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("証明書の削除が完了しました！")
        else:
            print("エラー: 証明書の削除に失敗しました。")
            if result.stderr:
                print(result.stderr)
                
    except Exception as e:
        print(f"エラーが発生しました: {e}")

def add_certificate():
    try:
        # ルートの certs/ca.cer を参照
        cert_path = _root_path("certs", "ca.cer")
        
        # 証明書ファイルの存在確認
        if not os.path.exists(cert_path):
            print("エラー: 証明書ファイル(ca.cer)が見つかりません！")
            return
            
        print("\n=== 証明書の登録を開始 ===")
        
        # 既存の証明書を確認
        check_result = subprocess.run(
            ['certutil', '-store', 'ROOT', 'NicoCache_nl CA'],
            capture_output=True,
            text=True
        )
        
        if check_result.returncode == 0 and "NicoCache_nl CA" in check_result.stdout:
            print("証明書は既に登録されています。")
            print("新規登録をスキップします。")
            return
            
        # 新しい証明書を追加
        print("\n新しい証明書を追加中...")
        add_result = subprocess.run(
            ['certutil', '-addstore', 'ROOT', cert_path],
            capture_output=True,
            text=True
        )
        
        if add_result.returncode == 0:
            print("証明書の登録が完了しました！")
        else:
            print("エラー: 証明書の追加に失敗しました。")
            if add_result.stderr:
                print(add_result.stderr)
                
    except Exception as e:
        print(f"エラーが発生しました: {e}")

def open_certificate_manager():
    try:
        print("\n証明書は「信頼されたルート証明機関」→「証明書」→「NicoCache_nl CA」にあります")
        
        # 証明書マネージャーを開く（shell=Trueを追加）
        result = subprocess.run(
            ['certmgr.msc'],
            shell=True,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("証明書マネージャーを開きました！")
        else:
            print("エラー: 証明書マネージャーを開けませんでした。")
            if result.stderr:
                print(result.stderr)
                
    except Exception as e:
        print(f"エラーが発生しました: {e}")

def generate_certificates():
    try:
        root_dir = _root_path()
        ca_jar = _root_path("NicoCacheCA.jar")
        targets = _root_path("certificate-targets.txt")
        if not os.path.exists(ca_jar) or not os.path.exists(targets):
            print("エラー: NicoCacheCA.jarまたはcertificate-targets.txtが見つかりません！")
            return
        print("\n=== 証明書の生成を開始 ===")
        java = os.environ.get('NICOCACHE_JAVA', 'java')
        result = subprocess.run(
            [java, '-jar', ca_jar, '--headless',
             '--targets-file=' + targets],
            cwd=root_dir,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("証明書の生成が完了しました！")
            if result.stdout:
                print(result.stdout)
        else:
            print("エラー: 証明書の生成に失敗しました。")
            if result.stderr:
                print(result.stderr)
                
    except Exception as e:
        print(f"エラーが発生しました: {e}")

def open_bouncy_castle():
    try:
        # BouncyCastleのダウンロードページを開く
        url = "https://www.bouncycastle.org/download/bouncy-castle-java/#latest"
        webbrowser.open(url)
        print("BouncyCastleのダウンロードページを開きました！")
    except Exception as e:
        print(f"エラーが発生しました: {e}")

def create_scheduled_task():
    try:
        print("\n=== ログオン時タスクの登録を開始 ===")
        launcher = _root_path("NicoCacheLauncher.jar")
        java = os.environ.get('NICOCACHE_JAVA', 'java')
        result = subprocess.run(
            [java, '-jar', launcher, '--headless', '--task-install',
             '--task-name=NicoCache_nl'],
            cwd=_root_path(),
            capture_output=True,
            text=True
        )

        if result.returncode == 0:
            print("NicoCache_nlをログオン時に1回起動するタスクとして登録しました！")
        else:
            print("エラー: タスクの登録に失敗しました。")
            if result.stderr:
                print(result.stderr)
                
    except Exception as e:
        print(f"エラーが発生しました: {e}")

def open_task_scheduler():
    try:
        # タスクスケジューラーを開く
        result = subprocess.run(
            ['taskschd.msc'],
            shell=True,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("タスクスケジューラーを開きました！")
        else:
            print("エラー: タスクスケジューラーを開けませんでした。")
            if result.stderr:
                print(result.stderr)
                
    except Exception as e:
        print(f"エラーが発生しました: {e}")

def show_java_version():
    try:
        print("\n=== Javaのバージョン情報 ===")
        
        # javaのバージョンを確認
        java_result = subprocess.run(
            ['java', '-version'],
            shell=True,
            capture_output=True,
            text=True
        )
        
        # javacのバージョンを確認
        javac_result = subprocess.run(
            ['javac', '-version'],
            shell=True,
            capture_output=True,
            text=True
        )
        
        if java_result.returncode == 0:
            print(java_result.stderr)  # javaのバージョン情報は標準エラーに出力される
        else:
            print("エラー: javaのバージョン確認に失敗しました。")
            
        if javac_result.returncode == 0:
            print(javac_result.stdout)
        else:
            print("エラー: javacのバージョン確認に失敗しました。")
            
        if java_result.returncode != 0 or javac_result.returncode != 0:
            print("\nJavaがインストールされているか確認してください。")
                
    except Exception as e:
        print(f"エラーが発生しました: {e}")

def open_adoptium():
    try:
        # Eclipse Temurin JDKのダウンロードページを開く
        url = "https://adoptium.net/temurin/releases/?os=windows&arch=x64&package=jdk&version=17"
        webbrowser.open(url)
        print("Eclipse Temurin JDKのダウンロードページを開きました！")
    except Exception as e:
        print(f"エラーが発生しました: {e}")

def show_menu():
    print("=== NicoCache Utility ===")
    print("1. NicoCacheLauncherから本体をヘッドレス起動")
    print("2. NicoCacheLauncherのGUIを起動")
    print("3. NicoCache本体を強制停止")
    print("4. 独立Javaアプリをビルド")
    print("5. 拡張機能(extensions)をコンパイル")
    print("6. NicoCacheのアップローダーを開く")
    print("7. NicoCacheのWikiを開く")
    print("8. NicoCacheの掲示板を開く")
    print("9. JAVA_HOME環境変数を自動設定")
    print("10. 環境変数の設定ページを開く")
    print("11. プロキシ設定をレジストリに追加")
    print("12. プロキシ設定をレジストリから削除")
    print("13. プロキシ設定の確認")
    print("14. Firefoxのプロキシを設定")
    print("15. Windowsのプロキシ設定画面を開く")
    print("16. ブラウザ用証明書を更新")
    print("17. ブラウザ用証明書を削除")
    print("18. ブラウザ用証明書を新規登録")
    print("19. 証明書マネージャーを開く")
    print("20. 証明書を生成")
    print("21. BouncyCastleのダウンロードページを開く")
    print("22. 起動時の自動実行タスクを登録")
    print("23. タスクスケジューラーを開く")
    print("24. JavaとJavacのバージョンを表示")
    print("25. Eclipse Temurin JDKをダウンロード")
    print("0. 終了")
    print("=====================")

def process_option(option):
    if option == "1":
        print("NicoCacheLauncherから本体をヘッドレス起動します...")
        run_nicocache_minimized()
    elif option == "2":
        print("NicoCacheLauncherのGUIを起動します...")
        run_nicocache_gui_launcher()
    elif option == "3":
        print("java.exeとjavaw.exeを強制終了します...")
        force_stop_nicocache()
    elif option == "4":
        print("独立Javaアプリをビルドします...")
        build_java_apps()
    elif option == "5":
        print("拡張機能(extensions)をコンパイルします...")
        compile_java_files()
    elif option == "6":
        print("NicoCacheのアップローダーを開きます...")
        open_nicocache_website()
    elif option == "7":
        print("NicoCacheのWikiを開きます...")
        open_nicocache_wiki()
    elif option == "8":
        print("NicoCacheの掲示板を開きます...")
        open_nicocache_bbs()
    elif option == "9":
        print("JAVA_HOME環境変数を自動設定します...")
        set_java_home()
    elif option == "10":
        print("環境変数の設定ページを開きます...")
        open_environment_variables()
    elif option == "11":
        print("プロキシ設定をレジストリに追加します...")
        set_proxy_registry()
    elif option == "12":
        print("プロキシ設定をレジストリから削除します...")
        remove_proxy_registry()
    elif option == "13":
        print("プロキシ設定を確認します...")
        check_proxy_registry()
    elif option == "14":
        print("Firefoxのプロキシを設定します...")
        set_firefox_proxy()
    elif option == "15":
        print("Windowsのプロキシ設定画面を開きます...")
        open_proxy_settings()
    elif option == "16":
        print("ブラウザ用証明書を更新します...")
        renew_certificate()
    elif option == "17":
        print("ブラウザ用証明書を削除します...")
        delete_certificate()
    elif option == "18":
        print("ブラウザ用証明書を新規登録します...")
        add_certificate()
    elif option == "19":
        print("証明書マネージャーを開きます...")
        open_certificate_manager()
    elif option == "20":
        print("証明書を生成します...")
        generate_certificates()
    elif option == "21":
        print("BouncyCastleのダウンロードページを開きます...")
        open_bouncy_castle()
    elif option == "22":
        print("起動時の自動実行タスクを登録します...")
        create_scheduled_task()
    elif option == "23":
        print("タスクスケジューラーを開きます...")
        open_task_scheduler()
    elif option == "24":
        print("JavaとJavacのバージョンを確認します...")
        show_java_version()
    elif option == "25":
        print("Eclipse Temurin JDKのダウンロードページを開きます...")
        open_adoptium()
    elif option == "0":
        return False
    return True

def set_working_directory():
    # スクリプトのある場所をカレントディレクトリに設定
    script_path = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_path)
    print(f"作業ディレクトリを設定しました: {script_path}")

def main():
    # パッケージのインストールチェック
    if not install_required_packages():
        input("Enterキーを押して終了...")
        return
        
    # 管理者権限のチェック
    is_admin = check_admin()
    
    while True:
        show_menu()
        if not is_admin:
            print("\n注意: 管理者権限がないため、一部の機能が制限されています。")
        option = input("実行したい機能の番号を入力してください: ")
        
        if not process_option(option):
            break
            
    print("\nプログラムを終了します。お疲れ様でした！")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"予期せぬエラーが発生しました: {e}")
    finally:
        input("\nEnterキーを押して終了...") 
