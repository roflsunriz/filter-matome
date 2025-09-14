import os
import re
from typing import Dict, List, TypedDict, Optional

class ConfigEditor:
    def __init__(self, config_path: Optional[str] = None):
        # スクリプトの場所とリポジトリルートを特定します
        self.script_dir = os.path.dirname(os.path.abspath(__file__))
        self.root_dir = os.path.abspath(os.path.join(self.script_dir, os.pardir))

        # ルートの config.properties を既定とします
        self.config_path = (
            os.path.join(self.root_dir, "config.properties")
            if config_path is None else config_path
        )

        # ルートの defaults ディレクトリを参照します
        self.defaults_dir = os.path.join(self.root_dir, "defaults")
        self.settings: Dict[str, str] = {}
        self.comments: Dict[str, str] = {}
        self.load_config()

    def load_config(self):
        """現在の設定ファイルを読み込みます"""
        if os.path.exists(self.config_path):
            # 文字コードを自動判定します
            encodings = ['utf-8', 'shift-jis', 'cp932', 'euc-jp']
            for encoding in encodings:
                try:
                    with open(self.config_path, 'r', encoding=encoding) as f:
                        current_comment = []
                        for line in f:
                            line = line.strip()
                            if line.startswith('#'):
                                current_comment.append(line)
                            elif '=' in line:
                                key, value = line.split('=', 1)
                                key = key.strip()
                                self.settings[key] = value.strip()
                                self.comments[key] = '\n'.join(current_comment)
                                current_comment = []
                    return  # 正常に読み込めた場合はループを抜けます
                except UnicodeDecodeError:
                    continue  # エラーの場合は次の文字コードを試します
            
            print("警告: ファイルの文字コードを判定できませんでした。")

    class AvailableSetting(TypedDict):
        value: str
        comment: str
        source: str

    def get_available_settings(self) -> Dict[str, "ConfigEditor.AvailableSetting"]:
        """defaultsフォルダから利用可能な設定を取得します"""
        available_settings: Dict[str, ConfigEditor.AvailableSetting] = {}
        # フォルダが無い場合は空で返します
        if not os.path.isdir(self.defaults_dir):
            return available_settings

        for file in os.listdir(self.defaults_dir):
            if file.endswith('.properties'):
                # 文字コードを自動判定します
                encodings = ['utf-8', 'shift-jis', 'cp932', 'euc-jp']
                for encoding in encodings:
                    try:
                        with open(os.path.join(self.defaults_dir, file), 'r', encoding=encoding) as f:
                            current_comment = []
                            for line in f:
                                line = line.strip()
                                if line.startswith('#'):
                                    current_comment.append(line)
                                elif '=' in line:
                                    key, value = line.split('=', 1)
                                    key = key.strip()
                                    if key not in available_settings:
                                        available_settings[key] = {
                                            'value': value.strip(),
                                            'comment': '\n'.join(current_comment),
                                            'source': file
                                        }
                                    current_comment = []
                            break  # 正常に読み込めた場合はループを抜けます
                    except UnicodeDecodeError:
                        continue  # エラーの場合は次の文字コードを試します
        return available_settings

    def add_setting(self, key: str, value: str, comment: str = "", default_value: str = ""):
        """設定を追加します"""
        # 値が空の場合はデフォルト値を使用します
        if not value.strip() and default_value:
            value = default_value
            print(f"デフォルト値を使用します: {value}")
        
        self.settings[key] = value
        if comment:
            self.comments[key] = comment
        self.save_config()

    def remove_setting(self, key: str):
        """設定を削除します"""
        if key in self.settings:
            del self.settings[key]
            if key in self.comments:
                del self.comments[key]
        self.save_config()

    def edit_setting(self, key: str, value: str):
        """設定を編集します"""
        if key in self.settings:
            # 値が空の場合は、defaultsフォルダから設定を探します
            if not value.strip():
                available = self.get_available_settings()
                if key in available:
                    value = available[key]['value']
                    print(f"デフォルト値を使用します: {value}")
            
            self.settings[key] = value
            self.save_config()

    def detect_encoding(self, file_path: str) -> str:
        """ファイルの文字コードを検出します"""
        encodings = ['utf-8', 'shift-jis', 'cp932', 'euc-jp']
        
        # ファイルが存在しない場合はデフォルトでUTF-8を使います
        if not os.path.exists(file_path):
            return 'utf-8'
        
        for encoding in encodings:
            try:
                with open(file_path, 'r', encoding=encoding) as f:
                    f.read()
                    return encoding
            except UnicodeDecodeError:
                continue
        
        # どの文字コードでも読めない場合はUTF-8を使います
        return 'utf-8'

    def save_config(self):
        """設定をファイルに保存します"""
        # 既存のファイルの文字コードを検出します
        encoding = self.detect_encoding(self.config_path)
        print(f"文字コード {encoding} で保存します...")
        
        with open(self.config_path, 'w', encoding=encoding) as f:
            # 文字コード判定用の行は1回だけ書き込みます
            f.write("# NicoCache_nl 設定ファイル(文字コード判定用なのでこの行は削除しないこと)\n\n")
            
            # コメントと設定値を書き込みます
            written_settings = set()  # 書き込み済みの設定を記録します
            
            for key, value in self.settings.items():
                if key not in written_settings:  # 重複チェックを行います
                    if key in self.comments:
                        comment = self.comments[key].replace(
                            "# NicoCache_nl 設定ファイル(文字コード判定用なのでこの行は削除しないこと)", 
                            ""
                        ).strip()
                        if comment:  # 空のコメントは書き込みません
                            f.write(f"\n{comment}\n")
                    f.write(f"{key}={value}\n")
                    written_settings.add(key)

def main():
    editor = ConfigEditor()
    
    while True:
        print("\n=== NicoCache設定エディタ ===")
        print("1. 利用可能な設定を表示")
        print("2. 設定を追加")
        print("3. 設定を編集")
        print("4. 設定を削除")
        print("5. 現在の設定を表示")
        print("0. 終了")
        
        choice = input("\n選択してください: ")
        
        if choice == "1":
            available = editor.get_available_settings()
            print("\n=== 利用可能な設定 ===")
            for key, info in available.items():
                print(f"\nファイル: {info['source']}")
                print(f"設定名: {key}")
                print(f"デフォルト値: {info['value']}")
                print(f"説明:\n{info['comment']}")
                
        elif choice == "2":
            available = editor.get_available_settings()
            print("\n追加可能な設定:")
            for key in available.keys():
                print(f"- {key}")
            
            key = input("\n追加する設定名を入力: ")
            if key in available:
                value = input(f"値を入力 (デフォルト: {available[key]['value']}): ")
                editor.add_setting(
                    key, 
                    value, 
                    available[key]['comment'],
                    available[key]['value']  # デフォルト値を渡します
                )
                print("設定を追加しました！")
            else:
                print("その設定は見つかりません。")
                
        elif choice == "3":
            print("\n現在の設定:")
            for key, value in editor.settings.items():
                print(f"- {key} = {value}")
            
            key = input("\n編集する設定名を入力: ")
            if key in editor.settings:
                # デフォルト値を表示します
                available = editor.get_available_settings()
                default_value = available[key]['value'] if key in available else ""
                if default_value:
                    print(f"(デフォルト値: {default_value})")
                
                value = input("新しい値を入力 (空の場合はデフォルト値を使用): ")
                editor.edit_setting(key, value)
                print("設定を更新しました！")
            else:
                print("その設定は見つかりません。")
                
        elif choice == "4":
            print("\n現在の設定:")
            for key in editor.settings.keys():
                print(f"- {key}")
            
            key = input("\n削除する設定名を入力: ")
            if key in editor.settings:
                editor.remove_setting(key)
                print("設定を削除しました！")
            else:
                print("その設定は見つかりません。")
                
        elif choice == "5":
            print("\n=== 現在の設定 ===")
            for key, value in editor.settings.items():
                print(f"\n{editor.comments.get(key, '')}")
                print(f"{key}={value}")
                
        elif choice == "0":
            break

if __name__ == "__main__":
    main() 