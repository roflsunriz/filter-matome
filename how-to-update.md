1. package.jsonとpackage-lock.jsonのバージョンを更新する（例：300 -> 301）（手動での変更とは別に、npm version majorまたはnpm version minorで更新も可能、但しgit statusがクリーンでない場合は更新できないのでリリースノートのチェンジログ記録、latestバッジ更新の変更を行ってからコミットプッシュしてgit statusがクリーンな状態になってから行うこと。バージョンの更新はリリースノートのチェンジログ記録、latestバッジ更新の変更の前に行うこと）
2. nlFilters/198_release_notes.mdとnlFilters/198_release_notes.htmlを更新しチェンジログを記録する
3. README.mdのlatestバッジのバージョンを更新する
4. 最後にコミットとプッシュを行う
5. git tag "#(version)"
6. git push origin "#(version)" の操作でGithub Actionsが自動でリリースを作成する。