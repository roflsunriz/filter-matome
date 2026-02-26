1. local/features/package.jsonのバージョンを更新する（例：300 -> 301）（特に指示がない場合は基本的にメジャー更新を行うこと）
2. CHANGELOG.mdを更新しチェンジログを記録する（Keep a Changelog形式に従う）。前回のリリースタグからのコミット履歴を全て参照して詳しく記録する。
3. README.mdのlatestバッジのバージョンを更新する
4. 最後にコミットとプッシュを行う
5. git tag "#(version)"
6. git push origin "#(version)" の操作でGithub Actionsが自動でリリースを作成する。
